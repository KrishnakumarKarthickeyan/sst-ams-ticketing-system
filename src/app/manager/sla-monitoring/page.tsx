'use client';

import React, { useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import Link from 'next/link';
import { Clock, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';

export default function ManagerSlaMonitoringPage() {
  const { tickets } = useTickets();

  // Active tickets sorted by SLA urgency
  const activeTickets = useMemo(() => {
    return tickets
      .filter(t => t.status !== 'Resolved' && t.status !== 'Closed')
      .sort((a, b) => new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime());
  }, [tickets]);

  // SLA Summary Metrics
  const slaMetrics = useMemo(() => {
    const now = Date.now();
    let breached = 0;
    let warning = 0; // Less than 24 hours remaining
    let healthy = 0;

    activeTickets.forEach(t => {
      const diff = new Date(t.slaDueAt).getTime() - now;
      if (diff < 0) {
        breached++;
      } else if (diff < 24 * 60 * 60 * 1000) {
        warning++;
      } else {
        healthy++;
      }
    });

    return {
      total: activeTickets.length,
      breached,
      warning,
      healthy
    };
  }, [activeTickets]);

  // Helper: Live SLA status resolver
  const getSlaDetails = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diff = due.getTime() - now.getTime();

    if (diff < 0) {
      return {
        label: 'BREACHED',
        style: 'bg-red-50 text-red-750 border-red-200 animate-pulse font-black',
        textStyle: 'text-red-750 font-bold'
      };
    }

    const hoursRemaining = diff / (1000 * 60 * 60);
    if (hoursRemaining < 24) {
      return {
        label: `${Math.round(hoursRemaining)}h remaining`,
        style: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
        textStyle: 'text-amber-700 font-semibold'
      };
    }

    const daysRemaining = hoursRemaining / 24;
    return {
      label: `${Math.round(daysRemaining)}d remaining`,
      style: 'bg-zinc-100 text-zinc-650 border-zinc-200 font-semibold',
      textStyle: 'text-zinc-600 font-normal'
    };
  };

  return (
    <div className="space-y-6 font-mono text-xs text-[#09090b]">
      
      {/* Title */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950 tracking-wider">Real-Time SLA Monitor</h1>
        <p className="text-zinc-500 mt-1">Live incident countdown registry tracking response and resolution windows across active contracts.</p>
      </div>

      {/* SLA Health KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Active Incidents */}
        <Card className="border border-zinc-200 shadow-sm p-4 space-y-1">
          <span className="text-[9px] uppercase font-bold text-zinc-550">Under SLA Monitoring</span>
          <div className="text-xl font-bold flex items-center justify-between">
            <span>{slaMetrics.total}</span>
            <Clock size={14} className="text-zinc-400" />
          </div>
        </Card>

        {/* SLA Breaches */}
        <Card className="border border-zinc-200 shadow-sm p-4 space-y-1">
          <span className="text-[9px] uppercase font-bold text-zinc-550">SLA Breach Overdue</span>
          <div className="text-xl font-bold flex items-center justify-between">
            <span className={slaMetrics.breached > 0 ? 'text-red-650' : 'text-zinc-900'}>{slaMetrics.breached}</span>
            <ShieldAlert size={14} className={slaMetrics.breached > 0 ? 'text-red-500' : 'text-zinc-400'} />
          </div>
        </Card>

        {/* SLA Warning */}
        <Card className="border border-zinc-200 shadow-sm p-4 space-y-1">
          <span className="text-[9px] uppercase font-bold text-zinc-550">Approaching Breach (&lt;24h)</span>
          <div className="text-xl font-bold flex items-center justify-between">
            <span className={slaMetrics.warning > 0 ? 'text-amber-600' : 'text-zinc-900'}>{slaMetrics.warning}</span>
            <AlertTriangle size={14} className={slaMetrics.warning > 0 ? 'text-amber-500' : 'text-zinc-400'} />
          </div>
        </Card>

        {/* SLA Healthy */}
        <Card className="border border-zinc-200 shadow-sm p-4 space-y-1">
          <span className="text-[9px] uppercase font-bold text-zinc-550">Healthy Response State</span>
          <div className="text-xl font-bold flex items-center justify-between">
            <span className={slaMetrics.healthy > 0 ? 'text-emerald-700' : 'text-zinc-900'}>{slaMetrics.healthy}</span>
            <CheckCircle size={14} className={slaMetrics.healthy > 0 ? 'text-emerald-650' : 'text-zinc-400'} />
          </div>
        </Card>

      </div>

      {/* SLA Countdown Ledger Table */}
      <Card className="border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[9px] tracking-wider text-zinc-550">
                <th className="py-3 px-4">Ticket Number</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">SAP Module</th>
                <th className="py-3 px-4">Customer Account</th>
                <th className="py-3 px-4">Lead Consultant</th>
                <th className="py-3 px-4">Deadline Time</th>
                <th className="py-3 px-4 text-right">SLA Countdown Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 text-[11px]">
              {activeTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 italic font-mono uppercase">
                    All active tickets fully comply with SLA resolution rules
                  </td>
                </tr>
              ) : (
                activeTickets.map((t) => {
                  const sla = getSlaDetails(t.slaDueAt);
                  return (
                    <tr key={t.id} className="hover:bg-zinc-50/40 transition">
                      
                      {/* Ticket ID */}
                      <td className="py-3 px-4 font-bold text-zinc-900 font-mono">
                        <Link href={`/tickets/${t.id}`} className="hover:underline">{t.ticketNumber}</Link>
                      </td>

                      {/* Ticket Title */}
                      <td className="py-3 px-4 font-bold text-zinc-800 max-w-[240px] truncate" title={t.title}>
                        {t.title}
                      </td>

                      {/* SAP Module */}
                      <td className="py-3 px-4">
                        <Badge className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100 font-bold border-none text-[8px] py-0.5 px-1.5 uppercase">
                          {t.sapModule}
                        </Badge>
                      </td>

                      {/* Customer Account */}
                      <td className="py-3 px-4 font-semibold text-zinc-650">{t.organization}</td>

                      {/* Assigned Consultant */}
                      <td className="py-3 px-4 font-semibold text-zinc-600">
                        {t.assignedConsultant || <span className="text-zinc-400 font-normal italic">Unassigned</span>}
                      </td>

                      {/* SLA Deadline Time */}
                      <td className="py-3 px-4 text-zinc-500 font-mono">
                        {new Date(t.slaDueAt).toLocaleString()}
                      </td>

                      {/* SLA Countdown Status */}
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded border text-[9px] uppercase ${sla.style}`}>
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
