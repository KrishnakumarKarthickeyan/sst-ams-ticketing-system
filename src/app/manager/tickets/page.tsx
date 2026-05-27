'use client';

import React, { useState, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  LayoutGrid,
  List,
  Eye,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  Users,
  ShieldCheck,
  Timer,
  Building2,
  Lock,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Star,
  CheckCircle2,
  CheckSquare,
  Filter,
  X
} from 'lucide-react';
import { TicketStatus, TicketPriority, SAPModule, TicketType } from '../../../types/ticket';
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
  Low:      { label: 'Low',      color: 'text-zinc-600 bg-zinc-50 border-zinc-200', dot: 'bg-zinc-400' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  'Requirement Gathering':     { label: 'Req. Gathering', color: 'text-slate-600 bg-slate-100 border-slate-200' },
  'Waiting for Hours Approval':{ label: 'Hrs Approval',   color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'In Progress - Technical':   { label: 'IP Technical',   color: 'text-blue-700 bg-blue-50 border-blue-200' },
  'In Progress - Functional':  { label: 'IP Functional',  color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  'In Progress':               { label: 'In Progress',    color: 'text-blue-700 bg-blue-50 border-blue-200' },
  'Raised to SAP':             { label: 'Raised to SAP',  color: 'text-orange-700 bg-orange-50 border-orange-200' },
  'Customer Action':           { label: 'Cust. Action',   color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'On Hold':                   { label: 'On Hold',        color: 'text-zinc-600 bg-zinc-100 border-zinc-250' },
  'Request for Closure':       { label: 'Req. Closure',   color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'Closed':                    { label: 'Closed',         color: 'text-zinc-600 bg-zinc-200 border-zinc-300' },
  'Reopened':                  { label: 'Reopened',       color: 'text-red-700 bg-red-50 border-red-200' },
  'New':                       { label: 'New',            color: 'text-zinc-650 bg-zinc-100 border-zinc-200 font-bold' },
  'Assigned':                  { label: 'Assigned',       color: 'text-blue-650 bg-blue-50 border-blue-150' },
  'Awaiting Functional Submission': { label: 'Awaiting Func. Sub', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  'Awaiting Technical Submission':  { label: 'Awaiting Tech. Sub', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  'Awaiting Manager Approval':      { label: 'Awaiting Mgr Appr', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

export default function ManagerTicketsPage() {
  const { tickets, loading, updateTicketStatus, assignTicket, updateTicket } = useTickets();
  const { user } = useAuth();
  const managerName = user?.name || 'Marcus Vance';

  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);

  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unassigned' | 'critical' | 'slaBreached' | 'raisedToSap' | 'customerAction' | 'reqClosure' | 'reopened' | 'closed' | 'pendingApprovals'>('all');

  const searchParams = useSearchParams();
  const tabParam = searchParams ? searchParams.get('tab') : null;

  React.useEffect(() => {
    if (tabParam) {
      const validTabs = ['all', 'unassigned', 'critical', 'slaBreached', 'raisedToSap', 'customerAction', 'reqClosure', 'reopened', 'closed', 'pendingApprovals'];
      if (validTabs.includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, [tabParam]);

  // Filter States
  const [custFilter, setCustFilter] = useState('All');
  const [consFilter, setConsFilter] = useState('All');
  const [funcConsFilter, setFuncConsFilter] = useState('All');
  const [techConsFilter, setTechConsFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [slaFilter, setSlaFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [assignStateFilter, setAssignStateFilter] = useState('All');
  const [closureStateFilter, setClosureStateFilter] = useState('All');
  const [approvalStateFilter, setApprovalStateFilter] = useState('All');

  // Base Scoped Tickets for the Manager
  const scopedTickets = useMemo(() => {
    return tickets.filter(t => {
      if (user?.company && user.company !== 'SST SAP Operations') {
        return t.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  // Unique Lists for Dropdown Options
  const customersList = useMemo(() => {
    return Array.from(new Set(scopedTickets.map(t => t.organization))).sort();
  }, [scopedTickets]);

  const consultantsList = useMemo(() => {
    const list = new Set<string>();
    scopedTickets.forEach(t => {
      if (t.assignedConsultant) list.add(t.assignedConsultant);
      (t.consultantEfforts || []).forEach(e => {
        if (e.consultantName) list.add(e.consultantName);
      });
    });
    return Array.from(list).sort();
  }, [scopedTickets]);

  const functionalConsultantsList = useMemo(() => {
    const list = new Set<string>();
    scopedTickets.forEach(t => {
      (t.consultantEfforts || []).forEach(e => {
        if (e.consultantType === 'Functional' && e.consultantName) list.add(e.consultantName);
      });
    });
    return Array.from(list).sort();
  }, [scopedTickets]);

  const technicalConsultantsList = useMemo(() => {
    const list = new Set<string>();
    scopedTickets.forEach(t => {
      (t.consultantEfforts || []).forEach(e => {
        if (e.consultantType === 'Technical' && e.consultantName) list.add(e.consultantName);
      });
    });
    return Array.from(list).sort();
  }, [scopedTickets]);

  // Tab Filtering logic (10 tabs)
  const tabFilteredTickets = useMemo(() => {
    const nowTime = Date.now();
    switch (activeTab) {
      case 'unassigned':
        return scopedTickets.filter(t => !t.assignedConsultant && (!t.consultantEfforts || t.consultantEfforts.length === 0));
      case 'critical':
        return scopedTickets.filter(t => t.priority === 'Critical');
      case 'slaBreached':
        return scopedTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && new Date(t.slaDueAt).getTime() < nowTime);
      case 'raisedToSap':
        return scopedTickets.filter(t => t.status === 'Raised to SAP' || t.raisedToSap);
      case 'customerAction':
        return scopedTickets.filter(t => t.status === 'Customer Action' || t.status === 'Waiting for Customer');
      case 'reqClosure':
        return scopedTickets.filter(t => t.status === 'Request for Closure' || t.status === 'Awaiting Manager Approval');
      case 'reopened':
        return scopedTickets.filter(t => t.status === 'Reopened');
      case 'closed':
        return scopedTickets.filter(t => t.status === 'Closed');
      case 'pendingApprovals':
        return scopedTickets.filter(t => 
          (t.hourEstimates?.some(e => e.status === 'Submitted') || false) ||
          (t.efforts?.some(e => e.status === 'Pending' || e.status === 'Pending Approval') || false) ||
          (t.closureRequests?.some(c => c.status === 'Pending Manager Approval') || false) ||
          (t.unlockRequests?.some(u => u.status === 'Pending') || false)
        );
      case 'all':
      default:
        return scopedTickets;
    }
  }, [scopedTickets, activeTab]);

  // Dropdown Multi-filters implementation
  const filteredTickets = useMemo(() => {
    const nowTime = Date.now();
    return tabFilteredTickets.filter(t => {
      // Customer
      if (custFilter !== 'All' && t.organization !== custFilter) return false;

      // Consultants
      const allocatedNames = (t.consultantEfforts || []).map(e => e.consultantName);
      if (t.assignedConsultant) allocatedNames.push(t.assignedConsultant);

      if (consFilter !== 'All' && !allocatedNames.includes(consFilter)) return false;

      // Functional Consultant
      const funcAllocated = (t.consultantEfforts || [])
        .filter(e => e.consultantType === 'Functional')
        .map(e => e.consultantName);
      if (funcConsFilter !== 'All' && !funcAllocated.includes(funcConsFilter)) return false;

      // Technical Consultant
      const techAllocated = (t.consultantEfforts || [])
        .filter(e => e.consultantType === 'Technical')
        .map(e => e.consultantName);
      if (techConsFilter !== 'All' && !techAllocated.includes(techConsFilter)) return false;

      // Module
      if (moduleFilter !== 'All' && t.sapModule !== moduleFilter) return false;

      // Priority
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;

      // Status
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;

      // Ticket Type
      if (typeFilter !== 'All' && t.ticketType !== typeFilter) return false;

      // SLA Status
      if (slaFilter !== 'All') {
        const due = new Date(t.slaDueAt).getTime();
        const breached = due < nowTime && t.status !== 'Closed' && t.status !== 'Resolved';
        const warning = !breached && (due - nowTime) > 0 && (due - nowTime) < 24 * 60 * 60 * 1000 && t.status !== 'Closed' && t.status !== 'Resolved';
        if (slaFilter === 'Breached' && !breached) return false;
        if (slaFilter === 'Warning' && !warning) return false;
        if (slaFilter === 'Met' && (breached || warning)) return false;
      }

      // Date Range
      if (dateFilter !== 'All') {
        const createdMs = new Date(t.createdAt).getTime();
        const diffMs = nowTime - createdMs;
        if (dateFilter === '24h' && diffMs > 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '7d' && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '30d' && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
      }

      // Assigned / Unassigned
      const isUnassigned = !t.assignedConsultant && (!t.consultantEfforts || t.consultantEfforts.length === 0);
      if (assignStateFilter === 'Assigned' && isUnassigned) return false;
      if (assignStateFilter === 'Unassigned' && !isUnassigned) return false;

      // Closure Status
      if (closureStateFilter !== 'All') {
        if (closureStateFilter === 'Closed' && t.status !== 'Closed') return false;
        if (closureStateFilter === 'RequestForClosure' && t.status !== 'Request for Closure' && t.status !== 'Awaiting Manager Approval') return false;
        if (closureStateFilter === 'Open' && t.status === 'Closed') return false;
      }

      // Approval Status
      if (approvalStateFilter !== 'All') {
        const hasEstimatePending = t.hourEstimates?.some(e => e.status === 'Submitted') || false;
        const hasActualsPending = t.efforts?.some(e => e.status === 'Pending' || e.status === 'Pending Approval') || false;
        const hasClosurePending = t.closureRequests?.some(c => c.status === 'Pending Manager Approval') || false;
        if (approvalStateFilter === 'PendingEstimates' && !hasEstimatePending) return false;
        if (approvalStateFilter === 'PendingActuals' && !hasActualsPending) return false;
        if (approvalStateFilter === 'PendingClosures' && !hasClosurePending) return false;
        if (approvalStateFilter === 'None' && (hasEstimatePending || hasActualsPending || hasClosurePending)) return false;
      }

      // Search Query
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
  }, [tabFilteredTickets, custFilter, consFilter, funcConsFilter, techConsFilter, moduleFilter, priorityFilter, statusFilter, typeFilter, slaFilter, dateFilter, assignStateFilter, closureStateFilter, approvalStateFilter, searchQuery]);

  // Tab counters
  const tabCounts = useMemo(() => {
    const nowTime = Date.now();
    return {
      all: scopedTickets.length,
      unassigned: scopedTickets.filter(t => !t.assignedConsultant && (!t.consultantEfforts || t.consultantEfforts.length === 0)).length,
      critical: scopedTickets.filter(t => t.priority === 'Critical').length,
      slaBreached: scopedTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && new Date(t.slaDueAt).getTime() < nowTime).length,
      raisedToSap: scopedTickets.filter(t => t.status === 'Raised to SAP' || t.raisedToSap).length,
      customerAction: scopedTickets.filter(t => t.status === 'Customer Action' || t.status === 'Waiting for Customer').length,
      reqClosure: scopedTickets.filter(t => t.status === 'Request for Closure' || t.status === 'Awaiting Manager Approval').length,
      reopened: scopedTickets.filter(t => t.status === 'Reopened').length,
      closed: scopedTickets.filter(t => t.status === 'Closed').length,
      pendingApprovals: scopedTickets.filter(t => 
        (t.hourEstimates?.some(e => e.status === 'Submitted') || false) ||
        (t.efforts?.some(e => e.status === 'Pending' || e.status === 'Pending Approval') || false) ||
        (t.closureRequests?.some(c => c.status === 'Pending Manager Approval') || false) ||
        (t.unlockRequests?.some(u => u.status === 'Pending') || false)
      ).length
    };
  }, [scopedTickets]);

  const resetAllFilters = () => {
    setCustFilter('All');
    setConsFilter('All');
    setFuncConsFilter('All');
    setTechConsFilter('All');
    setModuleFilter('All');
    setPriorityFilter('All');
    setStatusFilter('All');
    setTypeFilter('All');
    setSlaFilter('All');
    setDateFilter('All');
    setAssignStateFilter('All');
    setClosureStateFilter('All');
    setApprovalStateFilter('All');
    setSearchQuery('');
  };

  const toggleSelectTicket = (id: string) => {
    setSelectedTicketIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTicketIds.length === filteredTickets.length) {
      setSelectedTicketIds([]);
    } else {
      setSelectedTicketIds(filteredTickets.map(t => t.id));
    }
  };

  const handleBulkAssign = (consultant: string) => {
    if (!consultant) return;
    selectedTicketIds.forEach(id => {
      assignTicket(id, managerName, consultant, managerName);
    });
    toast.success(`Assigned ${selectedTicketIds.length} tickets to ${consultant}`);
    setSelectedTicketIds([]);
  };

  const handleBulkPriority = (priority: TicketPriority) => {
    selectedTicketIds.forEach(id => {
      updateTicket(id, { priority, updatedAt: new Date().toISOString() });
    });
    toast.success(`Updated priority to ${priority} for ${selectedTicketIds.length} tickets`);
    setSelectedTicketIds([]);
  };

  const handleBulkStatus = (status: TicketStatus) => {
    selectedTicketIds.forEach(id => {
      updateTicketStatus(id, status, managerName);
    });
    toast.success(`Updated status to ${status} for ${selectedTicketIds.length} tickets`);
    setSelectedTicketIds([]);
  };

  const getTicketAgeStr = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Created today';
    if (days === 1) return '1 day old';
    return `${days} days old`;
  };

  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getSLAStatus = (slaDueAt: string, status: string) => {
    if (status === 'Closed' || status === 'Resolved') {
      return { label: 'SLA MET', color: 'text-green-700 bg-green-50 border-green-200' };
    }
    const now = Date.now();
    const due = new Date(slaDueAt).getTime();
    const hoursLeft = (due - now) / (1000 * 60 * 60);

    if (hoursLeft < 0) {
      return { label: 'SLA BREACHED', color: 'text-red-700 bg-red-50 border-red-200' };
    }
    if (hoursLeft < 24) {
      return { label: `SLA WARNING (${Math.round(hoursLeft)}h left)`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    }
    return { label: `SLA MET (${new Date(slaDueAt).toLocaleDateString()})`, color: 'text-zinc-650 bg-zinc-50 border-zinc-200' };
  };

  return (
    <div className="space-y-6 font-mono text-xs text-[#09090b]">
      
      {/* ── HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase text-zinc-950 tracking-wider">Manager Service Desk</h1>
          <p className="text-zinc-500 mt-1">Enterprise Ticket Workspace for monitoring backlogs, resources, SLAs, and closures.</p>
        </div>
        <Link href="/manager/create-ticket" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider transition">
          <Plus size={12} />
          <span>Create On Behalf</span>
        </Link>
      </div>

      {/* ── 10 VIEWS TABS CONSOLE ── */}
      <div className="flex border-b border-zinc-200 overflow-x-auto whitespace-nowrap bg-zinc-50 p-1 rounded-lg border gap-1">
        {([
          { id: 'all', label: 'All Tickets', count: tabCounts.all },
          { id: 'unassigned', label: 'Unassigned', count: tabCounts.unassigned },
          { id: 'critical', label: 'Critical P1s', count: tabCounts.critical },
          { id: 'slaBreached', label: 'SLA Breached', count: tabCounts.slaBreached },
          { id: 'raisedToSap', label: 'OSS SAP', count: tabCounts.raisedToSap },
          { id: 'customerAction', label: 'Waiting Client', count: tabCounts.customerAction },
          { id: 'reqClosure', label: 'Req Closure', count: tabCounts.reqClosure },
          { id: 'reopened', label: 'Reopened', count: tabCounts.reopened },
          { id: 'closed', label: 'Closed', count: tabCounts.closed },
          { id: 'pendingApprovals', label: 'Pending Appr', count: tabCounts.pendingApprovals },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 py-1.5 px-3 font-bold uppercase text-[9px] rounded transition ${
              activeTab === tab.id
                ? 'bg-white text-zinc-955 shadow-sm border border-zinc-200 font-black'
                : 'text-zinc-500 hover:text-zinc-850 hover:bg-zinc-100'
            }`}
          >
            <span>{tab.label}</span>
            <Badge className="bg-zinc-100 text-zinc-800 border border-zinc-200 hover:bg-zinc-200 font-bold px-1 py-0 text-[8px]">
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* ── 12 FILTERS PANEL ── */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
          <div className="flex items-center gap-1.5 font-bold uppercase text-[9px] text-zinc-850">
            <Filter size={11} />
            <span>Operational Filter Console</span>
          </div>
          <button onClick={resetAllFilters} className="text-[9px] font-bold text-red-600 hover:underline uppercase flex items-center gap-1">
            <X size={10} /> Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Customer */}
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-zinc-450 block">Customer</label>
            <select value={custFilter} onChange={e => setCustFilter(e.target.value)} className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none">
              <option value="All">All Customers</option>
              {customersList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Consultant */}
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-zinc-450 block">Any Consultant</label>
            <select value={consFilter} onChange={e => setConsFilter(e.target.value)} className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none">
              <option value="All">All Allocated</option>
              {consultantsList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Functional Consultant */}
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-zinc-450 block">Func Consultant</label>
            <select value={funcConsFilter} onChange={e => setFuncConsFilter(e.target.value)} className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none">
              <option value="All">All Functional</option>
              {functionalConsultantsList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Technical Consultant */}
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-zinc-450 block">Tech Consultant</label>
            <select value={techConsFilter} onChange={e => setTechConsFilter(e.target.value)} className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none">
              <option value="All">All Technical</option>
              {technicalConsultantsList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* SAP Module */}
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-zinc-450 block">SAP Module</label>
            <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none">
              <option value="All">All Modules</option>
              <option value="FICO">FICO</option>
              <option value="MM">MM</option>
              <option value="SD">SD</option>
              <option value="PP">PP</option>
              <option value="BASIS">BASIS</option>
              <option value="ABAP">ABAP</option>
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-zinc-450 block">Priority</label>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none">
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-zinc-450 block">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none">
              <option value="All">All Statuses</option>
              {Object.keys(statusConfig).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Ticket Type */}
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-zinc-450 block">Ticket Type</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none">
              <option value="All">All Types</option>
              <option value="Incident">Incident</option>
              <option value="Service Request">Service Request</option>
              <option value="Change Request">Change Request</option>
            </select>
          </div>

          {/* SLA Status */}
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-zinc-450 block">SLA Status</label>
            <select value={slaFilter} onChange={e => setSlaFilter(e.target.value)} className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none">
              <option value="All">All SLA States</option>
              <option value="Met">SLA Met</option>
              <option value="Warning">SLA Warning</option>
              <option value="Breached">SLA Breached</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-zinc-450 block">Date Range</label>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none">
              <option value="All">All History</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Assigned / Unassigned */}
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-zinc-450 block">Allocation State</label>
            <select value={assignStateFilter} onChange={e => setAssignStateFilter(e.target.value)} className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none">
              <option value="All">All Allocations</option>
              <option value="Assigned">Assigned</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          {/* Closure Status */}
          <div className="space-y-1">
            <label className="text-[8px] font-bold uppercase text-zinc-450 block">Closure State</label>
            <select value={closureStateFilter} onChange={e => setClosureStateFilter(e.target.value)} className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none">
              <option value="All">All Closure States</option>
              <option value="Open">Active / Open</option>
              <option value="RequestForClosure">Request for Closure</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-zinc-100">
          {/* Search bar */}
          <div className="relative w-full md:max-w-md">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Subject, Ticket ID, Description, Consultants..."
              className="w-full bg-white border border-zinc-200 rounded pl-9 pr-4 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono placeholder:text-zinc-400"
            />
          </div>

          {/* View Toggles */}
          <div className="flex bg-zinc-150/70 p-0.5 rounded border border-zinc-250 shrink-0">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded transition ${viewMode === 'card' ? 'bg-white shadow-sm text-zinc-900 font-bold' : 'text-zinc-500 hover:text-zinc-800'}`}
              title="Card Workspace"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded transition ${viewMode === 'compact' ? 'bg-white shadow-sm text-zinc-900 font-bold' : 'text-zinc-500 hover:text-zinc-800'}`}
              title="Compact Service Desk"
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── BULK ACTION CONSOLE ── */}
      {selectedTicketIds.length > 0 && (
        <div className="bg-zinc-950 text-white rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md border border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckSquare size={14} className="text-green-400" />
            <span className="font-bold text-[10px] uppercase tracking-wider">{selectedTicketIds.length} Tickets Selected</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Assign */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase text-zinc-400 font-bold">Assign:</span>
              <select
                onChange={e => { handleBulkAssign(e.target.value); e.target.value = ''; }}
                className="bg-zinc-900 border border-zinc-850 rounded px-1.5 py-0.5 text-[9px] text-white focus:outline-none font-mono"
              >
                <option value="">Select consultant...</option>
                {consultantsList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Priority */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase text-zinc-400 font-bold">Priority:</span>
              <select
                onChange={e => { handleBulkPriority(e.target.value as any); e.target.value = ''; }}
                className="bg-zinc-900 border border-zinc-850 rounded px-1.5 py-0.5 text-[9px] text-white focus:outline-none font-mono"
              >
                <option value="">Select...</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            {/* Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase text-zinc-400 font-bold">Status:</span>
              <select
                onChange={e => { handleBulkStatus(e.target.value as any); e.target.value = ''; }}
                className="bg-zinc-900 border border-zinc-850 rounded px-1.5 py-0.5 text-[9px] text-white focus:outline-none font-mono"
              >
                <option value="">Select...</option>
                <option value="In Progress - Functional">IP Functional</option>
                <option value="In Progress - Technical">IP Technical</option>
                <option value="Waiting for Customer">Wait Client</option>
                <option value="On Hold">On Hold</option>
                <option value="Raised to SAP">Raised to SAP</option>
                <option value="Closed">Force Close</option>
              </select>
            </div>
            {/* Cancel */}
            <button onClick={() => setSelectedTicketIds([])} className="text-[9px] uppercase font-bold text-zinc-400 hover:text-white transition cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── TICKETS WORKSPACE PRESENTATION ── */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 font-bold">Querying tickets registry...</div>
      ) : tickets.length === 0 ? (
        <Card className="border border-zinc-200 rounded-lg p-20 text-center text-zinc-450 italic space-y-2 bg-white">
          <AlertCircle className="mx-auto text-zinc-300 animate-pulse" size={24} />
          <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono">No tickets created yet.</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto font-mono">Create an SAP incident to start tracking support and resolutions.</p>
        </Card>
      ) : filteredTickets.length === 0 ? (
        <Card className="border border-zinc-200 rounded-lg p-20 text-center text-zinc-450 italic space-y-2 bg-white">
          <AlertCircle className="mx-auto text-zinc-300 animate-pulse" size={24} />
          <p className="font-bold uppercase text-[10px]">No Incidents Found</p>
          <p className="text-[9px] text-zinc-400 font-sans">No tickets match the selected filters or active workspace tab.</p>
        </Card>
      ) : viewMode === 'card' ? (
        
        // ── CARD WORKSPACE LAYOUT ──
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((t) => {
            const priorityCfg = priorityConfig[t.priority] || priorityConfig['Low'];
            const statusCfg = statusConfig[t.status] || { label: t.status, color: 'text-zinc-600 bg-zinc-50 border-zinc-200' };
            const slaCfg = getSLAStatus(t.slaDueAt, t.status);

            // Fetch allocations split
            const funcEfforts = (t.consultantEfforts || []).filter(e => e.consultantType === 'Functional');
            const techEfforts = (t.consultantEfforts || []).filter(e => e.consultantType === 'Technical');

            const funcEst = funcEfforts.reduce((acc, e) => acc + e.estimatedHours, 0);
            const techEst = techEfforts.reduce((acc, e) => acc + e.estimatedHours, 0);
            const totalEst = funcEst + techEst;

            const funcAct = funcEfforts.reduce((acc, e) => acc + e.actualHours, 0);
            const techAct = techEfforts.reduce((acc, e) => acc + e.actualHours, 0);
            const totalAct = funcAct + techAct;

            return (
              <Card key={t.id} className="border border-zinc-200 rounded-xl hover:border-zinc-400 transition flex flex-col justify-between shadow-sm overflow-hidden bg-white">
                
                {/* Top Section */}
                <div className="p-4 space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTicketIds.includes(t.id)}
                        onChange={() => toggleSelectTicket(t.id)}
                        className="cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950"
                      />
                      <span className="font-bold text-[10px] text-zinc-950 tracking-wider">{t.id}</span>
                    </div>
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

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[9px] border-t border-b border-zinc-100 py-2">
                    <div className="flex items-center gap-1.5 text-zinc-550 font-bold uppercase">
                      <Building2 size={11} className="text-zinc-450" />
                      <span className="truncate max-w-[100px]">{t.organization}</span>
                    </div>
                    <div className="text-right text-zinc-450 font-semibold">
                      <span>{getTicketAgeStr(t.createdAt)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[8px] text-zinc-450 uppercase block font-bold">Allocated Resources:</span>
                      <div className="mt-0.5 space-y-0.5">
                        {funcEfforts.length > 0 && (
                          <div className="text-[9px] text-zinc-700 truncate">
                            <span className="font-bold text-indigo-700">[F]: </span>
                            {funcEfforts.map(e => e.consultantName).join(', ')}
                          </div>
                        )}
                        {techEfforts.length > 0 && (
                          <div className="text-[9px] text-zinc-700 truncate">
                            <span className="font-bold text-violet-700">[T]: </span>
                            {techEfforts.map(e => e.consultantName).join(', ')}
                          </div>
                        )}
                        {funcEfforts.length === 0 && techEfforts.length === 0 && (
                          <span className="text-zinc-400 italic">No assigned engineers</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hours breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                    <div className="bg-zinc-50 border border-zinc-200 p-1.5 rounded">
                      <span className="text-[8px] text-zinc-450 font-bold uppercase block">Effort Estimates</span>
                      <span className="font-semibold text-zinc-700 block mt-0.5">F: {funcEst}h | T: {techEst}h</span>
                      <span className="font-bold text-zinc-950 block mt-0.5">Total: {totalEst}h</span>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-200 p-1.5 rounded">
                      <span className="text-[8px] text-zinc-450 font-bold uppercase block">Actual Logged</span>
                      <span className="font-semibold text-zinc-700 block mt-0.5">F: {funcAct}h | T: {techAct}h</span>
                      <span className={`font-bold block mt-0.5 ${totalAct > totalEst ? 'text-red-600' : 'text-green-700'}`}>Total: {totalAct}h</span>
                    </div>
                  </div>

                  {/* Rating & Closure Status */}
                  <div className="flex items-center justify-between text-[9px] pt-1">
                    <span className="text-zinc-450 uppercase font-bold">Closure:</span>
                    {t.status === 'Closed' && t.rating ? (
                      <span className="text-green-700 font-bold flex items-center gap-0.5">
                        CSAT: {t.rating.score}/5 <Star size={10} className="fill-green-600 text-green-600" />
                      </span>
                    ) : t.status === 'Closed' ? (
                      <span className="text-zinc-400 italic">No CSAT rating</span>
                    ) : t.status === 'Request for Closure' ? (
                      <span className="text-[#d97706] font-bold animate-pulse">Awaiting Verification</span>
                    ) : (
                      <span className="text-zinc-400">Active development</span>
                    )}
                  </div>

                </div>

                {/* Footer block */}
                <div className="bg-zinc-50 border-t border-zinc-200 py-2.5 px-4 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-zinc-950 text-white hover:bg-zinc-900 text-[8px] py-0 px-1 border-none font-bold uppercase">
                      {t.sapModule}
                    </Badge>
                    <span className={`px-1.5 py-0.2 rounded font-bold border text-[8px] uppercase ${slaCfg.color}`}>
                      {slaCfg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400 text-[8px]" title="Last Updated">
                      Updated {relativeTime(t.updatedAt)}
                    </span>
                    
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
                          <Link href={`/manager/tickets/${t.id}#assignments`}>
                            <Users size={12} className="mr-1.5" /> Manage Allocations
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="cursor-pointer font-semibold"
                          onClick={() => { updateTicketStatus(t.id, 'In Progress - Functional', managerName); }}
                        >
                          Start functional
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer font-semibold"
                          onClick={() => { updateTicketStatus(t.id, 'In Progress - Technical', managerName); }}
                        >
                          Start technical
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
                          Force close
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
        
        // ── COMPACT SERVICE DESK TABLE ──
        <Card className="border border-zinc-200 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[9px]">
                  <th className="py-2.5 px-4 font-bold text-center w-8">
                    <input
                      type="checkbox"
                      checked={selectedTicketIds.length === filteredTickets.length && filteredTickets.length > 0}
                      onChange={toggleSelectAll}
                      className="cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950"
                    />
                  </th>
                  <th className="py-2.5 px-4 font-bold">Ticket ID</th>
                  <th className="py-2.5 px-4 font-bold">Customer</th>
                  <th className="py-2.5 px-4 font-bold">Subject / Title</th>
                  <th className="py-2.5 px-4 font-bold text-center">Module</th>
                  <th className="py-2.5 px-4 font-bold text-center">Priority</th>
                  <th className="py-2.5 px-4 font-bold text-center">Status</th>
                  <th className="py-2.5 px-4 font-bold text-center">Age</th>
                  <th className="py-2.5 px-4 font-bold">Allocated Resources</th>
                  <th className="py-2.5 px-4 font-bold text-center">Estimates</th>
                  <th className="py-2.5 px-4 font-bold text-center">Actuals</th>
                  <th className="py-2.5 px-4 font-bold text-center">SLA Health</th>
                  <th className="py-2.5 px-4 font-bold text-center">Rating</th>
                  <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {filteredTickets.map((t) => {
                  const statusCfg = statusConfig[t.status] || { label: t.status, color: 'text-zinc-650 bg-zinc-50 border-zinc-200' };
                  const priorityCfg = priorityConfig[t.priority] || priorityConfig['Low'];
                  const slaCfg = getSLAStatus(t.slaDueAt, t.status);

                  const funcEfforts = (t.consultantEfforts || []).filter(e => e.consultantType === 'Functional');
                  const techEfforts = (t.consultantEfforts || []).filter(e => e.consultantType === 'Technical');

                  const funcEst = funcEfforts.reduce((acc, e) => acc + e.estimatedHours, 0);
                  const techEst = techEfforts.reduce((acc, e) => acc + e.estimatedHours, 0);
                  const totalEst = funcEst + techEst;

                  const funcAct = funcEfforts.reduce((acc, e) => acc + e.actualHours, 0);
                  const techAct = techEfforts.reduce((acc, e) => acc + e.actualHours, 0);
                  const totalAct = funcAct + techAct;

                  return (
                    <tr key={t.id} className={`hover:bg-zinc-50/50 transition ${selectedTicketIds.includes(t.id) ? 'bg-zinc-50' : ''}`}>
                      <td className="py-2.5 px-4 text-center w-8">
                        <input
                          type="checkbox"
                          checked={selectedTicketIds.includes(t.id)}
                          onChange={() => toggleSelectTicket(t.id)}
                          className="cursor-pointer rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950"
                        />
                      </td>
                      <td className="py-2.5 px-4 font-bold text-zinc-950">
                        <Link href={`/manager/tickets/${t.id}`} className="hover:underline">{t.id}</Link>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-zinc-650 truncate max-w-[100px]" title={t.organization}>
                        {t.organization}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-zinc-900 max-w-[180px] truncate" title={t.title}>
                        <Link href={`/manager/tickets/${t.id}`} className="hover:underline">{t.title}</Link>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge className="bg-zinc-100 text-zinc-700 border-none font-bold text-[8px] py-0 px-1 uppercase">
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
                        <span className={`inline-block px-1.5 py-0.2 rounded border text-[8px] font-bold uppercase ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center text-zinc-500 whitespace-nowrap">
                        {getTicketAgeStr(t.createdAt)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-zinc-600 text-[10px]">
                        <div className="space-y-0.5 max-w-[150px] truncate">
                          {funcEfforts.length > 0 && <div className="truncate"><span className="font-bold text-indigo-700">[F] </span>{funcEfforts.map(e => e.consultantName).join(', ')}</div>}
                          {techEfforts.length > 0 && <div className="truncate"><span className="font-bold text-violet-700">[T] </span>{techEfforts.map(e => e.consultantName).join(', ')}</div>}
                          {funcEfforts.length === 0 && techEfforts.length === 0 && <span className="text-zinc-400 italic">None</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center text-zinc-650 whitespace-nowrap">
                        {totalEst}h (F:{funcEst}/T:{techEst})
                      </td>
                      <td className={`py-2.5 px-4 text-center whitespace-nowrap font-bold ${totalAct > totalEst ? 'text-red-600' : 'text-green-700'}`}>
                        {totalAct}h (F:{funcAct}/T:{techAct})
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-1.5 py-0.2 rounded font-bold border text-[8px] uppercase ${slaCfg.color}`}>
                          {slaCfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {t.status === 'Closed' && t.rating ? (
                          <span className="text-green-700 font-bold flex items-center justify-center gap-0.5">
                            {t.rating.score}/5 <Star size={10} className="fill-green-600 text-green-600" />
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-normal italic">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Link href={`/manager/tickets/${t.id}`} className="p-1 border border-zinc-200 hover:border-zinc-950 bg-white text-zinc-800 rounded transition" title="Inspect detail">
                            <Eye size={12} />
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
