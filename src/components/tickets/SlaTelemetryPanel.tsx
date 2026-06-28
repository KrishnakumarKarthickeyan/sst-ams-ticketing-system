'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Ticket } from '../../types/ticket';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Clock, ShieldAlert, ShieldCheck, AlertTriangle, Calendar, Activity } from 'lucide-react';

interface SlaTelemetryPanelProps {
  ticket: Ticket;
}

export const SlaTelemetryPanel: React.FC<SlaTelemetryPanelProps> = ({ ticket }) => {
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [slaStatus, setSlaStatus] = useState<'MET' | 'BREACHED' | 'WARNING' | 'COMPLIANT'>('COMPLIANT');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Calculate SLA Status and Calendar Time Left
  const slaMetrics = useMemo(() => {
    if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
      return { status: 'MET' as const, timeLeft: 'SLA Met' };
    }

    if (!ticket.slaDueAt || ticket.slaDueAt === 'SLA Not Applicable') {
      return { status: 'COMPLIANT' as const, timeLeft: 'N/A' };
    }

    const due = new Date(ticket.slaDueAt).getTime();
    const diffMs = due - now.getTime();

    if (diffMs <= 0) {
      return { status: 'BREACHED' as const, timeLeft: 'SLA Breached' };
    }

    const diffHrs = diffMs / (1000 * 60 * 60);
    const hrs = Math.floor(diffHrs);
    const mins = Math.floor((diffHrs - hrs) * 60);

    if (diffHrs < 2) {
      return { status: 'WARNING' as const, timeLeft: `${hrs}h ${mins}m left` };
    }

    return { status: 'COMPLIANT' as const, timeLeft: `${hrs}h left` };
  }, [ticket.slaDueAt, ticket.status, now]);

  // SLA Target Hours calculation
  const targetHours = useMemo(() => {
    if (!ticket.slaDueAt || ticket.slaDueAt === 'SLA Not Applicable') return null;
    const created = new Date(ticket.createdAt).getTime();
    const due = new Date(ticket.slaDueAt).getTime();
    const diffHrs = (due - created) / (1000 * 60 * 60);
    return Math.max(1, Math.round(diffHrs));
  }, [ticket.createdAt, ticket.slaDueAt]);

  // Consumed Hours calculation (only approved actual hours)
  const consumedHours = useMemo(() => {
    const approvedLogs = (ticket.actualHoursLogs || []).filter(
      log => log.approvalStatus === 'Approved' || log.approvalStatus?.toLowerCase() === 'approved'
    );
    return approvedLogs.reduce((sum, log) => sum + log.actualHours, 0);
  }, [ticket.actualHoursLogs]);

  // Remaining Hours calculation
  const remainingHours = useMemo(() => {
    if (targetHours === null) return null;
    return Math.max(0, targetHours - consumedHours);
  }, [targetHours, consumedHours]);

  // Consumed Percentage
  const consumedPercentage = useMemo(() => {
    if (!targetHours) return 0;
    return Math.min(100, Math.max(0, (consumedHours / targetHours) * 100));
  }, [targetHours, consumedHours]);

  const escalationLevel = useMemo(() => {
    if (ticket.escalations && ticket.escalations.length > 0) {
      return ticket.escalations.length;
    }
    return ticket.escalationFlag ? 1 : 0;
  }, [ticket.escalations, ticket.escalationFlag]);

  const statusBadge = () => {
    switch (slaMetrics.status) {
      case 'MET':
        return (
          <Badge className="bg-success-soft text-success-strong hover:bg-success-soft border border-success-border uppercase text-[11px] font-bold py-0.5 px-2">
            SLA Met
          </Badge>
        );
      case 'BREACHED':
        return (
          <Badge className="bg-critical-soft text-critical-strong hover:bg-critical-soft border border-critical-border uppercase text-[11px] font-bold py-0.5 px-2 animate-pulse">
            Breached
          </Badge>
        );
      case 'WARNING':
        return (
          <Badge className="bg-warning-soft text-warning-strong hover:bg-warning-soft border border-warning-border uppercase text-[11px] font-bold py-0.5 px-2">
            Warning
          </Badge>
        );
      case 'COMPLIANT':
        return (
          <Badge className="bg-surface-subtle text-ink hover:bg-surface-subtle border border-line uppercase text-[11px] font-bold py-0.5 px-2">
            Compliant
          </Badge>
        );
    }
  };

  const getProgressColor = () => {
    if (slaMetrics.status === 'BREACHED') return 'bg-critical';
    if (slaMetrics.status === 'WARNING' || consumedPercentage > 80) return 'bg-warning';
    return 'bg-info';
  };

  const formattedDueDate = useMemo(() => {
    if (!ticket.slaDueAt || ticket.slaDueAt === 'SLA Not Applicable') return 'N/A';
    return new Date(ticket.slaDueAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }, [ticket.slaDueAt]);

  return (
    <Card className="bg-surface border border-line rounded-lg p-5 shadow-card space-y-4">
      <div className="flex justify-between items-center border-b border-line pb-2">
        <h3 className="font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
          <Clock size={14} className="text-ink-secondary" /> SLA Governance
        </h3>
        {statusBadge()}
      </div>

      <div className="space-y-3.5 text-ink-secondary text-xs">
        {/* Due Date & Remaining Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-muted p-2.5 rounded border border-line space-y-1">
            <span className="text-[11px] text-ink-muted uppercase font-bold block flex items-center gap-1">
              <Calendar size={10} /> SLA Target Due
            </span>
            <span className="font-bold text-ink text-[11px] block leading-tight">
              {formattedDueDate}
            </span>
          </div>

          <div className="bg-surface-muted p-2.5 rounded border border-line space-y-1">
            <span className="text-[11px] text-ink-muted uppercase font-bold block flex items-center gap-1">
              <Activity size={10} /> Time Remaining
            </span>
            <span className={`font-black text-[11px] block leading-tight ${
              slaMetrics.status === 'BREACHED' ? 'text-critical' : 
              slaMetrics.status === 'WARNING' ? 'text-warning-strong animate-pulse' : 
              'text-ink'
            }`}>
              {slaMetrics.timeLeft}
            </span>
          </div>
        </div>

        {/* SLA Hours Progress Gauge */}
        {targetHours !== null && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-ink-muted">SLA Capacity (Consumed / Target)</span>
              <span className="font-bold text-ink">
                {consumedHours.toFixed(1)}h / {targetHours}h ({Math.round(consumedPercentage)}%)
              </span>
            </div>
            <div className="w-full bg-surface-subtle rounded-full h-2 overflow-hidden border border-line/50">
              <div 
                className={`h-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${consumedPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Numerical Grid */}
        <div className="divide-y divide-line text-[11px]">
          <div className="flex justify-between py-1.5">
            <span className="text-ink-secondary">Urgency Priority:</span>
            <span className="font-bold text-ink uppercase">{ticket.priority}</span>
          </div>
          {targetHours !== null && (
            <>
              <div className="flex justify-between py-1.5">
                <span className="text-ink-secondary">SLA Target Hours:</span>
                <span className="font-bold text-ink">{targetHours} Hours</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-ink-secondary">Remaining SLA Hours:</span>
                <span className={`font-bold ${remainingHours && remainingHours < 2 ? 'text-critical' : 'text-ink'}`}>
                  {remainingHours !== null ? `${remainingHours.toFixed(1)} Hours` : 'N/A'}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between py-1.5">
            <span className="text-ink-secondary">Escalation path level:</span>
            <span className={`font-bold flex items-center gap-1 ${escalationLevel > 0 ? 'text-critical animate-pulse' : 'text-ink'}`}>
              {escalationLevel > 0 ? (
                <>
                  <ShieldAlert size={11} /> Level {escalationLevel}
                </>
              ) : (
                <>
                  <ShieldCheck size={11} className="text-ink-muted" /> Level 0 (Nominal)
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
