use anchor_lang::prelude::*;
use crate::state::Config;
use crate::errors::ZyuraError;

#[derive(Accounts)]
pub struct SetPauseStatus<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
}

pub fn set_pause_status(ctx: Context<SetPauseStatus>, paused: bool) -> Result<()> {
    require!(ctx.accounts.config.admin == ctx.accounts.admin.key(), ZyuraError::Unauthorized);
    
    ctx.accounts.config.paused = paused;
    msg!("Protocol pause status set to: {}", paused);
    Ok(())
}

#[derive(Accounts)]
pub struct CloseConfig<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        close = admin
    )]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
}

pub fn close_config(ctx: Context<CloseConfig>) -> Result<()> {
    require!(ctx.accounts.config.admin == ctx.accounts.admin.key(), ZyuraError::Unauthorized);
    
    msg!("Config account closed by admin");
    Ok(())
}
