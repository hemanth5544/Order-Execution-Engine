import { beforeEach, describe, it } from 'node:test';
import { MockDexRouter } from './dex-router.js';

describe('MockDexRouter', () => {
  let router: MockDexRouter;

  beforeEach(() => {
    router = new MockDexRouter();
  });

  describe('getRaydiumQuote', () => {
    it('should return a valid quote', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 100);

      if (!quote) throw new Error('Quote undefined');
      if (quote.dex_name !== 'raydium') throw new Error('Invalid DEX name');
      if (Number(quote.price) <= 0) throw new Error('Invalid price');
      if (quote.fee !== 0.003) throw new Error('Invalid fee');
      if (quote.estimated_amount_out <= 0) throw new Error('Invalid amount');
    });

    it('should return different quotes for different amounts', async () => {
      const quote1 = await router.getRaydiumQuote('SOL', 'USDC', 100);
      const quote2 = await router.getRaydiumQuote('SOL', 'USDC', 1000);

      if (quote2.estimated_amount_out <= quote1.estimated_amount_out) {
        throw new Error('Quote2 should be greater than quote1');
      }
    });
  });

  describe('getMeteorQuote', () => {
    it('should return a valid quote', async () => {
      const quote = await router.getMeteorQuote('SOL', 'USDC', 100);

      if (!quote) throw new Error('Quote undefined');
      if (quote.dex_name !== 'meteora') throw new Error('Invalid DEX name');
      if (Number(quote.price) <= 0) throw new Error('Invalid price');
      if (quote.fee !== 0.002) throw new Error('Invalid fee');
      if (quote.estimated_amount_out <= 0) throw new Error('Invalid amount');
    });

    it('should have lower fee than Raydium', async () => {
      const meteoraQuote = await router.getMeteorQuote('SOL', 'USDC', 100);
      const raydiumQuote = await router.getRaydiumQuote('SOL', 'USDC', 100);

      if (meteoraQuote.fee >= raydiumQuote.fee) {
        throw new Error('Meteora fee should be lower than Raydium');
      }
    });
  });

  describe('compareQuotes', () => {
    it('should return comparison with best DEX', async () => {
      const comparison = await router.compareQuotes('SOL', 'USDC', 100);

      if (!comparison) throw new Error('Comparison undefined');
      if (!comparison.raydium) throw new Error('Raydium quote missing');
      if (!comparison.meteora) throw new Error('Meteora quote missing');
      if (!['raydium', 'meteora'].includes(comparison.best_dex)) {
        throw new Error('Invalid best DEX');
      }
      if (comparison.price_difference < 0) throw new Error('Invalid price difference');
    });

    it('should select DEX with higher estimated amount out', async () => {
      const comparison = await router.compareQuotes('SOL', 'USDC', 100);

      const bestQuote =
        comparison.best_dex === 'raydium'
          ? comparison.raydium
          : comparison.meteora;
      const otherQuote =
        comparison.best_dex === 'raydium'
          ? comparison.meteora
          : comparison.raydium;

      if (bestQuote.estimated_amount_out < otherQuote.estimated_amount_out) {
        throw new Error('Best DEX should have higher amount');
      }
    });
  });

  describe('executeSwap', () => {
    it('should execute swap successfully', async () => {
      const result = await router.executeSwap('raydium', 'SOL', 'USDC', 100, 95);

      if (!result.txHash || result.txHash.length !== 64) {
        throw new Error('Invalid tx hash');
      }
      if (result.executedPrice <= 0) throw new Error('Invalid price');
      if (result.amountOut < 95 * 0.995 || result.amountOut > 95) {
        throw new Error('Amount out out of slippage bounds');
      }
    });
  });

  describe('setBasePrice', () => {
    it('should update base price without throwing', () => {
      try {
        router.setBasePrice(2.0);
      } catch (e) {
        throw new Error('setBasePrice should not throw');
      }
    });
  });
});
