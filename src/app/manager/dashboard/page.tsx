'use client';

import React, { useMemo, useState } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import {
  AlertCircle,
  Clock,
  UserCheck,
  Building2,
  Layers,
  ShieldCheck,
  Download,
  Calendar,
  Zap,
  TrendingUp,
  Activity,
  FileText,
  ShieldAlert,
  AlertTriangle,
  User,
  Users,
  CheckCircle,
  HelpCircle,
  FileCode,
  Lock,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

// Helper: Calculate Sunday through Thursday working days in a month (excluding Friday/Saturday)
function getWorkingDaysCount(year: number, monthIndex: number) {
  let count = 0;
  const date = new Date(year, monthIndex, 1);
  while (date.getMonth() === monthIndex) {
    const day = date.getDay();
    if (day !== 5 && day !== 6) { // 5 = Friday, 6 = Saturday
      count++;
    }
    date.setDate(date.getDate() + 1);
  }
  return count;
}

const MONTH_OPTIONS = [
  { value: '2025-11', label: 'December 2025' },
  { value: '2026-00', label: 'January 2026' },
  { value: '2026-01', label: 'February 2026' },
  { value: '2026-02', label: 'March 2026' },
  { value: '2026-03', label: 'April 2026' },
  { value: '2026-04', label: 'May 2026' },
  { value: '2026-05', label: 'June 2026' },
  { value: '2026-06', label: 'July 2026' },
  { value: '2026-07', label: 'August 2026' },
];

export default function ManagerDashboardPage() {
  const { tickets } = useTickets();
  const { user } = useAuth();

  const [selectedMonthStr, setSelectedMonthStr] = useState('2026-04'); // May 2026
  const [selectedYear, selectedMonth] = useMemo(() => {
    const [y, m] = selectedMonthStr.split('-');
    return [parseInt(y, 10), parseInt(m, 10)];
  }, [selectedMonthStr]);

  const [activeChartTab, setActiveChartTab] = useState<'tickets' | 'customers' | 'consultants' | 'operational'>('tickets');

  // Base Scoped Tickets for the Manager
  const scopedTickets = useMemo(() => {
    return tickets.filter(t => {
      if (user?.company && user.company !== 'SST SAP Operations') {
        return t.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  // Dynamic calculations for current selected month
  const stats = useMemo(() => {
    const now = new Date();
    const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
    const seed = (selectedYear * 12 + selectedMonth) % 100;

    const workingDays = getWorkingDaysCount(selectedYear, selectedMonth);
    const expectedCapacityHours = workingDays * 8; // sun-thu only

    // ── Database Metrics ──
    const dbMonthTickets = scopedTickets.filter(t => {
      const d = new Date(t.createdAt);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });

    const dbMonthClosed = dbMonthTickets.filter(t => t.status === 'Closed').length;
    const dbMonthResolved = dbMonthTickets.filter(t => t.status === 'Resolved').length;
    const dbMonthNew = dbMonthTickets.filter(t => t.status === 'New').length;
    const dbMonthUnassigned = dbMonthTickets.filter(t => !t.assignedConsultant).length;
    const dbMonthCritical = dbMonthTickets.filter(t => t.priority === 'Critical').length;
    const dbMonthHigh = dbMonthTickets.filter(t => t.priority === 'High').length;
    const dbMonthReopened = dbMonthTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length;
    const dbMonthIPFunc = dbMonthTickets.filter(t => t.status === 'In Progress - Functional').length;
    const dbMonthIPTech = dbMonthTickets.filter(t => t.status === 'In Progress - Technical').length;
    const dbMonthCustAct = dbMonthTickets.filter(t => t.status === 'Customer Action' || t.status === 'Waiting for Customer').length;
    const dbMonthSap = dbMonthTickets.filter(t => t.status === 'Raised to SAP').length;
    const dbMonthClosureReq = dbMonthTickets.filter(t => t.status === 'Request for Closure').length;
    const dbMonthReqGathering = dbMonthTickets.filter(t => t.status === 'Requirement Gathering').length;

    // SLA calculation
    const nowTime = Date.now();
    const dbMonthBreached = dbMonthTickets.filter(t => {
      if (t.status === 'Closed' || t.status === 'Resolved') return false;
      return new Date(t.slaDueAt).getTime() < nowTime;
    }).length;

    const dbMonthSlaWarning = dbMonthTickets.filter(t => {
      if (t.status === 'Closed' || t.status === 'Resolved') return false;
      const diff = new Date(t.slaDueAt).getTime() - nowTime;
      return diff > 0 && diff < 24 * 60 * 60 * 1000;
    }).length;

    // Effort Hours calculations
    let dbActualHours = 0;
    let dbBillableHours = 0;
    let dbPlannedHours = 0;

    dbMonthTickets.forEach(t => {
      const latestEst = (t.hourEstimates || [])
        .filter(e => e.status === 'Submitted' || e.status === 'Revision Approved')
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
      dbPlannedHours += latestEst?.totalEstimatedHours || t.quotedHours || 0;

      const approvedClosure = (t.closureRequests || []).find(req => req.status === 'Approved');
      if (approvedClosure) {
        dbActualHours += approvedClosure.totalActualHours;
        if (t.billable) dbBillableHours += approvedClosure.totalActualHours;
      }
      
      // Sum up logged efforts
      (t.efforts || []).forEach(e => {
        if (e.status === 'Approved') {
          dbActualHours += e.hoursWorked || e.hoursLogged || 0;
          if (e.billable) dbBillableHours += e.hoursWorked || e.hoursLogged || 0;
        }
      });
    });

    // ── Blended Scale Sim Coefficients ──
    const scaleFactor = 3.5;
    
    // Customers (Total 40+)
    const uniqueOrgs = Array.from(new Set(scopedTickets.map(t => t.organization)));
    const totalCustomers = Math.max(42, uniqueOrgs.length);
    const activeCustomers = Math.max(38, scopedTickets.filter(t => t.status !== 'Closed').reduce((set, t) => set.add(t.organization), new Set()).size);
    const criticalCusts = scopedTickets.filter(t => t.priority === 'Critical' && t.status !== 'Closed').reduce((set, t) => set.add(t.organization), new Set()).size || 3;
    const breachedCusts = scopedTickets.filter(t => {
      if (t.status === 'Closed' || t.status === 'Resolved') return false;
      return new Date(t.slaDueAt).getTime() < nowTime;
    }).reduce((set, t) => set.add(t.organization), new Set()).size || 1;

    // Tickets
    const totalTickets = isCurrentMonth ? Math.max(scopedTickets.length, 310 + (seed % 20)) : 280 + (seed * 8) % 100;
    const closedTickets = isCurrentMonth ? Math.max(scopedTickets.filter(t => t.status === 'Closed').length, 210) : Math.round(totalTickets * 0.75);
    const unassignedTickets = isCurrentMonth ? dbMonthUnassigned : 3 + (seed % 4);
    const ipFunc = isCurrentMonth ? Math.max(dbMonthIPFunc, 14 + (seed % 5)) : 12 + (seed % 4);
    const ipTech = isCurrentMonth ? Math.max(dbMonthIPTech, 18 + (seed % 6)) : 15 + (seed % 5);
    const custAction = isCurrentMonth ? Math.max(dbMonthCustAct, 8 + (seed % 4)) : 7 + (seed % 3);
    const raisedSap = isCurrentMonth ? Math.max(dbMonthSap, 4 + (seed % 3)) : 3 + (seed % 2);
    const closureReq = isCurrentMonth ? Math.max(dbMonthClosureReq, 6 + (seed % 4)) : 5 + (seed % 3);
    const reopenedTickets = isCurrentMonth ? Math.max(dbMonthReopened, 4 + (seed % 3)) : 3 + (seed % 2);
    const reqGathering = isCurrentMonth ? Math.max(dbMonthReqGathering, 9 + (seed % 4)) : 8 + (seed % 3);
    const newTickets = isCurrentMonth ? Math.max(dbMonthNew, 5 + (seed % 4)) : 6 + (seed % 3);

    const openTickets = totalTickets - closedTickets;

    // Priorities
    const criticalTickets = isCurrentMonth ? Math.max(dbMonthCritical, 6 + (seed % 3)) : 5 + (seed % 2);
    const highTickets = isCurrentMonth ? Math.max(dbMonthHigh, 22 + (seed % 8)) : 18 + (seed % 5);
    const breachedTickets = isCurrentMonth ? Math.max(dbMonthBreached, 2) : seed % 4 === 0 ? 1 : 0;
    const warningTickets = isCurrentMonth ? Math.max(dbMonthSlaWarning, 5) : 3 + (seed % 3);

    // Approvals
    const estPending = isCurrentMonth ? scopedTickets.flatMap(t => t.hourEstimates || []).filter(e => e.status === 'Submitted' || e.status === 'Revision Requested').length : 6 + (seed % 4);
    const actPending = isCurrentMonth ? scopedTickets.flatMap(t => t.efforts || []).filter(e => e.status === 'Pending' || e.status === 'Pending Approval' || e.status === 'Resubmitted').length : 14 + (seed % 6);
    const closurePending = isCurrentMonth ? scopedTickets.flatMap(t => t.closureRequests || []).filter(e => e.status === 'Pending Manager Approval' || e.status === 'Resubmitted').length : 4 + (seed % 3);
    const reopenPending = isCurrentMonth ? scopedTickets.filter(t => t.status === 'Reopened').length : 3 + (seed % 2);
    const unlockPending = isCurrentMonth ? scopedTickets.flatMap(t => t.unlockRequests || []).filter(e => e.status === 'Pending').length : 2 + (seed % 2);

    // Resources (Total 70+)
    const totalConsultants = 72;
    const funcConsultants = 42;
    const techConsultants = 30;
    const activeConsultants = 66;
    const overloadedConsultants = 4 + (seed % 3);
    const underutilizedConsultants = 7 - (seed % 3);

    // Hours
    const actualHours = isCurrentMonth ? Math.max(activeConsultants * 115, dbActualHours) : activeConsultants * 124 + (seed % 30);
    const billableHours = Math.round(actualHours * 0.84);
    const nonBillableHours = actualHours - billableHours;
    const plannedHours = isCurrentMonth ? Math.max(activeConsultants * 125, dbPlannedHours) : actualHours + 700;

    return {
      workingDays,
      expectedCapacityHours,
      totalCustomers,
      activeCustomers,
      criticalCusts,
      breachedCusts,

      totalTickets,
      openTickets,
      unassignedTickets,
      ipFunc,
      ipTech,
      custAction,
      raisedSap,
      closureReq,
      closedTickets,
      reopenedTickets,
      reqGathering,
      newTickets,

      criticalTickets,
      highTickets,
      breachedTickets,
      warningTickets,

      estPending,
      actPending,
      closurePending,
      reopenPending,
      unlockPending,

      totalConsultants,
      funcConsultants,
      techConsultants,
      activeConsultants,
      overloadedConsultants,
      underutilizedConsultants,

      actualHours,
      billableHours,
      nonBillableHours,
      plannedHours,
      utilizationPercent: Math.min(100.0, (actualHours / (activeConsultants * expectedCapacityHours)) * 100)
    };
  }, [selectedYear, selectedMonth, scopedTickets]);

  // ── CSV Download Handlers ──
  const handleDownloadMonthlyReport = () => {
    const headers = ['Metric Focus', 'Value Count'];
    const rows = [
      ['Total SAP Customers', stats.totalCustomers],
      ['Active Ticket Backlog', stats.openTickets],
      ['SLA Breaches Detected', stats.breachedTickets],
      ['Total Effort Hours Logged', `${stats.actualHours} hrs`],
      ['Billable Ratio', `${((stats.billableHours / stats.actualHours) * 100).toFixed(1)}%`],
      ['Average Capacity Utilization', `${stats.utilizationPercent.toFixed(1)}%`]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `SST_AMS_Monthly_Scorecard_${selectedMonthStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPerformanceReport = () => {
    const headers = ['SLA Status Group', 'Incident Count'];
    const rows = [
      ['SLA Compliant / Healthy', stats.totalTickets - stats.breachedTickets],
      ['SLA Breached', stats.breachedTickets],
      ['Approaching SLA Target (<24h)', stats.warningTickets],
      ['Critical Urgency Incidents', stats.criticalTickets]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `SST_AMS_SLA_Audit_${selectedMonthStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadUtilizationReport = () => {
    const headers = ['Resource Category', 'Value'];
    const rows = [
      ['Total Active Workforce', stats.totalConsultants],
      ['Functional Consultants', stats.funcConsultants],
      ['Technical Consultants', stats.techConsultants],
      ['Overloaded Resources (>92% Ute)', stats.overloadedConsultants],
      ['Underutilized Resources (<70% Ute)', stats.underutilizedConsultants],
      ['Practice Utilization Percentage', `${stats.utilizationPercent.toFixed(1)}%`]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `SST_AMS_Capacity_Utilization_${selectedMonthStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── 22 CHARTS TREND DATA GENERATOR ──
  const ticketTrends = useMemo(() => {
    return [
      { name: 'New', count: stats.newTickets },
      { name: 'Assigned', count: stats.totalTickets - stats.newTickets - stats.ipFunc - stats.ipTech - stats.closedTickets },
      { name: 'Req Gathering', count: stats.reqGathering },
      { name: 'IP Functional', count: stats.ipFunc },
      { name: 'IP Technical', count: stats.ipTech },
      { name: 'Cust Action', count: stats.custAction },
      { name: 'OSS SAP', count: stats.raisedSap },
      { name: 'Closure Req', count: stats.closureReq },
      { name: 'Reopened', count: stats.reopenedTickets },
      { name: 'Closed', count: stats.closedTickets }
    ];
  }, [stats]);

  const priorityTrends = useMemo(() => [
    { name: 'Critical (P1)', value: stats.criticalTickets },
    { name: 'High (P2)', value: stats.highTickets },
    { name: 'Medium (P3)', value: Math.round(stats.totalTickets * 0.4) },
    { name: 'Low (P4)', value: Math.round(stats.totalTickets * 0.35) }
  ], [stats]);

  const moduleTrends = useMemo(() => [
    { name: 'FICO', Tickets: Math.round(stats.totalTickets * 0.28) },
    { name: 'MM', Tickets: Math.round(stats.totalTickets * 0.22) },
    { name: 'SD', Tickets: Math.round(stats.totalTickets * 0.18) },
    { name: 'ABAP', Tickets: Math.round(stats.totalTickets * 0.14) },
    { name: 'BASIS', Tickets: Math.round(stats.totalTickets * 0.12) },
    { name: 'CPI', Tickets: Math.round(stats.totalTickets * 0.06) }
  ], [stats]);

  const typeTrends = useMemo(() => [
    { name: 'Incident', Tickets: Math.round(stats.totalTickets * 0.65) },
    { name: 'Service Request', Tickets: Math.round(stats.totalTickets * 0.22) },
    { name: 'Change Request', Tickets: Math.round(stats.totalTickets * 0.10) },
    { name: 'Others', Tickets: Math.round(stats.totalTickets * 0.03) }
  ], [stats]);

  const openVsClosedTrend = useMemo(() => [
    { month: 'Jan', Open: 65, Closed: 58 },
    { month: 'Feb', Open: 72, Closed: 64 },
    { month: 'Mar', Open: 84, Closed: 72 },
    { month: 'Apr', Open: stats.openTickets, Closed: stats.closedTickets }
  ], [stats]);

  const reopenTrendData = useMemo(() => [
    { month: 'Jan', Reopened: 2 },
    { month: 'Feb', Reopened: 4 },
    { month: 'Mar', Reopened: 3 },
    { month: 'Apr', Reopened: stats.reopenedTickets }
  ], [stats]);

  const agingTrendData = useMemo(() => [
    { name: '< 3 Days', count: Math.round(stats.openTickets * 0.45) },
    { name: '3-7 Days', count: Math.round(stats.openTickets * 0.35) },
    { name: '7-14 Days', count: Math.round(stats.openTickets * 0.15) },
    { name: '14+ Days', count: Math.round(stats.openTickets * 0.05) }
  ], [stats]);

  // Customer Analytics Data
  const ticketsByCustomer = useMemo(() => [
    { name: 'Apex Global', Tickets: Math.round(stats.totalTickets * 0.35) },
    { name: 'Titan Energy', Tickets: Math.round(stats.totalTickets * 0.25) },
    { name: 'Nexa Mfg', Tickets: Math.round(stats.totalTickets * 0.20) },
    { name: 'Orion Log', Tickets: Math.round(stats.totalTickets * 0.12) },
    { name: 'Stellar Retail', Tickets: Math.round(stats.totalTickets * 0.08) }
  ], [stats]);

  const customerHealthTrend = useMemo(() => [
    { month: 'Jan', Health: 94 },
    { month: 'Feb', Health: 96 },
    { month: 'Mar', Health: 95 },
    { month: 'Apr', Health: Math.round(100 - (stats.breachedTickets * 1.5)) }
  ], [stats]);

  const customerCsatTrend = useMemo(() => [
    { month: 'Jan', CSAT: 4.5 },
    { month: 'Feb', CSAT: 4.7 },
    { month: 'Mar', CSAT: 4.6 },
    { month: 'Apr', CSAT: 4.8 }
  ], []);

  const customerHoursConsumed = useMemo(() => [
    { name: 'Apex Global', Hours: Math.round(stats.actualHours * 0.36) },
    { name: 'Titan Energy', Hours: Math.round(stats.actualHours * 0.26) },
    { name: 'Nexa Mfg', Hours: Math.round(stats.actualHours * 0.18) },
    { name: 'Orion Log', Hours: Math.round(stats.actualHours * 0.12) },
    { name: 'Stellar Retail', Hours: Math.round(stats.actualHours * 0.08) }
  ], [stats]);

  // Consultant Analytics Data
  const workloadDistData = useMemo(() => [
    { name: 'Priya Raman', Tickets: 4 },
    { name: 'Arjun Mehta', Tickets: 5 },
    { name: 'Karthik Sub', Tickets: 3 },
    { name: 'Elena Rostova', Tickets: 2 },
    { name: 'Sanjay Dutt', Tickets: 6 }
  ], []);

  const utilizationDistData = useMemo(() => [
    { name: 'Priya Raman', Ute: 82 },
    { name: 'Arjun Mehta', Ute: 94 },
    { name: 'Karthik Sub', Ute: 76 },
    { name: 'Elena Rostova', Ute: 65 },
    { name: 'Sanjay Dutt', Ute: 92 }
  ], []);

  const consultantTicketsClosed = useMemo(() => [
    { name: 'Priya R', Closed: 18 },
    { name: 'Arjun M', Closed: 22 },
    { name: 'Karthik S', Closed: 14 },
    { name: 'Elena R', Closed: 11 },
    { name: 'Sanjay D', Closed: 25 }
  ], []);

  const consultantTicketsReopened = useMemo(() => [
    { name: 'Priya R', Reopened: 1 },
    { name: 'Arjun M', Reopened: 2 },
    { name: 'Karthik S', Reopened: 0 },
    { name: 'Elena R', Reopened: 1 },
    { name: 'Sanjay D', Reopened: 3 }
  ], []);

  // Operational Analytics Data
  const slaComplianceTrend = useMemo(() => [
    { month: 'Jan', Compliance: 97.4 },
    { month: 'Feb', Compliance: 98.2 },
    { month: 'Mar', Compliance: 96.8 },
    { month: 'Apr', Compliance: Math.max(92, 100 - (stats.breachedTickets * 0.8)) }
  ], [stats]);

  const slaBreachTrend = useMemo(() => [
    { month: 'Jan', Breaches: 2 },
    { month: 'Feb', Breaches: 1 },
    { month: 'Mar', Breaches: 3 },
    { month: 'Apr', Breaches: stats.breachedTickets }
  ], [stats]);

  const closureApprovalTrend = useMemo(() => [
    { month: 'Jan', Rate: 92 },
    { month: 'Feb', Rate: 95 },
    { month: 'Mar', Rate: 93 },
    { month: 'Apr', Rate: 96 }
  ], []);

  const estVsActualHours = useMemo(() => [
    { module: 'FICO', Est: 450, Act: 480 },
    { module: 'MM', Est: 380, Act: 375 },
    { module: 'SD', Est: 310, Act: 330 },
    { module: 'ABAP', Est: 240, Act: 265 },
    { module: 'BASIS', Est: 200, Act: 195 }
  ], []);

  const raisedToSapTrend = useMemo(() => [
    { month: 'Jan', OSS: 2 },
    { month: 'Feb', OSS: 5 },
    { month: 'Mar', OSS: 4 },
    { month: 'Apr', OSS: stats.raisedSap }
  ], [stats]);

  return (
    <div className="space-y-6 font-mono text-xs text-[#09090b]">
      
      {/* Timeline Selection Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase text-zinc-950 tracking-wider">Delivery Command Center</h1>
          <p className="text-zinc-500 mt-1">SST Enterprise AMS control room monitoring ticket velocities, SLA compliance boundaries, and allocations.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded px-2.5 py-1 text-zinc-500">
            <Calendar size={11} className="text-zinc-400" />
            <select
              value={selectedMonthStr}
              onChange={(e) => setSelectedMonthStr(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-zinc-800 focus:outline-none cursor-pointer font-mono"
            >
              {MONTH_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-zinc-100 border border-zinc-200 rounded px-3 py-1 text-[9px] font-bold text-zinc-650 flex items-center gap-1.5 uppercase">
            <span>Month Capacity:</span>
            <span className="text-zinc-950 font-black font-mono">{stats.expectedCapacityHours} hrs</span>
          </div>
        </div>
      </div>

      {/* ── 2. EXECUTIVE KPI SECTION (4 BLOCKS GRID) ── */}
      <div className="space-y-4">
        <h2 className="text-[10px] uppercase font-bold text-zinc-450 tracking-widest">Executive Health Scorecard</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Customer KPIs */}
          <Card className="border border-zinc-200 shadow-sm flex flex-col justify-between">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-150 py-2.5 px-4 flex flex-row items-center justify-between">
              <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">Customer Metrics</span>
              <Building2 size={11} className="text-zinc-400" />
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between">
                <span>Total Customers:</span>
                <span className="font-bold text-zinc-950">{stats.totalCustomers}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Engagement:</span>
                <span className="font-bold text-zinc-950">{stats.activeCustomers}</span>
              </div>
              <div className="flex justify-between">
                <span>Critical Backlogs:</span>
                <span className={`font-bold ${stats.criticalCusts > 0 ? 'text-red-650' : 'text-zinc-950'}`}>
                  {stats.criticalCusts} Accounts
                </span>
              </div>
              <div className="flex justify-between">
                <span>SLA Breached:</span>
                <span className={`font-bold ${stats.breachedCusts > 0 ? 'text-red-655' : 'text-zinc-950'}`}>
                  {stats.breachedCusts} Accounts
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Ticket KPIs */}
          <Card className="border border-zinc-200 shadow-sm flex flex-col justify-between">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-150 py-2.5 px-4 flex flex-row items-center justify-between">
              <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">Ticket Backlogs</span>
              <Layers size={11} className="text-zinc-400" />
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500">Total:</span>
                <span className="font-bold text-zinc-900">{stats.totalTickets}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500">Open:</span>
                <span className="font-bold text-zinc-900">{stats.openTickets}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500">Unassigned:</span>
                <span className={`font-bold ${stats.unassignedTickets > 0 ? 'text-red-650' : 'text-zinc-900'}`}>{stats.unassignedTickets}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500">IP Func:</span>
                <span className="font-bold text-zinc-900">{stats.ipFunc}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500">IP Tech:</span>
                <span className="font-bold text-zinc-900">{stats.ipTech}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500">Waiting Cust:</span>
                <span className="font-bold text-zinc-900">{stats.custAction}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500">Raised SAP:</span>
                <span className="font-bold text-zinc-900">{stats.raisedSap}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500">Closure Req:</span>
                <span className="font-bold text-zinc-900">{stats.closureReq}</span>
              </div>
              <div className="flex justify-between text-[10px] col-span-2 border-t border-zinc-100 pt-1 mt-0.5">
                <span className="text-zinc-500">Reopened / Closed:</span>
                <span className="font-bold text-zinc-900">{stats.reopenedTickets} / {stats.closedTickets}</span>
              </div>
            </CardContent>
          </Card>

          {/* Approval KPIs */}
          <Card className="border border-zinc-200 shadow-sm flex flex-col justify-between">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-150 py-2.5 px-4 flex flex-row items-center justify-between">
              <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">Workflow Approvals</span>
              <ShieldCheck size={11} className="text-zinc-400" />
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between">
                <span>Estimated Hours:</span>
                <span className={`font-bold ${stats.estPending > 0 ? 'text-amber-600' : 'text-zinc-950'}`}>{stats.estPending} Pending</span>
              </div>
              <div className="flex justify-between">
                <span>Actual Hours (Timesheets):</span>
                <span className={`font-bold ${stats.actPending > 0 ? 'text-amber-600' : 'text-zinc-950'}`}>{stats.actPending} Pending</span>
              </div>
              <div className="flex justify-between">
                <span>Closure Requests:</span>
                <span className={`font-bold ${stats.closurePending > 0 ? 'text-amber-600' : 'text-zinc-950'}`}>{stats.closurePending} Pending</span>
              </div>
              <div className="flex justify-between">
                <span>Reopen / Unlock Requests:</span>
                <span className="font-bold text-zinc-950">{stats.reopenPending + stats.unlockPending} Pending</span>
              </div>
            </CardContent>
          </Card>

          {/* Resource KPIs */}
          <Card className="border border-zinc-200 shadow-sm flex flex-col justify-between">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-150 py-2.5 px-4 flex flex-row items-center justify-between">
              <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">Resource Allocation</span>
              <Users size={11} className="text-zinc-400" />
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between">
                <span>Practice Staff (Func / Tech):</span>
                <span className="font-bold text-zinc-950">{stats.totalConsultants} ({stats.funcConsultants}F / {stats.techConsultants}T)</span>
              </div>
              <div className="flex justify-between">
                <span>Active Consultants:</span>
                <span className="font-bold text-zinc-950">{stats.activeConsultants} Engaged</span>
              </div>
              <div className="flex justify-between">
                <span>Overloaded Resources:</span>
                <span className={`font-bold ${stats.overloadedConsultants > 0 ? 'text-red-650' : 'text-zinc-950'}`}>
                  {stats.overloadedConsultants} (Ute &gt; 92%)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Underutilized Resources:</span>
                <span className="font-bold text-zinc-950">{stats.underutilizedConsultants} (Ute &lt; 70%)</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── 4. OPERATIONAL ALERTS CENTER (12 WIDGETS PANEL) ── */}
      <div className="space-y-4">
        <h2 className="text-[10px] uppercase font-bold text-zinc-450 tracking-widest">Operational Alerts Center</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          
          {/* 1. Critical Tickets */}
          <div className={`p-3 border rounded-lg space-y-1 ${stats.criticalTickets > 0 ? 'bg-red-50/20 border-red-200 text-red-800' : 'bg-zinc-50/30 border-zinc-200 text-zinc-600'}`}>
            <span className="text-[8px] uppercase font-bold block">Critical Urgency</span>
            <div className="text-base font-bold flex items-baseline gap-1">
              <span>{stats.criticalTickets}</span>
              <span className="text-[9px] font-normal">Active P1s</span>
            </div>
          </div>

          {/* 2. SLA Breached */}
          <div className={`p-3 border rounded-lg space-y-1 ${stats.breachedTickets > 0 ? 'bg-red-50/20 border-red-200 text-red-800' : 'bg-zinc-50/30 border-zinc-200 text-zinc-600'}`}>
            <span className="text-[8px] uppercase font-bold block">SLA Overdue</span>
            <div className="text-base font-bold flex items-baseline gap-1">
              <span>{stats.breachedTickets}</span>
              <span className="text-[9px] font-normal">Breached</span>
            </div>
          </div>

          {/* 3. SLA Due < 24 Hours */}
          <div className={`p-3 border rounded-lg space-y-1 ${stats.warningTickets > 0 ? 'bg-amber-50/20 border-amber-250 text-amber-800' : 'bg-zinc-50/30 border-zinc-200 text-zinc-600'}`}>
            <span className="text-[8px] uppercase font-bold block">SLA Warning</span>
            <div className="text-base font-bold flex items-baseline gap-1">
              <span>{stats.warningTickets}</span>
              <span className="text-[9px] font-normal">&lt; 24h Left</span>
            </div>
          </div>

          {/* 4. Tickets Without Assignment */}
          <div className={`p-3 border rounded-lg space-y-1 ${stats.unassignedTickets > 0 ? 'bg-amber-50/20 border-amber-255 text-amber-800' : 'bg-zinc-50/30 border-zinc-200 text-zinc-600'}`}>
            <span className="text-[8px] uppercase font-bold block">Needs Routing</span>
            <div className="text-base font-bold flex items-baseline gap-1">
              <span>{stats.unassignedTickets}</span>
              <span className="text-[9px] font-normal">Unassigned</span>
            </div>
          </div>

          {/* 5. Tickets Waiting For Customer */}
          <div className="p-3 bg-zinc-50/50 border border-zinc-200 text-zinc-700 rounded-lg space-y-1">
            <span className="text-[8px] uppercase font-bold block">Waiting Customer</span>
            <div className="text-base font-bold flex items-baseline gap-1">
              <span>{stats.custAction}</span>
              <span className="text-[9px] font-normal">On Client</span>
            </div>
          </div>

          {/* 6. Tickets Waiting For Consultant */}
          <div className="p-3 bg-zinc-50/50 border border-zinc-200 text-zinc-700 rounded-lg space-y-1">
            <span className="text-[8px] uppercase font-bold block">Waiting Team</span>
            <div className="text-base font-bold flex items-baseline gap-1">
              <span>{stats.ipFunc + stats.ipTech}</span>
              <span className="text-[9px] font-normal">In Progress</span>
            </div>
          </div>

          {/* 7. Tickets Waiting For Approval */}
          <div className={`p-3 border rounded-lg space-y-1 ${stats.estPending + stats.actPending > 0 ? 'bg-amber-50/25 border-amber-200 text-amber-700' : 'bg-zinc-50/30 border-zinc-200 text-zinc-600'}`}>
            <span className="text-[8px] uppercase font-bold block">Hours Approvals</span>
            <div className="text-base font-bold flex items-baseline gap-1">
              <span>{stats.estPending + stats.actPending}</span>
              <span className="text-[9px] font-normal">Pending</span>
            </div>
          </div>

          {/* 8. Closure Requests Pending */}
          <div className={`p-3 border rounded-lg space-y-1 ${stats.closurePending > 0 ? 'bg-amber-50/25 border-amber-200 text-amber-700' : 'bg-zinc-50/30 border-zinc-200 text-zinc-600'}`}>
            <span className="text-[8px] uppercase font-bold block">Closures Pending</span>
            <div className="text-base font-bold flex items-baseline gap-1">
              <span>{stats.closurePending}</span>
              <span className="text-[9px] font-normal">Audits</span>
            </div>
          </div>

          {/* 9. Reopen Requests Pending */}
          <div className={`p-3 border rounded-lg space-y-1 ${stats.reopenPending > 0 ? 'bg-red-50/20 border-red-200 text-red-800 font-bold' : 'bg-zinc-50/30 border-zinc-200 text-zinc-600'}`}>
            <span className="text-[8px] uppercase font-bold block">Reopen Reviews</span>
            <div className="text-base font-bold flex items-baseline gap-1">
              <span>{stats.reopenPending}</span>
              <span className="text-[9px] font-normal">Audits</span>
            </div>
          </div>

          {/* 10. Tickets Aging More Than 7 Days */}
          <div className="p-3 bg-zinc-50/50 border border-zinc-200 text-zinc-700 rounded-lg space-y-1">
            <span className="text-[8px] uppercase font-bold block">Aging &gt; 7 Days</span>
            <div className="text-base font-bold flex items-baseline gap-1">
              <span>{Math.round(stats.openTickets * 0.2)}</span>
              <span className="text-[9px] font-normal">Backlogs</span>
            </div>
          </div>

          {/* 11. Customers At Risk */}
          <div className={`p-3 border rounded-lg space-y-1 ${stats.breachedCusts > 0 ? 'bg-red-50/20 border-red-200 text-red-850' : 'bg-zinc-50/30 border-zinc-200 text-zinc-600'}`}>
            <span className="text-[8px] uppercase font-bold block">Accounts At Risk</span>
            <div className="text-base font-bold flex items-baseline gap-1">
              <span>{stats.breachedCusts}</span>
              <span className="text-[9px] font-normal">At Risk</span>
            </div>
          </div>

          {/* 12. Overloaded Consultants */}
          <div className={`p-3 border rounded-lg space-y-1 ${stats.overloadedConsultants > 0 ? 'bg-red-50/20 border-red-200 text-red-850' : 'bg-zinc-50/30 border-zinc-200 text-zinc-600'}`}>
            <span className="text-[8px] uppercase font-bold block">Consultant Alert</span>
            <div className="text-base font-bold flex items-baseline gap-1">
              <span>{stats.overloadedConsultants}</span>
              <span className="text-[9px] font-normal">Overloaded</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── 3. EXTENSIVE ANALYTICS SECTION (22 CHARTS IN 4 TABS) ── */}
      <div className="space-y-4">
        <div className="flex border-b border-zinc-200 bg-zinc-50 p-1 rounded-lg border max-w-2xl">
          <button
            onClick={() => setActiveChartTab('tickets')}
            className={`flex-1 py-1.5 text-center font-bold uppercase text-[9px] rounded transition ${
              activeChartTab === 'tickets' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200 font-extrabold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Ticket Flow (7)
          </button>
          <button
            onClick={() => setActiveChartTab('customers')}
            className={`flex-1 py-1.5 text-center font-bold uppercase text-[9px] rounded transition ${
              activeChartTab === 'customers' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200 font-extrabold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Customer Health (4)
          </button>
          <button
            onClick={() => setActiveChartTab('consultants')}
            className={`flex-1 py-1.5 text-center font-bold uppercase text-[9px] rounded transition ${
              activeChartTab === 'consultants' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200 font-extrabold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Consultant Metrics (6)
          </button>
          <button
            onClick={() => setActiveChartTab('operational')}
            className={`flex-1 py-1.5 text-center font-bold uppercase text-[9px] rounded transition ${
              activeChartTab === 'operational' ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200 font-extrabold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Operational SLA (5)
          </button>
        </div>

        {/* ── SUB TAB A: TICKET FLOW (7 CHARTS) ── */}
        {activeChartTab === 'tickets' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Status Distribution */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">1. Status Distribution</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketTrends} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={8} tickLine={false} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 2. Priority Distribution */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">2. Priority Distribution</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityTrends} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={8} tickLine={false} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill="#ef4444" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 3. Module Distribution */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">3. Module Distribution</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moduleTrends} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={8} tickLine={false} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Bar dataKey="Tickets" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 4. Ticket Type Distribution */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">4. Ticket Type Distribution</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeTrends} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={8} tickLine={false} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Bar dataKey="Tickets" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 5. Open vs Closed Trend */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">5. Open vs Closed Trend</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={openVsClosedTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={8} tickLine={false} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Legend wrapperStyle={{ fontSize: 8 }} />
                    <Line type="monotone" dataKey="Open" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="Closed" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 6. Reopen Trend */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">6. Reopen Trend</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reopenTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={8} tickLine={false} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="Reopened" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 7. Aging Trend */}
            <Card className="border border-zinc-200 shadow-sm p-4 md:col-span-3">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">7. Aging Trend (Unresolved Backlog)</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={8} tickLine={false} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Bar dataKey="count" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>
        )}

        {/* ── SUB TAB B: CUSTOMER HEALTH (4 CHARTS) ── */}
        {activeChartTab === 'customers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 8. Tickets By Customer */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">8. Tickets By Customer</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketsByCustomer} layout="vertical" margin={{ top: 5, right: 5, left: 15, bottom: 5 }}>
                    <XAxis type="number" stroke="#71717a" fontSize={8} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={8} tickLine={false} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Bar dataKey="Tickets" fill="#3b82f6" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 9. Customer Health Trend */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">9. Customer Health Trend (SLA Compliant %)</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={customerHealthTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} domain={[80, 100]} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="Health" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 10. Customer Satisfaction Trend */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">10. Customer Satisfaction Trend (CSAT Index)</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={customerCsatTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} domain={[3.0, 5.0]} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Area type="monotone" dataKey="CSAT" stroke="#10b981" fill="#ecfdf5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 11. Hours Consumed By Customer */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">11. Hours Consumed By Customer</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerHoursConsumed} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Bar dataKey="Hours" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>
        )}

        {/* ── SUB TAB C: CONSULTANT METRICS (6 CHARTS) ── */}
        {activeChartTab === 'consultants' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 12. Workload Distribution */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">12. Workload Distribution (Active Backlog)</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadDistData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Bar dataKey="Tickets" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 13. Utilization Distribution */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">13. Utilization Distribution (%)</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={utilizationDistData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} domain={[0, 100]} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Bar dataKey="Ute" fill="#10b981" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 14. Billable Hours */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">14. Billable Hours Summary</span>
              <div className="h-44 flex flex-col justify-center items-center text-center space-y-2">
                <span className="text-2xl font-black text-emerald-700 font-mono">{stats.billableHours.toLocaleString()}h</span>
                <span className="text-[10px] text-zinc-450 uppercase">Approved Billable Effort</span>
                <div className="w-4/5 h-2 bg-zinc-100 border rounded overflow-hidden mt-1">
                  <div className="h-full bg-emerald-600" style={{ width: `${(stats.billableHours / stats.actualHours) * 100}%` }}></div>
                </div>
                <span className="text-[9px] text-zinc-400">Ratio: {((stats.billableHours / stats.actualHours) * 100).toFixed(1)}% of total logged</span>
              </div>
            </Card>

            {/* 15. Non-Billable Hours */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">15. Non-Billable Hours Summary</span>
              <div className="h-44 flex flex-col justify-center items-center text-center space-y-2">
                <span className="text-2xl font-black text-zinc-650 font-mono">{stats.nonBillableHours.toLocaleString()}h</span>
                <span className="text-[10px] text-zinc-450 uppercase">Internal / Non-Billable Effort</span>
                <div className="w-4/5 h-2 bg-zinc-100 border rounded overflow-hidden mt-1">
                  <div className="h-full bg-zinc-450" style={{ width: `${(stats.nonBillableHours / stats.actualHours) * 100}%` }}></div>
                </div>
                <span className="text-[9px] text-zinc-400">Ratio: {((stats.nonBillableHours / stats.actualHours) * 100).toFixed(1)}% of total logged</span>
              </div>
            </Card>

            {/* 16. Tickets Closed By Consultant */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">16. Tickets Closed By Consultant</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consultantTicketsClosed} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Bar dataKey="Closed" fill="#10b981" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 17. Reopened Tickets By Consultant */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">17. Reopened By Consultant</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consultantTicketsReopened} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Bar dataKey="Reopened" fill="#ef4444" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>
        )}

        {/* ── SUB TAB D: OPERATIONAL SLA (5 CHARTS) ── */}
        {activeChartTab === 'operational' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 18. SLA Compliance Trend */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">18. SLA Compliance Trend (%)</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={slaComplianceTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} domain={[90, 100]} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="Compliance" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 19. SLA Breach Trend */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">19. SLA Breach Trend (Volume)</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={slaBreachTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Bar dataKey="Breaches" fill="#ef4444" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 20. Closure Approval Trend */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">20. Closure Approval Rate (%)</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={closureApprovalTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} domain={[80, 100]} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Area type="monotone" dataKey="Rate" stroke="#6366f1" fill="#e0e7ff" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 21. Estimated vs Actual Hours */}
            <Card className="border border-zinc-200 shadow-sm p-4 md:col-span-2">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">21. Estimated vs Actual Hours Variance</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={estVsActualHours} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <XAxis dataKey="module" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Legend wrapperStyle={{ fontSize: 8 }} />
                    <Bar dataKey="Est" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Act" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 22. Raised To SAP Trend */}
            <Card className="border border-zinc-200 shadow-sm p-4">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">22. Raised To SAP Trend</span>
              <div className="h-44 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={raisedToSapTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="OSS" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>
        )}

      </div>

      {/* ── 5. QUICK ACTION REPORTS FOOTER SUMMARY ── */}
      <Card className="bg-white border border-zinc-200 rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans text-xs">
          <div>
            <h4 className="font-bold text-zinc-900">Download Operational Reports</h4>
            <p className="text-zinc-500 text-[11px] mt-0.5">Export direct summaries of current month capacity, performance scorecard logs, and ticket distributions.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button onClick={handleDownloadMonthlyReport} variant="outline"
              className="text-[10px] font-bold uppercase py-1.5 flex items-center gap-1.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 cursor-pointer">
              <Download size={12} />
              Monthly Activity (.CSV)
            </Button>
            <Button onClick={handleDownloadPerformanceReport} variant="outline"
              className="text-[10px] font-bold uppercase py-1.5 flex items-center gap-1.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 cursor-pointer">
              <Download size={12} />
              Performance Audit (.CSV)
            </Button>
            <Button onClick={handleDownloadUtilizationReport} variant="outline"
              className="text-[10px] font-bold uppercase py-1.5 flex items-center gap-1.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 cursor-pointer">
              <Download size={12} />
              Utilization Sheet (.CSV)
            </Button>
          </div>
        </div>
      </Card>

    </div>
  );
}
