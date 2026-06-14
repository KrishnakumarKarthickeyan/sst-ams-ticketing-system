'use client';

import React from 'react';
import { Inbox, ArrowUp, ArrowDown, Minus, type LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';

/**
 * Shared analytics primitives that enforce the alignment contract:
 *  - ChartCard: shadcn Card + fixed-height CardContent so rows never go ragged.
 *  - ChartTooltip: one styled tooltip (shadcn popover card) for every chart.
 *  - EmptyChart: centered muted icon + "No data for this period".
 *  - KpiCard: value + uppercase label + delta vs previous period.
 * No chart in the dashboards renders without one of these.
 */

// ── Styled tooltip — shadcn popover card style, used by EVERY chart ──
export function ChartTooltip({
  active,
  payload,
  label,
  unit = '',
  valueFormatter,
}: {
  active?: boolean;
  // recharts passes a loosely-typed payload array
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string }>;
  label?: string | number;
  unit?: string;
  valueFormatter?: (v: number | string | undefined, name?: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-popover p-2 text-xs shadow-md">
      {label !== undefined && label !== '' && (
        <div className="mb-1 font-semibold text-foreground">{label}</div>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          {p.color && <span className="h-2 w-2 rounded-[2px]" style={{ background: p.color }} />}
          <span className="capitalize">{p.name ?? p.dataKey}</span>
          <span className="ml-auto font-semibold tabular-nums text-foreground">
            {valueFormatter ? valueFormatter(p.value, p.name) : p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Empty state — never a blank/broken axis ──
export function EmptyChart({
  hint = 'No data for this period',
  icon: Icon = Inbox,
}: {
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <Icon className="h-7 w-7 opacity-40" />
      <p className="text-xs">{hint}</p>
    </div>
  );
}

// ── Fixed-height chart shell ──
export function ChartCard({
  title,
  action,
  children,
  isEmpty = false,
  emptyHint = 'No data for this period',
  emptyIcon,
  height = 'h-[300px]',
  className,
  contentClassName,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyHint?: string;
  emptyIcon?: LucideIcon;
  height?: string;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-semibold normal-case tracking-normal">{title}</CardTitle>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn(height, 'p-4 pt-2', contentClassName)}>
        {isEmpty ? <EmptyChart hint={emptyHint} icon={emptyIcon} /> : children}
      </CardContent>
    </Card>
  );
}

// ── KPI card with delta vs previous period ──
export function KpiCard({
  label,
  value,
  previous,
  invertDelta = false,
  format = (n: number) => n.toLocaleString(),
  icon: Icon,
}: {
  label: string;
  value: number;
  previous?: number;
  /** when true, an increase is "bad" (red) — e.g. SLA breaches */
  invertDelta?: boolean;
  format?: (n: number) => string;
  icon?: LucideIcon;
}) {
  const hasPrev = previous !== undefined && previous !== null;
  const diff = hasPrev ? value - (previous as number) : 0;
  const pct = hasPrev && (previous as number) !== 0
    ? Math.round((diff / Math.abs(previous as number)) * 100)
    : null;
  const up = diff > 0;
  const flat = diff === 0;
  // good = green direction
  const good = flat ? false : invertDelta ? !up : up;
  const DeltaIcon = flat ? Minus : up ? ArrowUp : ArrowDown;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{format(value)}</p>
      {hasPrev && (
        <div className="mt-1 flex items-center gap-1 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold',
              flat ? 'text-muted-foreground' : good ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            <DeltaIcon className="h-3 w-3" />
            {pct === null ? Math.abs(diff) : `${Math.abs(pct)}%`}
          </span>
          <span className="text-muted-foreground">vs previous</span>
        </div>
      )}
    </Card>
  );
}
