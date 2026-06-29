import { describe, it, expect } from 'vitest';
import { businessDaysBetween, computePeriodCapacityHours, BUSINESS_DAY_HOURS, startOfMonthMs } from './capacity';

// IST business days are Sun–Thu (Fri/Sat off). These dates are unambiguous weekdays.
const at = (iso: string) => new Date(iso + 'T12:00:00+05:30').getTime();

describe('capacity', () => {
  it('a single business day counts as 1 day / 9h', () => {
    // 2026-06-29 is a Monday (business day)
    expect(businessDaysBetween(at('2026-06-29'), at('2026-06-29'))).toBe(1);
    expect(computePeriodCapacityHours(at('2026-06-29'), at('2026-06-29'))).toBe(9);
  });

  it('excludes Friday and Saturday', () => {
    // 2026-06-26 Fri, 2026-06-27 Sat -> 0 business days
    expect(businessDaysBetween(at('2026-06-26'), at('2026-06-27'))).toBe(0);
    // Sun 2026-06-28 is a business day
    expect(businessDaysBetween(at('2026-06-28'), at('2026-06-28'))).toBe(1);
  });

  it('counts a full Sun–Sat week as 5 business days (Sun–Thu)', () => {
    // 2026-06-28 Sun .. 2026-07-04 Sat
    expect(businessDaysBetween(at('2026-06-28'), at('2026-07-04'))).toBe(5);
    expect(computePeriodCapacityHours(at('2026-06-28'), at('2026-07-04'))).toBe(45);
  });

  it('over a multi-week period a real capacity makes 25h logged a low %', () => {
    // June 2026 month-to-date through the 29th: 21 Sun–Thu business days × 9h.
    const cap = computePeriodCapacityHours(at('2026-06-01'), at('2026-06-29'));
    expect(cap).toBe(189);
    const utilization = Math.round((25 / cap) * 100);
    expect(utilization).toBe(13); // ~13%, NOT 313%
    expect(utilization).toBeLessThanOrEqual(30);
  });

  it('returns 0 for invalid / inverted ranges', () => {
    expect(businessDaysBetween(NaN, 1)).toBe(0);
    expect(businessDaysBetween(at('2026-06-29'), at('2026-06-01'))).toBe(0);
  });

  it('BUSINESS_DAY_HOURS is 9 and startOfMonthMs is the 1st', () => {
    expect(BUSINESS_DAY_HOURS).toBe(9);
    const som = new Date(startOfMonthMs(at('2026-06-29')));
    expect(som.getDate()).toBe(1);
    expect(som.getMonth()).toBe(5); // June (0-indexed)
  });
});
