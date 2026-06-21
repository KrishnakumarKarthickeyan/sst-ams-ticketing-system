'use client';

import React from 'react';
import Link from 'next/link';
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

/** Solid fill for the optional progress bar, keyed by tone. */
const PROGRESS_FILL: Record<PillTone, string> = {
  neutral: 'bg-ink-muted',
  brand: 'bg-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-critical',
  info: 'bg-info',
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
  progress,
  progressTone = 'brand',
  footer,
  loading = false,
  onClick,
  href,
  dense = false,
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
  /** 0–100 → renders a thin progress bar under the value/sub. */
  progress?: number;
  /** Color of the progress fill (default brand). */
  progressTone?: PillTone;
  /** Extra slot below everything — grade text, threshold note, a badge, etc. */
  footer?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
  /** Navigate on click (e.g. to a filtered list). Renders as a Next <Link>. */
  href?: string;
  /** Compact variant for dense dashboards (tighter padding + smaller value). */
  dense?: boolean;
  active?: boolean;
  className?: string;
}) {
  const interactive = !!onClick || !!href;
  const cardClass = cn(
    'block rounded-lg border border-line bg-surface text-left shadow-card',
    dense ? 'p-3' : 'p-4',
    interactive && 'card-hover cursor-pointer',
    active && 'border-brand ring-1 ring-brand',
    className,
  );
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="type-status text-ink-muted uppercase tracking-wider">{label}</span>
        {Icon && (
          <span className={cn('flex shrink-0 items-center justify-center rounded-md', dense ? 'h-6 w-6' : 'h-7 w-7', ICON_TONES[tone])}>
            <Icon size={dense ? 12 : 14} />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <div className={cn('type-num mt-1 font-semibold tracking-tight text-ink', dense ? 'text-xl' : 'text-2xl')}>{value}</div>
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
      {progress != null && !loading && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
          <div
            className={cn('h-full rounded-full transition-all duration-500', PROGRESS_FILL[progressTone])}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
      {footer && !loading && <div className="mt-2">{footer}</div>}
    </>
  );

  if (href) {
    return <Link href={href} className={cardClass}>{body}</Link>;
  }
  if (onClick) {
    return <button type="button" onClick={onClick} className={cardClass}>{body}</button>;
  }
  return <div className={cardClass}>{body}</div>;
}
