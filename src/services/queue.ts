import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { CONFIG } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { orderExecutor } from './order-executor.js';

const connection = new IORedis({
  host: CONFIG.redis.host,
  port: CONFIG.redis.port,
  password: CONFIG.redis.password,
  maxRetriesPerRequest: null,
});

export interface OrderJobData {
  orderId: string;
  userId: string;
  orderType: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  slippageTolerance: number;
}



export class OrderQueue {
  private queue: Queue<OrderJobData>;
  private worker: Worker<OrderJobData>;
  private queueEvents: QueueEvents;

  constructor() {
    this.queue = new Queue<OrderJobData>('order-execution', {
      connection,
      defaultJobOptions: {
        attempts: CONFIG.queue.maxRetries,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 3600,
        },
      },
    });

    this.worker = new Worker<OrderJobData>(
      'order-execution',
      async (job) => {
        logger.info({ jobId: job.id, orderId: job.data.orderId }, 'Processing order job');
        await orderExecutor.executeOrder(job.data.orderId);
      },
      {
        connection,
        concurrency: CONFIG.queue.maxConcurrentOrders,
        limiter: {
          max: CONFIG.queue.ordersPerMinute,
          duration: 60000,
        },
      }
    );

    this.queueEvents = new QueueEvents('order-execution', { connection });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Order job completed successfully');
    });

    this.worker.on('failed', (job, error) => {
      logger.error(
        { jobId: job?.id, error: error.message },
        'Order job failed'
      );
    });

    this.worker.on('error', (error) => {
      logger.error({ error: error.message }, 'Worker error');
    });

    this.queueEvents.on('waiting', ({ jobId }) => {
      logger.debug({ jobId }, 'Job is waiting');
    });

    this.queueEvents.on('active', ({ jobId }) => {
      logger.debug({ jobId }, 'Job is active');
    });
  }

  async addOrder(orderData: OrderJobData): Promise<string> {
    const job = await this.queue.add('execute-order', orderData, {
      jobId: orderData.orderId,
    });

    logger.info(
      { jobId: job.id, orderId: orderData.orderId },
      'Order added to queue'
    );

    return job.id!;
  }

  async getQueueMetrics() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      concurrency: CONFIG.queue.maxConcurrentOrders,
      rateLimit: CONFIG.queue.ordersPerMinute,
    };
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
    await connection.quit();
    logger.info('Queue closed successfully');
  }
}

export const orderQueue = new OrderQueue();
