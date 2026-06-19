'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Pause, ShieldCheck, ShieldAlert, ShieldX, CalendarOff } from 'lucide-react';
import type { Ticket } from '../../types/ticket';
import {
  computeSla, getTargetHours, isBusinessOpenNow, isBusinessDay,
  formatBusinessDuration, formatIstDateTime,
  type ClientSlaTargets, type SlaStatus,
} from '../../lib/sla/slaEngine';
import { cn } from '../../lib/utils';

interface SlaTimerProps {
  ticket: Pick<Ticket, 'priority' | 'status' | 'leadAssignedAt' | 'resolvedAt' | 'closedAt'>;
  clientTargets: ClientSlaTargets;
  /** compact = card chip, full = header banner. */
  size?: 'compact' | 'full';
  className?: string;
}

const STATUS_STYLE: Record<SlaStatus, string> = {
  'Not Started': 'bg-surface-muted border-line text-ink-secondary',
  'On Track': 'bg-emerald-50 border-emerald-200 text-emerald-700',
  'At Risk': 'bg-amber-50 border-amber-200 text-amber-800',
  'Breached': 'bg-red-50 border-red-200 text-red-700',
  'Met': 'bg-emerald-50 border-emerald-200 text-emerald-700',
};

const STATUS_ICON: Record<SlaStatus, React.ComponentType<{ size?: number; className?: string }>> = {
  'Not Started': Clock,
  'On Track': ShieldCheck,
  'At Risk': ShieldAlert,
  'Breached': ShieldX,
  'Met': ShieldCheck,
};

/**
 * Live SLA timer driven entirely by the IST business-hours engine. Recomputes
 * every minute. When the IST business clock is closed (before 10:30, after 19:30,
 * or Fri/Sat) it shows a Paused state and the remaining time does NOT tick down.
 * All times are rendered in IST.
 */
export function SlaTimer({ ticket, clientTargets, size = 'compact', className }: SlaTimerProps) {
  // Re-render every minute so the countdown stays live.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { sla, target, open, weekend } = useMemo(() => {
    const now = new Date(nowMs);
    const target = getTargetHours(ticket.priority, clientTargets);
    const sla = computeSla(
      {
        leadAssignedAt: ticket.leadAssignedAt,
        status: ticket.status,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
      },
      target,
      now,
    );
    return { sla, target, open: isBusinessOpenNow(now), weekend: !isBusinessDay(now) };
  }, [nowMs, ticket.leadAssignedAt, ticket.status, ticket.priority, ticket.resolvedAt, ticket.closedAt, clientTargets]);

  const Icon = STATUS_ICON[sla.status];
  const full = size === 'full';
  const base = cn(
    'inline-flex items-center gap-1.5 rounded border font-bold uppercase tracking-wider',
    full ? 'px-3 py-1.5 text-xs' : 'px-2 py-0.5 text-[11px]',
    STATUS_STYLE[sla.status],
    className,
  );

  // ── Not started: awaiting lead assignment ──
  if (sla.status === 'Not Started') {
    return (
      <span className={base} title={`SLA target: ${target}h business time — starts when a lead consultant is assigned`}>
        <Clock size={full ? 13 : 11} />
        {full ? `SLA not started — awaiting assignment · Target: ${target}h` : `Not started · ${target}h`}
      </span>
    );
  }

  // ── Met / Breached on a closed ticket: frozen ──
  if (sla.status === 'Met' || (sla.status === 'Breached' && (ticket.status === 'Closed' || ticket.status === 'Resolved'))) {
    return (
      <span className={base} title={`Due ${formatIstDateTime(sla.dueAt)}`}>
        <Icon size={full ? 13 : 11} />
        {sla.status === 'Met' ? 'SLA Met' : 'SLA Breached'}
        {full && sla.dueAt ? ` · Due ${formatIstDateTime(sla.dueAt)}` : ''}
      </span>
    );
  }

  // ── Breached (still open) ──
  if (sla.status === 'Breached') {
    return (
      <span className={cn(base, 'animate-pulse')} title={`Was due ${formatIstDateTime(sla.dueAt)}`}>
        <ShieldX size={full ? 13 : 11} />
        SLA Breached
        {full && sla.dueAt ? ` · was due ${formatIstDateTime(sla.dueAt)}` : ''}
      </span>
    );
  }

  // ── Running (On Track / At Risk) — possibly paused outside business hours ──
  const remaining = formatBusinessDuration(sla.remainingHours);
  const dueLabel = formatIstDateTime(sla.dueAt);

  if (!open) {
    const pausedMsg = weekend ? 'Paused — weekend' : 'Paused — outside business hours (10:30–19:30 IST)';
    return (
      <span
        className={cn(base, 'opacity-90')}
        title={`${remaining} of business time left · Due ${dueLabel}`}
      >
        {weekend ? <CalendarOff size={full ? 13 : 11} /> : <Pause size={full ? 13 : 11} />}
        {full ? `${pausedMsg} · ${remaining} left · Due ${dueLabel}` : `${weekend ? 'Paused (wknd)' : 'Paused'} · ${remaining}`}
      </span>
    );
  }

  return (
    <span className={base} title={`${remaining} of business time left · Due ${dueLabel}`}>
      <Icon size={full ? 13 : 11} />
      {full ? `${sla.status} · ${remaining} left · Due ${dueLabel}` : `${remaining} left`}
    </span>
  );
}

export default SlaTimer;
