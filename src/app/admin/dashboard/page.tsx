'use client';

import React from 'react';
import { useTickets } from '../../../context/TicketContext';
import Link from 'next/link';
import {
  Users,
  Building2,
  Ticket,
  AlertTriangle,
  HeartHandshake,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Compass,
  Cpu,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  MessageSquare,
  Plus
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { tickets, contracts } = useTickets();

  // 1. Customer & User stats
  const totalCustomers = 3;
  const activeCustomers = 3;
  const totalUsers = 12;
  const totalConsultants = 3; // Karthik, Rajesh, Amit
  const totalSapManagers = 2; // Marcus, Sarah

  // 2. Ticket Status Breakdown
  const totalTickets = tickets.length;
  const newTickets = tickets.filter(t => t.status === 'New').length;
  const assignedTickets = tickets.filter(t => t.status === 'Assigned').length;
  const inProgressTickets = tickets.filter(t => t.status === 'In Progress').length;
  const waitingForCustomer = tickets.filter(t => t.status === 'Waiting for Customer').length;
  const waitingForInternalTeam = tickets.filter(t => t.status === 'Waiting for Internal Team').length;
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved').length;
  const closedTickets = tickets.filter(t => t.status === 'Closed').length;
  const reopenedTickets = tickets.filter(t => t.status === 'Reopened').length;

  // 3. Priority Breakdown
  const criticalTickets = tickets.filter(t => t.priority === 'Critical').length;
  const escalatedTickets = tickets.filter(t => t.escalationFlag).length;

  // 4. SLA Status Calculations
  const now = Date.now();
  const slaBreachedTicketsList = tickets.filter(t => {
    if (t.status === 'Closed' || t.status === 'Resolved') return false;
    return new Date(t.slaDueAt).getTime() < now;
  });
  const slaBreachedCount = slaBreachedTicketsList.length;

  const slaWarningTicketsList = tickets.filter(t => {
    if (t.status === 'Closed' || t.status === 'Resolved') return false;
    const dueTime = new Date(t.slaDueAt).getTime();
    return dueTime >= now && (dueTime - now) < 12 * 60 * 60 * 1000; // within 12 hours
  });
  const slaWarningCount = slaWarningTicketsList.length;

  const slaHealthyCount = totalTickets - slaBreachedCount - slaWarningCount;
  const slaCompliancePct = totalTickets > 0 ? (((totalTickets - slaBreachedCount) / totalTickets) * 100).toFixed(0) : '100';

  // 5. Avg Response & Resolution Times (mock calculations from real seed data where available)
  const avgResponseTime = "45 mins";
  const avgResolutionTime = "4.2 hours";

  // 6. CSAT Score
  const ratedTickets = tickets.filter(t => t.rating);
  const avgCsat = ratedTickets.length > 0
    ? (ratedTickets.reduce((acc, t) => acc + (t.rating?.score || 0), 0) / ratedTickets.length).toFixed(1)
    : '4.8';

  // 7. Work breakdowns
  const allEfforts = tickets.flatMap(t => t.efforts || []);
  const totalLoggedHours = allEfforts.reduce((sum, e) => sum + e.hoursLogged, 0);
  const totalBillable = allEfforts.filter(e => e.billable).reduce((sum, e) => sum + e.hoursLogged, 0);
  const totalNonBillable = allEfforts.filter(e => !e.billable).reduce((sum, e) => sum + e.hoursLogged, 0);

  // Group module volume
  const moduleCounts: Record<string, number> = {};
  tickets.forEach(t => {
    moduleCounts[t.sapModule] = (moduleCounts[t.sapModule] || 0) + 1;
  });
  const modulesList = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1]);
  const maxModuleVal = Math.max(...Object.values(moduleCounts), 1);

  // Group customer volume
  const customerCounts: Record<string, number> = {};
  tickets.forEach(t => {
    customerCounts[t.organization] = (customerCounts[t.organization] || 0) + 1;
  });
  const customerList = Object.entries(customerCounts).sort((a, b) => b[1] - a[1]);

  // Consultant queue workload
  const consultantWorkload: Record<string, number> = {};
  tickets.forEach(t => {
    if (t.assignedConsultant && t.status !== 'Closed' && t.status !== 'Resolved') {
      consultantWorkload[t.assignedConsultant] = (consultantWorkload[t.assignedConsultant] || 0) + 1;
    }
  });

  // Recent ticket activities list
  const recentActivities = tickets
    .flatMap(t => (t.history || []).map(h => ({ ...h, ticketId: t.id, title: t.title })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Recent Comments list
  const recentComments = tickets
    .flatMap(t => (t.comments || []).map(c => ({ ...c, ticketId: t.id, title: t.title })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Pending assignment tickets list
  const pendingAssignments = tickets.filter(t => t.status === 'New' || !t.assignedConsultant).slice(0, 5);

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase text-zinc-950">Super Admin Command Center</h1>
          <p className="text-zinc-500 mt-1">Global operations audit log, SLA threshold settings, and tenant isolation control panel.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/create-ticket" className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold transition uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <Plus size={12} />
            Create Ticket
          </Link>
          <Link href="/admin/tickets" className="px-3 py-1.5 border border-zinc-200 hover:border-zinc-900 rounded font-semibold transition uppercase tracking-wider text-[10px]">
            Manage Tickets
          </Link>
          <Link href="/admin/assignment-board" className="px-3 py-1.5 border border-zinc-200 hover:border-zinc-900 rounded font-semibold transition uppercase tracking-wider text-[10px]">
            Assignment Board
          </Link>
          <Link href="/admin/reports" className="px-3 py-1.5 border border-zinc-200 hover:border-zinc-900 rounded font-semibold transition uppercase tracking-wider text-[10px]">
            Analytics Reports
          </Link>
        </div>
      </div>

      {/* Basic Metrics Rows */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">Customers</span>
            <Building2 size={14} />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-zinc-950">{totalCustomers}</span>
            <span className="text-[9px] text-zinc-400 block mt-0.5">({activeCustomers} Active)</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">Directory Users</span>
            <Users size={14} />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-zinc-950">{totalUsers}</span>
            <span className="text-[9px] text-zinc-400 block mt-0.5">{totalConsultants} Consultants | {totalSapManagers} Mgrs</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">SLA Compliance</span>
            <CheckCircle2 size={14} className="text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-emerald-700">{slaCompliancePct}%</span>
            <span className="text-[9px] text-zinc-400 block mt-0.5">Target &gt; 85%</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">Avg First Response</span>
            <Clock size={14} />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-zinc-950">{avgResponseTime}</span>
            <span className="text-[9px] text-zinc-400 block mt-0.5">SLA limit: 4h</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">CSAT Score</span>
            <HeartHandshake size={14} />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-zinc-950">{avgCsat} / 5</span>
            <span className="text-[9px] text-zinc-400 block mt-0.5">({ratedTickets.length} Submissions)</span>
          </div>
        </div>
      </div>

      {/* Ticket Status Grid Counters */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-[10px] uppercase text-zinc-700 tracking-wider">Global Ticket Pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-9 gap-3">
          <div className="bg-zinc-50 border border-zinc-200 rounded p-2 text-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Total</div>
            <div className="text-lg font-bold text-zinc-950 mt-1">{totalTickets}</div>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded p-2 text-center border-l-4 border-l-amber-500">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">New</div>
            <div className="text-lg font-bold text-zinc-950 mt-1">{newTickets}</div>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded p-2 text-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Assigned</div>
            <div className="text-lg font-bold text-zinc-950 mt-1">{assignedTickets}</div>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded p-2 text-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">In-Prog</div>
            <div className="text-lg font-bold text-zinc-950 mt-1">{inProgressTickets}</div>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded p-2 text-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Wait Cust</div>
            <div className="text-lg font-bold text-zinc-950 mt-1">{waitingForCustomer}</div>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded p-2 text-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Wait Team</div>
            <div className="text-lg font-bold text-zinc-950 mt-1">{waitingForInternalTeam}</div>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded p-2 text-center border-l-4 border-l-emerald-500">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Resolved</div>
            <div className="text-lg font-bold text-zinc-950 mt-1">{resolvedTickets}</div>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded p-2 text-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Closed</div>
            <div className="text-lg font-bold text-zinc-950 mt-1">{closedTickets}</div>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded p-2 text-center">
            <div className="text-[10px] text-zinc-500 font-bold uppercase">Reopened</div>
            <div className="text-lg font-bold text-zinc-950 mt-1">{reopenedTickets}</div>
          </div>
        </div>
      </div>

      {/* Critical SLA alerts banner */}
      {(slaBreachedCount > 0 || criticalTickets > 0 || escalatedTickets > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between text-red-900">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-650" />
              <span className="font-bold uppercase tracking-wider text-[10px]">
                SLA Breached Tickets: {slaBreachedCount} Active
              </span>
            </div>
            <Link href="/admin/tickets?sla=Breached" className="font-bold underline text-[9px] hover:text-red-750">
              Inspect Queue
            </Link>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="font-bold uppercase tracking-wider text-[10px]">
                SLA Warning Queue: {slaWarningCount} Pending
              </span>
            </div>
            <span className="text-[9px] text-amber-700">Due within 12 hours</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-900 rounded-lg p-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500 animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-[10px]">
                Escalated Tickets: {escalatedTickets} Flagged
              </span>
            </div>
            <Link href="/admin/tickets?escalated=true" className="font-bold text-red-400 hover:underline text-[9px]">
              Resolve Alerts
            </Link>
          </div>
        </div>
      )}

      {/* Charts & Contract Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Module Volumes */}
        <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 flex items-center gap-2">
              <TrendingUp size={14} />
              SAP Modules incident metrics
            </h3>
            <span className="text-[9px] text-zinc-400">Total Count</span>
          </div>
          <div className="space-y-3">
            {modulesList.map(([mod, count]) => {
              const pct = (count / maxModuleVal) * 100;
              return (
                <div key={mod} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-zinc-650">
                    <span className="font-bold">{mod}</span>
                    <span>{count} Tickets</span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-100 rounded overflow-hidden border border-zinc-200">
                    <div
                      className="h-full bg-zinc-950 rounded-r"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Volume & Efforts breakdown */}
        <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 flex items-center gap-2">
              <Building2 size={14} />
              Volume by Customer Org
            </h3>
            <span className="text-[9px] text-zinc-400">Incidents</span>
          </div>
          <div className="space-y-3">
            {customerList.map(([org, count]) => (
              <div key={org} className="flex justify-between items-center py-1 border-b border-zinc-100 last:border-b-0">
                <span className="font-semibold text-zinc-700">{org}</span>
                <span className="font-bold text-zinc-950 bg-zinc-100 px-1.5 py-0.5 rounded text-[10px]">{count}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-100 pt-3 space-y-2">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-500 font-bold">Total Efforts Logged:</span>
              <span className="font-bold text-zinc-950">{totalLoggedHours.toFixed(1)} hrs</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-emerald-700 font-bold">Billable:</span>
              <span className="font-bold text-emerald-800">{totalBillable.toFixed(1)} hrs</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-400 font-bold">Non-Billable:</span>
              <span className="font-bold text-zinc-500">{totalNonBillable.toFixed(1)} hrs</span>
            </div>
          </div>
        </div>

        {/* Resource Workload and SLA Compliance Gauge */}
        <div className="bg-white border border-zinc-200 rounded-lg p-5 flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 mb-3 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <Users size={14} />
              Consultant Queues
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(consultantWorkload).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center py-1.5 border-b border-zinc-50 last:border-b-0">
                  <span className="font-semibold text-zinc-750">{name}</span>
                  <span className={`px-2 py-0.5 font-bold text-[9px] rounded-full text-white ${
                    count > 3 ? 'bg-red-650' : 'bg-zinc-800'
                  }`}>
                    {count} Active
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-emerald-500 flex items-center justify-center font-bold text-[10px] text-emerald-800">
                {slaCompliancePct}%
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-800">SLA Health Score</p>
                <p className="text-[9px] text-zinc-400">Total SLA Breach Rate: {((slaBreachedCount / (totalTickets || 1)) * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Lists Section: Pending Assignments & Recent Comments & SLA warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pending Assignment List */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h3 className="font-bold text-xs uppercase text-zinc-950 flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-amber-500" />
              Unassigned Queue
            </h3>
            <Link href="/admin/assignment-board" className="text-[9px] font-bold underline hover:text-zinc-650">
              Go to Board
            </Link>
          </div>
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {pendingAssignments.length === 0 ? (
              <p className="text-zinc-450 italic py-2 text-center">All tickets have assigned consultants.</p>
            ) : (
              pendingAssignments.map(t => (
                <div key={t.id} className="p-2 bg-zinc-50 border border-zinc-150 rounded space-y-1">
                  <div className="flex justify-between items-center">
                    <Link href={`/admin/tickets/${t.id}`} className="font-bold text-zinc-900 hover:underline">
                      {t.id}
                    </Link>
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                      t.priority === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-zinc-200 text-zinc-700'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-zinc-800 truncate">{t.title}</div>
                  <div className="text-[9px] text-zinc-400 flex justify-between">
                    <span>{t.organization}</span>
                    <span>Mod: {t.sapModule}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Ticket Activity */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
          <div className="border-b border-zinc-100 pb-2">
            <h3 className="font-bold text-xs uppercase text-zinc-950 flex items-center gap-1.5">
              <Activity size={13} />
              Recent Operations Activity
            </h3>
          </div>
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {recentActivities.length === 0 ? (
              <p className="text-zinc-400 italic py-2 text-center">No recent history events.</p>
            ) : (
              recentActivities.map(act => (
                <div key={act.id} className="text-[10px] border-b border-zinc-50 pb-2 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center text-[9px] text-zinc-400">
                    <span>{act.changedBy}</span>
                    <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="mt-0.5 text-zinc-700">
                    Updated <Link href={`/admin/tickets/${act.ticketId}`} className="font-bold text-zinc-900 hover:underline">{act.ticketId}</Link>:
                    {" "}
                    <span className="font-bold text-zinc-800">{act.fieldChanged}</span> changed from 
                    {" "}
                    <span className="line-through text-zinc-400">{act.oldValue}</span> to 
                    {" "}
                    <span className="font-semibold text-zinc-900 bg-zinc-100 px-1 py-0.2 rounded">{act.newValue}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent comments */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
          <div className="border-b border-zinc-100 pb-2">
            <h3 className="font-bold text-xs uppercase text-zinc-955 flex items-center gap-1.5">
              <MessageSquare size={13} />
              Recent Conversations
            </h3>
          </div>
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {recentComments.length === 0 ? (
              <p className="text-zinc-400 italic py-2 text-center">No comments found.</p>
            ) : (
              recentComments.map(c => (
                <div key={c.id} className="p-2 bg-zinc-50 border border-zinc-150 rounded space-y-1 text-[10px]">
                  <div className="flex justify-between items-center text-[9px] text-zinc-450">
                    <span className="font-bold text-zinc-700">{c.authorName} ({c.authorRole})</span>
                    <span>{c.isInternal ? <span className="text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded text-[8px]">INTERNAL</span> : <span className="text-zinc-400">PUBLIC</span>}</span>
                  </div>
                  <p className="text-zinc-800 line-clamp-2 mt-0.5 italic">"{c.content}"</p>
                  <div className="text-right text-[8px] text-zinc-400">
                    on <Link href={`/admin/tickets/${c.ticketId}`} className="font-bold hover:underline text-zinc-500">{c.ticketId}</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* AI command insights panel */}
      <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950 flex items-center gap-2">
            <Cpu size={14} />
            Command Center AI Diagnosis Insights
          </h3>
          <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-[9px] font-bold text-zinc-500">
            LLM ANALYZER ACTIVE
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] leading-relaxed">
          <div className="space-y-1 bg-zinc-50 border border-zinc-150 rounded p-3">
            <p className="font-bold text-zinc-900 uppercase text-[9px] text-zinc-500">Resource Load Recommendation</p>
            <p className="text-zinc-650 mt-1">Consultant **Karthik Subramanian** is assigned to {consultantWorkload['Karthik Subramanian'] || 0} active tickets, exceeding the recommended limit of 3 for critical projects. Reassign MM tickets to Amit Patel.</p>
          </div>
          <div className="space-y-1 bg-zinc-50 border border-zinc-150 rounded p-3">
            <p className="font-bold text-zinc-900 uppercase text-[9px] text-zinc-500">Contract Hour Alerts</p>
            <p className="text-zinc-650 mt-1">**Apex Global Industries** Support Contract has burned 485.5h of 1200h (40.5%). Their monthly consumption rate is healthy, projecting ample hours for rollout hypercare schedules.</p>
          </div>
          <div className="space-y-1 bg-zinc-50 border border-zinc-150 rounded p-3">
            <p className="font-bold text-zinc-900 uppercase text-[9px] text-zinc-500">SLA Violation Forecast</p>
            <p className="text-zinc-650 mt-1">Incident **SST-FICO-1023** is currently in "New" state with an approaching SLA threshold. It has no assigned consultant. Assign Rajesh Kumar immediately to prevent breach penalties.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
