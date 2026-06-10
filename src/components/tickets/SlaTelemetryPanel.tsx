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
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 uppercase font-mono text-[9px] font-bold py-0.5 px-2">
            SLA Met
          </Badge>
        );
      case 'BREACHED':
        return (
          <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200 uppercase font-mono text-[9px] font-bold py-0.5 px-2 animate-pulse">
            Breached
          </Badge>
        );
      case 'WARNING':
        return (
          <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 uppercase font-mono text-[9px] font-bold py-0.5 px-2">
            Warning
          </Badge>
        );
      case 'COMPLIANT':
        return (
          <Badge className="bg-zinc-100 text-zinc-800 hover:bg-zinc-100 border border-zinc-200 uppercase font-mono text-[9px] font-bold py-0.5 px-2">
            Compliant
          </Badge>
        );
    }
  };

  const getProgressColor = () => {
    if (slaMetrics.status === 'BREACHED') return 'bg-red-500';
    if (slaMetrics.status === 'WARNING' || consumedPercentage > 80) return 'bg-amber-500';
    return 'bg-indigo-600';
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
    <Card className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-zinc-150 pb-2">
        <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-955 flex items-center gap-1.5 font-mono">
          <Clock size={14} className="text-zinc-500" /> SLA SLA Governance
        </h3>
        {statusBadge()}
      </div>

      <div className="space-y-3.5 text-zinc-700 font-mono text-xs">
        {/* Due Date & Remaining Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-50 p-2.5 rounded border border-zinc-100 space-y-1">
            <span className="text-[9px] text-zinc-400 uppercase font-bold block flex items-center gap-1">
              <Calendar size={10} /> SLA Target Due
            </span>
            <span className="font-bold text-zinc-900 text-[10px] block leading-tight">
              {formattedDueDate}
            </span>
          </div>

          <div className="bg-zinc-50 p-2.5 rounded border border-zinc-100 space-y-1">
            <span className="text-[9px] text-zinc-450 uppercase font-bold block flex items-center gap-1">
              <Activity size={10} /> Time Remaining
            </span>
            <span className={`font-black text-[10px] block leading-tight ${
              slaMetrics.status === 'BREACHED' ? 'text-red-650' : 
              slaMetrics.status === 'WARNING' ? 'text-amber-700 animate-pulse' : 
              'text-zinc-900'
            }`}>
              {slaMetrics.timeLeft}
            </span>
          </div>
        </div>

        {/* SLA Hours Progress Gauge */}
        {targetHours !== null && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-450">SLA Capacity (Consumed / Target)</span>
              <span className="font-bold text-zinc-900">
                {consumedHours.toFixed(1)}h / {targetHours}h ({Math.round(consumedPercentage)}%)
              </span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden border border-zinc-200/50">
              <div 
                className={`h-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${consumedPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Numerical Grid */}
        <div className="divide-y divide-zinc-100 text-[10px]">
          <div className="flex justify-between py-1.5">
            <span className="text-zinc-500">Urgency Priority:</span>
            <span className="font-bold text-zinc-900 uppercase">{ticket.priority}</span>
          </div>
          {targetHours !== null && (
            <>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-500">SLA Target Hours:</span>
                <span className="font-bold text-zinc-900">{targetHours} Hours</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-500">Remaining SLA Hours:</span>
                <span className={`font-bold ${remainingHours && remainingHours < 2 ? 'text-red-600' : 'text-zinc-900'}`}>
                  {remainingHours !== null ? `${remainingHours.toFixed(1)} Hours` : 'N/A'}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between py-1.5">
            <span className="text-zinc-500">Escalation path level:</span>
            <span className={`font-bold flex items-center gap-1 ${escalationLevel > 0 ? 'text-red-600 animate-pulse' : 'text-zinc-900'}`}>
              {escalationLevel > 0 ? (
                <>
                  <ShieldAlert size={11} /> Level {escalationLevel}
                </>
              ) : (
                <>
                  <ShieldCheck size={11} className="text-zinc-400" /> Level 0 (Nominal)
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
