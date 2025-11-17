"use client";

export interface PolicyImage {
  imageUrl: string;
  policyId: string;
  flightNumber?: string;
  policyholder?: string;
}

/**
 * Fetches policy images directly from GitHub repository via server-side API
 * 
 * GitHub Repository Structure (confirmed):
 * - metadata/{policyholder}/{policyId}/policy.svg
 * - metadata/{policyholder}/{policyId}/policy.json (optional - contains metadata)
 * 
 * How it works:
 * 1. Calls server-side API route that uses GitHub API (no CORS issues)
 * 2. Server lists metadata directory to get all policyholder folders
 * 3. For each policyholder, lists their folders to get policyIds
 * 4. For each policyId, checks if policy.svg exists
 * 5. Only includes NFTs that actually exist in GitHub (no 404 errors!)
 * 6. Returns up to the specified limit of available NFTs
 * 7. Falls back to placeholder SVG images if no NFTs found
 * 
 * Benefits:
 * - No 404 errors - only fetches NFTs that exist
 * - No CORS issues - uses server-side API route
 * - Faster - no on-chain queries needed
 * - Always shows the latest NFTs from GitHub
 * - Directly fetches SVG images (no JSON parsing needed)
 */
export async function fetchPolicyImages(limit: number = 10): Promise<PolicyImage[]> {
  try {
    // Call our server-side API route that can access GitHub API
    // Browser will respect Cache-Control headers from the server
    const response = await fetch(`/api/policies/list?limit=${limit}`, {
      // Browser cache will respect the Cache-Control header from the server
      // Server sets: Cache-Control: public, s-maxage=300, stale-while-revalidate=600
    });

    if (!response.ok) {
      return getFallbackImages(limit);
    }

    const data = await response.json();
    const images: PolicyImage[] = data.images || [];

    // If we found some images, return them (pad with fallbacks if needed)
    if (images.length > 0) {
      // Repeat the real images to fill the limit
      while (images.length < limit) {
        images.push(...images.slice(0, limit - images.length));
      }
      return images.slice(0, limit);
    }

    return getFallbackImages(limit);
  } catch (error) {
    // Silently return fallback images on any error
    return getFallbackImages(limit);
  }
}

/**
 * Returns fallback policy images (using dashboard screenshot or placeholder SVG)
 */
function getFallbackImages(limit: number): PolicyImage[] {
  const fallbackImages: PolicyImage[] = [];
  
  // Use a simple SVG placeholder for policies
  const svgString = `<svg width="400" height="250" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" /><stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" /></linearGradient></defs><rect width="400" height="250" fill="url(#grad)"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">ZYURA Policy</text><text x="50%" y="60%" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.8)" text-anchor="middle" dominant-baseline="middle">Flight Delay Insurance</text></svg>`;
  const svgPlaceholder = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;

  for (let i = 0; i < limit; i++) {
    fallbackImages.push({
      imageUrl: svgPlaceholder,
      policyId: `fallback-${i}`,
      flightNumber: undefined,
      policyholder: undefined
    });
  }

  return fallbackImages;
}

