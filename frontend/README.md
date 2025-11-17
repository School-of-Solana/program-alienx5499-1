# Scripts Quickstart

## Prereqs
- Node 18+
- pnpm installed
- Solana CLI configured (devnet) and wallets funded

Optional: put repo/env values in `.env.local` and `source .env.local` before commands.

## Purchase Policy (devnet)
```bash
# From frontend/
# Required envs (inline or via .env.local):
#   GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH=main, GITHUB_PATH=metadata
# Inputs:
PRODUCT_ID=1 \
POLICY_ID=789010 \
FLIGHT_NUMBER=RT756 \
# Optional if not set via .env.local
# PNR=ABC123 \
# PREMIUM_6DP (6dp). If omitted, script computes from product
# PREMIUM_6DP=5000000 \
npx tsx scripts/purchase.ts
```

## Payout (simulate delay)
```bash
# From frontend/
POLICY_ID=789010 \
PRODUCT_ID=1 \
ADMIN_KEYPAIR="$HOME/.config/solana/phantom-devnet.json" \
DELAY_MINUTES=9999 \
SOLANA_CLUSTER=devnet \
npx tsx scripts/payout.ts
```

## Deposit Liquidity (fund risk pool)
```bash
# From frontend/
USER_KEYPAIR=$HOME/.config/solana/phantom-devnet.json \
AMOUNT_6DP=100000000 \
npx tsx scripts/deposit.ts
```

## Notes
- USDC mint (SIU Token) (devnet): 4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv
- Amounts are 6-decimal (6dp). Example: 5 USDC => 5_000_000
- Ensure the risk pool (admin USDC ATA) has enough USDC before payout.
