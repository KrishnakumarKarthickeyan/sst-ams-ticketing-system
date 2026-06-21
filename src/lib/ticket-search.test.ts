import { describe, it, expect } from 'vitest';
import { matchesTicketNumber } from './ticket-search';

describe('matchesTicketNumber', () => {
  it('matches the exact ticket for a numeric query', () => {
    expect(matchesTicketNumber('BIT-000024', '24')).toBe(true);
    expect(matchesTicketNumber('BIT-000024', '000024')).toBe(true);
  });
  it('does NOT match unrelated numbers that merely contain the digits', () => {
    expect(matchesTicketNumber('BIT-000124', '24')).toBe(false);
    expect(matchesTicketNumber('BIT-000240', '24')).toBe(false);
    expect(matchesTicketNumber('SUN-000171', '17')).toBe(false);
    expect(matchesTicketNumber('NWC-000136', '13')).toBe(false);
  });
  it('matches the full ticket-number string (case-insensitive)', () => {
    expect(matchesTicketNumber('BIT-000024', 'bit-000024')).toBe(true);
  });
  it('is false for empty query or missing number', () => {
    expect(matchesTicketNumber('BIT-000024', '')).toBe(false);
    expect(matchesTicketNumber(null, '24')).toBe(false);
  });
});
