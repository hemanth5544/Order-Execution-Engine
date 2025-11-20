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

  async updateOrderStatus(
    order_id: string,
    status: OrderStatus,
    updates: Partial<{
      selected_dex: string;
      tx_hash: string;
      executed_price: number;
      amount_out: number;
      error_message: string;
      retry_count: number;
    }> = {}
  ): Promise<Order> {
    logger.debug({ order_id, status, updates }, 'Updating order status');

    const updateData: Record<string, unknown> = {
      status,
      ...updates,
    };

    if (status === 'confirmed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await this.client
      .from('orders')
      .update(updateData)
      .eq('order_id', order_id)
      .select()
      .single();

    if (error) {
      logger.error({ error, order_id }, 'Failed to update order status');
      throw new Error(`Failed to update order: ${error.message}`);
    }

    return this.mapDatabaseOrder(data);
  }

  async getOrder(orderId: string): Promise<Order | null> {
    const { data, error } = await this.client
      .from('orders')
      .select()
      .eq('order_id', orderId)
      .maybeSingle();

    if (error) {
      logger.error({ error, orderId }, 'Failed to fetch order');
      throw new Error(`Failed to fetch order: ${error.message}`);
    }

    return data ? this.mapDatabaseOrder(data) : null;
  }

  async saveDexQuote(
    orderId: string,
    quote: DexQuote
  ): Promise<void> {
    logger.debug({ orderId, dex: quote.dex_name }, 'Saving DEX quote');

    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const { error } = await this.client.from('dex_quotes').insert({
      order_id: order.id,
      dex_name: quote.dex_name,
      quote_price: quote.price,
      fee: quote.fee,
      estimated_amount_out: quote.estimated_amount_out,
    });

    if (error) {
      logger.error({ error, orderId }, 'Failed to save DEX quote');
      throw new Error(`Failed to save quote: ${error.message}`);
    }
  }

  private mapDatabaseOrder(data: Record<string, unknown>): Order {
    return {
      id: data.id as string,
      order_id: data.order_id as string,
      user_id: data.user_id as string,
      order_type: data.order_type as Order['order_type'],
      token_in: data.token_in as string,
      token_out: data.token_out as string,
      amount_in: Number(data.amount_in),
      amount_out: data.amount_out ? Number(data.amount_out) : undefined,
      executed_price: data.expected_price ? Number(data.expected_price) : undefined,
      expected_price: data.executed_price ? Number(data.executed_price) : undefined,
      slippage_tolerance: Number(data.slippage_tolerance),
      status: data.status as OrderStatus,
      selected_dex: data.selected_dex as Order['selected_dex'],
      tx_hash: data.tx_hash as string | undefined,
      error_message: data.error_message as string | undefined,
      retry_count: Number(data.retry_count),
      created_at: new Date(data.created_at as any),
      updated_at: new Date(data.updated_at as any),
      completed_at: data.completed_at ? new Date(data.completed_at as string) : undefined,
    };
  }
}

export const database = new DatabaseService();
