'use client';

import React, { useState } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { TicketCard } from '../../../components/TicketCard';
import Link from 'next/link';
import { Search, Filter, Layers, Plus } from 'lucide-react';

export default function AdminTicketsPage() {
  const { tickets, loading } = useTickets();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');

  // Filtering tickets
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
    if (moduleFilter !== 'All' && t.sapModule !== moduleFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.organization.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">Global Ticket Inventory</h1>
          <p className="text-zinc-500 mt-1">Cross-organization monitoring of active service queues, consultant assignments, and SLAs.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-zinc-200 rounded p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, title, company..."
            className="w-full bg-white border border-zinc-200 rounded pl-9 pr-4 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* Status */}
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded px-2 py-1 text-zinc-500">
            <Filter size={11} className="text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-zinc-800 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Customer">Waiting for Customer</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded px-2 py-1 text-zinc-500">
            <Filter size={11} className="text-zinc-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-zinc-800 focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Module */}
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded px-2 py-1 text-zinc-500">
            <Filter size={11} className="text-zinc-400" />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-zinc-800 focus:outline-none"
            >
              <option value="All">All SAP Modules</option>
              <option value="FICO">FICO</option>
              <option value="MM">MM</option>
              <option value="SD">SD</option>
              <option value="PP">PP</option>
              <option value="BASIS">BASIS</option>
              <option value="ABAP">ABAP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 font-semibold">Loading tickets registry...</div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded py-20 text-center text-zinc-400 space-y-2">
          <Layers className="mx-auto opacity-30 text-zinc-400" size={32} />
          <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono">No tickets created yet.</h3>
          <p className="text-[10px] text-zinc-500 font-mono">No tickets have been created in the database yet.</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded py-20 text-center text-zinc-400 space-y-2">
          <Layers className="mx-auto opacity-30 text-zinc-400" size={32} />
          <p className="font-bold">No tickets match criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((ticket) => (
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
