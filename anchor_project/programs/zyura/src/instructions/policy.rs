use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer, FreezeAccount};
use mpl_token_metadata::instructions as mpl_instructions;
use mpl_token_metadata::accounts::{MasterEdition, Metadata};
use mpl_token_metadata::types::DataV2;
use mpl_token_metadata::ID as TOKEN_METADATA_PROGRAM_ID;
use crate::state::{Config, Product, Policy, PolicyStatus};
use crate::errors::ZyuraError;

#[derive(Accounts)]
#[instruction(policy_id: u64)]
pub struct PurchasePolicy<'info> {
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
    
    #[account(
        init,
        payer = user,
        space = 8 + Policy::INIT_SPACE,
        seeds = [b"policy", policy_id.to_le_bytes().as_ref()],
        bump
    )]
    pub policy: Account<'info, Policy>,
    
    #[account(
        mut
    )]
    pub risk_pool_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    // NFT mint that represents proof of insurance
    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = mint_authority,
        mint::freeze_authority = mint_authority,
    )]
    pub policy_nft_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        associated_token::mint = policy_nft_mint,
        associated_token::authority = user,
    )]
    pub user_policy_nft_ata: Account<'info, TokenAccount>,

    /// CHECK: Metaplex metadata PDA for the mint (derived and verified in handler)
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    /// CHECK: Metaplex master edition PDA for the mint (derived and verified in handler)
    #[account(mut)]
    pub master_edition_account: UncheckedAccount<'info>,

    /// CHECK: Metaplex Token Metadata program
    pub token_metadata_program: UncheckedAccount<'info>,

    /// CHECK: PDA used as mint authority for deterministic signing
    /// Seeds: [b"policy_mint_authority"]
    #[account(
        seeds = [b"policy_mint_authority"],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ProcessPayout<'info> {
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
    
    #[account(
        mut,
        seeds = [b"policy", policy.id.to_le_bytes().as_ref()],
        bump = policy.bump
    )]
    pub policy: Account<'info, Policy>,
    
    #[account(mut)]
    pub risk_pool_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub policyholder_usdc_account: Account<'info, TokenAccount>,
    
    /// Admin authorizes transfers from the vault
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn purchase_policy(
    ctx: Context<PurchasePolicy>,
    policy_id: u64,
    flight_number: String,
    departure_time: i64,
    premium_amount: u64,
    create_metadata: bool,
    metadata_uri: String,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, ZyuraError::ProtocolPaused);
    require!(ctx.accounts.product.active, ZyuraError::ProductInactive);
    // Enforce minimum premium based on product's premium_rate_bps
    let required_premium: u64 = ((ctx.accounts.product.coverage_amount as u128
        * ctx.accounts.product.premium_rate_bps as u128)
        / 10_000u128) as u64;
    require!(premium_amount >= required_premium, ZyuraError::InsufficientPremium);
    
    // Transfer USDC from user to risk pool
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_usdc_account.to_account_info(),
            to: ctx.accounts.risk_pool_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, premium_amount)?;
    
    // Create policy account
    let policy = &mut ctx.accounts.policy;
    policy.id = policy_id;
    policy.policyholder = ctx.accounts.user.key();
    policy.product_id = ctx.accounts.product.id;
    policy.flight_number = flight_number.clone();
    policy.departure_time = departure_time;
    policy.premium_paid = premium_amount;
    policy.coverage_amount = ctx.accounts.product.coverage_amount;
    policy.status = PolicyStatus::Active;
    policy.created_at = Clock::get()?.unix_timestamp;
    policy.bump = ctx.bumps.policy;
    
    // Mint the policy NFT (1 token) to the user
    let mint_key = ctx.accounts.policy_nft_mint.key();
    let mint_bump = ctx.bumps.mint_authority;
    let seed_prefix: &[u8] = b"policy_mint_authority";
    let signer_seeds: &[&[u8]] = &[seed_prefix, &[mint_bump]];
    let signer = &[signer_seeds];

    // Mint 1 to user's ATA
    let mint_to_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.policy_nft_mint.to_account_info(),
            to: ctx.accounts.user_policy_nft_ata.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        },
        signer,
    );
    token::mint_to(mint_to_ctx, 1)?;

    // Immediately freeze the holder's NFT ATA to make the NFT non-transferable (soulbound-like)
    let freeze_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        FreezeAccount {
            account: ctx.accounts.user_policy_nft_ata.to_account_info(),
            mint: ctx.accounts.policy_nft_mint.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        },
        signer,
    );
    token::freeze_account(freeze_ctx)?;

    // Optionally create metadata+master edition via Metaplex CPI
    if create_metadata {
        let (expected_metadata, _) = Metadata::find_pda(&mint_key);
        let (expected_master_edition, _) = MasterEdition::find_pda(&mint_key);
        require_keys_eq!(expected_metadata, ctx.accounts.metadata_account.key(), ZyuraError::Unauthorized);
        require_keys_eq!(expected_master_edition, ctx.accounts.master_edition_account.key(), ZyuraError::Unauthorized);
        require_keys_eq!(*ctx.accounts.token_metadata_program.key, TOKEN_METADATA_PROGRAM_ID, ZyuraError::Unauthorized);

        // Name (<=32 chars). Include policy id and flight number where possible
        let mut name_str = format!("ZYURA Policy {} {}", policy_id, flight_number);
        name_str.truncate(32);
        let data = DataV2 {
            name: name_str,
            symbol: "ZYURA".to_string(),
            uri: metadata_uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        let create_md_ix = mpl_instructions::CreateMetadataAccountV3 {
            metadata: expected_metadata,
            mint: mint_key,
            mint_authority: ctx.accounts.mint_authority.key(),
            payer: ctx.accounts.user.key(),
            update_authority: (ctx.accounts.mint_authority.key(), true),
            system_program: ctx.accounts.system_program.key(),
            rent: None,
        }
        .instruction(mpl_token_metadata::instructions::CreateMetadataAccountV3InstructionArgs {
            data,
            is_mutable: false,
            collection_details: None,
        });

        invoke_signed(
            &create_md_ix,
            &[
            ctx.accounts.token_metadata_program.to_account_info(),
                ctx.accounts.metadata_account.to_account_info(),
                ctx.accounts.policy_nft_mint.to_account_info(),
                ctx.accounts.mint_authority.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer,
        )?;

        let create_me_ix = mpl_instructions::CreateMasterEditionV3 {
            edition: expected_master_edition,
            mint: mint_key,
            update_authority: ctx.accounts.mint_authority.key(),
            mint_authority: ctx.accounts.mint_authority.key(),
            payer: ctx.accounts.user.key(),
            metadata: expected_metadata,
            token_program: ctx.accounts.token_program.key(),
            system_program: ctx.accounts.system_program.key(),
            rent: None,
        }
        .instruction(mpl_token_metadata::instructions::CreateMasterEditionV3InstructionArgs {
            max_supply: Some(1),
        });

        invoke_signed(
            &create_me_ix,
            &[
            ctx.accounts.token_metadata_program.to_account_info(),
                ctx.accounts.master_edition_account.to_account_info(),
                ctx.accounts.policy_nft_mint.to_account_info(),
                ctx.accounts.mint_authority.to_account_info(),
                ctx.accounts.metadata_account.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer,
        )?;
    }

    emit!(PolicyPurchased {
        policy_id,
        policyholder: ctx.accounts.user.key(),
        nft_mint: mint_key,
    });
    msg!("Policy {} created. NFT minted: {}", policy_id, mint_key);
    Ok(())
}

#[event]
pub struct PolicyPurchased {
    pub policy_id: u64,
    pub policyholder: Pubkey,
    pub nft_mint: Pubkey,
}

pub fn process_payout(
    ctx: Context<ProcessPayout>,
    policy_id: u64,
    delay_minutes: u32,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, ZyuraError::ProtocolPaused);
    require!(ctx.accounts.policy.status == PolicyStatus::Active, ZyuraError::PolicyNotActive);
    require!(delay_minutes >= ctx.accounts.product.delay_threshold_minutes, ZyuraError::DelayThresholdNotMet);
    require!(ctx.accounts.config.admin == ctx.accounts.admin.key(), ZyuraError::Unauthorized);
    
    // Transfer payout from risk pool to policyholder
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.risk_pool_vault.to_account_info(),
            to: ctx.accounts.policyholder_usdc_account.to_account_info(),
            authority: ctx.accounts.admin.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, ctx.accounts.policy.coverage_amount)?;
    
    // Update policy status
    ctx.accounts.policy.status = PolicyStatus::PaidOut;
    ctx.accounts.policy.paid_at = Some(Clock::get()?.unix_timestamp);
    
    msg!("Payout processed for policy {}", policy_id);
    Ok(())
}