import { NextRequest, NextResponse } from "next/server";

const FLIGHT_REPO = process.env.GITHUB_FLIGHT_REPO || "alienx5499/zyura-flight-metadata";

export async function GET(_req: NextRequest, { params }: { params: { pnr: string } }) {
  try {
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
    // Search across all flight files for this PNR (simplified: could be optimized with index)
    // For now, return a helper message; dashboard should search by flight+date instead
    return NextResponse.json(
      {
        message: "PNR lookup by flight+date. Use /api/zyura/flight/[flight]/[date] to get flight data with PNRs.",
        pnr: params.pnr,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "failed" }, { status: 500 });
  }
}


