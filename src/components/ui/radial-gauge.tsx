'use client';

import React from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { SEMANTIC } from '../../lib/chart-theme';
import { Skeleton } from './skeleton';

/**
 * A single hero metric dial (0–100). Color is chosen from value bands. Compact,
 * fixed size, centered value + label. Track uses the muted theme token, fill
 * comes from chart-theme. Use for one headline metric (e.g. team SLA adherence).
 */
export interface GaugeBand {
  /** inclusive upper bound for this color */
  upTo: number;
  color: string;
}

function bandColor(value: number, bands?: GaugeBand[]): string {
  if (!bands || bands.length === 0) return SEMANTIC.info;
  for (const b of bands) if (value <= b.upTo) return b.color;
  return bands[bands.length - 1].color;
}

export function RadialGauge({
  value,
  label,
  sublabel,
  bands,
  size = 132,
  loading = false,
  suffix = '%',
}: {
  value: number | null;
  label: string;
  sublabel?: React.ReactNode;
  bands?: GaugeBand[];
  size?: number;
  loading?: boolean;
  suffix?: string;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2" style={{ width: size }}>
        <Skeleton className="rounded-full" style={{ width: size, height: size }} />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  const hasValue = value !== null && Number.isFinite(value);
  const v = hasValue ? Math.max(0, Math.min(100, value as number)) : 0;
  const color = bandColor(v, bands);
  const data = [{ name: label, value: v }];

  return (
    <div className="flex flex-col items-center justify-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: 'hsl(var(--muted))' }}
              dataKey="value"
              cornerRadius={9}
              fill={color}
              angleAxisId={0}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="type-num text-2xl font-semibold tracking-tight text-ink">
            {hasValue ? `${Math.round(v)}${suffix}` : '—'}
          </span>
        </div>
      </div>
      <span className="mt-1 type-status uppercase tracking-wider text-ink-muted">{label}</span>
      {sublabel && <span className="type-status text-ink-muted">{sublabel}</span>}
    </div>
  );
}
