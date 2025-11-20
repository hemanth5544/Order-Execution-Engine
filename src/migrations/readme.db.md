## Database Schema

### Orders Table
- `id`: UUID primary key
- `order_id`: User-facing order ID
- `user_id`: User identifier
- `order_type`: market | limit | sniper
- `token_in`: Input token address
- `token_out`: Output token address
- `amount_in`: Input amount
- `amount_out`: Actual output amount
- `executed_price`: Final execution price
- `slippage_tolerance`: Max allowed slippage
- `status`: Order status
- `selected_dex`: Chosen DEX (raydium/meteora)
- `tx_hash`: Transaction hash
- `error_message`: Error details if failed
- `retry_count`: Number of retry attempts
- Timestamps: `created_at`, `updated_at`, `completed_at`

### DEX Quotes Table
- `id`: UUID primary key
- `order_id`: Foreign key to orders
- `dex_name`: raydium | meteora
- `quote_price`: Quoted price
- `fee`: DEX fee
- `estimated_amount_out`: Estimated output
- `quoted_at`: Quote timestamp
