'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { 
  Users, UserCheck, AlertTriangle, Clock, Search, ShieldCheck, 
  ChevronRight, Activity, BookOpen, BarChart3, TrendingUp, Grid
} from 'lucide-react';
import { toast } from 'sonner';

interface ConsultantWorkload {
  id: string;
  name: string;
  email: string;
  consultantType: 'Functional' | 'Technical';
  roleTitle: string;
  sapModules: string[];
  skills: string;
  activeTicketsCount: number;
  criticalTicketsCount: number;
  escalatedTicketsCount: number;
  totalHoursLogged: number;
  billableHours: number;
  assignedTickets: { id: string; title: string; priority: string; status: string; sapModule: string }[];
}

export default function AdminConsultantsPage() {
  const { user } = useAuth();
  const [consultants, setConsultants] = useState<ConsultantWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Functional' | 'Technical'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Underutilized' | 'Optimal' | 'Overloaded'>('All');

  // Selected consultant for details drawer
  const [selectedConsultant, setSelectedConsultant] = useState<ConsultantWorkload | null>(null);

  const fetchConsultantsData = async () => {
    setLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      // Local storage/mock fallback
      const stored = localStorage.getItem('sst_admin_consultants');
      if (stored) {
        setConsultants(JSON.parse(stored));
      } else {
        const mockList: ConsultantWorkload[] = [
          {
            id: 'cons-1',
            name: 'Priya Raman',
            email: 'priya@assist360.com',
            consultantType: 'Functional',
            roleTitle: 'Senior FICO Consultant',
            sapModules: ['FICO', 'TRM'],
            skills: 'SAP General Ledger, Asset Accounting, Treasury',
            activeTicketsCount: 4,
            criticalTicketsCount: 1,
            escalatedTicketsCount: 1,
            totalHoursLogged: 120,
            billableHours: 95,
            assignedTickets: [
              { id: 'AS360-FI-1001', title: 'Asset Depreciation Run Failure', priority: 'High', status: 'In Progress', sapModule: 'FICO' },
              { id: 'AS360-FI-1002', title: 'Bank Reconciliation Match Error', priority: 'Medium', status: 'In Progress', sapModule: 'FICO' },
              { id: 'AS360-TR-1001', title: 'Treasury Post-processing Failure', priority: 'Critical', status: 'Request for Closure', sapModule: 'FICO' }
            ]
          },
          {
            id: 'cons-2',
            name: 'Arjun Mehta',
            email: 'arjun@assist360.com',
            consultantType: 'Technical',
            roleTitle: 'Lead ABAP Architect',
            sapModules: ['ABAP', 'BASIS'],
            skills: 'ABAP OO, RFC, IDocs, Performance Tuning',
            activeTicketsCount: 1,
            criticalTicketsCount: 0,
            escalatedTicketsCount: 0,
            totalHoursLogged: 45,
            billableHours: 40,
            assignedTickets: [
              { id: 'AS360-ABAP-1001', title: 'Optimize Custom Sales Report', priority: 'Low', status: 'In Progress', sapModule: 'ABAP' }
            ]
          },
          {
            id: 'cons-3',
            name: 'Rajesh Kumar',
            email: 'rajesh@assist360.com',
            consultantType: 'Functional',
            roleTitle: 'SAP Logistics Specialist',
            sapModules: ['MM', 'SD'],
            skills: 'Inventory Management, Pricing Procedures',
            activeTicketsCount: 6,
            criticalTicketsCount: 2,
            escalatedTicketsCount: 1,
            totalHoursLogged: 165,
            billableHours: 150,
            assignedTickets: [
              { id: 'AS360-MM-1001', title: 'PO Output Type Trigger Error', priority: 'High', status: 'In Progress', sapModule: 'MM' },
              { id: 'AS360-SD-1002', title: 'Billing Document Posting Block', priority: 'Critical', status: 'In Progress', sapModule: 'SD' }
            ]
          }
        ];
        setConsultants(mockList);
        localStorage.setItem('sst_admin_consultants', JSON.stringify(mockList));
      }
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch profiles where role is Consultant
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'Consultant');

      if (profErr) throw profErr;

      // 2. Fetch active ticket assignments
      const { data: assignments, error: asgErr } = await supabase
        .from('ticket_assignments')
        .select('*, tickets(*)');

      if (asgErr) throw asgErr;

      // 3. Fetch efforts logs to calculate hours
      const { data: efforts, error: effErr } = await supabase
        .from('ticket_efforts')
        .select('*');

      if (effErr) throw effErr;

      // 4. Map and synthesize metrics
      const list: ConsultantWorkload[] = (profiles || []).map(p => {
        // Find tickets where they are assigned (either via primary or via assignment)
        const myAssignments = (assignments || []).filter(a => a.consultant_id === p.id && a.active);
        const assignedTicketsList = myAssignments.map(asg => {
          const t = asg.tickets;
          return {
            id: t.id,
            title: t.title,
            priority: t.priority,
            status: t.status,
            sapModule: t.sap_module
          };
        });

        // Also check if any tickets have this consultant as the primary assigned_consultant_id but not in assignments table
        const myPrimaryTickets = (assignments || []).filter(a => a.tickets && a.tickets.assigned_consultant_id === p.id && a.active);
        
        // Remove duplicates if any
        const combinedTickets = Array.from(new Map([...assignedTicketsList].map(t => [t.id, t])).values());

        const activeTickets = combinedTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
        const critical = activeTickets.filter(t => t.priority === 'Critical' || t.priority === 'High');
        
        // Count escalations (check if ticket has escalation flag active)
        const escalated = (assignments || []).filter(a => a.consultant_id === p.id && a.active && a.tickets && a.tickets.escalation_flag).length;

        // Calculate hours
        const myEfforts = (efforts || []).filter(e => e.consultant_id === p.id && e.status === 'Approved');
        const totalHours = myEfforts.reduce((acc, curr) => acc + Number(curr.hours_logged || 0), 0);
        const billableHours = myEfforts.filter(e => e.billable).reduce((acc, curr) => acc + Number(curr.hours_logged || 0), 0);

        return {
          id: p.id,
          name: p.full_name || 'SAP Consultant',
          email: p.email,
          consultantType: (p.consultant_type as 'Functional' | 'Technical') || 'Functional',
          roleTitle: p.role_title || `${p.consultant_type || 'SAP'} Consultant`,
          sapModules: p.sap_modules || [],
          skills: p.skills || 'SAP Consultant',
          activeTicketsCount: activeTickets.length,
          criticalTicketsCount: critical.length,
          escalatedTicketsCount: escalated,
          totalHoursLogged: totalHours,
          billableHours,
          assignedTickets: combinedTickets
        };
      });

      setConsultants(list);
    } catch (err: any) {
      console.error('Error fetching consultant workloads:', err);
      toast.error(`Query failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultantsData();
  }, []);

  const getWorkloadStatus = (c: ConsultantWorkload) => {
    if (c.activeTicketsCount >= 5 || c.escalatedTicketsCount > 0) {
      return 'Overloaded';
    } else if (c.activeTicketsCount >= 2) {
      return 'Optimal';
    } else {
      return 'Underutilized';
    }
  };

  // Filters application
  const filteredList = consultants.filter(c => {
    const status = getWorkloadStatus(c);
    if (typeFilter !== 'All' && c.consultantType !== typeFilter) return false;
    if (statusFilter !== 'All' && status !== statusFilter) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.roleTitle.toLowerCase().includes(q) ||
        c.sapModules.join(' ').toLowerCase().includes(q) ||
        c.skills.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate summary counts
  const totalCount = consultants.length;
  const underutilizedCount = consultants.filter(c => getWorkloadStatus(c) === 'Underutilized').length;
  const optimalCount = consultants.filter(c => getWorkloadStatus(c) === 'Optimal').length;
  const overloadedCount = consultants.filter(c => getWorkloadStatus(c) === 'Overloaded').length;

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4 bg-white">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-tight text-zinc-955 font-mono">
            Consultant Workload Analytics
          </h1>
          <p className="text-zinc-500 mt-1">Audit active task allocation, balance ticket queues, and analyze capacity utilization.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Total Roster</span>
            <span className="text-xl font-bold text-zinc-900 mt-1 block">{totalCount}</span>
          </div>
          <Users className="text-zinc-300" size={24} />
        </div>

        <div className="bg-white border border-zinc-200 rounded p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Underutilized</span>
            <span className="text-xl font-bold text-zinc-700 mt-1 block flex items-center gap-2">
              {underutilizedCount}
              <span className="h-2 w-2 rounded-full bg-zinc-300"></span>
            </span>
          </div>
          <Activity className="text-zinc-300" size={24} />
        </div>

        <div className="bg-white border border-zinc-200 rounded p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Optimal</span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block flex items-center gap-2">
              {optimalCount}
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
          </div>
          <UserCheck className="text-emerald-250" size={24} />
        </div>

        <div className="bg-white border border-zinc-200 rounded p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase block">Overloaded</span>
            <span className="text-xl font-bold text-red-700 mt-1 block flex items-center gap-2">
              {overloadedCount}
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            </span>
          </div>
          <AlertTriangle className="text-red-200" size={24} />
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search consultant, module, skill..."
            className="w-full bg-white border border-zinc-200 rounded pl-9 pr-4 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Type Filter */}
          <div className="flex bg-zinc-100 p-0.5 rounded border border-zinc-250">
            {(['All', 'Functional', 'Technical'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                  typeFilter === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex bg-zinc-100 p-0.5 rounded border border-zinc-250">
            {(['All', 'Underutilized', 'Optimal', 'Overloaded'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                  statusFilter === s ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cards List */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 text-center py-12 text-zinc-400 font-mono">
                Querying resource roster from database...
              </div>
            ) : filteredList.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-zinc-400 font-mono">
                No consultants found matching the active search parameters.
              </div>
            ) : (
              filteredList.map((c) => {
                const status = getWorkloadStatus(c);
                const isSelected = selectedConsultant?.id === c.id;
                
                return (
                  <div 
                    key={c.id}
                    onClick={() => setSelectedConsultant(c)}
                    className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-50/50' : 'border-zinc-200'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between border-b border-zinc-100 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <h3 className="font-bold text-zinc-800 text-xs line-clamp-1">{c.name}</h3>
                            <span className="text-[10px] text-zinc-400 font-mono line-clamp-1">{c.roleTitle}</span>
                          </div>
                        </div>

                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                          c.consultantType === 'Functional' 
                            ? 'bg-zinc-100 text-zinc-700 border border-zinc-250' 
                            : 'bg-zinc-850 text-white'
                        }`}>
                          {c.consultantType}
                        </span>
                      </div>

                      {/* Workload index indicator */}
                      <div className="flex items-center justify-between mb-3 bg-zinc-50 border border-zinc-150 p-2 rounded">
                        <span className="font-bold text-zinc-500 uppercase text-[9px]">Workload Health:</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                          status === 'Overloaded' ? 'text-red-700' :
                          status === 'Optimal' ? 'text-emerald-700' :
                          'text-zinc-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            status === 'Overloaded' ? 'bg-red-500 animate-pulse' :
                            status === 'Optimal' ? 'bg-emerald-500' :
                            'bg-zinc-400'
                          }`}></span>
                          {status}
                        </span>
                      </div>

                      {/* Module expertise tags */}
                      <div className="space-y-1 mb-4">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase block">Expertise Areas:</span>
                        <div className="flex flex-wrap gap-1">
                          {c.sapModules.map(m => (
                            <span key={m} className="px-1.5 py-0.2 bg-zinc-100 rounded text-[9px] font-bold text-zinc-700 uppercase">
                              {m}
                            </span>
                          ))}
                          {c.sapModules.length === 0 && (
                            <span className="text-zinc-400 text-[10px] font-mono italic">No module assigned</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats summary */}
                    <div className="border-t border-zinc-100 pt-3 flex justify-between text-center mt-auto">
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase block">Active Tickets</span>
                        <span className="text-xs font-bold text-zinc-800">{c.activeTicketsCount}</span>
                      </div>
                      <div className="border-l border-zinc-100 px-3">
                        <span className="text-[9px] text-zinc-400 uppercase block">SLA Risk</span>
                        <span className={`text-xs font-bold ${c.criticalTicketsCount > 0 ? 'text-amber-600 font-bold' : 'text-zinc-800'}`}>
                          {c.criticalTicketsCount}
                        </span>
                      </div>
                      <div className="border-l border-zinc-100 pl-3">
                        <span className="text-[9px] text-zinc-400 uppercase block">Actual Hours</span>
                        <span className="text-xs font-bold text-zinc-800">{c.totalHoursLogged}h</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Consultant Details Drawer */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm h-fit space-y-4">
          <div className="border-b border-zinc-200 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-955 font-mono flex items-center gap-1.5">
              <Grid size={14} className="text-zinc-500" />
              Resource Allocation Audit
            </h2>
            <p className="text-[10px] text-zinc-500 mt-1">Audit active task lists and effort log breakdowns for this consultant.</p>
          </div>

          {selectedConsultant ? (
            <div className="space-y-4">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-sm">
                    {selectedConsultant.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 text-xs">{selectedConsultant.name}</h3>
                    <span className="text-[10px] text-zinc-500 block truncate">{selectedConsultant.email}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase block">Skill Description:</span>
                  <p className="text-zinc-650 leading-relaxed text-[10px] font-sans bg-white border border-zinc-150 p-2 rounded">
                    {selectedConsultant.skills}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="bg-white border border-zinc-150 rounded p-2">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase block">Logged Approved</span>
                    <span className="text-sm font-bold text-zinc-800">{selectedConsultant.totalHoursLogged} hrs</span>
                  </div>
                  <div className="bg-white border border-zinc-150 rounded p-2">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase block">Billability Ratio</span>
                    <span className="text-sm font-bold text-zinc-800">
                      {selectedConsultant.totalHoursLogged > 0 
                        ? `${Math.round((selectedConsultant.billableHours / selectedConsultant.totalHoursLogged) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Task Registry list */}
              <div>
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                  Active Ticket Allocations ({selectedConsultant.activeTicketsCount})
                </h4>
                {selectedConsultant.assignedTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-zinc-200 rounded text-zinc-400 font-mono">
                    No active assignments. Roster is fully clear.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {selectedConsultant.assignedTickets
                      .filter(t => t.status !== 'Closed' && t.status !== 'Resolved')
                      .map((t) => (
                        <div key={t.id} className="border border-zinc-150 rounded p-2 hover:bg-zinc-50 transition-colors flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-900 text-[10px] font-mono">{t.id}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                              t.priority === 'Critical' ? 'bg-red-950 text-white animate-pulse' :
                              t.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                              t.priority === 'Medium' ? 'bg-zinc-100 text-zinc-800' :
                              'bg-zinc-50 text-zinc-600'
                            }`}>
                              {t.priority}
                            </span>
                          </div>
                          <h5 className="font-bold text-zinc-800 text-[10px] line-clamp-1">{t.title}</h5>
                          <div className="flex items-center justify-between text-[8px] text-zinc-400 font-mono mt-0.5 border-t border-zinc-100 pt-1">
                            <span>Module: {t.sapModule}</span>
                            <span className="px-1 py-0.1 bg-zinc-100 text-zinc-650 rounded font-semibold">{t.status}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400 font-mono border border-dashed border-zinc-200 rounded">
              Select a consultant card to inspect active workloads.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
