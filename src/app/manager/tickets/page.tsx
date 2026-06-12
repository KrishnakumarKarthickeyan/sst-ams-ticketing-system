'use client';

import React, { useState, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TicketFilterPanel } from '../../../components/tickets/TicketFilterPanel';
import { toast } from 'sonner';
import { BrandedLogo } from '../../../components/ui/BrandedLogo';
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
import { statusConfig, priorityConfig } from '../../../lib/status-theme';



export default function ManagerTicketsPage() {
  const { tickets, loading, updateTicketStatus, assignTicket, updateTicket, profiles, contracts, orgMap } = useTickets();
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
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [assignStateFilter, setAssignStateFilter] = useState('All');
  const [closureStateFilter, setClosureStateFilter] = useState('All');
  const [approvalStateFilter, setApprovalStateFilter] = useState('All');

  // Base Scoped Tickets for the Manager
  const scopedTickets = useMemo(() => {
    return tickets.filter(t => {
      if (user?.company && user.company !== 'Assist360 Operations') {
        return t.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  // Unique Lists for Dropdown Options
  const customersList = useMemo(() => {
    const list = new Set<string>();
    (contracts || []).forEach(c => {
      if (c.organizationName) list.add(c.organizationName);
    });
    (profiles || [])
      .filter(p => p.role === 'Customer')
      .forEach(p => {
        const orgName = orgMap[p.organization_id] || p.organization || (p.organizations as any)?.name;
        if (orgName) list.add(orgName);
      });
    scopedTickets.forEach(t => {
      if (t.organization) list.add(t.organization);
    });
    return Array.from(list).filter(Boolean).sort();
  }, [contracts, profiles, orgMap, scopedTickets]);

  const consultantsList = useMemo(() => {
    const list = new Set<string>();
    (profiles || [])
      .filter(p => p.role === 'Consultant' && p.full_name)
      .forEach(p => list.add(p.full_name));
    scopedTickets.forEach(t => {
      if (t.assignedConsultant) list.add(t.assignedConsultant);
      (t.consultantEfforts || []).forEach(e => {
        if (e.consultantName) list.add(e.consultantName);
      });
    });
    return Array.from(list).filter(Boolean).sort();
  }, [profiles, scopedTickets]);

  const functionalConsultantsList = useMemo(() => {
    const list = new Set<string>();
    (profiles || [])
      .filter(p => p.role === 'Consultant' && p.consultant_type === 'Functional' && p.full_name)
      .forEach(p => list.add(p.full_name));
    scopedTickets.forEach(t => {
      (t.consultantEfforts || []).forEach(e => {
        if (e.consultantType === 'Functional' && e.consultantName) list.add(e.consultantName);
      });
    });
    return Array.from(list).filter(Boolean).sort();
  }, [profiles, scopedTickets]);

  const technicalConsultantsList = useMemo(() => {
    const list = new Set<string>();
    (profiles || [])
      .filter(p => p.role === 'Consultant' && p.consultant_type === 'Technical' && p.full_name)
      .forEach(p => list.add(p.full_name));
    scopedTickets.forEach(t => {
      (t.consultantEfforts || []).forEach(e => {
        if (e.consultantType === 'Technical' && e.consultantName) list.add(e.consultantName);
      });
    });
    return Array.from(list).filter(Boolean).sort();
  }, [profiles, scopedTickets]);

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
        const created = new Date(t.createdAt);
        const createdMs = created.getTime();
        const diffMs = nowTime - createdMs;
        
        if (dateFilter === '24h' && diffMs > 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '7d' && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '30d' && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
        
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
          (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q)) ||
          t.title.toLowerCase().includes(q) ||
          t.organization.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.assignedConsultant || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [tabFilteredTickets, custFilter, consFilter, funcConsFilter, techConsFilter, moduleFilter, priorityFilter, statusFilter, typeFilter, slaFilter, dateFilter, customStartDate, customEndDate, assignStateFilter, closureStateFilter, approvalStateFilter, searchQuery]);

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
    return { label: `SLA MET (${new Date(slaDueAt).toLocaleDateString()})`, color: 'text-ink-secondary bg-surface-muted border-line' };
  };

  return (
    <div className="space-y-6 text-xs text-ink">
      
      {/* ── HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="type-title text-ink">Manager Service Desk</h1>
          <p className="text-ink-secondary mt-1">Enterprise Ticket Workspace for monitoring backlogs, resources, SLAs, and closures.</p>
        </div>
        <Link href="/manager/create-ticket" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink hover:bg-zinc-800 text-white rounded font-bold uppercase text-[11px] tracking-wider transition">
          <Plus size={12} />
          <span>Create On Behalf</span>
        </Link>
      </div>

      {/* ── 10 VIEWS TABS CONSOLE ── */}
      <div className="flex border-b border-line overflow-x-auto whitespace-nowrap bg-surface-muted p-1 rounded-lg border gap-1">
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
            className={`flex items-center gap-1.5 py-1.5 px-3 font-bold uppercase text-[11px] rounded transition ${
              activeTab === tab.id
                ? 'bg-surface text-ink shadow-card border border-line font-black'
                : 'text-ink-secondary hover:text-ink hover:bg-surface-subtle'
            }`}
          >
            <span>{tab.label}</span>
            <Badge className="bg-surface-subtle text-ink border border-line hover:bg-surface-subtle font-bold px-1 py-0 text-[11px]">
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Search & View Toggles Row */}
      <div className="bg-surface border border-line rounded-lg p-3 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search bar */}
        <div className="relative w-full md:max-w-md">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Subject, Ticket ID, Description, Consultants..."
            className="w-full bg-surface border border-line rounded pl-9 pr-4 py-1.5 text-xs text-ink focus:outline-none focus:border-brand placeholder:text-ink-muted"
          />
        </div>

        {/* View Toggles */}
        <div className="flex bg-surface-subtle/70 p-0.5 rounded border border-line shrink-0">
          <button
            onClick={() => setViewMode('card')}
            className={`p-1.5 rounded transition ${viewMode === 'card' ? 'bg-surface shadow-card text-ink font-bold' : 'text-ink-secondary hover:text-ink'}`}
            title="Card Workspace"
          >
            <LayoutGrid size={13} />
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`p-1.5 rounded transition ${viewMode === 'compact' ? 'bg-surface shadow-card text-ink font-bold' : 'text-ink-secondary hover:text-ink'}`}
            title="Compact Service Desk"
          >
            <List size={13} />
          </button>
        </div>
      </div>

      {/* ── 12 FILTERS PANEL ── */}
      <TicketFilterPanel
        enabledFilters={[
          'customer',
          'consultant',
          'functionalConsultant',
          'technicalConsultant',
          'module',
          'priority',
          'status',
          'type',
          'sla',
          'dateSelect',
          'assignState',
          'closureState'
        ]}
        customerFilter={custFilter}
        setCustomerFilter={setCustFilter}
        consultantFilter={consFilter}
        setConsultantFilter={setConsFilter}
        functionalConsultantFilter={funcConsFilter}
        setFunctionalConsultantFilter={setFuncConsFilter}
        technicalConsultantFilter={techConsFilter}
        setTechnicalConsultantFilter={setTechConsFilter}
        moduleFilter={moduleFilter}
        setModuleFilter={setModuleFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        slaFilter={slaFilter}
        setSlaFilter={setSlaFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        startDateFilter={customStartDate}
        setStartDateFilter={setCustomStartDate}
        endDateFilter={customEndDate}
        setEndDateFilter={setCustomEndDate}
        assignStateFilter={assignStateFilter}
        setAssignStateFilter={setAssignStateFilter}
        closureStateFilter={closureStateFilter}
        setClosureStateFilter={setClosureStateFilter}
        onResetFilters={resetAllFilters}
      />

      {/* ── BULK ACTION CONSOLE ── */}
      {selectedTicketIds.length > 0 && (
        <div className="bg-ink text-white rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md border border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckSquare size={14} className="text-green-400" />
            <span className="font-bold text-[11px] uppercase tracking-wider">{selectedTicketIds.length} Tickets Selected</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Assign */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] uppercase text-ink-muted font-bold">Assign:</span>
              <select
                onChange={e => { handleBulkAssign(e.target.value); e.target.value = ''; }}
                className="bg-ink border border-zinc-850 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none"
              >
                <option value="">Select consultant...</option>
                {consultantsList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Priority */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] uppercase text-ink-muted font-bold">Priority:</span>
              <select
                onChange={e => { handleBulkPriority(e.target.value as any); e.target.value = ''; }}
                className="bg-ink border border-zinc-850 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none"
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
              <span className="text-[11px] uppercase text-ink-muted font-bold">Status:</span>
              <select
                onChange={e => { handleBulkStatus(e.target.value as any); e.target.value = ''; }}
                className="bg-ink border border-zinc-850 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none"
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
            <button onClick={() => setSelectedTicketIds([])} className="text-[11px] uppercase font-bold text-ink-muted hover:text-white transition cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── TICKETS WORKSPACE PRESENTATION ── */}
      {loading ? (
        <div className="py-20 text-center text-ink-secondary font-bold">Querying tickets registry...</div>
      ) : tickets.length === 0 ? (
        <Card className="border border-line rounded-lg p-20 text-center text-ink-muted italic space-y-4 bg-surface flex flex-col items-center justify-center">
          <BrandedLogo width={28} height={28} iconOnly={true} className="opacity-45" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider">No tickets created yet.</h3>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto">Create an SAP incident to start tracking support and resolutions.</p>
          </div>
        </Card>
      ) : filteredTickets.length === 0 ? (
        <Card className="border border-line rounded-lg p-20 text-center text-ink-muted italic space-y-4 bg-surface flex flex-col items-center justify-center">
          <BrandedLogo width={28} height={28} iconOnly={true} className="opacity-45" />
          <div className="space-y-1">
            <p className="font-bold uppercase text-[11px] text-ink tracking-wider">No Incidents Found</p>
            <p className="text-[11px] text-ink-muted">No tickets match the selected filters or active workspace tab.</p>
          </div>
        </Card>
      ) : viewMode === 'card' ? (
        
        // ── CARD WORKSPACE LAYOUT ──
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((t) => {
            const priorityCfg = priorityConfig[t.priority] || priorityConfig['Low'];
            const statusCfg = statusConfig[t.status] || { label: t.status, color: 'text-ink-secondary bg-surface-muted border-line' };
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
              <Card key={t.id} className="border border-line rounded-lg hover:border-line-strong transition flex flex-col justify-between shadow-card overflow-hidden bg-surface">
                
                {/* Top Section */}
                <div className="p-4 space-y-3.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTicketIds.includes(t.id)}
                        onChange={() => toggleSelectTicket(t.id)}
                        className="cursor-pointer rounded border-line-strong text-ink focus:ring-brand/30"
                      />
                      <span className="font-bold text-[11px] text-ink tracking-wider">{t.ticketNumber || t.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded border text-[11px] font-bold uppercase ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full border text-[11px] font-bold ${priorityCfg.color}`}>
                        <span className={`w-1 h-1 rounded-full ${priorityCfg.dot}`} />
                        {priorityCfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-xs text-ink leading-snug line-clamp-2 hover:underline">
                      <Link href={`/manager/tickets/${t.id}`}>{t.title}</Link>
                    </h3>
                    <p className="text-[11px] text-ink-secondary line-clamp-2 leading-relaxed" title={t.description}>
                      {t.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] border-t border-b border-line py-2">
                    <div className="flex items-center gap-1.5 text-ink-secondary font-bold uppercase">
                      <Building2 size={11} className="text-ink-muted" />
                      <span className="truncate max-w-[100px]">{t.organization}</span>
                    </div>
                    <div className="text-right text-ink-muted font-semibold">
                      <span>{getTicketAgeStr(t.createdAt)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[11px] text-ink-muted uppercase block font-bold">Allocated Resources:</span>
                      <div className="mt-0.5 space-y-0.5">
                        {funcEfforts.length > 0 && (
                          <div className="text-[11px] text-ink-secondary truncate">
                            <span className="font-bold text-indigo-700">[F]: </span>
                            {funcEfforts.map(e => e.consultantName).join(', ')}
                          </div>
                        )}
                        {techEfforts.length > 0 && (
                          <div className="text-[11px] text-ink-secondary truncate">
                            <span className="font-bold text-violet-700">[T]: </span>
                            {techEfforts.map(e => e.consultantName).join(', ')}
                          </div>
                        )}
                        {funcEfforts.length === 0 && techEfforts.length === 0 && (
                          <span className="text-ink-muted italic">No assigned engineers</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hours breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-surface-muted border border-line p-1.5 rounded">
                      <span className="text-[11px] text-ink-muted font-bold uppercase block">Effort Estimates</span>
                      <span className="font-semibold text-ink-secondary block mt-0.5">F: {funcEst}h | T: {techEst}h</span>
                      <span className="font-bold text-ink block mt-0.5">Total: {totalEst}h</span>
                    </div>
                    <div className="bg-surface-muted border border-line p-1.5 rounded">
                      <span className="text-[11px] text-ink-muted font-bold uppercase block">Actual Logged</span>
                      <span className="font-semibold text-ink-secondary block mt-0.5">F: {funcAct}h | T: {techAct}h</span>
                      <span className={`font-bold block mt-0.5 ${totalAct > totalEst ? 'text-critical' : 'text-green-700'}`}>Total: {totalAct}h</span>
                    </div>
                  </div>

                  {/* Closure Status */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-ink-muted uppercase font-bold">Closure:</span>
                    {t.status === 'Closed' ? (
                      <span className="text-ink-secondary font-bold">Closed</span>
                    ) : t.status === 'Request for Closure' ? (
                      <span className="text-warning font-bold animate-pulse">Awaiting Verification</span>
                    ) : (
                      <span className="text-ink-muted">Active development</span>
                    )}
                  </div>

                </div>

                {/* Footer block */}
                <div className="bg-surface-muted border-t border-line py-2.5 px-4 flex items-center justify-between text-[11px] text-ink-secondary">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-ink text-white hover:bg-ink text-[11px] py-0 px-1 border-none font-bold uppercase">
                      {t.sapModule}
                    </Badge>
                    <span className={`px-1.5 py-0.2 rounded font-bold border text-[11px] uppercase ${slaCfg.color}`}>
                      {slaCfg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-ink-muted text-[11px]" title="Last Updated">
                      Updated {relativeTime(t.updatedAt)}
                    </span>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-ink-secondary cursor-pointer">
                          <MoreHorizontal size={13} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-[11px]">
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
                          className="cursor-pointer font-bold text-critical focus:text-red-700"
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
        <Card className="border border-line shadow-card overflow-hidden bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted border-b border-line text-ink-secondary font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-4 font-bold text-center w-8">
                    <input
                      type="checkbox"
                      checked={selectedTicketIds.length === filteredTickets.length && filteredTickets.length > 0}
                      onChange={toggleSelectAll}
                      className="cursor-pointer rounded border-line-strong text-ink focus:ring-brand/30"
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
                  <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[11px]">
                {filteredTickets.map((t) => {
                  const statusCfg = statusConfig[t.status] || { label: t.status, color: 'text-ink-secondary bg-surface-muted border-line' };
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
                    <tr key={t.id} className={`hover:bg-surface-muted/60 transition ${selectedTicketIds.includes(t.id) ? 'bg-surface-muted' : ''}`}>
                      <td className="py-2.5 px-4 text-center w-8">
                        <input
                          type="checkbox"
                          checked={selectedTicketIds.includes(t.id)}
                          onChange={() => toggleSelectTicket(t.id)}
                          className="cursor-pointer rounded border-line-strong text-ink focus:ring-brand/30"
                        />
                      </td>
                      <td className="py-2.5 px-4 font-bold text-ink">
                        <Link href={`/manager/tickets/${t.id}`} className="hover:underline">{t.ticketNumber || t.id}</Link>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-ink-secondary truncate max-w-[100px]" title={t.organization}>
                        {t.organization}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-ink max-w-[180px] truncate" title={t.title}>
                        <Link href={`/manager/tickets/${t.id}`} className="hover:underline">{t.title}</Link>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge className="bg-surface-subtle text-ink-secondary border-none font-bold text-[11px] py-0 px-1 uppercase">
                          {t.sapModule}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                          <span className="text-[11px] font-semibold text-ink-secondary">{t.priority}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block px-1.5 py-0.2 rounded border text-[11px] font-bold uppercase ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center text-ink-secondary whitespace-nowrap">
                        {getTicketAgeStr(t.createdAt)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-ink-secondary text-[11px]">
                        <div className="space-y-0.5 max-w-[150px] truncate">
                          {funcEfforts.length > 0 && <div className="truncate"><span className="font-bold text-indigo-700">[F] </span>{funcEfforts.map(e => e.consultantName).join(', ')}</div>}
                          {techEfforts.length > 0 && <div className="truncate"><span className="font-bold text-violet-700">[T] </span>{techEfforts.map(e => e.consultantName).join(', ')}</div>}
                          {funcEfforts.length === 0 && techEfforts.length === 0 && <span className="text-ink-muted italic">None</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center text-ink-secondary whitespace-nowrap">
                        {totalEst}h (F:{funcEst}/T:{techEst})
                      </td>
                      <td className={`py-2.5 px-4 text-center whitespace-nowrap font-bold ${totalAct > totalEst ? 'text-critical' : 'text-green-700'}`}>
                        {totalAct}h (F:{funcAct}/T:{techAct})
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-1.5 py-0.2 rounded font-bold border text-[11px] uppercase ${slaCfg.color}`}>
                          {slaCfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Link href={`/manager/tickets/${t.id}`} className="p-1 border border-line hover:border-line-strong bg-surface text-ink rounded transition" title="Inspect detail">
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
