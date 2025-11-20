import { DexQuote, DexName, QuoteComparison } from '../types/index.js';
import { CONFIG } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
  sleep,
  randomBetween,
  generateMockTxHash,
  calculatePriceImpact,
  formatNumber,
} from '../utils/helpers.js';

export class MockDexRouter {
  private basePrice = 1.0;

  async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DexQuote> {
    logger.debug({ tokenIn, tokenOut, amountIn }, 'Fetching Raydium quote');

    await sleep(randomBetween(
      CONFIG.dex.simulatedNetworkDelay.min,
      CONFIG.dex.simulatedNetworkDelay.max
    ));

    const variance = randomBetween(
      CONFIG.dex.priceVariance.raydium.min,
      CONFIG.dex.priceVariance.raydium.max
    );
    const price = this.basePrice * variance;
    const fee = CONFIG.dex.fees.raydium;
    const liquidityDepth = randomBetween(100000, 500000);
    const priceImpact = calculatePriceImpact(amountIn, liquidityDepth);

    const grossAmountOut = amountIn * price;
    const feeAmount = grossAmountOut * fee;
    const estimated_amount_out = grossAmountOut - feeAmount;

    const quote: DexQuote = {
      dex_name: 'raydium',
      price: formatNumber(price),
      fee: formatNumber(fee),
      estimated_amount_out: formatNumber(estimated_amount_out),
      liquidity_depth: formatNumber(liquidityDepth),
      price_impact: formatNumber(priceImpact, 4),
    };

    logger.debug({ quote }, 'Raydium quote received');
    return quote;
  }

  async getMeteorQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DexQuote> {
    logger.debug({ tokenIn, tokenOut, amountIn }, 'Fetching Meteora quote');

    await sleep(randomBetween(
      CONFIG.dex.simulatedNetworkDelay.min,
      CONFIG.dex.simulatedNetworkDelay.max
    ));

    const variance = randomBetween(
      CONFIG.dex.priceVariance.meteora.min,
      CONFIG.dex.priceVariance.meteora.max
    );
    const price = this.basePrice * variance;
    const fee = CONFIG.dex.fees.meteora;
    const liquidityDepth = randomBetween(80000, 450000);
    const priceImpact = calculatePriceImpact(amountIn, liquidityDepth);

    const grossAmountOut = amountIn * price;
    const feeAmount = grossAmountOut * fee;
    const estimated_amount_out = grossAmountOut - feeAmount;

    const quote: DexQuote = {
      dex_name: 'meteora',
      price: formatNumber(price),
      fee: formatNumber(fee),
      estimated_amount_out: formatNumber(estimated_amount_out),
      liquidity_depth: formatNumber(liquidityDepth),
      price_impact: formatNumber(priceImpact, 4),
    };

    logger.debug({ quote }, 'Meteora quote received');
    return quote;
  }

  async compareQuotes(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<QuoteComparison> {
    logger.info({ tokenIn, tokenOut, amountIn }, 'Comparing DEX quotes');

    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amountIn),
      this.getMeteorQuote(tokenIn, tokenOut, amountIn),
    ]);

    const bestDex =
      raydiumQuote.estimated_amount_out > meteoraQuote.estimated_amount_out
        ? 'raydium'
        : 'meteora';

    const priceDifference = Math.abs(
      raydiumQuote.estimated_amount_out - meteoraQuote.estimated_amount_out
    );
    const maxAmount = Math.max(
      raydiumQuote.estimated_amount_out,
      meteoraQuote.estimated_amount_out
    );
    const priceDifferencePercent = (priceDifference / maxAmount) * 100;

    const comparison: QuoteComparison = {
      raydium: raydiumQuote,
      meteora: meteoraQuote,
      best_dex: bestDex,
      price_difference: formatNumber(priceDifference),
      price_difference_percent: formatNumber(priceDifferencePercent, 2),
    };

    logger.info(
      {
        bestDex,
        raydiumAmount: raydiumQuote.estimated_amount_out,
        meteoraAmount: meteoraQuote.estimated_amount_out,
        priceDifferencePercent: comparison.price_difference_percent,
      },
      'DEX quote comparison complete'
    );

    return comparison;
  }

  async executeSwap(
    dex: DexName,
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    minAmountOut: number
  ): Promise<{ txHash: string; executedPrice: number; amountOut: number }> {
    logger.info({ dex, tokenIn, tokenOut, amountIn, minAmountOut }, 'Executing swap');

    await sleep(randomBetween(
      CONFIG.dex.executionDelay.min,
      CONFIG.dex.executionDelay.max
    ));

    const slippageVariance = randomBetween(0.995, 1.0);
    const actualAmountOut = minAmountOut * slippageVariance;
    const executedPrice = actualAmountOut / amountIn;

    const txHash = generateMockTxHash();

    logger.info(
      { txHash, executedPrice, amountOut: actualAmountOut, dex },
      'Swap executed successfully'
    );

    return {
      txHash,
      executedPrice: formatNumber(executedPrice),
      amountOut: formatNumber(actualAmountOut),
    };
  }

  setBasePrice(price: number): void {
    this.basePrice = price;
    logger.debug({ basePrice: price }, 'Base price updated');
  }
}

export const dexRouter = new MockDexRouter();
