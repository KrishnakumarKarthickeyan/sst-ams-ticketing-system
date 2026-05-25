'use client';

import React, { useState } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import {
  AlertCircle,
  Clock,
  UserCheck,
  Building2,
  Cpu,
  Layers,
  CheckSquare,
  ShieldAlert,
  ArrowRight,
  Plus,
  TrendingUp,
  Activity,
  FileText,
  Check,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { TicketStatus, TicketPriority } from '../../../types/ticket';

export default function ManagerDashboardPage() {
  const { tickets, assignTicket, approveClosure } = useTickets();
  const { user } = useAuth();
  const [selectedConsultant, setSelectedConsultant] = useState<Record<string, string>>({});

  // 1. Scoped Tickets
  const scopedTickets = tickets.filter(t => {
    if (user?.company && user.company !== 'SST SAP Operations') {
      return t.organization === user.company;
    }
    return true;
  });

  const openTickets = scopedTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');
  const myAssignedTicketsCount = scopedTickets.filter(t => t.assignedManager === user?.name).length;

  // Status Counts
  const pendingAssignment = openTickets.filter(t => !t.assignedConsultant);
  const assignedCount = openTickets.filter(t => t.assignedConsultant && t.status === 'Assigned').length;
  const inProgressCount = openTickets.filter(t => t.status === 'In Progress').length;
  const waitingForCustomerCount = openTickets.filter(t => t.status === 'Waiting for Customer').length;
  const waitingForInternalCount = openTickets.filter(t => t.status === 'Waiting for Internal Team').length;
  const resolvedPendingApproval = scopedTickets.filter(t => t.status === 'Resolved' && t.approvalRequiredFlag);
  const reopenedTicketsCount = scopedTickets.filter(t => t.status === 'Reopened').length;

  // SLA Stats
  const now = Date.now();
  const slaBreachedTickets = openTickets.filter(t => new Date(t.slaDueAt).getTime() < now);
  const slaWarningTickets = openTickets.filter(t => {
    const dueTime = new Date(t.slaDueAt).getTime();
    return dueTime >= now && (dueTime - now) < 12 * 60 * 60 * 1000;
  });

  const criticalTickets = openTickets.filter(t => t.priority === 'Critical').length;
  const escalatedTickets = openTickets.filter(t => t.escalationFlag).length;

  // Consultant Workload
  const consultantWorkload: Record<string, number> = {};
  openTickets.forEach(t => {
    if (t.assignedConsultant) {
      consultantWorkload[t.assignedConsultant] = (consultantWorkload[t.assignedConsultant] || 0) + 1;
    }
  });

  // Pending effort approvals count
  const pendingEffortCount = scopedTickets.flatMap(t => t.efforts || [])
    .filter(e => e.status === 'Pending').length;

  // Module Counts
  const moduleCounts: Record<string, number> = {};
  scopedTickets.forEach(t => {
    moduleCounts[t.sapModule] = (moduleCounts[t.sapModule] || 0) + 1;
  });

  // Customer Counts
  const customerCounts: Record<string, number> = {};
  scopedTickets.forEach(t => {
    customerCounts[t.organization] = (customerCounts[t.organization] || 0) + 1;
  });

  // Recent comments from customer
  const recentCustomerComments = scopedTickets
    .flatMap(t => (t.comments || []).map(c => ({ ...c, ticketId: t.id, title: t.title })))
    .filter(c => c.authorRole === 'Customer')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Tickets requiring Manager Action (Critical or Escalated or Unassigned)
  const ticketsRequiringAction = openTickets.filter(t => 
    t.priority === 'Critical' || t.escalationFlag || !t.assignedConsultant
  ).slice(0, 5);

  const consultantsList = ['Karthik Subramanian', 'Rajesh Kumar', 'Amit Patel'];

  const handleAssign = (ticketId: string, consName: string) => {
    if (!consName) return;
    const actor = user?.name || 'Manager';
    assignTicket(ticketId, user?.name || 'Marcus Vance', consName, actor);
  };

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase text-zinc-955">SAP Operations Manager Command</h1>
          <p className="text-zinc-500 mt-1">
            Manager: <span className="font-bold text-zinc-950">{user?.name}</span> 
            {user?.company && ` | Scope: ${user.company}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/manager/assignment-board" className="px-3 py-1.5 border border-zinc-200 hover:border-zinc-950 rounded font-semibold transition uppercase tracking-wider text-[10px]">
            Assignment Board
          </Link>
          <Link href="/manager/effort-approvals" className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition">
            <Clock size={12} />
            Timesheet approvals {pendingEffortCount > 0 && `(${pendingEffortCount})`}
          </Link>
          <Link href="/manager/reports" className="px-3 py-1.5 border border-zinc-200 hover:border-zinc-950 rounded font-semibold transition uppercase tracking-wider text-[10px]">
            Scope Reports
          </Link>
        </div>
      </div>

      {/* Main Grid KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">Tickets under scope</span>
            <Building2 size={14} />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-zinc-950">{scopedTickets.length}</span>
            <span className="text-[9px] text-zinc-400 block mt-0.5">{openTickets.length} Open Queue</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col justify-between border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">Pending Assign</span>
            <AlertCircle size={14} className="text-amber-500 animate-pulse" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-zinc-950">{pendingAssignment.length}</span>
            <span className="text-[9px] text-zinc-400 block mt-0.5">Need routing</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">Critical / Escalated</span>
            <ShieldAlert size={14} className="text-red-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-red-700">{criticalTickets} / {escalatedTickets}</span>
            <span className="text-[9px] text-zinc-400 block mt-0.5">Action Required</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col justify-between border-l-4 border-l-red-500">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">SLA Breached</span>
            <AlertCircle size={14} className="text-red-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-red-700">{slaBreachedTickets.length}</span>
            <span className="text-[9px] text-zinc-400 block mt-0.5">Overdue incidents</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col justify-between border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">SLA Warnings</span>
            <Clock size={14} className="text-yellow-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-yellow-700">{slaWarningTickets.length}</span>
            <span className="text-[9px] text-zinc-400 block mt-0.5">Due &lt; 12 hours</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="uppercase text-[9px] font-bold tracking-wider">Effort approvals</span>
            <CheckSquare size={14} className="text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-emerald-700">{pendingEffortCount}</span>
            <span className="text-[9px] text-zinc-400 block mt-0.5">Pending logs</span>
          </div>
        </div>
      </div>

      {/* SLA breach lists & action grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tickets Requiring Action */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-xs uppercase text-zinc-950 flex items-center gap-1.5 border-b border-zinc-100 pb-2">
            <ShieldAlert size={14} className="text-red-650" />
            Incidents Requiring Manager Action
          </h3>
          <div className="divide-y divide-zinc-100">
            {ticketsRequiringAction.length === 0 ? (
              <p className="text-zinc-400 italic py-6 text-center">No critical or unassigned alerts in your scope queue.</p>
            ) : (
              ticketsRequiringAction.map((t) => (
                <div key={t.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Link href={`/manager/tickets/${t.id}`} className="font-bold text-zinc-900 hover:underline">
                        {t.id}
                      </Link>
                      <span className={`px-1.5 py-0.2 rounded font-mono text-[8px] font-bold ${
                        t.priority === 'Critical' ? 'bg-red-600 text-white' : 'bg-zinc-200 text-zinc-800'
                      }`}>
                        {t.priority}
                      </span>
                      {t.escalationFlag && (
                        <span className="bg-red-50 border border-red-200 text-red-750 px-1 py-0.2 rounded text-[8px] font-bold">
                          ESCALATED
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-zinc-800 block mt-0.5">{t.title}</span>
                    <span className="text-[10px] text-zinc-450 block truncate max-w-md">{t.organization} | Module: {t.sapModule}</span>
                  </div>

                  {/* Assign Consultant control */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedConsultant[t.id] || ''}
                      onChange={(e) => setSelectedConsultant({ ...selectedConsultant, [t.id]: e.target.value })}
                      className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950 font-mono"
                    >
                      <option value="">Choose Staff</option>
                      {consultantsList.map(cName => (
                        <option key={cName} value={cName}>{cName}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssign(t.id, selectedConsultant[t.id])}
                      className="px-2 py-1 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold text-[9px] uppercase tracking-wider disabled:opacity-50"
                      disabled={!selectedConsultant[t.id]}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI suggested Routing Recommendations */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h3 className="font-bold text-xs uppercase text-zinc-950 flex items-center gap-1.5">
              <Cpu size={14} />
              AI Priority recommendations
            </h3>
            <span className="text-[9px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-200 px-1 rounded">ACTIVE</span>
          </div>

          <div className="space-y-3 bg-zinc-50 border border-zinc-200 rounded p-4 text-[11px] leading-relaxed">
            <div className="space-y-1">
              <p className="font-bold text-zinc-900 uppercase text-[8px] text-zinc-500">Routing Recommendation</p>
              <p className="text-zinc-650">MM purchase block incidents should be routed to **Karthik Subramanian** who recently solved 3 similar release strategy issues.</p>
            </div>
            <div className="space-y-1 pt-2.5 border-t border-zinc-200">
              <p className="font-bold text-zinc-900 uppercase text-[8px] text-zinc-500">SLA Breach Forecast</p>
              <p className="text-zinc-650">Two tickets have elapsed 75% of their SLA resolution time. Assign Rajesh Kumar immediately to support MM incident ticket queues.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Metrics breakdown columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Consultant Workload */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
          <h3 className="font-bold uppercase tracking-wider text-[10px] text-zinc-950 border-b border-zinc-100 pb-2">Staff Workload</h3>
          <div className="space-y-2">
            {consultantsList.map(name => (
              <div key={name} className="flex justify-between items-center py-1 border-b border-zinc-50 last:border-b-0">
                <span className="text-zinc-700 font-semibold">{name}</span>
                <span className={`px-1.5 py-0.2 rounded-full font-bold text-[9px] ${
                  (consultantWorkload[name] || 0) > 2 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-zinc-100 text-zinc-800'
                }`}>
                  {consultantWorkload[name] || 0} active
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Module wise count */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
          <h3 className="font-bold uppercase tracking-wider text-[10px] text-zinc-950 border-b border-zinc-100 pb-2">Module counts</h3>
          <div className="space-y-2">
            {Object.keys(moduleCounts).length === 0 ? (
              <p className="text-zinc-400 italic">No tickets logged.</p>
            ) : (
              Object.entries(moduleCounts).map(([mod, count]) => (
                <div key={mod} className="flex justify-between items-center py-1 border-b border-zinc-50 last:border-b-0">
                  <span className="text-zinc-700 font-semibold">{mod} Module</span>
                  <span className="font-bold text-zinc-900 bg-zinc-150 px-1.5 rounded">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer wise count */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
          <h3 className="font-bold uppercase tracking-wider text-[10px] text-zinc-955 border-b border-zinc-100 pb-2">Customer Load</h3>
          <div className="space-y-2">
            {Object.entries(customerCounts).map(([org, count]) => (
              <div key={org} className="flex justify-between items-center py-1 border-b border-zinc-50 last:border-b-0">
                <span className="text-zinc-700 font-semibold truncate max-w-[130px]">{org}</span>
                <span className="font-bold text-zinc-950 bg-zinc-100 px-1.5 rounded">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledgebase Suggestions */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
          <h3 className="font-bold uppercase tracking-wider text-[10px] text-zinc-950 border-b border-zinc-100 pb-2">Article Suggestions</h3>
          <div className="space-y-2 text-[10px]">
            <div className="flex gap-1.5 items-start">
              <BookOpen size={12} className="text-zinc-400 mt-0.5 shrink-0" />
              <span className="text-zinc-700 hover:underline cursor-pointer font-bold">MM: Purchase Order release configuration guide</span>
            </div>
            <div className="flex gap-1.5 items-start border-t border-zinc-50 pt-1.5">
              <BookOpen size={12} className="text-zinc-400 mt-0.5 shrink-0" />
              <span className="text-zinc-700 hover:underline cursor-pointer font-bold">BASIS: Release codes and agent synchronization workflow triggers</span>
            </div>
          </div>
        </div>

      </div>

      {/* Customer Comments Pending Reply */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm">
          <h3 className="font-bold text-xs uppercase text-zinc-955 flex items-center gap-1.5 border-b border-zinc-100 pb-2">
            <MessageSquare size={13} />
            Recent Client Comments (Awaiting Reply)
          </h3>
          <div className="space-y-3">
            {recentCustomerComments.length === 0 ? (
              <p className="text-zinc-400 italic text-center py-4">No recent comments from customer accounts.</p>
            ) : (
              recentCustomerComments.map((c) => (
                <div key={c.id} className="p-2 bg-zinc-50 border border-zinc-150 rounded space-y-1">
                  <div className="flex justify-between items-center text-[9px] text-zinc-400">
                    <span className="font-bold text-zinc-700">{c.authorName}</span>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-zinc-800 italic mt-0.5">"{c.content}"</p>
                  <div className="text-right text-[9px]">
                    on <Link href={`/manager/tickets/${c.ticketId}`} className="font-bold text-zinc-650 hover:underline">{c.ticketId} - {c.title}</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dashboard Actions and Availability Preview */}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs uppercase text-zinc-950 border-b border-zinc-100 pb-2">Consultant Availability Status</h3>
            <div className="space-y-2 mt-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-650 font-bold">Karthik Subramanian:</span>
                <span className="text-emerald-700 font-bold">Available (1 ticket load)</span>
              </div>
              <div className="flex justify-between text-[11px] border-t border-zinc-50 pt-1.5">
                <span className="text-zinc-650 font-bold">Rajesh Kumar:</span>
                <span className="text-amber-600 font-bold font-mono">Assigned (3 ticket load)</span>
              </div>
              <div className="flex justify-between text-[11px] border-t border-zinc-50 pt-1.5">
                <span className="text-zinc-650 font-bold">Amit Patel:</span>
                <span className="text-emerald-700 font-bold">Available (0 ticket load)</span>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded text-[10px]">
            <p className="font-bold text-zinc-700">Need to schedule weekly hypercare?</p>
            <p className="text-zinc-500 mt-1">Configure client meetings and release timelines directly in your calendar scope configurations.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
