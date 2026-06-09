import { describe, it, expect } from 'vitest';
import { cn, formatCurrency } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge tailwind classes correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
      expect(cn('bg-red-500', { 'text-white': true, 'text-black': false })).toBe('bg-red-500 text-white');
    });

    it('should resolve tailwind conflicts', () => {
      // tailwind-merge should resolve bg-red-500 and bg-blue-500 to bg-blue-500
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers as PEN currency', () => {
      const formatted = formatCurrency(1500.5);
      // Depending on the environment, the exact string might vary slightly (e.g., spaces),
      // but it should contain the number and the currency symbol.
      expect(formatted).toMatch(/1[.,]500[.,]50/);
      expect(formatted).toContain('S/');
    });
  });
});
