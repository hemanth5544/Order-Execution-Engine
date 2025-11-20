import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { database } from '../services/database.js';
import { orderQueue } from '../services/queue.js';
import { wsManager } from '../services/websocket-manager.js';
import { logger } from '../utils/logger.js';
import{createOrderSchema} from '../zod/index.js';


type CreateOrderBody = z.infer<typeof createOrderSchema>;

export async function orderRoutes(fastify: FastifyInstance): Promise<void> {

  // ---- WEBSOCKET ORDER EXECUTION ----//
  fastify.get('/execute', { websocket: true }, async (connection: any, request: any) => {
    const socket = connection.socket;

    try {
      const body = createOrderSchema.parse(request.query || {});

      const orderId = nanoid(16);

      const order = await database.createOrder({
        orderId,
        userId: body.userId,
        orderType: body.orderType,
        tokenIn: body.tokenIn,
        tokenOut: body.tokenOut,
        amountIn: body.amountIn,
        slippageTolerance: body.slippageTolerance,
      });

      logger.info({ orderId, userId: body.userId }, 'Order created');

      wsManager.registerConnection(orderId, socket);

      socket.send(JSON.stringify({
        orderId,
        status: 'pending',
        message: 'Order received and queued',
        timestamp: new Date().toISOString(),
      }));

      await orderQueue.addOrder({
        orderId,
        userId: body.userId,
        orderType: body.orderType,
        tokenIn: body.tokenIn,
        tokenOut: body.tokenOut,
        amountIn: body.amountIn,
        slippageTolerance: body.slippageTolerance,
      });

      logger.info({ orderId }, 'Order added to execution queue');
    } catch (error) {
      logger.error({ error }, 'Error creating order');

      socket.send(JSON.stringify({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));

      socket.close();
    }
  });


  // ---- NORMAL HTTP ORDER CREATION (We can user in the normal post api if neededd) ----//
  fastify.post<{ Body: CreateOrderBody }>('/execute', async (request, reply) => {
    try {
      const body = createOrderSchema.parse(request.body);
      const orderId = nanoid(16);

      await database.createOrder({
        orderId,
        ...body
      });

      await orderQueue.addOrder({
        orderId,
        ...body
      });

      return reply.send({
        success: true,
        orderId
      });

    } catch (error) {
      logger.error(error);
      return reply.status(400).send({ error: 'Invalid order payload' });
    }
  });


  // ---- OTHER ROUTES ----//
  fastify.get('/metrics', async () => ({
    success: true,
    data: await orderQueue.getQueueMetrics()
  }));

  fastify.get<{ Params: { orderId: string } }>('/:orderId', async (request, reply) => {
    const order = await database.getOrder(request.params.orderId);

    if (!order) {
      return reply.status(404).send({ success: false, error: 'Order not found' });
    }

    return reply.send({ success: true, data: order });
  });
}


