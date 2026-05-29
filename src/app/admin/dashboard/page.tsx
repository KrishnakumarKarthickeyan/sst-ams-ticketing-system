'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import {
  Users, Building2, Ticket, AlertTriangle, Clock, HeartHandshake, 
  Plus, CheckSquare, RefreshCw, Layers, Calendar, BarChart3
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';

export default function AdminDashboardPage() {
  const { tickets, contracts } = useTickets();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State for the 4 metrics panels
  const [activePanel, setActivePanel] = useState<'business' | 'today' | 'monthly' | 'pending'>('business');

  // Filtering State
  const [selectedManager, setSelectedManager] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState('All');
  const [selectedConsultant, setSelectedConsultant] = useState('All');
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Fetch directory profiles for filtering and counts
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
      } else {
        // Fallback profiles
        setProfiles([
          { id: 'mgr-1', full_name: 'Alexander Sterling', role: 'Manager', is_active: true },
          { id: 'mgr-2', full_name: 'Keerthana Rajan', role: 'Manager', is_active: true },
          { id: 'cons-1', full_name: 'Priya Raman', role: 'Consultant', is_active: true },
          { id: 'cons-2', full_name: 'Arjun Mehta', role: 'Consultant', is_active: true },
          { id: 'cons-3', full_name: 'Rajesh Kumar', role: 'Consultant', is_active: true },
          { id: 'cust-1', full_name: 'Apex Contact', role: 'Customer', is_active: true }
        ]);
      }
      setLoading(false);
    };
    fetchProfiles();
  }, []);

  // Dropdown lists
  const managersList = useMemo(() => {
    return Array.from(new Set(profiles.filter(p => p.role === 'Manager').map(p => p.full_name || p.email))).sort();
  }, [profiles]);

  const consultantsList = useMemo(() => {
    return Array.from(new Set(profiles.filter(p => p.role === 'Consultant').map(p => p.full_name || p.email))).sort();
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
    setSelectedConsultant('All');
    setSelectedModule('All');
    setSelectedPriority('All');
    setSelectedStatus('All');
  };

  // Filtered Tickets memo
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (selectedManager !== 'All' && t.assignedManager !== selectedManager) return false;
      if (selectedCustomer !== 'All' && t.organization !== selectedCustomer) return false;
      if (selectedConsultant !== 'All' && t.assignedConsultant !== selectedConsultant) return false;
      if (selectedModule !== 'All' && t.sapModule !== selectedModule) return false;
      if (selectedPriority !== 'All' && t.priority !== selectedPriority) return false;
      if (selectedStatus !== 'All' && t.status !== selectedStatus) return false;
      return true;
    });
  }, [tickets, selectedManager, selectedCustomer, selectedConsultant, selectedModule, selectedPriority, selectedStatus]);

  // Calculations based on filtered list
  const totalTickets = filteredTickets.length;
  const newTickets = filteredTickets.filter(t => t.status === 'New').length;
  const inProgressTickets = filteredTickets.filter(t => t.status === 'In Progress').length;
  const resolvedTickets = filteredTickets.filter(t => t.status === 'Resolved').length;
  const closedTickets = filteredTickets.filter(t => t.status === 'Closed').length;
  const criticalTickets = filteredTickets.filter(t => t.priority === 'Critical').length;
  const escalatedTickets = filteredTickets.filter(t => t.escalationFlag).length;

  const now = Date.now();
  const breachedCount = filteredTickets.filter(t => {
    if (t.status === 'Closed' || t.status === 'Resolved') return false;
    return t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable' && new Date(t.slaDueAt).getTime() < now;
  }).length;

  const activeContracts = contracts.filter(c => c.isActive).length;

  // Average response calculation
  const respondedTickets = filteredTickets.filter(t => t.comments && t.comments.some(c => c.authorRole !== 'Customer'));
  let totalResponseTimeMs = 0;
  respondedTickets.forEach(t => {
    const firstResponse = t.comments.find(c => c.authorRole !== 'Customer');
    if (firstResponse) {
      totalResponseTimeMs += new Date(firstResponse.createdAt).getTime() - new Date(t.createdAt).getTime();
    }
  });
  const avgResponseHours = respondedTickets.length > 0
    ? (totalResponseTimeMs / (1000 * 60 * 60) / respondedTickets.length).toFixed(1)
    : '0';

  // CSAT rating
  const ratedTickets = filteredTickets.filter(t => t.rating);
  const avgCsat = ratedTickets.length > 0
    ? (ratedTickets.reduce((acc, t) => acc + (t.rating?.score || 0), 0) / ratedTickets.length).toFixed(1)
    : '5.0';

  // Logged Efforts calculations
  const allEfforts = filteredTickets.flatMap(t => t.efforts || []);
  const totalHours = allEfforts.reduce((sum, e) => sum + (e.hoursLogged || e.hoursWorked || 0), 0);
  const billableHours = allEfforts.filter(e => e.billable).reduce((sum, e) => sum + (e.hoursLogged || e.hoursWorked || 0), 0);
  const nonBillableHours = totalHours - billableHours;

  // Monthly burn metrics (estimated totals vs actuals)
  const totalEstimatedCapacity = contracts.reduce((acc, c) => acc + (c.totalHours || 0), 0);
  const totalUsedCapacity = contracts.reduce((acc, c) => acc + (c.usedHours || 0), 0);
  const burnRatePct = totalEstimatedCapacity > 0 ? Math.round((totalUsedCapacity / totalEstimatedCapacity) * 100) : 0;

  // Today's metrics (created at, closed at, escalated today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const createdToday = filteredTickets.filter(t => new Date(t.createdAt).getTime() >= todayStart.getTime()).length;
  const closedToday = filteredTickets.filter(t => t.closedAt && new Date(t.closedAt).getTime() >= todayStart.getTime()).length;
  const escalatedToday = filteredTickets.flatMap(t => t.escalations || [])
    .filter(esc => new Date(esc.createdAt).getTime() >= todayStart.getTime()).length;

  const newAccountsToday = profiles.filter(p => new Date(p.created_at || p.createdAt || 0).getTime() >= todayStart.getTime()).length;

  // Hour estimates pending manager approvals
  const pendingHourEstimates = filteredTickets.flatMap(t => t.hourEstimates || [])
    .filter(est => est.status === 'Submitted').length;

  // Reopen requested checks
  const reopenRequestedCount = filteredTickets.filter(t => t.status === 'Reopen Requested').length;

  // OSS / Raised to SAP count
  const raisedToSapCount = filteredTickets.filter(t => t.raisedToSap).length;

  // --- Visual Charts Data Formulation ---
  
  // 1. Status distribution
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTickets]);

  const COLORS = ['#18181b', '#27272a', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5'];

  // 2. Priorities distribution
  const priorityChartData = useMemo(() => {
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    return priorities.map(p => ({
      priority: p,
      Tickets: filteredTickets.filter(t => t.priority === p).length
    }));
  }, [filteredTickets]);

  // 3. Module distribution
  const moduleChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      counts[t.sapModule] = (counts[t.sapModule] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([module, count]) => ({ module, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredTickets]);

  // 4. Managers performance workload
  const managerChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      if (t.assignedManager) {
        counts[t.assignedManager] = (counts[t.assignedManager] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([manager, tickets]) => ({ manager, tickets }));
  }, [filteredTickets]);

  // 5. Effort history trends (by date)
  const effortsTrendData = useMemo(() => {
    const dailyMap: Record<string, { date: string; billable: number; nonBillable: number }> = {};
    filteredTickets.forEach(t => {
      (t.efforts || []).forEach(e => {
        const dateStr = e.workDate || (e.createdAt ? e.createdAt.split('T')[0] : '');
        if (!dateStr) return;
        const shortDate = dateStr.slice(5); // MM-DD format
        if (!dailyMap[shortDate]) {
          dailyMap[shortDate] = { date: shortDate, billable: 0, nonBillable: 0 };
        }
        const hours = Number(e.hoursLogged || e.hoursWorked || 0);
        if (e.billable) {
          dailyMap[shortDate].billable += hours;
        } else {
          dailyMap[shortDate].nonBillable += hours;
        }
      });
    });
    return Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7); // Last 7 active days
  }, [filteredTickets]);

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* Top Banner Control Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4 bg-white">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-tight text-zinc-950 font-mono">Super Admin Dashboard</h1>
          <p className="text-zinc-500 mt-1">Global operations cockpit, SLA compliance telemetry, and capacity performance index.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/tickets" className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider transition">
            Global Service Desk
          </Link>
          <button 
            onClick={() => window.location.reload()} 
            className="p-1.5 border border-zinc-200 hover:bg-zinc-50 rounded transition text-zinc-650 cursor-pointer"
            title="Force refresh database sync"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Global Interactive Filters Section */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <h3 className="font-bold text-[10px] uppercase text-zinc-650 tracking-wider">Interactive Filter Controls</h3>
          <button 
            onClick={resetFilters}
            className="text-[9px] font-bold text-zinc-500 hover:text-zinc-950 uppercase underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[9px]">SAP Manager</label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Managers</option>
              {managersList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[9px]">Customer Company</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Customers</option>
              {customersList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[9px]">Consultant</label>
            <select
              value={selectedConsultant}
              onChange={(e) => setSelectedConsultant(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Consultants</option>
              {consultantsList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[9px]">SAP Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Modules</option>
              {modulesList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[9px]">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[9px]">Ticket Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
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
              <option value="Request for Closure">Request for Closure</option>
              <option value="Reopen Requested">Reopen Requested</option>
            </select>
          </div>
        </div>
      </div>

      {/* The 4 Analytics Panel Toggles */}
      <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 w-fit">
        {[
          { id: 'business', label: 'Global Business metrics', icon: <Building2 size={13} /> },
          { id: 'today', label: "Today's Operations", icon: <Calendar size={13} /> },
          { id: 'monthly', label: 'Monthly Performance', icon: <BarChart3 size={13} /> },
          { id: 'pending', label: 'Pending Approvals & Work', icon: <CheckSquare size={13} /> }
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setActivePanel(p.id as any)}
            className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 cursor-pointer ${
              activePanel === p.id 
                ? 'bg-white text-zinc-955 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>

      {/* Dynamic Display Grid based on active panel toggle */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {activePanel === 'business' && (
          <>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Total Clients / Customers</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-950">{profiles.filter(p => p.role === 'Customer').length}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">({profiles.filter(p => p.role === 'Customer' && p.is_active).length} Active)</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">SAP Managers Registry</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-950">{profiles.filter(p => p.role === 'Manager').length}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Platform administrators</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Active SAP Consultants</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-950">{profiles.filter(p => p.role === 'Consultant').length}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Primary delivery resource pool</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Managed Tickets (Filtered)</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-950">{totalTickets}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Across active module categories</span>
              </div>
            </div>
          </>
        )}

        {activePanel === 'today' && (
          <>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Tickets Created Today</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-950">{createdToday}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">New issues submitted today</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Tickets Closed Today</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-emerald-700">{closedToday}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Resolved cycles completed</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Escalations Raised Today</span>
              <div className="mt-3">
                <span className={`text-2xl font-bold ${escalatedToday > 0 ? 'text-red-750' : 'text-zinc-950'}`}>{escalatedToday}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">High operational priority flags</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Today's Logged Effort</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-950">
                  {filteredTickets.flatMap(t => t.efforts || [])
                    .filter(e => new Date(e.createdAt).getTime() >= todayStart.getTime())
                    .reduce((sum, e) => sum + (e.hoursLogged || e.hoursWorked || 0), 0).toFixed(1)} hrs
                </span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Consultant efforts logs approved</span>
              </div>
            </div>
          </>
        )}

        {activePanel === 'monthly' && (
          <>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">AMS Budget Burn Rate</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-950">{burnRatePct}%</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">{totalUsedCapacity}h of {totalEstimatedCapacity}h contracts</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Billable Hours logged</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-emerald-700">{billableHours.toFixed(1)} hrs</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Approved timesheet hours logged</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Average SLA Adherence</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-950">
                  {totalTickets > 0 ? (((totalTickets - breachedCount) / totalTickets) * 100).toFixed(0) : '100'}%
                </span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">SLA Target threshold: &gt; 85%</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Average CSAT rating</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-950">{avgCsat} / 5.0</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">({ratedTickets.length} Customer reviews)</span>
              </div>
            </div>
          </>
        )}

        {activePanel === 'pending' && (
          <>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Unassigned Backlog</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-950">
                  {filteredTickets.filter(t => t.status === 'New' || !t.assignedConsultant).length}
                </span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Tickets awaiting workload routing</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Estimates Awaiting Approval</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-amber-700">{pendingHourEstimates}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Awaiting manager hours quote review</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Reopen Ticket Requests</span>
              <div className="mt-3">
                <span className={`text-2xl font-bold ${reopenRequestedCount > 0 ? 'text-red-750' : 'text-zinc-950'}`}>
                  {reopenRequestedCount}
                </span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Awaiting operational re-verification</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Raised to SAP / OSS</span>
              <div className="mt-3">
                <span className="text-2xl font-bold text-zinc-950">{raisedToSapCount}</span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">External product vendor tickets</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Critical SLA alerts banner */}
      {(breachedCount > 0 || criticalTickets > 0 || escalatedTickets > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {breachedCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between text-red-900">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-650" />
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  SLA Breached Tickets: {breachedCount} Active
                </span>
              </div>
              <Link href="/admin/tickets?filter=Breached" className="font-bold underline text-[9px] hover:text-red-750">
                Inspect Queue
              </Link>
            </div>
          )}

          {criticalTickets > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600" />
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  Critical Priority: {criticalTickets} Active
                </span>
              </div>
              <span className="text-[9px] text-amber-700 font-bold">Immediate attention required</span>
            </div>
          )}

          {escalatedTickets > 0 && (
            <div className="bg-zinc-900 border border-zinc-900 rounded-lg p-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500 animate-pulse" />
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  Escalated Alerts: {escalatedTickets} Active
                </span>
              </div>
              <Link href="/admin/tickets?filter=Escalated" className="font-bold text-red-400 hover:underline text-[9px]">
                Resolve Alerts
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Visual Analytics Charts Roster using Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Priority distribution chart */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-2">
          <h3 className="font-bold text-xs uppercase text-zinc-950 font-mono flex items-center gap-1.5 border-b border-zinc-100 pb-2">
            <BarChart3 size={14} className="text-zinc-500" />
            Incidents Priority distribution
          </h3>
          <div className="h-64 w-full pt-2">
            {totalTickets === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-450 italic">No tickets in pipeline.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="priority" stroke="#888" fontSize={9} tickLine={false} />
                  <YAxis stroke="#888" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ fontFamily: 'monospace', fontSize: '10px' }} />
                  <Bar dataKey="Tickets" fill="#18181b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Effort hour trends */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-2">
          <h3 className="font-bold text-xs uppercase text-zinc-955 font-mono flex items-center gap-1.5 border-b border-zinc-100 pb-2">
            <Clock size={14} className="text-zinc-500" />
            Efforts Logged trend (Last 7 active days)
          </h3>
          <div className="h-64 w-full pt-2">
            {effortsTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-450 italic">No approved efforts logs recorded.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={effortsTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="date" stroke="#888" fontSize={9} tickLine={false} />
                  <YAxis stroke="#888" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ fontFamily: 'monospace', fontSize: '10px' }} />
                  <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace' }} />
                  <Area type="monotone" dataKey="billable" name="Billable Hours" stroke="#18181b" fill="#f4f4f5" strokeWidth={2} />
                  <Area type="monotone" dataKey="nonBillable" name="Non-Billable" stroke="#71717a" fill="#fafafa" strokeWidth={1} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status splits */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-2">
          <h3 className="font-bold text-xs uppercase text-zinc-950 font-mono flex items-center gap-1.5 border-b border-zinc-100 pb-2">
            <Layers size={14} className="text-zinc-500" />
            Global Ticket Pipeline Status Splits
          </h3>
          <div className="h-64 w-full pt-2 flex flex-col sm:flex-row items-center justify-around">
            {statusChartData.length === 0 ? (
              <div className="text-zinc-450 italic">No tickets found.</div>
            ) : (
              <>
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontFamily: 'monospace', fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-1.5 max-h-52 overflow-y-auto pl-4 border-l border-zinc-100">
                  {statusChartData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span className="font-bold text-zinc-700 truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="font-mono text-zinc-500">{item.value} ({Math.round((item.value / totalTickets) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Manager Assignments Workload */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-2">
          <h3 className="font-bold text-xs uppercase text-zinc-950 font-mono flex items-center gap-1.5 border-b border-zinc-100 pb-2">
            <Users size={14} className="text-zinc-500" />
            Manager Workload & Responsibilities
          </h3>
          <div className="h-64 w-full pt-2">
            {managerChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-450 italic">No tickets currently assigned to Managers.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={managerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="manager" stroke="#888" fontSize={9} tickLine={false} />
                  <YAxis stroke="#888" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ fontFamily: 'monospace', fontSize: '10px' }} />
                  <Bar dataKey="tickets" fill="#27272a" name="Assigned Tickets" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
