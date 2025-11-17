use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum PolicyStatus {
    Active,
    PaidOut,
    Expired,
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub switchboard_program: Pubkey,
    // Re-introduced to match existing on-chain account layout where admin and vault are the same
    pub risk_pool_vault: Pubkey,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Product {
    pub id: u64,
    pub delay_threshold_minutes: u32,
    pub coverage_amount: u64,
    pub premium_rate_bps: u16,
    pub claim_window_hours: u32,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Policy {
    pub id: u64,
    pub policyholder: Pubkey,
    pub product_id: u64,
    #[max_len(20)]
    pub flight_number: String,
    pub departure_time: i64,
    pub premium_paid: u64,
    pub coverage_amount: u64,
    pub status: PolicyStatus,
    pub created_at: i64,
    pub paid_at: Option<i64>,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct LiquidityProvider {
    pub provider: Pubkey,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub active_deposit: u64,
    pub bump: u8,
}