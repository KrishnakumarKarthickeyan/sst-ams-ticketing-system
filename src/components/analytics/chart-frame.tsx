'use client';

import React from 'react';
import { LineChart as LineChartIcon, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/skeleton';

/**
 * Canonical analytics widget shell. Every chart/metric panel uses one of these
 * so the page reads as a curated command center, not a wall:
 *   - clean title (NO chart-type suffix, NO numbering)
 *   - optional context line (vs target / since-launch framing)
 *   - loading skeleton
 *   - a DESIGNED empty state when there isn't enough data to be honest —
 *     never a flatline or a single-slice ring.
 *
 * `ready={false}` renders the empty message; pass `emptyHint` to tailor it.
 */
export function ChartFrame({
  title,
  context,
  icon: Icon,
  action,
  loading = false,
  ready = true,
  emptyTitle = 'Not enough data yet',
  emptyHint = 'This populates as tickets flow through the system.',
  emptyIcon: EmptyIcon = LineChartIcon,
  height = 240,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode;
  context?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  loading?: boolean;
  ready?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  emptyIcon?: LucideIcon;
  height?: number;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn('flex flex-col rounded-lg border border-line bg-surface p-4 shadow-card', className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="type-widget flex items-center gap-2 text-ink">
            {Icon && <Icon size={14} className="shrink-0 text-ink-muted" />}
            {title}
          </h3>
          {context && <p className="type-status mt-0.5 text-ink-muted">{context}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className={cn('min-h-0', bodyClassName)} style={{ height }}>
        {loading ? (
          <div className="flex h-full flex-col justify-end gap-2 pb-2" style={{ height }}>
            <div className="flex flex-1 items-end gap-2">
              {[40, 70, 55, 85, 60, 75].map((h, i) => (
                <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        ) : !ready ? (
          <div
            className="flex flex-col items-center justify-center rounded-md border border-dashed border-line bg-surface-muted/40 px-6 text-center"
            style={{ height }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface">
              <EmptyIcon size={16} className="text-ink-muted" />
            </div>
            <p className="type-meta mt-2.5 font-medium text-ink-secondary">{emptyTitle}</p>
            <p className="type-status mt-0.5 max-w-[220px] text-ink-muted">{emptyHint}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
