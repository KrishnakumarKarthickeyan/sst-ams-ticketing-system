'use client';

import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, TicketPriority, SAPModule, IssueCategory, Comment, EffortLog, AuditHistory, EffortActivityType, Attachment } from '../../types/ticket';
import { useTickets } from '../../context/TicketContext';
import { useAuth } from '../../context/AuthContext';
import { SlaBadge } from './SlaBadge';
import { TicketTimeline } from './TicketTimeline';
import {
  ArrowLeft,
  Clock,
  Layers,
  Check,
  AlertTriangle,
  Building2,
  FileCode,
  Tag,
  Paperclip,
  Plus,
  Cpu,
  User,
  ShieldCheck,
  CheckCircle,
  Copy,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

interface TicketDetailsViewProps {
  ticketId: string;
  role: 'SuperAdmin' | 'Manager' | 'Consultant' | 'Customer';
}

export const TicketDetailsView: React.FC<TicketDetailsViewProps> = ({ ticketId, role }) => {
  const { user } = useAuth();
  const {
    tickets,
    addComment,
    logEffort,
    approveEffortLog,
    resolveTicket,
    approveClosure,
    closeTicket,
    reopenTicket,
    escalateTicket,
    updateTransportRequest,
    assignTicket,
    getChatResponse
  } = useTickets();

  const ticket = tickets.find((t) => t.id === ticketId);

  // Form States
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [hours, setHours] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [effortDesc, setEffortDesc] = useState('');
  const [activityType, setActivityType] = useState<EffortActivityType>('Analysis');
  const [billable, setBillable] = useState(true);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState('');

  // Resolution States
  const [rootCause, setRootCause] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [transportRequest, setTransportRequest] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenForm, setShowReopenForm] = useState(false);

  // AI Copilot States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCause, setAiCause] = useState('');
  const [aiResolution, setAiResolution] = useState('');

  // Assignment States
  const [assigneeConsultant, setAssigneeConsultant] = useState('');
  const [assigneeManager, setAssigneeManager] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    if (ticket) {
      setRootCause(ticket.rootCause || '');
      setResolutionSummary(ticket.resolutionSummary || '');
      setTransportRequest(ticket.transportRequest || '');
      setAssigneeConsultant(ticket.assignedConsultant || '');
      setAssigneeManager(ticket.assignedManager || '');
    }
  }, [ticket]);

  if (!ticket) {
    return (
      <div className="p-8 text-center text-red-600 font-bold font-mono">
        Error: Ticket Registry Mismatch
      </div>
    );
  }

  const isInternal = role !== 'Customer';
  const consultantsList = ['Karthik Subramanian', 'Elena Rostova', 'Rajesh Kumar'];
  const managersList = ['Marcus Vance', 'System Operations'];

  // Total Hours calculation helpers
  const calculateTotalHours = (start: string, end: string): number => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const diffMin = (eh * 60 + em) - (sh * 60 + sm);
      return diffMin > 0 ? Number((diffMin / 60).toFixed(2)) : 0;
    } catch {
      return 0;
    }
  };

  const calculatedHours = calculateTotalHours(startTime, endTime);

  const showBannerMessage = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  // Handlers
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const files = uploadFileName ? [{ fileName: uploadFileName, fileSize: Number(uploadFileSize) || 120000, fileType: 'application/octet-stream' }] : undefined;

    addComment(
      ticket.id,
      commentText,
      user?.name || role,
      user?.email || '',
      role,
      isInternalComment && isInternal,
      files
    );

    setCommentText('');
    setUploadFileName('');
    setUploadFileSize('');
    showBannerMessage('Comment response successfully added to the ticket timeline.');
  };

  const handleLogEffortSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedHours <= 0 || !effortDesc.trim()) return;

    logEffort({
      ticketId: ticket.id,
      hours: calculatedHours,
      startTime,
      endTime,
      description: effortDesc,
      consultantName: user?.name || 'Karthik Subramanian',
      activityType,
      billable
    });

    setEffortDesc('');
    showBannerMessage('Timesheet effort log successfully logged and queued for manager approval.');
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootCause.trim() || !resolutionSummary.trim()) return;

    resolveTicket(ticket.id, rootCause, resolutionSummary, user?.name || role);
    showBannerMessage('Ticket has been marked as Resolved. Client verification is now required.');
  };

  const handleAssignmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    assignTicket(ticket.id, assigneeManager || undefined, assigneeConsultant || undefined, user?.name || role);
    showBannerMessage('Ticket allocation updated. Resource assignments logged on the timeline.');
  };

  const handleCloseConfirm = () => {
    closeTicket(ticket.id, 5, 'Client closure verification.', user?.name || 'Customer');
    showBannerMessage('Ticket closure verified and confirmed. Satisfaction score recorded.');
  };

  const handleReopenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;

    reopenTicket(ticket.id, reopenReason, user?.name || role);
    setReopenReason('');
    setShowReopenForm(false);
    showBannerMessage('Ticket successfully reopened and returned to active backlog.');
  };

  const runAiCopilot = async () => {
    setAiLoading(true);
    const res = await getChatResponse(ticket.sapModule, ticket.description);
    setAiCause(res.suggestedRootCause || 'Configuration record missing.');
    setAiResolution(res.suggestedResolution || 'Rerun SPRO condition check.');
    setAiLoading(false);
  };

  // Color mappings
  const getPriorityColor = (prio: TicketPriority) => {
    if (prio === 'Critical') return 'bg-red-100 text-red-800 border-red-200';
    if (prio === 'High') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-zinc-100 text-zinc-800 border-zinc-200';
  };

  const getStatusColor = (status: TicketStatus) => {
    if (status === 'Resolved' || status === 'Closed') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'Waiting for Customer' || status === 'Waiting for Internal Team') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (status === 'New') return 'bg-zinc-100 text-zinc-950 border-zinc-950 font-bold';
    return 'bg-zinc-100 text-zinc-800 border-zinc-200';
  };

  // Filter out internal comments for customer role
  const visibleComments = ticket.comments.filter(c => !c.isInternal || isInternal);
  const visibleAttachments = ticket.attachments.filter(a => a.visibility === 'public' || isInternal);

  // Similar incidents
  const similarTickets = tickets.filter(t => t.sapModule === ticket.sapModule && t.id !== ticket.id);

  // Hours logged summaries
  const totalEffortsCount = ticket.efforts.reduce((acc, e) => acc + e.hoursLogged, 0);

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-500 rounded p-4 flex items-start gap-3 text-emerald-800 animate-in fade-in slide-in-from-top-1 duration-200">
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider block">SUCCESS</span>
            <p className="mt-1 leading-normal text-[11px] font-mono">{successBanner}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessBanner(null)} 
            className="text-emerald-600 hover:text-emerald-800 font-bold font-mono text-[10px] uppercase cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* SLA Alert banner */}
      {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && new Date(ticket.slaDueAt).getTime() < Date.now() && (
        <div className="bg-red-50 border border-red-500 rounded p-4 flex items-start gap-3 text-red-800 animate-pulse">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider block">CRITICAL ALERT: SLA Breach Incident</span>
            <p className="mt-1 leading-normal text-[11px]">This ticket has crossed its resolution boundary target. Immediate intervention is required by functional leads.</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Summary & Conversations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Summary Panel */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap gap-4 text-[10px] border-b border-zinc-100 pb-3 font-bold text-zinc-400 uppercase tracking-wider">
              <span className="flex items-center gap-1"><Building2 size={12} /> {ticket.organization}</span>
              <span>Requested By: {ticket.requestedBy}</span>
              <span className="flex items-center gap-1"><Tag size={12} /> {ticket.category}</span>
              <span className="text-zinc-650 bg-zinc-100 px-1 rounded font-mono">Source: {ticket.source}</span>
            </div>
            <h2 className="font-bold text-sm text-zinc-950 leading-snug">{ticket.title}</h2>
            <p className="text-zinc-700 leading-relaxed text-[11px] whitespace-pre-wrap">{ticket.description}</p>

            {/* Attachments */}
            {visibleAttachments.length > 0 && (
              <div className="border-t border-zinc-100 pt-3.5 space-y-2">
                <span className="font-bold text-[9px] uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Paperclip size={11} /> Incident Attachments ({visibleAttachments.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {visibleAttachments.map(att => (
                    <a
                      key={att.id}
                      href="#"
                      onClick={(e) => { e.preventDefault(); showBannerMessage(`Simulated download: "${att.fileName}" retrieved successfully from Supabase bucket.`); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-200 hover:border-zinc-950 rounded bg-zinc-50 font-semibold text-[10px] text-zinc-700 transition"
                    >
                      <FileCode size={12} />
                      {att.fileName} ({(att.fileSize / 1024).toFixed(0)}kb)
                      {att.visibility === 'internal' && (
                        <span className="text-[8px] bg-red-100 text-red-800 px-1 rounded">INTERNAL</span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Resolutions summary if ready */}
          {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
            <div className="bg-white border border-green-500 rounded-lg p-5 space-y-3.5 shadow-sm text-green-950">
              <h3 className="font-bold text-xs uppercase tracking-wider text-green-900 border-b border-green-200 pb-2">
                Resolution Auditing
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="font-bold text-green-800 uppercase text-[9px] block">Root Cause Mapped:</span>
                  <p className="mt-1 leading-relaxed text-[11px]">{ticket.rootCause}</p>
                </div>
                <div>
                  <span className="font-bold text-green-800 uppercase text-[9px] block">Resolution Steps Summary:</span>
                  <p className="mt-1 leading-relaxed text-[11px]">{ticket.resolutionSummary}</p>
                </div>
                {ticket.transportRequest && (
                  <div>
                    <span className="font-bold text-green-800 uppercase text-[9px] block">SAP Transport Request linked:</span>
                    <span className="inline-block mt-1 font-mono font-bold text-green-900 border border-green-500 px-2 py-0.5 rounded text-[10px] bg-green-50">
                      {ticket.transportRequest}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline and conversations */}
          <div className="space-y-6">
            <TicketTimeline ticket={ticket} />

            {/* Comment Form */}
            {ticket.status !== 'Closed' && (
              <form onSubmit={handleCommentSubmit} className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-zinc-150 pb-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-950">Post Reply Conversation</h4>
                  {isInternal && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="commentTypeToggle"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="rounded text-zinc-950 focus:ring-zinc-950"
                      />
                      <label htmlFor="commentTypeToggle" className="font-bold text-zinc-600 uppercase text-[9px] select-none">
                        Flag as Internal Note (Customer Restricted)
                      </label>
                    </div>
                  )}
                </div>

                <textarea
                  required
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={isInternalComment ? "Type internal note visible only to support staff..." : "Type reply to customer..."}
                  className="w-full bg-white border border-zinc-200 rounded p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
                />

                {/* Upload attachment tool mockup */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[9px]">Attach File Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. error_log.txt"
                      value={uploadFileName}
                      onChange={(e) => setUploadFileName(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-955 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[9px]">File Size in Bytes</label>
                    <input
                      type="number"
                      placeholder="e.g. 100000"
                      value={uploadFileSize}
                      onChange={(e) => setUploadFileSize(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-955 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase tracking-wider text-[10px]"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* Right Side: Parameters, Effort sheets, AI resolutions, Actions */}
        <div className="space-y-6">
          
          {/* Status Attributes */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-955 border-b border-zinc-150 pb-2">
              Incident Metadata
            </h3>
            <div className="space-y-2.5 text-zinc-700">
              <div className="flex justify-between">
                <span>SAP Module:</span>
                <span className="font-black text-zinc-950 font-mono">{ticket.sapModule}</span>
              </div>
              <div className="flex justify-between">
                <span>Status Flag:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Severity Priority:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>
              <div className="flex justify-between text-[10px] border-t border-zinc-100 pt-2.5">
                <span>Consultant Lead:</span>
                <span className="font-bold text-zinc-950">{ticket.assignedConsultant || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Escalation Status:</span>
                <span className={`font-bold ${ticket.escalationFlag ? 'text-red-600 animate-pulse' : 'text-zinc-400'}`}>
                  {ticket.escalationFlag ? 'ESCALATED' : 'NOMINAL'}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Assignment Form (For Admin and Managers) */}
          {isInternal && (
            <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-955 border-b border-zinc-150 pb-2 flex items-center gap-1.5">
                <Layers size={14} />
                Incident Allocation
              </h3>

              <form onSubmit={handleAssignmentSubmit} className="space-y-3">
                {/* Manager Select (Admin only) */}
                {role === 'SuperAdmin' && (
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[9px]">Operations Manager</label>
                    <select
                      value={assigneeManager}
                      onChange={(e) => setAssigneeManager(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-950 font-mono focus:outline-none"
                    >
                      <option value="">Unassigned</option>
                      {managersList.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Consultant Select (Admin and Manager scoped) */}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase text-[9px]">Assigned Consultant</label>
                  <select
                    value={assigneeConsultant}
                    onChange={(e) => setAssigneeConsultant(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-955 font-mono focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {consultantsList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[10px] tracking-wider transition"
                >
                  Allocate Resources
                </button>
              </form>
            </div>
          )}

          {/* Effort logs section (Internal only) */}
          {isInternal && (
            <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-955 border-b border-zinc-150 pb-2 flex items-center justify-between">
                <span>Effort Logs Sheet</span>
                <span className="text-[10px] bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 rounded font-mono">
                  {totalEffortsCount.toFixed(2)}h total
                </span>
              </h3>

              {/* Effort list with approval status and action */}
              <div className="divide-y divide-zinc-200 max-h-48 overflow-y-auto">
                {ticket.efforts.length === 0 ? (
                  <p className="text-zinc-400 py-3 italic">No hours logged against this incident.</p>
                ) : (
                  ticket.efforts.map((log) => {
                    const isPending = log.status === 'Pending';
                    const isApproved = log.status === 'Approved';
                    const isRejected = log.status === 'Rejected';

                    return (
                      <div key={log.id} className="py-2.5 space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-zinc-800 block text-[11px]">{log.consultantName}</span>
                            <span className="text-zinc-450 block truncate max-w-[150px]">{log.description}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold font-mono text-zinc-950 block">+{log.hoursLogged} hrs</span>
                            <span className={`text-[8px] uppercase font-bold tracking-wider px-1 rounded block mt-0.5 ${
                              isApproved ? 'bg-green-100 text-green-800' :
                              isRejected ? 'bg-red-100 text-red-800 animate-pulse' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                        </div>

                        {/* Manager approval control actions */}
                        {isPending && (role === 'Manager' || role === 'SuperAdmin') && (
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              onClick={() => approveEffortLog(ticket.id, log.id, 'Rejected', user?.name || role)}
                              className="px-2 py-0.5 border border-red-500 hover:bg-red-50 text-red-800 rounded font-bold text-[9px] uppercase tracking-wider"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => approveEffortLog(ticket.id, log.id, 'Approved', user?.name || role)}
                              className="px-2 py-0.5 bg-green-950 text-white hover:bg-green-800 rounded font-bold text-[9px] uppercase tracking-wider"
                            >
                              Approve
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Log new effort panel */}
              {ticket.status !== 'Closed' && ticket.status !== 'Resolved' && (
                <form onSubmit={handleLogEffortSubmit} className="space-y-3 pt-3 border-t border-zinc-150 border-dashed">
                  <span className="font-bold text-zinc-500 uppercase text-[9px] block">Log working effort</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-zinc-400 uppercase">Start Time</label>
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded p-1 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-zinc-400 uppercase">End Time</label>
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded p-1 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 bg-zinc-50 p-1.5 rounded border border-zinc-200">
                    <span>Calculated Total:</span>
                    <span className="font-mono text-zinc-950">{calculatedHours} Hours</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-zinc-400 uppercase">Activity Type</label>
                      <select
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value as any)}
                        className="w-full bg-white border border-zinc-200 rounded p-1 text-xs focus:outline-none"
                      >
                        <option value="Analysis">Analysis</option>
                        <option value="Configuration">Configuration</option>
                        <option value="Development">Development</option>
                        <option value="Testing">Testing</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Documentation">Documentation</option>
                        <option value="Support">Support</option>
                      </select>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-zinc-400 uppercase">Billing Status</label>
                      <select
                        value={billable ? 'true' : 'false'}
                        onChange={(e) => setBillable(e.target.value === 'true')}
                        className="w-full bg-white border border-zinc-200 rounded p-1 text-xs focus:outline-none"
                      >
                        <option value="true">Billable (AMS)</option>
                        <option value="false">Non-Billable</option>
                      </select>
                    </div>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Work details description..."
                    value={effortDesc}
                    onChange={(e) => setEffortDesc(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-955 focus:outline-none"
                  />

                  <button
                    type="submit"
                    disabled={calculatedHours <= 0}
                    className="w-full py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[9px] tracking-wider disabled:opacity-50"
                  >
                    Submit effort log
                  </button>
                </form>
              )}
            </div>
          )}

          {/* AI resolving Suggestions (Internal only) */}
          {isInternal && ticket.status !== 'Closed' && ticket.status !== 'Resolved' && (
            <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-955 border-b border-zinc-150 pb-2 flex items-center justify-between">
                <span>AI Resolver advisory</span>
                <span className="text-[8px] bg-zinc-950 text-white font-mono px-1 rounded animate-pulse">COPILOT</span>
              </h3>

              <button
                onClick={runAiCopilot}
                disabled={aiLoading}
                className="w-full py-1.5 border border-zinc-950 hover:bg-zinc-950 hover:text-white rounded font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition"
              >
                {aiLoading ? 'Prompting AI Model...' : 'Draft resolution suggestions'}
              </button>

              {(aiCause || aiResolution) && (
                <div className="space-y-3 bg-zinc-50 border border-zinc-200 rounded p-3 text-[11px] leading-relaxed">
                  <div>
                    <span className="font-bold text-zinc-900 uppercase text-[9px] block">AI Root Cause Suggestion:</span>
                    <p className="text-zinc-500 mt-0.5">{aiCause}</p>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900 uppercase text-[9px] block">AI Resolution Steps:</span>
                    <p className="text-zinc-500 mt-0.5">{aiResolution}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action console for closure / reopens */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-955 border-b border-zinc-150 pb-2">
              Action Desk
            </h3>

            {/* Resolve Form */}
            {isInternal && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
              <form onSubmit={handleResolveSubmit} className="space-y-3">
                <span className="font-bold text-zinc-500 uppercase text-[9px] block">Resolve Ticket</span>
                <input
                  type="text"
                  required
                  placeholder="Root Cause description..."
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-955 focus:outline-none"
                />
                <textarea
                  required
                  rows={2}
                  placeholder="Resolution summary steps..."
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-955 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="SAP Transport Request (e.g. DEVK900123)"
                  value={transportRequest}
                  onChange={(e) => setTransportRequest(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-955 focus:outline-none"
                />

                <button
                  type="submit"
                  className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-bold rounded uppercase tracking-wider text-[10px]"
                >
                  Resolve Incident
                </button>
              </form>
            )}

            {/* Customer Closure validations */}
            {role === 'Customer' && ticket.status === 'Resolved' && (
              <div className="space-y-4">
                <span className="font-bold text-zinc-500 uppercase text-[9px] block">Awaiting validation</span>
                <button
                  onClick={handleCloseConfirm}
                  className="w-full py-2 bg-green-950 hover:bg-green-800 text-white font-bold rounded uppercase tracking-wider text-[10px]"
                >
                  Approve Resolution (5★ CSAT)
                </button>

                <button
                  onClick={() => setShowReopenForm(!showReopenForm)}
                  className="w-full py-1.5 border border-zinc-200 hover:border-zinc-950 rounded font-bold uppercase tracking-wider text-[10px] text-zinc-800 transition"
                >
                  Reject & Re-open Ticket
                </button>

                {showReopenForm && (
                  <form onSubmit={handleReopenSubmit} className="space-y-2 pt-2 border-t border-zinc-150 border-dashed">
                    <textarea
                      required
                      rows={2}
                      placeholder="Reason for re-opening..."
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-950 font-mono focus:outline-none"
                    />
                    <button type="submit" className="w-full py-1.5 bg-black text-white rounded font-bold uppercase text-[9px] tracking-wider">
                      Reopen Ticket
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Customer Reopen console if closed */}
            {role === 'Customer' && ticket.status === 'Closed' && (
              <div>
                <button
                  onClick={() => setShowReopenForm(!showReopenForm)}
                  className="w-full py-1.5 border border-zinc-250 hover:border-zinc-950 rounded font-bold uppercase tracking-wider text-[10px]"
                >
                  Request Ticket Re-open
                </button>
                {showReopenForm && (
                  <form onSubmit={handleReopenSubmit} className="space-y-2 pt-2 border-t border-zinc-100 mt-2">
                    <textarea
                      required
                      placeholder="Provide reopen reasons..."
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-950 focus:outline-none"
                    />
                    <button type="submit" className="w-full py-1.5 bg-black text-white rounded font-bold uppercase text-[9px] tracking-wider">
                      Confirm Reopen
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Closed Info */}
            {ticket.status === 'Closed' && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-center">
                <span className="font-bold text-zinc-400 uppercase block">Ticket Resolved & Closed</span>
                {ticket.rating && (
                  <div className="mt-2 text-zinc-650 font-semibold">
                    CSAT Score: <span className="font-bold text-green-700">{ticket.rating.score} / 5 ★</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">"{ticket.rating.feedback}"</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Similar Incidents */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-955 border-b border-zinc-150 pb-2">
              Similar Module Incidents
            </h3>
            <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto">
              {similarTickets.length === 0 ? (
                <p className="text-zinc-400 py-3 italic">No historical matches in this module.</p>
              ) : (
                similarTickets.map(t => (
                  <div key={t.id} className="py-2.5 flex justify-between items-center text-[10px] font-semibold">
                    <span className="font-bold text-zinc-700">{t.id}</span>
                    <span className={`px-1.5 py-0.2 rounded uppercase font-bold text-[9px] ${
                      t.status === 'Closed' || t.status === 'Resolved' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-zinc-50 text-zinc-600 border border-zinc-200'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
