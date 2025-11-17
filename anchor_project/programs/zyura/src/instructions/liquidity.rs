use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Config, LiquidityProvider};
use crate::errors::ZyuraError;

#[derive(Accounts)]
pub struct DepositLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + LiquidityProvider::INIT_SPACE,
        seeds = [b"liquidity_provider", user.key().as_ref()],
        bump
    )]
    pub liquidity_provider: Account<'info, LiquidityProvider>,
    
    #[account(
        mut
    )]
    pub risk_pool_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(
        mut,
        seeds = [b"liquidity_provider", user.key().as_ref()],
        bump = liquidity_provider.bump
    )]
    pub liquidity_provider: Account<'info, LiquidityProvider>,
    
    #[account(
        mut
    )]
    pub risk_pool_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,
    
    /// CHECK: Only used to derive the liquidity_provider PDA. Not required to sign for vault outflow.
    #[account(mut)]
    pub user: UncheckedAccount<'info>,
    
    /// Admin authorizes transfers from the vault
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn deposit_liquidity(
    ctx: Context<DepositLiquidity>,
    amount: u64,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, ZyuraError::ProtocolPaused);
    require!(amount > 0, ZyuraError::InvalidAmount);
    
    // Transfer USDC from user to risk pool
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_usdc_account.to_account_info(),
            to: ctx.accounts.risk_pool_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;
    
    // Update liquidity provider account
    let lp = &mut ctx.accounts.liquidity_provider;
    if lp.provider == Pubkey::default() {
        lp.provider = ctx.accounts.user.key();
    } else {
        require!(lp.provider == ctx.accounts.user.key(), ZyuraError::Unauthorized);
    }
    lp.total_deposited += amount;
    lp.active_deposit += amount;
    lp.bump = ctx.bumps.liquidity_provider;
    
    msg!("Liquidity deposited: {} USDC", amount);
    Ok(())
}

pub fn withdraw_liquidity(
    ctx: Context<WithdrawLiquidity>,
    amount: u64,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, ZyuraError::ProtocolPaused);
    require!(amount > 0, ZyuraError::InvalidAmount);
    require!(ctx.accounts.liquidity_provider.active_deposit >= amount, ZyuraError::InvalidAmount);
    require!(ctx.accounts.config.admin == ctx.accounts.admin.key(), ZyuraError::Unauthorized);
    
    // Transfer USDC from risk pool to user
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.risk_pool_vault.to_account_info(),
            to: ctx.accounts.user_usdc_account.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;
    
    // Update liquidity provider account
    let lp = &mut ctx.accounts.liquidity_provider;
    lp.total_withdrawn += amount;
    lp.active_deposit -= amount;
    
    msg!("Liquidity withdrawn: {} USDC", amount);
    Ok(())
}