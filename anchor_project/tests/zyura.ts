import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Zyura } from "../target/types/zyura";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount, getOrCreateAssociatedTokenAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { expect } from "chai";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForNextSlot(connection: anchor.web3.Connection) {
  const start = await connection.getSlot();
  while (true) {
    const current = await connection.getSlot();
    if (current > start) break;
    await sleep(200);
  }
}

describe("zyura", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Zyura as Program<Zyura>;
  const provider = anchor.getProvider();

  // Test accounts
  let admin: Keypair;
  let user: Keypair;
  let liquidityProvider: Keypair;
  let usdcMint: PublicKey;
  let usdcMintAuthority: Keypair;
  let configAccount: PublicKey;
  let productAccount: PublicKey;
  let riskPoolVault: PublicKey;
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const SWITCHBOARD_PROGRAM_ID = new PublicKey("SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f");

  // Test data
  const PRODUCT_ID = new anchor.BN(1);
  const POLICY_ID = new anchor.BN(1);
  const DELAY_THRESHOLD_MINUTES = 30;
  const COVERAGE_AMOUNT = new anchor.BN(1000 * 1e6); // 1000 USDC
  const PREMIUM_RATE_BPS = 100; // 1%
  const CLAIM_WINDOW_HOURS = 24;
  const PREMIUM_AMOUNT = new anchor.BN(10 * 1e6); // 10 USDC
  const FLIGHT_NUMBER = "AA123";
  const DEPARTURE_TIME = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  async function ensureConfigActive() {
    try {
      const config = await program.account.config.fetch(configAccount);
      if (!config.admin.equals(admin.publicKey)) {
        throw new Error("Config admin mismatch; ensure tests use seeded admin");
      }
      if (config.paused) {
        await program.methods
          .setPauseStatus(false)
          .accounts({ config: configAccount, admin: admin.publicKey })
          .signers([admin])
          .rpc();
      }
    } catch (error: any) {
      if (!error.message?.includes("Account does not exist")) throw error;
      await program.methods
        .initialize(admin.publicKey, usdcMint, SWITCHBOARD_PROGRAM_ID)
        .accounts({
          config: configAccount,
          payer: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    }
  }

  async function ensureProductActive() {
    try {
      const product = await program.account.product.fetch(productAccount);
      if (!product.active) {
        await program.methods
          .updateProduct(PRODUCT_ID, product.delayThresholdMinutes, product.coverageAmount, product.premiumRateBps, product.claimWindowHours)
          .accounts({
            config: configAccount,
            product: productAccount,
            admin: admin.publicKey,
          })
          .signers([admin])
          .rpc();
      }
    } catch (error: any) {
      if (!error.message?.includes("Account does not exist")) throw error;
      await program.methods
        .createProduct(
          PRODUCT_ID,
          DELAY_THRESHOLD_MINUTES,
          COVERAGE_AMOUNT,
          PREMIUM_RATE_BPS,
          CLAIM_WINDOW_HOURS
        )
        .accounts({
          config: configAccount,
          product: productAccount,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    }
  }

  async function ensureProtocolReady() {
    await ensureConfigActive();
    await ensureProductActive();
  }

  before(async () => {
    const adminSeed = Buffer.alloc(32);
    Buffer.from("zyura-test-admin-seed").copy(adminSeed);
    admin = Keypair.fromSeed(adminSeed);

    user = Keypair.generate();
    liquidityProvider = Keypair.generate();
    usdcMintAuthority = Keypair.generate();

    const endpoint = provider.connection.rpcEndpoint.toLowerCase();
    const isLocalnet = endpoint.includes("127.0.0.1") || endpoint.includes("localhost");
    const isDevnet = endpoint.includes("devnet");

    const fundAccount = async (recipient: PublicKey, sol: number) => {
      const lamports = Math.ceil(sol * anchor.web3.LAMPORTS_PER_SOL);
      if (isLocalnet) {
        const sig = await provider.connection.requestAirdrop(recipient, lamports);
        await provider.connection.confirmTransaction(sig, "confirmed");
      } else {
        const tx = new anchor.web3.Transaction().add(
          anchor.web3.SystemProgram.transfer({
            fromPubkey: provider.wallet.publicKey,
            toPubkey: recipient,
            lamports,
          })
        );
        await provider.sendAndConfirm(tx);
      }
    };

    // Use 0.5 SOL for both devnet and localnet (localnet uses free airdrops, devnet conserves SOL)
    const adminAmount = 0.5;
    const userAmount = 0.5;
    const lpAmount = 0.5;
    const mintAmount = 0.5;

    await fundAccount(admin.publicKey, adminAmount);
    await fundAccount(user.publicKey, userAmount);
    await fundAccount(liquidityProvider.publicKey, lpAmount);
    await fundAccount(usdcMintAuthority.publicKey, mintAmount);

    await waitForNextSlot(provider.connection);

    usdcMint = await createMint(
      provider.connection,
      usdcMintAuthority,
      usdcMintAuthority.publicKey,
      null,
      6
    );

    [configAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [productAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("product"), PRODUCT_ID.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [riskPoolVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("risk_pool_vault")],
      program.programId
    );

    const riskPoolVaultAccount = await createAccount(
      provider.connection,
      admin,
      usdcMint,
      admin.publicKey
    );

    riskPoolVault = riskPoolVaultAccount;
  });
});