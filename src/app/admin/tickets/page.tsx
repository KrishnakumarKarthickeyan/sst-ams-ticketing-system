'use client';

import React, { useState, useMemo } from 'react';
import { matchesTicketNumber } from '../../../lib/ticket-search';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTickets } from '../../../context/TicketContext';
import { TicketFilterPanel } from '../../../components/tickets/TicketFilterPanel';
import { PageHeader } from '../../../components/ui/page-header';
import { DataTable, DataTableColumn } from '../../../components/ui/data-table';
import { StatusPill, statusTone, priorityTone } from '../../../components/ui/status-pill';
import { Button } from '../../../components/ui/button';
import { Search, Plus, AlertTriangle, Clock, Ticket as TicketIcon } from 'lucide-react';
import type { Ticket } from '../../../types/ticket';

type TabType =
  | 'All' | 'New' | 'Assigned' | 'InProgress' | 'WaitingCust' | 'WaitingTeam'
  | 'ReqGathering' | 'WaitingQuote' | 'ClosureReq' | 'AwaitingMgr'
  | 'Resolved' | 'Closed' | 'Escalated';

const TABS: { id: TabType; label: string }[] = [
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
  { id: 'Escalated', label: 'Escalated' },
];

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/** Canonical status-tab predicate, reused by the tab badge AND the card filter so
 *  they reconcile from one source (mirrors the manager desk fix). */
function matchesAdminTab(tab: TabType, t: Ticket): boolean {
  switch (tab) {
    case 'New': return t.status === 'New';
    case 'Assigned': return t.status === 'Assigned';
    case 'InProgress': return t.status === 'In Progress' || t.status === 'In Progress - Technical' || t.status === 'In Progress - Functional';
    case 'WaitingCust': return t.status === 'Waiting for Customer' || t.status === 'Customer Action';
    case 'WaitingTeam': return t.status === 'Waiting for Internal Team' || t.status === 'On Hold';
    case 'ReqGathering': return t.status === 'Requirement Gathering';
    case 'WaitingQuote': return t.status === 'Waiting for Hours Approval';
    case 'ClosureReq': return t.status === 'Request for Closure';
    case 'AwaitingMgr': return t.status === 'Awaiting Manager Approval' || t.status === 'Awaiting Closure';
    case 'Resolved': return t.status === 'Resolved';
    case 'Closed': return t.status === 'Closed';
    case 'Escalated': return !!t.escalationFlag;
    case 'All':
    default: return true;
  }
}

export default function AdminTicketsPage() {
  const { tickets, loading } = useTickets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // ── Single filtered source ── dropdowns + date + search (NO tab). Tab badges
  // and the card list both derive from this, so they reconcile under any filter.
  const dropdownFiltered = useMemo(() => {
    return tickets.filter(t => {
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      if (moduleFilter !== 'All' && t.sapModule !== moduleFilter) return false;
      if (customerFilter !== 'All' && t.organization !== customerFilter) return false;

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

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.id.toLowerCase().includes(q) ||
          matchesTicketNumber(t.ticketNumber, q) ||
          t.title.toLowerCase().includes(q) ||
          t.organization.toLowerCase().includes(q) ||
          (t.assignedConsultant && t.assignedConsultant.toLowerCase().includes(q)) ||
          (t.assignedManager && t.assignedManager.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [tickets, priorityFilter, moduleFilter, customerFilter, dateFilter, customStartDate, customEndDate, searchQuery]);

  // Tab badges — every badge counts the SAME filtered source through the SAME
  // predicate, so applying any dropdown updates the badges and the cards together.
  const tabCounts = useMemo(() => {
    const counts = {} as Record<TabType, number>;
    TABS.forEach(({ id }) => { counts[id] = dropdownFiltered.filter(t => matchesAdminTab(id, t)).length; });
    return counts;
  }, [dropdownFiltered]);

  // Card list = the single filtered source + the active tab predicate (so its
  // length always equals tabCounts[activeTab]).
  const filteredTickets = useMemo(
    () => dropdownFiltered.filter(t => matchesAdminTab(activeTab, t)),
    [dropdownFiltered, activeTab],
  );

  // SLA countdown rendering
  const formatSlaCountdown = (dueDateStr: string, status: string) => {
    if (status === 'Closed' || status === 'Resolved') {
      return <span className="type-status font-medium text-ink-muted">SLA Completed</span>;
    }
    if (!dueDateStr || dueDateStr === 'SLA Not Applicable') {
      return <span className="type-status text-ink-muted">Not Applicable</span>;
    }

    const diff = new Date(dueDateStr).getTime() - Date.now();
    const isBreached = diff < 0;
    const absDiff = Math.abs(diff);

    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

    let displayStr = '';
    if (days > 0) displayStr += `${days}d `;
    if (hours > 0) displayStr += `${hours}h `;
    displayStr += `${minutes}m`;

    if (isBreached) {
      return (
        <span className="type-status type-num inline-flex items-center gap-1 font-semibold text-critical">
          <AlertTriangle size={11} className="shrink-0" />
          Breached by {displayStr}
        </span>
      );
    }
    if (absDiff < 12 * 60 * 60 * 1000) {
      return (
        <span className="type-status type-num inline-flex items-center gap-1 font-semibold text-warning-strong">
          <Clock size={11} className="shrink-0" />
          Due in {displayStr}
        </span>
      );
    }
    return <span className="type-status type-num text-ink-secondary">Due in {displayStr}</span>;
  };

  const columns: DataTableColumn<Ticket>[] = [
    {
      key: 'ticket',
      header: 'Ticket',
      width: '120px',
      hideable: false,
      sortValue: t => t.ticketNumber || t.id,
      render: t => (
        <Link
          href={`/admin/tickets/${t.id}`}
          onClick={e => e.stopPropagation()}
          className="type-meta type-num font-semibold text-ink hover:text-brand hover:underline"
        >
          {t.ticketNumber || t.id}
        </Link>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      hideable: false,
      sortValue: t => t.title,
      exportValue: t => t.title,
      render: t => (
        <div className="min-w-0 space-y-1">
          <span className="type-meta block max-w-md truncate font-medium text-ink">{t.title}</span>
          <span className="flex items-center gap-1.5">
            <StatusPill tone="neutral">{t.sapModule}</StatusPill>
            <StatusPill tone={statusTone(t.status)}>{t.status}</StatusPill>
          </span>
        </div>
      ),
    },
    {
      key: 'organization',
      header: 'Organization',
      width: '160px',
      sortValue: t => t.organization,
      render: t => <span className="type-meta block max-w-[150px] truncate text-ink-secondary">{t.organization}</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '110px',
      sortValue: t => PRIORITY_ORDER[t.priority] ?? 9,
      exportValue: t => t.priority,
      render: t => (
        <StatusPill tone={priorityTone(t.priority)} dot pulse={t.priority === 'Critical'}>
          {t.priority}
        </StatusPill>
      ),
    },
    {
      key: 'sla',
      header: 'SLA',
      width: '170px',
      sortValue: t => (t.slaDueAt ? new Date(t.slaDueAt).getTime() : Number.MAX_SAFE_INTEGER),
      exportValue: t => t.slaDueAt || '',
      render: t => formatSlaCountdown(t.slaDueAt, t.status),
    },
    {
      key: 'team',
      header: 'Delivery Team',
      width: '180px',
      sortValue: t => t.assignedConsultant || t.assignedManager || '',
      render: t =>
        !t.assignedManager && !t.assignedConsultant ? (
          <span className="type-status text-ink-muted italic">Unassigned</span>
        ) : (
          <div className="space-y-0.5">
            {t.assignedManager && (
              <div className="type-status flex items-center gap-1.5 text-ink-secondary">
                <span className="w-8 shrink-0 text-ink-muted">Mgr</span>
                <span className="max-w-[120px] truncate text-ink">{t.assignedManager}</span>
              </div>
            )}
            {t.assignedConsultant && (
              <div className="type-status flex items-center gap-1.5 text-ink-secondary">
                <span className="w-8 shrink-0 text-ink-muted">Cons</span>
                <span className="max-w-[120px] truncate text-ink">{t.assignedConsultant}</span>
              </div>
            )}
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Service Desk"
        description="Cross-organization monitoring of active ticket pipelines, SLA compliance, and escalation alerts."
        actions={
          <Button asChild>
            <Link href="/admin/create-ticket">
              <Plus size={13} />
              Create Ticket
            </Link>
          </Button>
        }
      />

      {/* Search + advanced filters */}
      <div className="space-y-4">
        <div className="relative w-full">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search ticket ID, title, organization, owner…"
            className="type-body w-full rounded-lg border border-line bg-surface py-2 pr-4 pl-9 text-ink shadow-card transition-colors placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
        </div>

        <TicketFilterPanel
          enabledFilters={['priority', 'module', 'customer', 'dateSelect']}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          moduleFilter={moduleFilter}
          setModuleFilter={setModuleFilter}
          customerFilter={customerFilter}
          setCustomerFilter={setCustomerFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          startDateFilter={customStartDate}
          setStartDateFilter={setCustomStartDate}
          endDateFilter={customEndDate}
          setEndDateFilter={setCustomEndDate}
          onResetFilters={() => {
            setPriorityFilter('All');
            setModuleFilter('All');
            setCustomerFilter('All');
            setDateFilter('All');
            setCustomStartDate('');
            setCustomEndDate('');
          }}
        />
      </div>

      {/* Status tabs */}
      <div className="flex max-w-full flex-wrap gap-1 overflow-x-auto rounded-lg border border-line bg-surface-subtle p-1">
        {TABS.map(tab => {
          const count = tabCounts[tab.id] || 0;
          const isActive = activeTab === tab.id;
          const isEscalationTab = tab.id === 'Escalated';
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`type-status flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-surface text-ink shadow-card'
                  : 'text-ink-secondary hover:bg-surface/60 hover:text-ink'
              }`}
            >
              {tab.label}
              <span
                className={`type-num rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold ${
                  isEscalationTab && count > 0
                    ? 'bg-critical-soft text-critical-strong'
                    : isActive
                      ? 'bg-surface-subtle text-ink'
                      : 'bg-line/60 text-ink-secondary'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tickets table */}
      <DataTable<Ticket>
        columns={columns}
        rows={filteredTickets}
        rowKey={t => t.id}
        loading={loading}
        onRowClick={t => router.push(`/admin/tickets/${t.id}`)}
        rowAccent={t => (t.escalationFlag ? 'critical' : null)}
        exportName="assist360-tickets"
        pageSize={25}
        emptyIcon={TicketIcon}
        emptyTitle="No tickets match the current filters"
        emptyDescription="Try a different status tab, broaden the date range, or clear the search."
      />
    </div>
  );
}
