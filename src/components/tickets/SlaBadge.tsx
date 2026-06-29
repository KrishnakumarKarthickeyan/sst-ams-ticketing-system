'use client';

import React, { useEffect, useState } from 'react';
import { Ticket } from '../../types/ticket';
import { ShieldCheck, ShieldAlert, ShieldX, Check, Clock } from 'lucide-react';
import { useTickets } from '../../context/TicketContext';
import { computeSla, getTargetHours, formatBusinessDuration } from '../../lib/sla/slaEngine';

interface SlaBadgeProps {
  ticket: Ticket;
}

/**
 * Card/detail SLA chip. Single source of truth: the SLA engine (IST business hours,
 * per-client priority targets, starts on lead assignment). Shows live business-hours
 * remaining and engine status, and never recomputes SLA from wall-clock slaDueAt.
 */
export const SlaBadge: React.FC<SlaBadgeProps> = ({ ticket }) => {
  const { getClientTargets } = useTickets();
  const [, setTick] = useState(0);

  // Re-render every minute so the remaining business time stays live.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const isIncident = (ticket.ticketType === 'Incident' || !ticket.ticketType) && ticket.slaDueAt !== 'SLA Not Applicable';
  if (!isIncident) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-subtle border border-line text-ink-secondary text-[11px] font-bold">
        <ShieldCheck size={11} className="text-ink-muted" /> SLA N/A
      </span>
    );
  }

  const target = getTargetHours(ticket.priority, getClientTargets(ticket.organizationId));
  const sla = computeSla(
    { leadAssignedAt: ticket.leadAssignedAt, status: ticket.status, resolvedAt: ticket.resolvedAt, closedAt: ticket.closedAt },
    target,
    new Date(),
  );

  switch (sla.status) {
    case 'Met':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-success-soft border border-success-border text-success-strong text-[11px] font-bold">
          <Check size={11} className="text-success" /> SLA Met
        </span>
      );
    case 'Breached':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-critical-soft border border-critical-border text-critical-strong text-[11px] font-bold animate-pulse">
          <ShieldX size={11} className="text-critical" /> SLA Breached
        </span>
      );
    case 'At Risk':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-warning-soft border border-warning-border text-warning-strong text-[11px] font-bold">
          <ShieldAlert size={11} className="text-warning" /> {formatBusinessDuration(sla.remainingHours)} left
        </span>
      );
    case 'Not Started':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-subtle border border-line text-ink-secondary text-[11px] font-bold">
          <Clock size={11} className="text-ink-muted" /> Not started
        </span>
      );
    case 'On Track':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-subtle border border-line text-ink text-[11px] font-bold">
          <ShieldCheck size={11} className="text-ink-secondary" /> {formatBusinessDuration(sla.remainingHours)} left
        </span>
      );
  }
};
