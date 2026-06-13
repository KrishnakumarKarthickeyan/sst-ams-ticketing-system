import { describe, it, expect } from 'vitest';
import { statusTone, priorityTone, slaTone } from './status-pill';

describe('statusTone — ticket status → semantic tone', () => {
  it('maps escalation/reopen to critical', () => {
    expect(statusTone('Escalated')).toBe('critical');
    expect(statusTone('Reopened')).toBe('critical');
  });
  it('maps resolved/closure to success and neutral', () => {
    expect(statusTone('Resolved')).toBe('success');
    expect(statusTone('Request for Closure')).toBe('success');
    expect(statusTone('Closed')).toBe('neutral');
  });
  it('maps pending/waiting to warning', () => {
    expect(statusTone('Waiting for Hours Approval')).toBe('warning');
    expect(statusTone('Customer Action')).toBe('warning');
  });
  it('falls back to neutral for unknown statuses', () => {
    expect(statusTone('Some Future Status')).toBe('neutral');
  });
});

describe('priorityTone — priority → semantic tone', () => {
  it('maps the four priorities correctly', () => {
    expect(priorityTone('Critical')).toBe('critical');
    expect(priorityTone('High')).toBe('warning');
    expect(priorityTone('Medium')).toBe('brand');
    expect(priorityTone('Low')).toBe('neutral');
  });
  it('falls back to neutral for unknown priority', () => {
    expect(priorityTone('Trivial')).toBe('neutral');
  });
});

describe('slaTone — SLA state → semantic tone', () => {
  it('maps each SLA state', () => {
    expect(slaTone('breached')).toBe('critical');
    expect(slaTone('warning')).toBe('warning');
    expect(slaTone('healthy')).toBe('success');
    expect(slaTone('na')).toBe('neutral');
  });
});
