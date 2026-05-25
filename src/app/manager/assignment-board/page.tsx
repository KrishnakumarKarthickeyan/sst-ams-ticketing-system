'use client';

import React from 'react';
import { useTickets } from '../../../context/TicketContext';
import { TicketCard } from '../../../components/TicketCard';
import Link from 'next/link';
import { KanbanSquare, Info, ShieldCheck } from 'lucide-react';

export default function ManagerAssignmentBoardPage() {
  const { tickets, updateTicketStatus } = useTickets();

  // Columns for Kanban
  const newTickets = tickets.filter(t => t.status === 'New');
  const assignedTickets = tickets.filter(t => t.status === 'Assigned');
  const inProgressTickets = tickets.filter(t => t.status === 'In Progress');
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (ticketId: string, nextStatus: any) => {
    updateTicketStatus(ticketId, nextStatus, 'Marcus Vance (Manager)');
  };

  const renderColumn = (title: string, list: typeof tickets, statusVal: any) => {
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={() => handleDrop('', statusVal)} // standard fallback
        className="flex-1 min-w-[280px] bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex flex-col h-[calc(100vh-12rem)] space-y-4"
      >
        <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
          <span className="font-bold text-xs uppercase tracking-wider text-zinc-950 font-mono flex items-center gap-1.5">
            {title}
            <span className="text-[10px] bg-zinc-900 text-white font-mono px-1.5 py-0.2 rounded-full font-bold">
              {list.length}
            </span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {list.length === 0 ? (
            <div className="h-full border border-dashed border-zinc-200 rounded flex items-center justify-center py-20">
              <span className="text-zinc-400 font-mono text-[10px] uppercase tracking-wide">Empty Column</span>
            </div>
          ) : (
            list.map((ticket) => (
              <div key={ticket.id} className="relative group/kanban">
                <Link href={`/tickets/${ticket.id}`} className="block">
                  <TicketCard ticket={ticket} onClick={() => {}} />
                </Link>

                {/* Quick actions panel overlay on card */}
                <div className="absolute top-2 right-2 hidden group-hover/kanban:flex items-center gap-1 bg-white border border-zinc-950 rounded p-1 shadow-sm z-30">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        updateTicketStatus(ticket.id, e.target.value as any, 'Marcus Vance (Manager)');
                      }
                    }}
                    className="bg-transparent text-[9px] font-bold uppercase tracking-wider font-mono text-zinc-950 focus:outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>Move</option>
                    <option value="New">New</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting for Customer">Wait Client</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono flex items-center gap-2">
          <KanbanSquare size={20} />
          SAP Operations Board
        </h1>
        <p className="text-zinc-500 mt-1">
          Drag updates (simulated via drop-down selectors) to transition ticket states between queues and balance workload.
        </p>
      </div>

      {/* Board Columns Grid */}
      <div className="flex overflow-x-auto gap-6 pb-4">
        {renderColumn('Incoming / New', newTickets, 'New')}
        {renderColumn('Assigned Staff', assignedTickets, 'Assigned')}
        {renderColumn('Active Work', inProgressTickets, 'In Progress')}
        {renderColumn('Resolutions Ready', resolvedTickets, 'Resolved')}
      </div>
    </div>
  );
}
