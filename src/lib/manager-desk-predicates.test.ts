import { describe, it, expect } from 'vitest';
import type { Ticket } from '../types/ticket';
import { isUnassigned, isSlaBreached, hasPendingApproval, matchesTab, type ManagerDeskTab } from './manager-desk-predicates';

const NOW = Date.parse('2026-06-17T12:00:00.000Z');
const HOUR = 3600e3;

function mk(over: Partial<Ticket>): Ticket {
  return {
    id: 't', ticketNumber: 'BIT-1', title: 'x', description: 'd',
    status: 'New', priority: 'Medium', sapModule: 'FICO', organization: 'Org',
    ticketType: 'Incident', assignedConsultant: '', reopenedCount: 0,
    createdAt: new Date(NOW - 5 * 24 * HOUR).toISOString(),
    slaDueAt: new Date(NOW + 24 * HOUR).toISOString(),
    updatedAt: new Date(NOW).toISOString(),
    consultantEfforts: [], efforts: [], hourEstimates: [], closureRequests: [],
    unlockRequests: [], escalations: [], assignments: [], history: [], comments: [],
    actualHoursLogs: [],
    ...over,
  } as Ticket;
}

describe('isSlaBreached — single source of truth', () => {
  it('breached when due is in the past and ticket is open', () => {
    expect(isSlaBreached(mk({ status: 'In Progress', slaDueAt: new Date(NOW - HOUR).toISOString() }), NOW)).toBe(true);
  });
  it('not breached when closed/resolved even if past due', () => {
    expect(isSlaBreached(mk({ status: 'Closed', slaDueAt: new Date(NOW - HOUR).toISOString() }), NOW)).toBe(false);
    expect(isSlaBreached(mk({ status: 'Resolved', slaDueAt: new Date(NOW - HOUR).toISOString() }), NOW)).toBe(false);
  });
  it('not breached when due is in the future', () => {
    expect(isSlaBreached(mk({ status: 'In Progress', slaDueAt: new Date(NOW + HOUR).toISOString() }), NOW)).toBe(false);
  });
  it('not breached when SLA Not Applicable (NaN deadline)', () => {
    expect(isSlaBreached(mk({ status: 'In Progress', slaDueAt: 'SLA Not Applicable' }), NOW)).toBe(false);
  });
});

describe('isUnassigned', () => {
  // Canonical "needs dispatch" = NO consultant of any kind assigned. Shared by the
  // Unassigned tab and the Immediate Assignment Queue, so an escalated-but-assigned
  // ticket is never in the queue.
  it('true when no consultant of any kind is assigned', () => {
    expect(isUnassigned(mk({ leadConsultantId: undefined }))).toBe(true);
  });
  it('false once a lead consultant is assigned', () => {
    expect(isUnassigned(mk({ leadConsultantId: 'lead-uuid-1' }))).toBe(false);
  });
  it('false when assigned via assignedConsultantId (no lead yet)', () => {
    expect(isUnassigned(mk({ leadConsultantId: undefined, assignedConsultantId: 'c-1' }))).toBe(false);
  });
  it('false when an active assignment exists (no lead yet)', () => {
    expect(isUnassigned(mk({ leadConsultantId: undefined, assignments: [{ active: true } as never] }))).toBe(false);
  });
  it('escalated but assigned → NOT in the queue', () => {
    expect(isUnassigned(mk({ escalationFlag: true, isEscalated: true, leadConsultantId: 'lead-1' }))).toBe(false);
  });
  it('escalated AND unassigned → still in the queue', () => {
    expect(isUnassigned(mk({ escalationFlag: true, isEscalated: true, leadConsultantId: undefined }))).toBe(true);
  });
});

describe('hasPendingApproval', () => {
  it('true when a closure request awaits manager approval', () => {
    expect(hasPendingApproval(mk({ closureRequests: [{ status: 'Pending Manager Approval' } as never] }))).toBe(true);
  });
  it('false with nothing pending', () => {
    expect(hasPendingApproval(mk({}))).toBe(false);
  });
});

describe('matchesTab — reconciliation: every ticket lands in exactly the right concept tabs', () => {
  it('all matches everything', () => {
    expect(matchesTab('all', mk({ status: 'Closed' }), NOW)).toBe(true);
  });
  it('critical reads priority', () => {
    expect(matchesTab('critical', mk({ priority: 'Critical' }), NOW)).toBe(true);
    expect(matchesTab('critical', mk({ priority: 'High' }), NOW)).toBe(false);
  });
  it('closed reads exact status casing', () => {
    expect(matchesTab('closed', mk({ status: 'Closed' }), NOW)).toBe(true);
    expect(matchesTab('closed', mk({ status: 'Resolved' }), NOW)).toBe(false);
  });
  it('customerAction matches the customer-action statuses', () => {
    expect(matchesTab('customerAction', mk({ status: 'Waiting for Customer' }), NOW)).toBe(true);
    expect(matchesTab('customerAction', mk({ status: 'Customer Action' }), NOW)).toBe(true);
  });
  it('reqClosure matches Request for Closure / Awaiting Manager Approval', () => {
    expect(matchesTab('reqClosure', mk({ status: 'Request for Closure' }), NOW)).toBe(true);
  });
  it('slaBreached uses the shared breach predicate', () => {
    const breached = mk({ status: 'In Progress', slaDueAt: new Date(NOW - HOUR).toISOString() });
    expect(matchesTab('slaBreached', breached, NOW)).toBe(isSlaBreached(breached, NOW));
  });

  it('a Closed ticket is counted by closed but never by slaBreached', () => {
    const closed = mk({ status: 'Closed', slaDueAt: new Date(NOW - HOUR).toISOString(), priority: 'Low' });
    const tabs: ManagerDeskTab[] = ['all', 'closed', 'slaBreached', 'critical'];
    const hits = tabs.filter(tab => matchesTab(tab, closed, NOW));
    expect(hits.sort()).toEqual(['all', 'closed'].sort());
  });
});
