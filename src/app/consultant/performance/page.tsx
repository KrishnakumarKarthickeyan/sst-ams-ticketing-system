'use client';

import React from 'react';
import { useTickets } from '../../../context/TicketContext';
import { FileSpreadsheet, TrendingUp, CheckSquare, HeartHandshake } from 'lucide-react';

export default function ConsultantPerformancePage() {
  const { tickets } = useTickets();
  const consultantName = 'Karthik Subramanian';

  const myTickets = tickets.filter(t => t.assignedConsultant === consultantName);
  const resolvedTickets = myTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
  const activeTickets = myTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');

  // CSAT calculation
  const rated = resolvedTickets.filter(t => t.rating);
  const avgCsat = rated.length > 0
    ? (rated.reduce((sum, t) => sum + (t.rating?.score || 0), 0) / rated.length).toFixed(1)
    : '5.0';

  // Calculate billable percentage
  const totalLogs = myTickets.reduce((acc, t) => {
    return acc + t.efforts.filter(e => e.consultantName === consultantName).length;
  }, 0);

  const billableLogs = myTickets.reduce((acc, t) => {
    return acc + t.efforts.filter(e => e.consultantName === consultantName && e.billable).length;
  }, 0);

  const billablePct = totalLogs > 0 ? ((billableLogs / totalLogs) * 100).toFixed(0) : '100';

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">My Performance analytics</h1>
        <p className="text-zinc-500 mt-1">Review resolution counts, billable ratios, and customer satisfaction rating index.</p>
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-200 rounded p-5 space-y-4 hover:border-zinc-950 transition flex flex-col justify-between">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">Resolution rate</span>
            <CheckSquare size={16} />
          </div>
          <div>
            <span className="text-2xl font-black font-mono block text-zinc-950">
              {resolvedTickets.length} / {myTickets.length}
            </span>
            <span className="text-[9px] text-zinc-400 block mt-1 uppercase">Tickets resolved</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded p-5 space-y-4 hover:border-zinc-950 transition flex flex-col justify-between">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">CSAT Score Index</span>
            <HeartHandshake size={16} />
          </div>
          <div>
            <span className="text-2xl font-black font-mono block text-zinc-950">
              {avgCsat} / 5
            </span>
            <span className="text-[9px] text-zinc-400 block mt-1 uppercase">Avg score rating</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded p-5 space-y-4 hover:border-zinc-950 transition flex flex-col justify-between">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">Billable Ratio</span>
            <TrendingUp size={16} />
          </div>
          <div>
            <span className="text-2xl font-black font-mono block text-zinc-950">
              {billablePct}%
            </span>
            <span className="text-[9px] text-zinc-400 block mt-1 uppercase">Billable effort</span>
          </div>
        </div>
      </div>
    </div>
  );
}
