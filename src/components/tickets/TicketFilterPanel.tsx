'use client';

import React, { useMemo } from 'react';
import { useTickets } from '../../context/TicketContext';
import { SAPModule, TicketStatus, TicketPriority } from '../../types/ticket';
import { Filter, Calendar } from 'lucide-react';
import { Button } from '../ui/button';

export interface TicketFilterPanelProps {
  enabledFilters: Array<
    | 'dateRange'
    | 'month'
    | 'quarter'
    | 'year'
    | 'customer'
    | 'consultant'
    | 'manager'
    | 'module'
    | 'status'
    | 'priority'
    | 'type'
    | 'scope'
    | 'sla'
    | 'functionalConsultant'
    | 'technicalConsultant'
    | 'dateSelect'
    | 'assignState'
    | 'closureState'
    | 'approvalState'
  >;

  // Filter values & setters
  startDateFilter?: string;
  setStartDateFilter?: (val: string) => void;
  endDateFilter?: string;
  setEndDateFilter?: (val: string) => void;
  dateFilter?: string;
  setDateFilter?: (val: string) => void;
  yearFilter?: string;
  setYearFilter?: (val: string) => void;
  monthFilter?: string;
  setMonthFilter?: (val: string) => void;
  quarterFilter?: string;
  setQuarterFilter?: (val: string) => void;
  customerFilter?: string;
  setCustomerFilter?: (val: string) => void;
  consultantFilter?: string;
  setConsultantFilter?: (val: string) => void;
  managerFilter?: string;
  setManagerFilter?: (val: string) => void;
  moduleFilter?: string;
  setModuleFilter?: (val: string) => void;
  statusFilter?: string;
  setStatusFilter?: (val: string) => void;
  priorityFilter?: string;
  setPriorityFilter?: (val: string) => void;
  typeFilter?: string;
  setTypeFilter?: (val: string) => void;
  scopeFilter?: string;
  setScopeFilter?: (val: string) => void;
  slaFilter?: string;
  setSlaFilter?: (val: string) => void;
  functionalConsultantFilter?: string;
  setFunctionalConsultantFilter?: (val: string) => void;
  technicalConsultantFilter?: string;
  setTechnicalConsultantFilter?: (val: string) => void;
  assignStateFilter?: string;
  setAssignStateFilter?: (val: string) => void;
  closureStateFilter?: string;
  setClosureStateFilter?: (val: string) => void;
  approvalStateFilter?: string;
  setApprovalStateFilter?: (val: string) => void;
  
  onResetFilters?: () => void;
}

export const TicketFilterPanel: React.FC<TicketFilterPanelProps> = ({
  enabledFilters,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  dateFilter,
  setDateFilter,
  yearFilter,
  setYearFilter,
  monthFilter,
  setMonthFilter,
  quarterFilter,
  setQuarterFilter,
  customerFilter,
  setCustomerFilter,
  consultantFilter,
  setConsultantFilter,
  managerFilter,
  setManagerFilter,
  moduleFilter,
  setModuleFilter,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  typeFilter,
  setTypeFilter,
  scopeFilter,
  setScopeFilter,
  slaFilter,
  setSlaFilter,
  functionalConsultantFilter,
  setFunctionalConsultantFilter,
  technicalConsultantFilter,
  setTechnicalConsultantFilter,
  assignStateFilter,
  setAssignStateFilter,
  closureStateFilter,
  setClosureStateFilter,
  approvalStateFilter,
  setApprovalStateFilter,
  onResetFilters
}) => {
  const { tickets, profiles } = useTickets();

  // Derive dynamic list options from database tickets & profiles
  const customerOrgsList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.organization))).filter(Boolean).sort();
  }, [tickets]);

  const managersProfilesList = useMemo(() => {
    return Array.from(new Set(profiles.filter(p => p.role === 'Manager').map(p => p.full_name || p.email))).sort();
  }, [profiles]);

  const consultantsProfilesList = useMemo(() => {
    return Array.from(new Set(profiles.filter(p => p.role === 'Consultant').map(p => p.full_name || p.email))).sort();
  }, [profiles]);

  const functionalConsultantsList = useMemo(() => {
    return Array.from(new Set(profiles.filter(p => p.role === 'Consultant' && p.consultant_type === 'Functional').map(p => p.full_name || p.email))).sort();
  }, [profiles]);

  const technicalConsultantsList = useMemo(() => {
    return Array.from(new Set(profiles.filter(p => p.role === 'Consultant' && p.consultant_type === 'Technical').map(p => p.full_name || p.email))).sort();
  }, [profiles]);

  const modulesList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.sapModule))).filter(Boolean).sort();
  }, [tickets]);

  const statusList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.status))).filter(Boolean).sort();
  }, [tickets]);

  const typesList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.ticketType))).filter(Boolean).sort();
  }, [tickets]);

  const showFilter = (name: typeof enabledFilters[number]) => enabledFilters.includes(name);

  const handleReset = () => {
    if (onResetFilters) {
      onResetFilters();
      return;
    }
    // Fallback resets if setters exist
    if (setStartDateFilter) setStartDateFilter('');
    if (setEndDateFilter) setEndDateFilter('');
    if (setDateFilter) setDateFilter('All');
    if (setYearFilter) setYearFilter('All');
    if (setMonthFilter) setMonthFilter('All');
    if (setQuarterFilter) setQuarterFilter('All');
    if (setCustomerFilter) setCustomerFilter('All');
    if (setConsultantFilter) setConsultantFilter('All');
    if (setManagerFilter) setManagerFilter('All');
    if (setModuleFilter) setModuleFilter('All');
    if (setStatusFilter) setStatusFilter('All');
    if (setPriorityFilter) setPriorityFilter('All');
    if (setTypeFilter) setTypeFilter('All');
    if (setScopeFilter) setScopeFilter('All');
    if (setSlaFilter) setSlaFilter('All');
    if (setFunctionalConsultantFilter) setFunctionalConsultantFilter('All');
    if (setTechnicalConsultantFilter) setTechnicalConsultantFilter('All');
    if (setAssignStateFilter) setAssignStateFilter('All');
    if (setClosureStateFilter) setClosureStateFilter('All');
    if (setApprovalStateFilter) setApprovalStateFilter('All');
  };

  return (
    <div className="bg-surface-muted border border-line shadow-card rounded-lg p-4 text-xs">
      <div className="flex items-center justify-between border-b border-line pb-2.5 mb-4">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-ink-secondary" />
          <span className="font-bold text-ink uppercase">Filters Desk</span>
        </div>
        <Button
          variant="ghost"
          onClick={handleReset}
          className="h-6 text-[11px] uppercase font-bold text-ink-secondary hover:text-ink cursor-pointer"
        >
          Reset Filters
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Date Select Option */}
        {showFilter('dateSelect') && setDateFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Time Period</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="current-month">Current Month</option>
              <option value="current-quarter">Current Quarter</option>
              <option value="current-year">Current Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
        )}

        {/* Start Date */}
        {showFilter('dateRange') && setStartDateFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Start Date</span>
            <div className="relative">
              <input
                type="date"
                value={startDateFilter || ''}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full h-8 border border-line rounded pl-2 pr-6 text-[11px] bg-surface text-ink-secondary outline-none focus:border-zinc-400"
              />
              <Calendar size={11} className="absolute right-2 top-2.5 text-ink-muted pointer-events-none" />
            </div>
          </div>
        )}

        {/* End Date */}
        {showFilter('dateRange') && setEndDateFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">End Date</span>
            <div className="relative">
              <input
                type="date"
                value={endDateFilter || ''}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full h-8 border border-line rounded pl-2 pr-6 text-[11px] bg-surface text-ink-secondary outline-none focus:border-zinc-400"
              />
              <Calendar size={11} className="absolute right-2 top-2.5 text-ink-muted pointer-events-none" />
            </div>
          </div>
        )}

        {/* Year */}
        {showFilter('year') && setYearFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Year</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Years</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
        )}

        {/* Month */}
        {showFilter('month') && setMonthFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Month</span>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Months</option>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* Quarter */}
        {showFilter('quarter') && setQuarterFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Quarter</span>
            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Quarters</option>
              <option value="Q1">Q1 (Jan-Mar)</option>
              <option value="Q2">Q2 (Apr-Jun)</option>
              <option value="Q3">Q3 (Jul-Sep)</option>
              <option value="Q4">Q4 (Oct-Dec)</option>
            </select>
          </div>
        )}

        {/* Customer */}
        {showFilter('customer') && setCustomerFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Customer</span>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Customers</option>
              {customerOrgsList.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>
        )}

        {/* Consultant */}
        {showFilter('consultant') && setConsultantFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Consultant</span>
            <select
              value={consultantFilter}
              onChange={(e) => setConsultantFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Consultants</option>
              {consultantsProfilesList.map(cons => (
                <option key={cons} value={cons}>{cons}</option>
              ))}
            </select>
          </div>
        )}

        {/* Functional Consultant */}
        {showFilter('functionalConsultant') && setFunctionalConsultantFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Functional Cons.</span>
            <select
              value={functionalConsultantFilter}
              onChange={(e) => setFunctionalConsultantFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Functional</option>
              {functionalConsultantsList.map(cons => (
                <option key={cons} value={cons}>{cons}</option>
              ))}
            </select>
          </div>
        )}

        {/* Technical Consultant */}
        {showFilter('technicalConsultant') && setTechnicalConsultantFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Technical Cons.</span>
            <select
              value={technicalConsultantFilter}
              onChange={(e) => setTechnicalConsultantFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Technical</option>
              {technicalConsultantsList.map(cons => (
                <option key={cons} value={cons}>{cons}</option>
              ))}
            </select>
          </div>
        )}

        {/* Manager */}
        {showFilter('manager') && setManagerFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Manager</span>
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Managers</option>
              {managersProfilesList.map(mgr => (
                <option key={mgr} value={mgr}>{mgr}</option>
              ))}
            </select>
          </div>
        )}

        {/* Module */}
        {showFilter('module') && setModuleFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">SAP Module</span>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Modules</option>
              {modulesList.map(mod => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status */}
        {showFilter('status') && setStatusFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              {statusList.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        )}

        {/* Priority */}
        {showFilter('priority') && setPriorityFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Priority</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        )}

        {/* Type */}
        {showFilter('type') && setTypeFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Ticket Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Types</option>
              {typesList.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}

        {/* Scope */}
        {showFilter('scope') && setScopeFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Classification</span>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Classifications</option>
              <option value="Functional">Functional</option>
              <option value="Technical">Technical</option>
            </select>
          </div>
        )}

        {/* SLA */}
        {showFilter('sla') && setSlaFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">SLA Status</span>
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All SLA Statuses</option>
              <option value="Breached">Breached</option>
              <option value="Active">Active / On Track</option>
            </select>
          </div>
        )}

        {/* Allocation State */}
        {showFilter('assignState') && setAssignStateFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Allocation State</span>
            <select
              value={assignStateFilter}
              onChange={(e) => setAssignStateFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Allocations</option>
              <option value="Assigned">Assigned</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>
        )}

        {/* Closure State */}
        {showFilter('closureState') && setClosureStateFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Closure State</span>
            <select
              value={closureStateFilter}
              onChange={(e) => setClosureStateFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Closure States</option>
              <option value="Open">Active / Open</option>
              <option value="RequestForClosure">Request for Closure</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        )}

        {/* Approval State */}
        {showFilter('approvalState') && setApprovalStateFilter && (
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Approval State</span>
            <select
              value={approvalStateFilter}
              onChange={(e) => setApprovalStateFilter(e.target.value)}
              className="w-full h-8 border border-line bg-surface rounded px-2 text-[11px] text-ink-secondary outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="All">All Approvals</option>
              <option value="PendingEstimates">Pending Estimates</option>
              <option value="PendingActuals">Pending Actuals</option>
              <option value="PendingClosures">Pending Closures</option>
              <option value="None">None</option>
            </select>
          </div>
        )}
      </div>

      {/* Render Custom Date inputs inline if dateFilter === 'custom' */}
      {showFilter('dateSelect') && dateFilter === 'custom' && setStartDateFilter && setEndDateFilter && (
        <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-4 max-w-md">
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Custom Start Date</span>
            <div className="relative">
              <input
                type="date"
                value={startDateFilter || ''}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full h-8 border border-line rounded pl-2 pr-6 text-[11px] bg-surface text-ink-secondary outline-none focus:border-zinc-400"
              />
              <Calendar size={11} className="absolute right-2 top-2.5 text-ink-muted pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1 flex flex-col">
            <span className="text-[11px] font-bold text-ink-muted uppercase">Custom End Date</span>
            <div className="relative">
              <input
                type="date"
                value={endDateFilter || ''}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full h-8 border border-line rounded pl-2 pr-6 text-[11px] bg-surface text-ink-secondary outline-none focus:border-zinc-400"
              />
              <Calendar size={11} className="absolute right-2 top-2.5 text-ink-muted pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
