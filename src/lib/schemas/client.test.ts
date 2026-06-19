import { describe, it, expect } from 'vitest';
import { slaTargetsSchema, clientCreateSchema } from './client';

describe('slaTargetsSchema', () => {
  it('accepts numbers and rejects negatives / non-numbers', () => {
    expect(slaTargetsSchema.safeParse({ critical: 8, high: 16, medium: 32, low: 64 }).success).toBe(true);
    expect(slaTargetsSchema.safeParse({ critical: -1, high: 1, medium: 1, low: 1 }).success).toBe(false);
    expect(slaTargetsSchema.safeParse({ critical: 'x', high: 1, medium: 1, low: 1 }).success).toBe(false);
  });
});

const base = {
  name: 'Acme Lead', email: 'lead@acme.com', orgMode: 'new', newOrgName: 'Acme', newOrgCode: 'ACM',
  contractType: 'AMS', contractStatus: 'Active', startDate: '2026-01-01', endDate: '2026-12-31',
  sla: { critical: 8, high: 16, medium: 32, low: 64 }, isActive: true, pwdMode: 'auto',
} as const;

describe('clientCreateSchema', () => {
  it('accepts a valid new-org client', () => {
    expect(clientCreateSchema.safeParse(base).success).toBe(true);
  });
  it('rejects end date not after start', () => {
    const r = clientCreateSchema.safeParse({ ...base, endDate: '2026-01-01' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some(i => i.path[0] === 'endDate')).toBe(true);
  });
  it('requires org fields when orgMode=new', () => {
    const r = clientCreateSchema.safeParse({ ...base, newOrgName: '', newOrgCode: '' });
    expect(r.success).toBe(false);
  });
  it('requires orgId when orgMode=existing', () => {
    const r = clientCreateSchema.safeParse({ ...base, orgMode: 'existing', newOrgName: undefined, newOrgCode: undefined });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some(i => i.path[0] === 'orgId')).toBe(true);
  });
  it('enforces manual password strength + match', () => {
    expect(clientCreateSchema.safeParse({ ...base, pwdMode: 'manual', password: 'weak', confirm: 'weak' }).success).toBe(false);
    expect(clientCreateSchema.safeParse({ ...base, pwdMode: 'manual', password: 'StrongPass1!xy', confirm: 'different' }).success).toBe(false);
    expect(clientCreateSchema.safeParse({ ...base, pwdMode: 'manual', password: 'StrongPass1!xy', confirm: 'StrongPass1!xy' }).success).toBe(true);
  });
  it('rejects invalid email', () => {
    expect(clientCreateSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false);
  });
});
