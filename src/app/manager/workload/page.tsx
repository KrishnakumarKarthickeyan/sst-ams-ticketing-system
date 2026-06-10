'use client';

import React, { useState, useMemo } from 'react';
import { useTickets } from '@/context/TicketContext';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Activity,
  AlertTriangle,
  Clock,
  Filter,
  BarChart3,
  Calendar,
  Building2,
  TrendingUp,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { SAPModule } from '@/types/ticket';

import { chartColors } from '@/lib/chart-theme';

const COLORS = {
  blue: chartColors.semantic.info,
  emerald: chartColors.semantic.success,
  amber: chartColors.semantic.warning,
  red: chartColors.semantic.danger,
  gray: chartColors.semantic.neutral,
  zinc400: chartColors.categorical[5],
  zinc300: chartColors.categorical[4],
  zinc100: '#f4f4f5',
  zinc800: '#27272a',
  zinc950: chartColors.categorical[0],
};

const CHART_COLORS = chartColors.categorical;

export default function ManagerWorkloadPage() {
  const { tickets, profiles } = useTickets();
  const { user } = useAuth();

  // Filter states
  const [timeframe, setTimeframe] = useState<'All' | '30' | '90' | 'YTD'>('All');
  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [selectedCompany, setSelectedCompany] = useState<string>('All');

  // Sub tab selection
  const [activeSubTab, setActiveSubTab] = useState<'consultants' | 'customers'>('consultants');

  // Roster details states
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
  const [selectedOrgName, setSelectedOrgName] = useState<string | null>(null);

  // Timeframe date filtering helper
  const isWithinTimeframe = (dateStr: string) => {
    if (timeframe === 'All') return true;
    const date = new Date(dateStr);
    const now = new Date();
    
    if (timeframe === '30') {
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      return date >= thirtyDaysAgo;
    }
    if (timeframe === '90') {
      const ninetyDaysAgo = new Date(now.setDate(now.getDate() - 90));
      return date >= ninetyDaysAgo;
    }
    if (timeframe === 'YTD') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return date >= startOfYear;
    }
    return true;
  };

  // Filtered tickets based on timeframe, module, and company
  const filteredTickets = useMemo(() => {
    return (tickets || []).filter(t => {
      if (!isWithinTimeframe(t.createdAt)) return false;
      if (selectedModule !== 'All' && t.sapModule !== selectedModule) return false;
      if (selectedCompany !== 'All' && t.organization !== selectedCompany) return false;
      return true;
    });
  }, [tickets, timeframe, selectedModule, selectedCompany]);

  // List of unique companies/organizations for dropdown filter
  const organizationsDropdownOptions = useMemo(() => {
    const orgs = (tickets || []).map(t => t.organization).filter(Boolean);
    return Array.from(new Set(orgs));
  }, [tickets]);

  // List of unique SAP modules for dropdown filter
  const modulesDropdownOptions = useMemo(() => {
    const mods = (tickets || []).map(t => t.sapModule).filter(Boolean);
    return Array.from(new Set(mods));
  }, [tickets]);

  // SLA breach check helper
  const isTicketBreached = (t: any) => {
    if (!t.slaDueAt || t.slaDueAt === 'SLA Not Applicable') return false;
    const dueDate = new Date(t.slaDueAt);
    const dueTime = dueDate.getTime();
    
    if (t.status === 'Resolved' || t.status === 'Closed') {
      const compDate = t.resolvedAt || t.closedAt;
      if (!compDate) return false;
      return new Date(compDate).getTime() > dueTime;
    } else {
      return Date.now() > dueTime;
    }
  };

  // -------------------------------------------------------------
  // 1. CONSULTANT ANALYTICS SUMMARY & DATASET
  // -------------------------------------------------------------
  const consultantAnalytics = useMemo(() => {
    const consultantsList = (profiles || []).filter(p => p.role === 'Consultant');
    const allApprovedEfforts = filteredTickets.flatMap(t => t.efforts || [])
      .filter(e => e.status === 'Approved');

    const mapped = consultantsList.map(cons => {
      const myActiveTickets = filteredTickets.filter(t => 
        t.status !== 'Closed' && 
        t.status !== 'Resolved' && 
        t.consultantEfforts?.some((eff: any) => eff.consultantId === cons.id)
      );

      const myResolvedTickets = filteredTickets.filter(t => 
        (t.status === 'Resolved' || t.status === 'Closed') && 
        t.consultantEfforts?.some((eff: any) => eff.consultantId === cons.id)
      );

      const criticalCount = myActiveTickets.filter(t => t.priority === 'Critical' || t.priority === 'High').length;
      const escalatedCount = myActiveTickets.filter(t => t.escalationFlag).length;

      // Sum approved hours logged by this consultant
      const approvedHours = allApprovedEfforts
        .filter(e => e.consultantId === cons.id)
        .reduce((sum, e) => sum + Number(e.hoursWorked || e.hoursLogged || 0), 0);

      // Average resolution time in days
      let totalResolutionTimeMs = 0;
      let resolvedCount = 0;
      myResolvedTickets.forEach(t => {
        const compDate = t.resolvedAt || t.closedAt;
        if (compDate) {
          totalResolutionTimeMs += new Date(compDate).getTime() - new Date(t.createdAt).getTime();
          resolvedCount++;
        }
      });
      const avgResolutionDays = resolvedCount > 0 
        ? Number((totalResolutionTimeMs / (1000 * 60 * 60 * 24) / resolvedCount).toFixed(1)) 
        : 0;

      // Map module count load
      const moduleMap: Record<string, number> = {};
      myActiveTickets.forEach(t => {
        moduleMap[t.sapModule] = (moduleMap[t.sapModule] || 0) + 1;
      });

      // Workload health evaluation
      let workloadState: 'Underutilized' | 'Optimal' | 'Overloaded' = 'Optimal';
      if (myActiveTickets.length >= 5 || escalatedCount > 0) {
        workloadState = 'Overloaded';
      } else if (myActiveTickets.length <= 1) {
        workloadState = 'Underutilized';
      }

      return {
        id: cons.id,
        name: cons.full_name || 'Consultant',
        email: cons.email || '',
        type: cons.consultant_type || 'Functional',
        activeCount: myActiveTickets.length,
        criticalCount,
        escalatedCount,
        hoursApproved: approvedHours,
        avgResolutionDays,
        workloadState,
        moduleLoad: moduleMap,
        ticketsList: myActiveTickets
      };
    });

    // Sort by active tickets count descending
    return mapped.sort((a, b) => b.activeCount - a.activeCount);
  }, [filteredTickets, profiles]);

  // Aggregate metrics for consultants
  const consultantKPIs = useMemo(() => {
    const total = consultantAnalytics.length;
    if (total === 0) return { avgActive: 0, totalHours: 0, avgResolution: 0, overloadedCount: 0 };

    const avgActive = Number((consultantAnalytics.reduce((sum, c) => sum + c.activeCount, 0) / total).toFixed(1));
    const totalHours = consultantAnalytics.reduce((sum, c) => sum + c.hoursApproved, 0);
    const activeResolvers = consultantAnalytics.filter(c => c.avgResolutionDays > 0);
    const avgResolution = activeResolvers.length > 0
      ? Number((activeResolvers.reduce((sum, c) => sum + c.avgResolutionDays, 0) / activeResolvers.length).toFixed(1))
      : 0;
    const overloadedCount = consultantAnalytics.filter(c => c.workloadState === 'Overloaded').length;

    return { avgActive, totalHours, avgResolution, overloadedCount };
  }, [consultantAnalytics]);

  // Recharts: active tickets load chart
  const consultantActiveTicketsChartData = useMemo(() => {
    return consultantAnalytics.slice(0, 8).map(c => ({
      name: c.name.split(' ')[0], // First name only
      'Active Tickets': c.activeCount,
      'SLA Alert / Critical': c.criticalCount
    }));
  }, [consultantAnalytics]);

  // Recharts: Workload states distribution
  const workloadStateChartData = useMemo(() => {
    const states = { Overloaded: 0, Optimal: 0, Underutilized: 0 };
    consultantAnalytics.forEach(c => {
      states[c.workloadState]++;
    });
    return [
      { name: 'Overloaded (5+ Open)', value: states.Overloaded, color: COLORS.red },
      { name: 'Optimal (2-4 Open)', value: states.Optimal, color: COLORS.emerald },
      { name: 'Underutilized (0-1 Open)', value: states.Underutilized, color: COLORS.gray }
    ].filter(d => d.value > 0);
  }, [consultantAnalytics]);

  // -------------------------------------------------------------
  // 2. CUSTOMER SUPPORT UTILIZATION SUMMARY & DATASET
  // -------------------------------------------------------------
  const customerAnalytics = useMemo(() => {
    const uniqueOrgs = Array.from(new Set(filteredTickets.map(t => t.organization).filter(Boolean)));
    const allApprovedEfforts = filteredTickets.flatMap(t => t.efforts || [])
      .filter(e => e.status === 'Approved');

    const mapped = uniqueOrgs.map(orgName => {
      const orgTickets = filteredTickets.filter(t => t.organization === orgName);
      const activeTickets = orgTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
      
      // Calculate consumed hours
      const consumedHours = orgTickets.flatMap(t => t.efforts || [])
        .filter(e => e.status === 'Approved')
        .reduce((sum, e) => sum + Number(e.hoursWorked || e.hoursLogged || 0), 0);

      // SLA check
      const breaches = orgTickets.filter(t => isTicketBreached(t)).length;
      const totalSlaTickets = orgTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable').length;
      const complianceRate = totalSlaTickets > 0
        ? Math.round(((totalSlaTickets - breaches) / totalSlaTickets) * 100)
        : 100;

      // Group modules
      const moduleCounts: Record<string, number> = {};
      orgTickets.forEach(t => {
        moduleCounts[t.sapModule] = (moduleCounts[t.sapModule] || 0) + 1;
      });
      let topModule = 'N/A';
      let maxCount = 0;
      Object.entries(moduleCounts).forEach(([mod, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topModule = mod;
        }
      });

      return {
        name: orgName,
        totalTickets: orgTickets.length,
        activeTickets: activeTickets.length,
        consumedHours,
        breaches,
        topModule,
        complianceRate,
        ticketsList: orgTickets
      };
    });

    return mapped.sort((a, b) => b.consumedHours - a.consumedHours);
  }, [filteredTickets]);

  // Customer KPIs
  const customerKPIs = useMemo(() => {
    const total = customerAnalytics.length;
    if (total === 0) return { totalConsumedHours: 0, complianceRateAvg: 100, topCustomerName: 'N/A', totalBreaches: 0 };

    const totalConsumedHours = customerAnalytics.reduce((sum, c) => sum + c.consumedHours, 0);
    const complianceRateAvg = Math.round(
      customerAnalytics.reduce((sum, c) => sum + c.complianceRate, 0) / total
    );
    const topCustomer = [...customerAnalytics].sort((a, b) => b.consumedHours - a.consumedHours)[0];
    const totalBreaches = customerAnalytics.reduce((sum, c) => sum + c.breaches, 0);

    return {
      totalConsumedHours,
      complianceRateAvg,
      topCustomerName: topCustomer ? topCustomer.name : 'N/A',
      totalBreaches
    };
  }, [customerAnalytics]);

  // Recharts: customer consumed hours chart
  const customerHoursChartData = useMemo(() => {
    return customerAnalytics.slice(0, 8).map(c => ({
      name: c.name.length > 12 ? c.name.slice(0, 10) + '...' : c.name,
      'Hours Consumed': Number(c.consumedHours.toFixed(1))
    }));
  }, [customerAnalytics]);

  // Recharts: Customer SLA breaches comparison
  const customerSLAChartData = useMemo(() => {
    return customerAnalytics.slice(0, 8).map(c => ({
      name: c.name.length > 12 ? c.name.slice(0, 10) + '...' : c.name,
      'SLA Breaches': c.breaches,
      'Total Tickets': c.totalTickets
    }));
  }, [customerAnalytics]);

  // Selected consultant reference
  const selectedConsultant = useMemo(() => {
    if (!selectedConsultantId) return null;
    return consultantAnalytics.find(c => c.id === selectedConsultantId) || null;
  }, [selectedConsultantId, consultantAnalytics]);

  // Selected customer reference
  const selectedCustomer = useMemo(() => {
    if (!selectedOrgName) return null;
    return customerAnalytics.find(c => c.name === selectedOrgName) || null;
  }, [selectedOrgName, customerAnalytics]);

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4 bg-white">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-tight text-zinc-955 font-mono flex items-center gap-2">
            <Activity size={20} className="text-zinc-500 animate-pulse" />
            Workload & Utilization Analytics
          </h1>
          <p className="text-zinc-500 mt-1">Audit support resource balances, track SLA violations, and monitor company hour allocations.</p>
        </div>
      </div>

      {/* Top Canonical Filter Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        
        {/* Sub-tab Switcher */}
        <div className="flex bg-zinc-100 p-0.5 rounded border border-zinc-250 w-full md:w-auto shrink-0">
          <button
            onClick={() => { setActiveSubTab('consultants'); setSelectedConsultantId(null); }}
            className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'consultants' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Users size={12} />
            Resource Workloads
          </button>
          <button
            onClick={() => { setActiveSubTab('customers'); setSelectedOrgName(null); }}
            className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'customers' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Building2 size={12} />
            Customer Utilization
          </button>
        </div>

        {/* Global filter controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Timeframe Filter */}
          <div className="flex bg-zinc-50 border border-zinc-200 rounded-lg p-1 items-center gap-1 w-full sm:w-auto">
            <Calendar size={11} className="text-zinc-400 ml-1.5" />
            {(['All', '30', '90', 'YTD'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded cursor-pointer transition ${
                  timeframe === t ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {t === 'All' ? 'All' : t === 'YTD' ? 'YTD' : `${t}d`}
              </button>
            ))}
          </div>

          {/* SAP Module Filter */}
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 w-full sm:w-auto max-w-xs">
            <Filter size={11} className="text-zinc-400" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-transparent border-none text-[10px] font-bold uppercase focus:outline-none cursor-pointer w-full"
            >
              <option value="All">All Modules</option>
              {modulesDropdownOptions.map(mod => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
          </div>

          {/* Customer / Company Filter */}
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 w-full sm:w-auto max-w-xs">
            <Building2 size={11} className="text-zinc-400" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="bg-transparent border-none text-[10px] font-bold uppercase focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="All">All Companies</option>
              {organizationsDropdownOptions.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          TAB CONTENT A: CONSULTANTS WORKLOAD
          ------------------------------------------------------------- */}
      {activeSubTab === 'consultants' && (
        <div className="space-y-6">
          {/* Top KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Active Tickets / Resource</span>
                <span className="text-xl font-bold text-zinc-900 mt-1 block">{consultantKPIs.avgActive}</span>
              </div>
              <Users className="text-zinc-300" size={24} />
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Total Logged Hours</span>
                <span className="text-xl font-bold text-zinc-900 mt-1 block">{consultantKPIs.totalHours} hrs</span>
              </div>
              <FileCheck2 className="text-zinc-300" size={24} />
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Avg Resolution Speed</span>
                <span className="text-xl font-bold text-zinc-900 mt-1 block">{consultantKPIs.avgResolution} days</span>
              </div>
              <Clock className="text-zinc-300" size={24} />
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Overloaded Resources</span>
                <span className="text-xl font-bold text-red-700 mt-1 block flex items-center gap-1.5">
                  {consultantKPIs.overloadedCount}
                  {consultantKPIs.overloadedCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                  )}
                </span>
              </div>
              <AlertTriangle className="text-red-200" size={24} />
            </div>
          </div>

          {/* Visualizations row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Active Tickets Load Chart */}
            <Card className="md:col-span-2 border-zinc-200 bg-white">
              <CardHeader className="border-b border-zinc-150 py-3.5 px-4">
                <CardTitle className="text-xs uppercase tracking-wide">Queue Balances (Top 8 Resources)</CardTitle>
                <CardDescription className="text-[9.5px]">Open assignments and critical tickets per consultant.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 px-4 h-64">
                {consultantActiveTicketsChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-zinc-400 font-mono italic">No data available for the active filters.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultantActiveTicketsChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke={COLORS.gray} fontSize={9} className="font-mono" />
                      <YAxis stroke={COLORS.gray} fontSize={9} className="font-mono" allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ fontFamily: 'monospace', fontSize: '9px', borderRadius: '4px', borderColor: '#e4e4e7' }} />
                      <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', paddingTop: '10px' }} />
                      <Bar dataKey="Active Tickets" fill={COLORS.zinc950} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="SLA Alert / Critical" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Workload health breakdown */}
            <Card className="border-zinc-200 bg-white">
              <CardHeader className="border-b border-zinc-150 py-3.5 px-4">
                <CardTitle className="text-xs uppercase tracking-wide">Workload Ratios</CardTitle>
                <CardDescription className="text-[9.5px]">Percentage capacity split on consultant rosters.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 px-4 h-64 flex flex-col justify-between">
                {workloadStateChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-zinc-400 font-mono italic">No data available.</div>
                ) : (
                  <>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={workloadStateChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {workloadStateChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ fontFamily: 'monospace', fontSize: '9px', borderRadius: '4px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Custom Legend */}
                    <div className="space-y-1 mt-1 pb-1 border-t border-zinc-100 pt-2">
                      {workloadStateChartData.map(d => (
                        <div key={d.name} className="flex justify-between items-center text-[9px] font-mono">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                            <span className="text-zinc-500">{d.name}</span>
                          </span>
                          <span className="font-bold text-zinc-800">{d.value} ({Math.round((d.value / consultantAnalytics.length) * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Grid: detailed Roster list & selected consultant audit drawer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Roster Table */}
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs md:col-span-2">
              <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3">
                <h3 className="font-bold text-xs uppercase text-zinc-800 font-mono">Resource Utilization Registry</h3>
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[8.5px] tracking-wider text-zinc-500">
                    <th className="p-4">Consultant</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-center">Active Load</th>
                    <th className="p-4 text-center">Approved Hours</th>
                    <th className="p-4">Queue State</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150">
                  {consultantAnalytics.map(c => {
                    const isSelected = selectedConsultantId === c.id;
                    return (
                      <tr 
                        key={c.id} 
                        className={`hover:bg-zinc-50/50 transition cursor-pointer ${
                          isSelected ? 'bg-zinc-50 border-l-2 border-l-zinc-950' : ''
                        }`}
                        onClick={() => setSelectedConsultantId(c.id)}
                      >
                        <td className="p-4">
                          <span className="font-bold text-zinc-850 text-xs block">{c.name}</span>
                          <span className="text-[10px] text-zinc-400 block truncate">{c.email}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-1.5 py-0.2 rounded border text-[8.5px] font-bold ${
                            c.type === 'Functional' ? 'bg-zinc-50 text-zinc-650 border-zinc-200' : 'bg-zinc-950 text-white border-zinc-900'
                          }`}>
                            {c.type}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`font-bold text-xs ${c.activeCount >= 5 ? 'text-red-700' : 'text-zinc-800'}`}>
                            {c.activeCount}
                          </span>
                          {c.criticalCount > 0 && (
                            <span className="text-[8px] bg-red-955 text-white font-mono px-1 rounded ml-1 uppercase">{c.criticalCount} crit</span>
                          )}
                        </td>
                        <td className="p-4 text-center font-bold text-zinc-700">{c.hoursApproved} hrs</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold ${
                            c.workloadState === 'Overloaded' ? 'bg-red-50 border-red-200 text-red-700' :
                            c.workloadState === 'Optimal' ? 'bg-emerald-50 border-emerald-250 text-emerald-700' :
                            'bg-zinc-50 border-zinc-200 text-zinc-550'
                          }`}>
                            <span className={`h-1 w-1 rounded-full ${
                              c.workloadState === 'Overloaded' ? 'bg-red-500 animate-pulse' :
                              c.workloadState === 'Optimal' ? 'bg-emerald-500' :
                              'bg-zinc-400'
                            }`}></span>
                            {c.workloadState}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConsultantId(c.id);
                            }}
                            className="px-2 py-1 bg-zinc-950 hover:bg-zinc-800 text-white rounded text-[9px] uppercase tracking-wide cursor-pointer font-bold"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected Consultant detail drawer */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs h-fit space-y-4">
              <div className="border-b border-zinc-150 pb-2.5">
                <h4 className="font-bold text-xs uppercase tracking-wide text-zinc-955 flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-zinc-500" />
                  Resource Queue Audit
                </h4>
              </div>

              {selectedConsultant ? (
                <div className="space-y-4">
                  <div className="bg-zinc-50 border border-zinc-150 rounded-lg p-3 space-y-2">
                    <h5 className="font-bold text-zinc-850 text-xs block">{selectedConsultant.name}</h5>
                    <span className="text-[10px] text-zinc-400 block truncate">{selectedConsultant.email}</span>
                    
                    <div className="grid grid-cols-2 gap-2 text-center pt-2">
                      <div className="bg-white border border-zinc-200 rounded p-2">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase block">Active Tickets</span>
                        <span className="text-sm font-bold text-zinc-800">{selectedConsultant.activeCount}</span>
                      </div>
                      <div className="bg-white border border-zinc-200 rounded p-2">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase block">Approved Hours</span>
                        <span className="text-sm font-bold text-zinc-800">{selectedConsultant.hoursApproved} hrs</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h6 className="font-bold text-[9px] uppercase text-zinc-450 mb-2 tracking-wider">Active Assignments ({selectedConsultant.activeCount})</h6>
                    {selectedConsultant.ticketsList.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-zinc-200 rounded text-zinc-400 font-mono italic">
                        No active assignments on the roster.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {selectedConsultant.ticketsList.map(t => (
                          <div key={t.id} className="border border-zinc-150 hover:bg-zinc-50/50 p-2.5 rounded-lg transition text-[10px] space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-zinc-950 font-mono">{t.ticketNumber || t.id.slice(0, 8)}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                                t.priority === 'Critical' ? 'bg-red-950 text-white animate-pulse' :
                                t.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                                'bg-zinc-100 text-zinc-650'
                              }`}>{t.priority}</span>
                            </div>
                            <h6 className="font-bold text-zinc-800 truncate">{t.title}</h6>
                            <div className="flex justify-between text-[8px] text-zinc-400 border-t border-zinc-100 pt-1 mt-1 font-mono">
                              <span>Module: {t.sapModule}</span>
                              <span className="px-1 bg-zinc-100 rounded text-zinc-550">{t.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400 font-mono border border-dashed border-zinc-200 rounded-lg">
                  Select a consultant from the registry to inspect their active support queue.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB CONTENT B: CUSTOMER SUPPORT UTILIZATION
          ------------------------------------------------------------- */}
      {activeSubTab === 'customers' && (
        <div className="space-y-6">
          {/* Top KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Total Support Hours Logged</span>
                <span className="text-xl font-bold text-zinc-900 mt-1 block">{customerKPIs.totalConsumedHours} hrs</span>
              </div>
              <Building2 className="text-zinc-300" size={24} />
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Average SLA Compliance</span>
                <span className="text-xl font-bold text-emerald-700 mt-1 block flex items-center gap-1">
                  {customerKPIs.complianceRateAvg}%
                  <TrendingUp className="text-emerald-500" size={16} />
                </span>
              </div>
              <Clock className="text-emerald-200" size={24} />
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Top Customer (Approved Hours)</span>
                <span className="text-sm font-bold text-zinc-800 mt-2 block truncate">{customerKPIs.topCustomerName}</span>
              </div>
              <Activity className="text-zinc-300" size={24} />
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Total SLA Breaches</span>
                <span className="text-xl font-bold text-red-750 mt-1 block flex items-center gap-1.5">
                  {customerKPIs.totalBreaches}
                  {customerKPIs.totalBreaches > 0 && (
                    <AlertCircle className="text-red-500 animate-pulse" size={16} />
                  )}
                </span>
              </div>
              <AlertTriangle className="text-red-200" size={24} />
            </div>
          </div>

          {/* Visualizations row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Consumed Hours by Customer Chart */}
            <Card className="border-zinc-200 bg-white">
              <CardHeader className="border-b border-zinc-150 py-3.5 px-4">
                <CardTitle className="text-xs uppercase tracking-wide">Approved Support Hours Consumption</CardTitle>
                <CardDescription className="text-[9.5px]">Approved functional and technical hours consumed by organization.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 px-4 h-64">
                {customerHoursChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-zinc-400 font-mono italic">No data available for the active filters.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={customerHoursChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke={COLORS.gray} fontSize={9} className="font-mono" />
                      <YAxis stroke={COLORS.gray} fontSize={9} className="font-mono" />
                      <RechartsTooltip contentStyle={{ fontFamily: 'monospace', fontSize: '9px', borderRadius: '4px' }} />
                      <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', paddingTop: '10px' }} />
                      <Bar dataKey="Hours Consumed" fill={COLORS.zinc950} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* SLA Breaches Chart */}
            <Card className="border-zinc-200 bg-white">
              <CardHeader className="border-b border-zinc-150 py-3.5 px-4">
                <CardTitle className="text-xs uppercase tracking-wide">SLA Breaches vs Total Tickets</CardTitle>
                <CardDescription className="text-[9.5px]">Audit ticket volume alongside count of SLA violations per client.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 px-4 h-64">
                {customerSLAChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-zinc-400 font-mono italic">No data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={customerSLAChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke={COLORS.gray} fontSize={9} className="font-mono" />
                      <YAxis stroke={COLORS.gray} fontSize={9} className="font-mono" allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ fontFamily: 'monospace', fontSize: '9px', borderRadius: '4px' }} />
                      <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', paddingTop: '10px' }} />
                      <Bar dataKey="Total Tickets" fill={COLORS.zinc300} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="SLA Breaches" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Grid: detailed Client list & selected customer audit drawer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Customer table */}
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs md:col-span-2">
              <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3">
                <h3 className="font-bold text-xs uppercase text-zinc-800 font-mono">Customer Roster Utilization</h3>
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 uppercase font-bold text-[8.5px] tracking-wider text-zinc-500">
                    <th className="p-4">Customer Company</th>
                    <th className="p-4 text-center">Tickets Created</th>
                    <th className="p-4 text-center font-bold">Consumed Hours</th>
                    <th className="p-4 text-center">SLA Breaches</th>
                    <th className="p-4">Top Module</th>
                    <th className="p-4 text-right">SLA Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150">
                  {customerAnalytics.map(c => {
                    const isSelected = selectedOrgName === c.name;
                    return (
                      <tr 
                        key={c.name} 
                        className={`hover:bg-zinc-50/50 transition cursor-pointer ${
                          isSelected ? 'bg-zinc-50 border-l-2 border-l-zinc-950' : ''
                        }`}
                        onClick={() => setSelectedOrgName(c.name)}
                      >
                        <td className="p-4 font-bold text-zinc-850 text-xs">{c.name}</td>
                        <td className="p-4 text-center text-zinc-600 font-semibold">{c.totalTickets}</td>
                        <td className="p-4 text-center font-bold text-zinc-800">{Number(c.consumedHours.toFixed(1))} hrs</td>
                        <td className="p-4 text-center font-bold text-red-700">{c.breaches}</td>
                        <td className="p-4 font-mono font-bold text-zinc-500 uppercase">{c.topModule}</td>
                        <td className="p-4 text-right font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            c.complianceRate >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            c.complianceRate >= 75 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {c.complianceRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected customer detail drawer */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs h-fit space-y-4">
              <div className="border-b border-zinc-150 pb-2.5">
                <h4 className="font-bold text-xs uppercase tracking-wide text-zinc-955 flex items-center gap-1.5">
                  <Building2 size={14} className="text-zinc-500" />
                  Client Support Audit
                </h4>
              </div>

              {selectedCustomer ? (
                <div className="space-y-4">
                  <div className="bg-zinc-50 border border-zinc-150 rounded-lg p-3 space-y-2">
                    <h5 className="font-bold text-zinc-850 text-xs block">{selectedCustomer.name}</h5>
                    
                    <div className="grid grid-cols-2 gap-2 text-center pt-2">
                      <div className="bg-white border border-zinc-250 rounded p-2">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase block">Total Tickets</span>
                        <span className="text-sm font-bold text-zinc-800">{selectedCustomer.totalTickets}</span>
                      </div>
                      <div className="bg-white border border-zinc-250 rounded p-2">
                        <span className="text-[8px] font-bold text-zinc-400 uppercase block">Consumed Hours</span>
                        <span className="text-sm font-bold text-zinc-800">{Number(selectedCustomer.consumedHours.toFixed(1))} hrs</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h6 className="font-bold text-[9px] uppercase text-zinc-450 mb-2 tracking-wider">Ticket History ({selectedCustomer.totalTickets})</h6>
                    {selectedCustomer.ticketsList.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-zinc-200 rounded text-zinc-400 font-mono italic">
                        No support tickets found.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {selectedCustomer.ticketsList.map(t => {
                          const breached = isTicketBreached(t);
                          return (
                            <div key={t.id} className="border border-zinc-150 hover:bg-zinc-50/50 p-2.5 rounded-lg transition text-[10px] space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-zinc-950 font-mono">{t.ticketNumber || t.id.slice(0, 8)}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                                  breached ? 'bg-red-50 text-red-700 border border-red-150 animate-pulse' : 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                                }`}>
                                  {breached ? 'SLA Breached' : 'SLA Met / OK'}
                                </span>
                              </div>
                              <h6 className="font-bold text-zinc-850 truncate">{t.title}</h6>
                              <div className="flex justify-between text-[8px] text-zinc-400 border-t border-zinc-100 pt-1 mt-1 font-mono">
                                <span>Module: {t.sapModule}</span>
                                <span className="px-1 bg-zinc-100 rounded text-zinc-550">{t.status}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400 font-mono border border-dashed border-zinc-200 rounded-lg">
                  Select a company from the roster list to audit support history and SLA statuses.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
