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


}

export const orderQueue = new OrderQueue();
