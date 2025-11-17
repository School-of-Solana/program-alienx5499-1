import { NextRequest, NextResponse } from "next/server";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { clusterApiUrl } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX");

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

type RegisterBody = {
  pnr: string;
  policyId: number;
  policyholder?: string;
  flightNumber?: string;
  date?: string; // YYYY-MM-DD
  departureUnix?: number;
  passenger?: Passenger; // Single passenger per PNR
  notes?: string;
};

const FLIGHT_REPO = process.env.GITHUB_FLIGHT_REPO || "alienx5499/zyura-flight-metadata";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegisterBody;
    if (!body?.pnr || !body?.policyId) return NextResponse.json({ error: "pnr and policyId are required" }, { status: 400 });
    if (body.pnr.length !== 6) return NextResponse.json({ error: "PNR must be exactly 6 characters" }, { status: 400 });

    // Populate from-chain if missing
    let { flightNumber, departureUnix, policyholder, date } = body;
    if (!flightNumber || !departureUnix || !policyholder || !date) {
      const program = await getProgram();
      const idBytes = Buffer.allocUnsafe(8);
      idBytes.writeBigUInt64LE(BigInt(body.policyId), 0);
      const [policyPda] = PublicKey.findProgramAddressSync([Buffer.from("policy"), idBytes], PROGRAM_ID);
      const policy: any = await program.account.policy.fetch(policyPda);
      flightNumber = flightNumber || policy.flightNumber || "";
      departureUnix = departureUnix || Number(policy.departureTime?.toString?.() || "0");
      policyholder = policyholder || new PublicKey(policy.policyholder).toBase58();
      if (!date && departureUnix > 0) {
        date = new Date(departureUnix * 1000).toISOString().slice(0, 10);
      }
    }

    if (!flightNumber || !date) {
      return NextResponse.json({ error: "flight_number and date are required" }, { status: 400 });
    }

    // Call flight register endpoint to upsert flight record with PNR
    const flightRegisterUrl = new URL("/api/zyura/flight/register", req.url);
    const flightRegisterRes = await fetch(flightRegisterUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flight_number: flightNumber,
        date,
        departure_unix: departureUnix,
        policyId: body.policyId,
        pnr: body.pnr,
        passenger: body.passenger,
        notes: body.notes,
      }),
    });

    if (!flightRegisterRes.ok) {
      const err = await flightRegisterRes.json();
      throw new Error(err.error || "Failed to register flight");
    }

    const result = await flightRegisterRes.json();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "failed" }, { status: 500 });
  }
}


