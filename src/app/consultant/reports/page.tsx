'use client';

import React, { useState, useMemo } from 'react';
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
import { SAPModule, TicketPriority, TicketStatus } from '../../../types/ticket';
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
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { chartColors } from '../../../lib/chart-theme';

type ReportType =
  | 'monthly_performance'
  | 'ticket_summary'
  | 'client_summary'
  | 'hours_summary'
  | 'billable_hours'
  | 'closed_tickets'
  | 'reopened_tickets'
  | 'sla_compliance';

export default function ConsultantReportsPage() {
  const { tickets } = useTickets();
  const { user } = useAuth();
  const consultantName = user?.name || 'Karthik Subramanian';

  // Active Report Tab State
  const [activeReport, setActiveReport] = useState<ReportType>('monthly_performance');

  // Filters State (Exactly 5 filters)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientFilter, setClientFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Base scope (assigned tickets or where allocated)
  const myTickets = useMemo(() => {
    return tickets.filter(t => 
      t.assignedConsultant === consultantName || 
      t.consultantEfforts?.some(e => e.consultantName === consultantName && !e.isDeleted)
    );
  }, [tickets, consultantName]);

  const clientsList = useMemo(() => Array.from(new Set(myTickets.map(t => t.organization))), [myTickets]);
  const modulesList = useMemo(() => Array.from(new Set(myTickets.map(t => t.sapModule))), [myTickets]);

  // Apply filters
  const filteredTickets = useMemo(() => {
    return myTickets.filter(t => {
      // 1. Client filter
      if (clientFilter !== 'All' && t.organization !== clientFilter) return false;
      // 2. Module filter
      if (moduleFilter !== 'All' && t.sapModule !== moduleFilter) return false;
      // 3. Priority filter
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      // 4. Status filter
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;

      // 5. Date Range filter
      if (startDate && new Date(t.createdAt) < new Date(startDate)) return false;
      if (endDate) {
        const endLimit = new Date(endDate);
        endLimit.setHours(23, 59, 59, 999);
        if (new Date(t.createdAt) > endLimit) return false;
      }

      // Filter by active report specifics
      if (activeReport === 'closed_tickets' && t.status !== 'Closed') return false;
      if (activeReport === 'reopened_tickets' && (!t.reopenedCount || t.reopenedCount === 0) && t.status !== 'Reopened') return false;
      if (activeReport === 'billable_hours' && !t.billable) return false;

      return true;
    });
  }, [myTickets, clientFilter, moduleFilter, priorityFilter, statusFilter, startDate, endDate, activeReport]);

  // Dynamic KPI Card Calculations
  const kpis = useMemo(() => {
    const total = filteredTickets.length;
    const closed = filteredTickets.filter(t => t.status === 'Closed').length;
    const reopened = filteredTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length;

    let totalEst = 0;
    let totalAct = 0;

    filteredTickets.forEach(t => {
      // Estimate
      const latestEst = (t.hourEstimates || [])
        .filter(e => e.status === 'Submitted' || e.status === 'Revision Approved')
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
      totalEst += latestEst?.totalEstimatedHours || t.quotedHours || 0;

      // Actual
      const approvedCls = (t.closureRequests || []).find(c => c.status === 'Approved');
      totalAct += approvedCls?.totalActualHours || 0;
    });

    const billableHours = filteredTickets.filter(t => t.billable).reduce((sum, t) => {
      const cls = (t.closureRequests || []).find(c => c.status === 'Approved');
      return sum + (cls?.totalActualHours || 0);
    }, 0);

    const nonBillableHours = totalAct - billableHours;

    let compliantCount = 0;
    filteredTickets.forEach(t => {
      if (t.status === 'Resolved' || t.status === 'Closed') {
        if (t.resolvedAt && t.slaDueAt && new Date(t.resolvedAt).getTime() <= new Date(t.slaDueAt).getTime()) {
          compliantCount++;
        }
      } else {
        if (t.slaDueAt && new Date(t.slaDueAt).getTime() >= Date.now()) {
          compliantCount++;
        }
      }
    });
    const complianceRate = total > 0 ? (compliantCount / total) * 100 : 100;

    return {
      total,
      closed,
      reopened,
      totalEst,
      totalAct,
      billableHours,
      nonBillableHours,
      complianceRate
    };
  }, [filteredTickets]);

  // Build a flat row set for the active report — every value safe for CSV/PDF.
  const EXPORT_HEADERS = ['Ticket #', 'Customer', 'Subject', 'SAP Module', 'Priority', 'Status', 'Est Hours', 'Actual Hours', 'Billable', 'Created At'];
  const buildExportRows = (): string[][] =>
    filteredTickets.map(t => {
      const latestEst = (t.hourEstimates || [])
        .filter(e => e.status === 'Submitted' || e.status === 'Revision Approved')
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
      const approvedCls = (t.closureRequests || []).find(c => c.status === 'Approved');
      return [
        t.ticketNumber || t.id,
        t.organization || '',
        t.title || '',
        t.sapModule || '',
        t.priority || '',
        t.status || '',
        String(latestEst?.totalEstimatedHours ?? t.quotedHours ?? 0),
        String(approvedCls?.totalActualHours ?? 0),
        t.billable ? 'Billable' : 'Non-Billable',
        t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '',
      ];
    });

  // CSV/Excel — every field quoted + escaped (commas/quotes in names no longer
  // break columns), UTF-8 BOM so Excel renders accents correctly.
  const handleExport = (format: 'CSV' | 'Excel') => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = buildExportRows();
    const csv = [EXPORT_HEADERS.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
    const mimeType = format === 'Excel' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';
    const filename = `AMS_${activeReport}_${new Date().toISOString().split('T')[0]}.${format === 'Excel' ? 'xls' : 'csv'}`;
    const blob = new Blob(['﻿' + csv], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Real PDF export — render a print-friendly document and invoke the browser's
  // print-to-PDF (no extra dependency needed). Replaces the old alert placeholder.
  const handleExportPDF = () => {
    const rows = buildExportRows();
    const escHtml = (v: unknown) => String(v ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    const title = `AMS Report — ${activeReport.replace(/_/g, ' ')}`;
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to export the PDF.'); return; }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        *{font-family:Inter,Arial,sans-serif;box-sizing:border-box}
        body{margin:24px;color:#18181b}
        h1{font-size:16px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px}
        p.sub{font-size:11px;color:#71717a;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:10px}
        th,td{border:1px solid #e4e4e7;padding:6px 8px;text-align:left}
        th{background:#f4f4f5;text-transform:uppercase;letter-spacing:.04em;font-size:9px;color:#52525b}
        tr:nth-child(even){background:#fafafa}
      </style></head><body>
      <h1>${title}</h1>
      <p class="sub">${consultantName} · ${rows.length} record(s) · ${new Date().toLocaleString()}</p>
      <table><thead><tr>${EXPORT_HEADERS.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${escHtml(c)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="10">No records match the filters.</td></tr>'}</tbody></table>
      <script>window.onload=function(){window.focus();window.print();}</script>
      </body></html>`);
    win.document.close();
  };

  // Recharts Breakdown Data depending on active report
  const chartData = useMemo(() => {
    if (activeReport === 'client_summary') {
      const clientMap: Record<string, number> = {};
      filteredTickets.forEach(t => {
        clientMap[t.organization] = (clientMap[t.organization] || 0) + 1;
      });
      return Object.entries(clientMap).map(([name, value]) => ({ name, value }));
    }

    if (activeReport === 'hours_summary') {
      return [
        { name: 'Estimated Hours', value: kpis.totalEst },
        { name: 'Actual Hours', value: kpis.totalAct }
      ];
    }

    if (activeReport === 'billable_hours') {
      return [
        { name: 'Billable Hours', value: kpis.billableHours },
        { name: 'Non-Billable Hours', value: kpis.nonBillableHours }
      ];
    }

    // Default status breakdown
    const statusMap: Record<string, number> = {};
    filteredTickets.forEach(t => {
      statusMap[t.status] = (statusMap[t.status] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [filteredTickets, activeReport, kpis]);

  // Report-aware preview table: aggregate reports show a summary that matches the
  // chart, list reports show ticket rows. This is what makes the TABLE (not just
  // the chart) update when a tile is selected.
  type ReportView = { mode: 'tickets' } | { mode: 'summary'; columns: string[]; rows: (string | number)[][] };
  const reportView = useMemo<ReportView>(() => {
    if (activeReport === 'client_summary') {
      const m = new Map<string, { tickets: number; est: number; act: number }>();
      filteredTickets.forEach(t => {
        const row = m.get(t.organization) || { tickets: 0, est: 0, act: 0 };
        row.tickets++;
        const est = (t.hourEstimates || []).filter(e => e.status === 'Submitted' || e.status === 'Revision Approved').sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
        row.est += est?.totalEstimatedHours || t.quotedHours || 0;
        const cls = (t.closureRequests || []).find(c => c.status === 'Approved');
        row.act += cls?.totalActualHours || 0;
        m.set(t.organization, row);
      });
      return { mode: 'summary', columns: ['Client', 'Tickets', 'Est Hours', 'Actual Hours'],
        rows: Array.from(m.entries()).sort((a, b) => b[1].tickets - a[1].tickets).map(([client, r]) => [client, r.tickets, `${r.est}h`, `${r.act}h`]) };
    }
    if (activeReport === 'hours_summary') {
      return { mode: 'summary', columns: ['Metric', 'Hours'],
        rows: [['Estimated Hours', `${kpis.totalEst.toFixed(1)}h`], ['Approved Actual Hours', `${kpis.totalAct.toFixed(1)}h`], ['Variance', `${(kpis.totalAct - kpis.totalEst).toFixed(1)}h`]] };
    }
    if (activeReport === 'billable_hours') {
      return { mode: 'summary', columns: ['Metric', 'Hours'],
        rows: [['Billable Hours', `${kpis.billableHours.toFixed(1)}h`], ['Non-Billable Hours', `${kpis.nonBillableHours.toFixed(1)}h`]] };
    }
    if (activeReport === 'sla_compliance') {
      const compliant = Math.round(filteredTickets.length * kpis.complianceRate / 100);
      return { mode: 'summary', columns: ['SLA Outcome', 'Tickets'],
        rows: [['Within SLA', compliant], ['Breached / At Risk', filteredTickets.length - compliant]] };
    }
    return { mode: 'tickets' };
  }, [activeReport, filteredTickets, kpis]);

  return (
    <div className="space-y-6 bg-slate-50 text-slate-900 min-h-screen p-6 md:p-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/consultant/dashboard">
            <Button variant="outline" size="icon" className="h-8 w-8 text-slate-600 bg-surface">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold uppercase text-slate-950">Analytics Reports Desk</h1>
            <p className="text-slate-500 text-xs mt-1">
              Select configurations, filter records, and download operational timesheets.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleExport('CSV')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[11px] h-8 cursor-pointer shadow"
          >
            <Download size={12} className="mr-1" />
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('Excel')}
            variant="outline"
            className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold uppercase text-[11px] h-8 cursor-pointer"
          >
            <FileSpreadsheet size={12} className="mr-1" />
            Export Excel
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="outline"
            className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold uppercase text-[11px] h-8 cursor-pointer"
          >
            <FileText size={12} className="mr-1" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Tabs Selector (8 Reports) */}
      <div className="bg-surface border border-slate-200 rounded-lg p-2 flex flex-wrap gap-1.5 shadow-card">
        {[
          { id: 'monthly_performance', label: 'Monthly Performance' },
          { id: 'ticket_summary', label: 'Ticket Summary' },
          { id: 'client_summary', label: 'Client Summary' },
          { id: 'hours_summary', label: 'Hours Summary' },
          { id: 'billable_hours', label: 'Billable Hours' },
          { id: 'closed_tickets', label: 'Closed Tickets' },
          { id: 'reopened_tickets', label: 'Reopened Tickets' },
          { id: 'sla_compliance', label: 'SLA Compliance' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as ReportType)}
            className={`px-3 py-1.5 rounded font-bold uppercase tracking-wider text-[11px] transition ${
              activeReport === tab.id
                ? 'bg-slate-950 text-white'
                : 'text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Panel (5 filters) */}
      <Card className="bg-surface border border-slate-200 p-4 shadow-card grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Date Range Start */}
        <div>
          <label className="font-bold text-slate-450 uppercase text-[11px] tracking-wider block mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs focus:outline-none"
          />
        </div>

        {/* Date Range End */}
        <div>
          <label className="font-bold text-slate-450 uppercase text-[11px] tracking-wider block mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs focus:outline-none"
          />
        </div>

        {/* Client */}
        <div>
          <label className="font-bold text-slate-450 uppercase text-[11px] tracking-wider block mb-1">Client</label>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs focus:outline-none"
          >
            <option value="All">All Clients</option>
            {clientsList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* SAP Module */}
        <div>
          <label className="font-bold text-slate-450 uppercase text-[11px] tracking-wider block mb-1">SAP Module</label>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs focus:outline-none"
          >
            <option value="All">All Modules</option>
            {modulesList.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="font-bold text-slate-450 uppercase text-[11px] tracking-wider block mb-1">Priority</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs focus:outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </Card>

      {/* KPI Cards section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-surface border border-slate-200 p-4 shadow-card flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Filtered Scope Tickets</span>
          <span className="text-xl font-bold text-slate-900 mt-1">{kpis.total} Items</span>
        </Card>
        <Card className="bg-surface border border-slate-200 p-4 shadow-card border-l-2 border-l-emerald-500 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase text-emerald-800">Approved Actual Hours</span>
          <span className="text-xl font-bold text-success mt-1">{kpis.totalAct.toFixed(1)} h</span>
        </Card>
        <Card className="bg-surface border border-slate-200 p-4 shadow-card border-l-2 border-l-info flex flex-col justify-between">
          <span className="text-[11px] font-bold text-info-strong uppercase">Billable Hours Log</span>
          <span className="text-xl font-bold text-info-strong mt-1">{kpis.billableHours.toFixed(1)} h</span>
        </Card>
        <Card className="bg-surface border border-slate-200 p-4 shadow-card border-l-2 border-l-emerald-500 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-800 uppercase">SLA Compliance Rate</span>
          <span className="text-xl font-bold text-success mt-1">{kpis.complianceRate.toFixed(1)}%</span>
        </Card>
      </div>

      {/* Output preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table Preview */}
        <Card className="lg:col-span-2 bg-surface border border-slate-200 shadow-card overflow-hidden flex flex-col justify-between">
          <span className="font-bold text-[11px] text-slate-450 uppercase tracking-widest p-4 border-b border-slate-100 block bg-slate-50/50">
            Report Data Preview Table
          </span>

          <div className="overflow-x-auto">
            {reportView.mode === 'summary' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                    {reportView.columns.map((c, i) => (
                      <th key={c} className={`py-2.5 px-3 ${i > 0 ? 'text-right' : ''}`}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {reportView.rows.length === 0 ? (
                    <tr><td colSpan={reportView.columns.length} className="py-12 text-center text-slate-400 italic">No data for this report.</td></tr>
                  ) : reportView.rows.map((r, ri) => (
                    <tr key={ri} className="hover:bg-slate-50/50">
                      {r.map((cell, ci) => (
                        <td key={ci} className={`py-3 px-3 ${ci === 0 ? 'font-bold text-slate-900' : 'text-right font-semibold tabular-nums text-slate-700'}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-2.5 px-3">Ticket #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">SAP Module</th>
                  <th className="py-2.5 px-3 text-center">Est Hours</th>
                  <th className="py-2.5 px-3 text-center">Actual Hours</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 italic">No records match configuration filters.</td>
                  </tr>
                ) : (
                  filteredTickets.map(t => {
                    const latestEst = (t.hourEstimates || [])
                      .filter(e => e.status === 'Submitted' || e.status === 'Revision Approved')
                      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
                    const approvedCls = (t.closureRequests || []).find(c => c.status === 'Approved');

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-bold text-slate-955">{t.ticketNumber || t.id}</td>
                        <td className="py-3 px-3 font-semibold text-slate-655">{t.organization}</td>
                        <td className="py-3 px-3 text-slate-900 truncate max-w-[150px]" title={t.title}>{t.title}</td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[11px] uppercase">{t.sapModule}</Badge>
                        </td>
                        <td className="py-3 px-3 text-center font-bold">{latestEst?.totalEstimatedHours || t.quotedHours || 0}h</td>
                        <td className="py-3 px-3 text-center font-bold text-success">{approvedCls?.totalActualHours || 0}h</td>
                        <td className="py-3 px-3">
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[11px] ${
                            t.status === 'Closed' ? 'text-success-strong bg-success-soft' :
                            t.status === 'Request for Closure' ? 'text-brand-strong bg-brand-soft' :
                            'text-slate-700 bg-slate-50'
                          }`}>{t.status}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            )}
          </div>

          <div className="bg-slate-50 p-3 border-t border-slate-200 text-right text-slate-500 font-bold uppercase text-[11px]">
            {reportView.mode === 'summary'
              ? `Previewing ${reportView.rows.length} summary row${reportView.rows.length === 1 ? '' : 's'}`
              : `Previewing ${filteredTickets.length} matching incident row${filteredTickets.length === 1 ? '' : 's'}`}
          </div>
        </Card>

        {/* Chart breakdown panel */}
        <Card className="bg-surface border border-slate-200 shadow-card p-4 flex flex-col justify-between h-[380px]">
          <span className="font-bold text-[11px] text-slate-450 uppercase tracking-widest block border-b border-slate-100 pb-2">
            Chart breakdown distribution
          </span>

          <div className="w-full h-72 mt-4">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">
                No data available for charting
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 8 }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 8 }} />
                  <RechartsTooltip contentStyle={{ fontSize: 10 }} />
                  <Bar dataKey="value" fill={chartColors.categorical[0]} barSize={14} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

      </div>

    </div>
  );
}
