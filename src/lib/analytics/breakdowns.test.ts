import { describe, it, expect } from 'vitest';
import {
  typeMix, categoryBreakdown, businessImpactDist, resolutionByPriority,
  slaByPriority, qualityStats, type Ticketish,
} from './breakdowns';

const mk = (o: Partial<Ticketish>): Ticketish => ({ status: 'New', createdAt: '2026-06-01T00:00:00Z', ...o });

describe('countBy-based breakdowns', () => {
  it('type mix counts and sorts desc, ignoring blanks', () => {
    const t = [mk({ ticketType: 'Incident' }), mk({ ticketType: 'Incident' }), mk({ ticketType: 'Change Request' }), mk({})];
    expect(typeMix(t)).toEqual([{ name: 'Incident', value: 2 }, { name: 'Change Request', value: 1 }]);
  });
  it('category breakdown drops empty strings', () => {
    expect(categoryBreakdown([mk({ category: 'Workflow Issue' }), mk({ category: '' })])).toEqual([{ name: 'Workflow Issue', value: 1 }]);
  });
});

describe('businessImpactDist', () => {
  it('shortens labels and orders most→least severe', () => {
    const t = [mk({ businessImpact: 'Minor Business Impact' }), mk({ businessImpact: 'Major Business Impact' }), mk({ businessImpact: 'Moderate Business Impact' })];
    expect(businessImpactDist(t).map(d => d.name)).toEqual(['Major', 'Moderate', 'Minor']);
  });
});

describe('resolutionByPriority', () => {
  it('averages resolution hours only for resolved tickets, per priority', () => {
    const t = [
      mk({ priority: 'Critical', status: 'Closed', createdAt: '2026-06-01T00:00:00Z', closedAt: '2026-06-01T04:00:00Z' }),
      mk({ priority: 'Critical', status: 'Closed', createdAt: '2026-06-01T00:00:00Z', closedAt: '2026-06-01T08:00:00Z' }),
      mk({ priority: 'Low', status: 'New' }), // open → excluded
    ];
    const r = resolutionByPriority(t);
    expect(r).toEqual([{ name: 'Critical', value: 6, n: 2 }]); // (4+8)/2
  });
});

describe('slaByPriority', () => {
  it('computes compliance per priority for incidents with a target', () => {
    const now = Date.parse('2026-06-10T00:00:00Z');
    const t = [
      // High incident, breached (due in past, still open)
      mk({ priority: 'High', ticketType: 'Incident', slaDueAt: '2026-06-05T00:00:00Z', status: 'New' }),
      // High incident, met (closed before due)
      mk({ priority: 'High', ticketType: 'Incident', slaDueAt: '2026-06-12T00:00:00Z', status: 'Closed', closedAt: '2026-06-08T00:00:00Z' }),
    ];
    const r = slaByPriority(t, now);
    expect(r).toEqual([{ name: 'High', pct: 50, met: 1, breached: 1 }]);
  });
});

describe('qualityStats', () => {
  it('computes reopen rate and resolution stats', () => {
    const t = [
      mk({ reopenedCount: 1, status: 'Closed', createdAt: '2026-06-01T00:00:00Z', closedAt: '2026-06-01T02:00:00Z' }),
      mk({ reopenedCount: 0, status: 'New' }),
    ];
    const q = qualityStats(t);
    expect(q.reopened).toBe(1);
    expect(q.reopenRate).toBe(50);
    expect(q.resolved).toBe(1);
    expect(q.avgResolution).toBe(2);
  });
  it('returns nulls cleanly when there is nothing to measure', () => {
    expect(qualityStats([])).toEqual({ reopenRate: null, reopened: 0, resolved: 0, avgResolution: null });
  });
});
