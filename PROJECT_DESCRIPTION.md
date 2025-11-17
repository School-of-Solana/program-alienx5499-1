# Project Description

**Deployed Frontend URL:** https://zyura.vercel.app

**Solana Program ID:** DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX

## Project Overview

### Description
ZYURA is a decentralized flight delay insurance platform built on Solana that provides instant, automated payouts when flights are delayed beyond a defined threshold. The dApp enables users to purchase parametric insurance policies for their flights by paying a premium in USDC. When a covered flight is delayed beyond the threshold (e.g., 30 minutes), the smart contract automatically processes a payout to the policyholder without requiring manual claims or paperwork.

The platform operates on a risk pool model where liquidity providers deposit USDC to fund payouts, and policyholders receive NFT-based proof-of-insurance tokens. All policy terms, purchases, and payouts are transparently recorded on-chain, ensuring trust and auditability. The system uses Program Derived Addresses (PDAs) for deterministic account management and integrates with Metaplex for NFT policy tokens.

### Key Features
- **Purchase Flight Delay Insurance**: Users can purchase insurance policies for specific flights by providing flight number, departure time, and paying the required premium in USDC
- **NFT Policy Tokens**: Each policy purchase mints a unique, soulbound NFT (non-transferable) that serves as proof of insurance with Metaplex-compliant metadata
- **Automated Payouts**: When eligible delays occur (verified by admin/oracle), the smart contract automatically transfers USDC coverage amount from the risk pool to the policyholder
- **Liquidity Pool Management**: Liquidity providers can deposit USDC into the risk pool vault to earn yield and support the insurance protocol
- **Product Management**: Admins can create and update insurance products with configurable parameters (delay threshold, coverage amount, premium rate, claim window)
- **Protocol Controls**: Admin-only pause mechanism for emergency protocol management
- **Policy Tracking**: Users can view all their active policies, coverage details, and payout status through the frontend dashboard

### How to Use the dApp
1. **Connect Wallet** - Connect your Solana wallet (Phantom, Solflare, etc.) to the dApp
2. **View Available Products** - Browse available insurance products showing delay thresholds, coverage amounts, and premium rates
3. **Purchase Policy** - Enter your flight number, departure date/time, and select a product. The system calculates the premium based on coverage amount and premium rate (basis points). Confirm the transaction to purchase
4. **Receive NFT** - Upon successful purchase, you receive a soulbound NFT in your wallet as proof of insurance
5. **Monitor Policies** - View all your policies in the dashboard, including status (Active, PaidOut, Expired)
6. **Automatic Payout** - If your flight is delayed beyond the threshold, the admin processes the payout and USDC is automatically transferred to your wallet

## Program Architecture
The ZYURA program uses a modular architecture with separate instruction handlers for initialization, product management, policy operations, liquidity management, and admin controls. The system leverages PDAs extensively to create deterministic, program-controlled accounts for configuration, products, policies, and liquidity providers. All state is stored on-chain in structured account types, ensuring transparency and immutability.

The program integrates with the SPL Token program for USDC transfers, Metaplex Token Metadata for NFT creation, and is designed to work with Switchboard oracles for flight delay verification (oracle integration is admin-triggered in the current implementation).

### PDA Usage
The program uses Program Derived Addresses to create deterministic, program-controlled accounts that cannot be controlled by external private keys.

**PDAs Used:**
- **Config PDA**: Derived from seeds `["config"]` - Stores global protocol configuration including admin address, USDC mint, Switchboard program ID, risk pool vault address, and pause status. This ensures a single source of truth for protocol settings.
- **Product PDA**: Derived from seeds `["product", product_id]` - Each insurance product has a unique PDA based on its ID, storing product parameters like delay threshold, coverage amount, premium rate, and claim window. This allows multiple products to coexist.
- **Policy PDA**: Derived from seeds `["policy", policy_id]` - Each policy has a unique PDA based on its ID, storing policyholder information, flight details, premium paid, coverage amount, and status. This ensures each policy is uniquely identifiable.
- **Liquidity Provider PDA**: Derived from seeds `["liquidity_provider", provider_pubkey]` - Each liquidity provider has a PDA based on their wallet address, tracking their total deposits, withdrawals, and active deposit balance. This enables per-provider accounting.
- **Policy Mint Authority PDA**: Derived from seeds `["policy_mint_authority"]` - Used as the mint authority for policy NFT tokens, ensuring only the program can mint policy NFTs and freeze accounts to make them soulbound.

### Program Instructions
**Instructions Implemented:**
- **initialize**: Initializes the ZYURA protocol by creating the Config PDA with admin address, USDC mint, and Switchboard program ID. Sets initial pause status to false.
- **create_product**: Creates a new insurance product with specified delay threshold (minutes), coverage amount (USDC), premium rate (basis points), and claim window (hours). Product is stored in a PDA derived from product ID.
- **update_product**: Allows admin to update existing product parameters (delay threshold, coverage amount, premium rate, claim window) while preserving the product ID and PDA.
- **purchase_policy**: Enables users to purchase flight delay insurance. Transfers premium USDC from user to risk pool vault, creates Policy account, mints a soulbound NFT to the user, and optionally creates Metaplex metadata. Validates minimum premium requirements and product active status.
- **process_payout**: Admin-triggered instruction that processes payouts for eligible delays. Validates delay threshold is met, policy is active, and transfers coverage amount from risk pool vault to policyholder. Updates policy status to PaidOut.
- **deposit_liquidity**: Allows liquidity providers to deposit USDC into the risk pool vault. Creates or updates LiquidityProvider account tracking deposits and active balance.
- **withdraw_liquidity**: Admin-controlled withdrawal of liquidity from the risk pool. Validates sufficient active deposit and transfers USDC back to liquidity provider. Updates LiquidityProvider account balances.
- **set_pause_status**: Admin-only instruction to pause or resume the protocol. When paused, all operations except admin functions are blocked for emergency situations.
- **close_config**: Admin-only instruction to close the Config account and reclaim rent. Used for protocol migration scenarios.

### Account Structure
```rust
#[account]
pub struct Config {
    pub admin: Pubkey,                    // Protocol administrator address
    pub usdc_mint: Pubkey,                // USDC token mint address
    pub switchboard_program: Pubkey,      // Switchboard oracle program ID
    pub risk_pool_vault: Pubkey,          // Risk pool vault token account
    pub paused: bool,                     // Protocol pause status
    pub bump: u8,                         // PDA bump seed
}

#[account]
pub struct Product {
    pub id: u64,                          // Unique product identifier
    pub delay_threshold_minutes: u32,     // Minimum delay to trigger payout
    pub coverage_amount: u64,              // Payout amount in USDC (6 decimals)
    pub premium_rate_bps: u16,            // Premium rate in basis points (100 = 1%)
    pub claim_window_hours: u32,          // Time window for claims after departure
    pub active: bool,                     // Product availability status
    pub bump: u8,                         // PDA bump seed
}

#[account]
pub struct Policy {
    pub id: u64,                          // Unique policy identifier
    pub policyholder: Pubkey,              // Wallet address of policy owner
    pub product_id: u64,                   // Associated product ID
    pub flight_number: String,            // Flight identifier (max 20 chars)
    pub departure_time: i64,              // Scheduled departure Unix timestamp
    pub premium_paid: u64,                // Premium amount paid in USDC
    pub coverage_amount: u64,              // Coverage/payout amount in USDC
    pub status: PolicyStatus,              // Active, PaidOut, or Expired
    pub created_at: i64,                  // Policy creation timestamp
    pub paid_at: Option<i64>,             // Payout timestamp (if paid)
    pub bump: u8,                         // PDA bump seed
}

#[account]
pub struct LiquidityProvider {
    pub provider: Pubkey,                 // Liquidity provider wallet address
    pub total_deposited: u64,             // Cumulative deposits in USDC
    pub total_withdrawn: u64,              // Cumulative withdrawals in USDC
    pub active_deposit: u64,               // Current active deposit balance
    pub bump: u8,                         // PDA bump seed
}
```

## Testing

### Test Coverage
Comprehensive test suite covering all 9 program instructions with both successful operations (happy paths) and error conditions (unhappy paths) to ensure program security, reliability, and proper access control.

**Happy Path Tests:**
- **Initialization**: Successfully initializes protocol with correct admin, USDC mint, and Switchboard program ID. Config account is created with paused=false.
- **Create Product**: Successfully creates insurance product with specified parameters. Product account is created in PDA with correct values.
- **Update Product**: Admin successfully updates product parameters (delay threshold, coverage amount) while preserving product ID.
- **Purchase Policy**: User successfully purchases policy, premium is transferred to vault, Policy account is created with Active status, and NFT is minted to user's wallet.
- **Process Payout**: Admin successfully processes payout for eligible delay, coverage amount is transferred to policyholder, and policy status updates to PaidOut.
- **Deposit Liquidity**: Liquidity provider successfully deposits USDC, LiquidityProvider account is created/updated with correct balances.
- **Withdraw Liquidity**: Admin successfully processes liquidity withdrawal, USDC is transferred back to provider, and active deposit is updated correctly.
- **Multiple Policies**: User can purchase multiple policies with different flight numbers and policy IDs.

**Unhappy Path Tests:**
- **Initialize Duplicate**: Fails when trying to initialize with different admin if config already exists (unless authorized).
- **Create Product When Paused**: Fails when trying to create product while protocol is paused.
- **Update Product Unauthorized**: Fails when non-admin tries to update product parameters.
- **Purchase Policy Insufficient Premium**: Fails when premium amount is below the minimum required (coverage_amount * premium_rate_bps / 10000).
- **Purchase Policy When Paused**: Fails when trying to purchase policy while protocol is paused.
- **Purchase Policy Inactive Product**: Fails when trying to purchase policy for an inactive product.
- **Process Payout Unauthorized**: Fails when non-admin tries to process payout.
- **Process Payout Insufficient Delay**: Fails when delay minutes is below the product's delay threshold.
- **Process Payout Inactive Policy**: Fails when trying to process payout for a policy that is not Active.
- **Withdraw Liquidity Excessive**: Fails when trying to withdraw more than the active deposit balance.
- **Withdraw Liquidity Unauthorized**: Fails when non-admin tries to withdraw liquidity.
- **Deposit Liquidity When Paused**: Fails when trying to deposit while protocol is paused.

### Running Tests
```bash
cd anchor_project
yarn install          # Install dependencies
anchor test           # Run all tests (starts local validator, builds program, runs tests)
```

The test suite uses a shared setup function that:
- Creates test keypairs (admin, user, liquidity provider)
- Mints test USDC tokens
- Sets up token accounts
- Handles account initialization and cleanup
- Supports both localnet and devnet testing

### Additional Notes for Evaluators

**Technical Highlights:**
- The program uses `init_if_needed` for the Config account to support re-initialization scenarios
- Policy NFTs are soulbound (frozen) immediately after minting to prevent transfer, ensuring they remain tied to the original policyholder
- The program integrates with Metaplex Token Metadata program via CPI for NFT creation, but metadata creation is optional (controlled by `create_metadata` parameter)
- All USDC amounts use 6 decimal places (standard for USDC)
- Premium calculation: `premium = (coverage_amount * premium_rate_bps) / 10000`

**Security Considerations:**
- All admin-only functions verify the signer matches the Config admin
- Protocol pause mechanism prevents all user operations during emergencies
- Minimum premium validation prevents underpayment
- Delay threshold validation ensures only eligible delays trigger payouts
- Active deposit validation prevents over-withdrawal of liquidity

**Deployment Notes:**
- Program ID: `DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX`
- Currently deployed on Devnet
- Frontend is a Next.js application with wallet integration
- The program is designed to work with Switchboard oracles for automated delay verification, though current implementation uses admin-triggered payouts

**Future Enhancements:**
- Full oracle integration for automated delay detection
- Policy expiration handling based on claim window
- Multiple product support with different risk profiles
- Governance mechanisms for protocol upgrades
