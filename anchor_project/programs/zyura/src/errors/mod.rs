use anchor_lang::prelude::*;

#[error_code]
pub enum ZyuraError {
    #[msg("Protocol is currently paused")]
    ProtocolPaused,
    #[msg("Product is not active")]
    ProductInactive,
    #[msg("Policy is not active")]
    PolicyNotActive,
    #[msg("Delay threshold not met")]
    DelayThresholdNotMet,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Insufficient premium amount")]
    InsufficientPremium,
}
