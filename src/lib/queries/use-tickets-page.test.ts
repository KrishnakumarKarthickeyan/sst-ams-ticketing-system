import { describe, it, expect } from 'vitest';
import { pageBounds, pageCountFor, safeSortColumn } from './use-tickets-page';

describe('pageBounds', () => {
  it('computes inclusive zero-based range', () => {
    expect(pageBounds(0, 25)).toEqual({ from: 0, to: 24 });
    expect(pageBounds(2, 25)).toEqual({ from: 50, to: 74 });
  });
  it('clamps invalid page/size', () => {
    expect(pageBounds(-3, 25)).toEqual({ from: 0, to: 24 });
    expect(pageBounds(1, 0)).toEqual({ from: 1, to: 1 });
  });
});

describe('pageCountFor', () => {
  it('always returns at least 1', () => {
    expect(pageCountFor(0, 25)).toBe(1);
  });
  it('ceils partial pages', () => {
    expect(pageCountFor(51, 25)).toBe(3);
    expect(pageCountFor(50, 25)).toBe(2);
  });
});

describe('safeSortColumn', () => {
  it('passes whitelisted columns', () => {
    expect(safeSortColumn('sla_due_at')).toBe('sla_due_at');
    expect(safeSortColumn('priority')).toBe('priority');
  });
  it('rejects unknown / injection attempts → created_at', () => {
    expect(safeSortColumn('id; drop table tickets')).toBe('created_at');
    expect(safeSortColumn(undefined)).toBe('created_at');
    expect(safeSortColumn('password')).toBe('created_at');
  });
});
