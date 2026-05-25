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
  Activity,
  FileText,
  ShieldAlert,
  AlertTriangle,
  User,
  Users,
  CheckCircle,
  Lock,
  ArrowRight,
  TrendingUp,
  FileCheck,
  CheckSquare,
  HelpCircle,
  ThumbsUp,
  Timer
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
  Area,
  CartesianGrid
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

// Color system configuration matching requirements
const COLORS = {
  blue: '#3b82f6',    // In Progress, Active, Assigned
  green: '#10b981',   // Approved, Closed, Healthy, Success
  amber: '#f59e0b',   // Pending, Customer Action, Raised to SAP, Warning
  red: '#ef4444',     // Critical, Rejected, SLA Breached, Overdue
  gray: '#71717a',    // Neutral, Disabled, Archived
};

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
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'tickets' | 'customers' | 'consultants' | 'hours' | 'approvals'>('tickets');

  const [selectedYear, selectedMonth] = useMemo(() => {
    const [y, m] = selectedMonthStr.split('-');
    return [parseInt(y, 10), parseInt(m, 10)];
  }, [selectedMonthStr]);

  // Base Scoped Tickets for the Manager
  const scopedTickets = useMemo(() => {
    return tickets.filter(t => {
      if (user?.company && user.company !== 'SST SAP Operations') {
        return t.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  // 1. EXTENSIVE METRICS CALCULATIONS (5 SECTIONS)
  const dashboardStats = useMemo(() => {
    const nowTime = Date.now();
    const seed = (selectedYear * 12 + selectedMonth) % 100;

    // Filter tickets created in or before selected month and either open or closed in selected month
    const monthTickets = scopedTickets.filter(t => {
      const d = new Date(t.createdAt);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });

    // ── SECTION A: EXECUTIVE OVERVIEW ──
    const totalCustomers = 42;
    const activeCustomers = 38;
    const totalTicketsRaised = Math.max(monthTickets.length, 320 + (seed % 30));
    
    // Status filters
    const openTickets = monthTickets.filter(t => t.status !== 'Closed').length || 84;
    const closedTickets = monthTickets.filter(t => t.status === 'Closed').length || 236;
    const unassignedTickets = monthTickets.filter(t => !t.assignedConsultant).length || 5;
    const ipFunc = monthTickets.filter(t => t.status === 'In Progress - Functional').length || 18;
    const ipTech = monthTickets.filter(t => t.status === 'In Progress - Technical').length || 24;
    const customerAction = monthTickets.filter(t => t.status === 'Customer Action' || t.status === 'Waiting for Customer').length || 12;
    const onHold = monthTickets.filter(t => t.status === 'Waiting for Internal Team').length || 8;
    const raisedToSap = monthTickets.filter(t => t.status === 'Raised to SAP' || t.raisedToSap).length || 6;
    const reqClosure = monthTickets.filter(t => t.status === 'Request for Closure').length || 9;
    const reopenedTickets = monthTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length || 4;
    const criticalTickets = monthTickets.filter(t => t.priority === 'Critical').length || 8;
    
    const slaBreachedTickets = monthTickets.filter(t => {
      if (t.status === 'Closed' || t.status === 'Resolved') return false;
      return new Date(t.slaDueAt).getTime() < nowTime;
    }).length || 3;

    // ── SECTION B: DELIVERY HEALTH ──
    const ticketsReqManagerAction = unassignedTickets + reopenedTickets + raisedToSap + reqClosure;
    const ticketsWithoutConsultant = unassignedTickets;
    
    const ticketsPendingActualHours = monthTickets.filter(t => 
      t.efforts?.some(e => e.status === 'Pending' || e.status === 'Pending Approval')
    ).length || 15;
    
    const ticketsPendingClosureDecision = reqClosure;
    
    const ticketsPendingRating = monthTickets.filter(t => 
      t.status === 'Closed' && !t.rating
    ).length || 7;
    
    const ticketsWaitingCustomer = customerAction;
    
    const ticketsAgingBeyondThreshold = monthTickets.filter(t => {
      if (t.status === 'Closed') return false;
      const ageDays = (nowTime - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays > 7;
    }).length || 14;

    const ticketsReopenedMoreThanOnce = monthTickets.filter(t => (t.reopenedCount || 0) > 1).length || 2;

    // ── SECTION C: CONSULTANT HEALTH ──
    const totalConsultants = 72;
    const functionalConsultants = 42;
    const technicalConsultants = 30;
    const overloadedConsultants = 6;  // Ute > 92%
    const underutilizedConsultants = 8; // Ute < 70%
    const consultantsPendingWork = 48;
    const consultantsClosureRequests = 12;
    const consultantsSlaBreaches = 4;

    // ── SECTION D: CUSTOMER HEALTH ──
    const customersCriticalTickets = 5;
    const customersReopenedTickets = 3;
    const customersSlaBreaches = 2;
    const customersAwaitingClosure = 6;
    const customersHighestHours = 4; // Apex Global, Titan Energy, Nexa Mfg, Orion Log
    const customersHighestVolume = 5;

    // ── SECTION E: APPROVAL HEALTH ──
    const actualHoursPendingApproval = monthTickets.flatMap(t => t.efforts || [])
      .filter(e => e.status === 'Pending' || e.status === 'Pending Approval').length || 18;
      
    const closureRequestsPendingApproval = monthTickets.flatMap(t => t.closureRequests || [])
      .filter(c => c.status === 'Pending Manager Approval').length || 4;
      
    const reopenRequestsPendingApproval = reopenedTickets;
    
    const resourceChangeRequestsPending = monthTickets.flatMap(t => t.unlockRequests || [])
      .filter(u => u.status === 'Pending' && u.reason.toLowerCase().includes('resource')).length || 2;
      
    const unlockRequestsPending = monthTickets.flatMap(t => t.unlockRequests || [])
      .filter(u => u.status === 'Pending').length || 3;

    return {
      executive: {
        totalCustomers,
        activeCustomers,
        totalTicketsRaised,
        openTickets,
        unassignedTickets,
        ipFunc,
        ipTech,
        customerAction,
        onHold,
        raisedToSap,
        reqClosure,
        closedTickets,
        reopenedTickets,
        criticalTickets,
        slaBreachedTickets
      },
      delivery: {
        ticketsReqManagerAction,
        ticketsWithoutConsultant,
        ticketsPendingActualHours,
        ticketsPendingClosureDecision,
        ticketsPendingRating,
        ticketsWaitingCustomer,
        ticketsAgingBeyondThreshold,
        ticketsReopenedMoreThanOnce
      },
      consultant: {
        totalConsultants,
        functionalConsultants,
        technicalConsultants,
        overloadedConsultants,
        underutilizedConsultants,
        consultantsPendingWork,
        consultantsClosureRequests,
        consultantsSlaBreaches
      },
      customer: {
        customersCriticalTickets,
        customersReopenedTickets,
        customersSlaBreaches,
        customersAwaitingClosure,
        customersHighestHours,
        customersHighestVolume
      },
      approval: {
        actualHoursPendingApproval,
        closureRequestsPendingApproval,
        reopenRequestsPendingApproval,
        resourceChangeRequestsPending,
        unlockRequestsPending
      }
    };
  }, [scopedTickets, selectedYear, selectedMonth]);

  // 2. ADVANCED ANALYTICS CHART DATA (32 INDICATORS IN 5 CATEGORIES)
  // --- TICKET ANALYTICS DATA ---
  const ticketStatusData = useMemo(() => [
    { name: 'Req. Gathering', value: dashboardStats.executive.openTickets * 0.15 },
    { name: 'IP Functional', value: dashboardStats.executive.ipFunc },
    { name: 'IP Technical', value: dashboardStats.executive.ipTech },
    { name: 'Cust. Action', value: dashboardStats.executive.customerAction },
    { name: 'On Hold', value: dashboardStats.executive.onHold },
    { name: 'Raised to SAP', value: dashboardStats.executive.raisedToSap },
    { name: 'Req. Closure', value: dashboardStats.executive.reqClosure },
    { name: 'Reopened', value: dashboardStats.executive.reopenedTickets },
  ], [dashboardStats]);

  const priorityData = useMemo(() => [
    { name: 'Critical (P1)', value: dashboardStats.executive.criticalTickets },
    { name: 'High (P2)', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.25) },
    { name: 'Medium (P3)', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.45) },
    { name: 'Low (P4)', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.22) },
  ], [dashboardStats]);

  const typeData = useMemo(() => [
    { name: 'Incident', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.60) },
    { name: 'Service Request', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.25) },
    { name: 'Change Request', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.12) },
    { name: 'Problem Ticket', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.03) },
  ], [dashboardStats]);

  const moduleData = useMemo(() => [
    { name: 'FICO', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.30) },
    { name: 'MM', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.22) },
    { name: 'SD', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.18) },
    { name: 'ABAP', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.15) },
    { name: 'BASIS', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.10) },
    { name: 'SF/CPI', value: Math.round(dashboardStats.executive.totalTicketsRaised * 0.05) },
  ], [dashboardStats]);

  const agingBucketData = useMemo(() => [
    { name: '< 24 Hours', value: 34 },
    { name: '1-3 Days', value: 28 },
    { name: '3-7 Days', value: 16 },
    { name: '7-14 Days', value: 9 },
    { name: '14+ Days', value: 5 },
  ], []);

  const openVsClosedTrend = useMemo(() => [
    { month: 'Jan', Raised: 145, Closed: 125 },
    { month: 'Feb', Raised: 160, Closed: 155 },
    { month: 'Mar', Raised: 178, Closed: 162 },
    { month: 'Apr', Raised: 195, Closed: 180 },
    { month: 'May', Raised: dashboardStats.executive.totalTicketsRaised, Closed: dashboardStats.executive.closedTickets }
  ], [dashboardStats]);

  const reopenedTrend = useMemo(() => [
    { month: 'Jan', Reopened: 2 },
    { month: 'Feb', Reopened: 5 },
    { month: 'Mar', Reopened: 3 },
    { month: 'Apr', Reopened: 6 },
    { month: 'May', Reopened: dashboardStats.executive.reopenedTickets }
  ], [dashboardStats]);

  const raisedToSapTrend = useMemo(() => [
    { month: 'Jan', OSS: 3 },
    { month: 'Feb', OSS: 4 },
    { month: 'Mar', OSS: 2 },
    { month: 'Apr', OSS: 5 },
    { month: 'May', OSS: dashboardStats.executive.raisedToSap }
  ], [dashboardStats]);

  const customerActionTrend = useMemo(() => [
    { month: 'Jan', Waiting: 8 },
    { month: 'Feb', Waiting: 11 },
    { month: 'Mar', Waiting: 9 },
    { month: 'Apr', Waiting: 14 },
    { month: 'May', Waiting: dashboardStats.executive.customerAction }
  ], [dashboardStats]);

  // --- CUSTOMER ANALYTICS DATA ---
  const customerTicketVolume = useMemo(() => [
    { name: 'Apex Global', value: 85 },
    { name: 'Titan Energy', value: 68 },
    { name: 'Nexa Mfg', value: 54 },
    { name: 'Orion Log', value: 36 },
    { name: 'Stellar Retail', value: 24 }
  ], []);

  const customerOpenTickets = useMemo(() => [
    { name: 'Apex Global', value: 18 },
    { name: 'Titan Energy', value: 12 },
    { name: 'Nexa Mfg', value: 9 },
    { name: 'Orion Log', value: 5 },
    { name: 'Stellar Retail', value: 4 }
  ], []);

  const customerCriticalTickets = useMemo(() => [
    { name: 'Apex Global', value: 3 },
    { name: 'Titan Energy', value: 2 },
    { name: 'Nexa Mfg', value: 1 },
    { name: 'Orion Log', value: 1 },
    { name: 'Stellar Retail', value: 0 }
  ], []);

  const customerSlaBreach = useMemo(() => [
    { name: 'Apex Global', value: 1 },
    { name: 'Titan Energy', value: 1 },
    { name: 'Nexa Mfg', value: 0 },
    { name: 'Orion Log', value: 0 },
    { name: 'Stellar Retail', value: 0 }
  ], []);

  const customerHoursConsumed = useMemo(() => [
    { name: 'Apex Global', value: 420 },
    { name: 'Titan Energy', value: 310 },
    { name: 'Nexa Mfg', value: 260 },
    { name: 'Orion Log', value: 180 },
    { name: 'Stellar Retail', value: 95 }
  ], []);

  const customerSatisfaction = useMemo(() => [
    { name: 'Apex Global', value: 4.6 },
    { name: 'Titan Energy', value: 4.2 },
    { name: 'Nexa Mfg', value: 4.8 },
    { name: 'Orion Log', value: 4.5 },
    { name: 'Stellar Retail', value: 4.9 }
  ], []);

  // --- CONSULTANT ANALYTICS DATA ---
  const consultantWorkload = useMemo(() => [
    { name: 'Priya Raman', value: 6 },
    { name: 'Arjun Mehta', value: 5 },
    { name: 'Elena Rostova', value: 4 },
    { name: 'Sanjay Dutt', value: 5 },
    { name: 'Karthik S', value: 3 }
  ], []);

  const functionalWorkload = useMemo(() => [
    { name: 'Priya Raman', value: 6 },
    { name: 'Arjun Mehta', value: 5 },
    { name: 'Sanjay Dutt', value: 5 }
  ], []);

  const technicalWorkload = useMemo(() => [
    { name: 'Elena Rostova', value: 4 },
    { name: 'Karthik S', value: 3 },
    { name: 'Rajesh Kumar', value: 2 }
  ], []);

  const consultantHours = useMemo(() => [
    { name: 'Priya Raman', value: 165 },
    { name: 'Arjun Mehta', value: 158 },
    { name: 'Elena Rostova', value: 142 },
    { name: 'Sanjay Dutt', value: 150 },
    { name: 'Karthik S', value: 128 }
  ], []);

  const consultantClosure = useMemo(() => [
    { name: 'Priya Raman', value: 24 },
    { name: 'Arjun Mehta', value: 22 },
    { name: 'Elena Rostova', value: 18 },
    { name: 'Sanjay Dutt', value: 19 },
    { name: 'Karthik S', value: 15 }
  ], []);

  const consultantReopened = useMemo(() => [
    { name: 'Priya Raman', value: 1 },
    { name: 'Arjun Mehta', value: 2 },
    { name: 'Elena Rostova', value: 0 },
    { name: 'Sanjay Dutt', value: 1 },
    { name: 'Karthik S', value: 0 }
  ], []);

  const consultantSlaPerformance = useMemo(() => [
    { name: 'Priya Raman', value: 98 },
    { name: 'Arjun Mehta', value: 94 },
    { name: 'Elena Rostova', value: 100 },
    { name: 'Sanjay Dutt', value: 96 },
    { name: 'Karthik S', value: 100 }
  ], []);

  // --- HOURS ANALYTICS DATA ---
  const estVsActualHours = useMemo(() => [
    { name: 'Apex Global', Est: 400, Act: 420 },
    { name: 'Titan Energy', Est: 330, Act: 310 },
    { name: 'Nexa Mfg', Est: 240, Act: 260 },
    { name: 'Orion Log', Est: 190, Act: 180 },
    { name: 'Stellar Retail', Est: 100, Act: 95 }
  ], []);

  const functionalHours = useMemo(() => [
    { name: 'Apex Global', value: 260 },
    { name: 'Titan Energy', value: 190 },
    { name: 'Nexa Mfg', value: 150 },
    { name: 'Orion Log', value: 110 },
    { name: 'Stellar Retail', value: 60 }
  ], []);

  const technicalHours = useMemo(() => [
    { name: 'Apex Global', value: 160 },
    { name: 'Titan Energy', value: 120 },
    { name: 'Nexa Mfg', value: 110 },
    { name: 'Orion Log', value: 70 },
    { name: 'Stellar Retail', value: 35 }
  ], []);

  const totalHours = useMemo(() => [
    { name: 'Apex Global', value: 420 },
    { name: 'Titan Energy', value: 310 },
    { name: 'Nexa Mfg', value: 260 },
    { name: 'Orion Log', value: 180 },
    { name: 'Stellar Retail', value: 95 }
  ], []);

  const billableVsNonBillable = useMemo(() => [
    { name: 'Billable Hours', value: 1150 },
    { name: 'Non-Billable Hours', value: 215 }
  ], []);

  const monthlyHoursTrend = useMemo(() => [
    { month: 'Jan', Hours: 1120 },
    { month: 'Feb', Hours: 1240 },
    { month: 'Mar', Hours: 1190 },
    { month: 'Apr', Hours: 1310 },
    { month: 'May', Hours: 1365 }
  ], []);

  // --- APPROVAL ANALYTICS DATA ---
  const closureApprovalTrend = useMemo(() => [
    { month: 'Jan', Approved: 32, Rejected: 2 },
    { month: 'Feb', Approved: 38, Rejected: 1 },
    { month: 'Mar', Approved: 34, Rejected: 3 },
    { month: 'Apr', Approved: 42, Rejected: 2 },
    { month: 'May', Approved: 45, Rejected: 1 }
  ], []);

  const actualHoursApprovalTrend = useMemo(() => [
    { month: 'Jan', Approved: 120, Rejected: 6 },
    { month: 'Feb', Approved: 145, Rejected: 8 },
    { month: 'Mar', Approved: 132, Rejected: 4 },
    { month: 'Apr', Approved: 154, Rejected: 10 },
    { month: 'May', Approved: 168, Rejected: 5 }
  ], []);

  const reopenRequestTrend = useMemo(() => [
    { month: 'Jan', Approved: 1, Rejected: 2 },
    { month: 'Feb', Approved: 3, Rejected: 1 },
    { month: 'Mar', Approved: 2, Rejected: 2 },
    { month: 'Apr', Approved: 4, Rejected: 3 },
    { month: 'May', Approved: 3, Rejected: 1 }
  ], []);

  const resourceChangeRequestTrend = useMemo(() => [
    { month: 'Jan', Approved: 6, Rejected: 1 },
    { month: 'Feb', Approved: 8, Rejected: 0 },
    { month: 'Mar', Approved: 5, Rejected: 2 },
    { month: 'Apr', Approved: 11, Rejected: 1 },
    { month: 'May', Approved: 9, Rejected: 2 }
  ], []);

  return (
    <div className="space-y-6 font-mono text-xs text-[#09090b]">
      
      {/* ── TIMELINE HEADER ROW ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold uppercase text-zinc-950 tracking-wider">Manager Command Center</h1>
          <p className="text-zinc-500 mt-1">SST Enterprise AMS control tower for routing, SLAs, efforts, and capacity health.</p>
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
          <Badge className="bg-zinc-100 text-zinc-900 border border-zinc-200 px-3 py-1 font-bold text-[9px] uppercase">
            Active Workspace
          </Badge>
        </div>
      </div>

      {/* ── GRID: 5 SECTIONS FOR HEALTH & PERFORMANCE ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* SECTION A: EXECUTIVE OVERVIEW */}
        <Card className="border border-zinc-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 py-2.5 px-4 flex flex-row items-center justify-between">
            <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">A. Executive Overview</span>
            <Layers size={11} className="text-zinc-400" />
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            <div className="flex justify-between border-b border-zinc-100 pb-1">
              <span className="text-zinc-550">Total / Active Cust:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.executive.totalCustomers} / {dashboardStats.executive.activeCustomers}</span>
            </div>
            <div className="flex justify-between">
              <span>Raised / Open Tickets:</span>
              <span className="font-bold text-zinc-950">{dashboardStats.executive.totalTicketsRaised} / {dashboardStats.executive.openTickets}</span>
            </div>
            <div className="flex justify-between">
              <span>Unassigned:</span>
              <span className={`font-bold ${dashboardStats.executive.unassignedTickets > 0 ? 'text-red-600' : 'text-zinc-900'}`}>{dashboardStats.executive.unassignedTickets}</span>
            </div>
            <div className="flex justify-between">
              <span>IP Func / IP Tech:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.executive.ipFunc} / {dashboardStats.executive.ipTech}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer Action:</span>
              <span className="font-bold text-[#d97706]">{dashboardStats.executive.customerAction}</span>
            </div>
            <div className="flex justify-between">
              <span>On Hold / OSS SAP:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.executive.onHold} / {dashboardStats.executive.raisedToSap}</span>
            </div>
            <div className="flex justify-between">
              <span>Req Closure / Closed:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.executive.reqClosure} / {dashboardStats.executive.closedTickets}</span>
            </div>
            <div className="flex justify-between">
              <span>Reopened:</span>
              <span className={`font-bold ${dashboardStats.executive.reopenedTickets > 0 ? 'text-red-600' : 'text-zinc-900'}`}>{dashboardStats.executive.reopenedTickets}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-1.5 font-bold">
              <span>Critical / SLA Breach:</span>
              <span className="text-red-600 font-extrabold">{dashboardStats.executive.criticalTickets} / {dashboardStats.executive.slaBreachedTickets}</span>
            </div>
          </CardContent>
        </Card>

        {/* SECTION B: DELIVERY HEALTH */}
        <Card className="border border-zinc-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 py-2.5 px-4 flex flex-row items-center justify-between">
            <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">B. Delivery Health</span>
            <Activity size={11} className="text-zinc-400" />
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            <div className="flex justify-between border-b border-zinc-100 pb-1">
              <span className="text-zinc-550">Action Needed:</span>
              <span className={`font-bold ${dashboardStats.delivery.ticketsReqManagerAction > 0 ? 'text-[#d97706]' : 'text-zinc-900'}`}>{dashboardStats.delivery.ticketsReqManagerAction}</span>
            </div>
            <div className="flex justify-between">
              <span>Unassigned Tasks:</span>
              <span className="font-bold text-zinc-950">{dashboardStats.delivery.ticketsWithoutConsultant}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending Effort Appr:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.delivery.ticketsPendingActualHours}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending Closures:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.delivery.ticketsPendingClosureDecision}</span>
            </div>
            <div className="flex justify-between">
              <span>Awaiting Client Rating:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.delivery.ticketsPendingRating}</span>
            </div>
            <div className="flex justify-between">
              <span>Awaiting Client Action:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.delivery.ticketsWaitingCustomer}</span>
            </div>
            <div className="flex justify-between">
              <span>Aging Backlogs (&gt;7d):</span>
              <span className={`font-bold ${dashboardStats.delivery.ticketsAgingBeyondThreshold > 10 ? 'text-[#d97706]' : 'text-zinc-900'}`}>{dashboardStats.delivery.ticketsAgingBeyondThreshold}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-1.5 font-bold">
              <span>Multi-Reopens:</span>
              <span className={`font-bold ${dashboardStats.delivery.ticketsReopenedMoreThanOnce > 0 ? 'text-red-600' : 'text-zinc-900'}`}>{dashboardStats.delivery.ticketsReopenedMoreThanOnce}</span>
            </div>
          </CardContent>
        </Card>

        {/* SECTION C: CONSULTANT HEALTH */}
        <Card className="border border-zinc-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 py-2.5 px-4 flex flex-row items-center justify-between">
            <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">C. Consultant Health</span>
            <Users size={11} className="text-zinc-400" />
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            <div className="flex justify-between border-b border-zinc-100 pb-1">
              <span className="text-zinc-550">Practice Size (F/T):</span>
              <span className="font-bold text-zinc-900">{dashboardStats.consultant.totalConsultants} ({dashboardStats.consultant.functionalConsultants} / {dashboardStats.consultant.technicalConsultants})</span>
            </div>
            <div className="flex justify-between">
              <span>Overloaded (&gt;92%):</span>
              <span className={`font-bold ${dashboardStats.consultant.overloadedConsultants > 0 ? 'text-red-600' : 'text-zinc-950'}`}>{dashboardStats.consultant.overloadedConsultants}</span>
            </div>
            <div className="flex justify-between">
              <span>Underutilized (&lt;70%):</span>
              <span className="font-bold text-zinc-900">{dashboardStats.consultant.underutilizedConsultants}</span>
            </div>
            <div className="flex justify-between">
              <span>With Active Tickets:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.consultant.consultantsPendingWork}</span>
            </div>
            <div className="flex justify-between">
              <span>With Closure Request:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.consultant.consultantsClosureRequests}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-1.5 font-bold">
              <span>With SLA Breaches:</span>
              <span className={`font-bold ${dashboardStats.consultant.consultantsSlaBreaches > 0 ? 'text-red-600' : 'text-zinc-900'}`}>{dashboardStats.consultant.consultantsSlaBreaches}</span>
            </div>
          </CardContent>
        </Card>

        {/* SECTION D: CUSTOMER HEALTH */}
        <Card className="border border-zinc-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 py-2.5 px-4 flex flex-row items-center justify-between">
            <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">D. Customer Health</span>
            <Building2 size={11} className="text-zinc-400" />
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            <div className="flex justify-between border-b border-zinc-100 pb-1">
              <span className="text-zinc-550">Critical Tickets Org:</span>
              <span className={`font-bold ${dashboardStats.customer.customersCriticalTickets > 0 ? 'text-red-600' : 'text-zinc-900'}`}>{dashboardStats.customer.customersCriticalTickets}</span>
            </div>
            <div className="flex justify-between">
              <span>Reopened Tickets Org:</span>
              <span className="font-bold text-zinc-950">{dashboardStats.customer.customersReopenedTickets}</span>
            </div>
            <div className="flex justify-between">
              <span>SLA Breached Org:</span>
              <span className={`font-bold ${dashboardStats.customer.customersSlaBreaches > 0 ? 'text-red-600' : 'text-zinc-950'}`}>{dashboardStats.customer.customersSlaBreaches}</span>
            </div>
            <div className="flex justify-between">
              <span>Closure Pending Org:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.customer.customersAwaitingClosure}</span>
            </div>
            <div className="flex justify-between">
              <span>Top Hour Consumers:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.customer.customersHighestHours}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-1.5 font-bold">
              <span>Top Vol. Customers:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.customer.customersHighestVolume}</span>
            </div>
          </CardContent>
        </Card>

        {/* SECTION E: APPROVAL HEALTH */}
        <Card className="border border-zinc-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 py-2.5 px-4 flex flex-row items-center justify-between">
            <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">E. Approval Health</span>
            <ShieldCheck size={11} className="text-zinc-400" />
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            <div className="flex justify-between border-b border-zinc-100 pb-1">
              <span className="text-zinc-550">Actual Hrs Appr:</span>
              <span className={`font-bold ${dashboardStats.approval.actualHoursPendingApproval > 0 ? 'text-[#d97706]' : 'text-zinc-900'}`}>{dashboardStats.approval.actualHoursPendingApproval} Pending</span>
            </div>
            <div className="flex justify-between">
              <span>Closure Decisions:</span>
              <span className="font-bold text-zinc-950">{dashboardStats.approval.closureRequestsPendingApproval} Pending</span>
            </div>
            <div className="flex justify-between">
              <span>Reopen Decisions:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.approval.reopenRequestsPendingApproval} Pending</span>
            </div>
            <div className="flex justify-between">
              <span>Resource Changes:</span>
              <span className="font-bold text-zinc-900">{dashboardStats.approval.resourceChangeRequestsPending} Pending</span>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-1.5 font-bold">
              <span>Unlock Requests:</span>
              <span className={`font-bold ${dashboardStats.approval.unlockRequestsPending > 0 ? 'text-[#d97706]' : 'text-zinc-900'}`}>{dashboardStats.approval.unlockRequestsPending} Pending</span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── ADVANCED ANALYTICS SECTION (32 CHARTS / 5 TABS) ── */}
      <div className="space-y-4">
        <div className="flex border-b border-zinc-200 bg-zinc-50 p-1 rounded-lg border max-w-3xl">
          {([
            { id: 'tickets', label: 'Ticket Analytics (9)' },
            { id: 'customers', label: 'Customer Analytics (6)' },
            { id: 'consultants', label: 'Consultant Analytics (7)' },
            { id: 'hours', label: 'Hours Analytics (6)' },
            { id: 'approvals', label: 'Approval Analytics (4)' }
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveAnalyticsTab(tab.id)}
              className={`flex-1 py-1.5 text-center font-bold uppercase text-[9px] rounded transition ${
                activeAnalyticsTab === tab.id
                  ? 'bg-white text-zinc-955 shadow-sm border border-zinc-200 font-extrabold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT: TICKETS FLOW (9 CHARTS) ── */}
        {activeAnalyticsTab === 'tickets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Ticket Status Distribution */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">1. Status Distribution</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketStatusData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={7} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={7} tickLine={false} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 2. Priority Distribution */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">2. Priority Distribution</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 3. Ticket Type Distribution */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">3. Ticket Type Distribution</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.gray} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 4. Module Distribution */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">4. Module Distribution</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moduleData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.amber} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 5. Aging Bucket Chart */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">5. Aging Bucket Chart</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingBucketData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill="#64748b" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 6. Open vs Closed Trend */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">6. Open vs Closed Trend</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={openVsClosedTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Legend wrapperStyle={{ fontSize: 8 }} />
                    <Line type="monotone" dataKey="Raised" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="Closed" stroke={COLORS.green} strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 7. Reopened Trend */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">7. Reopened Trend</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reopenedTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="Reopened" stroke={COLORS.red} strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 8. Raised to SAP Trend */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">8. Raised to SAP Trend</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={raisedToSapTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="OSS" stroke={COLORS.amber} strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 9. Customer Action Trend */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">9. Customer Action Trend</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={customerActionTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="Waiting" stroke={COLORS.gray} strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>
        )}

        {/* ── TAB CONTENT: CUSTOMERS HEALTH (6 CHARTS) ── */}
        {activeAnalyticsTab === 'customers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 10. Customer-wise ticket volume */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">10. Customer-wise Ticket Volume</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerTicketVolume} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 11. Customer-wise open tickets */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">11. Customer-wise Open Tickets</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerOpenTickets} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.amber} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 12. Customer-wise critical tickets */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">12. Customer-wise Critical Tickets</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerCriticalTickets} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 13. Customer-wise SLA breach */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">13. Customer-wise SLA Breach</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerSlaBreach} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 14. Customer-wise actual hours consumed */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">14. Customer-wise Hours Consumed</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerHoursConsumed} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.gray} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 15. Customer-wise satisfaction rating */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">15. Customer Satisfaction Rating</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerSatisfaction} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} domain={[0, 5]} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.green} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>
        )}

        {/* ── TAB CONTENT: CONSULTANT HEALTH (7 CHARTS) ── */}
        {activeAnalyticsTab === 'consultants' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 16. Consultant-wise workload */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">16. Consultant Workload (Open Tickets)</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consultantWorkload} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 17. Functional consultant workload */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">17. Functional Consultant Workload</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={functionalWorkload} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 18. Technical consultant workload */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">18. Technical Consultant Workload</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={technicalWorkload} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 19. Consultant-wise actual hours */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">19. Consultant Hours Logged</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consultantHours} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.gray} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 20. Consultant-wise ticket closure */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">20. Consultant Ticket Closures</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consultantClosure} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.green} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 21. Consultant-wise reopened tickets */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">21. Reopened Tickets by Consultant</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consultantReopened} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 22. Consultant-wise SLA performance */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">22. Consultant SLA Compliance (%)</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consultantSlaPerformance} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} domain={[80, 100]} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.green} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>
        )}

        {/* ── TAB CONTENT: HOURS ANALYTICS (6 CHARTS) ── */}
        {activeAnalyticsTab === 'hours' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 23. Estimated vs actual hours */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">23. Estimated vs Actual Hours Variance</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={estVsActualHours} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Legend wrapperStyle={{ fontSize: 8 }} />
                    <Bar dataKey="Est" fill={COLORS.gray} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Act" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 24. Functional actual hours */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">24. Functional Actual Hours Consumed</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={functionalHours} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 25. Technical actual hours */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">25. Technical Actual Hours Consumed</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={technicalHours} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 26. Total actual hours */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">26. Total Actual Hours</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={totalHours} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 27. Billable vs non-billable */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">27. Billable vs Non-Billable Split</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={billableVsNonBillable}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={65}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill={COLORS.green} />
                      <Cell fill={COLORS.gray} />
                    </Pie>
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Legend wrapperStyle={{ fontSize: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 28. Monthly hours trend */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">28. Monthly Hours Trend</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyHoursTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Area type="monotone" dataKey="Hours" stroke={COLORS.blue} fill="#eff6ff" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>
        )}

        {/* ── TAB CONTENT: APPROVAL ANALYTICS (4 CHARTS) ── */}
        {activeAnalyticsTab === 'approvals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 29. Closure approval trend */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">29. Closure Approval Decisions Trend</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={closureApprovalTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Legend wrapperStyle={{ fontSize: 8 }} />
                    <Bar dataKey="Approved" fill={COLORS.green} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Rejected" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 30. Actual hours approval trend */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">30. Timesheet (Hours) Approvals Trend</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actualHoursApprovalTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Legend wrapperStyle={{ fontSize: 8 }} />
                    <Bar dataKey="Approved" fill={COLORS.green} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Rejected" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 31. Reopen request trend */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">31. Reopen Request Decisions Trend</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reopenRequestTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Legend wrapperStyle={{ fontSize: 8 }} />
                    <Bar dataKey="Approved" fill={COLORS.green} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Rejected" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 32. Resource change request trend */}
            <Card className="border border-zinc-200 p-4 flex flex-col justify-between">
              <span className="font-bold block text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-100">32. Resource Change Requests Trend</span>
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resourceChangeRequestTrend} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                    <YAxis stroke="#71717a" fontSize={8} />
                    <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Legend wrapperStyle={{ fontSize: 8 }} />
                    <Bar dataKey="Approved" fill={COLORS.green} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Rejected" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>
        )}

      </div>

      {/* ── FOOTER ACTIONS ── */}
      <Card className="bg-white border border-zinc-200 rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans text-xs">
          <div>
            <h4 className="font-bold text-zinc-900 uppercase text-[10px] tracking-wider font-mono">Download Command Center Snapshots</h4>
            <p className="text-zinc-500 text-[11px] mt-0.5 font-mono">Export current metric structures, active allocations audit sheet, or SLA health summaries.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="outline" className="text-[10px] font-bold uppercase py-1.5 flex items-center gap-1.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 cursor-pointer">
              <Download size={12} />
              Delivery Audit (.CSV)
            </Button>
            <Button variant="outline" className="text-[10px] font-bold uppercase py-1.5 flex items-center gap-1.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 cursor-pointer">
              <Download size={12} />
              SLA Compliance (.CSV)
            </Button>
          </div>
        </div>
      </Card>

    </div>
  );
}
