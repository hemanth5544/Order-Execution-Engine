import pino from 'pino';
import { CONFIG } from '../config/index.js';

export const logger = pino({
  level: CONFIG.nodeEnv === 'development' ? 'debug' : 'info',
  transport: CONFIG.nodeEnv === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
