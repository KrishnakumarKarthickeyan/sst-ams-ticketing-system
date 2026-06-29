'use client';

import React, { useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import Link from 'next/link';
import { Clock, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { computeSla, getTargetHours, formatIstDateTime, formatBusinessDuration, type SlaComputation } from '../../../lib/sla/slaEngine';

export default function ManagerSlaMonitoringPage() {
  const { tickets, getClientTargets } = useTickets();

  // Active Incident tickets with their LIVE engine SLA — single source of truth.
  // Sorted by urgency: breached first, then soonest engine due; Not Started last.
  const activeRows = useMemo(() => {
    const now = new Date();
    return tickets
      .filter(t => t.status !== 'Resolved' && t.status !== 'Closed')
      .filter(t => (t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt !== 'SLA Not Applicable')
      .map(t => {
        const target = getTargetHours(t.priority, getClientTargets(t.organizationId));
        const sla = computeSla(
          { leadAssignedAt: t.leadAssignedAt, status: t.status, resolvedAt: t.resolvedAt, closedAt: t.closedAt },
          target,
          now,
        );
        return { t, sla };
      })
      .sort((a, b) => {
        const rank = (s: SlaComputation) => (s.status === 'Breached' ? 0 : s.status === 'Not Started' ? 2 : 1);
        const ra = rank(a.sla), rb = rank(b.sla);
        if (ra !== rb) return ra - rb;
        const da = a.sla.dueAt ? a.sla.dueAt.getTime() : Infinity;
        const db = b.sla.dueAt ? b.sla.dueAt.getTime() : Infinity;
        return da - db;
      });
  }, [tickets, getClientTargets]);

  // SLA Summary Metrics — all from engine sla_status, so they reconcile with the
  // service-desk SLA Breached tab, the dashboard KPI and the card pills.
  const slaMetrics = useMemo(() => {
    let breached = 0, warning = 0, healthy = 0;
    activeRows.forEach(({ sla }) => {
      if (sla.status === 'Breached') breached++;
      else if (sla.status === 'At Risk') warning++;
      else healthy++; // On Track / Not Started
    });
    return { total: activeRows.length, breached, warning, healthy };
  }, [activeRows]);

  // Per-row countdown label from the engine (business-hours remaining).
  const getSlaDetails = (sla: SlaComputation) => {
    if (sla.status === 'Breached') {
      return { label: 'BREACHED', style: 'bg-critical-soft text-critical-strong border-critical-border animate-pulse font-black' };
    }
    if (sla.status === 'Not Started') {
      return { label: 'NOT STARTED', style: 'bg-surface-subtle text-ink-secondary border-line font-semibold' };
    }
    if (sla.status === 'At Risk') {
      return { label: `${formatBusinessDuration(sla.remainingHours)} left`, style: 'bg-warning-soft text-warning-strong border-warning-border font-bold' };
    }
    return { label: `${formatBusinessDuration(sla.remainingHours)} left`, style: 'bg-surface-subtle text-ink-secondary border-line font-semibold' };
  };

  return (
    <div className="space-y-6 text-xs text-ink">
      
      {/* Title */}
      <div className="border-b border-line pb-4">
        <h1 className="type-title text-ink">Real-Time SLA Monitor</h1>
        <p className="text-ink-secondary mt-1">Live incident countdown registry tracking response and resolution windows across active contracts.</p>
      </div>

      {/* SLA Health KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Active Incidents */}
        <Card className="border border-line shadow-card p-4 space-y-1">
          <span className="text-[11px] uppercase font-bold text-ink-secondary">Under SLA Monitoring</span>
          <div className="text-xl font-bold flex items-center justify-between">
            <span>{slaMetrics.total}</span>
            <Clock size={14} className="text-ink-muted" />
          </div>
        </Card>

        {/* SLA Breaches */}
        <Card className="border border-line shadow-card p-4 space-y-1">
          <span className="text-[11px] uppercase font-bold text-ink-secondary">SLA Breach Overdue</span>
          <div className="text-xl font-bold flex items-center justify-between">
            <span className={slaMetrics.breached > 0 ? 'text-critical' : 'text-ink'}>{slaMetrics.breached}</span>
            <ShieldAlert size={14} className={slaMetrics.breached > 0 ? 'text-critical' : 'text-ink-muted'} />
          </div>
        </Card>

        {/* SLA Warning */}
        <Card className="border border-line shadow-card p-4 space-y-1">
          <span className="text-[11px] uppercase font-bold text-ink-secondary">Approaching Breach (&lt;24h)</span>
          <div className="text-xl font-bold flex items-center justify-between">
            <span className={slaMetrics.warning > 0 ? 'text-warning' : 'text-ink'}>{slaMetrics.warning}</span>
            <AlertTriangle size={14} className={slaMetrics.warning > 0 ? 'text-amber-500' : 'text-ink-muted'} />
          </div>
        </Card>

        {/* SLA Healthy */}
        <Card className="border border-line shadow-card p-4 space-y-1">
          <span className="text-[11px] uppercase font-bold text-ink-secondary">Healthy Response State</span>
          <div className="text-xl font-bold flex items-center justify-between">
            <span className={slaMetrics.healthy > 0 ? 'text-success-strong' : 'text-ink'}>{slaMetrics.healthy}</span>
            <CheckCircle size={14} className={slaMetrics.healthy > 0 ? 'text-emerald-650' : 'text-ink-muted'} />
          </div>
        </Card>

      </div>

      {/* SLA Countdown Ledger Table */}
      <Card className="border border-line shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted border-b border-line uppercase font-bold text-[11px] tracking-wider text-ink-secondary">
                <th className="py-3 px-4">Ticket Number</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">SAP Module</th>
                <th className="py-3 px-4">Customer Account</th>
                <th className="py-3 px-4">Lead Consultant</th>
                <th className="py-3 px-4">Deadline Time</th>
                <th className="py-3 px-4 text-right">SLA Countdown Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-[11px]">
              {activeRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted italic uppercase">
                    All active tickets fully comply with SLA resolution rules
                  </td>
                </tr>
              ) : (
                activeRows.map(({ t, sla: slaComp }) => {
                  const sla = getSlaDetails(slaComp);
                  return (
                    <tr key={t.id} className="hover:bg-surface-muted/40 transition">
                      
                      {/* Ticket ID */}
                      <td className="py-3 px-4 font-bold text-ink">
                        <Link href={`/tickets/${t.id}`} className="hover:underline">{t.ticketNumber}</Link>
                      </td>

                      {/* Ticket Title */}
                      <td className="py-3 px-4 font-bold text-ink max-w-[240px] truncate" title={t.title}>
                        {t.title}
                      </td>

                      {/* SAP Module */}
                      <td className="py-3 px-4">
                        <Badge className="bg-surface-subtle text-ink-secondary hover:bg-surface-subtle font-bold border-none text-[11px] py-0.5 px-1.5 uppercase">
                          {t.sapModule}
                        </Badge>
                      </td>

                      {/* Customer Account */}
                      <td className="py-3 px-4 font-semibold text-ink-secondary">{t.organization}</td>

                      {/* Assigned Consultant */}
                      <td className="py-3 px-4 font-semibold text-ink-secondary">
                        {t.assignedConsultant || <span className="text-ink-muted font-normal italic">Unassigned</span>}
                      </td>

                      {/* SLA Deadline Time — engine business-hours due (IST). */}
                      <td className="py-3 px-4 text-ink-secondary">
                        {slaComp.dueAt ? formatIstDateTime(slaComp.dueAt) : 'Pending lead'}
                      </td>

                      {/* SLA Countdown Status */}
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded border text-[11px] uppercase ${sla.style}`}>
                          {sla.label}
                        </span>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
