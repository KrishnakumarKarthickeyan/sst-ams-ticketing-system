'use client';

import React from 'react';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from './skeleton';
import type { PillTone } from './status-pill';

const ICON_TONES: Record<PillTone, string> = {
  neutral: 'bg-surface-subtle text-ink-secondary',
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  critical: 'bg-critical-soft text-critical',
  info: 'bg-info-soft text-info',
};

/**
 * Canonical KPI/stat card. One visual grammar for every metric on every
 * dashboard: label, tabular-numeral value, optional delta and context line.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  delta,
  deltaIsGood,
  sub,
  loading = false,
  onClick,
  active = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: PillTone;
  /** e.g. "+12%" or "-4.2h" */
  delta?: string;
  /** colors the delta: true → success, false → critical, undefined → neutral */
  deltaIsGood?: boolean;
  sub?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'rounded-lg border border-line bg-surface p-4 text-left shadow-card',
        onClick && 'card-hover cursor-pointer',
        active && 'border-brand ring-1 ring-brand',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="type-status text-ink-muted uppercase tracking-wider">{label}</span>
        {Icon && (
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', ICON_TONES[tone])}>
            <Icon size={14} />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <div className="type-num mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</div>
      )}
      {(delta || sub) && !loading && (
        <div className="mt-1 flex items-center gap-2">
          {delta && (
            <span
              className={cn(
                'type-status inline-flex items-center gap-0.5 font-semibold',
                deltaIsGood === true && 'text-success',
                deltaIsGood === false && 'text-critical',
                deltaIsGood === undefined && 'text-ink-secondary'
              )}
            >
              {deltaIsGood === true && <TrendingUp size={11} />}
              {deltaIsGood === false && <TrendingDown size={11} />}
              {delta}
            </span>
          )}
          {sub && <span className="type-status text-ink-muted">{sub}</span>}
        </div>
      )}
    </Tag>
  );
}
