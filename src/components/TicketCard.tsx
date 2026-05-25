'use client';

import React from 'react';
import { Ticket } from '../types/ticket';
import { SlaBadge } from './tickets/SlaBadge';
import { User, ChevronRight, Hash, Layers, ShieldAlert } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  onClick: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onClick }) => {
  // Monochrome badge stylers
  const getPriorityStyles = (prio: Ticket['priority']) => {
    switch (prio) {
      case 'Critical':
        return 'bg-zinc-950 text-white font-mono font-black border border-zinc-950';
      case 'High':
        return 'bg-zinc-800 text-white font-mono font-bold border border-zinc-800';
      case 'Medium':
        return 'bg-zinc-100 text-zinc-900 border border-zinc-300 font-semibold';
      case 'Low':
        return 'bg-white text-zinc-400 border border-zinc-200 text-[10px]';
    }
  };

  const getStatusStyles = (status: Ticket['status']) => {
    switch (status) {
      case 'New':
        return 'bg-zinc-100 text-zinc-950 border border-zinc-950 font-bold';
      case 'Assigned':
        return 'bg-white text-zinc-900 border border-zinc-900 border-dashed';
      case 'In Progress':
        return 'bg-zinc-900 text-white border border-zinc-900';
      case 'Resolved':
        return 'bg-zinc-100 text-zinc-600 border border-zinc-200';
      case 'Closed':
        return 'bg-white text-zinc-300 border border-zinc-200';
      default:
        return 'bg-white text-zinc-600 border border-zinc-300';
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-5 border border-zinc-200 hover:border-zinc-950 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-full group"
    >
      <div>
        {/* Ticket Header Metadata */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-mono text-zinc-400 group-hover:text-zinc-900 transition-colors flex items-center gap-0.5">
              <Hash size={10} />
              {ticket.id}
            </span>
            <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-zinc-900 text-white">
              {ticket.sapModule}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded ${getPriorityStyles(ticket.priority)}`}>
              {ticket.priority}
            </span>
            <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded ${getStatusStyles(ticket.status)}`}>
              {ticket.status}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-zinc-950 text-sm mb-1.5 group-hover:text-black line-clamp-1">
          {ticket.title}
        </h3>

        {/* Description Snippet */}
        <p className="text-[11px] text-zinc-500 line-clamp-2 mb-4 leading-normal">
          {ticket.description}
        </p>
      </div>

      {/* Footer Meta Section */}
      <div className="pt-3.5 border-t border-zinc-100 mt-auto">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-3">
          {/* Org & Category details */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-zinc-400 truncate max-w-[100px]" title={ticket.organization}>
              {ticket.organization}
            </span>
            <span className="text-zinc-300 font-mono">/</span>
            <span className="text-zinc-400 truncate max-w-[90px]" title={ticket.category}>
              {ticket.category}
            </span>
          </div>

          {/* SLA Timer */}
          <SlaBadge ticket={ticket} />
        </div>

        {/* Staff Assignment & Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-dashed border-zinc-200">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-zinc-150 flex items-center justify-center text-[10px] font-bold text-zinc-800">
              {ticket.assignedConsultant ? (
                ticket.assignedConsultant.split(' ').map((n) => n[0]).join('')
              ) : (
                <User size={10} className="text-zinc-500" />
              )}
            </div>
            <span className="text-[11px] text-zinc-700 font-bold truncate max-w-[120px]">
              {ticket.assignedConsultant || 'Unassigned'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {ticket.escalationFlag && (
              <span className="text-[9px] font-bold text-black border border-black bg-zinc-50 px-1.5 py-0.2 rounded flex items-center gap-0.5 animate-pulse">
                <ShieldAlert size={10} />
                ESC
              </span>
            )}
            <ChevronRight size={14} className="text-zinc-400 group-hover:text-zinc-950 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};
