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

  // Base scope (assigned tickets only)
  const myTickets = useMemo(() => {
    return tickets.filter(t => t.assignedConsultant === consultantName);
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

  // CSV/Excel Exporter
  const handleExport = (format: 'CSV' | 'Excel') => {
    const headers = ['Ticket ID', 'Customer', 'Subject', 'SAP Module', 'Priority', 'Status', 'Quoted/Est Hours', 'Actual Hours', 'Billable', 'Created At'];
    
    const rows = filteredTickets.map(t => {
      const latestEst = (t.hourEstimates || [])
        .filter(e => e.status === 'Submitted' || e.status === 'Revision Approved')
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
      const approvedCls = (t.closureRequests || []).find(c => c.status === 'Approved');

      return [
        t.id,
        t.organization,
        `"${t.title.replace(/"/g, '""')}"`,
        t.sapModule,
        t.priority,
        t.status,
        String(latestEst?.totalEstimatedHours || t.quotedHours || 0),
        String(approvedCls?.totalActualHours || 0),
        t.billable ? 'Billable' : 'Non-Billable',
        new Date(t.createdAt).toLocaleDateString()
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const mimeType = format === 'Excel' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';
    const filename = `AMS_${activeReport}_Report_${new Date().toISOString().split('T')[0]}.${format === 'Excel' ? 'xls' : 'csv'}`;
    
    const blob = new Blob([csvContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePDFPlaceholder = () => {
    alert('PDF Generation Placeholder: Print Layout sent to spool queue in background.');
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

  return (
    <div className="space-y-6 bg-slate-50 text-slate-900 min-h-screen p-6 md:p-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/consultant/dashboard">
            <Button variant="outline" size="icon" className="h-8 w-8 text-slate-600 bg-white">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold uppercase text-slate-950 font-mono">Analytics Reports Desk</h1>
            <p className="text-slate-500 text-xs mt-1">
              Select configurations, filter records, and download operational timesheets.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleExport('CSV')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[9px] h-8 cursor-pointer shadow font-mono"
          >
            <Download size={12} className="mr-1" />
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('Excel')}
            variant="outline"
            className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold uppercase text-[9px] h-8 cursor-pointer font-mono"
          >
            <FileSpreadsheet size={12} className="mr-1" />
            Export Excel
          </Button>
          <Button
            onClick={handlePDFPlaceholder}
            variant="outline"
            className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold uppercase text-[9px] h-8 cursor-pointer font-mono"
          >
            <FileText size={12} className="mr-1" />
            PDF Placeholder
          </Button>
        </div>
      </div>

      {/* Tabs Selector (8 Reports) */}
      <div className="bg-white border border-slate-200 rounded-lg p-2 flex flex-wrap gap-1.5 shadow-sm">
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
            className={`px-3 py-1.5 rounded font-mono font-bold uppercase tracking-wider text-[9px] transition ${
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
      <Card className="bg-white border border-slate-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Date Range Start */}
        <div>
          <label className="font-bold text-slate-450 uppercase text-[8px] tracking-wider block mb-1 font-mono">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono focus:outline-none"
          />
        </div>

        {/* Date Range End */}
        <div>
          <label className="font-bold text-slate-450 uppercase text-[8px] tracking-wider block mb-1 font-mono">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono focus:outline-none"
          />
        </div>

        {/* Client */}
        <div>
          <label className="font-bold text-slate-450 uppercase text-[8px] tracking-wider block mb-1 font-mono">Client</label>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono focus:outline-none"
          >
            <option value="All">All Clients</option>
            {clientsList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* SAP Module */}
        <div>
          <label className="font-bold text-slate-450 uppercase text-[8px] tracking-wider block mb-1 font-mono">SAP Module</label>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono focus:outline-none"
          >
            <option value="All">All Modules</option>
            {modulesList.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="font-bold text-slate-450 uppercase text-[8px] tracking-wider block mb-1 font-mono">Priority</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono focus:outline-none"
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
        <Card className="bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Filtered Scope Tickets</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1">{kpis.total} Items</span>
        </Card>
        <Card className="bg-white border border-slate-200 p-4 shadow-sm border-l-2 border-l-emerald-500 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase text-emerald-800 font-mono">Approved Actual Hours</span>
          <span className="text-xl font-bold font-mono text-emerald-600 mt-1">{kpis.totalAct.toFixed(1)} h</span>
        </Card>
        <Card className="bg-white border border-slate-200 p-4 shadow-sm border-l-2 border-l-indigo-500 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-indigo-800 uppercase font-mono">Billable Hours Log</span>
          <span className="text-xl font-bold font-mono text-indigo-700 mt-1">{kpis.billableHours.toFixed(1)} h</span>
        </Card>
        <Card className="bg-white border border-slate-200 p-4 shadow-sm border-l-2 border-l-emerald-500 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-emerald-800 uppercase font-mono">SLA Compliance Rate</span>
          <span className="text-xl font-bold font-mono text-emerald-600 mt-1">{kpis.complianceRate.toFixed(1)}%</span>
        </Card>
      </div>

      {/* Output preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table Preview */}
        <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <span className="font-bold text-[9px] text-slate-450 uppercase tracking-widest p-4 border-b border-slate-100 block bg-slate-50/50 font-mono">
            Report Data Preview Table
          </span>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider font-mono">
                  <th className="py-2.5 px-3">Ticket ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">SAP Module</th>
                  <th className="py-2.5 px-3 text-center">Est Hours</th>
                  <th className="py-2.5 px-3 text-center">Actual Hours</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-mono">
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
                        <td className="py-3 px-3 font-bold text-slate-950">{t.id}</td>
                        <td className="py-3 px-3 font-semibold text-slate-655">{t.organization}</td>
                        <td className="py-3 px-3 text-slate-900 truncate max-w-[150px]" title={t.title}>{t.title}</td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[8px] uppercase">{t.sapModule}</Badge>
                        </td>
                        <td className="py-3 px-3 text-center font-bold">{latestEst?.totalEstimatedHours || t.quotedHours || 0}h</td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600">{approvedCls?.totalActualHours || 0}h</td>
                        <td className="py-3 px-3">
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                            t.status === 'Closed' ? 'text-emerald-700 bg-emerald-50' :
                            t.status === 'Request for Closure' ? 'text-blue-700 bg-blue-50' :
                            'text-slate-700 bg-slate-50'
                          }`}>{t.status}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-3 border-t border-slate-200 text-right text-slate-500 font-bold uppercase text-[9px] font-mono">
            Previewing {filteredTickets.length} matching incidents rows
          </div>
        </Card>

        {/* Chart breakdown panel */}
        <Card className="bg-white border border-slate-200 shadow-sm p-4 flex flex-col justify-between h-[380px]">
          <span className="font-bold text-[9px] text-slate-450 uppercase tracking-widest block border-b border-slate-100 pb-2 font-mono">
            Chart breakdown distribution
          </span>

          <div className="w-full h-72 mt-4">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs italic font-mono">
                No data available for charting
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 8 }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 8 }} />
                  <RechartsTooltip contentStyle={{ fontSize: 10 }} />
                  <Bar dataKey="value" fill="#0f172a" barSize={14} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

      </div>

    </div>
  );
}
