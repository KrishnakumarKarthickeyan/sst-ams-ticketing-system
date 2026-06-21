import type { Ticket } from '../types/ticket';

/**
 * Canonical predicates for the Manager Service Desk. The SAME function backs the
 * tab badge count, the card-list filter, and (where relevant) the SLA pill — so
 * tabs, counts, and cards can never diverge for a concept. All status comparisons
 * use the camelCase mapped model with the exact stored casing.
 */
export type ManagerDeskTab =
  | 'all'
  | 'unassigned'
  | 'critical'
  | 'slaBreached'
  | 'raisedToSap'
  | 'customerAction'
  | 'reqClosure'
  | 'reopened'
  | 'closed'
  | 'pendingApprovals';

/**
 * "Needs dispatch" — no LEAD consultant assigned yet. The SLA clock only starts on
 * lead assignment, so a ticket without a lead is the dispatch backlog. This single
 * canonical predicate is shared by the Unassigned tab AND the dashboard Dispatch
 * Backlog so their counts can never diverge.
 */
export function isUnassigned(t: Ticket): boolean {
  // Closed/Resolved tickets are done — they are never "awaiting dispatch".
  if (t.status === 'Closed' || t.status === 'Resolved') return false;
  return !t.leadConsultantId;
}

/**
 * SINGLE source of truth for "SLA breached". Read by the SLA Breached tab badge,
 * the SLA Status filter, and the card SLA pill — no divergent recompute. Closed /
 * Resolved tickets met their SLA; 'SLA Not Applicable' parses to NaN and is
 * excluded. `slaDueAt` is the server-computed deadline (business-hours aware).
 */
export function isSlaBreached(t: Pick<Ticket, 'status' | 'slaDueAt' | 'slaStatus'>, nowMs: number): boolean {
  // Single source of truth: the IST business-hours engine writes slaStatus onto
  // every mapped ticket. Prefer it so the SLA Breached tab/KPI, the SLA Status
  // filter, and the card SlaTimer all agree. (An unassigned ticket is
  // 'Not Started' -> never breached.) Fall back to the legacy slaDueAt recompute
  // only when slaStatus is absent (e.g. local/offline ticket objects).
  if (t.slaStatus != null) return t.slaStatus === 'Breached';
  if (t.status === 'Closed' || t.status === 'Resolved') return false;
  const due = new Date(t.slaDueAt).getTime();
  return Number.isFinite(due) && due < nowMs;
}

/** A closure request, estimate, actuals log, or unlock request awaiting the manager. */
export function hasPendingApproval(t: Ticket): boolean {
  return (
    (t.hourEstimates?.some(e => e.status === 'Submitted') ?? false) ||
    (t.efforts?.some(e => e.status === 'Pending' || e.status === 'Pending Approval') ?? false) ||
    (t.closureRequests?.some(c => c.status === 'Pending Manager Approval') ?? false) ||
    (t.unlockRequests?.some(u => u.status === 'Pending') ?? false)
  );
}

/** Whether a ticket belongs to a given desk tab. `all` matches everything. */
export function matchesTab(tab: ManagerDeskTab, t: Ticket, nowMs: number): boolean {
  switch (tab) {
    case 'unassigned':
      return isUnassigned(t);
    case 'critical':
      return t.priority === 'Critical';
    case 'slaBreached':
      return isSlaBreached(t, nowMs);
    case 'raisedToSap':
      return t.status === 'Raised to SAP' || !!t.raisedToSap;
    case 'customerAction':
      return t.status === 'Customer Action' || t.status === 'Waiting for Customer';
    case 'reqClosure':
      return t.status === 'Request for Closure' || t.status === 'Awaiting Manager Approval';
    case 'reopened':
      return t.status === 'Reopened';
    case 'closed':
      return t.status === 'Closed';
    case 'pendingApprovals':
      return hasPendingApproval(t);
    case 'all':
    default:
      return true;
  }
}
