import { describe, it, expect } from 'vitest';
import {
  buildBuckets, autoGranularity, bucketIndex, statusGroup, hasSlaTarget,
  slaBreached, resolutionHours, approvedHours, aggregateConsultants,
  aggregateCustomers, utilizationBand,
} from './derive';
import type { Ticket } from '../../types/ticket';

const mk = (o: Partial<Ticket>): Ticket => ({
  id: 'id', ticketNumber: 'BAS-000001', subject: 's', description: 'd',
  status: 'New', priority: 'Medium', sapModule: 'FICO', organization: 'BASAMH',
  createdAt: '2026-06-01T00:00:00Z', slaDueAt: '2026-06-02T00:00:00Z',
  escalationFlag: false, efforts: [],
  ...o,
} as unknown as Ticket);

describe('buildBuckets / autoGranularity', () => {
  it('builds one daily bucket per day inclusive', () => {
    const b = buildBuckets(Date.parse('2026-06-01'), Date.parse('2026-06-03'), 'day');
    expect(b).toHaveLength(3);
  });
  it('picks day/week/month by span', () => {
    const d = Date.parse('2026-06-01');
    expect(autoGranularity(d, d + 10 * 86400e3)).toBe('day');
    expect(autoGranularity(d, d + 120 * 86400e3)).toBe('week');
    expect(autoGranularity(d, d + 400 * 86400e3)).toBe('month');
  });
  it('indexes a timestamp into its bucket', () => {
    const b = buildBuckets(Date.parse('2026-06-01'), Date.parse('2026-06-03'), 'day');
    expect(bucketIndex(b, Date.parse('2026-06-02T12:00:00Z'))).toBe(1);
    expect(bucketIndex(b, Date.parse('2026-07-01'))).toBe(-1);
  });
});

describe('statusGroup', () => {
  it('maps escalation flag over raw status', () => {
    expect(statusGroup('In Progress', true)).toBe('Escalated');
  });
  it('buckets closed and pending-closure', () => {
    expect(statusGroup('Resolved')).toBe('Closed');
    expect(statusGroup('Request for Closure')).toBe('Pending Closure');
    expect(statusGroup('In Progress - Technical')).toBe('In Progress');
  });
});

describe('SLA', () => {
  it('only incidents with a due date have an SLA target', () => {
    expect(hasSlaTarget(mk({ slaDueAt: 'SLA Not Applicable' }))).toBe(false);
    expect(hasSlaTarget(mk({}))).toBe(true);
  });
  it('breached when open past due', () => {
    const t = mk({ slaDueAt: '2026-06-02T00:00:00Z', status: 'In Progress' });
    expect(slaBreached(t, Date.parse('2026-06-03T00:00:00Z'))).toBe(true);
    expect(slaBreached(t, Date.parse('2026-06-01T00:00:00Z'))).toBe(false);
  });
  it('uses resolution time for closed tickets', () => {
    const onTime = mk({ status: 'Closed', slaDueAt: '2026-06-02T00:00:00Z', resolvedAt: '2026-06-01T12:00:00Z' });
    expect(slaBreached(onTime, Date.parse('2026-06-10'))).toBe(false);
  });
});

describe('resolutionHours / approvedHours', () => {
  it('computes hours for closed tickets only', () => {
    expect(resolutionHours(mk({ status: 'Closed', createdAt: '2026-06-01T00:00:00Z', closedAt: '2026-06-01T05:00:00Z' }))).toBe(5);
    expect(resolutionHours(mk({ status: 'New' }))).toBeNull();
  });
  it('sums only approved effort', () => {
    const t = mk({ efforts: [
      { id: '1', ticketId: 'id', consultantName: 'A', description: '', activityType: 'Analysis', billable: true, status: 'Approved', hoursWorked: 3, createdAt: '' },
      { id: '2', ticketId: 'id', consultantName: 'A', description: '', activityType: 'Analysis', billable: true, status: 'Pending', hoursWorked: 9, createdAt: '' },
    ] as Ticket['efforts'] });
    expect(approvedHours(t)).toBe(3);
  });
});

describe('aggregateConsultants / aggregateCustomers', () => {
  const now = Date.parse('2026-06-10T00:00:00Z');
  it('aggregates handled/closed/sla per consultant', () => {
    const t = [
      mk({ assignedConsultant: 'Sara', status: 'Closed', resolvedAt: '2026-06-01T04:00:00Z', slaDueAt: '2026-06-02T00:00:00Z' }),
      mk({ assignedConsultant: 'Sara', status: 'In Progress', slaDueAt: '2026-06-02T00:00:00Z' }),
    ];
    const agg = aggregateConsultants(t, now);
    expect(agg).toHaveLength(1);
    expect(agg[0].handled).toBe(2);
    expect(agg[0].closed).toBe(1);
    expect(agg[0].slaTotal).toBe(2);
    expect(agg[0].slaMet).toBe(1); // the open one is breached as of now
    expect(agg[0].slaAdherence).toBe(50);
  });
  it('credits active count + logged hours to EVERY assigned consultant', () => {
    const t = [
      mk({
        status: 'In Progress', assignedConsultant: 'Sara',
        assignments: [
          { ticketId: 'id', consultantId: 'c1', consultantName: 'Sara', consultantType: 'Functional', isPrimary: true, active: true, assignedAt: '' },
          { ticketId: 'id', consultantId: 'c2', consultantName: 'Omar', consultantType: 'Technical', isPrimary: false, active: true, assignedAt: '' },
        ],
        consultantEfforts: [
          { id: 'e1', ticketId: 'id', consultantId: 'c1', consultantName: 'Sara', consultantType: 'Functional', estimatedHours: 0, actualHours: 4, createdAt: '', updatedAt: '' },
          { id: 'e2', ticketId: 'id', consultantId: 'c2', consultantName: 'Omar', consultantType: 'Technical', estimatedHours: 0, actualHours: 6, createdAt: '', updatedAt: '' },
        ],
      } as Partial<Ticket>),
    ];
    const agg = aggregateConsultants(t, now);
    const sara = agg.find(a => a.name === 'Sara')!;
    const omar = agg.find(a => a.name === 'Omar')!;
    expect(agg).toHaveLength(2);
    expect(sara.active).toBe(1);
    expect(omar.active).toBe(1); // additional consultant gets the load too
    expect(sara.loggedHours).toBe(4);
    expect(omar.loggedHours).toBe(6); // each attributed their OWN hours (no double-count)
    expect(sara.functional).toBe(4);
    expect(omar.technical).toBe(6);
  });
  it('aggregates per customer org', () => {
    const c = aggregateCustomers([mk({ organization: 'BASAMH' }), mk({ organization: 'BASAMH', status: 'Closed', resolvedAt: '2026-06-01T01:00:00Z' })], now);
    expect(c).toHaveLength(1);
    expect(c[0].tickets).toBe(2);
    expect(c[0].closed).toBe(1);
  });
});

describe('utilizationBand', () => {
  it('bands utilization', () => {
    expect(utilizationBand(50)).toBe('ok');
    expect(utilizationBand(80)).toBe('warning');
    expect(utilizationBand(95)).toBe('over');
  });
});
