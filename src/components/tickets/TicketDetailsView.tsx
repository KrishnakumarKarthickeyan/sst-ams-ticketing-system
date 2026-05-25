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
  ShieldAlert,
  Star,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  X
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
    getChatResponse,
    approveRevisionRequest,
    rejectRevisionRequest,
    approveClosureRequest,
    rejectClosureRequest,
    approveUnlockRequest,
    rejectUnlockRequest,
    updateTicketStatus
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

  // Operational Hub Active Tab
  const [activeHubTab, setActiveHubTab] = useState<'overview' | 'assignments' | 'estimates' | 'actuals' | 'customer'>('overview');

  // Custom Rejection Dialog Modal State
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    type: 'estimate' | 'closure' | 'unlock' | 'reopen';
    targetId: string;
    reason: string;
  }>({
    isOpen: false,
    type: 'estimate',
    targetId: '',
    reason: ''
  });

  // Closure Modal State
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [closureRating, setClosureRating] = useState(5);
  const [closureFeedback, setClosureFeedback] = useState('');

  // Comment Attachments States
  const [commentAttachments, setCommentAttachments] = useState<{
    id: string;
    fileName: string;
    fileSize: number;
    progress: number; // 0 to 100
    isInternal: boolean;
  }[]>([]);
  const [commentAttachmentName, setCommentAttachmentName] = useState('');
  const [commentAttachmentSize, setCommentAttachmentSize] = useState('150'); // in kb
  const [commentAttachmentType, setCommentAttachmentType] = useState('application/pdf');

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
  // Handlers
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && commentAttachments.length === 0) return;

    const files = commentAttachments.length > 0 
      ? commentAttachments.map(f => ({
          fileName: f.fileName,
          fileSize: f.fileSize,
          fileType: f.fileName.split('.').pop() || 'pdf',
          fileUrl: '#'
        }))
      : undefined;

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
    setCommentAttachments([]);
    showBannerMessage('Comment response successfully added to the ticket timeline.');
  };

  const addPendingFile = () => {
    if (!commentAttachmentName.trim()) return;
    const sizeKb = Number(commentAttachmentSize) || 150;
    const newFile = {
      id: `att-${Date.now()}`,
      fileName: commentAttachmentName,
      fileSize: sizeKb * 1024,
      progress: 0,
      isInternal: isInternalComment
    };
    setCommentAttachments(prev => [...prev, newFile]);
    setCommentAttachmentName('');
    
    // Simulate upload progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      setCommentAttachments(prev => 
        prev.map(f => f.id === newFile.id ? { ...f, progress: currentProgress } : f)
      );
      if (currentProgress >= 100) {
        clearInterval(interval);
      }
    }, 100);
  };

  const removePendingFile = (id: string) => {
    setCommentAttachments(prev => prev.filter(f => f.id !== id));
  };

  const triggerRejectionModal = (type: 'estimate' | 'closure' | 'unlock' | 'reopen', targetId: string) => {
    setRejectionModal({
      isOpen: true,
      type,
      targetId,
      reason: ''
    });
  };

  const handleRejectionConfirm = () => {
    const { type, targetId, reason } = rejectionModal;
    if (!reason.trim()) return;

    if (type === 'estimate') {
      rejectRevisionRequest(ticket.id, targetId, user?.name || role, reason);
      showBannerMessage('Hour estimate allocation revision rejected. Comments logged to history.');
    } else if (type === 'closure') {
      rejectClosureRequest(ticket.id, targetId, user?.name || role, reason);
      showBannerMessage('Closure request rejected. Ticket returned to active status.');
    } else if (type === 'unlock') {
      rejectUnlockRequest(ticket.id, targetId, user?.name || role, reason);
      showBannerMessage('Unlock timesheet lock request rejected.');
    } else if (type === 'reopen') {
      closeTicket(ticket.id, 5, `Reopen request rejected: ${reason}`, user?.name || role);
      showBannerMessage('Reopen request rejected. Incident has been re-closed.');
    }

    setRejectionModal({ isOpen: false, type: 'estimate', targetId: '', reason: '' });
  };

  const handleApproveReopen = (tId: string) => {
    updateTicketStatus(tId, 'In Progress', user?.name || role);
    showBannerMessage('Reopen request approved. Incident returned to active development.');
  };

  const handleCloseClick = () => {
    setClosureRating(5);
    setClosureFeedback('');
    setClosureModalOpen(true);
  };

  const handleCloseSubmit = () => {
    closeTicket(ticket.id, closureRating, closureFeedback || 'Verified by Customer', user?.name || role);
    setClosureModalOpen(false);
    showBannerMessage('Ticket closure verified and confirmed. CSAT score recorded.');
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

          {/* Operational Parameters Hub */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
            {/* Tabs Header */}
            <div className="bg-zinc-50 border-b border-zinc-200 flex overflow-x-auto whitespace-nowrap">
              {([
                { id: 'overview', label: 'Incident Overview' },
                { id: 'assignments', label: 'Resource Allocations' },
                { id: 'estimates', label: 'Effort Estimates' },
                { id: 'actuals', label: 'Actuals & Timesheets' },
                { id: 'customer', label: 'Customer SLA profile' }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveHubTab(tab.id)}
                  className={`py-2.5 px-4 font-bold uppercase text-[9px] tracking-wider border-r border-zinc-200 transition ${
                    activeHubTab === tab.id
                      ? 'bg-white text-zinc-955 font-extrabold border-b-2 border-b-zinc-950 shadow-sm'
                      : 'text-zinc-550 hover:bg-zinc-150/30 hover:text-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="p-4 space-y-4 text-xs font-mono">
              {/* --- OVERVIEW TAB --- */}
              {activeHubTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Ticket Type</span>
                      <span className="font-semibold text-zinc-900 mt-0.5 block">{ticket.ticketType || 'Incident'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Issue Classification</span>
                      <span className="font-semibold text-zinc-900 mt-0.5 block">{ticket.category}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">SAP Module</span>
                      <span className="font-bold text-zinc-950 mt-0.5 block font-mono">{ticket.sapModule}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Source Agent</span>
                      <span className="font-semibold text-zinc-900 mt-0.5 block">{ticket.source}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Business Operational Impact</span>
                      <span className="text-zinc-700 leading-normal mt-0.5 block">{ticket.businessImpact || 'No specific impact description provided.'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Expected Resolution Boundary</span>
                      <span className="font-semibold text-zinc-900 mt-0.5 block font-mono">
                        {ticket.expectedResolutionDate ? new Date(ticket.expectedResolutionDate).toLocaleString() : 'TBD (Awaiting estimates)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">SLA Commitment Timeline</span>
                      <span className="font-semibold text-zinc-900 mt-0.5 block font-mono">
                        SLA Due: {new Date(ticket.slaDueAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* --- ASSIGNMENTS TAB --- */}
              {activeHubTab === 'assignments' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-100 pb-3">
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Primary Lead Consultant</span>
                      <span className="font-bold text-zinc-950 mt-0.5 block flex items-center gap-1.5">
                        <User size={12} className="text-zinc-400" />
                        {ticket.assignedConsultant || 'No consultant lead allocated.'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Primary Escalations Manager</span>
                      <span className="font-bold text-zinc-950 mt-0.5 block flex items-center gap-1.5">
                        <User size={12} className="text-zinc-400" />
                        {ticket.assignedManager || 'No manager assigned.'}
                      </span>
                    </div>
                  </div>

                  {/* Multi-resource efforts table */}
                  <div>
                    <span className="text-[9px] text-zinc-450 uppercase font-black tracking-wider block mb-2">Multi-Resource Efforts Roster</span>
                    <div className="border border-zinc-200 rounded overflow-hidden">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-zinc-500">
                          <tr>
                            <th className="py-2 px-3">Consultant Name</th>
                            <th className="py-2 px-3 text-center">Type Allocation</th>
                            <th className="py-2 px-3 text-center">Estimated Hours</th>
                            <th className="py-2 px-3 text-center">Actual Hours</th>
                            <th className="py-2 px-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-150">
                          {(!ticket.consultantEfforts || ticket.consultantEfforts.length === 0) ? (
                            <tr>
                              <td colSpan={5} className="py-3 text-center text-zinc-400 italic">No resources allocated to this incident yet.</td>
                            </tr>
                          ) : (
                            ticket.consultantEfforts.map(eff => (
                              <tr key={eff.id} className="hover:bg-zinc-55/30 transition">
                                <td className="py-2 px-3 font-semibold text-zinc-800">{eff.consultantName}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[8px] ${
                                    eff.consultantType === 'Functional' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-violet-50 text-violet-700 border border-violet-100'
                                  }`}>{eff.consultantType}</span>
                                </td>
                                <td className="py-2 px-3 text-center font-bold text-zinc-900">{eff.estimatedHours}h</td>
                                <td className="py-2 px-3 text-center font-bold text-zinc-955 bg-zinc-50/50">{eff.actualHours}h</td>
                                <td className="py-2 px-3 text-zinc-500 truncate max-w-[150px]">{eff.remarks || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- ESTIMATES TAB --- */}
              {activeHubTab === 'estimates' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Quoted Estimate Budget</span>
                      <span className="font-bold text-zinc-955 text-sm mt-0.5 block font-mono">{ticket.quotedHours || 0} Hours</span>
                    </div>
                  </div>

                  {/* Estimates History and approvals */}
                  <div>
                    <span className="text-[9px] text-zinc-450 uppercase font-black tracking-wider block mb-2">Estimate Approval Ledger</span>
                    <div className="border border-zinc-200 rounded overflow-hidden">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-zinc-500">
                          <tr>
                            <th className="py-2 px-3">Submitted By</th>
                            <th className="py-2 px-3 text-center">Functional Est</th>
                            <th className="py-2 px-3 text-center">Technical Est</th>
                            <th className="py-2 px-3 text-center">Total Est</th>
                            <th className="py-2 px-3">Remarks / Justification</th>
                            <th className="py-2 px-3 text-center">Status</th>
                            {(role === 'Manager' || role === 'SuperAdmin') && <th className="py-2 px-3 text-right">Review Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-150">
                          {(!ticket.hourEstimates || ticket.hourEstimates.length === 0) ? (
                            <tr>
                              <td colSpan={7} className="py-3 text-center text-zinc-400 italic">No hour estimate logs filed.</td>
                            </tr>
                          ) : (
                            ticket.hourEstimates.map(est => {
                              const isPending = est.status === 'Submitted' || est.status === 'Revision Requested';
                              return (
                                <tr key={est.id} className="hover:bg-zinc-55/30 transition">
                                  <td className="py-2 px-3 font-semibold text-zinc-800">{est.consultantId}</td>
                                  <td className="py-2 px-3 text-center font-semibold text-zinc-700">{est.functionalEstimatedHours}h</td>
                                  <td className="py-2 px-3 text-center font-semibold text-zinc-700">{est.technicalEstimatedHours}h</td>
                                  <td className="py-2 px-3 text-center font-bold text-zinc-950 bg-zinc-50/50">{est.totalEstimatedHours}h</td>
                                  <td className="py-2 px-3 text-zinc-550 max-w-[150px] truncate" title={est.remarks}>{est.remarks}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[8px] ${
                                      est.status === 'Revision Approved' || est.status === 'Submitted'
                                        ? 'bg-green-50 text-green-700'
                                        : est.status === 'Revision Rejected'
                                        ? 'bg-red-50 text-red-750'
                                        : 'bg-amber-50 text-amber-700 animate-pulse'
                                    }`}>{est.status}</span>
                                  </td>
                                  {(role === 'Manager' || role === 'SuperAdmin') && (
                                    <td className="py-2 px-3 text-right">
                                      {isPending ? (
                                        <div className="flex justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => approveRevisionRequest(ticket.id, est.id, user?.name || role)}
                                            className="px-2 py-0.5 bg-emerald-950 text-white rounded text-[8px] font-bold uppercase tracking-wider hover:bg-emerald-800 transition"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => triggerRejectionModal('estimate', est.id)}
                                            className="px-2 py-0.5 border border-red-500 text-red-850 hover:bg-red-50 rounded text-[8px] font-bold uppercase tracking-wider transition"
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-zinc-400 font-mono text-[8px] uppercase">Audited</span>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- ACTUALS TAB --- */}
              {activeHubTab === 'actuals' && (
                <div className="space-y-4">
                  {/* Variance Audit Grid */}
                  <div>
                    <span className="text-[9px] text-zinc-450 uppercase font-black tracking-wider block mb-2">Actual vs Estimated Variance Audit</span>
                    <div className="border border-zinc-200 rounded overflow-hidden">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-zinc-500">
                          <tr>
                            <th className="py-2 px-3">Billing Type</th>
                            <th className="py-2 px-3 text-center">Approved Estimates</th>
                            <th className="py-2 px-3 text-center">Actual Logged</th>
                            <th className="py-2 px-3 text-center">Variance Gap</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-150">
                          {(() => {
                            const latestApprovedEst = (ticket.hourEstimates || [])
                              .filter(e => e.status === 'Revision Approved' || e.status === 'Submitted')
                              .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
                            const estFunc = latestApprovedEst?.functionalEstimatedHours || 0;
                            const estTech = latestApprovedEst?.technicalEstimatedHours || 0;
                            
                            const actFunc = (ticket.consultantEfforts || [])
                              .filter(e => e.consultantType === 'Functional')
                              .reduce((sum, e) => sum + e.actualHours, 0);
                            const actTech = (ticket.consultantEfforts || [])
                              .filter(e => e.consultantType === 'Technical')
                              .reduce((sum, e) => sum + e.actualHours, 0);

                            const funcVar = actFunc - estFunc;
                            const techVar = actTech - estTech;
                            
                            return (
                              <>
                                <tr className="hover:bg-zinc-55/30 transition">
                                  <td className="py-2 px-3 font-semibold text-zinc-800">Functional support resource</td>
                                  <td className="py-2 px-3 text-center font-bold">{estFunc}h</td>
                                  <td className="py-2 px-3 text-center font-bold">{actFunc}h</td>
                                  <td className={`py-2 px-3 text-center font-black ${funcVar > 0 ? 'text-red-650' : 'text-emerald-700'}`}>
                                    {funcVar >= 0 ? `+${funcVar}` : funcVar}h
                                  </td>
                                </tr>
                                <tr className="hover:bg-zinc-55/30 transition">
                                  <td className="py-2 px-3 font-semibold text-zinc-800">Technical / development support</td>
                                  <td className="py-2 px-3 text-center font-bold">{estTech}h</td>
                                  <td className="py-2 px-3 text-center font-bold">{actTech}h</td>
                                  <td className={`py-2 px-3 text-center font-black ${techVar > 0 ? 'text-red-650' : 'text-emerald-700'}`}>
                                    {techVar >= 0 ? `+${techVar}` : techVar}h
                                  </td>
                                </tr>
                                <tr className="bg-zinc-50 font-extrabold border-t border-zinc-200">
                                  <td className="py-2.5 px-3 text-zinc-900">Grand total cumulative efforts</td>
                                  <td className="py-2.5 px-3 text-center text-zinc-950 font-black">{(estFunc + estTech)}h</td>
                                  <td className="py-2.5 px-3 text-center text-zinc-955 font-black">{(actFunc + actTech)}h</td>
                                  <td className={`py-2.5 px-3 text-center font-black ${((actFunc + actTech) - (estFunc + estTech)) > 0 ? 'text-red-600 bg-red-50/50' : 'text-emerald-700 bg-emerald-50/50'}`}>
                                    {((actFunc + actTech) - (estFunc + estTech)) >= 0 ? `+${((actFunc + actTech) - (estFunc + estTech))}` : ((actFunc + actTech) - (estFunc + estTech))}h
                                  </td>
                                </tr>
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Closure requests pending */}
                  {ticket.closureRequests && ticket.closureRequests.length > 0 && (
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-black tracking-wider block mb-2">Pending Closure Verification Requests</span>
                      <div className="border border-zinc-200 rounded overflow-hidden">
                        <table className="w-full text-left text-[10px]">
                          <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-zinc-500">
                            <tr>
                              <th className="py-2 px-3">Lead Consultant</th>
                              <th className="py-2 px-3 text-center">Actual Func</th>
                              <th className="py-2 px-3 text-center">Actual Tech</th>
                              <th className="py-2 px-3 text-center">Grand Total</th>
                              <th className="py-2 px-3">Completed Work Summary</th>
                              <th className="py-2 px-3 text-center">Status</th>
                              {(role === 'Manager' || role === 'SuperAdmin') && <th className="py-2 px-3 text-right">Action</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-150">
                            {ticket.closureRequests.map(req => {
                              const isPending = req.status === 'Pending Manager Approval' || req.status === 'Resubmitted';
                              return (
                                <tr key={req.id} className="hover:bg-zinc-55/30 transition">
                                  <td className="py-2 px-3 font-semibold text-zinc-800">{req.requestedBy}</td>
                                  <td className="py-2 px-3 text-center">{req.functionalActualHours}h</td>
                                  <td className="py-2 px-3 text-center">{req.technicalActualHours}h</td>
                                  <td className="py-2 px-3 text-center font-bold text-zinc-950 bg-zinc-50/50">{req.totalActualHours}h</td>
                                  <td className="py-2 px-3 text-zinc-600 truncate max-w-[150px]" title={req.workCompletedSummary}>{req.workCompletedSummary}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[8px] ${
                                      req.status === 'Approved' ? 'bg-green-50 text-green-700' : req.status === 'Rejected' ? 'bg-red-50 text-red-750' : 'bg-amber-50 text-amber-700 animate-pulse'
                                    }`}>{req.status}</span>
                                  </td>
                                  {(role === 'Manager' || role === 'SuperAdmin') && (
                                    <td className="py-2 px-3 text-right">
                                      {isPending ? (
                                        <div className="flex justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => approveClosureRequest(ticket.id, req.id, user?.name || role)}
                                            className="px-2 py-0.5 bg-emerald-950 text-white rounded text-[8px] font-bold uppercase tracking-wider hover:bg-emerald-800 transition"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => triggerRejectionModal('closure', req.id)}
                                            className="px-2 py-0.5 border border-red-500 text-red-800 hover:bg-red-50 rounded text-[8px] font-bold uppercase tracking-wider transition"
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-zinc-400 font-mono text-[8px] uppercase">Audited</span>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Unlock Requests pending */}
                  {ticket.unlockRequests && ticket.unlockRequests.length > 0 && (
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-black tracking-wider block mb-2">Work Log Unlock Requests</span>
                      <div className="border border-zinc-200 rounded overflow-hidden">
                        <table className="w-full text-left text-[10px]">
                          <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-zinc-500">
                            <tr>
                              <th className="py-2 px-3">Requested By</th>
                              <th className="py-2 px-3">Unlock Reason</th>
                              <th className="py-2 px-3">Proposed Correction</th>
                              <th className="py-2 px-3 text-center">Status</th>
                              {(role === 'Manager' || role === 'SuperAdmin') && <th className="py-2 px-3 text-right">Action</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-150">
                            {ticket.unlockRequests.map(req => {
                              const isPending = req.status === 'Pending';
                              return (
                                <tr key={req.id} className="hover:bg-zinc-55/30 transition">
                                  <td className="py-2 px-3 font-semibold text-zinc-800">{req.requestedBy}</td>
                                  <td className="py-2 px-3 text-zinc-650 truncate max-w-[150px]" title={req.reason}>{req.reason}</td>
                                  <td className="py-2 px-3 text-zinc-650 truncate max-w-[150px]" title={req.requestedChange}>{req.requestedChange}</td>
                                  <td className="py-2 px-3 text-center font-bold">
                                    <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[8px] ${
                                      req.status === 'Approved' ? 'bg-green-50 text-green-700' : req.status === 'Rejected' ? 'bg-red-50 text-red-750' : 'bg-amber-50 text-amber-700 animate-pulse'
                                    }`}>{req.status}</span>
                                  </td>
                                  {(role === 'Manager' || role === 'SuperAdmin') && (
                                    <td className="py-2 px-3 text-right">
                                      {isPending ? (
                                        <div className="flex justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => approveUnlockRequest(ticket.id, req.id, user?.name || role)}
                                            className="px-2 py-0.5 bg-emerald-950 text-white rounded text-[8px] font-bold uppercase tracking-wider hover:bg-emerald-800 transition"
                                          >
                                            Approve
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => triggerRejectionModal('unlock', req.id)}
                                            className="px-2 py-0.5 border border-red-500 text-red-800 hover:bg-red-55 rounded text-[8px] font-bold uppercase tracking-wider transition"
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-zinc-400 font-mono text-[8px] uppercase">Audited</span>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* --- CUSTOMER TAB --- */}
              {activeHubTab === 'customer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Company / Client Organization</span>
                      <span className="font-bold text-zinc-950 mt-0.5 block flex items-center gap-1.5">
                        <Building2 size={13} className="text-zinc-450" />
                        {ticket.organization}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Primary Contact Requester</span>
                      <span className="font-semibold text-zinc-900 mt-0.5 block">{ticket.requestedBy}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Contact Email Address</span>
                      <span className="font-mono text-zinc-800 mt-0.5 block text-[10px]">{ticket.requestedByEmail}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Contract SLA Plan</span>
                      <span className="font-black text-zinc-955 mt-0.5 block font-mono">Premium SLA (24x7 Coverage)</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">CSAT Satisfaction Rating Record</span>
                      {ticket.rating ? (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="font-bold text-green-700 flex items-center gap-0.5">
                            {ticket.rating.score} / 5 <Star size={11} className="fill-green-600 text-green-600" />
                          </span>
                          <span className="text-zinc-400 font-mono text-[9px]">"{ticket.rating.feedback}"</span>
                        </div>
                      ) : (
                        <span className="text-zinc-450 italic mt-0.5 block">No rating submitted (ticket open or unresolved)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
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

                {/* Advanced File Upload Simulator */}
                <div className="space-y-2 pt-2 border-t border-zinc-100 mt-2">
                  <span className="font-bold text-zinc-550 uppercase text-[9px] block">Comment Attachments Registry</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="File name (e.g. error_log.txt)..."
                        value={commentAttachmentName}
                        onChange={(e) => setCommentAttachmentName(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-950 focus:outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          placeholder="Size (KB)..."
                          value={commentAttachmentSize}
                          onChange={(e) => setCommentAttachmentSize(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-955 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={addPendingFile}
                          disabled={!commentAttachmentName.trim()}
                          className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded font-bold uppercase text-[9px] tracking-wider disabled:opacity-50 transition cursor-pointer"
                        >
                          Attach
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List of pending attachments with progress bars and visibility toggles */}
                  {commentAttachments.length > 0 && (
                    <div className="space-y-2 border border-zinc-200 rounded p-2.5 bg-zinc-50/50">
                      {commentAttachments.map(file => (
                        <div key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] bg-white border border-zinc-150 p-2 rounded shadow-sm">
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-zinc-850 truncate max-w-[200px]">{file.fileName}</span>
                              <span className="text-zinc-400 font-mono">{(file.fileSize / 1024).toFixed(0)} KB</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full h-1.5 bg-zinc-100 rounded overflow-hidden border border-zinc-250">
                              <div
                                className="h-full bg-zinc-950 rounded-r transition-all duration-350"
                                style={{ width: `${file.progress}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center text-[8px] text-zinc-450 font-bold uppercase">
                              <span>Status: {file.progress < 100 ? `Uploading (${file.progress}%)` : 'Ready'}</span>
                              <span className={file.isInternal ? 'text-red-650' : 'text-emerald-700'}>
                                {file.isInternal ? 'Internal attachment' : 'Public attachment'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCommentAttachments(prev => 
                                  prev.map(f => f.id === file.id ? { ...f, isInternal: !f.isInternal } : f)
                                );
                              }}
                              className="px-2 py-1 border border-zinc-200 rounded text-[9px] hover:bg-zinc-55 uppercase font-semibold cursor-pointer"
                            >
                              {file.isInternal ? 'Make Public' : 'Make Internal'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removePendingFile(file.id)}
                              className="p-1 text-zinc-400 hover:text-red-600 transition cursor-pointer"
                              title="Delete attachment"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                  type="button"
                  onClick={handleCloseClick}
                  className="w-full py-2 bg-green-950 hover:bg-green-800 text-white font-bold rounded uppercase tracking-wider text-[10px]"
                >
                  Confirm Closure & CSAT Rating
                </button>

                <button
                  type="button"
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
                      className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-955 font-mono focus:outline-none"
                    />
                    <button type="submit" className="w-full py-1.5 bg-black text-white rounded font-bold uppercase text-[9px] tracking-wider">
                      Reopen Ticket
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Manager / Admin Closure actions */}
            {(role === 'Manager' || role === 'SuperAdmin') && ticket.status === 'Resolved' && (
              <div className="space-y-3">
                <span className="font-bold text-zinc-500 uppercase text-[9px] block">Administrative Closure</span>
                <button
                  type="button"
                  onClick={handleCloseClick}
                  className="w-full py-2 bg-green-950 hover:bg-green-800 text-white font-bold rounded uppercase tracking-wider text-[10px]"
                >
                  Close Incident (Verify CSAT)
                </button>
              </div>
            )}

            {/* Customer Reopen console if closed */}
            {role === 'Customer' && ticket.status === 'Closed' && (
              <div>
                <button
                  type="button"
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
                      className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-955 focus:outline-none"
                    />
                    <button type="submit" className="w-full py-1.5 bg-black text-white rounded font-bold uppercase text-[9px] tracking-wider">
                      Confirm Reopen
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Manager Reopen Review Desk */}
            {isInternal && ticket.status === 'Reopened' && (role === 'Manager' || role === 'SuperAdmin') && (
              <div className="bg-red-50/50 border border-red-200 rounded p-4 space-y-3">
                <span className="font-bold text-red-800 uppercase text-[9px] flex items-center gap-1">
                  <ShieldAlert size={12} />
                  Reopened Incident Review
                </span>
                
                <div className="text-zinc-700 leading-normal space-y-2 text-[10px]">
                  <div>
                    <strong className="text-zinc-900 uppercase text-[8px] block">Client Reopen Justification:</strong>
                    <p className="mt-0.5 p-1.5 bg-white border border-zinc-200 rounded font-mono">
                      {(() => {
                        const reopenHistory = [...ticket.history]
                          .reverse()
                          .find(h => h.fieldChanged === 'Status' && h.newValue === 'Reopened');
                        const lastCustomerComment = [...ticket.comments]
                          .reverse()
                          .find(c => c.authorRole === 'Customer');
                        return reopenHistory?.oldValue === 'Closed' || reopenHistory?.oldValue === 'Resolved' 
                          ? lastCustomerComment?.content || 'No explanation provided by client.'
                          : 'Client rejected previous resolution verification.';
                      })()}
                    </p>
                  </div>
                  <div>
                    <strong className="text-zinc-900 uppercase text-[8px] block">Previous Resolution Summary:</strong>
                    <p className="mt-0.5 text-zinc-655">{ticket.resolutionSummary || 'None recorded.'}</p>
                  </div>
                  <div>
                    <strong className="text-zinc-900 uppercase text-[8px] block">Previous Root Cause:</strong>
                    <p className="mt-0.5 text-zinc-655">{ticket.rootCause || 'None recorded.'}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApproveReopen(ticket.id)}
                    className="flex-1 py-1.5 bg-zinc-950 text-white rounded font-bold uppercase text-[9px] tracking-wider hover:bg-zinc-800 transition"
                  >
                    Authorize Reopen
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerRejectionModal('reopen', ticket.id)}
                    className="flex-1 py-1.5 border border-red-500 text-red-800 hover:bg-red-50 rounded font-bold uppercase text-[9px] tracking-wider transition"
                  >
                    Reject & Close
                  </button>
                </div>
              </div>
            )}

            {/* Closed Info */}
            {ticket.status === 'Closed' && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-center">
                <span className="font-bold text-zinc-450 uppercase block">Ticket Resolved & Closed</span>
                {ticket.rating && (
                  <div className="mt-2 text-zinc-650 font-semibold text-[10px]">
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

      {/* --- MANDATORY TICKET CLOSURE DIALOG MODAL --- */}
      {closureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
          <div className="bg-white border border-zinc-250 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 font-mono text-xs text-zinc-955 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-2 text-zinc-900 font-bold uppercase text-[11px] pb-2 border-b border-zinc-150">
              <CheckCircle size={14} className="text-green-600" />
              <span>Confirm Ticket Resolution & Closure</span>
            </div>

            <div className="space-y-1">
              <p className="text-zinc-650">
                You are about to close ticket <strong className="text-zinc-955">{ticket.id}</strong>. Once closed, actual efforts are locked and CSAT is finalized.
              </p>
              <p className="text-[10px] text-zinc-500 font-semibold">
                To help maintain quality control standards, rating is strictly mandatory.
              </p>
            </div>

            {/* CSAT Star Rating Selector */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-zinc-600 uppercase">CSAT Satisfaction Rating *</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setClosureRating(star)}
                    className="p-1 hover:scale-110 transition cursor-pointer text-zinc-300 hover:text-amber-500"
                  >
                    <Star
                      size={20}
                      className={star <= closureRating ? 'fill-amber-500 text-amber-500' : 'fill-none text-zinc-300'}
                    />
                  </button>
                ))}
                <span className="font-bold text-[10px] text-zinc-700 ml-2 font-mono">
                  {closureRating === 5 ? 'Excellent (5/5)' : 
                   closureRating === 4 ? 'Good (4/5)' : 
                   closureRating === 3 ? 'Average (3/5)' : 
                   closureRating === 2 ? 'Poor (2/5)' : 
                   'Unacceptable (1/5)'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-zinc-600 uppercase">Closure Feedback Comments *</label>
              <textarea
                value={closureFeedback}
                onChange={(e) => setClosureFeedback(e.target.value)}
                placeholder="Share your experience regarding resolution speed, quality, or SAP consultant coordination..."
                className="w-full h-24 p-2 bg-white border border-zinc-200 rounded text-xs focus:outline-none focus:border-zinc-955 font-mono"
                maxLength={400}
                required
              />
              <div className="text-right text-[8px] text-zinc-400 font-semibold">
                {closureFeedback.length}/400 characters max
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-150">
              <button
                type="button"
                onClick={() => setClosureModalOpen(false)}
                className="py-1.5 px-3 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-55 font-bold transition uppercase text-[10px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseSubmit}
                disabled={!closureFeedback.trim()}
                className={`py-1.5 px-4 rounded font-bold transition uppercase text-[10px] ${
                  closureFeedback.trim()
                    ? 'bg-green-950 hover:bg-green-800 text-white shadow-sm'
                    : 'bg-zinc-150 text-zinc-400 cursor-not-allowed border border-zinc-200'
                }`}
              >
                Confirm Closure
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- STATE-DRIVEN REJECTION COMMENTS DIALOG MODAL --- */}
      {rejectionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
          <div className="bg-white border border-zinc-250 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 font-mono text-xs text-zinc-955 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-2 text-zinc-900 font-bold uppercase text-[11px] pb-2 border-b border-zinc-150">
              <AlertTriangle size={14} className="text-zinc-650" />
              <span>Mandatory Rejection Comment Required</span>
            </div>

            <div className="space-y-1">
              <p className="text-zinc-655 leading-relaxed">
                You are rejecting a submission for ticket <strong className="text-zinc-955">{ticket.id}</strong>.
              </p>
              <p className="text-[10px] text-zinc-500 font-semibold">
                Rejections require a detailed audit explanation. This will be appended to the timeline and notified to the consultant.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-zinc-600 uppercase">Reason for Rejection</label>
              <textarea
                value={rejectionModal.reason}
                onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
                placeholder="Explain what is incorrect or what changes must be made..."
                className="w-full h-24 p-2 bg-white border border-zinc-200 rounded text-xs focus:outline-none focus:border-zinc-950 font-mono"
                maxLength={400}
                required
              />
              <div className="text-right text-[8px] text-zinc-400 font-semibold">
                {rejectionModal.reason.length}/400 characters max
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-150">
              <button
                type="button"
                onClick={() => setRejectionModal({ ...rejectionModal, isOpen: false })}
                className="py-1.5 px-3 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 font-bold transition uppercase text-[10px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectionConfirm}
                disabled={!rejectionModal.reason.trim()}
                className={`py-1.5 px-4 rounded font-bold transition uppercase text-[10px] text-white ${
                  rejectionModal.reason.trim()
                    ? 'bg-red-650 hover:bg-red-700'
                    : 'bg-zinc-150 text-zinc-400 cursor-not-allowed border border-zinc-200'
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
};
