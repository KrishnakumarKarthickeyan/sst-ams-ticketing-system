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
