/**
 * SLA engine — business-hours countdown on the IST business clock.
 *
 * THE CONTRACT (implemented exactly):
 *   - Timezone: Asia/Kolkata (IST, UTC+5:30, no DST — a fixed offset, so all the
 *     math is done with a constant +330 minute shift; no tz library required).
 *   - Business window: 10:30:00–19:30:00 IST = 9 working hours per business day.
 *   - Business days: Sunday–Thursday. Friday & Saturday are OFF.
 *   - SLA time accrues ONLY inside the window on business days. Nights, mornings
 *     before 10:30, evenings after 19:30, and all of Fri/Sat contribute ZERO.
 *   - The timer starts only when the ticket is assigned to a lead consultant
 *     (lead_assigned_at). Until then the SLA is 'Not Started' and does not run.
 *
 * One "SLA hour" == one business hour inside the 10:30–19:30 IST window.
 *
 * Display strings use Intl with timeZone 'Asia/Kolkata' (accurate, built-in);
 * the deadline math never depends on Intl or the host timezone.
 *
 * ── Worked examples (proven by slaEngine.test.ts) ───────────────────────────
 *  • Critical 8h assigned Thu 18:00 IST:
 *      Thu 18:00→19:30 consumes 1.5h, window exhausted; Fri & Sat are OFF, so it
 *      resumes Sun 10:30. 6.5h remain → 10:30 + 6:30 = due **Sun 17:00 IST**.
 *  • Any ticket assigned Fri 12:00 IST: Fri/Sat off → the clock starts **Sun
 *      10:30 IST** (counting begins there).
 */

// ── IST business-clock constants (minute precision) ──────────────────────────
const IST_OFFSET_MIN = 330;          // UTC+5:30
const MIN_PER_DAY = 1440;
const BUSINESS_START_MIN = 10 * 60 + 30; // 10:30 -> 630
const BUSINESS_END_MIN = 19 * 60 + 30;   // 19:30 -> 1170
const WINDOW_MIN = BUSINESS_END_MIN - BUSINESS_START_MIN; // 540 = 9h
const FRIDAY = 5;
const SATURDAY = 6;

export type SlaStatus = 'Not Started' | 'On Track' | 'At Risk' | 'Breached' | 'Met';

export interface ClientSlaTargets {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export const DEFAULT_SLA_TARGETS: ClientSlaTargets = {
  critical: 8,
  high: 16,
  medium: 32,
  low: 64,
};

export interface SlaComputation {
  status: SlaStatus;
  /** Business-hours deadline (real instant), or null when not started. */
  dueAt: Date | null;
  /** Business hours of SLA budget still remaining (clamped ≥ 0). */
  remainingHours: number;
  /** The target hours used (per client + priority). */
  targetHours: number;
  /** Business hours already consumed. */
  elapsedHours: number;
  /** Whether the IST business clock is ticking right now (false when paused). */
  running: boolean;
}

/** Minimal ticket shape the engine needs (camelCase mapped model). */
export interface SlaTicketInput {
  leadAssignedAt?: string | null;
  status?: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
}

// ── Low-level IST helpers (all math in "IST minutes since epoch") ────────────

/** Whole minutes since epoch expressed in IST wall-clock terms. */
function toIstMin(date: Date): number {
  return Math.floor(date.getTime() / 60000) + IST_OFFSET_MIN;
}

/** Inverse of toIstMin (fractional minutes allowed) -> real instant. */
function fromIstMin(istMin: number): Date {
  return new Date((istMin - IST_OFFSET_MIN) * 60000);
}

/** IST day index (whole days since the IST epoch day). */
function istDayIndex(istMin: number): number {
  return Math.floor(istMin / MIN_PER_DAY);
}

/** Day-of-week for an IST day index. Epoch IST day is a Thursday (getUTCDay 4). */
function dowOfDayIndex(dayIndex: number): number {
  return (((dayIndex % 7) + 4) % 7 + 7) % 7;
}

function isBusinessDayIndex(dayIndex: number): boolean {
  const dow = dowOfDayIndex(dayIndex);
  return dow !== FRIDAY && dow !== SATURDAY;
}

/** Next business day's 10:30 IST, in IST minutes, strictly after `dayIndex`. */
function nextWindowStart(dayIndex: number): number {
  let d = dayIndex + 1;
  while (!isBusinessDayIndex(d)) d++;
  return d * MIN_PER_DAY + BUSINESS_START_MIN;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** True for Sun–Thu IST, false for Fri/Sat. */
export function isBusinessDay(d: Date): boolean {
  return isBusinessDayIndex(istDayIndex(toIstMin(d)));
}

/** The 10:30 / 19:30 IST window bounding the IST day that `d` falls on. */
export function businessWindowFor(d: Date): { start: Date; end: Date } {
  const dayIndex = istDayIndex(toIstMin(d));
  const base = dayIndex * MIN_PER_DAY;
  return {
    start: fromIstMin(base + BUSINESS_START_MIN),
    end: fromIstMin(base + BUSINESS_END_MIN),
  };
}

/**
 * Advance from `start` by `hours` of business time and return the resulting
 * instant. Begins counting at the first in-window business moment at or after
 * `start`, then consumes each day's window, skipping Fri/Sat, until exhausted.
 */
export function addBusinessHours(start: Date | string, hours: number): Date {
  let cursor = toIstMin(new Date(start));
  let remaining = hours * 60; // minutes

  // Normalize the cursor onto the first valid in-window business position.
  cursor = normalizeToWindow(cursor);
  if (remaining <= 0) return fromIstMin(cursor);

  // Safety guard: even 64h budget spans well under a few hundred iterations.
  let guard = 0;
  while (remaining > 0 && guard++ < 100000) {
    const dayIndex = istDayIndex(cursor);
    const windowEnd = dayIndex * MIN_PER_DAY + BUSINESS_END_MIN;
    const availableToday = windowEnd - cursor;
    if (remaining <= availableToday) {
      cursor += remaining;
      remaining = 0;
    } else {
      remaining -= availableToday;
      cursor = nextWindowStart(dayIndex);
    }
  }
  return fromIstMin(cursor);
}

/** Push an IST-minute cursor to the next valid in-window business moment. */
function normalizeToWindow(cursor: number): number {
  let c = cursor;
  // Walk forward day-by-day until we land inside an open window.
  for (let guard = 0; guard < 100000; guard++) {
    const dayIndex = istDayIndex(c);
    const mod = c - dayIndex * MIN_PER_DAY;
    if (!isBusinessDayIndex(dayIndex) || mod >= BUSINESS_END_MIN) {
      c = nextWindowStart(dayIndex);
      continue;
    }
    if (mod < BUSINESS_START_MIN) {
      c = dayIndex * MIN_PER_DAY + BUSINESS_START_MIN;
    }
    return c;
  }
  return c;
}

/**
 * Business hours elapsed between two instants — only minutes inside the
 * 10:30–19:30 IST window on Sun–Thu are counted. Out-of-window / Fri / Sat = 0.
 */
export function businessHoursBetween(from: Date | string, to: Date | string): number {
  const a = toIstMin(new Date(from));
  const b = toIstMin(new Date(to));
  if (b <= a) return 0;

  let total = 0;
  const firstDay = istDayIndex(a);
  const lastDay = istDayIndex(b);
  for (let day = firstDay; day <= lastDay; day++) {
    if (!isBusinessDayIndex(day)) continue;
    const winStart = day * MIN_PER_DAY + BUSINESS_START_MIN;
    const winEnd = day * MIN_PER_DAY + BUSINESS_END_MIN;
    const overlapStart = Math.max(a, winStart);
    const overlapEnd = Math.min(b, winEnd);
    if (overlapEnd > overlapStart) total += overlapEnd - overlapStart;
  }
  return total / 60;
}

/** Is the IST business clock running right now? (false on Fri/Sat & out of window) */
export function isBusinessOpenNow(now: Date = new Date()): boolean {
  const m = toIstMin(now);
  const dayIndex = istDayIndex(m);
  if (!isBusinessDayIndex(dayIndex)) return false;
  const mod = m - dayIndex * MIN_PER_DAY;
  return mod >= BUSINESS_START_MIN && mod < BUSINESS_END_MIN;
}

const isClosedStatus = (s?: string) => s === 'Closed' || s === 'Resolved';

/** Priority → the client's configured hours for that priority. */
export function getTargetHours(priority: string | undefined, t: ClientSlaTargets): number {
  switch (priority) {
    case 'Critical': return t.critical;
    case 'High': return t.high;
    case 'Medium': return t.medium;
    case 'Low': return t.low;
    default: return t.low;
  }
}

/**
 * Compute the live SLA state for a ticket against a target (business hours).
 * `now` is injectable for deterministic tests.
 */
export function computeSla(
  ticket: SlaTicketInput,
  targetHours: number,
  now: Date = new Date(),
): SlaComputation {
  // Not started until a lead consultant is assigned.
  if (!ticket.leadAssignedAt) {
    return {
      status: 'Not Started',
      dueAt: null,
      remainingHours: targetHours,
      targetHours,
      elapsedHours: 0,
      running: false,
    };
  }

  const leadAt = new Date(ticket.leadAssignedAt);
  const dueAt = addBusinessHours(leadAt, targetHours);

  // Closed/Resolved: freeze the timer at closure and grade Met vs Breached.
  if (isClosedStatus(ticket.status)) {
    const closure = new Date(ticket.resolvedAt || ticket.closedAt || now);
    const elapsed = businessHoursBetween(leadAt, closure);
    return {
      status: closure.getTime() > dueAt.getTime() ? 'Breached' : 'Met',
      dueAt,
      remainingHours: Math.max(0, targetHours - elapsed),
      targetHours,
      elapsedHours: elapsed,
      running: false,
    };
  }

  const elapsed = businessHoursBetween(leadAt, now);
  const remaining = Math.max(0, targetHours - elapsed);
  let status: SlaStatus;
  if (now.getTime() > dueAt.getTime()) {
    status = 'Breached';
  } else if (remaining <= 0.2 * targetHours) {
    status = 'At Risk';
  } else {
    status = 'On Track';
  }

  return {
    status,
    dueAt,
    remainingHours: remaining,
    targetHours,
    elapsedHours: elapsed,
    running: isBusinessOpenNow(now),
  };
}

// ── Display helpers (IST-labelled; safe to use Intl tz here) ─────────────────

const IST_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
});

/** e.g. "Sun, 21 Jun 2026, 17:00 IST". */
export function formatIstDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return IST_FMT.format(date).replace(',', '').replace(/, /g, ' ') + ' IST';
}

/** Business-hours budget → "5h 20m" (rounded to the minute). */
export function formatBusinessDuration(hours: number): string {
  const totalMin = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
