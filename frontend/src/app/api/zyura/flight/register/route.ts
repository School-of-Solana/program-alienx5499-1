import { NextRequest, NextResponse } from "next/server";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { clusterApiUrl } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX");
const FLIGHT_REPO = process.env.GITHUB_FLIGHT_REPO || "alienx5499/zyura-flight-metadata";

async function getProgram() {
  const idlJson = await import("@/idl/zyura.json");
  const rpcUrl = process.env.SOLANA_RPC || (process.env.NEXT_PUBLIC_SOLANA_NETWORK ? clusterApiUrl(process.env.NEXT_PUBLIC_SOLANA_NETWORK as any) : "https://api.devnet.solana.com");
  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, {} as anchor.Wallet, { commitment: "confirmed" });
  return new anchor.Program(idlJson.default as any, PROGRAM_ID, provider);
}

type Passenger = {
  fullName: string;
  dateOfBirth?: string;
  documentId?: string;
  seat?: string;
  email?: string;
  phone?: string;
};

type PnrRecord = {
  pnr: string;
  policyId?: number | "NA"; // "NA" initially, updated when policy is purchased
  policyholder?: string | "NA"; // "NA" initially, updated when policy is purchased
  wallet?: string | "NA"; // "NA" initially, updated when policy is purchased
  passenger: Passenger;
  nft_metadata_url?: string | "NA"; // "NA" initially, updated when policy is purchased
  notes?: string;
  created_at: number;
  updated_at: number;
};

type FlightRecord = {
  flight_number: string;
  date: string; // YYYY-MM-DD
  scheduled_departure_unix?: number; // Scheduled departure time (unix timestamp)
  actual_departure_unix?: number; // Actual departure time - updated when flight departs (for payout calculation)
  origin?: string;
  destination?: string;
  status?: "scheduled" | "departed" | "landed" | "cancelled" | "unknown";
  delay_minutes?: number; // Calculated: (actual_departure_unix - scheduled_departure_unix) / 60
  pnrs: PnrRecord[]; // Array of all PNRs for this flight
  created_at: number;
  updated_at: number;
};

type RegisterBody = {
  flight_number: string;
  date: string; // YYYY-MM-DD
  departure_unix?: number; // Maps to scheduled_departure_unix (scheduled departure time)
  actual_departure_unix?: number; // Actual departure time (for payout logic)
  origin?: string;
  destination?: string;
  status?: "scheduled" | "departed" | "landed" | "cancelled" | "unknown";
  delay_minutes?: number; // Auto-calculated when actual_departure_unix is set
  policyId?: number;
  pnr?: string;
  passenger?: Passenger;
  wallet?: string;
  nft_metadata_url?: string;
  notes?: string;
};

async function upsertGithubJson(filePath: string, data: any, message: string) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN not set");

  const fullPath = filePath;
  const checkUrl = `https://api.github.com/repos/${FLIGHT_REPO}/contents/${fullPath}?ref=${GITHUB_BRANCH}`;
  let existingSha: string | null = null;
  let existingJson: any = null;

  const checkRes = await fetch(checkUrl, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" },
    cache: "no-store",
  });
  if (checkRes.ok) {
    const file = await checkRes.json();
    existingSha = file.sha;
    try {
      const content = Buffer.from(file.content, file.encoding || "base64").toString("utf8");
      existingJson = JSON.parse(content);
    } catch {}
  }

  // Merge: keep existing fields, update with new data
  // Special handling for pnrs array - merge by PNR
  const merged = existingJson
    ? {
        ...existingJson,
        ...data,
        // Merge pnrs array: if data has pnrs, merge them by PNR
        pnrs: data.pnrs
          ? (() => {
              const existingPnrs = existingJson.pnrs || [];
              const newPnrs = data.pnrs || [];
              const pnrMap = new Map<string, PnrRecord>();
              
              // Add existing PNRs
              existingPnrs.forEach((p: PnrRecord) => {
                pnrMap.set(p.pnr, p);
              });
              
              // Add/update new PNRs - merge intelligently: only update policy fields if provided
              newPnrs.forEach((p: PnrRecord) => {
                const existing = pnrMap.get(p.pnr);
                const merged: PnrRecord = existing
                  ? {
                      ...existing,
                      ...p,
                      // Only update policy fields if new value is provided (not undefined)
                      // If existing is "NA" and new is provided, replace it
                      policyId: p.policyId !== undefined ? p.policyId : existing.policyId,
                      policyholder: p.policyholder !== undefined ? p.policyholder : existing.policyholder,
                      wallet: p.wallet !== undefined ? p.wallet : existing.wallet,
                      nft_metadata_url: p.nft_metadata_url !== undefined ? p.nft_metadata_url : existing.nft_metadata_url,
                      // Always update passenger and other fields if provided
                      passenger: p.passenger || existing.passenger,
                      notes: p.notes !== undefined ? p.notes : existing.notes,
                      updated_at: Math.floor(Date.now() / 1000),
                    }
                  : {
                      ...p,
                      // Set to "NA" if not provided
                      policyId: p.policyId !== undefined ? p.policyId : "NA",
                      policyholder: p.policyholder !== undefined ? p.policyholder : "NA",
                      wallet: p.wallet !== undefined ? p.wallet : "NA",
                      nft_metadata_url: p.nft_metadata_url !== undefined ? p.nft_metadata_url : "NA",
                      updated_at: Math.floor(Date.now() / 1000),
                    };
                pnrMap.set(p.pnr, merged);
              });
              
              return Array.from(pnrMap.values());
            })()
          : existingJson.pnrs || [],
        updated_at: Math.floor(Date.now() / 1000),
      }
    : {
        ...data,
        pnrs: data.pnrs || [],
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      };

  const contentBase64 = Buffer.from(JSON.stringify(merged, null, 2), "utf8").toString("base64");
  const uploadUrl = `https://api.github.com/repos/${FLIGHT_REPO}/contents/${fullPath}`;
  const body: any = { message, content: contentBase64, branch: GITHUB_BRANCH };
  if (existingSha) body.sha = existingSha;

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub upload failed: ${putRes.status} ${err}`);
  }
  const rawUrl = `https://raw.githubusercontent.com/${FLIGHT_REPO}/${GITHUB_BRANCH}/${fullPath}`;
  return { url: rawUrl };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegisterBody;
    if (!body?.flight_number || !body?.date) {
      return NextResponse.json({ error: "flight_number and date are required" }, { status: 400 });
    }

    // Fetch policy details from-chain if policyId provided
    let policyholder: string | undefined;
    let coverageAmount: number | undefined;
    let premiumPaid: number | undefined;

    if (body.policyId) {
      try {
        const program = await getProgram();
        const idBytes = Buffer.allocUnsafe(8);
        idBytes.writeBigUInt64LE(BigInt(body.policyId), 0);
        const [policyPda] = PublicKey.findProgramAddressSync([Buffer.from("policy"), idBytes], PROGRAM_ID);
        const policy: any = await program.account.policy.fetch(policyPda);
        policyholder = new PublicKey(policy.policyholder).toBase58();
        coverageAmount = Number(policy.coverageAmount?.toString() || "0");
        premiumPaid = Number(policy.premiumPaid?.toString() || "0");
      } catch (err) {
        console.error("Failed to fetch policy from-chain:", err);
      }
    }

    // Create/update flight record: flights/{FLIGHT}/flight.json
    // Single file contains flight data + pnrs array
    const flightFilePath = `flights/${body.flight_number}/flight.json`;
    
    // Build flight data
    const flightUpdate: Partial<FlightRecord> = {
      flight_number: body.flight_number,
      date: body.date,
      scheduled_departure_unix: body.departure_unix, // Scheduled time
      actual_departure_unix: body.actual_departure_unix, // Actual time - updated later for payout
      origin: body.origin,
      destination: body.destination,
      status: body.status || "scheduled",
      delay_minutes: body.delay_minutes, // Auto-calculated when actual_departure_unix is updated
    };

    // If PNR provided, add/update it in pnrs array
    if (body.pnr && body.passenger) {
      // Validate PNR is exactly 6 characters
      if (body.pnr.length !== 6) {
        return NextResponse.json({ error: "PNR must be exactly 6 characters" }, { status: 400 });
      }
      
      const pnrData: PnrRecord = {
        pnr: body.pnr.toUpperCase(),
        // Policy fields: set to provided values, or "NA" if not provided
        policyId: body.policyId !== undefined ? body.policyId : "NA",
        policyholder: policyholder || "NA",
        wallet: body.wallet || "NA", // Added when policy is purchased
        passenger: body.passenger,
        nft_metadata_url: body.nft_metadata_url || "NA",
        notes: body.notes,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      };

      flightUpdate.pnrs = [pnrData];
    }

    const res = await upsertGithubJson(flightFilePath, flightUpdate, 
      body.pnr 
        ? `Add/update PNR ${body.pnr} for flight ${body.flight_number}`
        : `Update flight ${body.flight_number}`
    );
    
    return NextResponse.json({ ok: true, ...res });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "failed" }, { status: 500 });
  }
}

