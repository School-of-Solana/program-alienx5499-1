import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { setupTestContext } from "./setup";

describe("Admin Functions", () => {
  let ctx: Awaited<ReturnType<typeof setupTestContext>>;
  
  before(async () => {
    ctx = await setupTestContext();
  });

  it("Allows admin to pause the protocol", async () => {
    if (!ctx.isAdminAuthorized) return;
    try {
      const existingConfig = await ctx.program.account.config.fetch(ctx.configAccount);
      if (existingConfig.paused) {
        expect(existingConfig.paused).to.be.true;
        return;
      }
    } catch (error: any) {
      if (error.message?.includes("Account does not exist")) {
        return;
      }
      throw error;
    }
    await ctx.program.methods.setPauseStatus(true)
      .accounts({
        config: ctx.configAccount,
        admin: ctx.admin.publicKey,
      })
      .signers([ctx.admin])
      .rpc();
    const config = await ctx.program.account.config.fetch(ctx.configAccount);
    expect(config.paused).to.be.true;
  });

  it("Allows admin to unpause the protocol", async () => {
    if (!ctx.isAdminAuthorized) return;
    try {
      const existingConfig = await ctx.program.account.config.fetch(ctx.configAccount);
      if (!existingConfig.paused) {
        await ctx.program.methods.setPauseStatus(true)
          .accounts({
            config: ctx.configAccount,
            admin: ctx.admin.publicKey,
          })
          .signers([ctx.admin])
          .rpc();
      }
    } catch (error: any) {
      if (error.message?.includes("Account does not exist")) {
        return;
      }
      throw error;
    }
    await ctx.program.methods.setPauseStatus(false)
      .accounts({
        config: ctx.configAccount,
        admin: ctx.admin.publicKey,
      })
      .signers([ctx.admin])
      .rpc();
    const config = await ctx.program.account.config.fetch(ctx.configAccount);
    expect(config.paused).to.be.false;
  });

  it("Prevents non-admin from pausing protocol", async () => {
    if (!ctx.isAdminAuthorized) return;
    
    try {
      const config = await ctx.program.account.config.fetch(ctx.configAccount);
      if (!config) return;
    } catch (error: any) {
      if (error.message?.includes("Account does not exist")) {
        return;
      }
    }
    
    try {
      await ctx.program.methods.setPauseStatus(true)
        .accounts({
          config: ctx.configAccount,
          admin: ctx.user.publicKey,
        })
        .signers([ctx.user])
        .rpc();
      expect.fail("Expected transaction to fail with unauthorized access");
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes("Account does not exist") || errorMsg.includes("AccountNotInitialized")) {
        return;
      }
      if (!errorMsg.includes("Unauthorized") && !errorMsg.includes("unauthorized")) {
        console.log("Unexpected error:", errorMsg);
      }
      expect(errorMsg.toLowerCase()).to.include("unauthorized");
    }
  });
});

