'use client';

import React, { useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import {
  Clock,
  Activity,
  CheckCircle,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  FileText,
  AlertCircle,
  XCircle,
  Building2,
  FolderOpen,
  ArrowUpRight,
  HelpCircle,
  DollarSign,
  FileSpreadsheet,
  Award,
  ShieldCheck,
  RotateCcw,
  Unlock,
  Lock,
  Hourglass,
  Percent
} from 'lucide-react';
import { SAPModule, TicketPriority, TicketStatus } from '../../../types/ticket';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

export default function ConsultantDashboardPage() {
  const { tickets } = useTickets();
  const { user } = useAuth();

  const consultantName = user?.name || 'Karthik Subramanian';

  // Base tickets assigned to this consultant
  const myTickets = useMemo(() => {
    return tickets.filter(t => t.assignedConsultant === consultantName);
  }, [tickets, consultantName]);

  // Compute KPI metrics for Sections A, B, C, D, E
  const metrics = useMemo(() => {
    const now = new Date();
    
    // A. Workload Summary
    const totalAssigned = myTickets.length;
    const activeClientsSet = new Set(myTickets.map(t => t.organization));
    const activeClientsCount = activeClientsSet.size;
    const criticalPriority = myTickets.filter(t => t.priority === 'Critical').length;
    const highPriority = myTickets.filter(t => t.priority === 'High').length;
    const mediumPriority = myTickets.filter(t => t.priority === 'Medium').length;
    const lowPriority = myTickets.filter(t => t.priority === 'Low').length;
    const customerActionTickets = myTickets.filter(t => t.status === 'Customer Action' || t.customerActionRequired).length;
    const raisedToSapTickets = myTickets.filter(t => t.status === 'Raised to SAP' || t.raisedToSap).length;
    const requestForClosureTickets = myTickets.filter(t => t.status === 'Request for Closure').length;

    // B. Status Summary
    const reqGathering = myTickets.filter(t => t.status === 'Requirement Gathering' || t.status === 'New' || t.status === 'Assigned').length;
    const waitingHoursAppr = myTickets.filter(t => t.status === 'Waiting for Hours Approval').length;
    const inProgTech = myTickets.filter(t => t.status === 'In Progress - Technical' || (t.status === 'In Progress' && t.functionalOrTechnical === 'Technical')).length;
    const inProgFunc = myTickets.filter(t => t.status === 'In Progress - Functional' || (t.status === 'In Progress' && t.functionalOrTechnical === 'Functional')).length;
    const reopenedTickets = myTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length;

    // C. Hours Summary
    let funcEstHours = 0;
    let techEstHours = 0;
    let pendingClosureApprHours = 0;
    let approvedClosureHours = 0;
    let rejectedClosureHours = 0;
    let funcActHours = 0;
    let techActHours = 0;

    myTickets.forEach(t => {
      const activeEfforts = (t.consultantEfforts || []).filter(e => !e.isDeleted);
      const hasEfforts = activeEfforts.length > 0;

      if (hasEfforts) {
        activeEfforts.forEach(e => {
          if (e.consultantType === 'Functional') {
            funcEstHours += e.estimatedHours || 0;
            funcActHours += e.actualHours || 0;
          } else if (e.consultantType === 'Technical') {
            techEstHours += e.estimatedHours || 0;
            techActHours += e.actualHours || 0;
          }
        });
      } else {
        // Fallback to estimates and closure request data
        const latestEst = (t.hourEstimates || [])
          .filter(est => est.status === 'Submitted' || est.status === 'Revision Approved')
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
        
        if (latestEst) {
          funcEstHours += latestEst.functionalEstimatedHours;
          techEstHours += latestEst.technicalEstimatedHours;
        } else if (t.quotedHours) {
          if (t.functionalOrTechnical === 'Technical') {
            techEstHours += t.quotedHours;
          } else {
            funcEstHours += t.quotedHours;
          }
        }

        const approvedClosureReq = (t.closureRequests || []).find(req => req.status === 'Approved');
        if (approvedClosureReq) {
          funcActHours += approvedClosureReq.functionalActualHours;
          techActHours += approvedClosureReq.technicalActualHours;
        }
      }

      // Track closure requests status totals
      (t.closureRequests || []).forEach(req => {
        if (req.status === 'Approved') {
          approvedClosureHours += req.totalActualHours;
        } else if (req.status === 'Pending Manager Approval') {
          pendingClosureApprHours += req.totalActualHours;
        } else if (req.status === 'Rejected') {
          rejectedClosureHours += req.totalActualHours;
        }
      });
    });

    const totalEstHours = funcEstHours + techEstHours;
    const totalActHours = funcActHours + techActHours;

    // D. Efficiency Summary
    const resolvedThisMonth = myTickets.filter(t => {
      if (t.status !== 'Resolved' && t.status !== 'Closed') return false;
      const resDate = t.resolvedAt ? new Date(t.resolvedAt) : new Date(t.updatedAt);
      return resDate.getMonth() === now.getMonth() && resDate.getFullYear() === now.getFullYear();
    }).length;

    const resolvedTickets = myTickets.filter(t => (t.status === 'Resolved' || t.status === 'Closed') && t.resolvedAt);
    const avgResolutionTime = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          const resTime = new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime();
          return sum + (resTime / (1000 * 60 * 60)); // hours
        }, 0) / resolvedTickets.length
      : 0;

    let compliantCount = 0;
    myTickets.forEach(t => {
      if (t.status === 'Resolved' || t.status === 'Closed') {
        if (t.resolvedAt && t.slaDueAt && new Date(t.resolvedAt).getTime() <= new Date(t.slaDueAt).getTime()) {
          compliantCount++;
        }
      } else {
        if (t.slaDueAt && new Date(t.slaDueAt).getTime() >= now.getTime()) {
          compliantCount++;
        }
      }
    });
    const totalTickets = myTickets.length;
    const slaCompliancePercent = totalTickets > 0 ? (compliantCount / totalTickets) * 100 : 100;

    // Estimated vs actual variance
    const estVsActVariance = totalEstHours > 0
      ? ((totalActHours - totalEstHours) / totalEstHours) * 100
      : 0;

    const breachedCount = totalTickets - compliantCount;
    const productivityScore = Math.max(0, Math.min(100, 75 + (resolvedThisMonth * 5) - (breachedCount * 10)));
    const reopenPercent = totalTickets > 0 ? (reopenedTickets / totalTickets) * 100 : 0;

    // E. Alert Widgets calculations
    const closureReqPendingApproval = myTickets.filter(t => 
      (t.closureRequests || []).some(r => r.status === 'Pending Manager Approval')
    );
    const rejectedClosureRequestsList = myTickets.filter(t => 
      (t.closureRequests || []).some(r => r.status === 'Rejected')
    );
    const ticketsBlockedAfterClosure = myTickets.filter(t => t.status === 'Request for Closure');
    
    // Unlock pending
    const ticketsRequiringManagerUnlock = myTickets.filter(t => 
      (t.unlockRequests || []).some(r => r.status === 'Pending')
    );

    // Missing actual hours: tickets closed or closure request submitted with 0 actual hours
    const ticketsWithMissingActualHours = myTickets.filter(t => 
      t.status === 'Request for Closure' && !(t.closureRequests?.length)
    );
    
    const ticketsCustomerActionPending = myTickets.filter(t => t.status === 'Customer Action' || t.customerActionRequired);

    return {
      // Section A
      totalAssigned,
      activeClientsCount,
      criticalPriority,
      highPriority,
      mediumPriority,
      lowPriority,
      customerActionTickets,
      raisedToSapTickets,
      requestForClosureTickets,
      // Section B
      reqGathering,
      waitingHoursAppr,
      inProgTech,
      inProgFunc,
      reopenedTickets,
      // Section C
      funcEstHours,
      techEstHours,
      totalEstHours,
      funcActHours,
      techActHours,
      totalActHours,
      pendingClosureApprHours,
      approvedClosureHours,
      rejectedClosureHours,
      // Section D
      resolvedThisMonth,
      avgResolutionTime,
      slaCompliancePercent,
      estVsActVariance,
      productivityScore,
      reopenPercent,
      // Section E Lists
      closureReqPendingApproval,
      rejectedClosureRequestsList,
      ticketsBlockedAfterClosure,
      ticketsRequiringManagerUnlock,
      ticketsWithMissingActualHours,
      ticketsCustomerActionPending
    };
  }, [myTickets]);

  // 1. Status-wise ticket chart
  const statusChartData = useMemo(() => {
    return [
      { name: 'Req Gather', count: metrics.reqGathering },
      { name: 'Wait Hours', count: metrics.waitingHoursAppr },
      { name: 'IP Technical', count: metrics.inProgTech },
      { name: 'IP Functional', count: metrics.inProgFunc },
      { name: 'Raised SAP', count: metrics.raisedToSapTickets },
      { name: 'Cust Action', count: metrics.customerActionTickets },
      { name: 'Req Closure', count: metrics.requestForClosureTickets },
      { name: 'Reopened', count: metrics.reopenedTickets }
    ];
  }, [metrics]);

  // 2. Priority-wise ticket chart
  const priorityChartData = useMemo(() => {
    return [
      { name: 'Critical', value: metrics.criticalPriority, color: '#ef4444' }, // Red
      { name: 'High', value: metrics.highPriority, color: '#f59e0b' },      // Amber
      { name: 'Medium', value: metrics.mediumPriority, color: '#3b82f6' },    // Blue
      { name: 'Low', value: metrics.lowPriority, color: '#71717a' }          // Gray
    ].filter(d => d.value > 0);
  }, [metrics]);

  // 3. Client-wise ticket chart
  const clientChartData = useMemo(() => {
    const clients: { [key: string]: number } = {};
    myTickets.forEach(t => {
      clients[t.organization] = (clients[t.organization] || 0) + 1;
    });
    return Object.keys(clients).map(k => ({
      name: k.length > 15 ? k.substring(0, 15) + '...' : k,
      tickets: clients[k]
    })).sort((a, b) => b.tickets - a.tickets).slice(0, 5);
  }, [myTickets]);

  // 4. Module-wise ticket chart
  const moduleChartData = useMemo(() => {
    const modules: { [key in SAPModule]?: number } = {};
    myTickets.forEach(t => {
      if (t.sapModule) {
        modules[t.sapModule] = (modules[t.sapModule] || 0) + 1;
      }
    });
    return Object.entries(modules).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);
  }, [myTickets]);

  // 5. Functional vs technical hours chart
  const effortTypeChartData = useMemo(() => {
    return [
      { name: 'Functional Hours', value: metrics.funcEstHours, color: '#3b82f6' }, // Blue
      { name: 'Technical Hours', value: metrics.techEstHours, color: '#64748b' } // Slate
    ];
  }, [metrics]);

  // 6. Estimated vs actual hours chart
  const estVsActChartData = useMemo(() => {
    return myTickets.slice(0, 6).map(t => {
      const approvedEst = (t.hourEstimates || []).find(e => e.status === 'Submitted' || e.status === 'Revision Approved')?.totalEstimatedHours || t.quotedHours || 0;
      const approvedCls = (t.closureRequests || []).find(c => c.status === 'Approved')?.totalActualHours || 0;
      return {
        id: t.id,
        Estimated: approvedEst,
        Actual: approvedCls
      };
    });
  }, [myTickets]);

  // 7. Closure Request status chart data
  const closureStatusChartData = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    myTickets.forEach(t => {
      (t.closureRequests || []).forEach(r => {
        if (r.status === 'Pending Manager Approval') pending++;
        else if (r.status === 'Approved') approved++;
        else if (r.status === 'Rejected') rejected++;
      });
    });

    return [
      { name: 'Pending', count: pending, color: '#f59e0b' },  // Amber
      { name: 'Approved', count: approved, color: '#10b981' }, // Green
      { name: 'Rejected', count: rejected, color: '#ef4444' }  // Red
    ].filter(d => d.count > 0);
  }, [myTickets]);

  // 8. Monthly hours trend data (Mocked monthly data with current month updated)
  const monthlyHoursTrend = useMemo(() => {
    return [
      { month: 'Dec', hours: 45 },
      { month: 'Jan', hours: 68 },
      { month: 'Feb', hours: 55 },
      { month: 'Mar', hours: 82 },
      { month: 'Apr', hours: 74 },
      { month: 'May (Current)', hours: metrics.approvedClosureHours }
    ];
  }, [metrics.approvedClosureHours]);

  // 9. SLA compliance chart
  const slaComplianceChartData = useMemo(() => {
    let compliant = 0;
    let breached = 0;
    myTickets.forEach(t => {
      if (t.status === 'Resolved' || t.status === 'Closed') {
        if (t.resolvedAt && t.slaDueAt && new Date(t.resolvedAt).getTime() <= new Date(t.slaDueAt).getTime()) {
          compliant++;
        } else {
          breached++;
        }
      } else {
        if (t.slaDueAt && new Date(t.slaDueAt).getTime() < Date.now()) {
          breached++;
        } else {
          compliant++;
        }
      }
    });
    return [
      { name: 'Compliant', value: compliant, color: '#10b981' }, // Green
      { name: 'Breached', value: breached, color: '#ef4444' } // Red
    ].filter(d => d.value > 0);
  }, [myTickets]);

  return (
    <div className="space-y-8 font-sans bg-zinc-50 text-zinc-900 min-h-screen p-6 md:p-8">
      
      {/* Header section */}
      <div className="border-b border-zinc-200 pb-5">
        <h1 className="text-2xl font-bold uppercase text-zinc-950 tracking-tight font-mono">
          Consultant Command Center
        </h1>
        <p className="text-zinc-500 text-xs mt-1">
          Review workload metrics, hours summaries, operational alerts, and analytical splits for consultant: <span className="font-bold text-zinc-900">{consultantName}</span>.
        </p>
      </div>

      {/* A. WORKLOAD SUMMARY */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono">A. Workload Summary</h3>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-6 md:col-span-4 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Assigned Tickets</span>
            <span className="text-2xl font-bold text-zinc-955 font-mono">{metrics.totalAssigned}</span>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-4 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Active Clients</span>
            <span className="text-2xl font-bold text-zinc-955 font-mono">{metrics.activeClientsCount}</span>
          </div>
          <div className="col-span-12 sm:col-span-12 md:col-span-4 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-red-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-red-700">Critical Tickets</span>
            <span className="text-2xl font-bold text-red-600 font-mono">{metrics.criticalPriority}</span>
          </div>
          
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-amber-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-amber-700">High Priority</span>
            <span className="text-xl font-bold text-amber-600 font-mono">{metrics.highPriority}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-blue-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-blue-700">Medium Priority</span>
            <span className="text-xl font-bold text-blue-600 font-mono">{metrics.mediumPriority}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-zinc-300">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-zinc-650">Low Priority</span>
            <span className="text-xl font-bold text-zinc-600 font-mono">{metrics.lowPriority}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-amber-400">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-amber-600">Customer Action</span>
            <span className="text-xl font-bold text-amber-600 font-mono">{metrics.customerActionTickets}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-amber-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-amber-700">Raised to SAP</span>
            <span className="text-xl font-bold text-amber-700 font-mono">{metrics.raisedToSapTickets}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-emerald-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-emerald-700">Req. Closure</span>
            <span className="text-xl font-bold text-emerald-600 font-mono">{metrics.requestForClosureTickets}</span>
          </div>
        </div>
      </div>

      {/* B. STATUS SUMMARY */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono">B. Status Summary</h3>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6 sm:col-span-4 lg:col-span-3 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-zinc-300">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Requirement Gathering</span>
            <span className="text-2xl font-bold text-zinc-500 font-mono">{metrics.reqGathering}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-3 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-amber-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Waiting Hours Approval</span>
            <span className="text-2xl font-bold text-amber-500 font-mono">{metrics.waitingHoursAppr}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-3 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-blue-600">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">In Progress Technical</span>
            <span className="text-2xl font-bold text-blue-600 font-mono">{metrics.inProgTech}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-3 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-slate-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">In Progress Functional</span>
            <span className="text-2xl font-bold text-slate-500 font-mono">{metrics.inProgFunc}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-3 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-amber-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Raised to SAP</span>
            <span className="text-2xl font-bold text-amber-600 font-mono">{metrics.raisedToSapTickets}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-3 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-amber-400">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Customer Action</span>
            <span className="text-2xl font-bold text-amber-500 font-mono">{metrics.customerActionTickets}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-3 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-emerald-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Request for Closure</span>
            <span className="text-2xl font-bold text-emerald-600 font-mono">{metrics.requestForClosureTickets}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-3 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-red-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-red-700">Reopened Tickets</span>
            <span className="text-2xl font-bold text-red-600 font-mono">{metrics.reopenedTickets}</span>
          </div>
        </div>
      </div>

      {/* C. HOURS SUMMARY */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono">C. Hours Summary</h3>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-6 md:col-span-4 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-blue-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Func. Est Hours</span>
            <span className="text-2xl font-bold text-blue-600 font-mono">{metrics.funcEstHours.toFixed(1)}</span>
          </div>
          <div className="col-span-12 sm:col-span-6 md:col-span-4 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-slate-400">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Tech. Est Hours</span>
            <span className="text-2xl font-bold text-slate-600 font-mono">{metrics.techEstHours.toFixed(1)}</span>
          </div>
          <div className="col-span-12 sm:col-span-12 md:col-span-4 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-zinc-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Total Est Hours</span>
            <span className="text-2xl font-bold text-zinc-700 font-mono">{metrics.totalEstHours.toFixed(1)}</span>
          </div>
          
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-blue-400">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-blue-600">Func. Actual Hours</span>
            <span className="text-xl font-bold text-blue-500 font-mono">{metrics.funcActHours.toFixed(1)}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-slate-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-slate-655">Tech. Actual Hours</span>
            <span className="text-xl font-bold text-slate-500 font-mono">{metrics.techActHours.toFixed(1)}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-emerald-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-emerald-700">Total Actual Hours</span>
            <span className="text-xl font-bold text-emerald-600 font-mono">{metrics.totalActHours.toFixed(1)}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-amber-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-amber-700">Pending Closure Hours</span>
            <span className="text-xl font-bold text-amber-500 font-mono">{metrics.pendingClosureApprHours.toFixed(1)}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-emerald-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-emerald-700">Approved Closure Hours</span>
            <span className="text-xl font-bold text-emerald-600 font-mono">{metrics.approvedClosureHours.toFixed(1)}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-red-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-red-700">Rejected Closure Hours</span>
            <span className="text-xl font-bold text-red-600 font-mono">{metrics.rejectedClosureHours.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* D. EFFICIENCY SUMMARY */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono">D. Efficiency Summary</h3>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-emerald-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-emerald-700">Resolved This Month</span>
            <span className="text-2xl font-bold text-emerald-600 font-mono">{metrics.resolvedThisMonth}</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-zinc-300">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Avg Resolution Time</span>
            <span className="text-2xl font-bold text-zinc-800 font-mono">{metrics.avgResolutionTime.toFixed(1)} hrs</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-zinc-300">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">SLA Compliance</span>
            <span className="text-2xl font-bold text-zinc-800 font-mono">{metrics.slaCompliancePercent.toFixed(1)}%</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-zinc-300">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Est vs Actual Variance</span>
            <span className={`text-2xl font-bold font-mono ${metrics.estVsActVariance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {metrics.estVsActVariance >= 0 ? '+' : ''}{metrics.estVsActVariance.toFixed(1)}%
            </span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-emerald-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-emerald-700">Productivity Score</span>
            <span className="text-2xl font-bold text-emerald-600 font-mono">{metrics.productivityScore.toFixed(0)} / 100</span>
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2 bg-white border border-zinc-200 rounded p-4 h-24 flex flex-col justify-between shadow-sm border-l-2 border-l-red-500">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-red-700">Reopen Percentage</span>
            <span className="text-2xl font-bold text-red-600 font-mono">{metrics.reopenPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* E. ALERT REGISTRY (6 DISTINCT WIDGETS) */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono">E. Alert Registry</h3>
        <div className="grid grid-cols-12 gap-4">
          
          {/* Widget 1: Closure Requests Pending Approval */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-950">Pending Closure Approvals</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-bold uppercase font-mono">Pending</span>
            </div>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {metrics.closureReqPendingApproval.map(t => (
                <div key={t.id} className="p-2 bg-zinc-50 border border-zinc-200 rounded flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <Link href={`/consultant/tickets/${t.id}`} className="font-mono text-xs font-bold text-zinc-900 hover:underline">{t.id}</Link>
                    <div className="text-[9px] text-zinc-500 truncate mt-0.5">{t.title}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-semibold font-mono">
                    Pending
                  </span>
                </div>
              ))}
              {metrics.closureReqPendingApproval.length === 0 && (
                <div className="text-zinc-400 text-xs italic text-center py-6">No pending closure requests.</div>
              )}
            </div>
          </div>

          {/* Widget 2: Rejected Closure Requests */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-red-800">Rejected Closure Requests</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-50 text-red-700 border border-red-200 font-bold uppercase font-mono">Action Required</span>
            </div>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {metrics.rejectedClosureRequestsList.map(t => (
                <div key={t.id} className="p-2 bg-red-50/20 border border-red-200 rounded flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <Link href={`/consultant/tickets/${t.id}`} className="font-mono text-xs font-bold text-red-700 hover:underline">{t.id}</Link>
                    <div className="text-[9px] text-red-600 truncate mt-0.5">{t.title}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] bg-red-50 text-red-700 border border-red-200 font-semibold font-mono">
                    Rejected
                  </span>
                </div>
              ))}
              {metrics.rejectedClosureRequestsList.length === 0 && (
                <div className="text-zinc-400 text-xs italic text-center py-6">No rejected closure alerts.</div>
              )}
            </div>
          </div>

          {/* Widget 3: Tickets Blocked after Closure Request */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-950">Tickets Blocked (Locked)</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] bg-zinc-100 text-zinc-600 border border-zinc-300 font-bold uppercase font-mono">Immutable</span>
            </div>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {metrics.ticketsBlockedAfterClosure.map(t => (
                <div key={t.id} className="p-2 bg-zinc-50 border border-zinc-200 rounded flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <Link href={`/consultant/tickets/${t.id}`} className="font-mono text-xs font-bold text-zinc-900 hover:underline">{t.id}</Link>
                    <div className="text-[9px] text-zinc-500 truncate mt-0.5">{t.title}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] bg-zinc-100 border border-zinc-200 text-zinc-600 font-semibold font-mono">
                    Locked
                  </span>
                </div>
              ))}
              {metrics.ticketsBlockedAfterClosure.length === 0 && (
                <div className="text-zinc-400 text-xs italic text-center py-6">No blocked tickets currently.</div>
              )}
            </div>
          </div>

          {/* Widget 4: Tickets Requiring Manager Unlock */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-950">Unlock Requests Submitted</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-bold uppercase font-mono">Awaiting Review</span>
            </div>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {metrics.ticketsRequiringManagerUnlock.map(t => (
                <div key={t.id} className="p-2 bg-zinc-50 border border-zinc-200 rounded flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <Link href={`/consultant/tickets/${t.id}`} className="font-mono text-xs font-bold text-zinc-900 hover:underline">{t.id}</Link>
                    <div className="text-[9px] text-zinc-500 truncate mt-0.5">Unlock requested from manager</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-semibold font-mono">
                    Unlock Req
                  </span>
                </div>
              ))}
              {metrics.ticketsRequiringManagerUnlock.length === 0 && (
                <div className="text-zinc-400 text-xs italic text-center py-6">No active unlock requests.</div>
              )}
            </div>
          </div>

          {/* Widget 5: Tickets with Missing Actual Hours */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-red-800">Missing Actual Hours</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-50 text-red-700 border border-red-200 font-bold uppercase font-mono">Log Hours</span>
            </div>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {metrics.ticketsWithMissingActualHours.map(t => (
                <div key={t.id} className="p-2 bg-red-50/20 border border-red-200 rounded flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <Link href={`/consultant/tickets/${t.id}`} className="font-mono text-xs font-bold text-red-700 hover:underline">{t.id}</Link>
                    <div className="text-[9px] text-red-600 truncate mt-0.5">Missing closure actual hours</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] bg-red-50 text-red-700 border border-red-200 font-semibold font-mono">
                    No Hours
                  </span>
                </div>
              ))}
              {metrics.ticketsWithMissingActualHours.length === 0 && (
                <div className="text-zinc-400 text-xs italic text-center py-6">All actual hours logged.</div>
              )}
            </div>
          </div>

          {/* Widget 6: Tickets with Customer Action Pending */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-950">Awaiting Customer Action</span>
              <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-bold uppercase font-mono">On Hold</span>
            </div>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {metrics.ticketsCustomerActionPending.map(t => (
                <div key={t.id} className="p-2 bg-zinc-50 border border-zinc-200 rounded flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <Link href={`/consultant/tickets/${t.id}`} className="font-mono text-xs font-bold text-zinc-900 hover:underline">{t.id}</Link>
                    <div className="text-[9px] text-zinc-500 truncate mt-0.5">{t.title}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-semibold font-mono">
                    Cust Action
                  </span>
                </div>
              ))}
              {metrics.ticketsCustomerActionPending.length === 0 && (
                <div className="text-zinc-400 text-xs italic text-center py-6">No tickets pending customer action.</div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* VISUAL ANALYTICS (9 CHARTS PERFECT GRID ALIGNMENT) */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono">F. Visual Analytics</h3>
        
        <div className="grid grid-cols-12 gap-6">
          
          {/* Chart 1: Status-wise Ticket Chart */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm h-[320px] flex flex-col justify-between">
            <div>
              <span className="font-bold text-xs text-zinc-900 uppercase tracking-wider block">1. Status-wise Ticket Flow</span>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Distribution of tickets across active workflow states</span>
            </div>
            <div className="h-52 w-full mt-2">
              {myTickets.length > 0 && statusChartData.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} margin={{ bottom: 20 }}>
                    <XAxis dataKey="name" stroke="#d4d4d8" tick={{ fill: '#71717a', fontSize: 7 }} angle={-25} textAnchor="end" interval={0} />
                    <YAxis stroke="#d4d4d8" tick={{ fill: '#71717a', fontSize: 8 }} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b', fontSize: 10 }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-xs italic">No data available</div>
              )}
            </div>
          </div>

          {/* Chart 2: Priority-wise Ticket Chart */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm h-[320px] flex flex-col justify-between">
            <div>
              <span className="font-bold text-xs text-zinc-900 uppercase tracking-wider block">2. Priority-wise Ticket Allocation</span>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Severity distribution based on SLA criticalities</span>
            </div>
            <div className="h-52 w-full mt-2">
              {myTickets.length > 0 && priorityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={priorityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} label={{ fill: '#18181b', fontSize: 8 }}>
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b', fontSize: 10 }} />
                    <Legend wrapperStyle={{ fontSize: 9, color: '#71717a' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-xs italic">No data available</div>
              )}
            </div>
          </div>

          {/* Chart 3: Client-wise Ticket Chart */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm h-[320px] flex flex-col justify-between">
            <div>
              <span className="font-bold text-xs text-zinc-900 uppercase tracking-wider block">3. Client-wise Ticket Distribution</span>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Total tickets split across client organizations</span>
            </div>
            <div className="h-52 w-full mt-2">
              {myTickets.length > 0 && clientChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <XAxis type="number" stroke="#d4d4d8" tick={{ fill: '#71717a', fontSize: 8 }} />
                    <YAxis dataKey="name" type="category" stroke="#d4d4d8" tick={{ fill: '#71717a', fontSize: 8 }} width={75} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b', fontSize: 10 }} />
                    <Bar dataKey="tickets" fill="#6366f1" radius={[0, 2, 2, 0]} barSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-xs italic">No data available</div>
              )}
            </div>
          </div>

          {/* Chart 4: SAP Module-wise Tickets */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm h-[320px] flex flex-col justify-between">
            <div>
              <span className="font-bold text-xs text-zinc-900 uppercase tracking-wider block">4. SAP Module-wise Tickets</span>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Breakdown of support tickets by SAP module code</span>
            </div>
            <div className="h-52 w-full mt-2">
              {myTickets.length > 0 && moduleChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moduleChartData}>
                    <XAxis dataKey="name" stroke="#d4d4d8" tick={{ fill: '#71717a', fontSize: 8 }} />
                    <YAxis stroke="#d4d4d8" tick={{ fill: '#71717a', fontSize: 8 }} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b', fontSize: 10 }} />
                    <Bar dataKey="count" fill="#14b8a6" radius={[2, 2, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-xs italic">No data available</div>
              )}
            </div>
          </div>

          {/* Chart 5: Functional vs Technical Hours Chart */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm h-[320px] flex flex-col justify-between">
            <div>
              <span className="font-bold text-xs text-zinc-900 uppercase tracking-wider block">5. Functional vs Technical Hours</span>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Estimated effort allocation between F & T tasks</span>
            </div>
            <div className="h-52 w-full mt-2">
              {myTickets.length > 0 && metrics.totalEstHours > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={effortTypeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={0} outerRadius={60} label={{ fill: '#18181b', fontSize: 8 }}>
                      {effortTypeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b', fontSize: 10 }} />
                    <Legend wrapperStyle={{ fontSize: 9, color: '#71717a' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-xs italic">No data available</div>
              )}
            </div>
          </div>

          {/* Chart 6: Estimated vs Actual Hours Chart */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm h-[320px] flex flex-col justify-between">
            <div>
              <span className="font-bold text-xs text-zinc-900 uppercase tracking-wider block">6. Estimated vs Actual Hours</span>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Comparison of estimated workload vs approved actual hours</span>
            </div>
            <div className="h-52 w-full mt-2">
              {myTickets.length > 0 && estVsActChartData.length > 0 && estVsActChartData.some(d => d.Estimated > 0 || d.Actual > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={estVsActChartData} margin={{ bottom: 5 }}>
                    <XAxis dataKey="id" stroke="#d4d4d8" tick={{ fill: '#71717a', fontSize: 8 }} />
                    <YAxis stroke="#d4d4d8" tick={{ fill: '#71717a', fontSize: 8 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b', fontSize: 10 }} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="Estimated" fill="#64748b" radius={[2, 2, 0, 0]} barSize={8} />
                    <Bar dataKey="Actual" fill="#10b981" radius={[2, 2, 0, 0]} barSize={8} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-xs italic">No data available</div>
              )}
            </div>
          </div>

          {/* Chart 7: Closure Request Status Chart */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm h-[320px] flex flex-col justify-between">
            <div>
              <span className="font-bold text-xs text-zinc-900 uppercase tracking-wider block">7. Closure Requests Status Split</span>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Pending vs Approved vs Rejected closure requests count</span>
            </div>
            <div className="h-52 w-full mt-2">
              {myTickets.length > 0 && closureStatusChartData.length > 0 && closureStatusChartData.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={closureStatusChartData}>
                    <XAxis dataKey="name" stroke="#d4d4d8" tick={{ fill: '#71717a', fontSize: 8 }} />
                    <YAxis stroke="#d4d4d8" tick={{ fill: '#71717a', fontSize: 8 }} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b', fontSize: 10 }} />
                    <Bar dataKey="count" barSize={20} radius={[2, 2, 0, 0]}>
                      {closureStatusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-xs italic">No data available</div>
              )}
            </div>
          </div>

          {/* Chart 8: Monthly Hours Trend Chart */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm h-[320px] flex flex-col justify-between">
            <div>
              <span className="font-bold text-xs text-zinc-900 uppercase tracking-wider block">8. Monthly Approved Hours Trend</span>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Chronological progress of approved billable support hours</span>
            </div>
            <div className="h-52 w-full mt-2">
              {myTickets.length > 0 && monthlyHoursTrend.some(d => d.hours > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyHoursTrend}>
                    <XAxis dataKey="month" stroke="#d4d4d8" tick={{ fill: '#71717a', fontSize: 8 }} />
                    <YAxis stroke="#d4d4d8" tick={{ fill: '#71717a', fontSize: 8 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b', fontSize: 10 }} />
                    <Area type="monotone" dataKey="hours" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-xs italic">No data available</div>
              )}
            </div>
          </div>

          {/* Chart 9: SLA Resolution Performance */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 shadow-sm h-[320px] flex flex-col justify-between">
            <div>
              <span className="font-bold text-xs text-zinc-900 uppercase tracking-wider block">9. SLA Resolution Performance</span>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Compliant vs Breached response/resolution times</span>
            </div>
            <div className="h-52 w-full mt-2">
              {myTickets.length > 0 && slaComplianceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={slaComplianceChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} label={{ fill: '#18181b', fontSize: 8 }}>
                      {slaComplianceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b', fontSize: 10 }} />
                    <Legend wrapperStyle={{ fontSize: 9, color: '#71717a' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-xs italic">No data available</div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
