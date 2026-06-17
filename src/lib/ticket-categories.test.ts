import { describe, it, expect } from 'vitest';
import { categoryOf, categoryCounts, TICKET_CATEGORIES } from './ticket-categories';

const t = (status: string, escalationFlag = false) => ({ status, escalationFlag });

describe('categoryOf', () => {
  it('maps generic statuses (the ones that were being dropped)', () => {
    expect(categoryOf(t('New'))).toBe('new');
    expect(categoryOf(t('In Progress'))).toBe('in_progress');
    expect(categoryOf(t('Resolved'))).toBe('resolved');
    expect(categoryOf(t('Closed'))).toBe('closed');
  });
  it('escalation flag wins over status', () => {
    expect(categoryOf(t('In Progress', true))).toBe('escalated');
    expect(categoryOf(t('Escalated'))).toBe('escalated');
  });
  it('folds granular statuses into their phase', () => {
    expect(categoryOf(t('In Progress - Functional'))).toBe('in_progress_functional');
    expect(categoryOf(t('Awaiting Manager Approval'))).toBe('request_closure');
    expect(categoryOf(t('Waiting for Customer'))).toBe('customer_action');
  });
  it('never returns all and never drops an unknown status', () => {
    expect(categoryOf(t('Some Future Status'))).toBe('in_progress');
  });
});

describe('categoryCounts reconciles at any volume', () => {
  const reconciles = (tickets: { status: string; escalationFlag?: boolean }[]) => {
    const c = categoryCounts(tickets);
    const sum = TICKET_CATEGORIES.filter(x => x.key !== 'all').reduce((s, x) => s + (c[x.key] || 0), 0);
    expect(c.all).toBe(tickets.length);
    expect(sum).toBe(tickets.length); // the bug: split must equal All
  };
  it('low volume', () => {
    reconciles([t('In Progress'), t('Resolved')]); // the screenshot case: All=2
  });
  it('empty', () => reconciles([]));
  it('high volume mixed', () => {
    const pool = ['New', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Customer Action', 'Raised to SAP', 'Reopened', 'In Progress - Technical', 'Request for Closure'];
    const many = Array.from({ length: 500 }, (_, i) => t(pool[i % pool.length], i % 17 === 0));
    reconciles(many);
  });
});
