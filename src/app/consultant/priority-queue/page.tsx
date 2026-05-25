'use client';

import React from 'react';
import { useTickets } from '../../../context/TicketContext';
import { TicketCard } from '../../../components/TicketCard';
import Link from 'next/link';
import { Clock, AlertTriangle, Layers } from 'lucide-react';

export default function ConsultantPriorityQueuePage() {
  const { tickets, loading } = useTickets();

  const consultantName = 'Karthik Subramanian';
  const myTickets = tickets.filter(t => t.assignedConsultant === consultantName);
  const myOpen = myTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');

  // Priority Queue: Filter High / Critical and sort by SLA urgency
  const priorityQueue = myOpen
    .filter(t => t.priority === 'Critical' || t.priority === 'High')
    .sort((a, b) => new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime());

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono flex items-center gap-2">
          <AlertTriangle size={18} className="text-zinc-950" />
          Priority SLA Queue
        </h1>
        <p className="text-zinc-500 mt-1">Review urgent critical incidents sorted by shortest remaining resolution window.</p>
      </div>

      {/* Warning message */}
      <div className="p-4 border border-zinc-900 rounded bg-zinc-50 flex items-start gap-3">
        <Clock size={16} className="text-zinc-950 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-zinc-950 uppercase">Immediate Resolution Timeframe</p>
          <p className="text-zinc-500 leading-normal">
            P1 incidents hold a strict 4-hour resolution window. Intervene immediately, log efforts, or request escalation if dependencies are blocked.
          </p>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 font-semibold">Loading priority queue...</div>
      ) : priorityQueue.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded py-20 text-center text-zinc-400 space-y-2">
          <Layers className="mx-auto opacity-30 text-zinc-400" size={32} />
          <p className="font-bold text-zinc-800">No high-priority incidents in queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {priorityQueue.map((ticket) => (
            <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block h-full">
              <div className="h-full">
                <TicketCard ticket={ticket} onClick={() => {}} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
