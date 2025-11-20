# Order Execution Engine

A high-performance order execution engine with DEX routing and real-time WebSocket status updates. Built for processing market, limit, and sniper orders on Solana DEXs (Raydium and Meteora).



## Features

- Real-time DEX routing between Raydium and Meteora
- WebSocket-based order status streaming
- Concurrent order processing (up to 10 simultaneous orders)
- Rate limiting (100 orders/minute)
- Exponential backoff retry logic (max 3 attempts)
- PostgreSQL persistence with Supabase
- Redis-backed job queue with BullMQ
- Comprehensive error handling and logging

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP POST /api/orders/execute
       ▼
┌─────────────────────────────────┐
│      Fastify API Server         │
│  (HTTP → WebSocket Upgrade)     │
└────────────┬────────────────────┘
             │
             ▼
    ┌────────────────┐
    │  BullMQ Queue  │
    │   (Redis)      │
    └────────┬───────┘
             │
             ▼
    ┌────────────────────┐
    │  Order Executor    │
    │                    │
    │  1. Fetch Quotes   │──┬──► Raydium (Mock)
    │  2. Compare DEXs   │  │
    │  3. Route Order    │  └──► Meteora (Mock)
    │  4. Execute Swap   │
    │  5. Update Status  │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────┐
    │   WebSocket    │────► Client receives real-time updates
    │    Manager     │      (pending → routing → building →
    └────────────────┘       submitted → confirmed)
```

## Order Lifecycle

1. **pending**: Order received and queued
2. **routing**: Comparing prices from Raydium and Meteora
3. **building**: Creating transaction with best DEX
4. **submitted**: Transaction sent to network
5. **confirmed**: Transaction successful (includes txHash)
6. **failed**: Execution failed (includes error details)

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **API Framework**: Fastify with WebSocket support
- **Database**: PostgreSQL (Supabase)
- **Queue**: BullMQ + Redis
- **DEX Integration**: Mock implementation (Raydium & Meteora)
- **Logging**: Pino

## Setup Instructions

### Prerequisites

- Node.js 18+
- Redis server running locally or remotely
- Own RDS (POSTGRES) 

### Installation

1. Clone the repository:
```bash
git clone <https://github.com/hemanth5544/Order-Execution-Engine.git>
cd Order-Execution-Engine
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development

# Supabase or any RDS 
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Queue Settings
MAX_CONCURRENT_ORDERS=10
ORDERS_PER_MINUTE=100
MAX_RETRIES=3
```

4. Start Redis (if running locally):
```bash
redis-server
```

5. Run the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Documentation

**Note**: will provide one hosted swagger from scalr docs or openapi docs once funcinalty  done


### Execute Order

**Endpoint**: `POST /api/orders/execute`

Creates an order and upgrades the connection to WebSocket for real-time updates.

**Request Body**:
```json
{
  "orderType": "market",
  "tokenIn": "So11111111111111111111111111111111111111112",
  "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amountIn": 1.5,
  "slippageTolerance": 0.01,
  "userId": "user-123"
}
```

**Response**: WebSocket stream with status updates:
```json
{
  "orderId": "abc123xyz",
  "status": "pending",
  "message": "Order received and queued",
  "timestamp": "2025-11-18T16:00:00.000Z"
}
```

### Get Order

**Endpoint**: `GET /api/orders/:orderId`

Retrieves order details by ID.

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "abc123xyz",
    "status": "confirmed",
    "selectedDex": "meteora",
    "executedPrice": 0.998,
    "amountOut": 1.497,
    "txHash": "5a8c9f...",
    "createdAt": "2025-11-18T16:00:00.000Z",
    "completedAt": "2025-11-18T16:00:05.000Z"
  }
}
```

### Queue Metrics

**Endpoint**: `GET /api/orders/metrics`

Returns current queue statistics.

**Response**:
```json
{
  "success": true,
  "data": {
    "waiting": 2,
    "active": 8,
    "completed": 145,
    "failed": 3,
    "concurrency": 10,
    "rateLimit": 100
  }
}
```


## Mock DEX Implementation

The DEX router simulates realistic behavior:

### Raydium
- Network delay: 150-300ms
- Price variance: ±2%
- Fee: 0.3%
- Liquidity: 100k-500k

### Meteora
- Network delay: 150-300ms
- Price variance: ±3%
- Fee: 0.2%
- Liquidity: 80k-450k

### Swap Execution
- Execution time: 2-3 seconds
- Realistic slippage: 0.5-1%
- Mock transaction hash generation

## Build & Deployment

### Build
```bash
npm run build
```

### Start
```bash
npm start
```



## Design Decisions

1. **Mock vs Real DEX**: Chose mock implementation to focus on architecture, routing logic, and real-time updates without blockchain complexity
2. **BullMQ + Redis**: Provides reliable job processing with built-in retry logic and concurrency control
3. **WebSocket Upgrade**: Single endpoint handles both HTTP POST and WebSocket, simplifying client integration
4. **Supabase + RLS**: Ensures data security with row-level policies while maintaining ease of use
5. **Market Orders First**: Simplest order type that demonstrates all core functionality

## Performance Characteristics

- **Concurrent Processing**: 10 orders simultaneously
- **Throughput**: 100 orders/minute
- **Retry Strategy**: Exponential backoff, max 3 attempts
- **DEX Quote Latency**: ~200-300ms per DEX
- **Total Execution Time**: ~2-5 seconds per order

## Error Handling

The system implements comprehensive error handling:

1. **Validation Errors**: Zod schema validation on input
2. **Network Errors**: Simulated with retry logic
3. **Queue Failures**: Automatic retry with exponential backoff
4. **Database Errors**: Transaction rollback and logging
5. **WebSocket Errors**: Graceful disconnection and cleanup

## File Structure

```
src/
├── config/          # Configuration and environment variables
├── routes/          # API route handlers
├── services/        # Core services (DEX router, database, queue, etc.)
├── types/           # TypeScript type definitions
├── utils/           # Utility functions and logger
└── server.ts        # Main server entry point
```

## Future Enhancements

1. Add limit order support with price monitoring
2. Implement sniper orders for token launches
3. Add real Raydium/Meteora SDK integration
4. Support more DEXs (Orca, Jupiter aggregator)
5. Add order cancellation
6. Implement advanced routing strategies
7. Add performance metrics and monitoring

## Testing

Comprehensive test files included:
- `src/utils/helpers.test.ts` - Utility function tests
- `src/services/dex-router.test.ts` - DEX routing logic tests

## Support

For issues or questions, please open a GitHub issue.

---

**Note**: This is a demonstration project using mock DEX implementations. For production use, integrate actual Solana DEX SDKs and add proper error handling for blockchain interactions (not much expertise in blokchain trx for now).
