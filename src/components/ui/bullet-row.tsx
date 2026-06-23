'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { Progress } from './progress';
import type { PillTone } from './status-pill';

/**
 * Compact labeled progress row for utilization / capacity rosters — a tighter
 * alternative to a tall per-row bar chart. Left label (truncate + tooltip), a
 * shadcn Progress bar vs a max, an optional target marker line, and a right
 * value. Color is chosen from the value bands. All colors via theme tokens.
 */
export interface BulletBand {
  /** inclusive upper bound for this tone */
  upTo: number;
  tone: PillTone;
}

const FILL: Record<PillTone, string> = {
  neutral: 'bg-ink-muted',
  brand: 'bg-brand',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-critical',
};

function bandTone(value: number, bands?: BulletBand[]): PillTone {
  if (!bands || bands.length === 0) return 'info';
  for (const b of bands) if (value <= b.upTo) return b.tone;
  return bands[bands.length - 1].tone;
}

export function BulletRow({
  label,
  value,
  max = 100,
  target,
  bands,
  valueText,
  labelWidth = 'w-32',
  className,
}: {
  label: React.ReactNode;
  value: number;
  max?: number;
  /** optional target/capacity marker, in the same units as value */
  target?: number;
  bands?: BulletBand[];
  /** overrides the right-hand text (defaults to the % of max) */
  valueText?: React.ReactNode;
  labelWidth?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const tone = bandTone(value, bands);
  const targetPct = target != null && max > 0 ? Math.min(100, Math.max(0, (target / max) * 100)) : null;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className={cn('shrink-0 truncate type-meta text-ink', labelWidth)} title={typeof label === 'string' ? label : undefined}>
        {label}
      </span>
      <div className="relative min-w-0 flex-1">
        <Progress value={pct} indicatorClassName={FILL[tone]} className="h-2" />
        {targetPct != null && (
          <span
            className="absolute -top-0.5 h-3 w-px bg-ink"
            style={{ left: `${targetPct}%` }}
            title={`Target ${target}`}
            aria-hidden
          />
        )}
      </div>
      <span className="type-num type-meta w-12 shrink-0 text-right text-ink-secondary">
        {valueText ?? `${Math.round(pct)}%`}
      </span>
    </div>
  );
}
