import { describe, it, expect } from 'vitest';
import { consultantCreateSchema } from './consultant';

const base = { fullName: 'Karthik S', email: 'k@firm.com', type: 'Functional', pwdMode: 'auto' } as const;

describe('consultantCreateSchema', () => {
  it('accepts a valid auto-password consultant', () => {
    expect(consultantCreateSchema.safeParse(base).success).toBe(true);
  });
  it('rejects short name and bad email', () => {
    expect(consultantCreateSchema.safeParse({ ...base, fullName: 'K' }).success).toBe(false);
    expect(consultantCreateSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false);
  });
  it('enforces manual password strength + confirmation', () => {
    expect(consultantCreateSchema.safeParse({ ...base, pwdMode: 'manual', password: 'weak', confirm: 'weak' }).success).toBe(false);
    expect(consultantCreateSchema.safeParse({ ...base, pwdMode: 'manual', password: 'StrongPass1!xy', confirm: 'nope' }).success).toBe(false);
    expect(consultantCreateSchema.safeParse({ ...base, pwdMode: 'manual', password: 'StrongPass1!xy', confirm: 'StrongPass1!xy' }).success).toBe(true);
  });
});
