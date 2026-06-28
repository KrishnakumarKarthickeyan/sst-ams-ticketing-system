'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Ticket } from '../../types/ticket';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useTickets } from '../../context/TicketContext';
import {
  computeSla, getTargetHours, formatIstDateTime, type SlaStatus,
} from '../../lib/sla/slaEngine';
import { Clock, ShieldAlert, ShieldCheck, Calendar, Activity, Info } from 'lucide-react';

interface SlaTelemetryPanelProps {
  ticket: Ticket;
}

/** Business-hours remaining → "12.5h left" / "45m left" / "0m left". */
function formatRemaining(hours: number): string {
  if (hours >= 1) return `${hours.toFixed(1)}h left`;
  return `${Math.round(hours * 60)}m left`;
}

export const SlaTelemetryPanel: React.FC<SlaTelemetryPanelProps> = ({ ticket }) => {
  const { getClientTargets } = useTickets();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000); // re-tick every minute
    return () => clearInterval(interval);
  }, []);

  // SLA applies ONLY to Incident tickets. Service Request / Change / Problem / etc.
  // have no time-bound SLA — show a clear "not applicable" state for every role.
  const isIncident = ticket.ticketType === 'Incident';

  // Single source of truth: the IST business-hours engine, against the client's
  // per-priority target. Target Hours, Due, Time Remaining and Remaining SLA Hours
  // all derive from this one computation so they can never disagree.
  const sla = useMemo(() => {
    const targets = getClientTargets(ticket.organizationId);
    const targetHours = getTargetHours(ticket.priority, targets);
    return computeSla(
      {
        leadAssignedAt: ticket.leadAssignedAt,
        status: ticket.status,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
      },
      targetHours,
      now,
    );
  }, [getClientTargets, ticket.organizationId, ticket.priority, ticket.leadAssignedAt, ticket.status, ticket.resolvedAt, ticket.closedAt, now]);

  const escalationLevel = useMemo(() => {
    if (ticket.escalations && ticket.escalations.length > 0) return ticket.escalations.length;
    return ticket.escalationFlag ? 1 : 0;
  }, [ticket.escalations, ticket.escalationFlag]);

  // ── Non-Incident: SLA not applicable ──────────────────────────────────────
  if (!isIncident) {
    return (
      <Card className="bg-surface border border-line rounded-lg p-5 shadow-card space-y-4">
        <div className="flex justify-between items-center border-b border-line pb-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
            <Clock size={14} className="text-ink-secondary" /> SLA Governance
          </h3>
          <Badge className="bg-surface-subtle text-ink hover:bg-surface-subtle border border-line uppercase text-[11px] font-bold py-0.5 px-2">
            N/A
          </Badge>
        </div>
        <div className="flex items-start gap-2 text-xs text-ink-secondary bg-surface-muted border border-line rounded p-3">
          <Info size={14} className="text-ink-muted shrink-0 mt-0.5" />
          <span>
            SLA not applicable for this ticket type
            {ticket.ticketType ? ` (${ticket.ticketType})` : ''}. Time-bound SLA targets apply to <span className="font-bold text-ink">Incident</span> tickets only.
          </span>
        </div>
      </Card>
    );
  }

  // ── Incident: live engine telemetry ───────────────────────────────────────
  const badgeFor = (s: SlaStatus) => {
    switch (s) {
      case 'Met':
        return <Badge className="bg-success-soft text-success-strong hover:bg-success-soft border border-success-border uppercase text-[11px] font-bold py-0.5 px-2">SLA Met</Badge>;
      case 'Breached':
        return <Badge className="bg-critical-soft text-critical-strong hover:bg-critical-soft border border-critical-border uppercase text-[11px] font-bold py-0.5 px-2 animate-pulse">Breached</Badge>;
      case 'At Risk':
        return <Badge className="bg-warning-soft text-warning-strong hover:bg-warning-soft border border-warning-border uppercase text-[11px] font-bold py-0.5 px-2">At Risk</Badge>;
      case 'On Track':
        return <Badge className="bg-success-soft text-success-strong hover:bg-success-soft border border-success-border uppercase text-[11px] font-bold py-0.5 px-2">On Track</Badge>;
      case 'Not Started':
      default:
        return <Badge className="bg-surface-subtle text-ink hover:bg-surface-subtle border border-line uppercase text-[11px] font-bold py-0.5 px-2">Not Started</Badge>;
    }
  };

  const dueLabel = sla.dueAt ? formatIstDateTime(sla.dueAt) : 'Pending lead';
  const timeRemainingLabel =
    sla.status === 'Not Started' ? 'Not started'
    : sla.status === 'Breached' ? 'SLA Breached'
    : sla.status === 'Met' ? 'SLA Met'
    : formatRemaining(sla.remainingHours);
  const consumedPct = sla.targetHours > 0 ? Math.min(100, Math.max(0, (sla.elapsedHours / sla.targetHours) * 100)) : 0;
  const gaugeColor = sla.status === 'Breached' ? 'bg-critical' : (sla.status === 'At Risk' ? 'bg-warning' : 'bg-info');
  const remainingCritical = sla.status === 'Breached' || (sla.status !== 'Not Started' && sla.remainingHours < 2);

  return (
    <Card className="bg-surface border border-line rounded-lg p-5 shadow-card space-y-4">
      <div className="flex justify-between items-center border-b border-line pb-2">
        <h3 className="font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
          <Clock size={14} className="text-ink-secondary" /> SLA Governance
        </h3>
        {badgeFor(sla.status)}
      </div>

      <div className="space-y-3.5 text-ink-secondary text-xs">
        {/* Due Date & Remaining Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-muted p-2.5 rounded border border-line space-y-1">
            <span className="text-[11px] text-ink-muted uppercase font-bold block flex items-center gap-1">
              <Calendar size={10} /> SLA Target Due
            </span>
            <span className="font-bold text-ink text-[11px] block leading-tight">
              {dueLabel}
            </span>
          </div>

          <div className="bg-surface-muted p-2.5 rounded border border-line space-y-1">
            <span className="text-[11px] text-ink-muted uppercase font-bold block flex items-center gap-1">
              <Activity size={10} /> Time Remaining
            </span>
            <span className={`font-black text-[11px] block leading-tight ${
              sla.status === 'Breached' ? 'text-critical' :
              sla.status === 'At Risk' ? 'text-warning-strong animate-pulse' :
              'text-ink'
            }`}>
              {timeRemainingLabel}
            </span>
          </div>
        </div>

        {/* SLA business-hours consumed vs target (engine elapsed / target) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-ink-muted">SLA Time (Consumed / Target)</span>
            <span className="font-bold text-ink">
              {sla.elapsedHours.toFixed(1)}h / {sla.targetHours}h ({Math.round(consumedPct)}%)
            </span>
          </div>
          <div className="w-full bg-surface-subtle rounded-full h-2 overflow-hidden border border-line/50">
            <div
              className={`h-full transition-all duration-300 ${gaugeColor}`}
              style={{ width: `${consumedPct}%` }}
            />
          </div>
        </div>

        {/* Numerical Grid */}
        <div className="divide-y divide-line text-[11px]">
          <div className="flex justify-between py-1.5">
            <span className="text-ink-secondary">Urgency Priority:</span>
            <span className="font-bold text-ink uppercase">{ticket.priority}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-ink-secondary">SLA Target Hours:</span>
            <span className="font-bold text-ink">{sla.targetHours} Hours</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-ink-secondary">Remaining SLA Hours:</span>
            <span className={`font-bold ${remainingCritical ? 'text-critical' : 'text-ink'}`}>
              {sla.status === 'Not Started' ? `${sla.remainingHours.toFixed(1)} Hours (not started)` : `${sla.remainingHours.toFixed(1)} Hours`}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-ink-secondary">Escalation path level:</span>
            <span className={`font-bold flex items-center gap-1 ${escalationLevel > 0 ? 'text-critical animate-pulse' : 'text-ink'}`}>
              {escalationLevel > 0 ? (
                <><ShieldAlert size={11} /> Level {escalationLevel}</>
              ) : (
                <><ShieldCheck size={11} className="text-ink-muted" /> Level 0 (Nominal)</>
              )}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
