import React from 'react';
import { Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * First-class AI surface. Everything the platform's intelligence says —
 * predictions, recommendations, forecasts, risk alerts — renders inside an
 * AICard so AI output is always visually recognizable (Indigo identity).
 */
export function AICard({
  title = 'AI Insight',
  icon: Icon = Sparkles,
  children,
  action,
  className,
}: {
  title?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-info-border bg-gradient-to-b from-info-soft/70 to-surface p-4 shadow-card',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="type-status inline-flex items-center gap-1.5 font-semibold tracking-wider text-info-strong uppercase">
          <Icon size={12} />
          {title}
        </span>
        {action}
      </div>
      <div className="type-body mt-2 text-ink-secondary">{children}</div>
    </div>
  );
}

/** Compact row for lists of AI findings inside an AICard. */
export function AIInsightRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: LucideIcon;
  label: React.ReactNode;
  value?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 py-1.5', className)}>
      <span className="type-meta flex min-w-0 items-center gap-2 text-ink-secondary">
        {Icon && <Icon size={13} className="shrink-0 text-info" />}
        <span className="truncate">{label}</span>
      </span>
      {value && <span className="type-meta type-num shrink-0 font-semibold text-ink">{value}</span>}
    </div>
  );
}
