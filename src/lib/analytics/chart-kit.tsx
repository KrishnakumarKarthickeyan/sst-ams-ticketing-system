'use client';

import React from 'react';

/**
 * Tokenized Recharts theme. Every analytics widget pulls axis props, grid,
 * tooltip and palette from here so charts are visually consistent and inherit
 * the design-token colors / Inter font — no per-chart hex, no clipped labels.
 */

// Semantic palette mapped to the design tokens (resolved hex for SVG fills).
export const CHART = {
  brand: '#2563eb',
  brandSoft: '#bfdbfe',
  success: '#059669',
  successSoft: '#a7f3d0',
  warning: '#d97706',
  warningSoft: '#fde68a',
  critical: '#dc2626',
  criticalSoft: '#fecaca',
  info: '#4f46e5',
  infoSoft: '#c7d2fe',
  grid: '#f4f4f5',
  axis: '#a1a1aa',
  ink: '#52525b',
} as const;

// Categorical sequence for multi-series / multi-category charts (no neon, no black).
export const CHART_SEQUENCE = [
  CHART.brand, CHART.info, CHART.success, CHART.warning, '#0891b2', '#7c3aed', CHART.critical,
];

// Priority / status → token color, so a "priority bar" reads the same everywhere.
export const PRIORITY_FILL: Record<string, string> = {
  Critical: CHART.critical,
  High: CHART.warning,
  Medium: CHART.brand,
  Low: CHART.axis,
};

export const LIFECYCLE_FILL: Record<string, string> = {
  Open: CHART.brand,
  'In Progress': CHART.info,
  Resolved: CHART.success,
  Closed: '#a1a1aa',
  Escalated: CHART.critical,
  Reopened: CHART.warning,
};

// Shared axis props — Inter font, muted ticks, no clipping.
export const axisProps = {
  tick: { fontSize: 11, fill: CHART.axis, fontFamily: 'Inter, sans-serif' },
  axisLine: false as const,
  tickLine: false as const,
};

export const gridProps = {
  strokeDasharray: '3 3',
  stroke: CHART.grid,
  vertical: false as const,
};

// Tokenized tooltip — replaces every per-chart inline tooltip style.
export function ChartTooltip({ active, payload, label, unit = '' }: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; dataKey?: string }[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-overlay">
      {label !== undefined && label !== '' && (
        <div className="type-status mb-1 font-semibold text-ink">{label}</div>
      )}
      {payload.map((p, i) => (
        <div key={i} className="type-status flex items-center gap-2 text-ink-secondary">
          {p.color && <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />}
          <span className="capitalize">{p.name ?? p.dataKey}</span>
          <span className="type-num ml-auto font-semibold text-ink">
            {p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Whether a series has enough signal to plot honestly. Sparse data must NOT be
 * smoothed into a fabricated curve — callers use straight segments + dots and
 * fall back to ChartFrame's empty state below this threshold.
 */
export function hasTrendSignal(points: { value?: number }[] | number, min = 2): boolean {
  const n = typeof points === 'number' ? points : points.filter(p => (p.value ?? 0) > 0).length;
  return n >= min;
}

/** Line/area interpolation that never lies: 'linear' for sparse, never 'monotone'. */
export const HONEST_LINE = 'linear' as const;

/**
 * Adaptive time bucketing — the spine of every trend chart so they stay honest
 * AND legible at any data volume:
 *   ≤ ~6 weeks  → daily      (current low-data reality)
 *   ≤ ~6 months → weekly     (a busy quarter)
 *   beyond      → monthly     (a year+ of history)
 * No fixed window, no 92-point cap, no clipped axis at scale. Returns the
 * bucket list plus an O(buckets) index() to assign a timestamp to a bucket.
 */
export interface TimeBucketing {
  buckets: { key: string; label: string }[];
  index: (ms: number) => number;
  granularity: 'day' | 'week' | 'month';
}

export function timeBuckets(startMs: number, endMs: number): TimeBucketing {
  const start = new Date(startMs); start.setHours(0, 0, 0, 0);
  const end = new Date(endMs); end.setHours(23, 59, 59, 999);
  const spanDays = (end.getTime() - start.getTime()) / 86400e3;
  const raw: { key: string; label: string; from: number; to: number }[] = [];
  let granularity: 'day' | 'week' | 'month';

  if (spanDays <= 45) {
    granularity = 'day';
    const c = new Date(start);
    while (c <= end) {
      const from = new Date(c); from.setHours(0, 0, 0, 0);
      const to = new Date(c); to.setHours(23, 59, 59, 999);
      raw.push({ key: from.toISOString().slice(0, 10), label: from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), from: from.getTime(), to: to.getTime() });
      c.setDate(c.getDate() + 1);
    }
  } else if (spanDays <= 187) {
    granularity = 'week';
    const c = new Date(start);
    while (c <= end) {
      const from = new Date(c); from.setHours(0, 0, 0, 0);
      const to = new Date(c); to.setDate(to.getDate() + 6); to.setHours(23, 59, 59, 999);
      raw.push({ key: from.toISOString().slice(0, 10), label: from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), from: from.getTime(), to: to.getTime() });
      c.setDate(c.getDate() + 7);
    }
  } else {
    granularity = 'month';
    const c = new Date(start.getFullYear(), start.getMonth(), 1);
    while (c <= end) {
      const from = new Date(c.getFullYear(), c.getMonth(), 1, 0, 0, 0, 0);
      const to = new Date(c.getFullYear(), c.getMonth() + 1, 0, 23, 59, 59, 999);
      raw.push({ key: `${from.getFullYear()}-${from.getMonth()}`, label: from.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), from: from.getTime(), to: to.getTime() });
      c.setMonth(c.getMonth() + 1);
    }
  }

  const index = (ms: number) => {
    for (let i = 0; i < raw.length; i++) if (ms >= raw[i].from && ms <= raw[i].to) return i;
    return -1;
  };
  return { buckets: raw.map(b => ({ key: b.key, label: b.label })), index, granularity };
}

/** Truncate a long axis category label (~14 chars) — full value still shows in the tooltip. */
export const truncateTick = (v: unknown): string => { const t = String(v ?? ''); return t.length > 14 ? t.slice(0, 13) + '…' : t; };
