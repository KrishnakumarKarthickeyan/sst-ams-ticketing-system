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
        return 'bg-ink text-white font-black border border-ink';
      case 'High':
        return 'bg-zinc-800 text-white font-bold border border-zinc-800';
      case 'Medium':
        return 'bg-surface-subtle text-ink border border-line-strong font-semibold';
      case 'Low':
        return 'bg-surface text-ink-muted border border-line text-[11px]';
    }
  };

  const getStatusStyles = (status: Ticket['status']) => {
    switch (status) {
      case 'New':
        return 'bg-surface-subtle text-ink border border-ink font-bold';
      case 'Assigned':
        return 'bg-surface text-ink border border-zinc-900 border-dashed';
      case 'In Progress':
        return 'bg-ink text-white border border-zinc-900';
      case 'Resolved':
        return 'bg-surface-subtle text-ink-secondary border border-line';
      case 'Closed':
        return 'bg-surface text-ink-muted border border-line';
      default:
        return 'bg-surface text-ink-secondary border border-line-strong';
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-surface rounded-lg p-5 border border-line hover:border-line-strong shadow-card hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-full group"
    >
      <div>
        {/* Ticket Header Metadata */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-ink-muted group-hover:text-ink transition-colors flex items-center gap-0.5">
              <Hash size={10} />
              {ticket.id}
            </span>
            <span className="text-[11px] font-black px-2 py-0.5 rounded bg-ink text-white">
              {ticket.sapModule}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded ${getPriorityStyles(ticket.priority)}`}>
              {ticket.priority}
            </span>
            <span className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded ${getStatusStyles(ticket.status)}`}>
              {ticket.status}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-ink text-sm mb-1.5 group-hover:text-black line-clamp-1">
          {ticket.title}
        </h3>

        {/* Description Snippet */}
        <p className="text-[11px] text-ink-secondary line-clamp-2 mb-4 leading-normal">
          {ticket.description}
        </p>
      </div>

      {/* Footer Meta Section */}
      <div className="pt-3.5 border-t border-line mt-auto">
        <div className="flex items-center justify-between text-[11px] text-ink-secondary mb-3">
          {/* Org & Category details */}
          <div className="flex items-center gap-1.5">
            <span className="text-ink-muted truncate max-w-[100px]" title={ticket.organization}>
              {ticket.organization}
            </span>
            <span className="text-ink-muted">/</span>
            <span className="text-ink-muted truncate max-w-[90px]" title={ticket.category}>
              {ticket.category}
            </span>
          </div>

          {/* SLA Timer */}
          <SlaBadge ticket={ticket} />
        </div>

        {/* Staff Assignment & Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-dashed border-line">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-surface-subtle flex items-center justify-center text-[11px] font-bold text-ink">
              {ticket.assignedConsultant ? (
                ticket.assignedConsultant.split(' ').map((n) => n[0]).join('')
              ) : (
                <User size={10} className="text-ink-secondary" />
              )}
            </div>
            <span className="text-[11px] text-ink-secondary font-bold truncate max-w-[120px]">
              {ticket.assignedConsultant || 'Unassigned'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {ticket.escalationFlag && (
              <span className="text-[11px] font-bold text-black border border-black bg-surface-muted px-1.5 py-0.2 rounded flex items-center gap-0.5 animate-pulse">
                <ShieldAlert size={10} />
                ESC
              </span>
            )}
            <ChevronRight size={14} className="text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
};
