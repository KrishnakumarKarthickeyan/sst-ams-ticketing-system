'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import Link from 'next/link';
import { BrandedLogo } from '../../../components/ui/BrandedLogo';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import {
  Users, Building2, Ticket, AlertTriangle, Clock, HeartHandshake, 
  Plus, CheckSquare, RefreshCw, Layers, Calendar, BarChart3, TrendingUp, ShieldAlert, BadgeCheck, FileText, CheckCircle2, UserCheck, DollarSign
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

export default function AdminDashboardPage() {
  const { tickets, contracts } = useTickets();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab panel out of the 7 sections
  const [activeTab, setActiveTab] = useState<'platform' | 'contracts' | 'tickets' | 'workload' | 'managers' | 'health' | 'financials'>('platform');

  // Interactive filtering states
  const [selectedManager, setSelectedManager] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState('All');
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');

  // Fetch profiles for role mapping
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('profiles').select('*');
          if (!error && data) {
            setProfiles(data);
          }
        } catch (e) {
          console.error('Error querying profiles:', e);
        }
      }
      setLoading(false);
    };
    fetchProfiles();
  }, []);

  // Unique filters lists based on real data
  const managersList = useMemo(() => {
    return Array.from(new Set(profiles.filter(p => p.role === 'Manager').map(p => p.full_name || p.email))).sort();
  }, [profiles]);

  const customersList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.organization))).filter(Boolean).sort();
  }, [tickets]);

  const modulesList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.sapModule))).filter(Boolean).sort();
  }, [tickets]);

  const resetFilters = () => {
    setSelectedManager('All');
    setSelectedCustomer('All');
    setSelectedModule('All');
    setSelectedPriority('All');
  };

  // Base filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (selectedManager !== 'All' && t.assignedManager !== selectedManager) return false;
      if (selectedCustomer !== 'All' && t.organization !== selectedCustomer) return false;
      if (selectedModule !== 'All' && t.sapModule !== selectedModule) return false;
      if (selectedPriority !== 'All' && t.priority !== selectedPriority) return false;
      return true;
    });
  }, [tickets, selectedManager, selectedCustomer, selectedModule, selectedPriority]);

  // Color harmony tokens
  const COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7'];
  const PRIORITY_COLORS: Record<string, string> = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#eab308',
    Low: '#71717a'
  };

  // --- 1. GLOBAL PLATFORM OVERVIEW ---
  const customers = useMemo(() => profiles.filter(p => p.role === 'Customer'), [profiles]);
  const managers = useMemo(() => profiles.filter(p => p.role === 'Manager'), [profiles]);
  const consultants = useMemo(() => profiles.filter(p => p.role === 'Consultant'), [profiles]);

  const pendingApprovalsCount = useMemo(() => {
    let count = 0;
    filteredTickets.forEach(t => {
      count += (t.estimates || []).filter(e => e.estimatedHours > 0 && !t.actualHoursLogs?.some(ah => ah.closureRequestId)).length;
      count += (t.actualHoursLogs || []).filter(ah => ah.approvalStatus === 'pending').length;
      count += (t.closureRequests || []).filter(cr => cr.status === 'Pending Manager Approval' || cr.managerApprovalStatus === 'Pending').length;
      count += (t.unlockRequests || []).filter(ur => ur.status === 'Pending').length;
    });
    return count;
  }, [filteredTickets]);

  const globalStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTickets]);

  const globalPriorityData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      counts[t.priority] = (counts[t.priority] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTickets]);

  // --- 2. CUSTOMER CONTRACT OVERVIEW ---
  const contractMetricsList = useMemo(() => {
    return contracts.map(c => {
      const companyTickets = tickets.filter(t => t.organization === c.organizationName);
      
      const approvedHours = companyTickets.reduce((sum, t) => {
        const approvedLogs = (t.actualHoursLogs || []).filter(ah => ah.approvalStatus === 'approved');
        return sum + approvedLogs.reduce((s, ah) => s + ah.actualHours, 0);
      }, 0);

      const remainingHours = Math.max(0, c.totalHours - approvedHours);
      const usagePct = c.totalHours > 0 ? (approvedHours / c.totalHours) * 100 : 0;

      const startDate = new Date(c.startDate);
      const endDate = new Date(c.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const today = new Date();
      let expiryStatus = 'Active';
      if (today > endDate) {
        expiryStatus = 'Expired';
      } else {
        const daysToExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry <= 30) {
          expiryStatus = 'Expiring Soon';
        }
      }

      return {
        ...c,
        approvedHours,
        remainingHours,
        usagePct,
        durationDays,
        expiryStatus
      };
    });
  }, [contracts, tickets]);

  const contractsStatusSummary = useMemo(() => {
    const active = contractMetricsList.filter(c => c.isActive && c.expiryStatus !== 'Expired').length;
    const expiringSoon = contractMetricsList.filter(c => c.isActive && c.expiryStatus === 'Expiring Soon').length;
    const expired = contractMetricsList.filter(c => c.expiryStatus === 'Expired').length;
    const totalContractedHours = contractMetricsList.reduce((sum, c) => sum + c.totalHours, 0);
    const totalUsedHours = contractMetricsList.reduce((sum, c) => sum + c.approvedHours, 0);
    const totalRemainingHours = Math.max(0, totalContractedHours - totalUsedHours);

    return { active, expiringSoon, expired, totalContractedHours, totalUsedHours, totalRemainingHours };
  }, [contractMetricsList]);

  // --- 3. TICKET OPERATIONS OVERVIEW ---
  const ticketAgingBins = useMemo(() => {
    let bin0_2 = 0;
    let bin3_7 = 0;
    let bin8_15 = 0;
    let bin16_30 = 0;
    let bin30Plus = 0;

    const nowTime = Date.now();
    filteredTickets.forEach(t => {
      if (t.status === 'Closed' || t.status === 'Resolved') return;
      const ageDays = (nowTime - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays <= 2) bin0_2++;
      else if (ageDays <= 7) bin3_7++;
      else if (ageDays <= 15) bin8_15++;
      else if (ageDays <= 30) bin16_30++;
      else bin30Plus++;
    });

    return [
      { name: '0-2 Days', value: bin0_2 },
      { name: '3-7 Days', value: bin3_7 },
      { name: '8-15 Days', value: bin8_15 },
      { name: '16-30 Days', value: bin16_30 },
      { name: '30+ Days', value: bin30Plus }
    ];
  }, [filteredTickets]);

  const monthlyVolumeTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap: Record<string, { month: string; Created: number; Closed: number }> = {};

    // Group last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      monthlyMap[label] = { month: label, Created: 0, Closed: 0 };
    }

    filteredTickets.forEach(t => {
      const createdDate = new Date(t.createdAt);
      const createdLabel = `${months[createdDate.getMonth()]} ${createdDate.getFullYear().toString().slice(2)}`;
      if (monthlyMap[createdLabel]) {
        monthlyMap[createdLabel].Created++;
      }
      if (t.closedAt) {
        const closedDate = new Date(t.closedAt);
        const closedLabel = `${months[closedDate.getMonth()]} ${closedDate.getFullYear().toString().slice(2)}`;
        if (monthlyMap[closedLabel]) {
          monthlyMap[closedLabel].Closed++;
        }
      }
    });

    return Object.values(monthlyMap);
  }, [filteredTickets]);

  // --- 4. CONSULTANT WORKLOAD OVERVIEW ---
  const consultantMetricsList = useMemo(() => {
    return consultants.map(cons => {
      const name = cons.full_name || cons.email;
      const consTickets = tickets.filter(t => t.assignedConsultant === name);
      const activeTicketsCount = consTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      const closedTicketsCount = consTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;

      const functionalCount = consTickets.filter(t => t.functionalOrTechnical === 'Functional' || !t.functionalOrTechnical).length;
      const technicalCount = consTickets.filter(t => t.functionalOrTechnical === 'Technical').length;

      const approvedHours = tickets.reduce((sum, t) => {
        const logs = (t.actualHoursLogs || []).filter(ah => ah.consultantId === cons.id && ah.approvalStatus === 'approved');
        return sum + logs.reduce((s, ah) => s + ah.actualHours, 0);
      }, 0);

      let loadStatus: 'Underutilized' | 'Healthy' | 'Overutilized' = 'Healthy';
      if (approvedHours > 150 || activeTicketsCount > 5) {
        loadStatus = 'Overutilized';
      } else if (approvedHours < 80) {
        loadStatus = 'Underutilized';
      }

      return {
        id: cons.id,
        name,
        type: cons.consultant_type || 'Technical',
        activeTicketsCount,
        closedTicketsCount,
        functionalCount,
        technicalCount,
        approvedHours,
        loadStatus
      };
    });
  }, [consultants, tickets]);

  // --- 5. MANAGER PERFORMANCE OVERVIEW ---
  const managerMetricsList = useMemo(() => {
    return managers.map(mgr => {
      const name = mgr.full_name || mgr.email;
      const mgrTickets = tickets.filter(t => t.assignedManager === name);
      const activeTicketsCount = mgrTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      const closedTicketsCount = mgrTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;

      const managedCustomers = Array.from(new Set(mgrTickets.map(t => t.organization))).filter(Boolean);
      const managedConsultants = Array.from(new Set(mgrTickets.map(t => t.assignedConsultant))).filter(Boolean);

      let pendingAudits = 0;
      mgrTickets.forEach(t => {
        pendingAudits += (t.actualHoursLogs || []).filter(ah => ah.approvalStatus === 'pending').length;
        pendingAudits += (t.closureRequests || []).filter(cr => cr.status === 'Pending Manager Approval' || cr.managerApprovalStatus === 'Pending').length;
      });

      const incidents = mgrTickets.filter(t => t.ticketType === 'Incident' || !t.ticketType);
      const breachedCount = incidents.filter(t => {
        if (t.status === 'Closed' || t.status === 'Resolved') return false;
        return t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable' && new Date(t.slaDueAt).getTime() < Date.now();
      }).length;
      const slaCompliance = incidents.length > 0 ? ((incidents.length - breachedCount) / incidents.length) * 100 : 100;

      const rated = mgrTickets.filter(t => t.rating);
      const avgCsat = rated.length > 0 ? rated.reduce((sum, t) => sum + (t.rating?.score || 0), 0) / rated.length : 0;

      return {
        id: mgr.id,
        name,
        customersCount: managedCustomers.length,
        consultantsCount: managedConsultants.length,
        activeTicketsCount,
        closedTicketsCount,
        pendingAudits,
        slaCompliance,
        avgCsat
      };
    });
  }, [managers, tickets]);

  // --- 6. CUSTOMER HEALTH OVERVIEW ---
  const customerMetricsList = useMemo(() => {
    const orgNames = Array.from(new Set([
      ...contracts.map(c => c.organizationName),
      ...tickets.map(t => t.organization)
    ])).filter(Boolean).sort();

    return orgNames.map(org => {
      const orgTickets = tickets.filter(t => t.organization === org);
      const activeContract = contracts.find(c => c.organizationName === org && c.isActive);

      const totalTicketsCount = orgTickets.length;
      const openTicketsCount = orgTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;

      const approvedHours = orgTickets.reduce((sum, t) => {
        const logs = (t.actualHoursLogs || []).filter(ah => ah.approvalStatus === 'approved');
        return sum + logs.reduce((s, ah) => s + ah.actualHours, 0);
      }, 0);

      const contractedHours = activeContract ? activeContract.totalHours : 0;
      const remainingHours = Math.max(0, contractedHours - approvedHours);

      const incidents = orgTickets.filter(t => t.ticketType === 'Incident' || !t.ticketType);
      const slaBreaches = incidents.filter(t => {
        if (t.status === 'Closed' || t.status === 'Resolved') return false;
        return t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable' && new Date(t.slaDueAt).getTime() < Date.now();
      }).length;

      const escalationsCount = orgTickets.filter(t => t.escalationFlag).length;

      const rated = orgTickets.filter(t => t.rating);
      const avgCsat = rated.length > 0 ? rated.reduce((sum, t) => sum + (t.rating?.score || 0), 0) / rated.length : 0;

      return {
        name: org,
        totalTicketsCount,
        openTicketsCount,
        contractedHours,
        approvedHours,
        remainingHours,
        slaBreaches,
        escalationsCount,
        avgCsat
      };
    });
  }, [contracts, tickets]);

  // --- 7. FINANCIAL / BILLING INSIGHTS ---
  const financialsData = useMemo(() => {
    let totalBillable = 0;
    let totalNonBillable = 0;

    const monthlyMap: Record<string, { month: string; billable: number; nonBillable: number }> = {};
    const customerMap: Record<string, number> = {};
    const consultantMap: Record<string, number> = {};

    tickets.forEach(t => {
      (t.actualHoursLogs || []).forEach(ah => {
        if (ah.approvalStatus === 'approved') {
          const hours = ah.actualHours;
          if (ah.billable) {
            totalBillable += hours;
            customerMap[t.organization] = (customerMap[t.organization] || 0) + hours;
            
            const matchingProfile = consultants.find(c => c.id === ah.consultantId);
            const consName = matchingProfile?.full_name || ah.approvedBy || 'Unknown Consultant';
            consultantMap[consName] = (consultantMap[consName] || 0) + hours;
          } else {
            totalNonBillable += hours;
          }

          if (ah.approvedAt) {
            const date = new Date(ah.approvedAt);
            const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (!monthlyMap[key]) {
              monthlyMap[key] = { month: key, billable: 0, nonBillable: 0 };
            }
            if (ah.billable) {
              monthlyMap[key].billable += hours;
            } else {
              monthlyMap[key].nonBillable += hours;
            }
          }
        }
      });
    });

    const monthlyTrend = Object.values(monthlyMap).slice(-6);
    const customerBillable = Object.entries(customerMap).map(([name, value]) => ({ name, value }));
    const consultantBillable = Object.entries(consultantMap).map(([name, value]) => ({ name, value }));

    return {
      totalBillable,
      totalNonBillable,
      monthlyTrend,
      customerBillable,
      consultantBillable
    };
  }, [tickets, consultants]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-zinc-950 font-mono text-xs">
        <div className="text-center space-y-3">
          <span className="animate-spin inline-block w-4 h-4 border border-zinc-955 border-t-transparent rounded-full"></span>
          <p className="tracking-wider">Loading Platform Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black font-mono text-zinc-950 uppercase tracking-tight flex items-center gap-2">
            <span>SUPER ADMIN COMMAND CENTER</span>
            <Badge variant="outline" className="text-[9px] font-bold border-zinc-300 font-mono tracking-wider text-zinc-600 bg-zinc-50 py-0.5">
              GLOBAL PLATFORM ACCESS
            </Badge>
          </h1>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Real-time operations monitor, customer SLAs compliance, contract burn rates, and financial reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/admin/tickets" className="h-9 px-4 inline-flex items-center justify-center bg-zinc-950 hover:bg-zinc-900 text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm">
            Global Service Desk
          </Link>
          <button onClick={() => window.location.reload()} className="h-9 px-3 border border-zinc-200 hover:border-zinc-950 rounded-lg transition-all flex items-center justify-center text-zinc-650 cursor-pointer">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Global Interactive Filters */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <h3 className="font-bold text-[10px] uppercase text-zinc-650 tracking-wider font-mono">Platform-Wide Data Filter Filters</h3>
          <button onClick={resetFilters} className="text-[9px] font-bold text-zinc-500 hover:text-zinc-950 uppercase underline cursor-pointer font-mono">
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px] font-mono">SAP Manager</label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Managers</option>
              {managersList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px] font-mono">Customer Company</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Customers</option>
              {customersList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px] font-mono">SAP Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Modules</option>
              {modulesList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px] font-mono">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs navigation for the 7 panels */}
      <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 flex-wrap gap-1">
        {[
          { id: 'platform', label: 'Platform Summary', icon: <Layers size={13} /> },
          { id: 'contracts', label: 'Contracts', icon: <FileText size={13} /> },
          { id: 'tickets', label: 'Ticket Operations', icon: <Ticket size={13} /> },
          { id: 'workload', label: 'Consultant Workload', icon: <Users size={13} /> },
          { id: 'managers', label: 'Manager Performance', icon: <UserCheck size={13} /> },
          { id: 'health', label: 'Customer Health', icon: <HeartHandshake size={13} /> },
          { id: 'financials', label: 'Financial / Billing', icon: <DollarSign size={13} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-mono ${
              activeTab === tab.id 
                ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        
        {/* PANEL 1: GLOBAL PLATFORM OVERVIEW */}
        {activeTab === 'platform' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">1. Registered Customers</span>
                <div className="mt-2 flex justify-between items-baseline">
                  <span className="text-2xl font-bold font-mono text-zinc-950">{customers.length}</span>
                  <Building2 size={16} className="text-zinc-400" />
                </div>
              </Card>
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">2. Delivery Managers</span>
                <div className="mt-2 flex justify-between items-baseline">
                  <span className="text-2xl font-bold font-mono text-zinc-950">{managers.length}</span>
                  <UserCheck size={16} className="text-zinc-400" />
                </div>
              </Card>
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">3. Support Consultants</span>
                <div className="mt-2 flex justify-between items-baseline">
                  <span className="text-2xl font-bold font-mono text-zinc-950">{consultants.length}</span>
                  <Users size={16} className="text-zinc-400" />
                </div>
              </Card>
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">4. Total Scope Tickets</span>
                <div className="mt-2 flex justify-between items-baseline">
                  <span className="text-2xl font-bold font-mono text-zinc-950">{filteredTickets.length}</span>
                  <Ticket size={16} className="text-zinc-400" />
                </div>
              </Card>
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm border-l-2 border-l-amber-500">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">5. Pending Approvals</span>
                <div className="mt-2 flex justify-between items-baseline">
                  <span className="text-2xl font-bold font-mono text-amber-700">{pendingApprovalsCount}</span>
                  <Clock size={16} className="text-amber-500" />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ticket Status Split */}
              <Card className="border-zinc-200 bg-white p-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">Ticket Pipeline Status split</span>
                <div className="h-64 flex items-center justify-center">
                  {globalStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={globalStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {globalStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                        <Legend wrapperStyle={{ fontSize: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-zinc-400 italic font-mono">No data available yet</span>
                  )}
                </div>
              </Card>

              {/* Priority Distribution */}
              <Card className="border-zinc-200 bg-white p-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">Ticket Priorities split</span>
                <div className="h-64 flex items-center justify-center">
                  {globalPriorityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={globalPriorityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {globalPriorityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                        <Legend wrapperStyle={{ fontSize: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-zinc-400 italic font-mono">No data available yet</span>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* PANEL 2: CUSTOMER CONTRACT OVERVIEW */}
        {activeTab === 'contracts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 text-zinc-950 font-mono">
              <Card className="p-3 bg-white border border-zinc-200">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Active Contracts</span>
                <span className="text-xl font-bold block mt-1">{contractsStatusSummary.active}</span>
              </Card>
              <Card className="p-3 bg-white border border-zinc-200">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Expiring Soon</span>
                <span className="text-xl font-bold text-amber-700 block mt-1">{contractsStatusSummary.expiringSoon}</span>
              </Card>
              <Card className="p-3 bg-white border border-zinc-200">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Expired Contracts</span>
                <span className="text-xl font-bold text-red-650 block mt-1">{contractsStatusSummary.expired}</span>
              </Card>
              <Card className="p-3 bg-white border border-zinc-200">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Total Allocated</span>
                <span className="text-xl font-bold block mt-1">{contractsStatusSummary.totalContractedHours.toFixed(1)}h</span>
              </Card>
              <Card className="p-3 bg-white border border-zinc-200">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Approved Utilized</span>
                <span className="text-xl font-bold text-emerald-700 block mt-1">{contractsStatusSummary.totalUsedHours.toFixed(1)}h</span>
              </Card>
              <Card className="p-3 bg-white border border-zinc-200">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Total Remaining</span>
                <span className="text-xl font-bold text-emerald-700 block mt-1">{contractsStatusSummary.totalRemainingHours.toFixed(1)}h</span>
              </Card>
            </div>

            <Card className="border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="p-3 bg-zinc-50 border-b border-zinc-200">
                <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">Clients Contracts Ledger</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-100 border-b border-zinc-200 text-[9px] font-mono">
                    <TableRow>
                      <TableHead className="py-2.5 px-4 font-bold">Client Organization</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">Contract Type</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">Start Date</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">End Date</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-right">Contracted</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-right">Approved Used</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-right">Remaining</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-[11px]">
                    {contractMetricsList.map(c => (
                      <TableRow key={c.id} className="hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="py-2.5 px-4 font-bold text-zinc-950">{c.organizationName}</TableCell>
                        <TableCell className="py-2.5 px-4 font-semibold text-zinc-650">{c.contractType}</TableCell>
                        <TableCell className="py-2.5 px-4 font-mono">{new Date(c.startDate).toLocaleDateString()}</TableCell>
                        <TableCell className="py-2.5 px-4 font-mono">{new Date(c.endDate).toLocaleDateString()}</TableCell>
                        <TableCell className="py-2.5 px-4 text-right font-mono font-bold">{c.totalHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-zinc-900">{c.approvedHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">{c.remainingHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-2.5 px-4 text-center">
                          <Badge variant="outline" className={`text-[8px] font-mono font-bold ${
                            c.expiryStatus === 'Expired'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : c.expiryStatus === 'Expiring Soon'
                                ? 'bg-amber-50 text-amber-700 border-amber-250 animate-pulse'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {c.expiryStatus.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {contractMetricsList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-zinc-400 font-mono italic">
                          No contracts available yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {/* PANEL 3: TICKET OPERATIONS OVERVIEW */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ticket Aging Buckets */}
              <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100 font-mono">Active Ticket Aging distribution</span>
                <div className="h-64 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketAgingBins} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                      <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                      <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill="#3f3f46" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Monthly Volume Trend */}
              <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100 font-mono">Monthly Tickets volume trend</span>
                <div className="h-64 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyVolumeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="month" stroke="#71717a" fontSize={9} className="font-mono" />
                      <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                      <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Line type="monotone" dataKey="Created" stroke="#18181b" strokeWidth={2} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Closed" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* PANEL 4: CONSULTANT WORKLOAD OVERVIEW */}
        {activeTab === 'workload' && (
          <div className="space-y-6">
            <Card className="border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="p-3 bg-zinc-50 border-b border-zinc-200">
                <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">Consultants Capacity & backlogs ledger</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-100 border-b border-zinc-200 text-[9px] font-mono">
                    <TableRow>
                      <TableHead className="py-2.5 px-4 font-bold">Consultant Name</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">Expertise Type</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Active Backlog</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Functional Tickets</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Technical Tickets</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-right">Approved actual hours</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Utilization Flag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-[11px]">
                    {consultantMetricsList.map(cons => (
                      <TableRow key={cons.id} className="hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="py-2.5 px-4 font-bold text-zinc-950">{cons.name}</TableCell>
                        <TableCell className="py-2.5 px-4 font-semibold text-zinc-650">{cons.type}</TableCell>
                        <TableCell className="py-2.5 px-4 text-center font-bold">{cons.activeTicketsCount}</TableCell>
                        <TableCell className="py-2.5 px-4 text-center text-zinc-500">{cons.functionalCount}</TableCell>
                        <TableCell className="py-2.5 px-4 text-center text-zinc-500">{cons.technicalCount}</TableCell>
                        <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-zinc-900">{cons.approvedHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-2.5 px-4 text-center">
                          <Badge variant="outline" className={`text-[8px] font-mono font-bold ${
                            cons.loadStatus === 'Overutilized'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : cons.loadStatus === 'Underutilized'
                                ? 'bg-amber-50 text-amber-700 border-amber-250 animate-pulse'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {cons.loadStatus.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {consultantMetricsList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-zinc-400 font-mono italic">
                          No consultants available yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {/* PANEL 5: MANAGER PERFORMANCE OVERVIEW */}
        {activeTab === 'managers' && (
          <div className="space-y-6">
            <Card className="border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="p-3 bg-zinc-50 border-b border-zinc-200">
                <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">SAP Delivery Managers Audit metrics</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-100 border-b border-zinc-200 text-[9px] font-mono">
                    <TableRow>
                      <TableHead className="py-2.5 px-4 font-bold">Manager Name</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Managed Accounts</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Consultants Managed</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Active Backlog</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Closed Tickets</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Audits Pending</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-right">SLA Compliance</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">CSAT rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-[11px]">
                    {managerMetricsList.map(mgr => (
                      <TableRow key={mgr.id} className="hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="py-2.5 px-4 font-bold text-zinc-950">{mgr.name}</TableCell>
                        <TableCell className="py-2.5 px-4 text-center font-bold">{mgr.customersCount}</TableCell>
                        <TableCell className="py-2.5 px-4 text-center font-semibold text-zinc-700">{mgr.consultantsCount}</TableCell>
                        <TableCell className="py-2.5 px-4 text-center font-semibold">{mgr.activeTicketsCount}</TableCell>
                        <TableCell className="py-2.5 px-4 text-center text-zinc-500">{mgr.closedTicketsCount}</TableCell>
                        <TableCell className="py-2.5 px-4 text-center font-bold text-amber-700">{mgr.pendingAudits}</TableCell>
                        <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-zinc-900">{mgr.slaCompliance.toFixed(1)}%</TableCell>
                        <TableCell className="py-2.5 px-4 text-center font-bold text-emerald-700">
                          {mgr.avgCsat > 0 ? `${mgr.avgCsat.toFixed(1)} / 5.0` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {managerMetricsList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-zinc-400 font-mono italic">
                          No delivery managers available yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {/* PANEL 6: CUSTOMER HEALTH OVERVIEW */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            <Card className="border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="p-3 bg-zinc-50 border-b border-zinc-200">
                <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">Clients Health Index</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-100 border-b border-zinc-200 text-[9px] font-mono">
                    <TableRow>
                      <TableHead className="py-2.5 px-4 font-bold">Client Organization</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Tickets Scope</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Unresolved Cases</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-right">Contracted Hours</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-right">Approved used</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-right">Remaining</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">SLA Breaches</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Escalations</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-center">Mean CSAT rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-[11px]">
                    {customerMetricsList.map(cust => (
                      <TableRow key={cust.name} className="hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="py-2.5 px-4 font-bold text-zinc-950">{cust.name}</TableCell>
                        <TableCell className="py-2.5 px-4 text-center font-bold">{cust.totalTicketsCount}</TableCell>
                        <TableCell className="py-2.5 px-4 text-center font-semibold text-zinc-700">{cust.openTicketsCount}</TableCell>
                        <TableCell className="py-2.5 px-4 text-right font-mono font-semibold">{cust.contractedHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-zinc-900">{cust.approvedHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">{cust.remainingHours.toFixed(1)}h</TableCell>
                        <TableCell className={`py-2.5 px-4 text-center font-bold ${cust.slaBreaches > 0 ? 'text-red-650' : 'text-zinc-500'}`}>{cust.slaBreaches}</TableCell>
                        <TableCell className={`py-2.5 px-4 text-center font-bold ${cust.escalationsCount > 0 ? 'text-red-650 font-black animate-pulse' : 'text-zinc-500'}`}>{cust.escalationsCount}</TableCell>
                        <TableCell className="py-2.5 px-4 text-center font-bold text-emerald-700">
                          {cust.avgCsat > 0 ? `${cust.avgCsat.toFixed(1)} / 5.0` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {customerMetricsList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-zinc-400 font-mono italic">
                          No client accounts data available yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {/* PANEL 7: FINANCIAL / BILLING INSIGHTS */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-zinc-950 font-mono">
              <Card className="p-4 bg-white border border-zinc-200 text-center">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Approved Billable efforts</span>
                <span className="text-2xl font-black block mt-2 text-emerald-700">{financialsData.totalBillable.toFixed(1)}h</span>
              </Card>
              <Card className="p-4 bg-white border border-zinc-200 text-center">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Approved Non-Billable efforts</span>
                <span className="text-2xl font-black block mt-2 text-zinc-500">{financialsData.totalNonBillable.toFixed(1)}h</span>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monthly billing trend */}
              <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100 font-mono">Monthly approved billable hours trend</span>
                <div className="h-64 mt-1">
                  {financialsData.monthlyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={financialsData.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorBillable" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                        <XAxis dataKey="month" stroke="#71717a" fontSize={9} className="font-mono" />
                        <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                        <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                        <Legend wrapperStyle={{ fontSize: 9 }} />
                        <Area type="monotone" dataKey="billable" name="Billable Hours" stroke="#10b981" fillOpacity={1} fill="url(#colorBillable)" strokeWidth={2} />
                        <Area type="monotone" dataKey="nonBillable" name="Non-Billable" stroke="#71717a" strokeWidth={1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-400 italic font-mono">No data available yet</div>
                  )}
                </div>
              </Card>

              {/* Customer billing breakdown */}
              <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100 font-mono">Customer billable hours distribution</span>
                <div className="h-64 mt-1">
                  {financialsData.customerBillable.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialsData.customerBillable} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={7} className="font-mono" />
                        <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                        <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                        <Bar dataKey="value" fill="#18181b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-400 italic font-mono">No data available yet</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
