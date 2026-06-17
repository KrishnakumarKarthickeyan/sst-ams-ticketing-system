// Single source of truth for the ticket "status phase" taxonomy used by the
// consultant My Tickets overview and the dashboard status summary. Maps EVERY
// status to exactly one category so per-category counts always reconcile to the
// total — regardless of data volume — instead of leaving New / In Progress /
// Resolved / Escalated uncounted.

export type TicketCategoryKey =
  | 'all' | 'new' | 'in_progress' | 'in_progress_functional' | 'in_progress_technical'
  | 'requirement_gathering' | 'customer_action' | 'on_hold' | 'raised_sap'
  | 'request_closure' | 'escalated' | 'resolved' | 'closed' | 'reopened';

export const categoryOf = (t: { status: string; escalationFlag?: boolean }): TicketCategoryKey => {
  if (t.escalationFlag || t.status === 'Escalated') return 'escalated';
  switch (t.status) {
    case 'New':
    case 'Assigned': return 'new';
    case 'Requirement Gathering': return 'requirement_gathering';
    case 'In Progress - Functional':
    case 'Awaiting Functional Submission': return 'in_progress_functional';
    case 'In Progress - Technical':
    case 'Awaiting Technical Submission': return 'in_progress_technical';
    case 'Customer Action':
    case 'Waiting for Customer': return 'customer_action';
    case 'On Hold': return 'on_hold';
    case 'Raised to SAP': return 'raised_sap';
    case 'Request for Closure':
    case 'Awaiting Manager Approval':
    case 'Awaiting Closure':
    case 'Waiting for Hours Approval': return 'request_closure';
    case 'Resolved': return 'resolved';
    case 'Closed': return 'closed';
    case 'Reopened':
    case 'Reopen Requested': return 'reopened';
    case 'In Progress':
    default: return 'in_progress';
  }
};

// Ordered, complete partition (+ All). Labels match the UI tabs/tiles.
export const TICKET_CATEGORIES: { key: TicketCategoryKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_progress_functional', label: 'IP Functional' },
  { key: 'in_progress_technical', label: 'IP Technical' },
  { key: 'requirement_gathering', label: 'Req. Gathering' },
  { key: 'customer_action', label: 'Cust. Action' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'raised_sap', label: 'Raised To SAP' },
  { key: 'request_closure', label: 'Req. Closure' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
  { key: 'reopened', label: 'Reopened' },
];

// Tally that always reconciles: sum of category counts === all.
export function categoryCounts(tickets: { status: string; escalationFlag?: boolean }[]): Record<string, number> {
  const c: Record<string, number> = { all: tickets.length };
  TICKET_CATEGORIES.forEach(cat => { if (cat.key !== 'all') c[cat.key] = 0; });
  tickets.forEach(t => { const k = categoryOf(t); c[k] = (c[k] || 0) + 1; });
  return c;
}
