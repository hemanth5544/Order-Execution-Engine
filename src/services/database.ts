import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config/index.js';
import { Order, OrderStatus, DexQuote } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class DatabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      CONFIG.supabase.url,
      CONFIG.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  async createOrder(orderData: {
    orderId: string;
    userId: string;
    orderType: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    slippageTolerance: number;
  }): Promise<Order> {
    logger.debug({ orderId: orderData.orderId }, 'Creating order in database');

    const { data, error } = await this.client
      .from('orders')
      .insert({
        order_id: orderData.orderId,
        user_id: orderData.userId,
        order_type: orderData.orderType,
        token_in: orderData.tokenIn,
        token_out: orderData.tokenOut,
        amount_in: orderData.amountIn,
        slippage_tolerance: orderData.slippageTolerance,
        status: 'pending',
        retry_count: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, orderId: orderData.orderId }, 'Failed to create order');
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return this.mapDatabaseOrder(data);
  }


}

export const database = new DatabaseService();
