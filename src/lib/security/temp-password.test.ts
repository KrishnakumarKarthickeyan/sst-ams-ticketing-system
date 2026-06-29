import { describe, it, expect } from 'vitest';
import { generateTemporaryPassword } from './temp-password';

const hasUpper = (s: string) => /[A-Z]/.test(s);
const hasLower = (s: string) => /[a-z]/.test(s);
const hasDigit = (s: string) => /[0-9]/.test(s);
const hasSymbol = (s: string) => /[!@#$%^&*()_+\-=[\]{}|;:',.<>?]/.test(s);

describe('generateTemporaryPassword', () => {
  it('is always >=14 chars and mixed-class across many samples', () => {
    for (let i = 0; i < 2000; i++) {
      const p = generateTemporaryPassword();
      expect(p.length).toBeGreaterThanOrEqual(14);
      expect(hasUpper(p)).toBe(true);
      expect(hasLower(p)).toBe(true);
      expect(hasDigit(p)).toBe(true);
      expect(hasSymbol(p)).toBe(true);
    }
  });

  it('clamps under-length requests up to the 14-char floor', () => {
    expect(generateTemporaryPassword(4).length).toBe(14);
    expect(generateTemporaryPassword(0).length).toBe(14);
  });

  it('honours a larger requested length', () => {
    expect(generateTemporaryPassword(24).length).toBe(24);
  });

  it('excludes confusable characters (I O l 0 1)', () => {
    for (let i = 0; i < 500; i++) {
      // letters/digits only — symbols are allowed to contain anything
      const lettersDigits = generateTemporaryPassword().replace(/[^A-Za-z0-9]/g, '');
      expect(/[IOl01]/.test(lettersDigits)).toBe(false);
    }
  });
});
