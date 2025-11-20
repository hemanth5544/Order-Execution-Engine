
------------------------------------------------------------
-- ORDERS TABLE
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  order_type text NOT NULL CHECK (order_type IN ('market', 'limit', 'sniper')),
  token_in text NOT NULL,
  token_out text NOT NULL,
  amount_in numeric NOT NULL CHECK (amount_in > 0),
  amount_out numeric,
  expected_price numeric,
  executed_price numeric,
  slippage_tolerance numeric NOT NULL DEFAULT 0.01 CHECK (slippage_tolerance >= 0 AND slippage_tolerance <= 1),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'routing', 'building', 'submitted', 'confirmed', 'failed')),
  selected_dex text CHECK (selected_dex IN ('raydium', 'meteora')),
  tx_hash text,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

------------------------------------------------------------
-- DEX_QUOTES TABLE
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dex_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dex_name text NOT NULL CHECK (dex_name IN ('raydium', 'meteora')),
  quote_price numeric NOT NULL,
  fee numeric NOT NULL,
  estimated_amount_out numeric NOT NULL,
  quoted_at timestamptz NOT NULL DEFAULT now()
);

------------------------------------------------------------
-- INDEXES
------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dex_quotes_order_id ON dex_quotes(order_id);


------------------------------------------------------------
-- TRIGGER FOR updated_at
------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
