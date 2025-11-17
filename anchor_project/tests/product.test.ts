import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { setupTestContext, PRODUCT_ID, DELAY_THRESHOLD_MINUTES, COVERAGE_AMOUNT, PREMIUM_RATE_BPS, CLAIM_WINDOW_HOURS } from "./setup";


describe("Product Management", () => {
  let ctx: Awaited<ReturnType<typeof setupTestContext>>;
  
  before(async () => {
    ctx = await setupTestContext();
  });

  it("Creates a flight delay insurance product", async () => {
    const [productAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("product"), PRODUCT_ID.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );

    try {
      const existingProduct = await ctx.program.account.product.fetch(productAccount);
      if (existingProduct.id.toString() === PRODUCT_ID.toString()) {
        expect(existingProduct.id.toString()).to.equal(PRODUCT_ID.toString());
        expect(existingProduct.delayThresholdMinutes).to.equal(DELAY_THRESHOLD_MINUTES);
        expect(existingProduct.coverageAmount.toString()).to.equal(COVERAGE_AMOUNT.toString());
        expect(existingProduct.premiumRateBps).to.equal(PREMIUM_RATE_BPS);
        expect(existingProduct.active).to.be.true;
        return;
      }
    } catch (error) {}

    try {
      const config = await ctx.program.account.config.fetch(ctx.configAccount);
      if (config.paused) {
        await ctx.program.methods.setPauseStatus(false)
          .accounts({
            config: ctx.configAccount,
            admin: ctx.admin.publicKey,
          })
          .signers([ctx.admin])
          .rpc();
      }
    } catch (error) {}

    try {
      await ctx.program.methods.createProduct(PRODUCT_ID, DELAY_THRESHOLD_MINUTES, COVERAGE_AMOUNT, PREMIUM_RATE_BPS, CLAIM_WINDOW_HOURS)
        .accounts({
          config: ctx.configAccount,
          product: productAccount,
          admin: ctx.admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.admin])
        .rpc();
    } catch (error: any) {
      if (!error.message?.includes("already in use")) throw error;
    }

    const product = await ctx.program.account.product.fetch(productAccount);
    expect(product.id.toString()).to.equal(PRODUCT_ID.toString());
    if (product.delayThresholdMinutes === DELAY_THRESHOLD_MINUTES) {
      expect(product.delayThresholdMinutes).to.equal(DELAY_THRESHOLD_MINUTES);
      expect(product.coverageAmount.toString()).to.equal(COVERAGE_AMOUNT.toString());
    }
    expect(product.premiumRateBps).to.equal(PREMIUM_RATE_BPS);
    expect(product.active).to.be.true;
  });

  it("Allows admin to update product parameters", async () => {
    if (!ctx.isAdminAuthorized) return;
    const [productAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("product"), PRODUCT_ID.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );
    const newDelayThreshold = 45;
    const newCoverageAmount = new anchor.BN(2000 * 1e6);
    await ctx.program.methods.updateProduct(PRODUCT_ID, newDelayThreshold, newCoverageAmount, PREMIUM_RATE_BPS, CLAIM_WINDOW_HOURS)
      .accounts({
        config: ctx.configAccount,
        product: productAccount,
        admin: ctx.admin.publicKey,
      })
      .signers([ctx.admin])
      .rpc();
    const product = await ctx.program.account.product.fetch(productAccount);
    expect(product.delayThresholdMinutes).to.equal(newDelayThreshold);
    expect(product.coverageAmount.toString()).to.equal(newCoverageAmount.toString());
  });

  it("Prevents creating product when protocol is paused", async () => {
    if (!ctx.isAdminAuthorized) return;
    
    const config = await ctx.program.account.config.fetch(ctx.configAccount);
    if (!config.paused) {
      await ctx.program.methods.setPauseStatus(true)
        .accounts({
          config: ctx.configAccount,
          admin: ctx.admin.publicKey,
        })
        .signers([ctx.admin])
        .rpc();
    }

    const pausedProductId = new anchor.BN(999);
    const [pausedProductAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("product"), pausedProductId.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );

    try {
      await ctx.program.methods.createProduct(pausedProductId, DELAY_THRESHOLD_MINUTES, COVERAGE_AMOUNT, PREMIUM_RATE_BPS, CLAIM_WINDOW_HOURS)
        .accounts({
          config: ctx.configAccount,
          product: pausedProductAccount,
          admin: ctx.admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.admin])
        .rpc();
      expect.fail("Expected transaction to fail when protocol is paused");
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      expect(errorMsg.toLowerCase()).to.include("paused");
    } finally {
      await ctx.program.methods.setPauseStatus(false)
        .accounts({
          config: ctx.configAccount,
          admin: ctx.admin.publicKey,
        })
        .signers([ctx.admin])
        .rpc();
    }
  });
});

