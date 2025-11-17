import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Zyura } from "../target/types/zyura";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { createMint, createAccount, getAccount, getOrCreateAssociatedTokenAccount, getAssociatedTokenAddressSync, createCloseAccountInstruction } from "@solana/spl-token";

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
export const SWITCHBOARD_PROGRAM_ID = new PublicKey("SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f");

export interface TestContext {
  program: Program<Zyura>;
  provider: anchor.AnchorProvider;
  admin: Keypair;
  user: Keypair;
  liquidityProvider: Keypair;
  usdcMint: PublicKey;
  usdcMintAuthority: Keypair;
  configAccount: PublicKey;
  riskPoolVault: PublicKey;
  isAdminAuthorized: boolean;
}

export const PRODUCT_ID = new anchor.BN(1);
export const DELAY_THRESHOLD_MINUTES = 30;
export const COVERAGE_AMOUNT = new anchor.BN(1000 * 1e6);
export const PREMIUM_RATE_BPS = 100;
export const CLAIM_WINDOW_HOURS = 24;
export const PREMIUM_AMOUNT = new anchor.BN(10 * 1e6);
export const FLIGHT_NUMBER = "AA123";
export const DEPARTURE_TIME = Math.floor(Date.now() / 1000) + 3600;

let globalContext: TestContext | null = null;

export async function setupTestContext(): Promise<TestContext> {
  if (globalContext) return globalContext;
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Zyura as Program<Zyura>;
  const provider = anchor.getProvider();

  const isDevnet = provider.connection.rpcEndpoint.includes('devnet');
  let admin: Keypair;
  if (isDevnet) {
    const walletAny = provider.wallet as any;
    admin = walletAny.payer || walletAny;
    if (!admin || typeof admin.publicKey === 'undefined' || typeof admin.secretKey === 'undefined') {
      const adminSeed = Buffer.alloc(32);
      Buffer.from("zyura-test-admin-seed").copy(adminSeed);
      admin = Keypair.fromSeed(adminSeed);
    }
  } else {
    const adminSeed = Buffer.alloc(32);
    Buffer.from("zyura-test-admin-seed").copy(adminSeed);
    admin = Keypair.fromSeed(adminSeed);
  }

  const user = Keypair.generate();
  const liquidityProvider = Keypair.generate();
  const usdcMintAuthority = Keypair.generate();

  const transferSOL = async (to: PublicKey, lamports: number) => {
    if (isDevnet) {
      const transferTx = anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: to,
        lamports: lamports,
      });
      await provider.sendAndConfirm(new anchor.web3.Transaction().add(transferTx));
    } else {
      try {
        const sig = await provider.connection.requestAirdrop(to, lamports);
        await provider.connection.confirmTransaction(sig, 'confirmed');
      } catch (error) {
        const transferTx = anchor.web3.SystemProgram.transfer({
          fromPubkey: provider.wallet.publicKey,
          toPubkey: to,
          lamports: lamports,
        });
        await provider.sendAndConfirm(new anchor.web3.Transaction().add(transferTx));
      }
    }
  };

  const isDevnetNetwork = provider.connection.rpcEndpoint.includes('devnet');
  // Use 0.5 SOL for both devnet and localnet (localnet uses free airdrops, devnet conserves SOL)
  const adminAmount = 0.5 * anchor.web3.LAMPORTS_PER_SOL;
  const userAmount = 0.5 * anchor.web3.LAMPORTS_PER_SOL;
  const lpAmount = 0.5 * anchor.web3.LAMPORTS_PER_SOL;
  const mintAmount = 0.5 * anchor.web3.LAMPORTS_PER_SOL;

  await transferSOL(admin.publicKey, adminAmount);
  await transferSOL(user.publicKey, userAmount);
  await transferSOL(liquidityProvider.publicKey, lpAmount);
  await transferSOL(usdcMintAuthority.publicKey, mintAmount);
  await new Promise(resolve => setTimeout(resolve, 1000));

  const usdcMint = await createMint(provider.connection, usdcMintAuthority, usdcMintAuthority.publicKey, null, 6);
  const [configAccount] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const [riskPoolVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("risk_pool_vault")], program.programId);
  const riskPoolVault = await createAccount(provider.connection, admin, usdcMint, admin.publicKey);

  let isAdminAuthorized = false;
  try {
    const existingConfig = await program.account.config.fetch(configAccount);
    isAdminAuthorized = existingConfig.admin.toString() === admin.publicKey.toString();
    if (!isAdminAuthorized) {
      console.log(`Warning: Config admin mismatch. Admin-only tests will be skipped.`);
    }
  } catch (error) {
    isAdminAuthorized = true;
  }

  globalContext = {
    program,
    provider,
    admin,
    user,
    liquidityProvider,
    usdcMint,
    usdcMintAuthority,
    configAccount,
    riskPoolVault,
    isAdminAuthorized,
  };
  return globalContext;
}

export async function cleanupTestAccounts(ctx: TestContext): Promise<void> {
  const isDevnet = ctx.provider.connection.rpcEndpoint.includes('devnet');
  const isLocalnet =
    ctx.provider.connection.rpcEndpoint.includes('127.0.0.1') ||
    ctx.provider.connection.rpcEndpoint.includes('localhost');
  if (!ctx.isAdminAuthorized) return;
  if (!isDevnet && !isLocalnet) return;

  console.log("\n=== Batch Cleaning up test accounts to reclaim SOL ===");
  try {
    const cleanupPromises: Promise<void>[] = [];

    const closeTokenAccount = async (account: PublicKey, owner: Keypair, name: string) => {
      try {
        const tokenAccount = await getAccount(ctx.provider.connection, account);
        if (tokenAccount.amount === BigInt(0)) {
          const closeIx = createCloseAccountInstruction(account, owner.publicKey, owner.publicKey, []);
          const tx = new anchor.web3.Transaction().add(closeIx);
          await ctx.provider.sendAndConfirm(tx, [owner]);
          console.log(`✓ ${name} closed`);
        } else {
          console.log(`⚠ ${name} has ${tokenAccount.amount.toString()} tokens, skipping`);
        }
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (!errorMsg.includes("Account does not exist") && !errorMsg.includes("TokenAccountNotFoundError")) {
          console.log(`✗ Could not close ${name}: ${errorMsg}`);
        }
      }
    };

    const closeConfig = async () => {
      try {
        const configInfo = await ctx.provider.connection.getAccountInfo(ctx.configAccount);
        if (configInfo) {
          await ctx.program.methods.closeConfig().accounts({
            config: ctx.configAccount,
            admin: ctx.admin.publicKey,
          }).signers([ctx.admin]).rpc();
          console.log("✓ Config account closed");
        }
      } catch (error: any) {
        if (!error.message?.includes("Account does not exist")) {
          console.log(`✗ Could not close config: ${error.message}`);
        }
      }
    };

    await closeConfig();

    const userUsdcAta = getAssociatedTokenAddressSync(ctx.usdcMint, ctx.user.publicKey);
    const lpUsdcAta = getAssociatedTokenAddressSync(ctx.usdcMint, ctx.liquidityProvider.publicKey);
    
    cleanupPromises.push(closeTokenAccount(userUsdcAta, ctx.user, "User USDC account"));
    cleanupPromises.push(closeTokenAccount(lpUsdcAta, ctx.liquidityProvider, "LP USDC account"));
    cleanupPromises.push(closeTokenAccount(ctx.riskPoolVault, ctx.admin, "Risk pool vault"));

    await Promise.all(cleanupPromises);

    console.log("=== Batch cleanup complete ===\n");
  } catch (error: any) {
    console.log(`Error during batch cleanup: ${error.message}`);
  } finally {
    globalContext = null;
  }
}

export function getCachedTestContext(): TestContext | null {
  return globalContext;
}

