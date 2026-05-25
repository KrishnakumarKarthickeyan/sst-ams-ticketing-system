'use client';

import React, { useState } from 'react';
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
  | 'Customer Satisfaction'
  | 'Monthly Support';

export default function ReportsView({ role, userScope }: ReportsViewProps) {
  const { tickets, contracts } = useTickets();

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
  const allEffortLogs = tickets.flatMap(ticket => 
    (ticket.efforts || []).map(effort => ({
      ...effort,
      ticketTitle: ticket.title,
      sapModule: ticket.sapModule,
      organization: ticket.organization,
      priority: ticket.priority,
      category: ticket.category
    }))
  );

  // Apply Role-Based Constraints immediately
  const isCustomer = role === 'Customer';
  const isConsultant = role === 'Consultant';
  const isManager = role === 'Manager';

  const orgConstraint = isCustomer ? (userScope?.company || 'Apex Global Industries') : '';
  const consultantConstraint = isConsultant ? (userScope?.name || 'Karthik Subramanian') : '';

  // Extract unique organization & consultant lists from data for dropdown filters
  const availableOrgs = Array.from(new Set(tickets.map(t => t.organization)));
  const availableConsultants = Array.from(new Set(tickets.map(t => t.assignedConsultant).filter(Boolean))) as string[];
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
  const compliancePct = totalCount > 0 ? (((totalCount - breachedCount) / totalCount) * 150 - 50).toFixed(0) : '100'; // scaled index representation
  
  const totalHoursLogged = filteredEfforts.reduce((sum, e) => sum + e.hoursLogged, 0);
  const billableHours = filteredEfforts.filter(e => e.billable).reduce((sum, e) => sum + e.hoursLogged, 0);
  const nonBillableHours = filteredEfforts.filter(e => !e.billable).reduce((sum, e) => sum + e.hoursLogged, 0);

  const ratedTickets = filteredTickets.filter(t => t.rating);
  const avgCsat = ratedTickets.length > 0 
    ? (ratedTickets.reduce((sum, t) => sum + (t.rating?.score || 0), 0) / ratedTickets.length).toFixed(1) 
    : '4.8';

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h2 className="text-lg font-bold uppercase text-zinc-950">Analytics Report Center</h2>
          <p className="text-zinc-500 mt-1">Generate multi-dimensional metrics, filter by SLA boundaries, and download auditing compliance sheets.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSavePreset}
            disabled={savingPreset}
            className="px-3 py-1.5 border border-zinc-200 hover:border-zinc-950 text-zinc-700 rounded font-bold uppercase text-[10px] tracking-wider transition disabled:opacity-50 flex items-center gap-1"
          >
            <Save size={11} />
            {savingPreset ? 'Saving...' : 'Save Preset'}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider transition disabled:opacity-50 flex items-center gap-1"
          >
            <Download size={11} />
            {exportingCsv ? 'Compiling CSV...' : 'Download CSV'}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="px-3 py-1.5 border border-zinc-900 hover:bg-zinc-50 text-zinc-950 rounded font-bold uppercase text-[10px] tracking-wider transition disabled:opacity-50 flex items-center gap-1"
          >
            <FileText size={11} />
            {exportingPdf ? 'Printing PDF...' : 'Download PDF (MOCK)'}
          </button>
        </div>
      </div>

      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-500 text-emerald-800 font-bold uppercase text-[9px] tracking-wider p-2.5 rounded flex items-center gap-1 animate-fade-in">
          <Check size={12} className="text-emerald-600" />
          {notificationMsg}
        </div>
      )}

      {/* Grid: Selector & Filter Panel */}
      <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
        
        {/* Row 1: Report Type Selector */}
        <div className="space-y-1">
          <label className="font-bold text-zinc-600 uppercase text-[9px]">Select Report Focus</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs font-bold text-zinc-950 focus:outline-none focus:border-zinc-950 font-mono"
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
            <option value="Customer Satisfaction">Customer Satisfaction Index (CSAT)</option>
            <option value="Monthly Support">Monthly Support Burn Report</option>
          </select>
        </div>

        {/* Row 2: Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-2">
          {/* Start Date */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px] flex items-center gap-1">
              <Calendar size={10} />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[11px] font-mono focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px] flex items-center gap-1">
              <Calendar size={10} />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[11px] font-mono focus:outline-none"
            />
          </div>

          {/* Org Filter (Locked if customer) */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px]">Organization</label>
            <select
              value={isCustomer ? orgConstraint : selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              disabled={isCustomer}
              className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[11px] font-mono focus:outline-none disabled:opacity-60"
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
            <label className="font-bold text-zinc-500 uppercase text-[8px]">SAP Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[11px] font-mono focus:outline-none"
            >
              <option value="All">All Modules</option>
              {availableModules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Consultant Filter (Locked if consultant) */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px]">Consultant</label>
            <select
              value={isConsultant ? consultantConstraint : selectedConsultant}
              onChange={(e) => setSelectedConsultant(e.target.value)}
              disabled={isConsultant}
              className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[11px] font-mono focus:outline-none disabled:opacity-60"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-2 border-t border-zinc-100">
          {/* Priority */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px]">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[11px] font-mono focus:outline-none"
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
            <label className="font-bold text-zinc-500 uppercase text-[8px]">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[11px] font-mono focus:outline-none"
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
            <label className="font-bold text-zinc-500 uppercase text-[8px]">SLA Status</label>
            <select
              value={selectedSla}
              onChange={(e) => setSelectedSla(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[11px] font-mono focus:outline-none"
            >
              <option value="All">All SLA States</option>
              <option value="Healthy">Healthy</option>
              <option value="Warning">Warning (Due &lt;12h)</option>
              <option value="Breached">Breached (Overdue)</option>
            </select>
          </div>

          {/* Billable Split */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px]">Billing Classification</label>
            <select
              value={selectedBillable}
              onChange={(e) => setSelectedBillable(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[11px] font-mono focus:outline-none"
            >
              <option value="All">All Log Types</option>
              <option value="Billable">Billable Hours (AMS)</option>
              <option value="Non-billable">Non-billable Hours</option>
            </select>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px]">Incident Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[11px] font-mono focus:outline-none"
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
          <h3 className="font-bold text-zinc-950 uppercase text-[10px] tracking-wider">Report KPI Summary</h3>
          
          <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex justify-between items-center">
            <div>
              <div className="text-zinc-400 font-bold uppercase text-[9px]">Total Matching Tickets</div>
              <div className="text-lg font-bold text-zinc-950 mt-1">{totalCount} Incidents</div>
            </div>
            <div className="bg-zinc-50 text-zinc-600 p-2.5 rounded border border-zinc-150">
              <FileText size={16} />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex justify-between items-center border-l-4 border-l-emerald-500">
            <div>
              <div className="text-zinc-400 font-bold uppercase text-[9px]">Resolved / Closed count</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">{resolvedCount + closedCount} Tickets</div>
            </div>
            <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded border border-emerald-100">
              <Check size={16} className="text-emerald-500" />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex justify-between items-center border-l-4 border-l-amber-500">
            <div>
              <div className="text-zinc-400 font-bold uppercase text-[9px]">Total Efforts Logged</div>
              <div className="text-lg font-bold text-amber-600 mt-1">
                {totalHoursLogged.toFixed(1)} hrs
                <span className="text-[9px] block text-zinc-400 font-normal mt-0.5">Billable: {billableHours.toFixed(1)}h | Non-Billable: {nonBillableHours.toFixed(1)}h</span>
              </div>
            </div>
            <div className="bg-amber-50 text-amber-600 p-2.5 rounded border border-amber-100">
              <Clock size={16} />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex justify-between items-center">
            <div>
              <div className="text-zinc-400 font-bold uppercase text-[9px]">Average CSAT Rating</div>
              <div className="text-lg font-bold text-zinc-950 mt-1">{avgCsat} / 5.0</div>
            </div>
            <div className="bg-zinc-50 text-zinc-800 p-2.5 rounded border border-zinc-150 font-bold text-[10px]">
              CSAT Index
            </div>
          </div>
        </div>

        {/* Dynamic Chart Preview */}
        <div className="md:col-span-2 bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h3 className="font-bold text-xs uppercase text-zinc-955 flex items-center gap-2">
              <BarChart4 size={14} />
              Report Analytics visualizer: {reportType}
            </h3>
            <span className="text-[9px] text-zinc-400">Total metrics</span>
          </div>

          <div className="space-y-3.5 min-h-[200px] flex flex-col justify-center">
            {chartEntries.length === 0 ? (
              <p className="text-zinc-400 italic text-center">No data available to plot matching current filter parameters.</p>
            ) : (
              chartEntries.slice(0, 5).map(([label, val]) => {
                const pct = (val / chartMax) * 100;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-zinc-650">
                      <span className="font-bold">{label}</span>
                      <span>{val.toFixed(reportType === 'Effort Hours' ? 1 : 0)} {reportType === 'Effort Hours' ? 'h' : 'Tickets'}</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-100 rounded overflow-hidden border border-zinc-200">
                      <div
                        className="h-full bg-zinc-950 rounded-r"
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
      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm space-y-3 p-4">
        <h3 className="font-bold text-xs uppercase text-zinc-950 border-b border-zinc-100 pb-2">Filtered Report Dataset</h3>
        
        {reportType === 'Effort Hours' ? (
          /* Effort Table view */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[9px] tracking-wider">
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
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {filteredEfforts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-zinc-400 italic">No effort log lines match filters.</td>
                  </tr>
                ) : (
                  filteredEfforts.map(log => (
                    <tr key={log.id} className="hover:bg-zinc-50 transition">
                      <td className="py-2 px-3 font-bold text-zinc-900">{log.ticketId}</td>
                      <td className="py-2 px-3">{log.consultantName}</td>
                      <td className="py-2 px-3 text-zinc-500">{log.organization}</td>
                      <td className="py-2 px-3">{log.activityDate}</td>
                      <td className="py-2 px-3 text-zinc-400">{log.startTime} - {log.endTime}</td>
                      <td className="py-2 px-3 font-bold uppercase text-[9px] text-zinc-600">{log.activityType}</td>
                      <td className="py-2 px-3 max-w-[150px] truncate" title={log.description}>{log.description}</td>
                      <td className="py-2 px-3 text-center font-bold">{log.hoursLogged.toFixed(1)}h</td>
                      <td className="py-2 px-3 text-center">{log.billable ? 'Yes' : 'No'}</td>
                      <td className={`py-2 px-3 text-right font-bold ${
                        log.status === 'Approved' ? 'text-emerald-700' : log.status === 'Pending' ? 'text-amber-600' : 'text-red-650'
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
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-2.5 px-3">Ticket ID</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Organization</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Priority</th>
                  <th className="py-2.5 px-3 text-center">SLA State</th>
                  <th className="py-2.5 px-3 text-center">Satisfaction</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-zinc-400 italic">No tickets match active report parameters.</td>
                  </tr>
                ) : (
                  filteredTickets.map(t => {
                    const now = Date.now();
                    const dueTime = new Date(t.slaDueAt).getTime();
                    const isClosedOrResolved = t.status === 'Closed' || t.status === 'Resolved';
                    let slaBadge = <span className="text-emerald-700 font-bold">Healthy</span>;
                    if (!isClosedOrResolved) {
                      if (dueTime < now) {
                        slaBadge = <span className="text-red-600 font-bold">Breached</span>;
                      } else if ((dueTime - now) < 12 * 60 * 60 * 1000) {
                        slaBadge = <span className="text-amber-600 font-bold">Warning</span>;
                      }
                    }
                    return (
                      <tr key={t.id} className="hover:bg-zinc-50 transition">
                        <td className="py-2 px-3">
                          <Link href={`/${role.toLowerCase()}/tickets/${t.id}`} className="font-bold text-zinc-900 hover:underline">
                            {t.id}
                          </Link>
                        </td>
                        <td className="py-2 px-3 font-semibold text-zinc-850 max-w-[200px] truncate" title={t.title}>{t.title}</td>
                        <td className="py-2 px-3 text-zinc-500">{t.organization}</td>
                        <td className="py-2 px-3 font-bold">{t.sapModule}</td>
                        <td className="py-2 px-3 text-zinc-600">{t.category}</td>
                        <td className="py-2 px-3 text-center font-bold">
                          <span className={`px-1 rounded text-[9px] ${
                            t.priority === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200' : 'text-zinc-700'
                          }`}>{t.priority}</span>
                        </td>
                        <td className="py-2 px-3 text-center">{slaBadge}</td>
                        <td className="py-2 px-3 text-center font-bold">{t.rating ? `${t.rating.score}★` : '--'}</td>
                        <td className="py-2 px-3 text-right">
                          <span className="px-1.5 py-0.2 bg-zinc-150 rounded uppercase text-[9px] font-bold">
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
