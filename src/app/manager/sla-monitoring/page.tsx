'use client';

import React from 'react';
import { useTickets } from '../../../context/TicketContext';
import { SlaBadge } from '../../../components/tickets/SlaBadge';
import Link from 'next/link';
import { Clock, Layers, ShieldCheck } from 'lucide-react';

export default function ManagerSlaMonitoringPage() {
  const { tickets } = useTickets();

  // Active tickets sorted by SLA urgency
  const activeTickets = tickets
    .filter(t => t.status !== 'Resolved' && t.status !== 'Closed')
    .sort((a, b) => new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime());

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">Real-Time SLA Monitor</h1>
        <p className="text-zinc-500 mt-1">Live countdown monitoring of active incident deadlines, sorted by response urgency.</p>
      </div>

      {/* SLA list */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[9px] tracking-wider text-zinc-500">
              <th className="p-4">Ticket ID</th>
              <th className="p-4">SAP Module</th>
              <th className="p-4">Client Company</th>
              <th className="p-4">Assigned Consultant</th>
              <th className="p-4">SLA Deadline Time</th>
              <th className="p-4 text-right">SLA Countdown Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 text-zinc-700">
            {activeTickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400 font-bold uppercase">
                  All active tickets comply with SLA policies
                </td>
              </tr>
            ) : (
              activeTickets.map((t) => {
                const isOverdue = new Date(t.slaDueAt).getTime() < Date.now();
                return (
                  <tr key={t.id} className="hover:bg-zinc-50/50">
                    <td className="p-4 font-bold text-zinc-900">
                      <Link href={`/tickets/${t.id}`} className="hover:underline">{t.id}</Link>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 text-white font-mono font-bold">
                        {t.sapModule}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-zinc-650">{t.organization}</td>
                    <td className="p-4 font-semibold text-zinc-600">{t.assignedConsultant || 'Unassigned'}</td>
                    <td className="p-4 text-zinc-400 font-mono">
                      {new Date(t.slaDueAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <SlaBadge ticket={t} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
