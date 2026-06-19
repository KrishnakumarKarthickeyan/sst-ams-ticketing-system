import { describe, it, expect } from 'vitest';
import { validateTicketCreate } from './ticket';

const valid = {
  title: 'Cannot post invoice', description: 'FB60 dump', requestType: 'Incident',
  classification: 'Functional', category: 'Bug', priority: 'High',
  sapModules: ['FICO'], hasCustomer: true,
};

describe('validateTicketCreate', () => {
  it('returns no errors for a complete form', () => {
    expect(validateTicketCreate(valid)).toEqual([]);
  });
  it('flags each missing required field', () => {
    const errs = validateTicketCreate({ ...valid, title: '', description: '  ', sapModules: [], hasCustomer: false });
    expect(errs).toContain('Subject / Title is required');
    expect(errs).toContain('Description is required');
    expect(errs).toContain('At least one SAP Module must be selected');
    expect(errs).toContain('Customer Account is required');
  });
  it('requires a selected customer', () => {
    expect(validateTicketCreate({ ...valid, hasCustomer: false })).toContain('Customer Account is required');
  });
});
