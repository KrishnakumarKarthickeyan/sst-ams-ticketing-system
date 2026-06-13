import { describe, it, expect } from 'vitest';
import { timeBuckets, hasTrendSignal } from './chart-kit';

const DAY = 86400e3;

describe('timeBuckets — adaptive granularity', () => {
  it('uses daily granularity for a short span (current low-data reality)', () => {
    const end = Date.parse('2026-06-13T00:00:00Z');
    const r = timeBuckets(end - 6 * DAY, end);
    expect(r.granularity).toBe('day');
    expect(r.buckets.length).toBe(7); // 7 inclusive days
  });

  it('switches to weekly granularity for a ~quarter span', () => {
    const end = Date.parse('2026-06-13T00:00:00Z');
    const r = timeBuckets(end - 120 * DAY, end);
    expect(r.granularity).toBe('week');
    expect(r.buckets.length).toBeLessThan(25);
    expect(r.buckets.length).toBeGreaterThan(12);
  });

  it('switches to monthly granularity for a multi-month span (no 92-day truncation)', () => {
    const end = Date.parse('2026-06-13T00:00:00Z');
    const r = timeBuckets(end - 240 * DAY, end);
    expect(r.granularity).toBe('month');
    expect(r.buckets.length).toBeGreaterThanOrEqual(8);
  });

  it('assigns every timestamp in range to a bucket (no data lost at scale)', () => {
    const start = Date.parse('2026-01-01T00:00:00Z');
    const end = Date.parse('2026-09-01T00:00:00Z');
    const r = timeBuckets(start, end);
    let lost = 0;
    for (let i = 0; i < 500; i++) {
      const ms = start + Math.floor(Math.random() * (end - start));
      if (r.index(ms) < 0) lost++;
    }
    expect(lost).toBe(0);
  });

  it('returns -1 for timestamps outside the range', () => {
    const start = Date.parse('2026-06-01T00:00:00Z');
    const end = Date.parse('2026-06-10T00:00:00Z');
    const r = timeBuckets(start, end);
    expect(r.index(Date.parse('2026-05-01T00:00:00Z'))).toBe(-1);
    expect(r.index(Date.parse('2026-07-01T00:00:00Z'))).toBe(-1);
  });
});

describe('hasTrendSignal', () => {
  it('is false with fewer than two non-zero points', () => {
    expect(hasTrendSignal([{ value: 0 }, { value: 1 }])).toBe(false);
    expect(hasTrendSignal([{ value: 3 }])).toBe(false);
  });

  it('is true with two or more non-zero points', () => {
    expect(hasTrendSignal([{ value: 1 }, { value: 2 }])).toBe(true);
  });

  it('accepts a raw count', () => {
    expect(hasTrendSignal(1)).toBe(false);
    expect(hasTrendSignal(2)).toBe(true);
  });
});
