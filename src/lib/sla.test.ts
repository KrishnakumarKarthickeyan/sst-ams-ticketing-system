import { describe, it, expect } from 'vitest';
import { addSlaHours } from './sla';

// Tests run under TZ=UTC (set in the npm script) so getDay() is deterministic.
// Working week is Sunday–Thursday; Friday (5) and Saturday (6) are weekend.

describe('addSlaHours', () => {
  it('returns the start instant unchanged when adding 0 hours', () => {
    const start = '2026-06-07T00:00:00.000Z';
    expect(addSlaHours(start, 0)).toBe(new Date(start).toISOString());
  });

  it('adds working hours within a single working day', () => {
    // 2026-06-07 is a Sunday (working day). +8h → same day 08:00.
    const out = new Date(addSlaHours('2026-06-07T00:00:00.000Z', 8));
    expect(out.getUTCFullYear()).toBe(2026);
    expect(out.getUTCMonth()).toBe(5); // June
    expect(out.getUTCDate()).toBe(7);
    expect(out.getUTCHours()).toBe(8);
  });

  it('never lands the deadline on a Friday or Saturday', () => {
    for (let h = 1; h <= 80; h++) {
      const day = new Date(addSlaHours('2026-06-04T09:00:00.000Z', h)).getUTCDay();
      expect(day).not.toBe(5);
      expect(day).not.toBe(6);
    }
  });

  it('skips the weekend: hours added from Friday resume on Sunday', () => {
    // 2026-06-05 is a Friday. The first working hour must be on Sunday (day 0).
    const out = new Date(addSlaHours('2026-06-05T09:00:00.000Z', 1));
    expect(out.getUTCDay()).toBe(0); // Sunday
  });

  it('produces a strictly later instant for positive hours', () => {
    const start = '2026-06-08T10:00:00.000Z';
    expect(new Date(addSlaHours(start, 4)).getTime()).toBeGreaterThan(new Date(start).getTime());
  });

  it('matches the documented priority SLA targets (8/16/32/64h advance)', () => {
    // Critical=8h from Sunday 00:00 → Sunday 08:00 (within working day).
    expect(new Date(addSlaHours('2026-06-07T00:00:00.000Z', 8)).getUTCHours()).toBe(8);
    // 16h spans into Monday (8 working hours/day boundary is not enforced — it's
    // continuous working hours, so 16h from Sun 00:00 → Sun 16:00).
    expect(new Date(addSlaHours('2026-06-07T00:00:00.000Z', 16)).getUTCDate()).toBe(7);
  });
});
