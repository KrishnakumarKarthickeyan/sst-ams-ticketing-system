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
import { ManagerWorkloadAnalytics } from '@/components/analytics/manager-workload-analytics';
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
  const { tickets, profiles, contracts } = useTickets();
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
    <div className="space-y-6 text-xs text-ink">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-line pb-4 bg-surface">
        <div>
          <h1 className="type-title text-ink flex items-center gap-2">
            <Activity size={20} className="text-ink-secondary animate-pulse" />
            Workload & Utilization Analytics
          </h1>
          <p className="text-ink-secondary mt-1">Audit support resource balances, track SLA violations, and monitor company hour allocations.</p>
        </div>
      </div>

      {/* Top Canonical Filter Bar */}
      <div className="bg-surface border border-line rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        
        {/* Sub-tab Switcher */}
        <div className="flex bg-surface-subtle p-0.5 rounded border border-line w-full md:w-auto shrink-0">
          <button
            onClick={() => { setActiveSubTab('consultants'); setSelectedConsultantId(null); }}
            className={`flex-1 md:flex-none px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'consultants' ? 'bg-surface text-ink shadow-xs' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <Users size={12} />
            Resource Workloads
          </button>
          <button
            onClick={() => { setActiveSubTab('customers'); setSelectedOrgName(null); }}
            className={`flex-1 md:flex-none px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'customers' ? 'bg-surface text-ink shadow-xs' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <Building2 size={12} />
            Customer Utilization
          </button>
        </div>

        {/* Global filter controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Timeframe Filter */}
          <div className="flex bg-surface-muted border border-line rounded-lg p-1 items-center gap-1 w-full sm:w-auto">
            <Calendar size={11} className="text-ink-muted ml-1.5" />
            {(['All', '30', '90', 'YTD'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded cursor-pointer transition ${
                  timeframe === t ? 'bg-ink text-white' : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {t === 'All' ? 'All' : t === 'YTD' ? 'YTD' : `${t}d`}
              </button>
            ))}
          </div>

          {/* SAP Module Filter */}
          <div className="flex items-center gap-1.5 bg-surface-muted border border-line rounded-lg px-2.5 py-1.5 w-full sm:w-auto max-w-xs">
            <Filter size={11} className="text-ink-muted" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold uppercase focus:outline-none cursor-pointer w-full"
            >
              <option value="All">All Modules</option>
              {modulesDropdownOptions.map(mod => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
          </div>

          {/* Customer / Company Filter */}
          <div className="flex items-center gap-1.5 bg-surface-muted border border-line rounded-lg px-2.5 py-1.5 w-full sm:w-auto max-w-xs">
            <Building2 size={11} className="text-ink-muted" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold uppercase focus:outline-none cursor-pointer w-full truncate"
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
        <ManagerWorkloadAnalytics section="consultants" tickets={filteredTickets} profiles={profiles} contracts={contracts} now={Date.now()} />
      )}

      {activeSubTab === 'customers' && (
        <ManagerWorkloadAnalytics section="customers" tickets={filteredTickets} profiles={profiles} contracts={contracts} now={Date.now()} />
      )}

    </div>
  );
}
