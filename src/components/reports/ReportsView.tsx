'use client';

import React, { useState, useMemo } from 'react';
import { useTickets } from '../../context/TicketContext';
import { 
  Download, 
  FileText, 
  Filter, 
  Check, 
  AlertCircle, 
  TrendingUp, 
  Layers, 
  Clock, 
  Calendar,
  Save,
  HelpCircle,
  BarChart4
} from 'lucide-react';
import Link from 'next/link';
import { SAPModule, IssueCategory, TicketPriority, TicketStatus, EffortActivityType, Ticket } from '../../types/ticket';

interface ReportsViewProps {
  role: 'SuperAdmin' | 'Manager' | 'Consultant' | 'Customer';
  userScope?: {
    company?: string;
    name?: string;
  };
}

type ReportType =
  | 'Ticket Summary'
  | 'Customer-wise'
  | 'Consultant Performance'
  | 'SLA Compliance'
  | 'Effort Hours'
  | 'Billable vs Non-billable'
  | 'SAP Module-wise'
  | 'Priority-wise'
  | 'Aging Tickets'
  | 'Reopened Tickets'
  | 'Monthly Support';

export default function ReportsView({ role, userScope }: ReportsViewProps) {
  const { tickets, contracts, profiles, orgMap } = useTickets();

  // 1. Report Type Selection
  const [reportType, setReportType] = useState<ReportType>('Ticket Summary');

  // 2. Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('All');
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedConsultant, setSelectedConsultant] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSla, setSelectedSla] = useState('All');
  const [selectedBillable, setSelectedBillable] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // UI status states
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  // Compile full list of effort logs across tickets for effort-related reports
  const allEffortLogs = tickets.flatMap(ticket => {
    const fromEfforts = (ticket.efforts || []).map(effort => ({
      id: effort.id,
      ticketId: effort.ticketId,
      consultantId: effort.consultantId,
      consultantName: effort.consultantName || 'Consultant',
      hoursLogged: effort.hoursLogged || effort.hoursWorked || 0,
      activityDate: effort.activityDate || effort.workDate || effort.createdAt || '',
      startTime: effort.startTime || 'N/A',
      endTime: effort.endTime || 'N/A',
      activityType: effort.activityType || 'Analysis',
      billable: effort.billable !== false,
      status: effort.status || 'Approved',
      description: effort.description || ticket.title,
      ticketTitle: ticket.title,
      sapModule: ticket.sapModule,
      organization: ticket.organization,
      priority: ticket.priority,
      category: ticket.category
    }));

    const fromActualHours = (ticket.actualHoursLogs || []).map(ah => {
      const consultantProfile = profiles.find(p => p.id === ah.consultantId);
      const consultantName = consultantProfile?.full_name || ah.consultantId || 'Consultant';
      return {
        id: ah.id,
        ticketId: ah.ticketId,
        consultantId: ah.consultantId,
        consultantName: consultantName,
        hoursLogged: ah.actualHours || 0,
        activityDate: ah.createdAt ? ah.createdAt.split('T')[0] : '',
        startTime: 'N/A',
        endTime: 'N/A',
        activityType: ah.consultantType || 'Analysis',
        billable: ah.billable !== false,
        status: ah.approvalStatus || 'Approved',
        description: `Closure actual hours log: ${ah.consultantType}`,
        ticketTitle: ticket.title,
        sapModule: ticket.sapModule,
        organization: ticket.organization,
        priority: ticket.priority,
        category: ticket.category
      };
    });

    return [...fromEfforts, ...fromActualHours];
  });

  // Apply Role-Based Constraints immediately
  const isCustomer = role === 'Customer';
  const isConsultant = role === 'Consultant';
  const isManager = role === 'Manager';

  const orgConstraint = isCustomer ? (userScope?.company || 'Apex Global Industries') : '';
  const consultantConstraint = isConsultant ? (userScope?.name || 'Karthik Subramanian') : '';

  // Extract unique organization & consultant lists from data for dropdown filters
  const availableOrgs = useMemo(() => {
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
    tickets.forEach(t => {
      if (t.organization) list.add(t.organization);
    });
    return Array.from(list).filter(Boolean).sort();
  }, [contracts, profiles, orgMap, tickets]);

  const availableConsultants = useMemo(() => {
    const list = new Set<string>();
    (profiles || [])
      .filter(p => p.role === 'Consultant' && p.full_name)
      .forEach(p => list.add(p.full_name));
    tickets.forEach(t => {
      if (t.assignedConsultant) list.add(t.assignedConsultant);
    });
    return Array.from(list).filter(Boolean).sort();
  }, [profiles, tickets]);

  const availableModules = Array.from(new Set(tickets.map(t => t.sapModule)));
  const availableCategories = Array.from(new Set(tickets.map(t => t.category)));

  // Filter Logic
  const filteredTickets = tickets.filter(t => {
    // 1. Role boundaries
    if (orgConstraint && t.organization !== orgConstraint) return false;
    if (consultantConstraint && t.assignedConsultant !== consultantConstraint) return false;

    // 2. Organization filter
    if (!isCustomer && selectedOrg !== 'All' && t.organization !== selectedOrg) return false;

    // 3. Module filter
    if (selectedModule !== 'All' && t.sapModule !== selectedModule) return false;

    // 4. Consultant filter
    if (!isConsultant && selectedConsultant !== 'All' && t.assignedConsultant !== selectedConsultant) return false;

    // 5. Priority filter
    if (selectedPriority !== 'All' && t.priority !== selectedPriority) return false;

    // 6. Status filter
    if (selectedStatus !== 'All' && t.status !== selectedStatus) return false;

    // 7. Category filter
    if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;

    // 8. SLA filter
    const now = Date.now();
    const isClosedOrResolved = t.status === 'Closed' || t.status === 'Resolved';
    const dueTime = new Date(t.slaDueAt).getTime();
    if (selectedSla === 'Breached') {
      if (isClosedOrResolved || dueTime >= now) return false;
    } else if (selectedSla === 'Warning') {
      if (isClosedOrResolved || dueTime < now || (dueTime - now) > 12 * 60 * 60 * 1000) return false;
    } else if (selectedSla === 'Healthy') {
      if (!isClosedOrResolved && dueTime < now) return false;
    }

    // 9. Date filters
    if (startDate && new Date(t.createdAt) < new Date(startDate)) return false;
    if (endDate && new Date(t.createdAt) > new Date(endDate)) return false;

    return true;
  });

  // Filter Effort Logs similarly
  const filteredEfforts = allEffortLogs.filter(e => {
    // Role boundary
    if (orgConstraint && e.organization !== orgConstraint) return false;
    if (consultantConstraint && e.consultantName !== consultantConstraint) return false;

    // Standard filters
    if (!isCustomer && selectedOrg !== 'All' && e.organization !== selectedOrg) return false;
    if (selectedModule !== 'All' && e.sapModule !== selectedModule) return false;
    if (!isConsultant && selectedConsultant !== 'All' && e.consultantName !== selectedConsultant) return false;
    if (selectedPriority !== 'All' && e.priority !== selectedPriority) return false;
    if (selectedCategory !== 'All' && e.category !== selectedCategory) return false;
    if (selectedBillable === 'Billable' && !e.billable) return false;
    if (selectedBillable === 'Non-billable' && e.billable) return false;

    if (startDate && new Date(e.activityDate) < new Date(startDate)) return false;
    if (endDate && new Date(e.activityDate) > new Date(endDate)) return false;

    return true;
  });

  // KPI Calculations based on filtered results
  const totalCount = filteredTickets.length;
  const closedCount = filteredTickets.filter(t => t.status === 'Closed').length;
  const resolvedCount = filteredTickets.filter(t => t.status === 'Resolved').length;
  const openCount = totalCount - closedCount - resolvedCount;
  const criticalCount = filteredTickets.filter(t => t.priority === 'Critical').length;
  
  const nowTime = Date.now();
  const breachedCount = filteredTickets.filter(t => {
    if (t.status === 'Closed' || t.status === 'Resolved') return false;
    return new Date(t.slaDueAt).getTime() < nowTime;
  }).length;
  const compliancePct = totalCount > 0 ? Math.max(0, Math.min(100, Math.round(((totalCount - breachedCount) / totalCount) * 100))).toFixed(0) : '100';
  
  const totalHoursLogged = filteredEfforts.reduce((sum, e) => sum + e.hoursLogged, 0);
  const billableHours = filteredEfforts.filter(e => e.billable).reduce((sum, e) => sum + e.hoursLogged, 0);
  const nonBillableHours = filteredEfforts.filter(e => !e.billable).reduce((sum, e) => sum + e.hoursLogged, 0);



  // SVG Chart Aggregators (counts grouped based on selected report type)
  const chartData: Record<string, number> = {};
  if (reportType === 'SAP Module-wise') {
    filteredTickets.forEach(t => {
      chartData[t.sapModule] = (chartData[t.sapModule] || 0) + 1;
    });
  } else if (reportType === 'Customer-wise') {
    filteredTickets.forEach(t => {
      chartData[t.organization] = (chartData[t.organization] || 0) + 1;
    });
  } else if (reportType === 'Consultant Performance') {
    filteredTickets.forEach(t => {
      if (t.assignedConsultant) {
        chartData[t.assignedConsultant] = (chartData[t.assignedConsultant] || 0) + 1;
      }
    });
  } else if (reportType === 'Priority-wise') {
    filteredTickets.forEach(t => {
      chartData[t.priority] = (chartData[t.priority] || 0) + 1;
    });
  } else if (reportType === 'Effort Hours') {
    filteredEfforts.forEach(e => {
      chartData[e.consultantName] = (chartData[e.consultantName] || 0) + e.hoursLogged;
    });
  } else if (reportType === 'Billable vs Non-billable') {
    chartData['Billable'] = billableHours;
    chartData['Non-Billable'] = nonBillableHours;
  } else if (reportType === 'SLA Compliance') {
    chartData['SLA Compliant'] = totalCount - breachedCount;
    chartData['SLA Breached'] = breachedCount;
  } else if (reportType === 'Aging Tickets') {
    filteredTickets.forEach(t => {
      const ageDays = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      let bracket = '0-5 days';
      if (ageDays > 15) bracket = '> 15 days';
      else if (ageDays > 5) bracket = '6-15 days';
      chartData[bracket] = (chartData[bracket] || 0) + 1;
    });
  } else if (reportType === 'Reopened Tickets') {
    const reopened = filteredTickets.filter(t => t.status === 'Reopened').length;
    chartData['Reopened'] = reopened;
    chartData['Standard'] = totalCount - reopened;

  } else {
    // Default to status breakdown
    filteredTickets.forEach(t => {
      chartData[t.status] = (chartData[t.status] || 0) + 1;
    });
  }

  const chartEntries = Object.entries(chartData).sort((a, b) => b[1] - a[1]);
  const chartMax = Math.max(...Object.values(chartData), 1);

  // Actions
  const handleExportCsv = () => {
    setExportingCsv(true);
    setTimeout(() => {
      setExportingCsv(false);
      // Construct CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      if (reportType === 'Effort Hours') {
        const headers = ['Log ID', 'Ticket ID', 'Consultant', 'Date', 'Start Time', 'End Time', 'Activity', 'Hours', 'Billable', 'Status', 'Description'];
        const rows = filteredEfforts.map(e => [e.id, e.ticketId, e.consultantName, e.activityDate, e.startTime, e.endTime, e.activityType, e.hoursLogged, e.billable, e.status, e.description]);
        csvContent += [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
      } else {
        const headers = ['Ticket ID', 'Title', 'Customer', 'Module', 'Category', 'Priority', 'Status', 'SLA Due', 'Created At'];
        const rows = filteredTickets.map(t => [t.id, t.title, t.organization, t.sapModule, t.category, t.priority, t.status, t.slaDueAt, t.createdAt]);
        csvContent += [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
      }
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `sap_desk_report_${reportType.toLowerCase().replace(/ /g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('CSV compiled and downloaded.');
    }, 1000);
  };

  const handleExportPdf = () => {
    setExportingPdf(true);
    setTimeout(() => {
      setExportingPdf(false);
      showNotification('PDF generation placeholder triggered. File compilation simulated.');
    }, 1500);
  };

  const handleSavePreset = () => {
    setSavingPreset(true);
    setTimeout(() => {
      setSavingPreset(false);
      showNotification('Report filter settings saved as custom preset.');
    }, 800);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="type-title text-ink">Analytics Report Center</h2>
          <p className="text-ink-secondary mt-1">Generate multi-dimensional metrics, filter by SLA boundaries, and download auditing compliance sheets.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSavePreset}
            disabled={savingPreset}
            className="px-3 py-1.5 border border-line hover:border-line-strong text-ink-secondary rounded font-bold uppercase text-[11px] tracking-wider transition disabled:opacity-50 flex items-center gap-1"
          >
            <Save size={11} />
            {savingPreset ? 'Saving...' : 'Save Preset'}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="px-3 py-1.5 bg-ink hover:bg-zinc-800 text-white rounded font-bold uppercase text-[11px] tracking-wider transition disabled:opacity-50 flex items-center gap-1"
          >
            <Download size={11} />
            {exportingCsv ? 'Compiling CSV...' : 'Download CSV'}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="px-3 py-1.5 border border-zinc-900 hover:bg-surface-muted text-ink rounded font-bold uppercase text-[11px] tracking-wider transition disabled:opacity-50 flex items-center gap-1"
          >
            <FileText size={11} />
            {exportingPdf ? 'Printing PDF...' : 'Download PDF (MOCK)'}
          </button>
        </div>
      </div>

      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-500 text-emerald-800 font-bold uppercase text-[11px] tracking-wider p-2.5 rounded flex items-center gap-1 animate-fade-in">
          <Check size={12} className="text-success" />
          {notificationMsg}
        </div>
      )}

      {/* Grid: Selector & Filter Panel */}
      <div className="bg-surface border border-line rounded-lg p-5 shadow-card space-y-4">
        
        {/* Row 1: Report Type Selector */}
        <div className="space-y-1">
          <label className="font-bold text-ink-secondary uppercase text-[11px]">Select Report Focus</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="w-full bg-surface-muted border border-line rounded p-2 text-xs font-bold text-ink focus:outline-none focus:border-brand"
          >
            <option value="Ticket Summary">Ticket Summary Report (Global Queue)</option>
            {!isCustomer && <option value="Customer-wise">Customer-wise Ticket Volume Report</option>}
            {!isConsultant && <option value="Consultant Performance">Consultant Performance Ranking</option>}
            <option value="SLA Compliance">SLA Compliance & Breach Audit</option>
            <option value="Effort Hours">Effort Hours / Timesheet Log Report</option>
            <option value="Billable vs Non-billable">Billable vs Non-billable Effort Split</option>
            <option value="SAP Module-wise">SAP Module-wise Incident Volumes</option>
            <option value="Priority-wise">Priority-wise Severity Audit</option>
            <option value="Aging Tickets">Aging Tickets Report (Open Backlog)</option>
            <option value="Reopened Tickets">Reopened Tickets & Validation Loops</option>
            <option value="Monthly Support">Monthly Support Burn Report</option>
          </select>
        </div>

        {/* Row 2: Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-2">
          {/* Start Date */}
          <div className="space-y-1">
            <label className="font-bold text-ink-secondary uppercase text-[11px] flex items-center gap-1">
              <Calendar size={10} />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-surface border border-line rounded p-1.5 text-[11px] focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="font-bold text-ink-secondary uppercase text-[11px] flex items-center gap-1">
              <Calendar size={10} />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-surface border border-line rounded p-1.5 text-[11px] focus:outline-none"
            />
          </div>

          {/* Org Filter (Locked if customer) */}
          <div className="space-y-1">
            <label className="font-bold text-ink-secondary uppercase text-[11px]">Organization</label>
            <select
              value={isCustomer ? orgConstraint : selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              disabled={isCustomer}
              className="w-full bg-surface border border-line rounded p-1.5 text-[11px] focus:outline-none disabled:opacity-60"
            >
              {isCustomer ? (
                <option value={orgConstraint}>{orgConstraint}</option>
              ) : (
                <>
                  <option value="All">All Organizations</option>
                  {availableOrgs.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Module Filter */}
          <div className="space-y-1">
            <label className="font-bold text-ink-secondary uppercase text-[11px]">SAP Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-surface border border-line rounded p-1.5 text-[11px] focus:outline-none"
            >
              <option value="All">All Modules</option>
              {availableModules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Consultant Filter (Locked if consultant) */}
          <div className="space-y-1">
            <label className="font-bold text-ink-secondary uppercase text-[11px]">Consultant</label>
            <select
              value={isConsultant ? consultantConstraint : selectedConsultant}
              onChange={(e) => setSelectedConsultant(e.target.value)}
              disabled={isConsultant}
              className="w-full bg-surface border border-line rounded p-1.5 text-[11px] focus:outline-none disabled:opacity-60"
            >
              {isConsultant ? (
                <option value={consultantConstraint}>{consultantConstraint}</option>
              ) : (
                <>
                  <option value="All">All Staff</option>
                  {availableConsultants.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {/* Row 3: Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-2 border-t border-line">
          {/* Priority */}
          <div className="space-y-1">
            <label className="font-bold text-ink-secondary uppercase text-[11px]">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full bg-surface border border-line rounded p-1.5 text-[11px] focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low (P4)</option>
              <option value="Medium">Medium (P3)</option>
              <option value="High">High (P2)</option>
              <option value="Critical">Critical (P1)</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="font-bold text-ink-secondary uppercase text-[11px]">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-surface border border-line rounded p-1.5 text-[11px] focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Customer">Waiting for Customer</option>
              <option value="Waiting for Internal Team">Waiting for Internal Team</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Reopened">Reopened</option>
            </select>
          </div>

          {/* SLA Status */}
          <div className="space-y-1">
            <label className="font-bold text-ink-secondary uppercase text-[11px]">SLA Status</label>
            <select
              value={selectedSla}
              onChange={(e) => setSelectedSla(e.target.value)}
              className="w-full bg-surface border border-line rounded p-1.5 text-[11px] focus:outline-none"
            >
              <option value="All">All SLA States</option>
              <option value="Healthy">Healthy</option>
              <option value="Warning">Warning (Due &lt;12h)</option>
              <option value="Breached">Breached (Overdue)</option>
            </select>
          </div>

          {/* Billable Split */}
          <div className="space-y-1">
            <label className="font-bold text-ink-secondary uppercase text-[11px]">Billing Classification</label>
            <select
              value={selectedBillable}
              onChange={(e) => setSelectedBillable(e.target.value)}
              className="w-full bg-surface border border-line rounded p-1.5 text-[11px] focus:outline-none"
            >
              <option value="All">All Log Types</option>
              <option value="Billable">Billable Hours (AMS)</option>
              <option value="Non-billable">Non-billable Hours</option>
            </select>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="font-bold text-ink-secondary uppercase text-[11px]">Incident Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-surface border border-line rounded p-1.5 text-[11px] focus:outline-none"
            >
              <option value="All">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Grid: KPI Summaries & Chart Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI Cards (Displays different summaries depending on report type) */}
        <div className="space-y-4">
          <h3 className="font-bold text-ink uppercase text-[11px] tracking-wider">Report KPI Summary</h3>
          
          <div className="bg-surface border border-line rounded-lg p-4 shadow-card flex justify-between items-center">
            <div>
              <div className="text-ink-muted font-bold uppercase text-[11px]">Total Matching Tickets</div>
              <div className="text-lg font-bold text-ink mt-1">{totalCount} Incidents</div>
            </div>
            <div className="bg-surface-muted text-ink-secondary p-2.5 rounded border border-line">
              <FileText size={16} />
            </div>
          </div>

          <div className="bg-surface border border-line rounded-lg p-4 shadow-card flex justify-between items-center border-l-4 border-l-emerald-500">
            <div>
              <div className="text-ink-muted font-bold uppercase text-[11px]">Resolved / Closed count</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">{resolvedCount + closedCount} Tickets</div>
            </div>
            <div className="bg-emerald-50 text-success p-2.5 rounded border border-emerald-100">
              <Check size={16} className="text-success" />
            </div>
          </div>

          <div className="bg-surface border border-line rounded-lg p-4 shadow-card flex justify-between items-center border-l-4 border-l-amber-500">
            <div>
              <div className="text-ink-muted font-bold uppercase text-[11px]">Total Efforts Logged</div>
              <div className="text-lg font-bold text-warning mt-1">
                {totalHoursLogged.toFixed(1)} hrs
                <span className="text-[11px] block text-ink-muted font-normal mt-0.5">Billable: {billableHours.toFixed(1)}h | Non-Billable: {nonBillableHours.toFixed(1)}h</span>
              </div>
            </div>
            <div className="bg-amber-50 text-warning p-2.5 rounded border border-amber-100">
              <Clock size={16} />
            </div>
          </div>


        </div>

        {/* Dynamic Chart Preview */}
        <div className="md:col-span-2 bg-surface border border-line rounded-lg p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h3 className="font-bold text-xs uppercase text-ink flex items-center gap-2">
              <BarChart4 size={14} />
              Report Analytics visualizer: {reportType}
            </h3>
            <span className="text-[11px] text-ink-muted">Total metrics</span>
          </div>

          <div className="space-y-3.5 min-h-[200px] flex flex-col justify-center">
            {chartEntries.length === 0 ? (
              <p className="text-ink-muted italic text-center">No data available to plot matching current filter parameters.</p>
            ) : (
              chartEntries.slice(0, 5).map(([label, val]) => {
                const pct = (val / chartMax) * 100;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between items-center text-[11px] text-ink-secondary">
                      <span className="font-bold">{label}</span>
                      <span>{val.toFixed(reportType === 'Effort Hours' ? 1 : 0)} {reportType === 'Effort Hours' ? 'h' : 'Tickets'}</span>
                    </div>
                    <div className="w-full h-3 bg-surface-subtle rounded overflow-hidden border border-line">
                      <div
                        className="h-full bg-ink rounded-r"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Main Reports Data Table */}
      <div className="bg-surface border border-line rounded-lg shadow-card space-y-3 p-4">
        <h3 className="font-bold text-xs uppercase text-ink border-b border-line pb-2">Filtered Report Dataset</h3>
        
        {reportType === 'Effort Hours' ? (
          /* Effort Table view */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted border-b border-line text-ink-secondary font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-2.5 px-3">Ticket ID</th>
                  <th className="py-2.5 px-3">Consultant</th>
                  <th className="py-2.5 px-3">Org</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Activity</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Hours</th>
                  <th className="py-2.5 px-3 text-center">Billable</th>
                  <th className="py-2.5 px-3 text-right">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[11px]">
                {filteredEfforts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-ink-muted italic">No effort log lines match filters.</td>
                  </tr>
                ) : (
                  filteredEfforts.map(log => (
                    <tr key={log.id} className="hover:bg-surface-muted transition">
                      <td className="py-2 px-3 font-bold text-ink">{log.ticketId}</td>
                      <td className="py-2 px-3">{log.consultantName}</td>
                      <td className="py-2 px-3 text-ink-secondary">{log.organization}</td>
                      <td className="py-2 px-3">{log.activityDate}</td>
                      <td className="py-2 px-3 text-ink-muted">{log.startTime} - {log.endTime}</td>
                      <td className="py-2 px-3 font-bold uppercase text-[11px] text-ink-secondary">{log.activityType}</td>
                      <td className="py-2 px-3 max-w-[150px] truncate" title={log.description}>{log.description}</td>
                      <td className="py-2 px-3 text-center font-bold">{log.hoursLogged.toFixed(1)}h</td>
                      <td className="py-2 px-3 text-center">{log.billable ? 'Yes' : 'No'}</td>
                      <td className={`py-2 px-3 text-right font-bold ${
                        log.status === 'Approved' ? 'text-emerald-700' : log.status === 'Pending' ? 'text-warning' : 'text-critical'
                      }`}>{log.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tickets Table view */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted border-b border-line text-ink-secondary font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-2.5 px-3">Ticket ID</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Organization</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Priority</th>
                  <th className="py-2.5 px-3 text-center">SLA State</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[11px]">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-ink-muted italic">No tickets match active report parameters.</td>
                  </tr>
                ) : (
                  filteredTickets.map(t => {
                    const now = Date.now();
                    const dueTime = new Date(t.slaDueAt).getTime();
                    const isClosedOrResolved = t.status === 'Closed' || t.status === 'Resolved';
                    let slaBadge = <span className="text-emerald-700 font-bold">Healthy</span>;
                    if (!isClosedOrResolved) {
                      if (dueTime < now) {
                        slaBadge = <span className="text-critical font-bold">Breached</span>;
                      } else if ((dueTime - now) < 12 * 60 * 60 * 1000) {
                        slaBadge = <span className="text-warning font-bold">Warning</span>;
                      }
                    }
                    return (
                      <tr key={t.id} className="hover:bg-surface-muted transition">
                        <td className="py-2 px-3">
                          <Link href={`/${role.toLowerCase()}/tickets/${t.id}`} className="font-bold text-ink hover:underline">
                            {t.id}
                          </Link>
                        </td>
                        <td className="py-2 px-3 font-semibold text-ink max-w-[200px] truncate" title={t.title}>{t.title}</td>
                        <td className="py-2 px-3 text-ink-secondary">{t.organization}</td>
                        <td className="py-2 px-3 font-bold">{t.sapModule}</td>
                        <td className="py-2 px-3 text-ink-secondary">{t.category}</td>
                        <td className="py-2 px-3 text-center font-bold">
                          <span className={`px-1 rounded text-[11px] ${
                            t.priority === 'Critical' ? 'bg-critical-soft text-critical-strong border border-critical-border' : 'text-ink-secondary'
                          }`}>{t.priority}</span>
                        </td>
                        <td className="py-2 px-3 text-center">{slaBadge}</td>
                        <td className="py-2 px-3 text-right">
                          <span className="px-1.5 py-0.2 bg-surface-subtle rounded uppercase text-[11px] font-bold">
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
