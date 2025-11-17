use anchor_lang::prelude::*;
use crate::state::{Config, Product};
use crate::errors::ZyuraError;

#[derive(Accounts)]
#[instruction(product_id: u64)]
pub struct CreateProduct<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + Product::INIT_SPACE,
        seeds = [b"product", product_id.to_le_bytes().as_ref()],
        bump
    )]
    pub product: Account<'info, Product>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(product_id: u64)]
pub struct UpdateProduct<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(
        mut,
        seeds = [b"product", product.id.to_le_bytes().as_ref()],
        bump = product.bump
    )]
    pub product: Account<'info, Product>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_product(
    ctx: Context<CreateProduct>,
    product_id: u64,
    delay_threshold_minutes: u32,
    coverage_amount: u64,
    premium_rate_bps: u16,
    claim_window_hours: u32,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, ZyuraError::ProtocolPaused);
    require!(ctx.accounts.config.admin == ctx.accounts.admin.key(), ZyuraError::Unauthorized);
    
    let product = &mut ctx.accounts.product;
    product.id = product_id;
    product.delay_threshold_minutes = delay_threshold_minutes;
    product.coverage_amount = coverage_amount;
    product.premium_rate_bps = premium_rate_bps;
    product.claim_window_hours = claim_window_hours;
    product.active = true;
    product.bump = ctx.bumps.product;
    
    msg!("Product {} created", product_id);
    Ok(())
}

pub fn update_product(
    ctx: Context<UpdateProduct>,
    id: u64,
    delay_threshold_minutes: u32,
    coverage_amount: u64,
    premium_rate_bps: u16,
    claim_window_hours: u32,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, ZyuraError::ProtocolPaused);
    require!(ctx.accounts.config.admin == ctx.accounts.admin.key(), ZyuraError::Unauthorized);

    let product = &mut ctx.accounts.product;
    product.delay_threshold_minutes = delay_threshold_minutes;
    product.coverage_amount = coverage_amount;
    product.premium_rate_bps = premium_rate_bps;
    product.claim_window_hours = claim_window_hours;

    msg!("Product {} updated", id);
    Ok(())
}
