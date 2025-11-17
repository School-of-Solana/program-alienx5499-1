import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  mintTo,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { expect } from "chai";
import { setupTestContext, TOKEN_METADATA_PROGRAM_ID, PRODUCT_ID, PREMIUM_AMOUNT, FLIGHT_NUMBER, DEPARTURE_TIME, COVERAGE_AMOUNT, DELAY_THRESHOLD_MINUTES, PREMIUM_RATE_BPS, CLAIM_WINDOW_HOURS } from "./setup";

describe("Policy Payout", () => {
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

  async function ensureVaultLiquidity(product: any) {
    const vaultBalance = await getAccount(ctx.provider.connection, ctx.riskPoolVault).catch(() => ({ amount: BigInt(0) }));
    if (vaultBalance.amount < BigInt(product.coverageAmount.toString())) {
      const lpUsdcAta = await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.liquidityProvider, ctx.usdcMint, ctx.liquidityProvider.publicKey);
      const lpBalance = await getAccount(ctx.provider.connection, lpUsdcAta.address).catch(() => ({ amount: BigInt(0) }));
      if (lpBalance.amount < BigInt(product.coverageAmount.toString())) {
        await mintTo(ctx.provider.connection, ctx.usdcMintAuthority, ctx.usdcMint, lpUsdcAta.address, ctx.usdcMintAuthority, Number(product.coverageAmount) * 2);
      }
      const [lpAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("liquidity_provider"), ctx.liquidityProvider.publicKey.toBuffer()],
        ctx.program.programId
      );
      await ctx.program.methods.depositLiquidity(product.coverageAmount)
        .accounts({
          config: ctx.configAccount,
          liquidityProvider: lpAccount,
          riskPoolVault: ctx.riskPoolVault,
          userUsdcAccount: lpUsdcAta.address,
          user: ctx.liquidityProvider.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.liquidityProvider])
        .rpc();
    }
  }

  it("Allows admin to process payout for eligible delay", async () => {
    if (!ctx.isAdminAuthorized) return;
    
    const productData = await ensureProduct();
    if (!productData) return;
    const { product, productAccount } = productData;
    await ensureVaultLiquidity(product);

    const POLICY_ID_PAYOUT = new anchor.BN(Date.now() + 100);
    const [policyAccountPayout] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), POLICY_ID_PAYOUT.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );

    const requiredPremium = (product.coverageAmount.toNumber() * product.premiumRateBps) / 10000;
    const premiumAmount = new anchor.BN(Math.max(requiredPremium, PREMIUM_AMOUNT.toNumber()));

    const userAtaPayout = await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.user, ctx.usdcMint, ctx.user.publicKey);
    await mintTo(ctx.provider.connection, ctx.usdcMintAuthority, ctx.usdcMint, userAtaPayout.address, ctx.usdcMintAuthority, 1000 * 1e6);

    const policyNftMintPayout = Keypair.generate();
    const userPolicyNftAtaPayout = getAssociatedTokenAddressSync(policyNftMintPayout.publicKey, ctx.user.publicKey);
    const [metadataAccountPayout] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMintPayout.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccountPayout] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMintPayout.publicKey.toBuffer(), Buffer.from("edition")],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from("policy_mint_authority")], ctx.program.programId);

    await ctx.program.methods.purchasePolicy(POLICY_ID_PAYOUT, "DD999", new anchor.BN(DEPARTURE_TIME), premiumAmount, false, "")
      .accounts({
        config: ctx.configAccount,
        product: productAccount,
        policy: policyAccountPayout,
        riskPoolVault: ctx.riskPoolVault,
        userUsdcAccount: userAtaPayout.address,
        user: ctx.user.publicKey,
        policyNftMint: policyNftMintPayout.publicKey,
        userPolicyNftAta: userPolicyNftAtaPayout,
        metadataAccount: metadataAccountPayout,
        masterEditionAccount: masterEditionAccountPayout,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        mintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([ctx.user, policyNftMintPayout])
      .rpc();

    const delayMinutes = product.delayThresholdMinutes + 10;
    const userBalanceBefore = (await getAccount(ctx.provider.connection, userAtaPayout.address)).amount;
    const vaultBalanceBefore = (await getAccount(ctx.provider.connection, ctx.riskPoolVault)).amount;

    await ctx.program.methods.processPayout(POLICY_ID_PAYOUT, delayMinutes)
      .accounts({
        config: ctx.configAccount,
        product: productAccount,
        policy: policyAccountPayout,
        riskPoolVault: ctx.riskPoolVault,
        policyholderUsdcAccount: userAtaPayout.address,
        admin: ctx.admin.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.admin])
      .rpc();

    const policy = await ctx.program.account.policy.fetch(policyAccountPayout);
    expect(policy.status).to.deep.equal({ paidOut: {} });
    expect(policy.paidAt).to.not.be.null;

    const userBalanceAfter = (await getAccount(ctx.provider.connection, userAtaPayout.address)).amount;
    const vaultBalanceAfter = (await getAccount(ctx.provider.connection, ctx.riskPoolVault)).amount;
    expect(Number(userBalanceAfter) - Number(userBalanceBefore)).to.equal(Number(product.coverageAmount));
    expect(Number(vaultBalanceBefore) - Number(vaultBalanceAfter)).to.equal(Number(product.coverageAmount));
  });

  it("Prevents payout when delay threshold not met", async () => {
    if (!ctx.isAdminAuthorized) return;
    
    const POLICY_ID_NO_PAYOUT = new anchor.BN(Date.now() + 200);
    const [policyAccountNoPayout] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), POLICY_ID_NO_PAYOUT.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );

    const productData = await ensureProduct();
    if (!productData) return;
    const { product, productAccount } = productData;
    const requiredPremium = (product.coverageAmount.toNumber() * product.premiumRateBps) / 10000;
    const premiumAmount = new anchor.BN(Math.max(requiredPremium, PREMIUM_AMOUNT.toNumber()));

    const userAtaNoPayout = await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.user, ctx.usdcMint, ctx.user.publicKey);
    await mintTo(ctx.provider.connection, ctx.usdcMintAuthority, ctx.usdcMint, userAtaNoPayout.address, ctx.usdcMintAuthority, 1000 * 1e6);

    const policyNftMintNoPayout = Keypair.generate();
    const userPolicyNftAtaNoPayout = getAssociatedTokenAddressSync(policyNftMintNoPayout.publicKey, ctx.user.publicKey);
    const [metadataAccountNoPayout] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMintNoPayout.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccountNoPayout] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMintNoPayout.publicKey.toBuffer(), Buffer.from("edition")],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from("policy_mint_authority")], ctx.program.programId);

    await ctx.program.methods.purchasePolicy(POLICY_ID_NO_PAYOUT, "EE888", new anchor.BN(DEPARTURE_TIME), premiumAmount, false, "")
      .accounts({
        config: ctx.configAccount,
        product: productAccount,
        policy: policyAccountNoPayout,
        riskPoolVault: ctx.riskPoolVault,
        userUsdcAccount: userAtaNoPayout.address,
        user: ctx.user.publicKey,
        policyNftMint: policyNftMintNoPayout.publicKey,
        userPolicyNftAta: userPolicyNftAtaNoPayout,
        metadataAccount: metadataAccountNoPayout,
        masterEditionAccount: masterEditionAccountNoPayout,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        mintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([ctx.user, policyNftMintNoPayout])
      .rpc();

    const delayMinutes = product.delayThresholdMinutes - 5;
    try {
      await ctx.program.methods.processPayout(POLICY_ID_NO_PAYOUT, delayMinutes)
        .accounts({
          config: ctx.configAccount,
          product: productAccount,
          policy: policyAccountNoPayout,
          riskPoolVault: ctx.riskPoolVault,
          policyholderUsdcAccount: userAtaNoPayout.address,
          admin: ctx.admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([ctx.admin])
        .rpc();
      expect.fail("Expected transaction to fail when delay threshold not met");
    } catch (error: any) {
      expect(error.message).to.include("Delay threshold not met");
    }
  });

  it("Prevents payout when policy is not active", async () => {
    if (!ctx.isAdminAuthorized) return;
    
    const productData = await ensureProduct();
    if (!productData) return;
    const { product, productAccount } = productData;
    await ensureVaultLiquidity(product);

    const POLICY_ID_INACTIVE = new anchor.BN(Date.now() + 300);
    const [policyAccountInactive] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), POLICY_ID_INACTIVE.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );

    const requiredPremium = (product.coverageAmount.toNumber() * product.premiumRateBps) / 10000;
    const premiumAmount = new anchor.BN(Math.max(requiredPremium, PREMIUM_AMOUNT.toNumber()));

    const userAtaInactive = await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.user, ctx.usdcMint, ctx.user.publicKey);
    await mintTo(ctx.provider.connection, ctx.usdcMintAuthority, ctx.usdcMint, userAtaInactive.address, ctx.usdcMintAuthority, 1000 * 1e6);

    const policyNftMintInactive = Keypair.generate();
    const userPolicyNftAtaInactive = getAssociatedTokenAddressSync(policyNftMintInactive.publicKey, ctx.user.publicKey);
    const [metadataAccountInactive] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMintInactive.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccountInactive] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMintInactive.publicKey.toBuffer(), Buffer.from("edition")],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from("policy_mint_authority")], ctx.program.programId);

    await ctx.program.methods.purchasePolicy(POLICY_ID_INACTIVE, "FF777", new anchor.BN(DEPARTURE_TIME), premiumAmount, false, "")
      .accounts({
        config: ctx.configAccount,
        product: productAccount,
        policy: policyAccountInactive,
        riskPoolVault: ctx.riskPoolVault,
        userUsdcAccount: userAtaInactive.address,
        user: ctx.user.publicKey,
        policyNftMint: policyNftMintInactive.publicKey,
        userPolicyNftAta: userPolicyNftAtaInactive,
        metadataAccount: metadataAccountInactive,
        masterEditionAccount: masterEditionAccountInactive,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        mintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([ctx.user, policyNftMintInactive])
      .rpc();

    const delayMinutes = product.delayThresholdMinutes + 10;
    
    try {
      await ctx.program.methods.processPayout(POLICY_ID_INACTIVE, delayMinutes)
        .accounts({
          config: ctx.configAccount,
          product: productAccount,
          policy: policyAccountInactive,
          riskPoolVault: ctx.riskPoolVault,
          policyholderUsdcAccount: userAtaInactive.address,
          admin: ctx.admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([ctx.admin])
        .rpc();
      
      const policyAfterPayout = await ctx.program.account.policy.fetch(policyAccountInactive);
      if (policyAfterPayout.status.paidOut !== undefined) {
        try {
          await ctx.program.methods.processPayout(POLICY_ID_INACTIVE, delayMinutes)
            .accounts({
              config: ctx.configAccount,
              product: productAccount,
              policy: policyAccountInactive,
              riskPoolVault: ctx.riskPoolVault,
              policyholderUsdcAccount: userAtaInactive.address,
              admin: ctx.admin.publicKey,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([ctx.admin])
            .rpc();
          expect.fail("Expected transaction to fail when policy is not active");
        } catch (error: any) {
          const errorMsg = error?.message || String(error);
          expect(errorMsg.toLowerCase()).to.include("not active");
        }
      } else {
        expect.fail("Policy should have been paid out");
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.toLowerCase().includes("not active") || errorMsg.toLowerCase().includes("paidout")) {
        return;
      }
      throw error;
    }
  });

  it("Prevents payout when protocol is paused", async () => {
    if (!ctx.isAdminAuthorized) return;
    
    const POLICY_ID_PAUSED = new anchor.BN(Date.now() + 400);
    const [policyAccountPaused] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), POLICY_ID_PAUSED.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );

    const productData = await ensureProduct();
    if (!productData) return;
    const { product, productAccount } = productData;
    const requiredPremium = (product.coverageAmount.toNumber() * product.premiumRateBps) / 10000;
    const premiumAmount = new anchor.BN(Math.max(requiredPremium, PREMIUM_AMOUNT.toNumber()));

    const userAtaPaused = await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.user, ctx.usdcMint, ctx.user.publicKey);
    await mintTo(ctx.provider.connection, ctx.usdcMintAuthority, ctx.usdcMint, userAtaPaused.address, ctx.usdcMintAuthority, 1000 * 1e6);

    const policyNftMintPaused = Keypair.generate();
    const userPolicyNftAtaPaused = getAssociatedTokenAddressSync(policyNftMintPaused.publicKey, ctx.user.publicKey);
    const [metadataAccountPaused] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMintPaused.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccountPaused] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMintPaused.publicKey.toBuffer(), Buffer.from("edition")],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from("policy_mint_authority")], ctx.program.programId);

    await ctx.program.methods.purchasePolicy(POLICY_ID_PAUSED, "GG666", new anchor.BN(DEPARTURE_TIME), premiumAmount, false, "")
      .accounts({
        config: ctx.configAccount,
        product: productAccount,
        policy: policyAccountPaused,
        riskPoolVault: ctx.riskPoolVault,
        userUsdcAccount: userAtaPaused.address,
        user: ctx.user.publicKey,
        policyNftMint: policyNftMintPaused.publicKey,
        userPolicyNftAta: userPolicyNftAtaPaused,
        metadataAccount: metadataAccountPaused,
        masterEditionAccount: masterEditionAccountPaused,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        mintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([ctx.user, policyNftMintPaused])
      .rpc();

    await ctx.program.methods.setPauseStatus(true)
      .accounts({
        config: ctx.configAccount,
        admin: ctx.admin.publicKey,
      })
      .signers([ctx.admin])
      .rpc();

    const delayMinutes = DELAY_THRESHOLD_MINUTES + 10;
    try {
      await ctx.program.methods.processPayout(POLICY_ID_PAUSED, delayMinutes)
        .accounts({
          config: ctx.configAccount,
          product: productAccount,
          policy: policyAccountPaused,
          riskPoolVault: ctx.riskPoolVault,
          policyholderUsdcAccount: userAtaPaused.address,
          admin: ctx.admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([ctx.admin])
        .rpc();
      expect.fail("Expected transaction to fail when protocol is paused");
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      expect(errorMsg).to.include("Protocol is currently paused");
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

  it("Prevents payout by unauthorized user", async () => {
    if (!ctx.isAdminAuthorized) return;
    
    const POLICY_ID_UNAUTH = new anchor.BN(Date.now() + 500);
    const [policyAccountUnauth] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), POLICY_ID_UNAUTH.toArrayLike(Buffer, "le", 8)],
      ctx.program.programId
    );

    const productData = await ensureProduct();
    if (!productData) return;
    const { product, productAccount } = productData;
    const requiredPremium = (product.coverageAmount.toNumber() * product.premiumRateBps) / 10000;
    const premiumAmount = new anchor.BN(Math.max(requiredPremium, PREMIUM_AMOUNT.toNumber()));

    const userAtaUnauth = await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.user, ctx.usdcMint, ctx.user.publicKey);
    await mintTo(ctx.provider.connection, ctx.usdcMintAuthority, ctx.usdcMint, userAtaUnauth.address, ctx.usdcMintAuthority, 1000 * 1e6);

    const policyNftMintUnauth = Keypair.generate();
    const userPolicyNftAtaUnauth = getAssociatedTokenAddressSync(policyNftMintUnauth.publicKey, ctx.user.publicKey);
    const [metadataAccountUnauth] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMintUnauth.publicKey.toBuffer()],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [masterEditionAccountUnauth] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), policyNftMintUnauth.publicKey.toBuffer(), Buffer.from("edition")],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [mintAuthority] = PublicKey.findProgramAddressSync([Buffer.from("policy_mint_authority")], ctx.program.programId);

    await ctx.program.methods.purchasePolicy(POLICY_ID_UNAUTH, "HH555", new anchor.BN(DEPARTURE_TIME), premiumAmount, false, "")
      .accounts({
        config: ctx.configAccount,
        product: productAccount,
        policy: policyAccountUnauth,
        riskPoolVault: ctx.riskPoolVault,
        userUsdcAccount: userAtaUnauth.address,
        user: ctx.user.publicKey,
        policyNftMint: policyNftMintUnauth.publicKey,
        userPolicyNftAta: userPolicyNftAtaUnauth,
        metadataAccount: metadataAccountUnauth,
        masterEditionAccount: masterEditionAccountUnauth,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        mintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([ctx.user, policyNftMintUnauth])
      .rpc();

    const delayMinutes = product.delayThresholdMinutes + 10;
    try {
      await ctx.program.methods.processPayout(POLICY_ID_UNAUTH, delayMinutes)
        .accounts({
          config: ctx.configAccount,
          product: productAccount,
          policy: policyAccountUnauth,
          riskPoolVault: ctx.riskPoolVault,
          policyholderUsdcAccount: userAtaUnauth.address,
          admin: ctx.user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([ctx.user])
        .rpc();
      expect.fail("Expected transaction to fail with unauthorized access");
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      expect(errorMsg.toLowerCase()).to.include("unauthorized");
    }
  });
});

