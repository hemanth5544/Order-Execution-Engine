import { config } from 'dotenv';

config();

export const CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  redis: {
    host: process.env.REDIS_HOST  || "localhost",
    port: parseInt(process.env.REDIS_PORT || '6699', 10),
    password: process.env.REDIS_PASSWORD || "",
  },

  queue: {
    maxConcurrentOrders: parseInt(process.env.MAX_CONCURRENT_ORDERS || '10', 10),
    ordersPerMinute: parseInt(process.env.ORDERS_PER_MINUTE || '100', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  },

  dex: {
    simulatedNetworkDelay: {
      min: 150,
      max: 300,
    },
    executionDelay: {
      min: 2000,
      max: 3000,
    },
    priceVariance: {
      raydium: { min: 0.98, max: 1.02 },
      meteora: { min: 0.97, max: 1.03 },
    },
    fees: {
      raydium: 0.003,
      meteora: 0.002,
    },
  },
} as const;

export function validateConfig(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
