import { describe, it, expect } from 'vitest';
import {
  isBusinessDay, isBusinessOpenNow, addBusinessHours, businessHoursBetween,
  computeSla, getTargetHours, DEFAULT_SLA_TARGETS,
} from './slaEngine';

// IST = UTC+5:30. A given IST wall-clock time is written with the +05:30 offset.
const ist = (s: string) => new Date(s); // e.g. ist('2026-06-18T18:00:00+05:30')

// Reference IST days: 2026-06-18 Thu, 06-19 Fri, 06-20 Sat, 06-21 Sun.
const THU_18 = '2026-06-18T18:00:00+05:30';
const FRI_12 = '2026-06-19T12:00:00+05:30';

describe('business calendar (IST)', () => {
  it('Sun–Thu are business days; Fri & Sat are off', () => {
    expect(isBusinessDay(ist('2026-06-21T12:00:00+05:30'))).toBe(true);  // Sun
    expect(isBusinessDay(ist('2026-06-18T12:00:00+05:30'))).toBe(true);  // Thu
    expect(isBusinessDay(ist('2026-06-19T12:00:00+05:30'))).toBe(false); // Fri
    expect(isBusinessDay(ist('2026-06-20T12:00:00+05:30'))).toBe(false); // Sat
  });

  it('clock is open only 10:30–19:30 IST on a business day', () => {
    expect(isBusinessOpenNow(ist('2026-06-18T10:30:00+05:30'))).toBe(true);
    expect(isBusinessOpenNow(ist('2026-06-18T19:29:00+05:30'))).toBe(true);
    expect(isBusinessOpenNow(ist('2026-06-18T19:30:00+05:30'))).toBe(false); // boundary closed
    expect(isBusinessOpenNow(ist('2026-06-18T10:29:00+05:30'))).toBe(false); // before open
    expect(isBusinessOpenNow(ist('2026-06-18T23:00:00+05:30'))).toBe(false); // night
    expect(isBusinessOpenNow(ist('2026-06-19T12:00:00+05:30'))).toBe(false); // Friday
  });
});

describe('addBusinessHours — the worked examples', () => {
  it('Critical 8h assigned Thu 18:00 IST → due Sun 17:00 IST', () => {
    // Thu 18:00→19:30 = 1.5h; Fri/Sat off; resume Sun 10:30; +6.5h → 17:00.
    const due = addBusinessHours(ist(THU_18), 8);
    expect(due.toISOString()).toBe(ist('2026-06-21T17:00:00+05:30').toISOString());
  });

  it('assigned Fri 12:00 IST → clock starts Sun 10:30; 8h → due Sun 18:30 IST', () => {
    const due = addBusinessHours(ist(FRI_12), 8);
    expect(due.toISOString()).toBe(ist('2026-06-21T18:30:00+05:30').toISOString());
  });

  it('a single full business day worth (9h) from window open lands at window close', () => {
    const due = addBusinessHours(ist('2026-06-21T10:30:00+05:30'), 9); // Sun
    expect(due.toISOString()).toBe(ist('2026-06-21T19:30:00+05:30').toISOString());
  });

  it('before-open start counts from 10:30 same business day', () => {
    const due = addBusinessHours(ist('2026-06-21T08:00:00+05:30'), 2); // Sun 08:00
    expect(due.toISOString()).toBe(ist('2026-06-21T12:30:00+05:30').toISOString());
  });
});

describe('businessHoursBetween — out-of-window and weekend accrue ZERO', () => {
  it('overnight gap accrues only the in-window minutes', () => {
    // Thu 18:00 → Thu 23:00: only 18:00–19:30 counts = 1.5h
    expect(businessHoursBetween(ist('2026-06-18T18:00:00+05:30'), ist('2026-06-18T23:00:00+05:30'))).toBeCloseTo(1.5, 5);
  });
  it('Fri/Sat contribute nothing', () => {
    // Fri 10:00 → Sat 23:00 spans only Fri+Sat → 0
    expect(businessHoursBetween(ist('2026-06-19T10:00:00+05:30'), ist('2026-06-20T23:00:00+05:30'))).toBe(0);
  });
  it('Thu 18:00 → Sun 17:00 equals exactly the 8h budget', () => {
    expect(businessHoursBetween(ist(THU_18), ist('2026-06-21T17:00:00+05:30'))).toBeCloseTo(8, 5);
  });
});

describe('computeSla', () => {
  const targets = DEFAULT_SLA_TARGETS;

  it('no lead assigned → Not Started, not running, full budget remaining', () => {
    const r = computeSla({ leadAssignedAt: null, status: 'New' }, 8, ist('2026-06-18T18:00:00+05:30'));
    expect(r.status).toBe('Not Started');
    expect(r.dueAt).toBeNull();
    expect(r.running).toBe(false);
    expect(r.remainingHours).toBe(8);
  });

  it('assigned + within window → On Track and running; remaining counts business time only', () => {
    // assigned Thu 18:00, now Thu 18:30 → 0.5h elapsed of 8h
    const r = computeSla({ leadAssignedAt: THU_18, status: 'In Progress' }, 8, ist('2026-06-18T18:30:00+05:30'));
    expect(r.status).toBe('On Track');
    expect(r.running).toBe(true);
    expect(r.remainingHours).toBeCloseTo(7.5, 5);
    expect(r.dueAt!.toISOString()).toBe(ist('2026-06-21T17:00:00+05:30').toISOString());
  });

  it('paused on the weekend → not running and remaining does NOT decrease', () => {
    // assigned Thu 18:00 (1.5h used by Fri); now Sat noon → still 6.5h, paused
    const r = computeSla({ leadAssignedAt: THU_18, status: 'In Progress' }, 8, ist('2026-06-20T12:00:00+05:30'));
    expect(r.running).toBe(false);
    expect(r.remainingHours).toBeCloseTo(6.5, 5);
  });

  it('past due → Breached', () => {
    const r = computeSla({ leadAssignedAt: THU_18, status: 'In Progress' }, 8, ist('2026-06-21T18:00:00+05:30'));
    expect(r.status).toBe('Breached');
    expect(r.remainingHours).toBe(0);
  });

  it('At Risk when remaining ≤ 20% of target', () => {
    // 8h target, 20% = 1.6h. Consume ~7h: Thu18:00 +1.5h, Sun 10:30 + need 5.5h => Sun 16:00 -> remaining 1h
    const r = computeSla({ leadAssignedAt: THU_18, status: 'In Progress' }, 8, ist('2026-06-21T16:00:00+05:30'));
    expect(r.remainingHours).toBeLessThanOrEqual(1.6);
    expect(r.status).toBe('At Risk');
  });

  it('closed before due → Met; closed after due → Breached (frozen at closure)', () => {
    const met = computeSla({ leadAssignedAt: THU_18, status: 'Closed', closedAt: '2026-06-21T16:00:00+05:30' }, 8, ist('2026-07-01T12:00:00+05:30'));
    expect(met.status).toBe('Met');
    const breached = computeSla({ leadAssignedAt: THU_18, status: 'Closed', closedAt: '2026-06-21T18:00:00+05:30' }, 8, ist('2026-07-01T12:00:00+05:30'));
    expect(breached.status).toBe('Breached');
  });
});

describe('getTargetHours', () => {
  it('maps priority to the client target', () => {
    const t = { critical: 8, high: 16, medium: 32, low: 64 };
    expect(getTargetHours('Critical', t)).toBe(8);
    expect(getTargetHours('High', t)).toBe(16);
    expect(getTargetHours('Medium', t)).toBe(32);
    expect(getTargetHours('Low', t)).toBe(64);
    expect(getTargetHours(undefined, t)).toBe(64);
  });
});
