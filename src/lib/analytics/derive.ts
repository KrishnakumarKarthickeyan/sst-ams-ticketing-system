import type { Ticket } from '../../types/ticket';

/**
 * Pure analytics derivations shared by the admin + manager command centers.
 * Everything here is a deterministic function of real ticket/effort/contract
 * data — no Date.now() side effects except where `now` is passed in, no mock
 * data. Unit-tested in derive.test.ts.
 */

export type Granularity = 'day' | 'week' | 'month';

export interface Bucket {
  key: string;
  label: string;
  from: number;
  to: number;
}

/** Build contiguous time buckets across [startMs, endMs] at a fixed granularity. */
export function buildBuckets(startMs: number, endMs: number, g: Granularity): Bucket[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return [];
  const buckets: Bucket[] = [];
  if (g === 'day') {
    const c = new Date(startMs); c.setHours(0, 0, 0, 0);
    const end = new Date(endMs); end.setHours(23, 59, 59, 999);
    while (c <= end) {
      const from = new Date(c); from.setHours(0, 0, 0, 0);
      const to = new Date(c); to.setHours(23, 59, 59, 999);
      buckets.push({
        key: from.toISOString().slice(0, 10),
        label: from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        from: from.getTime(), to: to.getTime(),
      });
      c.setDate(c.getDate() + 1);
    }
  } else if (g === 'week') {
    const c = new Date(startMs); c.setHours(0, 0, 0, 0);
    const end = new Date(endMs);
    while (c <= end) {
      const from = new Date(c); from.setHours(0, 0, 0, 0);
      const to = new Date(c); to.setDate(to.getDate() + 6); to.setHours(23, 59, 59, 999);
      buckets.push({
        key: from.toISOString().slice(0, 10),
        label: from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        from: from.getTime(), to: to.getTime(),
      });
      c.setDate(c.getDate() + 7);
    }
  } else {
    const start = new Date(startMs);
    const c = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date(endMs);
    while (c <= end) {
      const from = new Date(c.getFullYear(), c.getMonth(), 1, 0, 0, 0, 0);
      const to = new Date(c.getFullYear(), c.getMonth() + 1, 0, 23, 59, 59, 999);
      buckets.push({
        key: `${from.getFullYear()}-${from.getMonth()}`,
        label: from.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        from: from.getTime(), to: to.getTime(),
      });
      c.setMonth(c.getMonth() + 1);
    }
  }
  return buckets;
}

/** Auto-pick a granularity from a span so trend charts stay legible. */
export function autoGranularity(startMs: number, endMs: number): Granularity {
  const days = (endMs - startMs) / 86400e3;
  if (days <= 45) return 'day';
  if (days <= 187) return 'week';
  return 'month';
}

export function bucketIndex(buckets: Bucket[], ms: number): number {
  for (let i = 0; i < buckets.length; i++) if (ms >= buckets[i].from && ms <= buckets[i].to) return i;
  return -1;
}

export const isClosed = (t: Pick<Ticket, 'status'>) => t.status === 'Closed' || t.status === 'Resolved';
export const isOpen = (t: Pick<Ticket, 'status'>) => !isClosed(t);

/** Coarse lifecycle bucket for status donuts / stacked flows. */
export function statusGroup(status: string, escalationFlag?: boolean): string {
  if (escalationFlag || status === 'Escalated' || status === 'Raised to SAP') return 'Escalated';
  if (status === 'New') return 'New';
  if (status === 'Assigned') return 'Assigned';
  if (status === 'Reopened' || status === 'Reopen Requested') return 'Reopened';
  if (status === 'Closed' || status === 'Resolved') return 'Closed';
  if (['Request for Closure', 'Awaiting Closure', 'Awaiting Manager Approval', 'Waiting for Hours Approval'].includes(status)) return 'Pending Closure';
  return 'In Progress';
}

/** Whether a ticket carries an SLA target (incident-style, with a due date). */
export function hasSlaTarget(t: Pick<Ticket, 'ticketType' | 'slaDueAt'>): boolean {
  return Boolean((t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable');
}

/** True if the SLA was/has been breached as of `now`. */
export function slaBreached(t: Pick<Ticket, 'ticketType' | 'slaDueAt' | 'status' | 'resolvedAt' | 'closedAt'>, now: number): boolean {
  if (!hasSlaTarget(t)) return false;
  const due = new Date(t.slaDueAt).getTime();
  if (!Number.isFinite(due)) return false;
  const end = isClosed(t)
    ? new Date(t.resolvedAt || t.closedAt || now).getTime()
    : now;
  return end > due;
}

/** Resolution time in hours for closed/resolved tickets, else null. */
export function resolutionHours(t: Pick<Ticket, 'status' | 'createdAt' | 'resolvedAt' | 'closedAt'>): number | null {
  if (!isClosed(t)) return null;
  const start = new Date(t.createdAt).getTime();
  const endRaw = t.resolvedAt || t.closedAt;
  if (!endRaw) return null;
  const end = new Date(endRaw).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return (end - start) / 36e5;
}

/**
 * Sum of APPROVED logged hours on a ticket. Real data lives in the closure flow
 * (ticket_actual_hours → actualHoursLogs), so read that first; fall back to the
 * synthesized consultantEfforts, then the legacy timesheet efforts array. This
 * is why hours/utilization widgets were empty — they only read `efforts`, which
 * the closure-based flow never populates.
 */
export function approvedHours(t: Pick<Ticket, 'efforts' | 'actualHoursLogs' | 'consultantEfforts'>): number {
  const fromActual = (t.actualHoursLogs || []).reduce(
    (s, a) => s + ((a.approvalStatus || '').toLowerCase() === 'approved' ? Number(a.actualHours || 0) : 0), 0);
  if (fromActual > 0) return fromActual;
  const fromCE = (t.consultantEfforts || []).reduce(
    (s, e) => s + (e.closureStatus === 'Approved' ? Number(e.actualHours || 0) : 0), 0);
  if (fromCE > 0) return fromCE;
  return (t.efforts || []).reduce((sum, e) => sum + (e.status === 'Approved' ? (e.hoursWorked || 0) : 0), 0);
}

/** Timestamp (ms) used to anchor logged hours in time: resolved → closed → created. */
export function completionDate(t: Pick<Ticket, 'resolvedAt' | 'closedAt' | 'createdAt'>): number {
  return new Date(t.resolvedAt || t.closedAt || t.createdAt).getTime();
}

/** Functional vs technical approved-hours split for a ticket, via consultantEfforts. */
export function functionalTechnicalSplit(t: Ticket): { functional: number; technical: number } {
  let functional = 0;
  let technical = 0;
  // Per-consultant effort rows carry consultantType + actualHours (closure F/T).
  (t.consultantEfforts || []).forEach((e) => {
    if (e.isDeleted) return;
    const h = e.actualHours || 0;
    if (e.consultantType === 'Technical') technical += h;
    else functional += h;
  });
  return { functional, technical };
}

export interface ConsultantAgg {
  id: string;
  name: string;
  handled: number;
  closed: number;
  active: number;
  loggedHours: number;
  avgResolutionH: number | null;
  slaTotal: number;
  slaMet: number;
  slaAdherence: number | null;
  functional: number;
  technical: number;
}

/** Per-consultant aggregates over a ticket set (keyed by assigned consultant). */
export function aggregateConsultants(tickets: Ticket[], now: number): ConsultantAgg[] {
  const map = new Map<string, ConsultantAgg & { _resSum: number; _resN: number }>();
  const ensure = (name: string, id: string) => {
    let row = map.get(name);
    if (!row) {
      row = { id, name, handled: 0, closed: 0, active: 0, loggedHours: 0, avgResolutionH: null, slaTotal: 0, slaMet: 0, slaAdherence: null, functional: 0, technical: 0, _resSum: 0, _resN: 0 };
      map.set(name, row);
    }
    return row;
  };
  tickets.forEach((t) => {
    const name = t.assignedConsultant;
    if (!name) return;
    const row = ensure(name, t.assignedConsultantId || name);
    row.handled++;
    if (isClosed(t)) row.closed++; else row.active++;
    row.loggedHours += approvedHours(t);
    const res = resolutionHours(t);
    if (res !== null) { row._resSum += res; row._resN++; }
    if (hasSlaTarget(t)) {
      row.slaTotal++;
      if (!slaBreached(t, now)) row.slaMet++;
    }
    const split = functionalTechnicalSplit(t);
    row.functional += split.functional;
    row.technical += split.technical;
  });
  return Array.from(map.values()).map((r) => ({
    ...r,
    avgResolutionH: r._resN > 0 ? r._resSum / r._resN : null,
    slaAdherence: r.slaTotal > 0 ? Math.round((r.slaMet / r.slaTotal) * 100) : null,
  }));
}

export interface CustomerAgg {
  org: string;
  tickets: number;
  open: number;
  closed: number;
  slaBreaches: number;
  loggedHours: number;
}

/** Per-customer (organization) aggregates over a ticket set. */
export function aggregateCustomers(tickets: Ticket[], now: number): CustomerAgg[] {
  const map = new Map<string, CustomerAgg>();
  tickets.forEach((t) => {
    const org = t.organization || 'Unknown';
    let row = map.get(org);
    if (!row) { row = { org, tickets: 0, open: 0, closed: 0, slaBreaches: 0, loggedHours: 0 }; map.set(org, row); }
    row.tickets++;
    if (isClosed(t)) row.closed++; else row.open++;
    if (slaBreached(t, now)) row.slaBreaches++;
    row.loggedHours += approvedHours(t);
  });
  return Array.from(map.values());
}

/** Utilization color band per the contract (<70 ok, 70–90 warn, >90 over). */
export function utilizationBand(pct: number): 'ok' | 'warning' | 'over' {
  if (pct > 90) return 'over';
  if (pct >= 70) return 'warning';
  return 'ok';
}
