export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function generateMockTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export function calculatePriceImpact(amountIn: number, liquidityDepth: number): number {
  return (amountIn / liquidityDepth) * 100;
}

export function applySlippage(price: number, slippage: number): number {
  return price * (1 - slippage);
}

export function formatNumber(num: number, decimals: number = 6): number {
  return Number(num.toFixed(decimals));
}
