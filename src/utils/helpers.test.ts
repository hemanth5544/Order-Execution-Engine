import { describe, it } from 'node:test';
import {
  randomBetween,
  generateMockTxHash,
  calculatePriceImpact,
  applySlippage,
  formatNumber,
} from './helpers.js';

describe('Helpers', () => {
  describe('randomBetween', () => {
    it('should return a number between min and max', () => {
      const result = randomBetween(1, 10);
      if (result < 1 || result > 10) throw new Error('Out of range');
    });

    it('should handle decimal ranges', () => {
      const result = randomBetween(0.5, 1.5);
      if (result < 0.5 || result > 1.5) throw new Error('Out of range');
    });
  });

  describe('generateMockTxHash', () => {
    it('should generate a 64-character hex string', () => {
      const hash = generateMockTxHash();
      if (hash.length !== 64) throw new Error('Invalid hash length');
      if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('Invalid hash format');
    });

    it('should generate unique hashes', () => {
      const hash1 = generateMockTxHash();
      const hash2 = generateMockTxHash();
      if (hash1 === hash2) throw new Error('Hashes should be unique');
    });
  });

  describe('calculatePriceImpact', () => {
    it('should calculate price impact correctly', () => {
      const impact = calculatePriceImpact(1000, 100000);
      if (impact !== 1) throw new Error('Impact calculation incorrect');
    });

    it('should handle large amounts', () => {
      const impact = calculatePriceImpact(50000, 100000);
      if (impact !== 50) throw new Error('Impact calculation incorrect');
    });

    it('should handle small amounts', () => {
      const impact = calculatePriceImpact(100, 100000);
      if (impact !== 0.1) throw new Error('Impact calculation incorrect');
    });
  });

  describe('applySlippage', () => {
    it('should apply slippage correctly', () => {
      const result = applySlippage(100, 0.01);
      if (result !== 99) throw new Error('Slippage calculation incorrect');
    });

    it('should handle zero slippage', () => {
      const result = applySlippage(100, 0);
      if (result !== 100) throw new Error('Slippage calculation incorrect');
    });

    it('should handle high slippage', () => {
      const result = applySlippage(100, 0.5);
      if (result !== 50) throw new Error('Slippage calculation incorrect');
    });
  });

  describe('formatNumber', () => {
    it('should format to 6 decimals by default', () => {
      const result = formatNumber(1.123456789);
      if (result !== 1.123457) throw new Error('Format incorrect');
    });

    it('should format to specified decimals', () => {
      const result = formatNumber(1.123456789, 2);
      if (result !== 1.12) throw new Error('Format incorrect');
    });

    it('should handle whole numbers', () => {
      const result = formatNumber(100);
      if (result !== 100) throw new Error('Format incorrect');
    });
  });
});
