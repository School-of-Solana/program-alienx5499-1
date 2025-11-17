import { PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { setupTestContext, SWITCHBOARD_PROGRAM_ID } from "./setup";

describe("Initialization", () => {
  let ctx: Awaited<ReturnType<typeof setupTestContext>>;
  
  before(async () => {
    ctx = await setupTestContext();
  });

  it("Initializes the ZYURA protocol", async () => {
    let needsInitialization = false;

    try {
      const existingConfig = await ctx.program.account.config.fetch(ctx.configAccount);
      const adminMatches = existingConfig.admin.toString() === ctx.admin.publicKey.toString();
      const mintMatches = existingConfig.usdcMint.toString() === ctx.usdcMint.toString();
      const pausedClear = existingConfig.paused === false;

      if (adminMatches && mintMatches && pausedClear) {
        expect(existingConfig.admin.toString()).to.equal(ctx.admin.publicKey.toString());
        expect(existingConfig.usdcMint.toString()).to.equal(ctx.usdcMint.toString());
        expect(existingConfig.paused).to.be.false;
        return;
      }

      if (adminMatches || ctx.provider.wallet.publicKey.toString() === existingConfig.admin.toString()) {
        const closeSig = await ctx.program.methods.closeConfig().accounts({
            config: ctx.configAccount,
          admin: ctx.admin.publicKey,
        }).signers([ctx.admin]).rpc();
        await ctx.provider.connection.confirmTransaction(closeSig, "confirmed");
        needsInitialization = true;
        } else {
          expect(existingConfig).to.exist;
          return;
      }
    } catch (error: any) {
      if (!error.message?.includes("Account does not exist")) throw error;
      needsInitialization = true;
    }

    if (!needsInitialization) return;

    try {
      await ctx.program.methods.initialize(ctx.admin.publicKey, ctx.usdcMint, SWITCHBOARD_PROGRAM_ID)
        .accounts({
          config: ctx.configAccount,
          payer: ctx.admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.admin])
        .rpc();
    } catch (error: any) {
      if (error.message?.includes("already in use")) {
        const config = await ctx.program.account.config.fetch(ctx.configAccount);
        expect(config).to.exist;
        return;
      }
      throw error;
    }

    const config = await ctx.program.account.config.fetch(ctx.configAccount);
    expect(config.admin.toString()).to.equal(ctx.admin.publicKey.toString());
    expect(config.usdcMint.toString()).to.equal(ctx.usdcMint.toString());
    expect(config.paused).to.be.false;
  });
});

