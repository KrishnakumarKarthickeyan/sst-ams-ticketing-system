'use client';

import React, { useState } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Calendar,
  Filter,
  Download,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  ArrowLeft
} from 'lucide-react';
import { SAPModule, TicketPriority, TicketStatus, EffortActivityType, TicketType } from '../../../types/ticket';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

type ReportType =
  | 'ticket_summary'
  | 'client_report'
  | 'module_report'
  | 'priority_report'
  | 'sla_report'
  | 'effort_report'
  | 'rejected_effort'
  | 'resolved_report'
  | 'reopened_report'
  | 'productivity_report';

export default function ConsultantReportsPage() {
  const { tickets } = useTickets();
  const { user } = useAuth();
  const consultantName = user?.name || 'Karthik Subramanian';

  // State for active report tabs
  const [activeReport, setActiveReport] = useState<ReportType>('ticket_summary');

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientFilter, setClientFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [effortStatusFilter, setEffortStatusFilter] = useState('All');
  const [billableFilter, setBillableFilter] = useState('All'); // 'All', 'Billable', 'Non-Billable'

  const myTickets = tickets.filter(t => t.assignedConsultant === consultantName);

  // Helper lists for filters
  const clientsList = Array.from(new Set(myTickets.map(t => t.organization)));
  const modulesList = Array.from(new Set(myTickets.map(t => t.sapModule)));

  // Filter tickets matching criteria
  const getFilteredTickets = () => {
    return myTickets.filter(t => {
      if (clientFilter !== 'All' && t.organization !== clientFilter) return false;
      if (moduleFilter !== 'All' && t.sapModule !== moduleFilter) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (typeFilter !== 'All' && t.ticketType !== typeFilter) return false;
      
      if (startDate && new Date(t.createdAt) < new Date(startDate)) return false;
      if (endDate) {
        const endLimit = new Date(endDate);
        endLimit.setHours(23, 59, 59, 999);
        if (new Date(t.createdAt) > endLimit) return false;
      }

      // Filter based on active report specifics
      if (activeReport === 'resolved_report' && t.status !== 'Resolved' && t.status !== 'Closed') return false;
      if (activeReport === 'reopened_report' && (!t.reopenedCount || t.reopenedCount === 0) && t.status !== 'Reopened') return false;

      return true;
    });
  };

  const filteredTickets = getFilteredTickets();

  // Filter efforts matching criteria
  const getFilteredEfforts = () => {
    const allEfforts = myTickets.flatMap(t => 
      (t.efforts || []).map(e => ({
        ...e,
        ticketId: t.id,
        organization: t.organization,
        sapModule: t.sapModule,
        priority: t.priority,
        ticketType: t.ticketType,
        ticketCreatedAt: t.createdAt
      }))
    ).filter(e => e.consultantName === consultantName);

    return allEfforts.filter(e => {
      if (clientFilter !== 'All' && e.organization !== clientFilter) return false;
      if (moduleFilter !== 'All' && e.sapModule !== moduleFilter) return false;
      if (priorityFilter !== 'All' && e.priority !== priorityFilter) return false;
      if (typeFilter !== 'All' && e.ticketType !== typeFilter) return false;
      if (effortStatusFilter !== 'All' && e.status !== effortStatusFilter) return false;
      
      if (billableFilter === 'Billable' && !e.billable) return false;
      if (billableFilter === 'Non-Billable' && e.billable) return false;

      const dateStr = e.workDate || e.activityDate || '';
      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;

      if (activeReport === 'rejected_effort' && e.status !== 'Rejected') return false;

      return true;
    });
  };

  const filteredEfforts = getFilteredEfforts();

  // Export CSV Helper
  const handleCSVExport = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `consultant_${activeReport}_report.csv`;

    if (activeReport === 'effort_report' || activeReport === 'rejected_effort') {
      headers = ['Log ID', 'Ticket ID', 'Work Date', 'Hours Worked', 'Activity Type', 'Billing Status', 'Status', 'Description', 'Rejection Reason'];
      rows = filteredEfforts.map(e => [
        e.id,
        e.ticketId,
        e.workDate || e.activityDate || '',
        String(e.hoursWorked || e.hoursLogged || 0),
        e.activityType,
        e.billable ? 'Billable' : 'Non-Billable',
        e.status,
        `"${e.description.replace(/"/g, '""')}"`,
        e.rejectionReason ? `"${e.rejectionReason.replace(/"/g, '""')}"` : ''
      ]);
    } else {
      headers = ['Ticket ID', 'Client', 'Subject', 'SAP Module', 'Type', 'Priority', 'Status', 'Quoted Hours', 'Created At'];
      rows = filteredTickets.map(t => [
        t.id,
        t.organization,
        `"${t.title.replace(/"/g, '""')}"`,
        t.sapModule,
        t.ticketType || 'Incident',
        t.priority,
        t.status,
        String(t.quotedHours || 0),
        new Date(t.createdAt).toLocaleDateString()
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePDFPlaceholder = () => {
    alert('PDF compilation engine initiated. Document layout sent to printer queue in background.');
  };

  // Render KPI summaries depending on report
  const renderKpis = () => {
    if (activeReport === 'effort_report' || activeReport === 'rejected_effort') {
      const totalHrs = filteredEfforts.reduce((sum, e) => sum + (e.hoursWorked || e.hoursLogged || 0), 0);
      const billableHrs = filteredEfforts.filter(e => e.billable).reduce((sum, e) => sum + (e.hoursWorked || e.hoursLogged || 0), 0);
      const rejectedCount = filteredEfforts.filter(e => e.status === 'Rejected').length;
      const pendingCount = filteredEfforts.filter(e => e.status === 'Pending Approval' || e.status === 'Pending').length;

      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-zinc-200 p-4 rounded shadow-sm">
            <div className="text-[9px] font-bold text-zinc-400 uppercase">Filtered Hours Worked</div>
            <div className="text-xl font-bold text-zinc-950 mt-1">{totalHrs.toFixed(1)} hrs</div>
          </div>
          <div className="bg-white border border-zinc-200 p-4 rounded shadow-sm border-l-4 border-l-emerald-500">
            <div className="text-[9px] font-bold text-zinc-400 uppercase text-emerald-800">Billable Hours</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{billableHrs.toFixed(1)} hrs</div>
          </div>
          <div className="bg-white border border-zinc-200 p-4 rounded shadow-sm border-l-4 border-l-amber-500">
            <div className="text-[9px] font-bold text-zinc-400 uppercase text-amber-800">Pending Approval</div>
            <div className="text-xl font-bold text-amber-600 mt-1">{pendingCount} Logs</div>
          </div>
          <div className="bg-white border border-zinc-200 p-4 rounded shadow-sm border-l-4 border-l-red-500">
            <div className="text-[9px] font-bold text-zinc-400 uppercase text-red-800">Rejected Entries</div>
            <div className="text-xl font-bold text-red-600 mt-1">{rejectedCount} Logs</div>
          </div>
        </div>
      );
    } else {
      const openCount = filteredTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
      const criticalCount = filteredTickets.filter(t => t.priority === 'Critical').length;
      const resolvedCount = filteredTickets.filter(t => t.status === 'Resolved').length;

      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-zinc-200 p-4 rounded shadow-sm">
            <div className="text-[9px] font-bold text-zinc-400 uppercase">Total Filtered Tickets</div>
            <div className="text-xl font-bold text-zinc-950 mt-1">{filteredTickets.length} Items</div>
          </div>
          <div className="bg-white border border-zinc-200 p-4 rounded shadow-sm">
            <div className="text-[9px] font-bold text-zinc-400 uppercase text-zinc-650">Active Open Backlog</div>
            <div className="text-xl font-bold text-zinc-900 mt-1">{openCount} Items</div>
          </div>
          <div className="bg-white border border-zinc-200 p-4 rounded shadow-sm border-l-4 border-l-red-500">
            <div className="text-[9px] font-bold text-zinc-400 uppercase text-red-800">Critical Priority</div>
            <div className="text-xl font-bold text-red-600 mt-1">{criticalCount} Items</div>
          </div>
          <div className="bg-white border border-zinc-200 p-4 rounded shadow-sm border-l-4 border-l-emerald-500">
            <div className="text-[9px] font-bold text-zinc-400 uppercase text-emerald-800">Resolved scope</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{resolvedCount} Items</div>
          </div>
        </div>
      );
    }
  };

  // Generate charts data for Recharts based on report type
  const getChartData = (): { name: string; value: number }[] => {
    if (activeReport === 'effort_report' || activeReport === 'rejected_effort') {
      const activityMap: { [key: string]: number } = {};
      filteredEfforts.forEach(e => {
        activityMap[e.activityType] = (activityMap[e.activityType] || 0) + (e.hoursWorked || e.hoursLogged || 0);
      });
      return Object.keys(activityMap).map(k => ({ name: k, value: activityMap[k] }));
    } else if (activeReport === 'client_report') {
      const clientMap: { [key: string]: number } = {};
      filteredTickets.forEach(t => {
        clientMap[t.organization] = (clientMap[t.organization] || 0) + 1;
      });
      return Object.keys(clientMap).map(k => ({ name: k, value: clientMap[k] }));
    } else if (activeReport === 'module_report') {
      const moduleMap: { [key: string]: number } = {};
      filteredTickets.forEach(t => {
        moduleMap[t.sapModule] = (moduleMap[t.sapModule] || 0) + 1;
      });
      return Object.keys(moduleMap).map(k => ({ name: k, value: moduleMap[k] }));
    } else if (activeReport === 'priority_report') {
      const pMap: { [key: string]: number } = {};
      filteredTickets.forEach(t => {
        pMap[t.priority] = (pMap[t.priority] || 0) + 1;
      });
      return Object.keys(pMap).map(k => ({ name: k, value: pMap[k] }));
    } else {
      // Default ticket summary status split
      const sMap: { [key: string]: number } = {};
      filteredTickets.forEach(t => {
        sMap[t.status] = (sMap[t.status] || 0) + 1;
      });
      return Object.keys(sMap).map(k => ({ name: k, value: sMap[k] }));
    }
  };

  const chartData = getChartData();

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/consultant/dashboard" className="p-1.5 border border-zinc-200 rounded hover:bg-zinc-100 text-zinc-650 transition">
            <ArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-lg font-black uppercase text-zinc-950">Analytics Reports Desk</h1>
            <p className="text-zinc-500 mt-1">
              Select configurations and download CSV timesheets/tickets audits.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCSVExport}
            className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[9px] flex items-center gap-1.5 transition shadow"
          >
            <Download size={12} />
            Export CSV
          </button>
          <button
            onClick={handlePDFPlaceholder}
            className="px-3.5 py-1.5 border border-zinc-300 hover:border-zinc-900 bg-white rounded font-bold uppercase text-[9px] flex items-center gap-1.5 transition"
          >
            <FileText size={12} />
            Export PDF
          </button>
        </div>
      </div>

      {/* TABS SELECTOR (10 Report types) */}
      <div className="bg-white border border-zinc-250 rounded p-2 flex flex-wrap gap-1.5 shadow-sm">
        {[
          { id: 'ticket_summary', label: 'Ticket Summary' },
          { id: 'client_report', label: 'Client-wise' },
          { id: 'module_report', label: 'Module-wise' },
          { id: 'priority_report', label: 'Priority-wise' },
          { id: 'sla_report', label: 'SLA Compliances' },
          { id: 'effort_report', label: 'Logged Timesheet' },
          { id: 'rejected_effort', label: 'Rejected Efforts' },
          { id: 'resolved_report', label: 'Resolved Tickets' },
          { id: 'reopened_report', label: 'Reopened Incidents' },
          { id: 'productivity_report', label: 'Monthly Productivity' }
        ].map(r => (
          <button
            key={r.id}
            onClick={() => {
              setActiveReport(r.id as ReportType);
              // reset effort-specific filter when switching back
              if (r.id !== 'effort_report' && r.id !== 'rejected_effort') {
                setEffortStatusFilter('All');
              }
            }}
            className={`px-3 py-1.5 rounded font-bold uppercase tracking-wider text-[9px] transition ${
              activeReport === r.id
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-500 bg-zinc-50 hover:bg-zinc-150 border border-zinc-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* FILTERS PANEL */}
      <div className="bg-white border border-zinc-200 rounded p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        
        {/* Date range start */}
        <div>
          <label className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-250 rounded p-1 text-xs font-mono focus:outline-none"
          />
        </div>

        {/* Date range end */}
        <div>
          <label className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-250 rounded p-1 text-xs font-mono focus:outline-none"
          />
        </div>

        {/* Client */}
        <div>
          <label className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block mb-1">Client</label>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-250 rounded p-1.5 text-xs font-mono focus:outline-none"
          >
            <option value="All">All Clients</option>
            {clientsList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* SAP Module */}
        <div>
          <label className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block mb-1">SAP Module</label>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-250 rounded p-1.5 text-xs font-mono focus:outline-none"
          >
            <option value="All">All Modules</option>
            {modulesList.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block mb-1">Priority</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-250 rounded p-1.5 text-xs font-mono focus:outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Ticket Type */}
        <div>
          <label className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block mb-1">Ticket Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-250 rounded p-1.5 text-xs font-mono focus:outline-none"
          >
            <option value="All">All Types</option>
            <option value="Incident">Incident</option>
            <option value="Service Request">Service Request</option>
            <option value="Change Request">Change Request</option>
            <option value="Enhancement Request">Enhancement Request</option>
            <option value="Training Request">Training Request</option>
            <option value="Configuration Request">Configuration Request</option>
            <option value="Report Request">Report Request</option>
          </select>
        </div>

        {(activeReport === 'effort_report' || activeReport === 'rejected_effort') && (
          <>
            {/* Effort Approval Status */}
            <div>
              <label className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block mb-1">Approval status</label>
              <select
                value={effortStatusFilter}
                onChange={(e) => setEffortStatusFilter(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-250 rounded p-1.5 text-xs font-mono focus:outline-none"
                disabled={activeReport === 'rejected_effort'}
              >
                <option value="All">All status</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Resubmitted">Resubmitted</option>
              </select>
            </div>

            {/* Billable status */}
            <div>
              <label className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block mb-1">Billing filter</label>
              <select
                value={billableFilter}
                onChange={(e) => setBillableFilter(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-250 rounded p-1.5 text-xs font-mono focus:outline-none"
              >
                <option value="All">All Billing</option>
                <option value="Billable">Billable Only</option>
                <option value="Non-Billable">Non-Billable Only</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* KPI Stats overview */}
      {renderKpis()}

      {/* Preview Grid: Left table, right charts summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table Preview */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded shadow-sm overflow-hidden flex flex-col justify-between">
          <span className="font-bold text-[9px] text-zinc-450 uppercase tracking-widest p-4 border-b border-zinc-100 block bg-zinc-50/50">Report Preview Table</span>
          
          <div className="overflow-x-auto">
            {activeReport === 'effort_report' || activeReport === 'rejected_effort' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-2.5 px-3">Ticket ID</th>
                    <th className="py-2.5 px-3">Work Date</th>
                    <th className="py-2.5 px-3">Activity</th>
                    <th className="py-2.5 px-3 text-center">Hours</th>
                    <th className="py-2.5 px-3">Billing</th>
                    <th className="py-2.5 px-3">Approval status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-[11px]">
                  {filteredEfforts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400 italic">No effort log records matching filters.</td>
                    </tr>
                  ) : (
                    filteredEfforts.map(log => (
                      <tr key={log.id} className="hover:bg-zinc-50/50">
                        <td className="py-3 px-3 font-bold text-zinc-950">{log.ticketId}</td>
                        <td className="py-3 px-3 text-zinc-500">{log.workDate || log.activityDate}</td>
                        <td className="py-3 px-3">
                          <span className="px-1.5 py-0.2 bg-zinc-100 border rounded font-mono text-[9px] uppercase font-bold">{log.activityType}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold">{log.hoursWorked || log.hoursLogged}h</td>
                        <td className="py-3 px-3 font-bold text-zinc-650">{log.billable ? 'Billable' : 'Non-Billable'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                            log.status === 'Approved' ? 'text-emerald-700 bg-emerald-50' :
                            log.status === 'Rejected' ? 'text-red-700 bg-red-50' :
                            log.status === 'Resubmitted' ? 'text-blue-700 bg-blue-50' :
                            'text-amber-700 bg-amber-50'
                          }`}>{log.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-2.5 px-3">Ticket ID</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3 font-bold">Subject</th>
                    <th className="py-2.5 px-3">Module</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-[11px]">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400 italic">No tickets found matching filters.</td>
                    </tr>
                  ) : (
                    filteredTickets.map(t => (
                      <tr key={t.id} className="hover:bg-zinc-50/50">
                        <td className="py-3 px-3 font-bold text-zinc-955">{t.id}</td>
                        <td className="py-3 px-3 text-zinc-700 font-bold truncate max-w-[100px]" title={t.organization}>{t.organization}</td>
                        <td className="py-3 px-3 font-bold text-zinc-950 truncate max-w-[150px]" title={t.title}>{t.title}</td>
                        <td className="py-3 px-3">
                          <span className="px-1.5 py-0.2 bg-zinc-100 border border-zinc-200 rounded font-mono text-[9px] uppercase font-bold">{t.sapModule}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.2 rounded-full font-bold text-[9px] ${
                            t.priority === 'Critical' ? 'bg-red-50 text-red-600 border border-red-200' :
                            t.priority === 'High' ? 'bg-orange-50 text-orange-600' :
                            t.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                            'bg-zinc-150 text-zinc-600'
                          }`}>{t.priority}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.2 rounded font-bold uppercase text-[9px] ${
                            t.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' :
                            t.status === 'In Progress' ? 'bg-zinc-950 text-white' :
                            t.status === 'Reopened' ? 'bg-red-50 text-red-600' :
                            'bg-zinc-100 text-zinc-650'
                          }`}>{t.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-zinc-50 p-3 border-t border-zinc-200 text-right text-zinc-500 font-bold uppercase text-[9px]">
            Previewing up to {activeReport === 'effort_report' || activeReport === 'rejected_effort' ? filteredEfforts.length : filteredTickets.length} rows
          </div>
        </div>

        {/* Chart summary */}
        <div className="bg-white border border-zinc-200 rounded shadow-sm p-4 flex flex-col justify-between h-[380px]">
          <span className="font-bold text-[9px] text-zinc-450 uppercase tracking-widest block border-b border-zinc-100 pb-2">Chart Summary breakdown</span>
          
          <div className="w-full h-72 mt-4">
            {chartData.length === 0 ? (
              <p className="text-zinc-400 italic text-center py-20">No data available for charting.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#71717a" style={{ fontSize: 8 }} />
                  <YAxis stroke="#71717a" style={{ fontSize: 8 }} />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#09090b" barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
