use anchor_lang::prelude::*;

/// ZYURA – On-chain flight-delay insurance
///
/// Workflow overview:
/// - Admin initializes config and creates one or more `Product`s (coverage, premium rate, thresholds).
/// - Liquidity providers deposit USDC into the protocol’s risk pool vault.
/// - A customer purchases a policy by paying the premium in USDC:
///   - Premium is transferred to the risk pool vault
///   - A `Policy` account is created and set Active
///   - An NFT is minted to the buyer as proof-of-insurance (Metaplex-compliant, supply=1)
/// - When an eligible delay occurs and is authorized by admin/oracle policy, a payout is processed:
///   - USDC is transferred from the risk pool vault to the policyholder
///   - Policy status is updated to PaidOut

pub mod state;
pub mod instructions;
pub mod errors;

use instructions::*;

declare_id!("DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX");

#[program]
pub mod zyura {
    use super::*;

    /// Initialize the ZYURA protocol
    pub fn initialize(
        ctx: Context<Initialize>,
        admin: Pubkey,
        usdc_mint: Pubkey,
        switchboard_program: Pubkey,
    ) -> Result<()> {
        initialize::initialize(ctx, admin, usdc_mint, switchboard_program)
    }

    /// Create a flight delay insurance product
    pub fn create_product(
        ctx: Context<CreateProduct>,
        product_id: u64,
        delay_threshold_minutes: u32,
        coverage_amount: u64,
        premium_rate_bps: u16,
        claim_window_hours: u32,
    ) -> Result<()> {
        product::create_product(
            ctx,
            product_id,
            delay_threshold_minutes,
            coverage_amount,
            premium_rate_bps,
            claim_window_hours,
        )
    }

    /// Update flight delay insurance product
    pub fn update_product(
        ctx: Context<UpdateProduct>,
        id: u64,
        delay_threshold_minutes: u32,
        coverage_amount: u64,
        premium_rate_bps: u16,
        claim_window_hours: u32,
    ) -> Result<()> {
        product::update_product(
            ctx,
            id,
            delay_threshold_minutes,
            coverage_amount,
            premium_rate_bps,
            claim_window_hours,
        )
    }

    /// Purchase flight delay insurance policy
    pub fn purchase_policy(
        ctx: Context<PurchasePolicy>,
        policy_id: u64,
        flight_number: String,
        departure_time: i64,
        premium_amount: u64,
        create_metadata: bool,
        metadata_uri: String,
    ) -> Result<()> {
        policy::purchase_policy(ctx, policy_id, flight_number, departure_time, premium_amount, create_metadata, metadata_uri)
    }

    /// Process flight delay payout
    pub fn process_payout(
        ctx: Context<ProcessPayout>,
        policy_id: u64,
        delay_minutes: u32,
    ) -> Result<()> {
        policy::process_payout(ctx, policy_id, delay_minutes)
    }

    /// Deposit liquidity into the risk pool
    pub fn deposit_liquidity(
        ctx: Context<DepositLiquidity>,
        amount: u64,
    ) -> Result<()> {
        liquidity::deposit_liquidity(ctx, amount)
    }

    /// Withdraw liquidity from the risk pool
    pub fn withdraw_liquidity(
        ctx: Context<WithdrawLiquidity>,
        amount: u64,
    ) -> Result<()> {
        liquidity::withdraw_liquidity(ctx, amount)
    }

    /// Set protocol pause status (admin only)
    pub fn set_pause_status(ctx: Context<SetPauseStatus>, paused: bool) -> Result<()> {
        admin::set_pause_status(ctx, paused)
    }

    /// Close Config account (admin only) - used for migration
    pub fn close_config(ctx: Context<CloseConfig>) -> Result<()> {
        admin::close_config(ctx)
    }
}