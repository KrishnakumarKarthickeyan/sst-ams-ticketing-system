import { isBusinessDay } from '../sla/slaEngine';

/**
 * Single source of truth for utilization CAPACITY. Every utilization % in the app
 * (Team Performance KPI + table, Workload Analytics / Balancer, Admin operation
 * intelligence, consultant + manager dashboards) divides logged hours by a capacity
 * computed here, so they can never disagree.
 *
 * Capacity = (business days in the period) × 9h, on the SAME IST business basis as
 * the SLA engine: a business day is Sun–Thu (Fri/Sat = 0), a business day is 9 hours
 * (10:30–19:30 IST). We reuse slaEngine.isBusinessDay rather than inventing a second
 * calendar. The old code divided by ~8h (a single day), inflating utilization to
 * >100% (e.g. 25h over a collapsed 1-day period → 313%).
 */

/** Available business hours in one working day (10:30–19:30 IST). */
export const BUSINESS_DAY_HOURS = 9;

/**
 * Count IST business days (Sun–Thu) in [startMs, endMs], inclusive. Iterates at
 * local noon per day so midnight/DST boundaries can't flip a day's classification.
 */
export function businessDaysBetween(startMs: number, endMs: number): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  let n = 0;
  const cursor = new Date(startMs); cursor.setHours(12, 0, 0, 0);
  const end = new Date(endMs); end.setHours(12, 0, 0, 0);
  while (cursor <= end) {
    if (isBusinessDay(cursor)) n++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return n;
}

/** Business-hours capacity over a period = business days × 9h. */
export function computePeriodCapacityHours(startMs: number, endMs: number): number {
  return businessDaysBetween(startMs, endMs) * BUSINESS_DAY_HOURS;
}

/** Start-of-month (local) for `ref` as epoch ms — the default utilization window. */
export function startOfMonthMs(ref: number): number {
  const d = new Date(ref);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
