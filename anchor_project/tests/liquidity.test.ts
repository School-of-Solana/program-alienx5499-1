import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, mintTo, getAccount, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { expect } from "chai";
import { setupTestContext } from "./setup";

describe("Liquidity Management", () => {
  let ctx: Awaited<ReturnType<typeof setupTestContext>>;
  
  before(async () => {
    ctx = await setupTestContext();
  });

  it("Allows liquidity provider to deposit USDC", async () => {
    const [lpAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("liquidity_provider"), ctx.liquidityProvider.publicKey.toBuffer()],
      ctx.program.programId
    );

    const lpUsdcAta = await getOrCreateAssociatedTokenAccount(
      ctx.provider.connection,
      ctx.liquidityProvider,
      ctx.usdcMint,
      ctx.liquidityProvider.publicKey
    );
    await mintTo(ctx.provider.connection, ctx.usdcMintAuthority, ctx.usdcMint, lpUsdcAta.address, ctx.usdcMintAuthority, 10000 * 1e6);

    const depositAmount = new anchor.BN(1000 * 1e6);
    await ctx.program.methods.depositLiquidity(depositAmount)
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

    const lp = await ctx.program.account.liquidityProvider.fetch(lpAccount);
    expect(lp.totalDeposited.toString()).to.equal(depositAmount.toString());
    expect(lp.activeDeposit.toString()).to.equal(depositAmount.toString());
  });

  it("Allows liquidity provider to withdraw liquidity", async () => {
    if (!ctx.isAdminAuthorized) return;
    const [lpAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("liquidity_provider"), ctx.liquidityProvider.publicKey.toBuffer()],
      ctx.program.programId
    );

    const lpAta2 = await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.liquidityProvider, ctx.usdcMint, ctx.liquidityProvider.publicKey);
    const withdrawShares = new anchor.BN(500 * 1e6);

    await ctx.program.methods.withdrawLiquidity(withdrawShares)
      .accounts({
        config: ctx.configAccount,
        liquidityProvider: lpAccount,
        riskPoolVault: ctx.riskPoolVault,
        userUsdcAccount: lpAta2.address,
        user: ctx.liquidityProvider.publicKey,
        admin: ctx.admin.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([ctx.admin])
      .rpc();

    const lp = await ctx.program.account.liquidityProvider.fetch(lpAccount);
    expect(lp.activeDeposit.toString()).to.equal("500000000");
  });

  it("Prevents withdrawing more than active deposit", async () => {
    if (!ctx.isAdminAuthorized) return;
    
    const [lpAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("liquidity_provider"), ctx.liquidityProvider.publicKey.toBuffer()],
      ctx.program.programId
    );

    const lp = await ctx.program.account.liquidityProvider.fetch(lpAccount);
    const activeDeposit = lp.activeDeposit.toNumber();
    const excessiveWithdraw = new anchor.BN(activeDeposit + 1000 * 1e6);

    try {
      await ctx.program.methods.withdrawLiquidity(excessiveWithdraw)
        .accounts({
          config: ctx.configAccount,
          liquidityProvider: lpAccount,
          riskPoolVault: ctx.riskPoolVault,
          userUsdcAccount: await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.liquidityProvider, ctx.usdcMint, ctx.liquidityProvider.publicKey).then(a => a.address),
          user: ctx.liquidityProvider.publicKey,
          admin: ctx.admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([ctx.admin])
        .rpc();
      expect.fail("Expected transaction to fail when withdrawing more than active deposit");
    } catch (error: any) {
      expect(error.message).to.include("Invalid amount");
    }
  });

  it("Allows multiple liquidity deposits", async () => {
    const [lpAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("liquidity_provider"), ctx.liquidityProvider.publicKey.toBuffer()],
      ctx.program.programId
    );

    let lpBefore;
    try {
      lpBefore = await ctx.program.account.liquidityProvider.fetch(lpAccount);
    } catch (error) {
      lpBefore = { totalDeposited: new anchor.BN(0), activeDeposit: new anchor.BN(0) };
    }

    const lpUsdcAta = await getOrCreateAssociatedTokenAccount(ctx.provider.connection, ctx.liquidityProvider, ctx.usdcMint, ctx.liquidityProvider.publicKey);
    const lpBalance = await getAccount(ctx.provider.connection, lpUsdcAta.address).catch(() => ({ amount: BigInt(0) }));
    if (lpBalance.amount < BigInt(2000 * 1e6)) {
      await mintTo(ctx.provider.connection, ctx.usdcMintAuthority, ctx.usdcMint, lpUsdcAta.address, ctx.usdcMintAuthority, 2000 * 1e6);
    }

    let lpBeforeFirst;
    try {
      lpBeforeFirst = await ctx.program.account.liquidityProvider.fetch(lpAccount);
    } catch (error) {
      lpBeforeFirst = { totalDeposited: new anchor.BN(0), activeDeposit: new anchor.BN(0) };
    }
    const beforeTotal = lpBeforeFirst.totalDeposited.toNumber();

    const firstDeposit = new anchor.BN(500 * 1e6);
    await ctx.program.methods.depositLiquidity(firstDeposit)
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

    const lpAfterFirst = await ctx.program.account.liquidityProvider.fetch(lpAccount);
    const firstTotal = lpAfterFirst.totalDeposited.toNumber();
    const firstActiveDeposit = lpAfterFirst.activeDeposit.toNumber();
    const expectedFirstTotal = beforeTotal + firstDeposit.toNumber();
    const beforeActiveDeposit = lpBeforeFirst.activeDeposit ? lpBeforeFirst.activeDeposit.toNumber() : 0;
    const expectedFirstActiveDeposit = beforeActiveDeposit + firstDeposit.toNumber();
    expect(firstTotal).to.equal(expectedFirstTotal);
    expect(firstActiveDeposit).to.equal(expectedFirstActiveDeposit);

    const secondDeposit = new anchor.BN(300 * 1e6);
    await ctx.program.methods.depositLiquidity(secondDeposit)
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

    const lpAfterSecond = await ctx.program.account.liquidityProvider.fetch(lpAccount);
    const expectedTotal = firstTotal + secondDeposit.toNumber();
    const expectedActiveDeposit = firstActiveDeposit + secondDeposit.toNumber();
    expect(lpAfterSecond.totalDeposited.toNumber()).to.equal(expectedTotal);
    expect(lpAfterSecond.activeDeposit.toNumber()).to.equal(expectedActiveDeposit);
  });
});

