import React from 'react';
import { cn } from '../../lib/utils';

export type PillTone = 'neutral' | 'brand' | 'success' | 'warning' | 'critical' | 'info';

const TONE_CLASSES: Record<PillTone, string> = {
  neutral: 'bg-surface-subtle text-ink-secondary border-line',
  brand: 'bg-brand-soft text-brand-strong border-brand-border',
  success: 'bg-success-soft text-success-strong border-success-border',
  warning: 'bg-warning-soft text-warning-strong border-warning-border',
  critical: 'bg-critical-soft text-critical-strong border-critical-border',
  info: 'bg-info-soft text-info-strong border-info-border',
};

const DOT_CLASSES: Record<PillTone, string> = {
  neutral: 'bg-ink-muted',
  brand: 'bg-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-critical',
  info: 'bg-info',
};

/**
 * Canonical status/priority pill. Tone carries the meaning — pages never
 * hand-pick badge colors.
 */
export function StatusPill({
  tone = 'neutral',
  children,
  dot = false,
  pulse = false,
  className,
}: {
  tone?: PillTone;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'type-status inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 whitespace-nowrap',
        TONE_CLASSES[tone],
        className
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_CLASSES[tone], pulse && 'animate-pulse')} />
      )}
      {children}
    </span>
  );
}

/* ── Domain mappings: ticket status / priority / SLA → tone ─────────────── */

const STATUS_TONES: Record<string, PillTone> = {
  'New': 'neutral',
  'Assigned': 'brand',
  'Requirement Gathering': 'neutral',
  'Waiting for Hours Approval': 'warning',
  'In Progress': 'brand',
  'In Progress - Technical': 'brand',
  'In Progress - Functional': 'info',
  'Raised to SAP': 'warning',
  'Customer Action': 'warning',
  'Waiting for Customer': 'warning',
  'Waiting for Internal Team': 'neutral',
  'On Hold': 'neutral',
  'Request for Closure': 'success',
  'Awaiting Manager Approval': 'info',
  'Awaiting Closure': 'info',
  'Awaiting Functional Submission': 'info',
  'Awaiting Technical Submission': 'brand',
  'Resolved': 'success',
  'Closed': 'neutral',
  'Reopened': 'critical',
  'Escalated': 'critical',
};

export function statusTone(status: string): PillTone {
  return STATUS_TONES[status] ?? 'neutral';
}

export function priorityTone(priority: string): PillTone {
  switch (priority) {
    case 'Critical': return 'critical';
    case 'High': return 'warning';
    case 'Medium': return 'brand';
    default: return 'neutral';
  }
}

export function slaTone(state: 'healthy' | 'warning' | 'breached' | 'na'): PillTone {
  if (state === 'breached') return 'critical';
  if (state === 'warning') return 'warning';
  if (state === 'healthy') return 'success';
  return 'neutral';
}
