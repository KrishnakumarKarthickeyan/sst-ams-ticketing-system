'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import Link from 'next/link';
import { BrandedLogo } from '../../../components/ui/BrandedLogo';
import { 
  Search, Filter, Layers, Plus, AlertTriangle, Clock, 
  ArrowRight, ShieldAlert, CheckCircle2, User, RefreshCw 
} from 'lucide-react';

type TabType = 
  | 'All' | 'New' | 'Assigned' | 'InProgress' | 'WaitingCust' | 'WaitingTeam' 
  | 'ReqGathering' | 'WaitingQuote' | 'ClosureReq' | 'AwaitingMgr' 
  | 'Resolved' | 'Closed' | 'Escalated';

export default function AdminTicketsPage() {
  const { tickets, loading } = useTickets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Customers and modules list for filters
  const customersList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.organization))).filter(Boolean).sort();
  }, [tickets]);

  const modulesList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.sapModule))).filter(Boolean).sort();
  }, [tickets]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = {
      All: tickets.length,
      New: tickets.filter(t => t.status === 'New').length,
      Assigned: tickets.filter(t => t.status === 'Assigned').length,
      InProgress: tickets.filter(t => t.status === 'In Progress' || t.status === 'In Progress - Technical' || t.status === 'In Progress - Functional').length,
      WaitingCust: tickets.filter(t => t.status === 'Waiting for Customer' || t.status === 'Customer Action').length,
      WaitingTeam: tickets.filter(t => t.status === 'Waiting for Internal Team' || t.status === 'On Hold').length,
      ReqGathering: tickets.filter(t => t.status === 'Requirement Gathering').length,
      WaitingQuote: tickets.filter(t => t.status === 'Waiting for Hours Approval').length,
      ClosureReq: tickets.filter(t => t.status === 'Request for Closure').length,
      AwaitingMgr: tickets.filter(t => t.status === 'Awaiting Manager Approval' || t.status === 'Awaiting Closure').length,
      Resolved: tickets.filter(t => t.status === 'Resolved').length,
      Closed: tickets.filter(t => t.status === 'Closed').length,
      Escalated: tickets.filter(t => t.escalationFlag).length
    };
    return counts;
  }, [tickets]);

  // Filtering logic
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // 1. Tab Status filters
      if (activeTab === 'New' && t.status !== 'New') return false;
      if (activeTab === 'Assigned' && t.status !== 'Assigned') return false;
      if (activeTab === 'InProgress' && t.status !== 'In Progress' && t.status !== 'In Progress - Technical' && t.status !== 'In Progress - Functional') return false;
      if (activeTab === 'WaitingCust' && t.status !== 'Waiting for Customer' && t.status !== 'Customer Action') return false;
      if (activeTab === 'WaitingTeam' && t.status !== 'Waiting for Internal Team' && t.status !== 'On Hold') return false;
      if (activeTab === 'ReqGathering' && t.status !== 'Requirement Gathering') return false;
      if (activeTab === 'WaitingQuote' && t.status !== 'Waiting for Hours Approval') return false;
      if (activeTab === 'ClosureReq' && t.status !== 'Request for Closure') return false;
      if (activeTab === 'AwaitingMgr' && t.status !== 'Awaiting Manager Approval' && t.status !== 'Awaiting Closure') return false;
      if (activeTab === 'Resolved' && t.status !== 'Resolved') return false;
      if (activeTab === 'Closed' && t.status !== 'Closed') return false;
      if (activeTab === 'Escalated' && !t.escalationFlag) return false;

      // 2. Sidebar Dropdowns filters
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      if (moduleFilter !== 'All' && t.sapModule !== moduleFilter) return false;
      if (customerFilter !== 'All' && t.organization !== customerFilter) return false;

      // 2b. Date range filtering
      if (dateFilter !== 'All') {
        const created = new Date(t.createdAt);
        const createdMs = created.getTime();
        
        if (dateFilter === 'current-month') {
          const now = new Date();
          if (created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear()) return false;
        }
        if (dateFilter === 'current-quarter') {
          const now = new Date();
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const createdQuarter = Math.floor(created.getMonth() / 3);
          if (createdQuarter !== currentQuarter || created.getFullYear() !== now.getFullYear()) return false;
        }
        if (dateFilter === 'current-year') {
          const now = new Date();
          if (created.getFullYear() !== now.getFullYear()) return false;
        }
        if (dateFilter === 'custom') {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (createdMs < start.getTime()) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (createdMs > end.getTime()) return false;
          }
        }
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.id.toLowerCase().includes(q) ||
          (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q)) ||
          t.title.toLowerCase().includes(q) ||
          t.organization.toLowerCase().includes(q) ||
          (t.assignedConsultant && t.assignedConsultant.toLowerCase().includes(q)) ||
          (t.assignedManager && t.assignedManager.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [tickets, activeTab, priorityFilter, moduleFilter, customerFilter, dateFilter, customStartDate, customEndDate, searchQuery]);

  // SLA countdown logic formatting
  const formatSlaCountdown = (dueDateStr: string, status: string) => {
    if (status === 'Closed' || status === 'Resolved') {
      return <span className="text-zinc-400 font-semibold">SLA Completed</span>;
    }
    if (!dueDateStr || dueDateStr === 'SLA Not Applicable') {
      return <span className="text-zinc-400">SLA Not Applicable</span>;
    }

    const diff = new Date(dueDateStr).getTime() - Date.now();
    const isBreached = diff < 0;
    const absDiff = Math.abs(diff);

    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 65)) / (1000 * 60));

    let displayStr = '';
    if (days > 0) displayStr += `${days}d `;
    if (hours > 0) displayStr += `${hours}h `;
    displayStr += `${minutes}m`;

    if (isBreached) {
      return (
        <span className="text-red-700 font-bold flex items-center gap-1">
          <AlertTriangle size={11} className="shrink-0" />
          Breached by {displayStr}
        </span>
      );
    }

    // SLA Warning if within 12 hours
    if (absDiff < 12 * 60 * 60 * 1000) {
      return (
        <span className="text-amber-700 font-bold flex items-center gap-1">
          <Clock size={11} className="shrink-0" />
          Due in {displayStr}
        </span>
      );
    }

    return <span className="text-zinc-650">Due in {displayStr}</span>;
  };

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase text-zinc-950 font-mono">Global Service Desk</h1>
          <p className="text-zinc-500 mt-1">Cross-organization monitoring of active ticket pipelines, SLA compliance, and escalation alerts.</p>
        </div>
        <Link 
          href="/admin/create-ticket" 
          className="px-3 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus size={12} />
          Create Ticket
        </Link>
      </div>

      {/* Advanced Filter controls */}
      <div className="bg-white border border-zinc-200 rounded p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Ticket ID, title, owner..."
            className="w-full bg-white border border-zinc-200 rounded pl-9 pr-4 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-955 font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* Priority */}
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded px-2 py-1 text-zinc-500">
            <Filter size={11} className="text-zinc-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-zinc-800 focus:outline-none cursor-pointer"
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
              className="bg-transparent text-[11px] font-semibold text-zinc-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Modules</option>
              {modulesList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Customer */}
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded px-2 py-1 text-zinc-500">
            <Filter size={11} className="text-zinc-400" />
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-zinc-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Customers</option>
              {customersList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded px-2 py-1 text-zinc-500">
            <Filter size={11} className="text-zinc-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-zinc-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All History</option>
              <option value="current-month">This Month</option>
              <option value="current-quarter">This Quarter</option>
              <option value="current-year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <>
              <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded px-2 py-1 text-zinc-500">
                <span className="text-[11px] font-mono">Start:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-[11px] text-zinc-800 focus:outline-none cursor-pointer font-mono"
                />
              </div>
              <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded px-2 py-1 text-zinc-500">
                <span className="text-[11px] font-mono">End:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-[11px] text-zinc-800 focus:outline-none cursor-pointer font-mono"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* The 13 Status Tabs View */}
      <div className="flex flex-wrap gap-1 bg-zinc-100 p-1 rounded border border-zinc-200 max-w-full overflow-x-auto">
        {[
          { id: 'All', label: 'All' },
          { id: 'New', label: 'New' },
          { id: 'Assigned', label: 'Assigned' },
          { id: 'InProgress', label: 'In Progress' },
          { id: 'WaitingCust', label: 'Wait Cust' },
          { id: 'WaitingTeam', label: 'Wait Team' },
          { id: 'ReqGathering', label: 'Req Gather' },
          { id: 'WaitingQuote', label: 'Wait Quote' },
          { id: 'ClosureReq', label: 'Closure Req' },
          { id: 'AwaitingMgr', label: 'Awaiting Mgr' },
          { id: 'Resolved', label: 'Resolved' },
          { id: 'Closed', label: 'Closed' },
          { id: 'Escalated', label: 'Escalated' }
        ].map(tab => {
          const count = (tabCounts as any)[tab.id] || 0;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive 
                  ? 'bg-zinc-950 text-white shadow-sm'
                  : 'text-zinc-650 hover:text-zinc-900 hover:bg-zinc-200'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-mono ${
                isActive ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Compact Data Grid Table */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[9px] tracking-wider text-zinc-500">
              <th className="p-3 w-6"></th>
              <th className="p-3 w-28">Ticket ID</th>
              <th className="p-3">Ticket Details</th>
              <th className="p-3 w-40">Client Org</th>
              <th className="p-3 w-24">Priority</th>
              <th className="p-3 w-40">SLA Telemetry</th>
              <th className="p-3 w-36">Delivery Team</th>
              <th className="p-3 w-16 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-400 font-mono">
                  Loading tickets registry...
                </td>
              </tr>
            ) : filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-zinc-400 font-mono">
                  <div className="flex flex-col items-center justify-center space-y-2 py-4">
                    <BrandedLogo width={24} height={24} iconOnly={true} className="opacity-40" />
                    <span>No tickets found matching the selected filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTickets.map(t => {
                const isCritical = t.priority === 'Critical';
                const hasEscalation = t.escalationFlag;
                
                return (
                  <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="p-3 text-center">
                      {hasEscalation && (
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-ping inline-block" title="Escalation active!" />
                      )}
                    </td>
                    <td className="p-3">
                      <Link 
                        href={`/admin/tickets/${t.id}`} 
                        className="font-bold text-zinc-950 hover:underline font-mono"
                      >
                        {t.ticketNumber || t.id}
                      </Link>
                    </td>
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <Link 
                          href={`/admin/tickets/${t.id}`} 
                          className="font-bold text-zinc-800 text-xs block hover:underline line-clamp-1"
                        >
                          {t.title}
                        </Link>
                        <div className="flex items-center gap-2 text-[9px] text-zinc-400 font-mono">
                          <span className="bg-zinc-100 text-zinc-700 px-1 rounded uppercase font-semibold">
                            {t.sapModule}
                          </span>
                          <span>•</span>
                          <span className="px-1.5 py-0.1 bg-zinc-50 border border-zinc-150 rounded text-zinc-650">
                            {t.status}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-zinc-650 truncate max-w-[120px]">
                      {t.organization}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        isCritical ? 'bg-red-950 text-white' :
                        t.priority === 'High' ? 'bg-amber-105 text-amber-800 border border-amber-200' :
                        t.priority === 'Medium' ? 'bg-zinc-100 text-zinc-800 border border-zinc-200' :
                        'bg-zinc-50 text-zinc-600 border border-zinc-200'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px]">
                      {formatSlaCountdown(t.slaDueAt, t.status)}
                    </td>
                    <td className="p-3 text-[10px] text-zinc-500 font-sans">
                      <div className="space-y-0.5">
                        {t.assignedManager && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-650">Mgr:</span>
                            <span className="text-zinc-800 truncate max-w-[90px]">{t.assignedManager}</span>
                          </div>
                        )}
                        {t.assignedConsultant && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-650">Cons:</span>
                            <span className="text-zinc-800 truncate max-w-[90px]">{t.assignedConsultant}</span>
                          </div>
                        )}
                        {!t.assignedManager && !t.assignedConsultant && (
                          <span className="text-zinc-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <Link 
                        href={`/admin/tickets/${t.id}`}
                        className="inline-flex p-1.5 rounded border border-zinc-200 hover:border-zinc-950 text-zinc-500 hover:text-zinc-950 transition cursor-pointer"
                        title="Open Details View"
                      >
                        <ArrowRight size={12} />
                      </Link>
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
