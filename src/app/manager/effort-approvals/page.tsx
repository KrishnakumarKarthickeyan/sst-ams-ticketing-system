'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Check, X, Shield, AlertCircle, CheckCircle2, FileText, Unlock, RotateCcw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '../../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';

export default function ManagerEffortApprovalsPage() {
  const {
    tickets,
    approveEffortLog,
    approveRevisionRequest,
    rejectRevisionRequest,
    approveClosureRequest,
    rejectClosureRequest,
    approveUnlockRequest,
    rejectUnlockRequest,
    updateTicketStatus,
    closeTicket,
    notifications,
    updateTicket
  } = useTickets();
  
  const { user } = useAuth();
  const managerName = user?.name || 'Marcus Vance';
  const router = useRouter();

  // State-driven active tab: estimated, actual, closures, reopens, unlocks, others
  const [activeTab, setActiveTab] = useState<'estimated' | 'actual' | 'closures' | 'reopens' | 'unlocks' | 'others'>('actual');

  // Timesheet / Actual hours filter
  const [timesheetFilter, setTimesheetFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');

  // Rejection Dialog Modal State
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    type: 'estimate' | 'timesheet' | 'closure' | 'unlock' | 'reopen' | 'delete';
    ticketId: string;
    ticketNumber?: string;
    targetId: string;
    rejectionReason: string;
  }>({
    isOpen: false,
    type: 'timesheet',
    ticketId: '',
    ticketNumber: '',
    targetId: '',
    rejectionReason: ''
  });

  // --- 1. ESTIMATED HOURS LOGS ---
  // Gathers both initial estimates (Submitted) and revisions (Revision Requested)
  const pendingEstimates = useMemo(() => {
    const list = tickets.flatMap(ticket => 
      (ticket.hourEstimates || [])
        .filter(est => est.status === 'Submitted' || est.status === 'Revision Requested')
        .map(est => {
          const original = (ticket.hourEstimates || []).find(e => e.status === 'Revision Approved');
          return {
            ...est,
            ticketTitle: ticket.title,
            sapModule: ticket.sapModule,
            organization: ticket.organization,
            priority: ticket.priority,
            ticketNumber: ticket.ticketNumber || ticket.id,
            originalHours: est.status === 'Revision Requested' && original ? original.totalEstimatedHours : 0
          };
        })
    );
    list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return list.filter(r => {
      if (user?.company && user.company !== 'Assist360 Operations') {
        return r.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  // --- 2. ACTUAL HOURS LOGS (Timesheets) ---
  const timesheetLogs = useMemo(() => {
    const logs = tickets.flatMap(ticket => 
      (ticket.efforts || []).map(effort => ({
        ...effort,
        hoursLogged: effort.hoursWorked !== undefined ? effort.hoursWorked : effort.hoursLogged,
        activityDate: effort.workDate || effort.activityDate,
        ticketTitle: ticket.title,
        sapModule: ticket.sapModule,
        organization: ticket.organization,
        priority: ticket.priority,
        ticketNumber: ticket.ticketNumber || ticket.id
      }))
    );
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return logs.filter(log => {
      if (user?.company && user.company !== 'Assist360 Operations') {
        return log.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  const filteredTimesheetLogs = useMemo(() => {
    return timesheetLogs.filter(log => {
      if (timesheetFilter === 'All') return true;
      if (timesheetFilter === 'Pending') {
        return log.status === 'Pending' || log.status === 'Pending Approval' || log.status === 'Resubmitted';
      }
      return log.status === timesheetFilter;
    });
  }, [timesheetLogs, timesheetFilter]);

  // --- 3. CLOSURE REQUESTS ---
  const closureRequests = useMemo(() => {
    const list = tickets.flatMap(ticket => 
      (ticket.closureRequests || [])
        .filter(req => req.status === 'Pending Manager Approval' || req.status === 'Resubmitted')
        .map(req => {
          // Fetch the latest approved estimate to display side-by-side
          const latestApprovedEstimate = (ticket.hourEstimates || [])
            .filter(e => e.status === 'Revision Approved' || e.status === 'Submitted')
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

          return {
            ...req,
            ticketTitle: ticket.title,
            sapModule: ticket.sapModule,
            organization: ticket.organization,
            priority: ticket.priority,
            quotedHours: ticket.quotedHours || 0,
            ticketNumber: ticket.ticketNumber || ticket.id,
            estimatedFuncHours: latestApprovedEstimate?.functionalEstimatedHours || 0,
            estimatedTechHours: latestApprovedEstimate?.technicalEstimatedHours || 0,
            estimatedTotalHours: latestApprovedEstimate?.totalEstimatedHours || ticket.quotedHours || 0,
            perConsultantEfforts: (ticket.consultantEfforts || []).filter(e => !e.isDeleted)
          };
        })
    );
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.filter(r => {
      if (user?.company && user.company !== 'Assist360 Operations') {
        return r.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  // --- 4. REOPEN REQUESTS (Reopened Tickets) ---
  const reopenRequests = useMemo(() => {
    const reopenedTickets = tickets.filter(t => t.status === 'Reopen Requested');
    return reopenedTickets.map(ticket => {
      // Find the status change in history
      const reopenHistory = [...ticket.history]
        .reverse()
        .find(h => h.fieldChanged === 'Status' && h.newValue === 'Reopen Requested');
      
      // Look for a corresponding reopen notification
      const reopenNotification = notifications.find(n => n.ticketId === ticket.id && n.title === 'Ticket Reopen Requested');
      
      // Grab latest customer comment
      const customerComment = [...ticket.comments]
        .reverse()
        .find(c => c.authorRole === 'Customer');
 
      // Extract reason
      let parsedReason = 'No explanation provided by client.';
      if (reopenNotification?.message) {
        const parts = reopenNotification.message.split('Reason:');
        if (parts.length > 1) parsedReason = parts[1].trim();
      } else if (customerComment?.content) {
        parsedReason = customerComment.content;
      }
 
      return {
        id: ticket.id,
        title: ticket.title,
        sapModule: ticket.sapModule,
        organization: ticket.organization,
        priority: ticket.priority,
        ticketNumber: ticket.ticketNumber || ticket.id,
        reopenedCount: ticket.reopenedCount || 1,
        reopenedAt: reopenHistory?.createdAt || ticket.updatedAt,
        reopenedBy: reopenHistory?.changedBy || 'Customer Client',
        reason: parsedReason,
        status: ticket.status
      };
    }).filter(r => {
      if (user?.company && user.company !== 'Assist360 Operations') {
        return r.organization === user.company;
      }
      return true;
    });
  }, [tickets, notifications, user]);

  // --- 5. UNLOCK REQUESTS ---
  const unlockRequests = useMemo(() => {
    const list = tickets.flatMap(ticket => 
      (ticket.unlockRequests || [])
        .filter(req => req.status === 'Pending')
        .map(req => ({
          ...req,
          ticketTitle: ticket.title,
          sapModule: ticket.sapModule,
          organization: ticket.organization,
          priority: ticket.priority,
          ticketNumber: ticket.ticketNumber || ticket.id
        }))
    );
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.filter(r => {
      if (user?.company && user.company !== 'Assist360 Operations') {
        return r.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  // --- 6. PENDING DELETES (Soft delete requests) ---
  const pendingDeletes = useMemo(() => {
    const list = tickets.flatMap(ticket => 
      (ticket.deleteRequests || [])
        .filter(req => req.managerApproval === 'Pending')
        .map(req => ({
          ...req,
          ticketTitle: ticket.title,
          sapModule: ticket.sapModule,
          organization: ticket.organization,
          priority: ticket.priority,
          ticketNumber: ticket.ticketNumber || ticket.id
        }))
    );
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.filter(r => {
      if (user?.company && user.company !== 'Assist360 Operations') {
        return r.organization === user.company;
      }
      return true;
    });
  }, [tickets, user]);

  const handleApproveDelete = (ticketId: string, requestId: string) => {
    const t = tickets.find(ticket => ticket.id === ticketId);
    if (!t) return;
    const updatedReqs = (t.deleteRequests || []).map(r => 
      r.id === requestId 
        ? { ...r, managerApproval: 'Approved' as const, managerApprovedBy: managerName, managerApprovedAt: new Date().toISOString() } 
        : r
    );
    updateTicket(ticketId, {
      softDeleteStatus: 'Pending Delete',
      deleteRequests: updatedReqs
    });
  };

  const handleRejectDeleteConfirm = (ticketId: string, requestId: string, reason: string) => {
    const t = tickets.find(ticket => ticket.id === ticketId);
    if (!t) return;
    const updatedReqs = (t.deleteRequests || []).map(r => 
      r.id === requestId 
        ? { 
            ...r, 
            managerApproval: 'Rejected' as const, 
            managerApprovedBy: managerName, 
            managerApprovedAt: new Date().toISOString(), 
            finalStatus: 'Rejected' as const,
            rejectionReason: reason 
          } 
        : r
    );
    updateTicket(ticketId, {
      softDeleteStatus: 'Active',
      deleteRequests: updatedReqs
    });
  };

  // --- SUBMIT REJECTION STATE-BASED HANDLER ---
  const triggerRejectionModal = (
    type: 'estimate' | 'timesheet' | 'closure' | 'unlock' | 'reopen' | 'delete',
    ticketId: string,
    targetId: string,
    ticketNumber?: string
  ) => {
    setRejectionModal({
      isOpen: true,
      type,
      ticketId,
      targetId,
      ticketNumber: ticketNumber || ticketId,
      rejectionReason: ''
    });
  };

  const handleRejectionSubmit = () => {
    const { type, ticketId, targetId, rejectionReason } = rejectionModal;
    if (!rejectionReason.trim()) return;

    if (type === 'timesheet') {
      approveEffortLog(ticketId, targetId, 'Rejected', managerName, rejectionReason);
    } else if (type === 'estimate') {
      rejectRevisionRequest(ticketId, targetId, managerName, rejectionReason);
    } else if (type === 'closure') {
      rejectClosureRequest(ticketId, targetId, managerName, rejectionReason);
    } else if (type === 'unlock') {
      rejectUnlockRequest(ticketId, targetId, managerName, rejectionReason);
    } else if (type === 'reopen') {
      closeTicket(ticketId, 5, `Reopen rejected by manager: ${rejectionReason}`, managerName);
    } else if (type === 'delete') {
      handleRejectDeleteConfirm(ticketId, targetId, rejectionReason);
    }

    setRejectionModal({
      isOpen: false,
      type: 'timesheet',
      ticketId: '',
      targetId: '',
      rejectionReason: ''
    });
  };

  // --- APPROVAL HANDLERS ---
  const handleApproveEstimate = (ticketId: string, estimateId: string) => {
    approveRevisionRequest(ticketId, estimateId, managerName);
  };

  const handleApproveTimesheet = (ticketId: string, logId: string) => {
    approveEffortLog(ticketId, logId, 'Approved', managerName);
  };

  const handleApproveClosure = (ticketId: string, requestId: string) => {
    router.push(`/manager/tickets/${ticketId}?approveClosure=${requestId}`);
  };

  const handleApproveUnlock = (ticketId: string, requestId: string) => {
    approveUnlockRequest(ticketId, requestId, managerName);
  };

  const handleApproveReopen = (ticketId: string) => {
    // Approve reopen -> Move to In Progress
    updateTicketStatus(ticketId, 'In Progress', managerName);
  };

  return (
    <div className="space-y-6 font-mono text-xs text-[#09090b]">
      
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <Link href="/manager/dashboard" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-950 transition">
          <ArrowLeft size={13} />
          <span>Dashboard Cockpit</span>
        </Link>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded text-[10px] font-bold uppercase tracking-wider">
          <Shield size={12} className="text-zinc-500" />
          <span>Operations Control</span>
        </div>
      </div>

      {/* Main Title Section */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-lg font-bold uppercase tracking-wider text-zinc-950">Manager Approvals Workspace</h1>
        <p className="text-zinc-500 mt-1">Audit, approve, or reject effort allocations, timesheets, ticket closures, and reopen requests.</p>
        {user?.company && user.company !== 'Assist360 Operations' && (
          <span className="inline-block mt-2 px-2.5 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded font-bold uppercase text-[9px]">
            Enterprise Scope: {user.company}
          </span>
        )}
      </div>

      {/* 6-Tab Navigation Bar */}
      <div className="flex border-b border-zinc-200 overflow-x-auto whitespace-nowrap bg-zinc-50/50 p-0.5 rounded-lg border">
        {/* Estimated Hours tab hidden as estimates do not require approval */}
        {/* <button
          type="button"
          onClick={() => setActiveTab('estimated')}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[10px] rounded transition ${
            activeTab === 'estimated' 
              ? 'bg-white text-zinc-955 shadow-sm border border-zinc-200 font-extrabold' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <span>Estimated Hours</span>
          <Badge className="bg-zinc-200 text-zinc-800 hover:bg-zinc-200 border-none font-bold px-1.5 py-0">
            {pendingEstimates.length}
          </Badge>
        </button> */}
 
        <button
          type="button"
          onClick={() => setActiveTab('actual')}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[10px] rounded transition ${
            activeTab === 'actual' 
              ? 'bg-white text-zinc-955 shadow-sm border border-zinc-200 font-extrabold' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <span>Actual Hours</span>
          <Badge className="bg-zinc-200 text-zinc-800 hover:bg-zinc-200 border-none font-bold px-1.5 py-0">
            {timesheetLogs.filter(l => l.status === 'Pending' || l.status === 'Pending Approval' || l.status === 'Resubmitted').length}
          </Badge>
        </button>
 
        <button
          type="button"
          onClick={() => setActiveTab('closures')}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[10px] rounded transition ${
            activeTab === 'closures' 
              ? 'bg-white text-zinc-955 shadow-sm border border-zinc-200 font-extrabold' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <span>Closures</span>
          <Badge className="bg-zinc-200 text-zinc-800 hover:bg-zinc-200 border-none font-bold px-1.5 py-0">
            {closureRequests.length}
          </Badge>
        </button>
 
        <button
          type="button"
          onClick={() => setActiveTab('reopens')}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[10px] rounded transition ${
            activeTab === 'reopens' 
              ? 'bg-white text-zinc-955 shadow-sm border border-zinc-200 font-extrabold' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <span>Reopen Requests</span>
          <Badge className="bg-zinc-200 text-zinc-800 hover:bg-zinc-200 border-none font-bold px-1.5 py-0">
            {reopenRequests.length}
          </Badge>
        </button>
 
        <button
          type="button"
          onClick={() => setActiveTab('unlocks')}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[10px] rounded transition ${
            activeTab === 'unlocks' 
              ? 'bg-white text-zinc-955 shadow-sm border border-zinc-200 font-extrabold' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <span>Unlocks</span>
          <Badge className="bg-zinc-200 text-zinc-800 hover:bg-zinc-200 border-none font-bold px-1.5 py-0">
            {unlockRequests.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('others')}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[10px] rounded transition ${
            activeTab === 'others' 
              ? 'bg-white text-zinc-955 shadow-sm border border-zinc-200 font-extrabold' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <span>Other Requests</span>
          <Badge className="bg-zinc-200 text-zinc-800 hover:bg-zinc-200 border-none font-bold px-1.5 py-0">
            {pendingDeletes.length}
          </Badge>
        </button>
      </div>

      {/* --- TAB 1: ESTIMATED HOURS CONTENT --- */}
      {activeTab === 'estimated' && (
        <Card className="border border-zinc-200 shadow-sm">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-150">
            <CardTitle className="text-zinc-900 font-bold uppercase text-[11px]">Estimate Allocation Reviews</CardTitle>
            <CardDescription className="text-zinc-500 text-[10px]">Approve initial hourly quotes or revised allocations requested by consultants.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[9px]">
                  <th className="py-2.5 px-4 font-bold">Ticket details</th>
                  <th className="py-2.5 px-4 font-bold">Resource</th>
                  <th className="py-2.5 px-4 font-bold text-center">Type</th>
                  <th className="py-2.5 px-4 font-bold text-center">Current estimate</th>
                  <th className="py-2.5 px-4 font-bold text-center">Proposed estimate</th>
                  <th className="py-2.5 px-4 font-bold">Remarks / Justification</th>
                  <th className="py-2.5 px-4 font-bold">Date submitted</th>
                  <th className="py-2.5 px-4 font-bold text-right">Review action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {pendingEstimates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400 italic">No estimates pending manager approval.</td>
                  </tr>
                ) : (
                  pendingEstimates.map((est) => (
                    <tr key={est.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3 px-4 font-mono">
                        <Link href={`/manager/tickets/${est.ticketId}`} className="font-bold text-zinc-900 hover:underline">{est.ticketNumber}</Link>
                        <div className="text-[10px] text-zinc-500 truncate max-w-[200px] mt-0.5">{est.ticketTitle}</div>
                        <div className="flex gap-1.5 mt-1">
                          <span className="text-[8px] px-1 bg-zinc-100 border border-zinc-200 text-zinc-600 rounded font-bold uppercase">{est.sapModule}</span>
                          <span className="text-[8px] px-1 bg-zinc-100 border border-zinc-200 text-zinc-600 rounded font-bold uppercase">{est.priority}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-800">{est.consultantId}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={`border font-bold uppercase text-[8px] py-0 px-1.5 ${
                          est.status === 'Submitted'
                            ? 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                            : 'bg-blue-50 text-blue-700 border-blue-250 hover:bg-blue-100'
                        }`}>
                          {est.status === 'Submitted' ? 'Initial quote' : 'Revision request'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-zinc-500 font-bold">
                        {est.status === 'Submitted' ? '-' : `${est.originalHours}h`}
                      </td>
                      <td className="py-3 px-4 text-center bg-zinc-50/50">
                        <div className="font-bold text-zinc-950">{est.totalEstimatedHours}h</div>
                        <div className="text-[8px] text-zinc-400 font-semibold">Func: {est.functionalEstimatedHours}h | Tech: {est.technicalEstimatedHours}h</div>
                      </td>
                      <td className="py-3 px-4 text-zinc-600 max-w-[220px] truncate" title={est.remarks}>{est.remarks}</td>
                      <td className="py-3 px-4 text-zinc-550">{new Date(est.submittedAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveEstimate(est.ticketId, est.id)}
                            className="inline-flex items-center justify-center p-1 bg-white border border-zinc-200 text-emerald-600 hover:bg-emerald-50 rounded transition"
                            title="Approve Estimate"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => triggerRejectionModal('estimate', est.ticketId, est.id, est.ticketNumber)}
                            className="inline-flex items-center justify-center p-1 bg-white border border-zinc-200 text-red-655 hover:bg-red-50 rounded transition"
                            title="Reject Estimate"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* --- TAB 2: ACTUAL HOURS CONTENT --- */}
      {activeTab === 'actual' && (
        <div className="space-y-4">
          <div className="flex border-b border-zinc-200 gap-1 bg-zinc-100/50 p-1 rounded-md max-w-sm">
            {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setTimesheetFilter(st)}
                className={`flex-1 text-center py-1 px-3.5 font-bold uppercase text-[9px] rounded transition ${
                  timesheetFilter === st 
                    ? 'bg-white text-zinc-950 shadow-sm font-extrabold border border-zinc-200' 
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Card className="border border-zinc-200 shadow-sm">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-150">
              <CardTitle className="text-zinc-900 font-bold uppercase text-[11px]">Timesheet Logs Review</CardTitle>
              <CardDescription className="text-zinc-500 text-[10px]">Verify and approve actual daily support efforts submitted by consultants.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[9px]">
                    <th className="py-2.5 px-4 font-bold">Ticket Details</th>
                    <th className="py-2.5 px-4 font-bold">Consultant</th>
                    <th className="py-2.5 px-4 font-bold">Work Date</th>
                    <th className="py-2.5 px-4 font-bold text-center">Activity Type</th>
                    <th className="py-2.5 px-4 font-bold">Effort Description</th>
                    <th className="py-2.5 px-4 font-bold text-center">Hours</th>
                    <th className="py-2.5 px-4 font-bold text-center">Billing</th>
                    <th className="py-2.5 px-4 font-bold text-right">Status / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-[11px]">
                  {filteredTimesheetLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-400 italic">No effort log entries match this filter.</td>
                    </tr>
                  ) : (
                    filteredTimesheetLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-4 font-mono">
                          <Link href={`/manager/tickets/${log.ticketId}`} className="font-bold text-zinc-900 hover:underline">{log.ticketNumber}</Link>
                          <div className="text-[10px] text-zinc-500 truncate max-w-[155px] mt-0.5">{log.ticketTitle}</div>
                          <div className="text-[9px] text-zinc-400 mt-0.5">{log.organization}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-zinc-800">{log.consultantName}</td>
                        <td className="py-3 px-4 text-zinc-600">{log.activityDate}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-700 rounded font-bold uppercase text-[8px]">{log.activityType}</span>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 max-w-[200px] truncate" title={log.description}>{log.description}</td>
                        <td className="py-3 px-4 text-center font-bold text-zinc-950 bg-zinc-50/50">{log.hoursLogged.toFixed(1)}h</td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span className={log.billable ? 'text-emerald-700' : 'text-zinc-450'}>
                            {log.billable ? 'Billable' : 'Internal'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          {log.status === 'Pending' || log.status === 'Pending Approval' || log.status === 'Resubmitted' ? (
                            <div className="flex justify-end items-center gap-1.5">
                              {log.status === 'Resubmitted' && (
                                <span className="text-[8px] bg-blue-50 border border-blue-200 text-blue-700 px-1 py-0.5 rounded font-black uppercase animate-pulse mr-1">RESUB</span>
                              )}
                              <button
                                onClick={() => handleApproveTimesheet(log.ticketId, log.id)}
                                className="inline-flex items-center justify-center p-1 bg-white border border-zinc-200 text-emerald-600 hover:bg-emerald-50 rounded transition"
                                title="Approve Timesheet"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={() => triggerRejectionModal('timesheet', log.ticketId, log.id, log.ticketNumber)}
                                className="inline-flex items-center justify-center p-1 bg-white border border-zinc-200 text-red-655 hover:bg-red-50 rounded transition"
                                title="Reject Timesheet"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <span className={`text-[9px] uppercase tracking-wider ${
                              log.status === 'Approved' ? 'text-emerald-600' : 'text-red-500'
                            }`}>
                              {log.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- TAB 3: CLOSURE REQUESTS CONTENT --- */}
      {activeTab === 'closures' && (
        <Card className="border border-zinc-200 shadow-sm">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-150">
            <CardTitle className="text-zinc-900 font-bold uppercase text-[11px]">Closure Approvals Workspace</CardTitle>
            <CardDescription className="text-zinc-500 text-[10px]">Review estimates vs actual efforts before approving the final closure of the ticket.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[9px]">
                  <th className="py-2.5 px-4 font-bold">Ticket Details</th>
                  <th className="py-2.5 px-4 font-bold">Lead Consultant</th>
                  <th className="py-2.5 px-4 font-bold">Efforts Audit (Estimated vs Actual)</th>
                  <th className="py-2.5 px-4 font-bold">Resolution & Root Cause Details</th>
                  <th className="py-2.5 px-4 font-bold">Submitted Date</th>
                  <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {closureRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400 italic">No closure requests pending approval.</td>
                  </tr>
                ) : (
                  closureRequests.map((req) => {
                    const funcVariance = req.functionalActualHours - req.estimatedFuncHours;
                    const techVariance = req.technicalActualHours - req.estimatedTechHours;
                    const totalVariance = req.totalActualHours - req.estimatedTotalHours;
                    
                    return (
                      <tr key={req.id} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-4 font-mono align-top">
                          <Link href={`/manager/tickets/${req.ticketId}`} className="font-bold text-zinc-900 hover:underline">{req.ticketNumber}</Link>
                          <div className="text-[10px] text-zinc-500 truncate max-w-[150px] mt-0.5">{req.ticketTitle}</div>
                          <div className="text-[9px] text-zinc-400 mt-0.5">{req.organization}</div>
                          {req.status === 'Resubmitted' && (
                            <span className="inline-block mt-1 text-[8px] bg-blue-50 border border-blue-200 text-blue-700 px-1 py-0.5 rounded font-black uppercase">Resubmitted</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-zinc-800 align-top">{req.requestedBy}</td>
                        <td className="py-3 px-4 align-top w-[320px]">
                          <div className="space-y-1.5 border border-zinc-200 rounded p-2 bg-zinc-50/50">
                            
                            {/* Per-Consultant Breakdown */}
                            {req.perConsultantEfforts && req.perConsultantEfforts.length > 0 && (
                              <div className="mb-1.5">
                                <span className="text-[8px] text-zinc-500 font-bold uppercase block mb-1">Per-Consultant Breakdown</span>
                                <table className="w-full text-[9px] border-collapse">
                                  <thead>
                                    <tr className="text-zinc-500 font-bold uppercase border-b border-zinc-200">
                                      <th className="py-0.5 text-left">Consultant</th>
                                      <th className="py-0.5 text-center">Type</th>
                                      <th className="py-0.5 text-right">Logged</th>
                                      <th className="py-0.5 text-right">Quoted</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-100">
                                    {req.perConsultantEfforts.map((eff: any, idx: number) => (
                                      <tr key={eff.id || idx}>
                                        <td className="py-0.5 font-semibold text-zinc-900">{eff.consultantName}</td>
                                        <td className="py-0.5 text-center text-zinc-500">{eff.consultantType}</td>
                                        <td className="py-0.5 text-right font-bold text-zinc-900">{eff.actualHours}h</td>
                                        <td className="py-0.5 text-right text-zinc-600">{eff.estimatedHours}h</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Functional Hours Comparison */}
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-zinc-500 font-bold">Functional:</span>
                              <div className="space-x-1.5">
                                <span className="text-zinc-600">{req.estimatedFuncHours}h est</span>
                                <span className="text-zinc-400">→</span>
                                <span className="font-bold text-zinc-900">{req.functionalActualHours}h act</span>
                                <span className={`font-black ${funcVariance > 0 ? 'text-red-650' : 'text-emerald-700'}`}>
                                  ({funcVariance >= 0 ? `+${funcVariance}` : funcVariance}h)
                                </span>
                              </div>
                            </div>

                            {/* Technical Hours Comparison */}
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-zinc-500 font-bold">Technical:</span>
                              <div className="space-x-1.5">
                                <span className="text-zinc-600">{req.estimatedTechHours}h est</span>
                                <span className="text-zinc-400">→</span>
                                <span className="font-bold text-zinc-900">{req.technicalActualHours}h act</span>
                                <span className={`font-black ${techVariance > 0 ? 'text-red-650' : 'text-emerald-700'}`}>
                                  ({techVariance >= 0 ? `+${techVariance}` : techVariance}h)
                                </span>
                              </div>
                            </div>
                            
                            <hr className="border-t border-zinc-200" />
                            
                            {/* Total Hours Comparison */}
                            <div className="flex items-center justify-between text-[10px] font-extrabold">
                              <span className="text-zinc-800 font-bold">Total Effort:</span>
                              <div className="space-x-1.5">
                                <span className="text-zinc-600">{req.estimatedTotalHours}h est</span>
                                <span className="text-zinc-400">→</span>
                                <span className="font-black text-zinc-950">{req.totalActualHours}h act</span>
                                <span className={`font-black px-1 rounded ${totalVariance > 0 ? 'bg-red-50 text-red-650' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {totalVariance >= 0 ? `+${totalVariance}` : totalVariance}h
                                </span>
                              </div>
                            </div>

                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-650 space-y-1 align-top max-w-[280px]">
                          <div><strong className="text-zinc-700">Root Cause:</strong> <span className="text-zinc-600 font-semibold">{req.rootCause}</span></div>
                          <div><strong className="text-zinc-700">Resolution:</strong> <span className="text-emerald-700 font-semibold">{req.resolutionSummary}</span></div>
                          <div><strong className="text-zinc-700">Work completed:</strong> <span className="text-zinc-600 font-mono text-[10px]">{req.workCompletedSummary}</span></div>
                          {req.pendingItems && (
                            <div className="text-[10px] bg-amber-50/50 border border-amber-100 rounded p-1 text-amber-800">
                              <strong>Pending:</strong> {req.pendingItems}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-zinc-550 align-top">{new Date(req.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right align-top">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveClosure(req.ticketId, req.id)}
                              className="inline-flex items-center justify-center p-1 bg-white border border-zinc-200 text-emerald-600 hover:bg-emerald-50 rounded transition"
                              title="Approve Closure"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => triggerRejectionModal('closure', req.ticketId, req.id, req.ticketNumber)}
                              className="inline-flex items-center justify-center p-1 bg-white border border-zinc-200 text-red-655 hover:bg-red-50 rounded transition"
                              title="Reject Closure Request"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* --- TAB 4: REOPEN REQUESTS CONTENT --- */}
      {activeTab === 'reopens' && (
        <Card className="border border-zinc-200 shadow-sm">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-150">
            <CardTitle className="text-zinc-900 font-bold uppercase text-[11px]">Reopened Tickets Audit Center</CardTitle>
            <CardDescription className="text-zinc-500 text-[10px]">Review client reopens, investigate issues, and authorize resumption or reject and enforce closure.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[9px]">
                  <th className="py-2.5 px-4 font-bold">Ticket Details</th>
                  <th className="py-2.5 px-4 font-bold text-center">Reopen Index</th>
                  <th className="py-2.5 px-4 font-bold">Reopened By</th>
                  <th className="py-2.5 px-4 font-bold">Client Reopen Justification</th>
                  <th className="py-2.5 px-4 font-bold">Reopen Date</th>
                  <th className="py-2.5 px-4 font-bold text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {reopenRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400 italic">No tickets with pending reopen requests.</td>
                  </tr>
                ) : (
                  reopenRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3 px-4 font-mono">
                        <Link href={`/manager/tickets/${req.id}`} className="font-bold text-zinc-900 hover:underline">{req.ticketNumber}</Link>
                        <div className="text-[10px] text-zinc-500 truncate max-w-[200px] mt-0.5">{req.title}</div>
                        <div className="flex gap-1.5 mt-1">
                          <span className="text-[8px] px-1 bg-zinc-100 border border-zinc-200 text-zinc-600 rounded font-bold uppercase">{req.sapModule}</span>
                          <span className="text-[8px] px-1 bg-zinc-100 border border-zinc-200 text-zinc-600 rounded font-bold uppercase">{req.priority}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50 font-bold">
                          {req.reopenedCount}x Reopened
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-800">{req.reopenedBy}</td>
                      <td className="py-3 px-4 text-zinc-650 max-w-[320px] font-mono leading-relaxed bg-zinc-50/20 p-2 rounded border border-zinc-100" style={{ whiteSpace: 'pre-wrap' }}>
                        {req.reason}
                      </td>
                      <td className="py-3 px-4 text-zinc-550">{new Date(req.reopenedAt).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveReopen(req.id)}
                            className="inline-flex items-center gap-1 py-1 px-2.5 bg-white border border-zinc-200 text-emerald-600 hover:bg-emerald-50 rounded transition font-bold text-[9px] uppercase"
                            title="Approve Reopen (Resume Work)"
                          >
                            <RotateCcw size={11} />
                            <span>Resume</span>
                          </button>
                          <button
                            onClick={() => triggerRejectionModal('reopen', req.id, req.id, req.ticketNumber)}
                            className="inline-flex items-center gap-1 py-1 px-2.5 bg-white border border-zinc-200 text-red-655 hover:bg-red-50 rounded transition font-bold text-[9px] uppercase"
                            title="Reject Reopen & Close"
                          >
                            <X size={11} />
                            <span>Close</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* --- TAB 5: UNLOCK REQUESTS CONTENT --- */}
      {activeTab === 'unlocks' && (
        <Card className="border border-zinc-200 shadow-sm">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-150">
            <CardTitle className="text-zinc-900 font-bold uppercase text-[11px]">Work Log Unlock Requests</CardTitle>
            <CardDescription className="text-zinc-500 text-[10px]">Approve timesheet lock releases to allow retrospective hours correction.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[9px]">
                  <th className="py-2.5 px-4 font-bold">Ticket Details</th>
                  <th className="py-2.5 px-4 font-bold">Consultant</th>
                  <th className="py-2.5 px-4 font-bold">Reason for Unlock Request</th>
                  <th className="py-2.5 px-4 font-bold">Proposed Corrections</th>
                  <th className="py-2.5 px-4 font-bold">Additional Remarks</th>
                  <th className="py-2.5 px-4 font-bold">Requested At</th>
                  <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {unlockRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 italic">No unlock requests pending.</td>
                  </tr>
                ) : (
                  unlockRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3 px-4 font-mono">
                        <Link href={`/manager/tickets/${req.ticketId}`} className="font-bold text-zinc-900 hover:underline">{req.ticketNumber}</Link>
                        <div className="text-[10px] text-zinc-500 truncate max-w-[150px] mt-0.5">{req.ticketTitle}</div>
                        <div className="text-[9px] text-zinc-400 mt-0.5">{req.organization}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-800">{req.requestedBy}</td>
                      <td className="py-3 px-4 font-bold text-zinc-950 max-w-[180px] truncate" title={req.reason}>{req.reason}</td>
                      <td className="py-3 px-4 text-zinc-700 max-w-[200px] truncate font-mono text-[10px]" title={req.requestedChange}>{req.requestedChange}</td>
                      <td className="py-3 px-4 text-zinc-600 max-w-[150px] truncate" title={req.remarks}>{req.remarks || '-'}</td>
                      <td className="py-3 px-4 text-zinc-550">{new Date(req.createdAt).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveUnlock(req.ticketId, req.id)}
                            className="inline-flex items-center justify-center p-1 bg-white border border-zinc-200 text-emerald-600 hover:bg-emerald-50 rounded transition"
                            title="Approve Unlock"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => triggerRejectionModal('unlock', req.ticketId, req.id, req.ticketNumber)}
                            className="inline-flex items-center justify-center p-1 bg-white border border-zinc-200 text-red-655 hover:bg-red-50 rounded transition"
                            title="Reject Unlock"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
 
      {/* --- TAB 6: OTHER REQUESTS CONTENT --- */}
      {activeTab === 'others' && (
        <Card className="border border-zinc-200 shadow-sm">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-150">
            <CardTitle className="text-zinc-900 font-bold uppercase text-[11px]">Soft Delete Requests</CardTitle>
            <CardDescription className="text-zinc-500 text-[10px]">Approve or reject soft delete / archive requests submitted by operations staff.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[9px]">
                  <th className="py-2.5 px-4 font-bold">Ticket Details</th>
                  <th className="py-2.5 px-4 font-bold">Requested By</th>
                  <th className="py-2.5 px-4 font-bold">Reason for Delete</th>
                  <th className="py-2.5 px-4 font-bold">Requested At</th>
                  <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {pendingDeletes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-400 italic">No delete requests pending.</td>
                  </tr>
                ) : (
                  pendingDeletes.map((req) => (
                    <tr key={req.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3 px-4 font-mono">
                        <Link href={`/manager/tickets/${req.ticketId}`} className="font-bold text-zinc-900 hover:underline">{req.ticketNumber}</Link>
                        <div className="text-[10px] text-zinc-500 truncate max-w-[200px] mt-0.5">{req.ticketTitle}</div>
                        <div className="flex gap-1.5 mt-1">
                          <span className="text-[8px] px-1 bg-zinc-100 border border-zinc-200 text-zinc-650 rounded font-bold uppercase">{req.sapModule}</span>
                          <span className="text-[8px] px-1 bg-zinc-100 border border-zinc-200 text-zinc-650 rounded font-bold uppercase">{req.priority}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-800">{req.requestedBy}</td>
                      <td className="py-3 px-4 text-zinc-700 max-w-[300px] truncate" title={req.reason}>{req.reason}</td>
                      <td className="py-3 px-4 text-zinc-550">{new Date(req.requestedAt).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveDelete(req.ticketId, req.id)}
                            className="inline-flex items-center justify-center p-1 bg-white border border-zinc-200 text-emerald-600 hover:bg-emerald-50 rounded transition"
                            title="Approve Delete Request"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => triggerRejectionModal('delete', req.ticketId, req.id, req.ticketNumber)}
                            className="inline-flex items-center justify-center p-1 bg-white border border-zinc-200 text-red-655 hover:bg-red-50 rounded transition"
                            title="Reject Delete Request"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* --- MANDATORY REJECTION COMMENT STATE-DRIVEN DIALOG MODAL --- */}
      {rejectionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
          <div className="bg-white border border-zinc-250 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 font-mono text-xs text-zinc-950">
            
            <div className="flex items-center gap-2 text-zinc-900 font-bold uppercase text-[11px] pb-2 border-b border-zinc-150">
              <AlertTriangle size={14} className="text-zinc-600" />
              <span>Mandatory Rejection Comment</span>
            </div>

            <div className="space-y-1">
              <p className="text-zinc-600 font-medium">
                You are rejecting a submission for ticket <strong className="text-zinc-950">{rejectionModal.ticketNumber}</strong>.
              </p>
              <p className="text-[10px] text-zinc-550">
                 rejections require a mandatory justification. Your reasoning will be logged in the permanent audit history and emailed directly to the consultant.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-zinc-700 uppercase">Reason for Rejection</label>
              <textarea
                value={rejectionModal.rejectionReason}
                onChange={(e) => setRejectionModal({ ...rejectionModal, rejectionReason: e.target.value })}
                placeholder="Detail specifically what details are incorrect, or what needs to be revised..."
                className="w-full h-24 p-2 bg-white border border-zinc-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950 placeholder:text-zinc-400"
                maxLength={400}
                required
              />
              <div className="text-right text-[9px] text-zinc-400">
                {rejectionModal.rejectionReason.length}/400 characters max
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-150">
              <button
                onClick={() => setRejectionModal({ ...rejectionModal, isOpen: false })}
                className="py-1.5 px-3 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 font-bold transition uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectionSubmit}
                disabled={!rejectionModal.rejectionReason.trim()}
                className={`py-1.5 px-3 rounded font-bold transition uppercase text-white ${
                  rejectionModal.rejectionReason.trim()
                    ? 'bg-red-650 hover:bg-red-700'
                    : 'bg-zinc-300 cursor-not-allowed text-zinc-500'
                }`}
              >
                Submit Rejection
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
