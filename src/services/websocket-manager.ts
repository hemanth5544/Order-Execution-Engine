import { WebSocket } from 'ws';
import { WebSocketMessage, OrderStatus } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class WebSocketManager {
  private connections: Map<string, Set<WebSocket>> = new Map();

  registerConnection(orderId: string, ws: WebSocket): void {
    if (!this.connections.has(orderId)) {
      this.connections.set(orderId, new Set());
    }

    const orderConnections = this.connections.get(orderId)!;
    orderConnections.add(ws);

    logger.debug(
      { orderId, totalConnections: orderConnections.size },
      'WebSocket connection registered'
    );

    ws.on('close', () => {
      this.removeConnection(orderId, ws);
    });

    ws.on('error', (error) => {
      logger.error({ error, orderId }, 'WebSocket error');
      this.removeConnection(orderId, ws);
    });
  }

  removeConnection(orderId: string, ws: WebSocket): void {
    const orderConnections = this.connections.get(orderId);
    if (orderConnections) {
      orderConnections.delete(ws);
      if (orderConnections.size === 0) {
        this.connections.delete(orderId);
      }
      logger.debug(
        { orderId, remainingConnections: orderConnections.size },
        'WebSocket connection removed'
      );
    }
  }

  sendStatusUpdate(
    orderId: string,
    status: OrderStatus,
    data?: Partial<WebSocketMessage>
  ): void {
    const orderConnections = this.connections.get(orderId);
    if (!orderConnections || orderConnections.size === 0) {
      logger.debug({ orderId, status }, 'No active connections for order');
      return;
    }

    const message: WebSocketMessage = {
      order_id: orderId,
      status,
      timestamp: new Date().toISOString(),
      ...data,
    };

    const messageStr = JSON.stringify(message);

    orderConnections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });

    logger.info(
      { orderId, status, connectionCount: orderConnections.size },
      'Status update sent to WebSocket clients'
    );
  }

  closeConnections(orderId: string): void {
    const orderConnections = this.connections.get(orderId);
    if (orderConnections) {
      orderConnections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
      this.connections.delete(orderId);
      logger.debug({ orderId }, 'All connections closed for order');
    }
  }

  getActiveConnectionsCount(orderId?: string): number {
    if (orderId) {
      return this.connections.get(orderId)?.size || 0;
    }
    let total = 0;
    this.connections.forEach((connections) => {
      total += connections.size;
    });
    return total;
  }
}

export const wsManager = new WebSocketManager();
