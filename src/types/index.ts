export type OrderType = 'market' | 'limit' | 'sniper';

export type OrderStatus =
  | 'pending'
  | 'routing'
  | 'building'
  | 'submitted'
  | 'confirmed'
  | 'failed';

export type DexName = 'raydium' | 'meteora';

export interface Order {
  id: string;                     
  order_id: string;              
  user_id: string;
  order_type: OrderType;
  token_in: string;
  token_out: string;
  amount_in: number;              
  amount_out?: number | null;
  expected_price?: number | null;
  executed_price?:  number| null;
  slippage_tolerance: number;     
  status: OrderStatus;
  selected_dex?: DexName | null;
  tx_hash?: string | null;
  error_message?: string | null;
  retry_count: number;
  created_at: any;             
  updated_at: any;
  completed_at?: any | null;
}

export interface DexQuote {
  dex_name: DexName;
  price: number;
  fee: number;
  estimated_amount_out: number;
  liquidity_depth?: number | null;
  price_impact?: number | null;
}

export interface OrderExecutionResult {
  order_id: string;
  status: OrderStatus;
  tx_hash?: string;
  executed_price?: string;
  amount_out?: string;
  selected_dex?: DexName;
  error?: string;
}

export interface WebSocketMessage {
  order_id: string;
  status: OrderStatus;
  message?: string;
  data?: Partial<Order>;
  tx_hash?: string;
  error?: string;
  timestamp: string;
}

export interface CreateOrderRequest {
  order_type: OrderType;
  token_in: string;
  token_out: string;
  amount_in: string;              
  slippage_tolerance?: string;    
  user_id: string;
}

export interface QuoteComparison {
  raydium: DexQuote;
  meteora: DexQuote;
  best_dex: DexName;
  price_difference: number;
  price_difference_percent: number;
}
