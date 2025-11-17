import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, mintTo, getAccount, getOrCreateAssociatedTokenAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { expect } from "chai";
import { setupTestContext, TOKEN_METADATA_PROGRAM_ID, PRODUCT_ID, PREMIUM_AMOUNT, FLIGHT_NUMBER, DEPARTURE_TIME, COVERAGE_AMOUNT, DELAY_THRESHOLD_MINUTES, PREMIUM_RATE_BPS, CLAIM_WINDOW_HOURS } from "./setup";

describe("Policy Purchase", () => {
  let ctx: Awaited<ReturnType<typeof setupTestContext>>;
  
  before(async () => {
    ctx = await setupTestContext();
  });

  async function ensureProduct() {
    const [productAccount] = PublicKey.findProgramAddressSync([Buffer.from("product"), PRODUCT_ID.toArrayLike(Buffer, "le", 8)], ctx.program.programId);
    let product;
    try {
      product = await ctx.program.account.product.fetch(productAccount);
    } catch (error: any) {
      if (error.message?.includes("Account does not exist")) {
        if (!ctx.isAdminAuthorized) {
          return null;
        }
        const config = await ctx.program.account.config.fetch(ctx.configAccount).catch(() => null);
        if (config && config.paused) {
          await ctx.program.methods.setPauseStatus(false)
            .accounts({ config: ctx.configAccount, admin: ctx.admin.publicKey })
            .signers([ctx.admin])
            .rpc();
        }
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
          product = await ctx.program.account.product.fetch(productAccount);
        } catch (createError: any) {
          if (createError.message?.includes("already in use")) {
            product = await ctx.program.account.product.fetch(productAccount);
          } else {
            throw createError;
          }
        }
      } else {
        throw error;
      }
    }
    return { product, productAccount };
  }

  it("Allows user to purchase flight delay insurance policy", async () => {
    const productData = await ensureProduct();
    if (!productData) return;
    const { product, productAccount } = productData;

    const uniquePolicyId = new anchor.BN(Date.now());
    const [policyAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), uniquePolicyId.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );

    try {
      await ctx.program.account.policy.fetch(policyAccount);
      throw new Error("Policy account already exists");
    } catch (error: any) {
      if (!error.message?.includes("Account does not exist") && !error.message?.includes("already exists")) throw error;
    }
    const requiredPremium = (product.coverageAmount.toNumber() * product.premiumRateBps) / 10000;
    const premiumAmount = new anchor.BN(Math.max(requiredPremium, PREMIUM_AMOUNT.toNumber()));

    const userAta = await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.user, ctx.usdcMint, ctx.user.publicKey);
    const userBalance = await getAccount(ctx.provider.connection, userAta.address).catch(() => null);
    if (!userBalance || userBalance.amount < BigInt(1000 * 1e6)) {
      await mintTo(ctx.provider.connection, ctx.usdcMintAuthority, ctx.usdcMint, userAta.address, ctx.usdcMintAuthority, 1000 * 1e6);
    }

    const policyNftMint = Keypair.generate();
    const userPolicyNftAta = getAssociatedTokenAddressSync(policyNftMint.publicKey, ctx.user.publicKey);
    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint.publicKey.toBuffer(), Buffer.from("edition")],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from("policy_mint_authority")], ctx.program.programId);

    try {
      await ctx.program.methods.purchasePolicy(uniquePolicyId, FLIGHT_NUMBER, new anchor.BN(DEPARTURE_TIME), premiumAmount, false, "")
        .accounts({
          config: ctx.configAccount,
          product: productAccount,
          policy: policyAccount,
          riskPoolVault: ctx.riskPoolVault,
          userUsdcAccount: userAta.address,
          user: ctx.user.publicKey,
          policyNftMint: policyNftMint.publicKey,
          userPolicyNftAta: userPolicyNftAta,
          metadataAccount,
          masterEditionAccount,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          mintAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([ctx.user, policyNftMint])
        .rpc();
    } catch (error: any) {
      if (error.message?.includes("already in use")) {
        const policy = await ctx.program.account.policy.fetch(policyAccount);
        expect(policy).to.exist;
        return;
      }
      throw error;
    }

    const policy = await ctx.program.account.policy.fetch(policyAccount);
    expect(policy.id.toString()).to.equal(uniquePolicyId.toString());
    expect(policy.policyholder.toString()).to.equal(ctx.user.publicKey.toString());
    expect(policy.flightNumber).to.equal(FLIGHT_NUMBER);
    expect(policy.premiumPaid.toString()).to.equal(premiumAmount.toString());
    expect(policy.status).to.deep.equal({ active: {} });

    const nftAtaAcc = await getAccount(ctx.provider.connection, userPolicyNftAta);
    expect(Number(nftAtaAcc.amount)).to.equal(1);
  });

  it("Prevents policy purchase when protocol is paused", async () => {
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

    const POLICY_ID_2 = new anchor.BN(Date.now());
    const [policyAccount2] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), POLICY_ID_2.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );

    try {
      await ctx.program.account.policy.fetch(policyAccount2);
      return;
    } catch (error) {}

    const productData = await ensureProduct();
    if (!productData) return;
    const { product, productAccount } = productData;
    const requiredPremium = (product.coverageAmount.toNumber() * product.premiumRateBps) / 10000;
    const premiumAmount = new anchor.BN(Math.max(requiredPremium, PREMIUM_AMOUNT.toNumber()));

    const userAta2 = await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.user, ctx.usdcMint, ctx.user.publicKey);
    await mintTo(ctx.provider.connection, ctx.usdcMintAuthority, ctx.usdcMint, userAta2.address, ctx.usdcMintAuthority, 1000 * 1e6);

    const policyNftMint2 = Keypair.generate();
    const userPolicyNftAta2 = getAssociatedTokenAddressSync(policyNftMint2.publicKey, ctx.user.publicKey);
    const [metadataAccount2] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint2.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccount2] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint2.publicKey.toBuffer(), Buffer.from("edition")],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from("policy_mint_authority")], ctx.program.programId);

    try {
      await ctx.program.methods.purchasePolicy(POLICY_ID_2, "BB456", new anchor.BN(DEPARTURE_TIME), premiumAmount, false, "")
        .accounts({
          config: ctx.configAccount,
          product: productAccount,
          policy: policyAccount2,
          riskPoolVault: ctx.riskPoolVault,
          userUsdcAccount: userAta2.address,
          user: ctx.user.publicKey,
          policyNftMint: policyNftMint2.publicKey,
          userPolicyNftAta: userPolicyNftAta2,
          metadataAccount: metadataAccount2,
          masterEditionAccount: masterEditionAccount2,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          mintAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([ctx.user, policyNftMint2])
        .rpc();
      expect.fail("Expected transaction to fail when protocol is paused");
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      const errorCode = error?.error?.errorCode?.code || error?.code;
      if (errorMsg.includes("Protocol is currently paused") || errorMsg.includes("ProtocolPaused") || errorCode === "ProtocolPaused" ||
          (error.error && error.error.errorCode && error.error.errorCode.code === "ProtocolPaused")) {
        await ctx.program.methods.setPauseStatus(false)
          .accounts({
            config: ctx.configAccount,
            admin: ctx.admin.publicKey,
          })
          .signers([ctx.admin])
          .rpc();
        return;
      }
      console.log("Unexpected error format:", error);
      throw new Error(`Expected "Protocol is currently paused" error, but got: ${errorMsg}`);
    }
  });

  it("Handles insufficient premium amount", async () => {
    const productData = await ensureProduct();
    if (!productData) return;
    const { product, productAccount } = productData;

    const POLICY_ID_3 = new anchor.BN(Date.now() + 1);
    const [policyAccount3] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), POLICY_ID_3.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );

    const userAta3 = await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.user, ctx.usdcMint, ctx.user.publicKey);
    await mintTo(ctx.provider.connection, ctx.usdcMintAuthority, ctx.usdcMint, userAta3.address, ctx.usdcMintAuthority, 1000 * 1e6);

    const insufficientPremium = new anchor.BN(1 * 1e6);
    const policyNftMint3 = Keypair.generate();
    const userPolicyNftAta3 = getAssociatedTokenAddressSync(policyNftMint3.publicKey, ctx.user.publicKey);
    const [metadataAccount3] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint3.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccount3] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint3.publicKey.toBuffer(), Buffer.from("edition")],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from("policy_mint_authority")], ctx.program.programId);

    try {
      await ctx.program.methods.purchasePolicy(POLICY_ID_3, "CC789", new anchor.BN(DEPARTURE_TIME), insufficientPremium, false, "")
        .accounts({
          config: ctx.configAccount,
          product: productAccount,
          policy: policyAccount3,
          riskPoolVault: ctx.riskPoolVault,
          userUsdcAccount: userAta3.address,
          user: ctx.user.publicKey,
          policyNftMint: policyNftMint3.publicKey,
          userPolicyNftAta: userPolicyNftAta3,
          metadataAccount: metadataAccount3,
          masterEditionAccount: masterEditionAccount3,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          mintAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([ctx.user, policyNftMint3])
        .rpc();
      expect.fail("Expected transaction to fail with insufficient premium");
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      expect(errorMsg.toLowerCase()).to.include("insufficient premium");
    }
  });

  it("Allows user to purchase multiple policies with different flight numbers", async () => {
    const productData = await ensureProduct();
    if (!productData) return;
    const { product, productAccount } = productData;

    const requiredPremium = (product.coverageAmount.toNumber() * product.premiumRateBps) / 10000;
    const premiumAmount = new anchor.BN(Math.max(requiredPremium, PREMIUM_AMOUNT.toNumber()));

    const userAta = await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.user, ctx.usdcMint, ctx.user.publicKey);
    const userBalance = await getAccount(ctx.provider.connection, userAta.address).catch(() => null);
    if (!userBalance || userBalance.amount < BigInt(2000 * 1e6)) {
      await mintTo(ctx.provider.connection, ctx.usdcMintAuthority, ctx.usdcMint, userAta.address, ctx.usdcMintAuthority, 2000 * 1e6);
    }

    const policyId1 = new anchor.BN(Date.now() + 1000);
    const [policyAccount1] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), policyId1.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );

    const policyNftMint1 = Keypair.generate();
    const userPolicyNftAta1 = getAssociatedTokenAddressSync(policyNftMint1.publicKey, ctx.user.publicKey);
    const [metadataAccount1] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint1.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccount1] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint1.publicKey.toBuffer(), Buffer.from("edition")],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from("policy_mint_authority")], ctx.program.programId);

    await ctx.program.methods.purchasePolicy(policyId1, "FLIGHT001", new anchor.BN(DEPARTURE_TIME), premiumAmount, false, "")
      .accounts({
        config: ctx.configAccount,
        product: productAccount,
        policy: policyAccount1,
        riskPoolVault: ctx.riskPoolVault,
        userUsdcAccount: userAta.address,
        user: ctx.user.publicKey,
        policyNftMint: policyNftMint1.publicKey,
        userPolicyNftAta: userPolicyNftAta1,
        metadataAccount: metadataAccount1,
        masterEditionAccount: masterEditionAccount1,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        mintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([ctx.user, policyNftMint1])
      .rpc();

    const policy1 = await ctx.program.account.policy.fetch(policyAccount1);
    expect(policy1.flightNumber).to.equal("FLIGHT001");

    const policyId2 = new anchor.BN(Date.now() + 2000);
    const [policyAccount2] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), policyId2.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );

    const policyNftMint2 = Keypair.generate();
    const userPolicyNftAta2 = getAssociatedTokenAddressSync(policyNftMint2.publicKey, ctx.user.publicKey);
    const [metadataAccount2] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint2.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccount2] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMint2.publicKey.toBuffer(), Buffer.from("edition")],
      TOKEN_METADATA_PROGRAM_ID
    );

    await ctx.program.methods.purchasePolicy(policyId2, "FLIGHT002", new anchor.BN(DEPARTURE_TIME + 7200), premiumAmount, false, "")
      .accounts({
        config: ctx.configAccount,
        product: productAccount,
        policy: policyAccount2,
        riskPoolVault: ctx.riskPoolVault,
        userUsdcAccount: userAta.address,
        user: ctx.user.publicKey,
        policyNftMint: policyNftMint2.publicKey,
        userPolicyNftAta: userPolicyNftAta2,
        metadataAccount: metadataAccount2,
        masterEditionAccount: masterEditionAccount2,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        mintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([ctx.user, policyNftMint2])
      .rpc();

    const policy2 = await ctx.program.account.policy.fetch(policyAccount2);
    expect(policy2.flightNumber).to.equal("FLIGHT002");
    expect(policy2.policyholder.toString()).to.equal(ctx.user.publicKey.toString());
  });
});

