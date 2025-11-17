use anchor_lang::prelude::*;
use crate::state::Config;
use crate::errors::ZyuraError;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize(
    ctx: Context<Initialize>,
    admin: Pubkey,
    usdc_mint: Pubkey,
    switchboard_program: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    if config.admin != Pubkey::default() {
        require!(config.admin == admin, ZyuraError::Unauthorized);
    }

    config.admin = admin;
    config.usdc_mint = usdc_mint;
    config.switchboard_program = switchboard_program;
    config.paused = false;
    config.bump = ctx.bumps.config;
    
    msg!("ZYURA protocol initialized");
    Ok(())
}
