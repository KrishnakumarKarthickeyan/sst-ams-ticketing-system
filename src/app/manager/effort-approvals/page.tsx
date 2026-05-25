'use client';

import React, { useState, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Clock, Check, X, Shield, AlertCircle, CheckCircle2, XCircle, FileText, ChevronRight, Unlock } from 'lucide-react';
import Link from 'next/link';

export default function ManagerEffortApprovalsPage() {
  const {
    tickets,
    approveEffortLog,
    approveRevisionRequest,
    rejectRevisionRequest,
    approveClosureRequest,
    rejectClosureRequest,
    approveUnlockRequest,
    rejectUnlockRequest
  } = useTickets();
  
  const { user } = useAuth();
  const managerName = user?.name || 'Marcus Vance';

  // Selected sub-workflow tab
  const [activeTab, setActiveTab] = useState<'timesheet' | 'revisions' | 'closures' | 'unlocks'>('timesheet');

  // Timesheet log state filter
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');

  // 1. Fetch Timesheet effort logs under scope
  const timesheetLogs = useMemo(() => {
    const logs = tickets.flatMap(ticket => 
      (ticket.efforts || []).map(effort => ({
        ...effort,
        hoursLogged: effort.hoursWorked !== undefined ? effort.hoursWorked : effort.hoursLogged,
        activityDate: effort.workDate || effort.activityDate,
        ticketTitle: ticket.title,
        sapModule: ticket.sapModule,
        organization: ticket.organization,
        priority: ticket.priority
      }))
    );
    // Sort: newest first
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return logs.filter(log => {
      if (user?.company && user.company !== 'SST SAP Operations') {
        return log.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  const filteredTimesheetLogs = useMemo(() => {
    return timesheetLogs.filter(log => {
      if (timesheetStatusFilter === 'All') return true;
      if (timesheetStatusFilter === 'Pending') {
        return log.status === 'Pending' || log.status === 'Pending Approval' || log.status === 'Resubmitted';
      }
      return log.status === timesheetStatusFilter;
    });
  }, [timesheetLogs, timesheetStatusFilter]);

  // 2. Fetch Estimates Revision Requests under scope
  const revisionRequests = useMemo(() => {
    const list = tickets.flatMap(ticket => 
      (ticket.hourEstimates || [])
        .filter(est => est.status === 'Revision Requested')
        .map(est => {
          const original = (ticket.hourEstimates || []).find(e => e.status === 'Submitted');
          return {
            ...est,
            ticketTitle: ticket.title,
            sapModule: ticket.sapModule,
            organization: ticket.organization,
            priority: ticket.priority,
            originalHours: original ? original.totalEstimatedHours : ticket.quotedHours || 0
          };
        })
    );
    list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return list.filter(r => {
      if (user?.company && user.company !== 'SST SAP Operations') {
        return r.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  // 3. Fetch Closure Requests under scope
  const closureRequests = useMemo(() => {
    const list = tickets.flatMap(ticket => 
      (ticket.closureRequests || [])
        .filter(req => req.status === 'Pending Manager Approval')
        .map(req => ({
          ...req,
          ticketTitle: ticket.title,
          sapModule: ticket.sapModule,
          organization: ticket.organization,
          priority: ticket.priority,
          quotedHours: ticket.quotedHours || 0
        }))
    );
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.filter(r => {
      if (user?.company && user.company !== 'SST SAP Operations') {
        return r.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  // 4. Fetch Unlock Requests under manager scope
  const unlockRequests = useMemo(() => {
    const list = tickets.flatMap(ticket => 
      (ticket.unlockRequests || [])
        .filter(req => req.status === 'Pending')
        .map(req => ({
          ...req,
          ticketTitle: ticket.title,
          sapModule: ticket.sapModule,
          organization: ticket.organization,
          priority: ticket.priority
        }))
    );
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.filter(r => {
      if (user?.company && user.company !== 'SST SAP Operations') {
        return r.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  // Handle approvals / rejections
  const handleTimesheetAction = (ticketId: string, logId: string, action: 'Approved' | 'Rejected') => {
    if (action === 'Rejected') {
      const reason = window.prompt('Enter rejection reason for this effort log:');
      if (reason === null) return;
      approveEffortLog(ticketId, logId, action, managerName, reason || 'Rejection reason not specified');
    } else {
      approveEffortLog(ticketId, logId, action, managerName);
    }
  };

  const handleRevisionAction = (ticketId: string, estimateId: string, action: 'Approve' | 'Reject') => {
    if (action === 'Reject') {
      const reason = window.prompt('Enter rejection reason for estimate revision:');
      if (reason === null) return;
      rejectRevisionRequest(ticketId, estimateId, managerName, reason || 'Not approved by manager');
    } else {
      approveRevisionRequest(ticketId, estimateId, managerName);
    }
  };

  const handleClosureAction = (ticketId: string, requestId: string, action: 'Approve' | 'Reject') => {
    if (action === 'Reject') {
      const reason = window.prompt('Enter rejection reason for closure request:');
      if (reason === null) return;
      rejectClosureRequest(ticketId, requestId, managerName, reason || 'Resolution details unsatisfactory');
    } else {
      approveClosureRequest(ticketId, requestId, managerName);
    }
  };

  const handleUnlockAction = (ticketId: string, requestId: string, action: 'Approve' | 'Reject') => {
    if (action === 'Reject') {
      const reason = window.prompt('Enter rejection reason for unlock request:');
      if (reason === null) return;
      rejectUnlockRequest(ticketId, requestId, managerName, reason || 'Unlock not approved by manager');
    } else {
      approveUnlockRequest(ticketId, requestId, managerName);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link href="/manager/dashboard" className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-955 transition">
          <ArrowLeft size={12} />
          Back to Dashboard
        </Link>
        <div className="bg-zinc-150 px-2 py-1 rounded text-zinc-700 border border-zinc-200 uppercase tracking-widest text-[9px] flex items-center gap-1 font-bold">
          <Shield size={10} />
          Approvals Center
        </div>
      </div>

      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase text-zinc-955">Manager Approvals Dashboard</h1>
        <p className="text-zinc-500 mt-1">Review timesheets, estimates revision requests, and closures with actual hours submitted by consultants.</p>
        {user?.company && user.company !== 'SST SAP Operations' && (
          <span className="inline-block mt-2 px-2 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded font-bold uppercase text-[9px]">
            Scoped: {user.company}
          </span>
        )}
      </div>

      {/* Main Workflow Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('timesheet')}
          className={`py-3 px-5 font-bold uppercase tracking-wider text-[10px] border-b-2 -mb-[2px] transition ${
            activeTab === 'timesheet' ? 'border-zinc-950 text-zinc-950 font-black' : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          Timesheet Logs ({timesheetLogs.filter(l => l.status.includes('Pending') || l.status === 'Resubmitted').length})
        </button>
        <button
          onClick={() => setActiveTab('revisions')}
          className={`py-3 px-5 font-bold uppercase tracking-wider text-[10px] border-b-2 -mb-[2px] transition ${
            activeTab === 'revisions' ? 'border-zinc-950 text-zinc-950 font-black' : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          Estimate Revisions ({revisionRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('closures')}
          className={`py-3 px-5 font-bold uppercase tracking-wider text-[10px] border-b-2 -mb-[2px] transition ${
            activeTab === 'closures' ? 'border-zinc-950 text-zinc-950 font-black' : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          Closure Requests ({closureRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('unlocks')}
          className={`py-3 px-5 font-bold uppercase tracking-wider text-[10px] border-b-2 -mb-[2px] transition ${
            activeTab === 'unlocks' ? 'border-zinc-950 text-zinc-950 font-black' : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          Unlock Requests ({unlockRequests.length})
        </button>
      </div>

      {/* 1. TIMESHEET APPROVALS CHANNEL */}
      {activeTab === 'timesheet' && (
        <div className="space-y-4">
          <div className="flex border-b border-zinc-150 gap-2">
            {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setTimesheetStatusFilter(st)}
                className={`py-1.5 px-3 font-bold uppercase text-[9px] border border-zinc-200 rounded-t transition ${
                  timesheetStatusFilter === st ? 'bg-zinc-150 text-zinc-955 border-b-transparent' : 'bg-white text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[9px]">
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Consultant</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Activity</th>
                  <th className="py-3 px-4">Work Description</th>
                  <th className="py-3 px-4 text-center">Hours</th>
                  <th className="py-3 px-4 text-center">Billing</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {filteredTimesheetLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-zinc-400 italic">No effort log entries in this filter state.</td>
                  </tr>
                ) : (
                  filteredTimesheetLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50 transition">
                      <td className="py-3 px-4">
                        <Link href={`/manager/tickets/${log.ticketId}`} className="font-bold text-zinc-900 hover:underline">{log.ticketId}</Link>
                        <div className="text-[9px] text-zinc-400 truncate max-w-[150px] mt-0.5">{log.ticketTitle}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-800">{log.consultantName}</td>
                      <td className="py-3 px-4 text-zinc-650">{log.activityDate}</td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-[9px] font-bold text-zinc-700 uppercase">{log.activityType}</span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600 max-w-[200px] truncate" title={log.description}>{log.description}</td>
                      <td className="py-3 px-4 text-center font-bold text-zinc-950">{log.hoursLogged.toFixed(1)}h</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${log.billable ? 'text-emerald-700' : 'text-zinc-400'}`}>{log.billable ? 'Billable' : 'Non-Billable'}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {log.status.startsWith('Pending') || log.status === 'Resubmitted' ? (
                          <div className="flex justify-end gap-1.5">
                            {log.status === 'Resubmitted' && <span className="text-[8px] bg-blue-50 border border-blue-200 text-blue-700 px-1 py-0.5 rounded font-bold uppercase animate-pulse mr-1">Resub</span>}
                            <button onClick={() => handleTimesheetAction(log.ticketId, log.id, 'Approved')} className="p-1 text-emerald-600 hover:bg-emerald-50 border border-zinc-200 rounded" title="Approve"><Check size={11} /></button>
                            <button onClick={() => handleTimesheetAction(log.ticketId, log.id, 'Rejected')} className="p-1 text-red-600 hover:bg-red-50 border border-zinc-200 rounded" title="Reject"><X size={11} /></button>
                          </div>
                        ) : (
                          <span className={`font-bold uppercase text-[9px] ${log.status === 'Approved' ? 'text-emerald-600' : 'text-red-500'}`}>{log.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. ESTIMATE REVISIONS APPROVALS CHANNEL */}
      {activeTab === 'revisions' && (
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[9px]">
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Consultant</th>
                <th className="py-3 px-4 text-center">Current Est.</th>
                <th className="py-3 px-4 text-center">Proposed Est.</th>
                <th className="py-3 px-4">Justification Remarks</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {revisionRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-400 italic">No estimates revision requests pending.</td>
                </tr>
              ) : (
                revisionRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-50 transition">
                    <td className="py-3 px-4">
                      <Link href={`/manager/tickets/${req.ticketId}`} className="font-bold text-zinc-900 hover:underline">{req.ticketId}</Link>
                      <div className="text-[9px] text-zinc-400 truncate max-w-[150px] mt-0.5">{req.ticketTitle}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-800">{req.consultantId}</td>
                    <td className="py-3 px-4 text-center text-zinc-500">{req.originalHours} hrs</td>
                    <td className="py-3 px-4 text-center font-bold text-zinc-950 bg-zinc-50/50">
                      <div>{req.totalEstimatedHours} hrs</div>
                      <div className="text-[8px] text-zinc-400">Func: {req.functionalEstimatedHours}h | Tech: {req.technicalEstimatedHours}h</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-650 max-w-[200px] truncate" title={req.remarks}>{req.remarks}</td>
                    <td className="py-3 px-4 text-zinc-500">{new Date(req.submittedAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => handleRevisionAction(req.ticketId, req.id, 'Approve')} className="p-1 text-emerald-600 hover:bg-emerald-50 border border-zinc-200 rounded" title="Approve"><Check size={11} /></button>
                        <button onClick={() => handleRevisionAction(req.ticketId, req.id, 'Reject')} className="p-1 text-red-600 hover:bg-red-50 border border-zinc-200 rounded" title="Reject"><X size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. CLOSURE REQUESTS APPROVALS CHANNEL */}
      {activeTab === 'closures' && (
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[9px]">
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Consultant</th>
                <th className="py-3 px-4 text-center">Quoted Est.</th>
                <th className="py-3 px-4 text-center">Actual Hours</th>
                <th className="py-3 px-4">Summaries</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {closureRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-400 italic">No closure requests pending approval.</td>
                </tr>
              ) : (
                closureRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-50 transition border-b border-zinc-150">
                    <td className="py-3 px-4">
                      <Link href={`/manager/tickets/${req.ticketId}`} className="font-bold text-zinc-900 hover:underline">{req.ticketId}</Link>
                      <div className="text-[9px] text-zinc-400 truncate max-w-[150px] mt-0.5">{req.ticketTitle}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-800">{req.requestedBy}</td>
                    <td className="py-3 px-4 text-center text-zinc-500">{req.quotedHours} hrs</td>
                    <td className="py-3 px-4 text-center font-bold text-zinc-955 bg-emerald-50/10">
                      <div>{req.totalActualHours} hrs</div>
                      <div className="text-[8px] text-zinc-500">Func: {req.functionalActualHours}h | Tech: {req.technicalActualHours}h</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 space-y-1 max-w-[300px]">
                      <div><strong>Work:</strong> {req.workCompletedSummary}</div>
                      <div><strong>Root Cause:</strong> <span className="text-red-650">{req.rootCause}</span></div>
                      <div><strong>Resolution:</strong> <span className="text-emerald-700">{req.resolutionSummary}</span></div>
                      {req.pendingItems && <div><strong>Pending:</strong> <span className="text-amber-600">{req.pendingItems}</span></div>}
                    </td>
                    <td className="py-3 px-4 text-zinc-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => handleClosureAction(req.ticketId, req.id, 'Approve')} className="p-1 text-emerald-600 hover:bg-emerald-50 border border-zinc-200 rounded" title="Approve"><Check size={11} /></button>
                        <button onClick={() => handleClosureAction(req.ticketId, req.id, 'Reject')} className="p-1 text-red-600 hover:bg-red-50 border border-zinc-200 rounded" title="Reject"><X size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. UNLOCK REQUESTS APPROVALS CHANNEL */}
      {activeTab === 'unlocks' && (
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[9px]">
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Consultant</th>
                <th className="py-3 px-4">Reason for Unlock</th>
                <th className="py-3 px-4">What Needs to Change</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4">Requested At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {unlockRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-400 italic">No pending unlock requests.</td>
                </tr>
              ) : (
                unlockRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-50 transition border-b border-zinc-150">
                    <td className="py-3 px-4">
                      <Link href={`/manager/tickets/${req.ticketId}`} className="font-bold text-zinc-900 hover:underline">{req.ticketId}</Link>
                      <div className="text-[9px] text-zinc-400 truncate max-w-[150px] mt-0.5">{req.ticketTitle}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-800">{req.requestedBy}</td>
                    <td className="py-3 px-4 text-zinc-950 font-bold max-w-[180px] truncate" title={req.reason}>{req.reason}</td>
                    <td className="py-3 px-4 text-zinc-700 max-w-[200px] truncate" title={req.requestedChange}>{req.requestedChange}</td>
                    <td className="py-3 px-4 text-zinc-600 max-w-[150px] truncate" title={req.remarks}>{req.remarks || '-'}</td>
                    <td className="py-3 px-4 text-zinc-500">{new Date(req.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => handleUnlockAction(req.ticketId, req.id, 'Approve')} className="p-1 text-emerald-600 hover:bg-emerald-50 border border-zinc-200 rounded" title="Approve"><Check size={11} /></button>
                        <button onClick={() => handleUnlockAction(req.ticketId, req.id, 'Reject')} className="p-1 text-red-600 hover:bg-red-50 border border-zinc-200 rounded" title="Reject"><X size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
