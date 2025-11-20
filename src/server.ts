import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { CONFIG, validateConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { orderRoutes } from './routes/orders.js';
import { orderQueue } from './services/queue.js';

async function buildServer() {
  const fastify = Fastify({
    logger: true,
  });

  return fastify;
}

async function start() {
  try {
    validateConfig();

    const server = await buildServer();

    await server.listen({
      port: CONFIG.port,
      host: '0.0.0.0',
    });

    console.log(`Server listening on port ${CONFIG.port}`);
    console.log(`Environment: ${CONFIG.nodeEnv}`);
    console.log(`Max concurrent orders: ${CONFIG.queue.maxConcurrentOrders}`);
    console.log(`Rate limit: ${CONFIG.queue.ordersPerMinute} orders/minute`);

    const shutdown = async (signal: string) => {
      console.log(`${signal} received, shutting down gracefully...`);
      await server.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
