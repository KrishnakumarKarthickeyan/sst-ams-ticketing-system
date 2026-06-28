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

          const requestLogs = (ticket.actualHoursLogs || []).filter((ah: any) => ah.closureRequestId === req.id);
          const hasLogs = requestLogs.length > 0;
          const functionalActualHours = hasLogs
            ? requestLogs.filter((ah: any) => ah.consultantType === 'Functional').reduce((sum, ah) => sum + ah.actualHours, 0)
            : req.functionalActualHours;
          const technicalActualHours = hasLogs
            ? requestLogs.filter((ah: any) => ah.consultantType === 'Technical').reduce((sum, ah) => sum + ah.actualHours, 0)
            : req.technicalActualHours;
          const totalActualHours = hasLogs
            ? (functionalActualHours + technicalActualHours)
            : req.totalActualHours;

          // Re-map perConsultantEfforts for this specific closure request
          const perConsultantEfforts = (ticket.consultantEfforts || []).filter(e => !e.isDeleted).map(e => {
            const actLog = requestLogs.find((ah: any) => ah.consultantId === e.consultantId);
            return {
              ...e,
              actualHours: actLog ? actLog.actualHours : 0
            };
          });

          return {
            ...req,
            functionalActualHours,
            technicalActualHours,
            totalActualHours,
            ticketTitle: ticket.title,
            sapModule: ticket.sapModule,
            organization: ticket.organization,
            priority: ticket.priority,
            quotedHours: ticket.quotedHours || 0,
            ticketNumber: ticket.ticketNumber || ticket.id,
            estimatedFuncHours: latestApprovedEstimate?.functionalEstimatedHours || 0,
            estimatedTechHours: latestApprovedEstimate?.technicalEstimatedHours || 0,
            estimatedTotalHours: latestApprovedEstimate?.totalEstimatedHours || ticket.quotedHours || 0,
            perConsultantEfforts
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
    <div className="space-y-6 text-xs text-ink">
      
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <Link href="/manager/dashboard" className="inline-flex items-center gap-1.5 text-ink-secondary hover:text-ink transition">
          <ArrowLeft size={13} />
          <span>Dashboard Cockpit</span>
        </Link>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-subtle text-ink-secondary border border-line rounded text-[11px] font-bold uppercase tracking-wider">
          <Shield size={12} className="text-ink-secondary" />
          <span>Operations Control</span>
        </div>
      </div>

      {/* Main Title Section */}
      <div className="border-b border-line pb-4">
        <h1 className="type-title text-ink">Manager Approvals Workspace</h1>
        <p className="text-ink-secondary mt-1">Audit, approve, or reject effort allocations, timesheets, ticket closures, and reopen requests.</p>
        {user?.company && user.company !== 'Assist360 Operations' && (
          <span className="inline-block mt-2 px-2.5 py-0.5 bg-surface-subtle text-ink-secondary border border-line rounded font-bold uppercase text-[11px]">
            Enterprise Scope: {user.company}
          </span>
        )}
      </div>

      {/* 6-Tab Navigation Bar */}
      <div className="flex border-b border-line overflow-x-auto whitespace-nowrap bg-surface-muted/60 p-0.5 rounded-lg border">
        {/* Estimated Hours tab hidden as estimates do not require approval */}
        {/* <button
          type="button"
          onClick={() => setActiveTab('estimated')}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[11px] rounded transition ${
            activeTab === 'estimated' 
              ? 'bg-surface text-ink shadow-card border border-line font-extrabold' 
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <span>Estimated Hours</span>
          <Badge className="bg-zinc-200 text-ink hover:bg-surface-subtle border-none font-bold px-1.5 py-0">
            {pendingEstimates.length}
          </Badge>
        </button> */}
 
        <button
          type="button"
          onClick={() => setActiveTab('actual')}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[11px] rounded transition ${
            activeTab === 'actual' 
              ? 'bg-surface text-ink shadow-card border border-line font-extrabold' 
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <span>Actual Hours</span>
          <Badge className="bg-zinc-200 text-ink hover:bg-surface-subtle border-none font-bold px-1.5 py-0">
            {timesheetLogs.filter(l => l.status === 'Pending' || l.status === 'Pending Approval' || l.status === 'Resubmitted').length}
          </Badge>
        </button>
 
        <button
          type="button"
          onClick={() => setActiveTab('closures')}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[11px] rounded transition ${
            activeTab === 'closures' 
              ? 'bg-surface text-ink shadow-card border border-line font-extrabold' 
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <span>Closures</span>
          <Badge className="bg-zinc-200 text-ink hover:bg-surface-subtle border-none font-bold px-1.5 py-0">
            {closureRequests.length}
          </Badge>
        </button>
 
        <button
          type="button"
          onClick={() => setActiveTab('reopens')}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[11px] rounded transition ${
            activeTab === 'reopens' 
              ? 'bg-surface text-ink shadow-card border border-line font-extrabold' 
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <span>Reopen Requests</span>
          <Badge className="bg-zinc-200 text-ink hover:bg-surface-subtle border-none font-bold px-1.5 py-0">
            {reopenRequests.length}
          </Badge>
        </button>
 
        <button
          type="button"
          onClick={() => setActiveTab('unlocks')}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[11px] rounded transition ${
            activeTab === 'unlocks' 
              ? 'bg-surface text-ink shadow-card border border-line font-extrabold' 
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <span>Unlocks</span>
          <Badge className="bg-zinc-200 text-ink hover:bg-surface-subtle border-none font-bold px-1.5 py-0">
            {unlockRequests.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('others')}
          className={`flex items-center gap-2 py-2 px-4 font-bold uppercase text-[11px] rounded transition ${
            activeTab === 'others' 
              ? 'bg-surface text-ink shadow-card border border-line font-extrabold' 
              : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <span>Other Requests</span>
          <Badge className="bg-zinc-200 text-ink hover:bg-surface-subtle border-none font-bold px-1.5 py-0">
            {pendingDeletes.length}
          </Badge>
        </button>
      </div>

      {/* --- TAB 1: ESTIMATED HOURS CONTENT --- */}
      {activeTab === 'estimated' && (
        <Card className="border border-line shadow-card">
          <CardHeader className="bg-surface-muted/60 border-b border-line">
            <CardTitle className="text-ink font-bold uppercase text-[11px]">Estimate Allocation Reviews</CardTitle>
            <CardDescription className="text-ink-secondary text-[11px]">Approve initial hourly quotes or revised allocations requested by consultants.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted/70 border-b border-line text-ink-secondary font-bold uppercase text-[11px]">
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
              <tbody className="divide-y divide-line text-[11px]">
                {pendingEstimates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-ink-muted italic">No estimates pending manager approval.</td>
                  </tr>
                ) : (
                  pendingEstimates.map((est) => (
                    <tr key={est.id} className="hover:bg-surface-muted/60 transition">
                      <td className="py-3 px-4">
                        <Link href={`/manager/tickets/${est.ticketId}`} className="font-bold text-ink hover:underline">{est.ticketNumber}</Link>
                        <div className="text-[11px] text-ink-secondary truncate max-w-[200px] mt-0.5">{est.ticketTitle}</div>
                        <div className="flex gap-1.5 mt-1">
                          <span className="text-[11px] px-1 bg-surface-subtle border border-line text-ink-secondary rounded font-bold uppercase">{est.sapModule}</span>
                          <span className="text-[11px] px-1 bg-surface-subtle border border-line text-ink-secondary rounded font-bold uppercase">{est.priority}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-ink">{est.consultantId}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={`border font-bold uppercase text-[11px] py-0 px-1.5 ${
                          est.status === 'Submitted'
                            ? 'bg-surface-muted text-ink-secondary border-line hover:bg-surface-subtle'
                            : 'bg-brand-soft text-brand-strong border-blue-250 hover:bg-blue-100'
                        }`}>
                          {est.status === 'Submitted' ? 'Initial quote' : 'Revision request'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-ink-secondary font-bold">
                        {est.status === 'Submitted' ? '-' : `${est.originalHours}h`}
                      </td>
                      <td className="py-3 px-4 text-center bg-surface-muted/60">
                        <div className="font-bold text-ink">{est.totalEstimatedHours}h</div>
                        <div className="text-[11px] text-ink-muted font-semibold">Func: {est.functionalEstimatedHours}h | Tech: {est.technicalEstimatedHours}h</div>
                      </td>
                      <td className="py-3 px-4 text-ink-secondary max-w-[220px] truncate" title={est.remarks}>{est.remarks}</td>
                      <td className="py-3 px-4 text-ink-secondary">{new Date(est.submittedAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveEstimate(est.ticketId, est.id)}
                            className="inline-flex items-center justify-center p-1 bg-surface border border-line text-success hover:bg-success-soft rounded transition"
                            title="Approve Estimate"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={() => triggerRejectionModal('estimate', est.ticketId, est.id, est.ticketNumber)}
                            className="inline-flex items-center justify-center p-1 bg-surface border border-line text-critical hover:bg-critical-soft rounded transition"
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
          <div className="flex border-b border-line gap-1 bg-surface-subtle/50 p-1 rounded-md max-w-sm">
            {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setTimesheetFilter(st)}
                className={`flex-1 text-center py-1 px-3.5 font-bold uppercase text-[11px] rounded transition ${
                  timesheetFilter === st 
                    ? 'bg-surface text-ink shadow-card font-extrabold border border-line' 
                    : 'text-ink-secondary hover:text-ink-secondary'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Card className="border border-line shadow-card">
            <CardHeader className="bg-surface-muted/60 border-b border-line">
              <CardTitle className="text-ink font-bold uppercase text-[11px]">Timesheet Logs Review</CardTitle>
              <CardDescription className="text-ink-secondary text-[11px]">Verify and approve actual daily support efforts submitted by consultants.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-muted/70 border-b border-line text-ink-secondary font-bold uppercase text-[11px]">
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
                <tbody className="divide-y divide-line text-[11px]">
                  {filteredTimesheetLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-ink-muted italic">No effort log entries match this filter.</td>
                    </tr>
                  ) : (
                    filteredTimesheetLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-muted/60 transition">
                        <td className="py-3 px-4">
                          <Link href={`/manager/tickets/${log.ticketId}`} className="font-bold text-ink hover:underline">{log.ticketNumber}</Link>
                          <div className="text-[11px] text-ink-secondary truncate max-w-[155px] mt-0.5">{log.ticketTitle}</div>
                          <div className="text-[11px] text-ink-muted mt-0.5">{log.organization}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-ink">{log.consultantName}</td>
                        <td className="py-3 px-4 text-ink-secondary">{log.activityDate}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 bg-surface-subtle border border-line text-ink-secondary rounded font-bold uppercase text-[11px]">{log.activityType}</span>
                        </td>
                        <td className="py-3 px-4 text-ink-secondary max-w-[200px] truncate" title={log.description}>{log.description}</td>
                        <td className="py-3 px-4 text-center font-bold text-ink bg-surface-muted/60">{log.hoursLogged.toFixed(1)}h</td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span className={log.billable ? 'text-success-strong' : 'text-ink-muted'}>
                            {log.billable ? 'Billable' : 'Internal'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          {log.status === 'Pending' || log.status === 'Pending Approval' || log.status === 'Resubmitted' ? (
                            <div className="flex justify-end items-center gap-1.5">
                              {log.status === 'Resubmitted' && (
                                <span className="text-[11px] bg-brand-soft border border-brand-border text-brand-strong px-1 py-0.5 rounded font-black uppercase animate-pulse mr-1">RESUB</span>
                              )}
                              <button
                                onClick={() => handleApproveTimesheet(log.ticketId, log.id)}
                                className="inline-flex items-center justify-center p-1 bg-surface border border-line text-success hover:bg-success-soft rounded transition"
                                title="Approve Timesheet"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={() => triggerRejectionModal('timesheet', log.ticketId, log.id, log.ticketNumber)}
                                className="inline-flex items-center justify-center p-1 bg-surface border border-line text-critical hover:bg-critical-soft rounded transition"
                                title="Reject Timesheet"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <span className={`text-[11px] uppercase tracking-wider ${
                              log.status === 'Approved' ? 'text-success' : 'text-critical'
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
        <Card className="border border-line shadow-card">
          <CardHeader className="bg-surface-muted/60 border-b border-line">
            <CardTitle className="text-ink font-bold uppercase text-[11px]">Closure Approvals Workspace</CardTitle>
            <CardDescription className="text-ink-secondary text-[11px]">Review estimates vs actual efforts before approving the final closure of the ticket.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted/70 border-b border-line text-ink-secondary font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-4 font-bold">Ticket Details</th>
                  <th className="py-2.5 px-4 font-bold">Lead Consultant</th>
                  <th className="py-2.5 px-4 font-bold">Efforts Audit (Estimated vs Actual)</th>
                  <th className="py-2.5 px-4 font-bold">Resolution & Root Cause Details</th>
                  <th className="py-2.5 px-4 font-bold">Submitted Date</th>
                  <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[11px]">
                {closureRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ink-muted italic">No closure requests pending approval.</td>
                  </tr>
                ) : (
                  closureRequests.map((req) => {
                    const funcVariance = req.functionalActualHours - req.estimatedFuncHours;
                    const techVariance = req.technicalActualHours - req.estimatedTechHours;
                    const totalVariance = req.totalActualHours - req.estimatedTotalHours;
                    
                    return (
                      <tr key={req.id} className="hover:bg-surface-muted/60 transition">
                        <td className="py-3 px-4 align-top">
                          <Link href={`/manager/tickets/${req.ticketId}`} className="font-bold text-ink hover:underline">{req.ticketNumber}</Link>
                          <div className="text-[11px] text-ink-secondary truncate max-w-[150px] mt-0.5">{req.ticketTitle}</div>
                          <div className="text-[11px] text-ink-muted mt-0.5">{req.organization}</div>
                          {req.status === 'Resubmitted' && (
                            <span className="inline-block mt-1 text-[11px] bg-brand-soft border border-brand-border text-brand-strong px-1 py-0.5 rounded font-black uppercase">Resubmitted</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-ink align-top">{req.requestedBy}</td>
                        <td className="py-3 px-4 align-top w-[320px]">
                          <div className="space-y-1.5 border border-line rounded p-2 bg-surface-muted/60">
                            
                            {/* Per-Consultant Breakdown */}
                            {req.perConsultantEfforts && req.perConsultantEfforts.length > 0 && (
                              <div className="mb-1.5">
                                <span className="text-[11px] text-ink-secondary font-bold uppercase block mb-1">Per-Consultant Breakdown</span>
                                <table className="w-full text-[11px] border-collapse">
                                  <thead>
                                    <tr className="text-ink-secondary font-bold uppercase border-b border-line">
                                      <th className="py-0.5 text-left">Consultant</th>
                                      <th className="py-0.5 text-center">Type</th>
                                      <th className="py-0.5 text-right">Logged</th>
                                      <th className="py-0.5 text-right">Quoted</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-line">
                                    {req.perConsultantEfforts.map((eff: any, idx: number) => (
                                      <tr key={eff.id || idx}>
                                        <td className="py-0.5 font-semibold text-ink">
                                          {eff.consultantName}{eff.isPrimary ? ' (Lead)' : ''}
                                        </td>
                                        <td className="py-0.5 text-center text-ink-secondary">{eff.consultantType}</td>
                                        <td className="py-0.5 text-right font-bold text-ink">{eff.actualHours}h</td>
                                        <td className="py-0.5 text-right text-ink-secondary">{eff.estimatedHours}h</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Functional Hours Comparison */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-ink-secondary font-bold">Functional:</span>
                              <div className="space-x-1.5">
                                <span className="text-ink-secondary">{req.estimatedFuncHours}h est</span>
                                <span className="text-ink-muted">→</span>
                                <span className="font-bold text-ink">{req.functionalActualHours}h act</span>
                                <span className={`font-black ${funcVariance > 0 ? 'text-critical' : 'text-success-strong'}`}>
                                  ({funcVariance >= 0 ? `+${funcVariance}` : funcVariance}h)
                                </span>
                              </div>
                            </div>

                            {/* Technical Hours Comparison */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-ink-secondary font-bold">Technical:</span>
                              <div className="space-x-1.5">
                                <span className="text-ink-secondary">{req.estimatedTechHours}h est</span>
                                <span className="text-ink-muted">→</span>
                                <span className="font-bold text-ink">{req.technicalActualHours}h act</span>
                                <span className={`font-black ${techVariance > 0 ? 'text-critical' : 'text-success-strong'}`}>
                                  ({techVariance >= 0 ? `+${techVariance}` : techVariance}h)
                                </span>
                              </div>
                            </div>
                            
                            <hr className="border-t border-line" />
                            
                            {/* Total Hours Comparison */}
                            <div className="flex items-center justify-between text-[11px] font-extrabold">
                              <span className="text-ink font-bold">Total Effort:</span>
                              <div className="space-x-1.5">
                                <span className="text-ink-secondary">{req.estimatedTotalHours}h est</span>
                                <span className="text-ink-muted">→</span>
                                <span className="font-black text-ink">{req.totalActualHours}h act</span>
                                <span className={`font-black px-1 rounded ${totalVariance > 0 ? 'bg-critical-soft text-critical' : 'bg-success-soft text-success-strong'}`}>
                                  {totalVariance >= 0 ? `+${totalVariance}` : totalVariance}h
                                </span>
                              </div>
                            </div>

                          </div>
                        </td>
                        <td className="py-3 px-4 text-ink-secondary space-y-1 align-top max-w-[280px]">
                          <div><strong className="text-ink-secondary">Root Cause:</strong> <span className="text-ink-secondary font-semibold">{req.rootCause}</span></div>
                          <div><strong className="text-ink-secondary">Resolution:</strong> <span className="text-success-strong font-semibold">{req.resolutionSummary}</span></div>
                          <div><strong className="text-ink-secondary">Work completed:</strong> <span className="text-ink-secondary text-[11px]">{req.workCompletedSummary}</span></div>
                          {req.pendingItems && (
                            <div className="text-[11px] bg-warning-soft/50 border border-amber-100 rounded p-1 text-amber-800">
                              <strong>Pending:</strong> {req.pendingItems}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-ink-secondary align-top">{new Date(req.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right align-top">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveClosure(req.ticketId, req.id)}
                              className="inline-flex items-center justify-center p-1 bg-surface border border-line text-success hover:bg-success-soft rounded transition"
                              title="Approve Closure"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => triggerRejectionModal('closure', req.ticketId, req.id, req.ticketNumber)}
                              className="inline-flex items-center justify-center p-1 bg-surface border border-line text-critical hover:bg-critical-soft rounded transition"
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
        <Card className="border border-line shadow-card">
          <CardHeader className="bg-surface-muted/60 border-b border-line">
            <CardTitle className="text-ink font-bold uppercase text-[11px]">Reopened Tickets Audit Center</CardTitle>
            <CardDescription className="text-ink-secondary text-[11px]">Review client reopens, investigate issues, and authorize resumption or reject and enforce closure.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted/70 border-b border-line text-ink-secondary font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-4 font-bold">Ticket Details</th>
                  <th className="py-2.5 px-4 font-bold text-center">Reopen Index</th>
                  <th className="py-2.5 px-4 font-bold">Reopened By</th>
                  <th className="py-2.5 px-4 font-bold">Client Reopen Justification</th>
                  <th className="py-2.5 px-4 font-bold">Reopen Date</th>
                  <th className="py-2.5 px-4 font-bold text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[11px]">
                {reopenRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ink-muted italic">No tickets with pending reopen requests.</td>
                  </tr>
                ) : (
                  reopenRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-surface-muted/60 transition">
                      <td className="py-3 px-4">
                        <Link href={`/manager/tickets/${req.id}`} className="font-bold text-ink hover:underline">{req.ticketNumber}</Link>
                        <div className="text-[11px] text-ink-secondary truncate max-w-[200px] mt-0.5">{req.title}</div>
                        <div className="flex gap-1.5 mt-1">
                          <span className="text-[11px] px-1 bg-surface-subtle border border-line text-ink-secondary rounded font-bold uppercase">{req.sapModule}</span>
                          <span className="text-[11px] px-1 bg-surface-subtle border border-line text-ink-secondary rounded font-bold uppercase">{req.priority}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-critical-soft text-critical-strong border border-critical-border hover:bg-critical-soft font-bold">
                          {req.reopenedCount}x Reopened
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-bold text-ink">{req.reopenedBy}</td>
                      <td className="py-3 px-4 text-ink-secondary max-w-[320px] leading-relaxed bg-surface-muted/20 p-2 rounded border border-line" style={{ whiteSpace: 'pre-wrap' }}>
                        {req.reason}
                      </td>
                      <td className="py-3 px-4 text-ink-secondary">{new Date(req.reopenedAt).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveReopen(req.id)}
                            className="inline-flex items-center gap-1 py-1 px-2.5 bg-surface border border-line text-success hover:bg-success-soft rounded transition font-bold text-[11px] uppercase"
                            title="Approve Reopen (Resume Work)"
                          >
                            <RotateCcw size={11} />
                            <span>Resume</span>
                          </button>
                          <button
                            onClick={() => triggerRejectionModal('reopen', req.id, req.id, req.ticketNumber)}
                            className="inline-flex items-center gap-1 py-1 px-2.5 bg-surface border border-line text-critical hover:bg-critical-soft rounded transition font-bold text-[11px] uppercase"
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
        <Card className="border border-line shadow-card">
          <CardHeader className="bg-surface-muted/60 border-b border-line">
            <CardTitle className="text-ink font-bold uppercase text-[11px]">Work Log Unlock Requests</CardTitle>
            <CardDescription className="text-ink-secondary text-[11px]">Approve timesheet lock releases to allow retrospective hours correction.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted/70 border-b border-line text-ink-secondary font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-4 font-bold">Ticket Details</th>
                  <th className="py-2.5 px-4 font-bold">Consultant</th>
                  <th className="py-2.5 px-4 font-bold">Reason for Unlock Request</th>
                  <th className="py-2.5 px-4 font-bold">Proposed Corrections</th>
                  <th className="py-2.5 px-4 font-bold">Additional Remarks</th>
                  <th className="py-2.5 px-4 font-bold">Requested At</th>
                  <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[11px]">
                {unlockRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-ink-muted italic">No unlock requests pending.</td>
                  </tr>
                ) : (
                  unlockRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-surface-muted/60 transition">
                      <td className="py-3 px-4">
                        <Link href={`/manager/tickets/${req.ticketId}`} className="font-bold text-ink hover:underline">{req.ticketNumber}</Link>
                        <div className="text-[11px] text-ink-secondary truncate max-w-[150px] mt-0.5">{req.ticketTitle}</div>
                        <div className="text-[11px] text-ink-muted mt-0.5">{req.organization}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-ink">{req.requestedBy}</td>
                      <td className="py-3 px-4 font-bold text-ink max-w-[180px] truncate" title={req.reason}>{req.reason}</td>
                      <td className="py-3 px-4 text-ink-secondary max-w-[200px] truncate text-[11px]" title={req.requestedChange}>{req.requestedChange}</td>
                      <td className="py-3 px-4 text-ink-secondary max-w-[150px] truncate" title={req.remarks}>{req.remarks || '-'}</td>
                      <td className="py-3 px-4 text-ink-secondary">{new Date(req.createdAt).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveUnlock(req.ticketId, req.id)}
                            className="inline-flex items-center justify-center p-1 bg-surface border border-line text-success hover:bg-success-soft rounded transition"
                            title="Approve Unlock"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => triggerRejectionModal('unlock', req.ticketId, req.id, req.ticketNumber)}
                            className="inline-flex items-center justify-center p-1 bg-surface border border-line text-critical hover:bg-critical-soft rounded transition"
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
        <Card className="border border-line shadow-card">
          <CardHeader className="bg-surface-muted/60 border-b border-line">
            <CardTitle className="text-ink font-bold uppercase text-[11px]">Soft Delete Requests</CardTitle>
            <CardDescription className="text-ink-secondary text-[11px]">Approve or reject soft delete / archive requests submitted by operations staff.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted/70 border-b border-line text-ink-secondary font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-4 font-bold">Ticket Details</th>
                  <th className="py-2.5 px-4 font-bold">Requested By</th>
                  <th className="py-2.5 px-4 font-bold">Reason for Delete</th>
                  <th className="py-2.5 px-4 font-bold">Requested At</th>
                  <th className="py-2.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[11px]">
                {pendingDeletes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-ink-muted italic">No delete requests pending.</td>
                  </tr>
                ) : (
                  pendingDeletes.map((req) => (
                    <tr key={req.id} className="hover:bg-surface-muted/60 transition">
                      <td className="py-3 px-4">
                        <Link href={`/manager/tickets/${req.ticketId}`} className="font-bold text-ink hover:underline">{req.ticketNumber}</Link>
                        <div className="text-[11px] text-ink-secondary truncate max-w-[200px] mt-0.5">{req.ticketTitle}</div>
                        <div className="flex gap-1.5 mt-1">
                          <span className="text-[11px] px-1 bg-surface-subtle border border-line text-ink-secondary rounded font-bold uppercase">{req.sapModule}</span>
                          <span className="text-[11px] px-1 bg-surface-subtle border border-line text-ink-secondary rounded font-bold uppercase">{req.priority}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-ink">{req.requestedBy}</td>
                      <td className="py-3 px-4 text-ink-secondary max-w-[300px] truncate" title={req.reason}>{req.reason}</td>
                      <td className="py-3 px-4 text-ink-secondary">{new Date(req.requestedAt).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveDelete(req.ticketId, req.id)}
                            className="inline-flex items-center justify-center p-1 bg-surface border border-line text-success hover:bg-success-soft rounded transition"
                            title="Approve Delete Request"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => triggerRejectionModal('delete', req.ticketId, req.id, req.ticketNumber)}
                            className="inline-flex items-center justify-center p-1 bg-surface border border-line text-critical hover:bg-critical-soft rounded transition"
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
          <div className="bg-surface border border-line rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 text-xs text-ink">
            
            <div className="flex items-center gap-2 text-ink font-bold uppercase text-[11px] pb-2 border-b border-line">
              <AlertTriangle size={14} className="text-ink-secondary" />
              <span>Mandatory Rejection Comment</span>
            </div>

            <div className="space-y-1">
              <p className="text-ink-secondary font-medium">
                You are rejecting a submission for ticket <strong className="text-ink">{rejectionModal.ticketNumber}</strong>.
              </p>
              <p className="text-[11px] text-ink-secondary">
                 rejections require a mandatory justification. Your reasoning will be logged in the permanent audit history and emailed directly to the consultant.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-ink-secondary uppercase">Reason for Rejection</label>
              <textarea
                value={rejectionModal.rejectionReason}
                onChange={(e) => setRejectionModal({ ...rejectionModal, rejectionReason: e.target.value })}
                placeholder="Detail specifically what details are incorrect, or what needs to be revised..."
                className="w-full h-24 p-2 bg-surface border border-line-strong rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 placeholder:text-ink-muted"
                maxLength={400}
                required
              />
              <div className="text-right text-[11px] text-ink-muted">
                {rejectionModal.rejectionReason.length}/400 characters max
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                onClick={() => setRejectionModal({ ...rejectionModal, isOpen: false })}
                className="py-1.5 px-3 border border-line rounded text-ink-secondary hover:bg-surface-muted font-bold transition uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectionSubmit}
                disabled={!rejectionModal.rejectionReason.trim()}
                className={`py-1.5 px-3 rounded font-bold transition uppercase text-white ${
                  rejectionModal.rejectionReason.trim()
                    ? 'bg-red-650 hover:bg-critical-strong'
                    : 'bg-zinc-300 cursor-not-allowed text-ink-secondary'
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
