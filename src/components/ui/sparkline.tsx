'use client';

import React from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { SEMANTIC } from '../../lib/chart-theme';
import { Skeleton } from './skeleton';

/**
 * Tiny inline trend for embedding in table rows / tight spaces. No axes, grid,
 * legend or tooltip — just the shape of a series. Colors come from chart-theme.
 */
export type SparklineTone = 'positive' | 'neutral' | 'negative';

const TONE_COLOR: Record<SparklineTone, string> = {
  positive: SEMANTIC.success,
  neutral: SEMANTIC.info,
  negative: SEMANTIC.danger,
};

export function Sparkline({
  data,
  tone = 'neutral',
  width = 80,
  height = 28,
  loading = false,
  className,
}: {
  data: number[];
  tone?: SparklineTone;
  width?: number;
  height?: number;
  loading?: boolean;
  className?: string;
}) {
  if (loading) {
    return <Skeleton style={{ width, height }} className={className} />;
  }
  // Empty state — a flat muted dash, never a broken/zero-size chart.
  const hasSignal = Array.isArray(data) && data.length >= 2 && data.some(v => v !== data[0]);
  if (!hasSignal) {
    return (
      <span
        className={`inline-flex items-center justify-center text-ink-muted ${className ?? ''}`}
        style={{ width, height }}
        aria-hidden
      >
        <span className="h-px w-6 bg-line" />
      </span>
    );
  }

  const color = TONE_COLOR[tone];
  const series = data.map((v, i) => ({ i, v }));
  const gradientId = `spark-${tone}`;

  return (
    <span className={`inline-block align-middle ${className ?? ''}`} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${gradientId})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </span>
  );
}
