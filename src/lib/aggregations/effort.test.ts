import { describe, it, expect } from 'vitest';
import { computeTeamEstimate, computeTeamActual } from './effort';

describe('computeTeamEstimate', () => {
  it('returns 0 for nullish or non-array input', () => {
    expect(computeTeamEstimate(null)).toBe(0);
    expect(computeTeamEstimate(undefined)).toBe(0);
    // @ts-expect-error — guarding runtime misuse
    expect(computeTeamEstimate('nope')).toBe(0);
  });
  it('sums across camelCase, snake_case and generic fallbacks', () => {
    expect(computeTeamEstimate([
      { estimatedHours: 4 },
      { estimated_hours: 6 },
      { hours: 2 },
    ])).toBe(12);
  });
  it('coerces strings and ignores non-numeric values', () => {
    expect(computeTeamEstimate([{ estimatedHours: '5' }, { estimatedHours: 'x' }])).toBe(5);
  });
});

describe('computeTeamActual', () => {
  it('returns 0 for nullish input', () => {
    expect(computeTeamActual(null)).toBe(0);
  });
  it('sums actual-hours variants', () => {
    expect(computeTeamActual([
      { actualHours: 3 },
      { actual_hours: 7 },
      { hours: 1 },
    ])).toBe(11);
  });
});
