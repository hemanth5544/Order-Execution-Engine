import { Order, OrderStatus } from '../types/index.js';
import { dexRouter } from './dex-router.js';
import { database } from './database.js';
import { wsManager } from './websocket-manager.js';
import { logger } from '../utils/logger.js';
import { applySlippage } from '../utils/helpers.js';
import { CONFIG } from '../config/index.js';

export class OrderExecutor {
  async executeOrder(orderId: string): Promise<void> {
    logger.info({ orderId }, 'Starting order execution');

    try {
      const order = await database.getOrder(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      await this.updateStatus(orderId, 'routing', 'Fetching quotes from DEXs');

      const comparison = await dexRouter.compareQuotes(
        order.token_in,
        order.token_out,
        order.amount_in
      );

      await database.saveDexQuote(orderId, comparison.raydium);
      await database.saveDexQuote(orderId, comparison.meteora);

      const bestQuote =
        comparison.best_dex === 'raydium'
          ? comparison.raydium
          : comparison.meteora;

      logger.info(
        {
          orderId,
          selectedDex: comparison.best_dex,
          estimatedAmountOut: bestQuote.estimated_amount_out,
          priceDifference: comparison.price_difference_percent,
        },
        'DEX selected for execution'
      );

      wsManager.sendStatusUpdate(orderId, 'routing', {
        message: `Selected ${comparison.best_dex} (${comparison.price_difference_percent}% better)`,
        data: {
          selected_dex: comparison.best_dex,
          executed_price: bestQuote.price,
        },
      });

      await this.updateStatus(orderId, 'building', 'Building transaction');

      const minAmountOut = applySlippage(
        bestQuote.estimated_amount_out,
        order.slippage_tolerance
      );

      await this.updateStatus(orderId, 'submitted', 'Transaction submitted to network');

      const result = await dexRouter.executeSwap(
        comparison.best_dex,
        order.token_in,
        order.token_out,
        order.amount_in,
        minAmountOut
      );

      await database.updateOrderStatus(orderId, 'confirmed', {
        selected_dex: comparison.best_dex,
        tx_hash: result.txHash,
        executed_price: result.executedPrice,
        amount_out: result.amountOut,
      });

      wsManager.sendStatusUpdate(orderId, 'confirmed', {
        message: 'Order executed successfully',
        tx_hash: result.txHash,
        data: {
          executed_price: result.executedPrice,
          amount_out: result.amountOut,
          selected_dex: comparison.best_dex,
        },
      });

      logger.info(
        {
          orderId,
          txHash: result.txHash,
          executedPrice: result.executedPrice,
          amountOut: result.amountOut,
        },
        'Order execution completed successfully'
      );
    } catch (error) {
      await this.handleExecutionError(orderId, error as Error);
    }
  }

  private async updateStatus(
    orderId: string,
    status: OrderStatus,
    message?: string
  ): Promise<void> {
    await database.updateOrderStatus(orderId, status);
    wsManager.sendStatusUpdate(orderId, status, { message });
  }

  private async handleExecutionError(orderId: string, error: Error): Promise<void> {
    logger.error({ orderId, error: error.message }, 'Order execution failed');

    const order = await database.getOrder(orderId);
    if (!order) {
      logger.error({ orderId }, 'Cannot handle error: order not found');
      return;
    }

    const newRetryCount = order.retry_count + 1;
    const shouldRetry = newRetryCount < CONFIG.queue.maxRetries;

    if (shouldRetry) {
      logger.info(
        { orderId, retryCount: newRetryCount, maxRetries: CONFIG.queue.maxRetries },
        'Scheduling order retry'
      );

      await database.updateOrderStatus(orderId, 'pending', {
        retry_count: newRetryCount,
        error_message: error.message,
      });

      wsManager.sendStatusUpdate(orderId, 'pending', {
        message: `Retrying order (attempt ${newRetryCount + 1}/${CONFIG.queue.maxRetries})`,
      });
    } else {
      logger.error(
        { orderId, retryCount: newRetryCount },
        'Max retries reached, marking order as failed'
      );

      await database.updateOrderStatus(orderId, 'failed', {
        error_message: error.message,
        retry_count: newRetryCount,
      });

      wsManager.sendStatusUpdate(orderId, 'failed', {
        message: 'Order execution failed after maximum retries',
        error: error.message,
      });
    }
  }
}

export const orderExecutor = new OrderExecutor();
