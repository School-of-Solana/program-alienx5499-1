import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

const GITHUB_REPO = "alienx5499/zyura-nft-metadata";
const GITHUB_BRANCH = "main";
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || "DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX");

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  sha?: string;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

async function listGitHubDirectory(path: string): Promise<{ files: GitHubFile[]; rateLimit: RateLimitInfo | null }> {
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  
  // Get GitHub PAT from environment variables
  const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  
  try {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'ZYURA-App',
    };
    
    // Add Authorization header if token is available
    if (githubToken) {
      headers.Authorization = `token ${githubToken}`;
    }
    
    const response = await fetch(apiUrl, {
      headers,
      // Cache for 1 minute to reduce API calls
      next: { revalidate: 60 },
    });
    
    // Extract rate limit info from headers
    const rateLimit: RateLimitInfo | null = {
      limit: parseInt(response.headers.get('x-ratelimit-limit') || '0', 10),
      remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0', 10),
      reset: parseInt(response.headers.get('x-ratelimit-reset') || '0', 10),
    };
    
    // Log rate limit info with auth status
    const authStatus = githubToken ? 'authenticated' : 'unauthenticated';
    if (rateLimit.remaining > 0) {
      console.log(`[GitHub API] Rate limit (${authStatus}): ${rateLimit.remaining}/${rateLimit.limit} remaining. Resets at: ${new Date(rateLimit.reset * 1000).toISOString()}`);
    } else {
      console.warn(`[GitHub API] Rate limit exhausted (${authStatus})! Resets at: ${new Date(rateLimit.reset * 1000).toISOString()}`);
    }
    
    if (!response.ok) {
      return { files: [], rateLimit };
    }
    
    const data = await response.json();
    return {
      files: Array.isArray(data) ? data : [],
      rateLimit
    };
  } catch (error) {
    return { files: [], rateLimit: null };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    let latestRateLimit: RateLimitInfo | null = null;

    // Step 1: Get all policyholder addresses available on GitHub
    console.log('[Step 1] Fetching policyholder accounts from GitHub...');
    const metadataResult = await listGitHubDirectory('metadata');
    latestRateLimit = metadataResult.rateLimit || latestRateLimit;
    
    if (metadataResult.files.length === 0) {
      return NextResponse.json({ 
        images: [],
        rateLimit: latestRateLimit 
      });
    }

    // Extract policyholder addresses from GitHub
    const githubPolicyholders = metadataResult.files
      .filter(item => item.type === 'dir')
      .map(item => item.name);
    
    console.log(`[Step 1] Found ${githubPolicyholders.length} policyholder accounts on GitHub:`, githubPolicyholders.slice(0, 5), '...');

    // Step 2: Query Solana program for policies from these accounts
    console.log('[Step 2] Fetching policies from Solana program...');
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl("devnet"),
      "confirmed"
    );

    // Load IDL
    let idlJson;
    try {
      const idlModule = await import("@/idl/zyura.json");
      idlJson = idlModule.default || idlModule;
    } catch (error) {
      console.error('[Step 2] Failed to load IDL:', error);
      return NextResponse.json({ 
        images: [],
        rateLimit: latestRateLimit 
      });
    }

    const coder = new anchor.BorshCoder(idlJson as anchor.Idl);
    const disc = coder.accounts.accountDiscriminator("Policy");

    // Fetch all policy accounts from Solana
    let allPolicyAccounts;
    try {
      allPolicyAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(disc) } }
        ],
        commitment: "confirmed"
      });
      console.log(`[Step 2] Found ${allPolicyAccounts.length} total policies on-chain`);
    } catch (error) {
      console.error('[Step 2] Failed to fetch policies from Solana:', error);
      return NextResponse.json({ 
        images: [],
        rateLimit: latestRateLimit 
      });
    }

    // Step 3: Filter policies to only those from GitHub policyholders and match with GitHub metadata
    console.log('[Step 3] Matching on-chain policies with GitHub metadata...');
    const policyImages: Array<{
      imageUrl: string;
      policyId: string;
      policyholder: string;
      flightNumber?: string;
    }> = [];

    // Create a map of policyholder -> Set of policyIds from GitHub
    const githubPoliciesMap = new Map<string, Set<string>>();
    
    console.log(`[Step 3] Building GitHub policies map for ${githubPolicyholders.length} policyholders...`);
    for (const policyholder of githubPolicyholders) {
      const policyholderPath = `metadata/${policyholder}`;
      const policyFoldersResult = await listGitHubDirectory(policyholderPath);
      latestRateLimit = policyFoldersResult.rateLimit || latestRateLimit;
      
      const policyIds = policyFoldersResult.files
        .filter(item => item.type === 'dir')
        .map(item => item.name);
      
      githubPoliciesMap.set(policyholder, new Set(policyIds));
    }
    console.log(`[Step 3] Built map with ${githubPoliciesMap.size} policyholders`);

    // Process on-chain policies and match with GitHub
    for (const acc of allPolicyAccounts) {
      if (policyImages.length >= limit) break;

      try {
        const decoded: any = coder.accounts.decode("Policy", acc.account.data);
        
        if (!decoded || !decoded.id) continue;

        const policyId = decoded.id?.toString();
        let policyholder: string | undefined;
        
        try {
          if (decoded.policyholder) {
            if (decoded.policyholder instanceof PublicKey) {
              policyholder = decoded.policyholder.toString();
            } else if (Array.isArray(decoded.policyholder) && decoded.policyholder.length === 32) {
              policyholder = new PublicKey(Buffer.from(decoded.policyholder)).toString();
            } else if (typeof decoded.policyholder === 'string') {
              policyholder = new PublicKey(decoded.policyholder).toString();
            }
          }
        } catch {
          continue;
        }

        if (!policyholder || !policyId) continue;

        // Check if this policyholder exists in GitHub and has this policyId
        const githubPolicyIds = githubPoliciesMap.get(policyholder);
        if (!githubPolicyIds || !githubPolicyIds.has(policyId)) {
          // Policy exists on-chain but not in GitHub - skip it
          continue;
        }

        // Policy exists in both! Get the image URL
        const policyPath = `metadata/${policyholder}/${policyId}`;
        const policyFilesResult = await listGitHubDirectory(policyPath);
        latestRateLimit = policyFilesResult.rateLimit || latestRateLimit;
        
        const svgFile = policyFilesResult.files.find((file: GitHubFile) => file.name === 'policy.svg' && file.type === 'file');
        
        if (svgFile) {
          const imageUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${policyPath}/policy.svg`;
          
          // Get flight number from on-chain data or GitHub metadata
          let flightNumber: string | undefined = decoded.flightNumber || undefined;
          
          // Try to get from GitHub JSON if available
          const jsonFile = policyFilesResult.files.find((file: GitHubFile) => file.name === 'policy.json' && file.type === 'file');
          if (jsonFile && !flightNumber) {
            try {
              const jsonUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${policyPath}/policy.json`;
              const jsonResponse = await fetch(jsonUrl, {
                next: { revalidate: 60 },
              });
              if (jsonResponse.ok) {
                const metadata = await jsonResponse.json();
                flightNumber = metadata.attributes?.find((attr: any) => 
                  attr.trait_type === 'Flight Number' || attr.trait_type === 'flight_number'
                )?.value || metadata.flightNumber || metadata.flight_number;
              }
            } catch {
              // Ignore JSON parsing errors
            }
          }

          policyImages.push({
            imageUrl,
            policyId,
            policyholder,
            flightNumber
          });
        }
      } catch (error) {
        // Skip invalid policies
        continue;
      }
    }

    // Log final rate limit status
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
    const authStatus = githubToken ? 'authenticated' : 'unauthenticated';
    if (latestRateLimit) {
      console.log(`[GitHub API] Final rate limit (${authStatus}): ${latestRateLimit.remaining}/${latestRateLimit.limit} remaining`);
    }

    console.log(`[Step 3] Matched ${policyImages.length} policies with GitHub metadata`);

    const response = NextResponse.json({ 
      images: policyImages.slice(0, limit),
      rateLimit: latestRateLimit 
    });

    // Add caching headers - cache for 5 minutes, allow stale-while-revalidate
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return response;
  } catch (error) {
    console.error('[API] Error fetching policies:', error);
    return NextResponse.json({ 
      images: [],
      rateLimit: null 
    }, { status: 500 });
  }
}

