'use client';

import React, { useState, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import {
  Search,
  LayoutGrid,
  List,
  Eye,
  MoreHorizontal,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Lock,
  X,
  Paperclip,
  MessageSquare,
  Activity,
  Zap,
  Building2,
  Tag,
  Timer,
  Flag,
  RotateCcw,
  Plus
} from 'lucide-react';
import { TicketStatus, TicketPriority, SAPModule } from '../../../types/ticket';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  Critical: { label: 'Critical', color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
  High:     { label: 'High',     color: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-400' },
  Medium:   { label: 'Medium',   color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-400' },
  Low:      { label: 'Low',      color: 'text-slate-655 bg-slate-50 border-slate-200', dot: 'bg-slate-400' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  'Requirement Gathering':     { label: 'Req. Gathering', color: 'text-slate-600 bg-slate-100 border-slate-200' },
  'Waiting for Hours Approval':{ label: 'Hrs Approval',   color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'In Progress - Technical':   { label: 'IP Technical',   color: 'text-blue-700 bg-blue-50 border-blue-200' },
  'In Progress - Functional':  { label: 'IP Functional',  color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  'In Progress':               { label: 'In Progress',    color: 'text-blue-700 bg-blue-50 border-blue-200' },
  'Raised to SAP':             { label: 'Raised to SAP',  color: 'text-orange-700 bg-orange-50 border-orange-200' },
  'Customer Action':           { label: 'Cust. Action',   color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'Request for Closure':       { label: 'Req. Closure',   color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'Closed':                    { label: 'Closed',         color: 'text-slate-600 bg-slate-200 border-slate-300' },
  'Reopened':                  { label: 'Reopened',       color: 'text-red-700 bg-red-50 border-red-200' },
  'New':                       { label: 'New / Unassigned', color: 'text-zinc-650 bg-zinc-100 border-zinc-200 font-bold' },
  'Assigned':                  { label: 'Assigned',       color: 'text-blue-650 bg-blue-50 border-blue-150' }
};

export default function ManagerTicketsPage() {
  const { tickets, loading, updateTicketStatus } = useTickets();
  const { user } = useAuth();
  const managerName = user?.name || 'Marcus Vance';

  // Workspace Settings
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('all');

  // Scoped list based on Manager Organization
  const scopedTickets = useMemo(() => {
    return tickets.filter(t => {
      if (user?.company && user.company !== 'SST SAP Operations') {
        return t.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  // Tab Filtering
  const tabFilteredTickets = useMemo(() => {
    if (activeTab === 'active') {
      return scopedTickets.filter(t =>
        ['In Progress', 'In Progress - Technical', 'In Progress - Functional', 'Requirement Gathering', 'Assigned'].includes(t.status)
      );
    }
    if (activeTab === 'pending') {
      return scopedTickets.filter(t =>
        ['Customer Action', 'Waiting for Customer', 'Raised to SAP', 'Waiting for Hours Approval'].includes(t.status)
      );
    }
    if (activeTab === 'closure') {
      return scopedTickets.filter(t =>
        ['Request for Closure', 'Resolved', 'Closed', 'Reopened'].includes(t.status)
      );
    }
    return scopedTickets;
  }, [scopedTickets, activeTab]);

  // Dropdown / Search Filter
  const filteredTickets = useMemo(() => {
    return tabFilteredTickets.filter(t => {
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      if (moduleFilter !== 'All' && t.sapModule !== moduleFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.organization.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.assignedConsultant || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tabFilteredTickets, statusFilter, priorityFilter, moduleFilter, searchQuery]);

  // Summary counts for tabs
  const tabCounts = useMemo(() => ({
    all: scopedTickets.length,
    active: scopedTickets.filter(t =>
      ['In Progress', 'In Progress - Technical', 'In Progress - Functional', 'Requirement Gathering', 'Assigned'].includes(t.status)
    ).length,
    pending: scopedTickets.filter(t =>
      ['Customer Action', 'Waiting for Customer', 'Raised to SAP', 'Waiting for Hours Approval'].includes(t.status)
    ).length,
    closure: scopedTickets.filter(t =>
      ['Request for Closure', 'Resolved', 'Closed', 'Reopened'].includes(t.status)
    ).length
  }), [scopedTickets]);

  // SLA Indicator helper
  const getSLAIndicator = (slaDueAt: string, status: string) => {
    if (status === 'Closed' || status === 'Resolved') {
      return <span className="text-[9px] font-bold text-emerald-700 font-mono">SLA Met</span>;
    }
    const now = Date.now();
    const due = new Date(slaDueAt).getTime();
    const hoursLeft = (due - now) / (1000 * 60 * 60);

    if (hoursLeft < 0) {
      return <span className="text-[9px] font-bold text-red-655 font-mono flex items-center gap-1"><AlertTriangle size={10} /> Breached</span>;
    }
    if (hoursLeft < 24) {
      return <span className="text-[9px] font-bold text-amber-600 font-mono flex items-center gap-1"><Timer size={10} /> {Math.round(hoursLeft)}h left</span>;
    }
    return <span className="text-[9px] text-zinc-450 font-mono flex items-center gap-1"><Clock size={10} /> {new Date(slaDueAt).toLocaleDateString()}</span>;
  };

  return (
    <div className="space-y-6 font-mono text-xs text-[#09090b]">
      
      {/* Title banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase text-zinc-950 tracking-wider">Service Tickets Desk</h1>
          <p className="text-zinc-500 mt-1">
            Review incident queues, allocate consultants, update SLA timelines, and track approvals in real time.
          </p>
        </div>
        <Link href="/manager/create-ticket" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider transition">
          <Plus size={12} />
          <span>Create Ticket</span>
        </Link>
      </div>

      {/* Workspace Tabs (All, Active, Pending, Closure) */}
      <div className="flex border-b border-zinc-200 overflow-x-auto whitespace-nowrap bg-zinc-50/50 p-0.5 rounded-lg border">
        <button
          onClick={() => { setActiveTab('all'); }}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[9px] rounded transition ${
            activeTab === 'all' 
              ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200 font-extrabold' 
              : 'text-zinc-500 hover:text-zinc-850'
          }`}
        >
          <span>All Backlogs</span>
          <Badge className="bg-zinc-200 text-zinc-800 hover:bg-zinc-200 border-none font-bold px-1.5 py-0">
            {tabCounts.all}
          </Badge>
        </button>

        <button
          onClick={() => { setActiveTab('active'); }}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[9px] rounded transition ${
            activeTab === 'active' 
              ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200 font-extrabold' 
              : 'text-zinc-500 hover:text-zinc-855'
          }`}
        >
          <span>Active Work</span>
          <Badge className="bg-zinc-200 text-zinc-800 hover:bg-zinc-200 border-none font-bold px-1.5 py-0">
            {tabCounts.active}
          </Badge>
        </button>

        <button
          onClick={() => { setActiveTab('pending'); }}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[9px] rounded transition ${
            activeTab === 'pending' 
              ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200 font-extrabold' 
              : 'text-zinc-500 hover:text-zinc-855'
          }`}
        >
          <span>Pending Actions</span>
          <Badge className="bg-zinc-200 text-zinc-800 hover:bg-zinc-200 border-none font-bold px-1.5 py-0">
            {tabCounts.pending}
          </Badge>
        </button>

        <button
          onClick={() => { setActiveTab('closure'); }}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[9px] rounded transition ${
            activeTab === 'closure' 
              ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200 font-extrabold' 
              : 'text-zinc-500 hover:text-zinc-855'
          }`}
        >
          <span>Resolutions & Closures</span>
          <Badge className="bg-zinc-200 text-zinc-800 hover:bg-zinc-200 border-none font-bold px-1.5 py-0">
            {tabCounts.closure}
          </Badge>
        </button>
      </div>

      {/* Vercel-like filter bar standards */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, title, customer, staff..."
            className="w-full bg-white border border-zinc-200 rounded-md pl-9 pr-4 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono placeholder:text-zinc-400"
          />
        </div>

        {/* Dropdowns & View toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-zinc-200 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-800 focus:outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="New">New / Unassigned</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting for Customer">Waiting Customer</option>
            <option value="Raised to SAP">Raised to SAP</option>
            <option value="Request for Closure">Request Closure</option>
            <option value="Closed">Closed</option>
            <option value="Reopened">Reopened</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white border border-zinc-200 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-800 focus:outline-none cursor-pointer"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-white border border-zinc-200 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-800 focus:outline-none cursor-pointer font-mono"
          >
            <option value="All">All SAP Modules</option>
            <option value="FICO">FICO</option>
            <option value="MM">MM</option>
            <option value="SD">SD</option>
            <option value="PP">PP</option>
            <option value="BASIS">BASIS</option>
            <option value="ABAP">ABAP</option>
          </select>

          <div className="h-6 w-px bg-zinc-200 mx-1" />

          {/* View Toggles */}
          <div className="flex bg-zinc-100 p-0.5 rounded border border-zinc-200">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded transition ${viewMode === 'card' ? 'bg-white shadow-sm text-zinc-950' : 'text-zinc-450 hover:text-zinc-700'}`}
              title="Card layout view"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded transition ${viewMode === 'compact' ? 'bg-white shadow-sm text-zinc-950' : 'text-zinc-450 hover:text-zinc-700'}`}
              title="Compact list view"
            >
              <List size={13} />
            </button>
          </div>

        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 font-bold">Querying tickets registry...</div>
      ) : filteredTickets.length === 0 ? (
        <Card className="border border-zinc-200 rounded-lg p-20 text-center text-zinc-450 italic space-y-2">
          <AlertCircle className="mx-auto text-zinc-300" size={24} />
          <p className="font-bold uppercase text-[10px]">No Incidents Found</p>
          <p className="text-[9px] text-zinc-400 font-sans">No tickets match the selected filters or timeline scope.</p>
        </Card>
      ) : viewMode === 'card' ? (
        
        // ── CARD LAYOUT MODE ──
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((t) => {
            const priorityCfg = priorityConfig[t.priority] || priorityConfig['Low'];
            const statusCfg = statusConfig[t.status] || { label: t.status, color: 'text-zinc-600 bg-zinc-50 border-zinc-200' };
            const assignedCount = (t.consultantEfforts || []).length || (t.assignedConsultant ? 1 : 0);

            return (
              <Card key={t.id} className="border border-zinc-200 rounded-xl hover:border-zinc-400 transition flex flex-col justify-between shadow-sm overflow-hidden bg-white">
                
                {/* Card Top */}
                <div className="p-4 space-y-3.5">
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-[10px] text-zinc-950 tracking-wider font-mono">{t.id}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded border text-[8px] font-bold uppercase font-mono ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full border text-[8px] font-bold font-mono ${priorityCfg.color}`}>
                        <span className={`w-1 h-1 rounded-full ${priorityCfg.dot}`} />
                        {priorityCfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-xs text-zinc-950 leading-snug line-clamp-2 hover:underline">
                      <Link href={`/manager/tickets/${t.id}`}>{t.title}</Link>
                    </h3>
                    <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed" title={t.description}>
                      {t.description}
                    </p>
                  </div>

                  {/* Customer Meta */}
                  <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase">
                    <Building2 size={11} className="text-zinc-400" />
                    <span className="truncate max-w-[170px]">{t.organization}</span>
                  </div>

                </div>

                {/* Card Bottom / Footer */}
                <div className="bg-zinc-50/50 border-t border-zinc-150 py-2.5 px-4 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-zinc-900 text-white hover:bg-zinc-900 text-[8px] py-0 px-1 border-none font-bold uppercase">
                      {t.sapModule}
                    </Badge>
                    <span className="text-zinc-450 font-semibold text-[8px]">
                      {assignedCount === 0 ? 'Unassigned' : `${assignedCount} allocated`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {getSLAIndicator(t.slaDueAt, t.status)}
                    
                    {/* Action Dropdown Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-500 cursor-pointer">
                          <MoreHorizontal size={13} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-[10px] font-mono">
                        <DropdownMenuItem className="cursor-pointer font-bold" asChild>
                          <Link href={`/manager/tickets/${t.id}`}>
                            <Eye size={12} className="mr-1.5" /> View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer font-bold" asChild>
                          <Link href="/manager/assignment-board">
                            <Activity size={12} className="mr-1.5" /> Allocate Resources
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="cursor-pointer font-semibold"
                          onClick={() => { updateTicketStatus(t.id, 'In Progress', managerName); }}
                        >
                          Start work (IP)
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer font-semibold"
                          onClick={() => { updateTicketStatus(t.id, 'Waiting for Customer', managerName); }}
                        >
                          Wait customer
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer font-bold text-red-600 focus:text-red-700"
                          onClick={() => { updateTicketStatus(t.id, 'Closed', managerName); }}
                        >
                          Enforce Close
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                  </div>
                </div>

              </Card>
            );
          })}
        </div>
      ) : (
        
        // ── COMPACT LIST TABLE MODE ──
        <Card className="border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[9px]">
                  <th className="py-2.5 px-4 font-bold">Ticket ID</th>
                  <th className="py-2.5 px-4 font-bold">Subject / title</th>
                  <th className="py-2.5 px-4 font-bold">Customer org</th>
                  <th className="py-2.5 px-4 font-bold text-center">Module</th>
                  <th className="py-2.5 px-4 font-bold text-center">Priority</th>
                  <th className="py-2.5 px-4 font-bold text-center">Status</th>
                  <th className="py-2.5 px-4 font-bold">Allocated resources</th>
                  <th className="py-2.5 px-4 font-bold text-center">SLA Health</th>
                  <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {filteredTickets.map((t) => {
                  const statusCfg = statusConfig[t.status] || { label: t.status, color: 'text-zinc-650 bg-zinc-50 border-zinc-200' };
                  const priorityCfg = priorityConfig[t.priority] || priorityConfig['Low'];
                  const assignedCount = (t.consultantEfforts || []).length || (t.assignedConsultant ? 1 : 0);

                  return (
                    <tr key={t.id} className="hover:bg-zinc-50/30 transition">
                      <td className="py-2.5 px-4 font-bold text-zinc-950 font-mono">
                        <Link href={`/manager/tickets/${t.id}`} className="hover:underline">{t.id}</Link>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-zinc-900 max-w-[220px] truncate" title={t.title}>
                        <Link href={`/manager/tickets/${t.id}`} className="hover:underline">{t.title}</Link>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-zinc-650 truncate max-w-[130px]">{t.organization}</td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100 border-none font-bold text-[8px] py-0 px-1 uppercase">
                          {t.sapModule}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                          <span className="text-[10px] font-semibold text-zinc-750">{t.priority}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-1.5 py-0.2 rounded border text-[8px] font-bold uppercase font-mono ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-zinc-600">
                        {assignedCount === 0 ? (
                          <span className="text-zinc-400 font-normal italic">Unassigned</span>
                        ) : (
                          <span>{assignedCount} engineers allocated</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {getSLAIndicator(t.slaDueAt, t.status)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Link href={`/manager/tickets/${t.id}`} className="p-1 border border-zinc-200 hover:border-zinc-950 bg-white text-zinc-800 rounded transition" title="Inspect Detail">
                            <Eye size={12} />
                          </Link>
                          <Link href="/manager/assignment-board" className="p-1 border border-zinc-200 hover:border-zinc-950 bg-white text-zinc-800 rounded transition" title="Allocate staff">
                            <Zap size={12} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
}
