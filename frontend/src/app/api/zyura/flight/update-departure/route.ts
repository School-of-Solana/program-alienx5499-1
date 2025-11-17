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

type UpdateDepartureBody = {
  flight_number: string;
  actual_departure_unix: number; // Actual departure timestamp
};

async function upsertGithubJson(filePath: string, data: any, message: string) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN not set");

  const checkUrl = `https://api.github.com/repos/${FLIGHT_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;
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

  if (!existingJson) {
    throw new Error("Flight not found");
  }

  // Calculate delay
  const scheduledDep = existingJson.scheduled_departure_unix;
  const actualDep = data.actual_departure_unix;
  const delayMinutes = scheduledDep && actualDep
    ? Math.max(0, Math.floor((actualDep - scheduledDep) / 60))
    : 0;

  // Update flight data
  const merged = {
    ...existingJson,
    actual_departure_unix: actualDep,
    delay_minutes: delayMinutes,
    status: delayMinutes > 0 ? "departed" : "departed", // Update status
    updated_at: Math.floor(Date.now() / 1000),
  };

  const contentBase64 = Buffer.from(JSON.stringify(merged, null, 2), "utf8").toString("base64");
  const uploadUrl = `https://api.github.com/repos/${FLIGHT_REPO}/contents/${filePath}`;
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
  const rawUrl = `https://raw.githubusercontent.com/${FLIGHT_REPO}/${GITHUB_BRANCH}/${filePath}`;
  return { url: rawUrl, delay_minutes: delayMinutes };
}

export async function POST(req: NextRequest) {
  try {
    // Authentication: Check API key in header
    // Default key: "zyura@admin" (can be overridden via FLIGHT_UPDATE_API_KEY env)
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    const expectedApiKey = process.env.FLIGHT_UPDATE_API_KEY || "zyura@admin";
    
    if (apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: "Unauthorized. Valid API key required in x-api-key header or Authorization: Bearer <key>" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as UpdateDepartureBody;
    if (!body?.flight_number || !body?.actual_departure_unix) {
      return NextResponse.json({ error: "flight_number and actual_departure_unix are required" }, { status: 400 });
    }

    const flightFilePath = `flights/${body.flight_number}/flight.json`;
    const res = await upsertGithubJson(
      flightFilePath,
      { actual_departure_unix: body.actual_departure_unix },
      `Update actual departure time for flight ${body.flight_number}`
    );

    return NextResponse.json({ 
      ok: true, 
      ...res,
      message: `Updated flight ${body.flight_number} with actual departure. Delay: ${res.delay_minutes} minutes`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "failed" }, { status: 500 });
  }
}

