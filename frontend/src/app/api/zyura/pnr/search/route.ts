import { NextRequest, NextResponse } from "next/server";

const FLIGHT_REPO = process.env.GITHUB_FLIGHT_REPO || "alienx5499/zyura-flight-metadata";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pnr = searchParams.get("pnr");
    if (!pnr || pnr.length !== 6) {
      return NextResponse.json({ error: "PNR must be exactly 6 characters" }, { status: 400 });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    // Note: GitHub token is optional for public repos - we can use raw.githubusercontent.com
    // But if the repo is private, token is required

    const pnrUpper = pnr.toUpperCase();

    // New structure: Search through all flight.json files for PNR
    // List all flight folders
    const flightsDirUrl = `https://api.github.com/repos/${FLIGHT_REPO}/contents/flights?ref=${GITHUB_BRANCH}`;
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
    };
    if (GITHUB_TOKEN) {
      headers.Authorization = `token ${GITHUB_TOKEN}`;
    }
    
    const dirResponse = await fetch(flightsDirUrl, {
      headers,
      cache: "no-store",
    });

    if (!dirResponse.ok) {
      // If repo is public, we can still try to search known flight numbers
      // For now, return not found
      return NextResponse.json({ error: "PNR not found" }, { status: 404 });
    }

    const flightFolders = await dirResponse.json();
    const folders = Array.isArray(flightFolders) ? flightFolders.filter((f: any) => f.type === "dir") : [];

    // Search through each flight folder for the PNR
    for (const folder of folders) {
      try {
        const flightFileUrl = `https://raw.githubusercontent.com/${FLIGHT_REPO}/${GITHUB_BRANCH}/flights/${folder.name}/flight.json`;
        const flightResponse = await fetch(flightFileUrl, { cache: "no-store" });
        
        if (flightResponse.ok) {
          const flightData = await flightResponse.json();
          
          // Check if PNR exists in pnrs array
          const matchingPnr = flightData.pnrs?.find((p: any) => p.pnr === pnrUpper);
          
          if (matchingPnr) {
            // Found! Return combined PNR + flight data
            // Normalize passenger data to handle both camelCase and snake_case
            const passenger = matchingPnr.passenger || null;
            let normalizedPassenger = null;
            if (passenger) {
              normalizedPassenger = {
                name: passenger.name || passenger.fullName || null,
                fullName: passenger.fullName || passenger.name || null,
                email: passenger.email || null,
                phone: passenger.phone || passenger.phone_number || null,
                phone_number: passenger.phone_number || passenger.phone || null,
                date_of_birth: passenger.date_of_birth || passenger.dateOfBirth || null,
                dateOfBirth: passenger.dateOfBirth || passenger.date_of_birth || null,
                passport_number: passenger.passport_number || passenger.passportNumber || passenger.documentId || null,
                documentId: passenger.documentId || passenger.passport_number || passenger.passportNumber || null,
                address: passenger.address || null,
                seat: passenger.seat || null,
                class: passenger.class || passenger.classType || null,
                classType: passenger.classType || passenger.class || null,
              };
            }
            
            return NextResponse.json({
              pnr: pnrUpper,
              flight_number: flightData.flight_number,
              date: flightData.date || "",
              scheduled_departure_unix: flightData.scheduled_departure_unix,
              actual_departure_unix: flightData.actual_departure_unix,
              origin: flightData.origin,
              destination: flightData.destination,
              status: flightData.status,
              delay_minutes: flightData.delay_minutes,
              passenger: normalizedPassenger,
              wallet: matchingPnr.wallet,
              policyId: matchingPnr.policyId,
              policyholder: matchingPnr.policyholder,
              nft_metadata_url: matchingPnr.nft_metadata_url,
              as_of: Math.floor(Date.now() / 1000),
            });
          }
        }
      } catch (err) {
        // Skip files that fail to parse
        continue;
      }
    }

    // PNR not found
    return NextResponse.json({ error: "PNR not found" }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "failed" }, { status: 500 });
  }
}

