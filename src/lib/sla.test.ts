import { describe, it, expect } from 'vitest';
import { addSlaHours } from './sla';
import { addBusinessHours } from './sla/slaEngine';

// addSlaHours is now a thin delegate to the single SLA engine (IST business hours
// 10:30–19:30, Sun–Thu). The engine math is timezone-independent of the host.

const ist = (s: string) => new Date(s);

describe('addSlaHours (delegates to slaEngine.addBusinessHours)', () => {
  it('returns exactly what the engine returns', () => {
    const start = '2026-06-15T05:00:00.000Z'; // Mon 10:30 IST
    for (const h of [0, 1, 8, 16, 32, 64]) {
      expect(addSlaHours(start, h)).toBe(addBusinessHours(start, h).toISOString());
    }
  });

  it('worked example: Critical 8h from Thu 18:00 IST → Sun 17:00 IST', () => {
    expect(addSlaHours(ist('2026-06-18T18:00:00+05:30'), 8)).toBe(
      ist('2026-06-21T17:00:00+05:30').toISOString(),
    );
  });

  it('never lands the deadline on a Friday or Saturday (IST)', () => {
    for (let h = 1; h <= 80; h++) {
      // IST day-of-week: a Fri/Sat would be IST dow 5/6. Check via the engine result.
      const out = new Date(addSlaHours('2026-06-15T05:00:00.000Z', h));
      const istDow = new Date(out.getTime() + 330 * 60000).getUTCDay();
      expect(istDow).not.toBe(5);
      expect(istDow).not.toBe(6);
    }
  });

  it('produces a strictly later instant for positive hours', () => {
    const start = '2026-06-15T05:00:00.000Z';
    expect(new Date(addSlaHours(start, 4)).getTime()).toBeGreaterThan(new Date(start).getTime());
  });
});
