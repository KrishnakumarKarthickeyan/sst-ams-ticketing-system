/**
 * SLA deadline math — now a thin delegate to the ONE SLA engine.
 *
 * Historically this added `hours` of working time on its own (Sun–Thu, but 24h/day,
 * ignoring the 10:30–19:30 window) — a second calendar that diverged from
 * slaEngine. It only ever seeds the stored `sla_due_at` placeholder (overwritten by
 * the engine on lead assignment). It now delegates to slaEngine.addBusinessHours so
 * there is a single source of truth: IST business hours 10:30–19:30, Sun–Thu, Fri/Sat
 * and out-of-window time paused.
 */
import { addBusinessHours } from './sla/slaEngine';

export const addSlaHours = (startDate: Date | string, hours: number): string =>
  addBusinessHours(startDate, hours).toISOString();
