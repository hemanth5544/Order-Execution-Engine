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


}

export const database = new DatabaseService();
