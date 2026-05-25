'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, TicketStatus, TicketPriority, SAPModule, IssueCategory, Comment, EffortLog, AuditHistory, EffortActivityType, Attachment, TicketConsultantEffort } from '../../types/ticket';
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
  User,
  ShieldCheck,
  CheckCircle,
  Trash2,
  Star,
  Eye,
  ShieldAlert,
  Download,
  X,
  UserPlus,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '../ui/badge';

const getTicketAgeStr = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Created today';
  if (days === 1) return '1 day old';
  return `${days} days old`;
};

interface TicketDetailsViewProps {
  ticketId: string;
  role: 'SuperAdmin' | 'Manager' | 'Consultant' | 'Customer';
}

interface ConsultantLookup {
  name: string;
  type: 'Functional' | 'Technical';
  expertise: SAPModule[];
  workload: number;
}

const CONSULTANTS_DB: ConsultantLookup[] = [
  { name: 'Priya Raman', type: 'Functional', expertise: ['FICO', 'TRM'], workload: 6 },
  { name: 'Arjun Mehta', type: 'Functional', expertise: ['MM', 'SD'], workload: 5 },
  { name: 'Elena Rostova', type: 'Technical', expertise: ['ABAP', 'Fiori'], workload: 4 },
  { name: 'Sanjay Dutt', type: 'Functional', expertise: ['PP', 'QM'], workload: 5 },
  { name: 'Karthik Subramanian', type: 'Technical', expertise: ['BASIS', 'Security/GRC'], workload: 3 },
  { name: 'Rajesh Kumar', type: 'Technical', expertise: ['ABAP', 'CPI/Integration'], workload: 2 }
];

export const TicketDetailsView: React.FC<TicketDetailsViewProps> = ({ ticketId, role }) => {
  const { user } = useAuth();
  const {
    tickets,
    addComment,
    logEffort,
    approveEffortLog,
    resolveTicket,
    closeTicket,
    reopenTicket,
    assignTicket,
    approveRevisionRequest,
    rejectRevisionRequest,
    approveClosureRequest,
    rejectClosureRequest,
    approveUnlockRequest,
    rejectUnlockRequest,
    updateTicketStatus,
    updateConsultantEfforts
  } = useTickets();

  const ticket = tickets.find((t) => t.id === ticketId);

  // States
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [activeHubTab, setActiveHubTab] = useState<'overview' | 'assignments' | 'estimates' | 'actuals' | 'customer'>('overview');
  
  // Rejection Dialog State
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    type: 'estimate' | 'closure' | 'unlock' | 'reopen' | 'effort';
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
  
  // Reopen Form State
  const [reopenReasonText, setReopenReasonText] = useState('');
  const [showReopenForm, setShowReopenForm] = useState(false);

  // Comment Attachments Upload Simulator
  const [commentAttachments, setCommentAttachments] = useState<{
    id: string;
    fileName: string;
    fileSize: number;
    progress: number;
    isInternal: boolean;
    storagePath: string;
  }[]>([]);
  const [simFileName, setSimFileName] = useState('');
  const [simFileSize, setSimFileSize] = useState('150'); // KB
  
  // Allocations States
  const [selectedAllocName, setSelectedAllocName] = useState('');
  const [allocHours, setAllocHours] = useState('0');
  const [allocRemarks, setAllocRemarks] = useState('');

  // Timesheet Logger States (Consultant)
  const [effortHours, setEffortHours] = useState('');
  const [effortDesc, setEffortDesc] = useState('');
  const [effortActivity, setEffortActivity] = useState<EffortActivityType>('Analysis');
  const [effortBillable, setEffortBillable] = useState(true);

  // Resolution States (Consultant)
  const [rootCause, setRootCause] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [transportRequest, setTransportRequest] = useState('');

  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    if (ticket) {
      setRootCause(ticket.rootCause || '');
      setResolutionSummary(ticket.resolutionSummary || '');
      setTransportRequest(ticket.transportRequest || '');
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

  const showBannerMessage = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  // ── RESOURCE MANAGEMENT HANDLERS ──
  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocName) return;

    const dbConsultant = CONSULTANTS_DB.find(c => c.name === selectedAllocName);
    if (!dbConsultant) return;

    const currentAllocations = ticket.consultantEfforts || [];
    if (currentAllocations.some(a => a.consultantName === selectedAllocName && !a.isDeleted)) {
      showBannerMessage(`Error: ${selectedAllocName} is already allocated to this ticket.`);
      return;
    }

    const newEffort: TicketConsultantEffort = {
      id: `eff-alloc-${Date.now()}`,
      ticketId: ticket.id,
      consultantId: selectedAllocName.toLowerCase().replace(/\s+/g, '-'),
      consultantName: selectedAllocName,
      consultantType: dbConsultant.type,
      estimatedHours: Number(allocHours) || 0,
      actualHours: 0,
      remarks: allocRemarks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [...currentAllocations, newEffort];
    updateConsultantEfforts(ticket.id, updated);

    // Sync primary lead if it was empty
    if (!ticket.assignedConsultant) {
      assignTicket(ticket.id, ticket.assignedManager, selectedAllocName, user?.name || role);
    }

    // Log to history
    ticket.history.push({
      id: `h-alloc-${Date.now()}`,
      ticketId: ticket.id,
      changedBy: user?.name || role,
      fieldChanged: 'Resource Allocation',
      oldValue: 'None',
      newValue: `Allocated ${selectedAllocName} (${dbConsultant.type})`,
      createdAt: new Date().toISOString()
    });

    setSelectedAllocName('');
    setAllocHours('0');
    setAllocRemarks('');
    showBannerMessage(`${selectedAllocName} successfully allocated to ticket.`);
  };

  const handleRemoveResource = (allocId: string, name: string) => {
    const currentAllocations = ticket.consultantEfforts || [];
    const updated = currentAllocations.filter(a => a.id !== allocId);
    updateConsultantEfforts(ticket.id, updated);

    // If removed lead, clear or reassign lead
    if (ticket.assignedConsultant === name) {
      const nextLead = updated.find(a => !a.isDeleted)?.consultantName || '';
      assignTicket(ticket.id, ticket.assignedManager, nextLead, user?.name || role);
    }

    ticket.history.push({
      id: `h-alloc-rem-${Date.now()}`,
      ticketId: ticket.id,
      changedBy: user?.name || role,
      fieldChanged: 'Resource De-allocation',
      oldValue: name,
      newValue: 'Removed Allocation',
      createdAt: new Date().toISOString()
    });

    showBannerMessage(`${name} de-allocated from ticket.`);
  };

  const handleInlineEstChange = (allocId: string, newHours: number) => {
    const updated = (ticket.consultantEfforts || []).map(a => {
      if (a.id === allocId) {
        return { ...a, estimatedHours: newHours, updatedAt: new Date().toISOString() };
      }
      return a;
    });
    updateConsultantEfforts(ticket.id, updated);
    showBannerMessage('Allocation estimated hours updated.');
  };

  // ── COMMENTS & ATTACHMENTS ──
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && commentAttachments.length === 0) return;

    const files = commentAttachments
      .filter(f => f.progress >= 100)
      .map(f => ({
        fileName: f.fileName,
        fileSize: f.fileSize,
        fileType: f.fileName.split('.').pop() || 'pdf',
        fileUrl: f.storagePath
      }));

    addComment(
      ticket.id,
      commentText,
      user?.name || role,
      user?.email || '',
      role === 'SuperAdmin' ? 'SuperAdmin' : role === 'Manager' ? 'Manager' : role === 'Customer' ? 'Customer' : 'Consultant',
      isInternalComment && isInternal,
      files.length > 0 ? files : undefined
    );

    setCommentText('');
    setCommentAttachments([]);
    showBannerMessage('Comment and attachments successfully posted to timeline.');
  };

  const handleAttachSimulatedFile = () => {
    if (!simFileName.trim()) return;

    const sizeBytes = (Number(simFileSize) || 150) * 1024;
    const newFile = {
      id: `sim-file-${Date.now()}`,
      fileName: simFileName,
      fileSize: sizeBytes,
      progress: 0,
      isInternal: isInternalComment,
      storagePath: `supabase://bucket/sap-tickets/${ticket.id}/${Date.now()}_${simFileName}`
    };

    setCommentAttachments(prev => [...prev, newFile]);
    setSimFileName('');

    // Simulate upload progress
    let prog = 0;
    const interval = setInterval(() => {
      prog += 25;
      setCommentAttachments(prev =>
        prev.map(f => f.id === newFile.id ? { ...f, progress: prog } : f)
      );
      if (prog >= 100) {
        clearInterval(interval);
      }
    }, 120);
  };

  const handleDownloadFile = (fileName: string, path: string) => {
    showBannerMessage(`Simulated download: Fetching file "${fileName}" from secure path: ${path}`);
  };

  // ── REJECTIONS & CLOSURE WORKFLOW ──
  const triggerRejectionModal = (type: typeof rejectionModal.type, targetId: string) => {
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

    const actor = user?.name || role;
    if (type === 'estimate') {
      rejectRevisionRequest(ticket.id, targetId, actor, reason);
      showBannerMessage('Hour estimate request rejected.');
    } else if (type === 'closure') {
      rejectClosureRequest(ticket.id, targetId, actor, reason);
      showBannerMessage('Closure request rejected.');
    } else if (type === 'unlock') {
      rejectUnlockRequest(ticket.id, targetId, actor, reason);
      showBannerMessage('Unlock work log request rejected.');
    } else if (type === 'reopen') {
      closeTicket(ticket.id, 5, `Reopen request rejected by manager: ${reason}`, actor);
      showBannerMessage('Reopen request rejected. Ticket remains Closed.');
    } else if (type === 'effort') {
      approveEffortLog(ticket.id, targetId, 'Rejected', actor, reason);
      showBannerMessage('Timesheet effort log rejected.');
    }

    setRejectionModal({ isOpen: false, type: 'estimate', targetId: '', reason: '' });
  };

  const handleCloseClick = () => {
    setClosureRating(5);
    setClosureFeedback('');
    setClosureModalOpen(true);
  };

  const handleCloseSubmit = () => {
    if (!closureFeedback.trim()) return;
    closeTicket(ticket.id, closureRating, closureFeedback, user?.name || role);
    setClosureModalOpen(false);
    showBannerMessage('Ticket has been closed with mandatory rating and feedback comments.');
  };

  const handleApproveReopen = () => {
    updateTicketStatus(ticket.id, 'In Progress - Functional', user?.name || role);
    showBannerMessage('Reopen request approved. Ticket returned to In Progress Functional.');
  };

  const handleReopenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReasonText.trim()) return;
    reopenTicket(ticket.id, reopenReasonText, user?.name || role);
    setReopenReasonText('');
    setShowReopenForm(false);
    showBannerMessage('Ticket reopened successfully. Status updated to Reopened.');
  };

  // ── CONSULTANT TIMESHEET ACTIONS ──
  const handleLogEffortSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hrs = Number(effortHours);
    if (!hrs || hrs <= 0 || !effortDesc.trim()) return;

    logEffort({
      ticketId: ticket.id,
      hours: hrs,
      description: effortDesc,
      consultantName: user?.name || 'Karthik Subramanian',
      activityType: effortActivity,
      billable: effortBillable
    });

    setEffortHours('');
    setEffortDesc('');
    showBannerMessage('Effort hours logged and submitted for manager approval.');
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootCause.trim() || !resolutionSummary.trim()) return;
    resolveTicket(ticket.id, rootCause, resolutionSummary, user?.name || role);
    showBannerMessage('Ticket resolved and submitted. Awaiting client closure verification.');
  };

  // ── HOURLY AGGREGATES ──
  const approvedEstimates = useMemo(() => {
    const latest = (ticket.hourEstimates || [])
      .filter(e => e.status === 'Revision Approved' || e.status === 'Submitted')
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
    return {
      func: latest?.functionalEstimatedHours || 0,
      tech: latest?.technicalEstimatedHours || 0,
      total: latest?.totalEstimatedHours || 0
    };
  }, [ticket]);

  const actualsSummary = useMemo(() => {
    const funcEff = (ticket.consultantEfforts || []).filter(e => e.consultantType === 'Functional');
    const techEff = (ticket.consultantEfforts || []).filter(e => e.consultantType === 'Technical');

    const funcAct = funcEff.reduce((sum, e) => sum + e.actualHours, 0);
    const techAct = techEff.reduce((sum, e) => sum + e.actualHours, 0);

    return {
      func: funcAct,
      tech: techAct,
      total: funcAct + techAct
    };
  }, [ticket]);

  const varianceSummary = useMemo(() => {
    return {
      func: actualsSummary.func - approvedEstimates.func,
      tech: actualsSummary.tech - approvedEstimates.tech,
      total: actualsSummary.total - approvedEstimates.total
    };
  }, [approvedEstimates, actualsSummary]);

  const getSlaIndicator = (slaDueAt: string, status: string) => {
    if (status === 'Closed' || status === 'Resolved') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 uppercase py-0 text-[8px] font-bold">SLA Met</Badge>;
    }
    const due = new Date(slaDueAt).getTime();
    if (due < Date.now()) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 uppercase py-0 text-[8px] font-bold animate-pulse">SLA Breached</Badge>;
    }
    return <Badge className="bg-zinc-100 text-zinc-800 hover:bg-zinc-100 border-zinc-200 uppercase py-0 text-[8px] font-bold">SLA Active</Badge>;
  };

  const getStatusColor = (status: TicketStatus) => {
    if (status === 'Resolved' || status === 'Closed') return 'bg-green-50 text-green-700 border-green-200';
    if (status === 'Waiting for Customer' || status === 'Customer Action' || status === 'Raised to SAP' || status === 'Waiting for Hours Approval') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'New') return 'bg-zinc-150 text-zinc-950 border-zinc-950 font-bold';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getPriorityColor = (prio: TicketPriority) => {
    if (prio === 'Critical') return 'bg-red-50 text-red-700 border-red-200';
    if (prio === 'High') return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-zinc-50 text-zinc-650 border-zinc-200';
  };

  // Filter attachments by visibility
  const visibleAttachments = ticket.attachments.filter(a => a.visibility === 'public' || isInternal);

  return (
    <div className="space-y-6 font-mono text-xs text-zinc-900">
      
      {/* ── SUCCESS BANNER ── */}
      {successBanner && (
        <div className="bg-green-50 border border-green-500 rounded p-4 flex items-start justify-between text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle size={15} className="shrink-0" />
            <span className="font-bold">{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-green-600 hover:text-green-800 font-bold uppercase text-[9px]">Dismiss</button>
        </div>
      )}

      {/* ── BACK NAVIGATION ── */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <Link href="/manager/tickets" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-950 transition font-bold uppercase text-[10px]">
          <ArrowLeft size={13} /> Back to Desk
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400">Created: {new Date(ticket.createdAt).toLocaleString()}</span>
          {getSlaIndicator(ticket.slaDueAt, ticket.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── LEFT PAGE: INCIDENT INFORMATION ── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Incident Overview */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap gap-4 text-[10px] border-b border-zinc-150 pb-3 font-bold text-zinc-400 uppercase tracking-wider">
              <span className="flex items-center gap-1"><Building2 size={11} /> {ticket.organization}</span>
              <span>By: {ticket.requestedBy}</span>
              <span className="flex items-center gap-1"><Tag size={11} /> {ticket.category}</span>
              <span className="bg-zinc-100 text-zinc-700 px-1.5 py-0.2 rounded font-mono">Source: {ticket.source}</span>
            </div>
            
            <h2 className="font-bold text-sm text-zinc-950 leading-snug">{ticket.title}</h2>
            <p className="text-zinc-700 leading-relaxed text-[11px] whitespace-pre-wrap">{ticket.description}</p>

            {ticket.businessImpact && (
              <div className="bg-zinc-50 border border-zinc-200 rounded p-3 text-[10px] text-zinc-650 leading-relaxed">
                <span className="font-bold text-zinc-900 uppercase text-[8px] block mb-1">Business Operational Impact:</span>
                {ticket.businessImpact}
              </div>
            )}

            {/* Attachments Section */}
            {visibleAttachments.length > 0 && (
              <div className="border-t border-zinc-150 pt-3.5 space-y-2">
                <span className="font-bold text-[9px] uppercase tracking-wider text-zinc-450 flex items-center gap-1">
                  <Paperclip size={11} /> Secure Registry Attachments ({visibleAttachments.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {visibleAttachments.map(att => (
                    <a
                      key={att.id}
                      href="#"
                      onClick={(e) => { e.preventDefault(); handleDownloadFile(att.fileName, att.fileUrl); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-200 hover:border-zinc-950 rounded bg-zinc-50 font-semibold text-[10px] text-zinc-700 transition"
                    >
                      <FileCode size={12} />
                      <div className="text-left">
                        <span className="block font-bold">{att.fileName}</span>
                        <span className="text-[8px] text-zinc-400 block font-mono">{(att.fileSize / 1024).toFixed(0)} KB • Click to download</span>
                      </div>
                      {att.visibility === 'internal' && (
                        <span className="text-[8px] bg-red-100 text-red-800 px-1 rounded font-bold uppercase ml-1">INTERNAL</span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ServiceNow Parameters Hub */}
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-zinc-50 border-b border-zinc-200 flex overflow-x-auto">
              {([
                { id: 'overview', label: 'Incident Overview' },
                { id: 'assignments', label: 'Resource allocations' },
                { id: 'estimates', label: 'Effort estimates' },
                { id: 'actuals', label: 'Actuals & variance' },
                { id: 'customer', label: 'Client SLA contract' }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveHubTab(tab.id)}
                  className={`py-2.5 px-4 font-bold uppercase text-[9px] tracking-wider border-r border-zinc-200 transition ${
                    activeHubTab === tab.id
                      ? 'bg-white text-zinc-955 font-black border-b-2 border-b-zinc-955'
                      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4">
              
              {/* HUB A: OVERVIEW */}
              {activeHubTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Incident ID</span>
                      <span className="font-bold text-zinc-900 block mt-0.5">{ticket.id}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Client Requestor</span>
                      <span className="font-bold text-zinc-900 block mt-0.5">{ticket.requestedBy} ({ticket.requestedByEmail})</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Urgency Classification</span>
                      <span className="font-semibold text-zinc-900 block mt-0.5">{ticket.category}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">SAP Module Scope</span>
                      <span className="font-bold text-zinc-950 block mt-0.5 font-mono">{ticket.sapModule}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Resolution target boundary</span>
                      <span className="font-semibold text-zinc-900 block mt-0.5">{new Date(ticket.slaDueAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Ticket Age</span>
                      <span className="font-bold text-zinc-950 block mt-0.5">{getTicketAgeStr(ticket.createdAt)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* HUB B: RESOURCE MANAGEMENT ALLOCATIONS */}
              {activeHubTab === 'assignments' && (
                <div className="space-y-4">
                  
                  {/* Allocations Form (Manager / Admin Scoped) */}
                  {(role === 'Manager' || role === 'SuperAdmin') && (
                    <form onSubmit={handleAddResource} className="bg-zinc-50 border border-zinc-200 rounded p-4 space-y-3">
                      <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider block flex items-center gap-1.5">
                        <UserPlus size={12} className="text-zinc-650" /> Add Consultant Allocation
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-zinc-450 uppercase block">Consultant</label>
                          <select
                            required
                            value={selectedAllocName}
                            onChange={e => setSelectedAllocName(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none"
                          >
                            <option value="">Select consultant...</option>
                            {CONSULTANTS_DB.map(c => (
                              <option key={c.name} value={c.name}>
                                {c.name} ({c.type} - {c.expertise.join('/')}) [Workload: {c.workload} active]
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-zinc-450 uppercase block">Estimated Hours</label>
                          <input
                            type="number"
                            required
                            min={0}
                            value={allocHours}
                            onChange={e => setAllocHours(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-zinc-450 uppercase block">Allocation Remarks</label>
                          <input
                            type="text"
                            placeholder="Role remarks..."
                            value={allocRemarks}
                            onChange={e => setAllocRemarks(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-zinc-955 text-white hover:bg-zinc-800 rounded font-bold uppercase text-[9px] tracking-wider transition"
                        >
                          Allocate Staff
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Resource roster list */}
                  <div>
                    <span className="text-[9px] text-zinc-450 uppercase font-black tracking-wider block mb-2">Allocated Engineers Roster</span>
                    <div className="border border-zinc-200 rounded overflow-hidden">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-zinc-500">
                          <tr>
                            <th className="py-2 px-3">Consultant</th>
                            <th className="py-2 px-3 text-center">Type</th>
                            <th className="py-2 px-3 text-center">Expertise</th>
                            <th className="py-2 px-3 text-center">Workload</th>
                            <th className="py-2 px-3 text-center">Estimated Hours</th>
                            <th className="py-2 px-3 text-center">Actual Hours</th>
                            {(role === 'Manager' || role === 'SuperAdmin') && <th className="py-2 px-3 text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-155 bg-white">
                          {(!ticket.consultantEfforts || ticket.consultantEfforts.length === 0) ? (
                            <tr>
                              <td colSpan={7} className="py-4 text-center text-zinc-400 italic">No resources allocated to this incident.</td>
                            </tr>
                          ) : (
                            ticket.consultantEfforts.map(eff => {
                              const dbInfo = CONSULTANTS_DB.find(c => c.name === eff.consultantName);
                              return (
                                <tr key={eff.id} className="hover:bg-zinc-50/50 transition">
                                  <td className="py-2 px-3 font-semibold text-zinc-800">{eff.consultantName}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-1.5 py-0.2 rounded font-bold text-[8px] uppercase ${
                                      eff.consultantType === 'Functional' ? 'bg-indigo-50 text-indigo-700' : 'bg-violet-50 text-violet-700'
                                    }`}>{eff.consultantType}</span>
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold text-zinc-650">{dbInfo?.expertise.join(', ') || '-'}</td>
                                  <td className="py-2 px-3 text-center text-zinc-600 font-bold">{dbInfo?.workload || 0} active</td>
                                  <td className="py-2 px-3 text-center">
                                    {role === 'Manager' || role === 'SuperAdmin' ? (
                                      <input
                                        type="number"
                                        min={0}
                                        value={eff.estimatedHours}
                                        onChange={e => handleInlineEstChange(eff.id, Number(e.target.value) || 0)}
                                        className="w-12 bg-white border border-zinc-200 rounded p-0.5 text-center font-bold text-[10px] focus:outline-none"
                                      />
                                    ) : (
                                      <span className="font-bold text-zinc-800">{eff.estimatedHours}h</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold text-zinc-950 bg-zinc-50/50">{eff.actualHours}h</td>
                                  {(role === 'Manager' || role === 'SuperAdmin') && (
                                    <td className="py-2 px-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveResource(eff.id, eff.consultantName)}
                                        className="p-1 border border-zinc-200 hover:border-red-500 hover:text-red-700 rounded transition"
                                        title="De-allocate consultant"
                                      >
                                        <Trash2 size={12} />
                                      </button>
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

              {/* HUB C: ESTIMATED HOURS BREAKDOWN */}
              {activeHubTab === 'estimates' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-zinc-50 border border-zinc-200 p-3 rounded">
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Quoted Incident Budget:</span>
                      <span className="font-bold text-zinc-950 text-sm mt-0.5 block">{ticket.quotedHours || 0} Hours</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-zinc-450 uppercase font-black tracking-wider block mb-2">Estimated Hours Consultant Breakdown</span>
                    <div className="border border-zinc-200 rounded overflow-hidden bg-white">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-zinc-500">
                          <tr>
                            <th className="py-2 px-3">Consultant Name</th>
                            <th className="py-2 px-3 text-center">Consultant Type</th>
                            <th className="py-2 px-3 text-center">Estimated Hours</th>
                            <th className="py-2 px-3">Allocation Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-150">
                          {(!ticket.consultantEfforts || ticket.consultantEfforts.length === 0) ? (
                            <tr>
                              <td colSpan={4} className="py-3 text-center text-zinc-400 italic">No allocations recorded.</td>
                            </tr>
                          ) : (
                            <>
                              {ticket.consultantEfforts.map(eff => (
                                <tr key={eff.id} className="hover:bg-zinc-50/50 transition">
                                  <td className="py-2 px-3 font-semibold text-zinc-800">{eff.consultantName}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-1.5 py-0.2 rounded font-bold text-[8px] uppercase ${
                                      eff.consultantType === 'Functional' ? 'bg-indigo-50 text-indigo-700' : 'bg-violet-50 text-violet-700'
                                    }`}>{eff.consultantType}</span>
                                  </td>
                                  <td className="py-2 px-3 text-center font-bold text-zinc-950">{eff.estimatedHours}h</td>
                                  <td className="py-2 px-3 text-zinc-500">{eff.remarks || '-'}</td>
                                </tr>
                              ))}
                              <tr className="bg-zinc-50/50 font-extrabold border-t border-zinc-200">
                                <td colSpan={2} className="py-2.5 px-3 text-zinc-900">Functional Total:</td>
                                <td className="py-2.5 px-3 text-center text-zinc-955">{approvedEstimates.func}h</td>
                                <td></td>
                              </tr>
                              <tr className="bg-zinc-50/50 font-extrabold">
                                <td colSpan={2} className="py-2.5 px-3 text-zinc-900">Technical Total:</td>
                                <td className="py-2.5 px-3 text-center text-zinc-955">{approvedEstimates.tech}h</td>
                                <td></td>
                              </tr>
                              <tr className="bg-zinc-100 font-black border-t border-zinc-200">
                                <td colSpan={2} className="py-2.5 px-3 text-zinc-950 uppercase text-[9px]">Grand Total Estimates:</td>
                                <td className="py-2.5 px-3 text-center text-zinc-955">{approvedEstimates.total}h</td>
                                <td></td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* HUB D: ACTUAL HOURS & VARIANCE */}
              {activeHubTab === 'actuals' && (
                <div className="space-y-4">
                  <span className="text-[9px] text-zinc-450 uppercase font-black tracking-wider block">Actual vs Estimated Variance Table</span>
                  
                  <div className="border border-zinc-200 rounded overflow-hidden bg-white">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-zinc-500">
                        <tr>
                          <th className="py-2 px-3">Consultant</th>
                          <th className="py-2 px-3 text-center">Type</th>
                          <th className="py-2 px-3 text-center">Estimated hours</th>
                          <th className="py-2 px-3 text-center">Actual Hours logged</th>
                          <th className="py-2 px-3 text-center">Variance Gap</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150">
                        {(!ticket.consultantEfforts || ticket.consultantEfforts.length === 0) ? (
                          <tr>
                            <td colSpan={5} className="py-3 text-center text-zinc-400 italic">No allocations recorded.</td>
                          </tr>
                        ) : (
                          <>
                            {ticket.consultantEfforts.map(eff => {
                              const varHours = eff.actualHours - eff.estimatedHours;
                              return (
                                <tr key={eff.id} className="hover:bg-zinc-50/50 transition">
                                  <td className="py-2 px-3 font-semibold text-zinc-800">{eff.consultantName}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-1.5 py-0.2 rounded font-bold text-[8px] uppercase ${
                                      eff.consultantType === 'Functional' ? 'bg-indigo-50 text-indigo-700' : 'bg-violet-50 text-violet-700'
                                    }`}>{eff.consultantType}</span>
                                  </td>
                                  <td className="py-2 px-3 text-center font-semibold text-zinc-600">{eff.estimatedHours}h</td>
                                  <td className="py-2 px-3 text-center font-bold text-zinc-850">{eff.actualHours}h</td>
                                  <td className={`py-2 px-3 text-center font-black ${varHours > 0 ? 'text-red-650' : 'text-green-700'}`}>
                                    {varHours >= 0 ? `+${varHours}` : varHours}h
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="bg-zinc-50 border-t border-zinc-200 font-extrabold text-zinc-900">
                              <td colSpan={2} className="py-2 px-3">Functional Totals:</td>
                              <td className="py-2 px-3 text-center">{approvedEstimates.func}h</td>
                              <td className="py-2 px-3 text-center">{actualsSummary.func}h</td>
                              <td className={`py-2 px-3 text-center font-black ${varianceSummary.func > 0 ? 'text-red-600' : 'text-green-700'}`}>
                                {varianceSummary.func >= 0 ? `+${varianceSummary.func}` : varianceSummary.func}h
                              </td>
                            </tr>
                            <tr className="bg-zinc-50 font-extrabold text-zinc-900">
                              <td colSpan={2} className="py-2 px-3">Technical Totals:</td>
                              <td className="py-2 px-3 text-center">{approvedEstimates.tech}h</td>
                              <td className="py-2 px-3 text-center">{actualsSummary.tech}h</td>
                              <td className={`py-2 px-3 text-center font-black ${varianceSummary.tech > 0 ? 'text-red-600' : 'text-green-700'}`}>
                                {varianceSummary.tech >= 0 ? `+${varianceSummary.tech}` : varianceSummary.tech}h
                              </td>
                            </tr>
                            <tr className="bg-zinc-100 font-black text-zinc-950 border-t border-zinc-200">
                              <td colSpan={2} className="py-2.5 px-3 uppercase text-[9px]">Grand Totals:</td>
                              <td className="py-2.5 px-3 text-center">{approvedEstimates.total}h</td>
                              <td className="py-2.5 px-3 text-center">{actualsSummary.total}h</td>
                              <td className={`py-2.5 px-3 text-center font-black ${varianceSummary.total > 0 ? 'text-red-600' : 'text-green-700'}`}>
                                {varianceSummary.total >= 0 ? `+${varianceSummary.total}` : varianceSummary.total}h
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* HUB E: CLIENT CONTRACT META */}
              {activeHubTab === 'customer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Company Organization</span>
                      <span className="font-bold text-zinc-950 block mt-0.5">{ticket.organization}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Contact Person</span>
                      <span className="font-bold text-zinc-900 block mt-0.5">{ticket.requestedBy}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">Support Email</span>
                      <span className="font-mono text-zinc-800 block mt-0.5">{ticket.requestedByEmail}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">AMS Contract Plan</span>
                      <span className="font-black text-zinc-900 block mt-0.5">Enterprise Platinum Support (24x7 SLA)</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-450 uppercase font-bold block">CSAT Satisfaction Rating</span>
                      {ticket.rating ? (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="font-bold text-green-700 flex items-center gap-0.5">
                            {ticket.rating.score}/5 <Star size={11} className="fill-green-600 text-green-600" />
                          </span>
                          <span className="text-zinc-400 italic">"{ticket.rating.feedback}"</span>
                        </div>
                      ) : (
                        <span className="text-zinc-450 italic mt-0.5 block">Pending resolution rating</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Timeline and messages flow */}
          <div className="space-y-6">
            <TicketTimeline ticket={ticket} />

            {/* Comment Form */}
            {ticket.status !== 'Closed' && (
              <form onSubmit={handleCommentSubmit} className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-zinc-150 pb-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-zinc-950">Post Reply Conversation</span>
                  {isInternal && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="isInternalComment"
                        checked={isInternalComment}
                        onChange={e => setIsInternalComment(e.target.checked)}
                        className="rounded text-zinc-900 focus:ring-zinc-950"
                      />
                      <label htmlFor="isInternalComment" className="text-[9px] font-bold uppercase text-zinc-650 cursor-pointer">
                        Flag as Internal Note (Customer Restricted)
                      </label>
                    </div>
                  )}
                </div>

                <textarea
                  required
                  rows={3}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={isInternalComment ? "Type internal note visible only to support staff..." : "Type reply message to client..."}
                  className="w-full bg-white border border-zinc-200 rounded p-2.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950 font-mono"
                />

                {/* Upload Attachments Simulator */}
                <div className="space-y-2 border-t border-zinc-100 pt-3">
                  <span className="text-[9px] font-bold text-zinc-450 uppercase block">Comment Attachments Registry</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Simulated file name (e.g. log_dump.txt)..."
                      value={simFileName}
                      onChange={e => setSimFileName(e.target.value)}
                      className="flex-1 bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Size (KB)..."
                      value={simFileSize}
                      onChange={e => setSimFileSize(e.target.value)}
                      className="w-20 bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAttachSimulatedFile}
                      disabled={!simFileName.trim()}
                      className="px-3 py-1 bg-zinc-950 text-white rounded font-bold uppercase text-[9px] tracking-wider disabled:opacity-50 transition cursor-pointer"
                    >
                      Attach File
                    </button>
                  </div>

                  {commentAttachments.length > 0 && (
                    <div className="space-y-2 border border-zinc-200 p-2.5 rounded bg-zinc-50/50">
                      {commentAttachments.map(f => (
                        <div key={f.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] bg-white border border-zinc-150 p-2 rounded shadow-sm">
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-zinc-800">{f.fileName}</span>
                              <span className="text-zinc-450">{(f.fileSize / 1024).toFixed(0)} KB</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-100 border rounded overflow-hidden">
                              <div className="h-full bg-zinc-950 transition-all duration-200" style={{ width: `${f.progress}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[8px] font-bold text-zinc-450 uppercase">
                              <span>Upload: {f.progress < 100 ? `Syncing (${f.progress}%)` : 'Stored'}</span>
                              <span className={f.isInternal ? 'text-red-700' : 'text-green-700'}>{f.isInternal ? 'Internal' : 'Public'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setCommentAttachments(prev => prev.map(x => x.id === f.id ? { ...x, isInternal: !x.isInternal } : x));
                              }}
                              className="px-1.5 py-0.5 border border-zinc-200 hover:border-zinc-950 rounded text-[8px] font-bold uppercase"
                            >
                              Toggle Visibility
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(f.fileName, f.storagePath)}
                              className="p-1 border border-zinc-200 rounded text-zinc-600 hover:border-zinc-950 transition"
                              title="Download metadata"
                            >
                              <Download size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCommentAttachments(prev => prev.filter(x => x.id !== f.id))}
                              className="p-1 border border-zinc-200 text-zinc-400 hover:text-red-700 hover:border-red-500 rounded transition"
                              title="Remove"
                            >
                              <Trash2 size={11} />
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
                    className="px-4 py-2 bg-zinc-955 hover:bg-zinc-800 text-white rounded font-bold uppercase tracking-wider text-[10px]"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>

        {/* ── RIGHT PAGE: PARAMETERS & APPROVAL ACTIONS ── */}
        <div className="space-y-6">
          
          {/* Metadata Card */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-955 border-b border-zinc-150 pb-2">
              Incident Metadata
            </h3>
            <div className="space-y-3 text-zinc-700">
              
              <div className="flex justify-between items-center">
                <span>Status Control:</span>
                {role === 'Manager' || role === 'SuperAdmin' ? (
                  <select
                    value={ticket.status}
                    onChange={(e) => {
                      updateTicketStatus(ticket.id, e.target.value as any, user?.name || role);
                      showBannerMessage(`Ticket status updated to ${e.target.value}.`);
                    }}
                    className="bg-white border border-zinc-200 rounded p-1 text-[10px] font-bold text-zinc-955 focus:outline-none uppercase"
                  >
                    <option value="Requirement Gathering">Requirement Gathering</option>
                    <option value="Waiting for Hours Approval">Waiting for Hours Approval</option>
                    <option value="In Progress - Functional">In Progress Functional</option>
                    <option value="In Progress - Technical">In Progress Technical</option>
                    <option value="Customer Action">Customer Action</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Raised to SAP">Raised to SAP</option>
                    <option value="Request for Closure">Request for Closure</option>
                    <option value="Closed">Closed</option>
                    <option value="Reopened">Reopened</option>
                  </select>
                ) : (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase font-mono ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                )}
              </div>

              <div className="flex justify-between">
                <span>Urgency Priority:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase font-mono ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Escalation state:</span>
                <span className={`font-bold ${ticket.escalationFlag ? 'text-red-600 animate-pulse' : 'text-zinc-400'}`}>
                  {ticket.escalationFlag ? 'ESCALATED' : 'NOMINAL'}
                </span>
              </div>
            </div>
          </div>

          {/* MANAGER WORKFLOW APPROVALS ACTIONS PANEL */}
          {(role === 'Manager' || role === 'SuperAdmin') && (
            <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-955 border-b border-zinc-150 pb-2 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-zinc-650" /> Manager Approval Desk
              </h3>
              
              <div className="space-y-4">
                
                {/* 1. Hour Estimates Approval */}
                {ticket.hourEstimates?.some(e => e.status === 'Submitted') && (
                  <div className="border border-zinc-200 rounded p-3 bg-zinc-50 space-y-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-zinc-600">
                      <Clock size={12} /> Hours Estimate Approval
                    </div>
                    {ticket.hourEstimates.filter(e => e.status === 'Submitted').map(est => (
                      <div key={est.id} className="space-y-2">
                        <p className="text-[10px] text-zinc-600">Submitted by: <strong className="text-zinc-900">{est.consultantId}</strong></p>
                        <p className="font-bold text-[10px] text-zinc-950">F: {est.functionalEstimatedHours}h | T: {est.technicalEstimatedHours}h (Total: {est.totalEstimatedHours}h)</p>
                        <p className="text-[10px] text-zinc-500 italic">"{est.remarks}"</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => approveRevisionRequest(ticket.id, est.id, user?.name || role)}
                            className="flex-1 py-1 bg-green-950 hover:bg-green-800 text-white rounded font-bold uppercase text-[9px] tracking-wider transition"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerRejectionModal('estimate', est.id)}
                            className="flex-1 py-1 border border-red-500 text-red-800 hover:bg-red-50 rounded font-bold uppercase text-[9px] tracking-wider transition"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Timesheet Effort Log Approval */}
                {ticket.efforts?.some(e => e.status === 'Pending' || e.status === 'Pending Approval') && (
                  <div className="border border-zinc-200 rounded p-3 bg-zinc-50 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-zinc-600">
                      <Layers size={12} /> Timesheet Effort Approvals
                    </div>
                    <div className="divide-y divide-zinc-200 max-h-48 overflow-y-auto pr-1">
                      {ticket.efforts.filter(e => e.status === 'Pending' || e.status === 'Pending Approval').map(log => (
                        <div key={log.id} className="py-2 space-y-1">
                          <div className="flex justify-between font-bold">
                            <span>{log.consultantName}</span>
                            <span className="text-zinc-950">+{log.hoursWorked || log.hoursLogged}h</span>
                          </div>
                          <p className="text-zinc-500 text-[10px] truncate">{log.description}</p>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => approveEffortLog(ticket.id, log.id, 'Approved', user?.name || role)}
                              className="flex-1 py-0.5 bg-green-950 hover:bg-green-800 text-white rounded font-bold uppercase text-[8px] tracking-wider transition"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerRejectionModal('effort', log.id)}
                              className="flex-1 py-0.5 border border-red-500 text-red-850 hover:bg-red-50 rounded font-bold uppercase text-[8px] tracking-wider transition"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Closure Requests Approval */}
                {ticket.closureRequests?.some(c => c.status === 'Pending Manager Approval') && (
                  <div className="border border-zinc-200 rounded p-3 bg-zinc-50 space-y-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-zinc-600">
                      <FileCode size={12} /> Closure Request Approval
                    </div>
                    {ticket.closureRequests.filter(c => c.status === 'Pending Manager Approval').map(cls => (
                      <div key={cls.id} className="space-y-2">
                        <p className="text-[10px] text-zinc-600">Requested by: <strong className="text-zinc-900">{cls.requestedBy}</strong></p>
                        <p className="font-bold text-[10px] text-zinc-950">F: {cls.functionalActualHours}h | T: {cls.technicalActualHours}h (Total: {cls.totalActualHours}h)</p>
                        <p className="text-[10px] text-zinc-500 truncate">"{cls.workCompletedSummary}"</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => approveClosureRequest(ticket.id, cls.id, user?.name || role)}
                            className="flex-1 py-1 bg-green-950 hover:bg-green-800 text-white rounded font-bold uppercase text-[9px] tracking-wider transition"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerRejectionModal('closure', cls.id)}
                            className="flex-1 py-1 border border-red-500 text-red-800 hover:bg-red-50 rounded font-bold uppercase text-[9px] tracking-wider transition"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Unlock / Resource change Requests */}
                {ticket.unlockRequests?.some(u => u.status === 'Pending') && (
                  <div className="border border-zinc-200 rounded p-3 bg-zinc-50 space-y-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-zinc-600">
                      <Lock size={12} /> Timesheet Unlock Approval
                    </div>
                    {ticket.unlockRequests.filter(u => u.status === 'Pending').map(unl => (
                      <div key={unl.id} className="space-y-2">
                        <p className="text-[10px] text-zinc-600">Requested by: <strong className="text-zinc-900">{unl.requestedBy}</strong></p>
                        <p className="text-[10px] text-zinc-950 font-bold">Reason: {unl.reason}</p>
                        <p className="text-[10px] text-zinc-500 italic">"Correction: {unl.requestedChange}"</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => approveUnlockRequest(ticket.id, unl.id, user?.name || role)}
                            className="flex-1 py-1 bg-green-950 hover:bg-green-800 text-white rounded font-bold uppercase text-[9px] tracking-wider transition"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerRejectionModal('unlock', unl.id)}
                            className="flex-1 py-1 border border-red-500 text-red-800 hover:bg-red-50 rounded font-bold uppercase text-[9px] tracking-wider transition"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Direct Close Button */}
                {ticket.status === 'Resolved' && (
                  <button
                    type="button"
                    onClick={handleCloseClick}
                    className="w-full py-2 bg-green-950 hover:bg-green-800 text-white font-bold rounded uppercase tracking-wider text-[10px] shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={13} /> Close Incident (Mandatory CSAT)
                  </button>
                )}

                {/* Reopen reviews */}
                {ticket.status === 'Reopened' && (
                  <div className="border border-red-200 rounded p-3 bg-red-50/50 space-y-2 text-[10px]">
                    <div className="flex items-center gap-1 font-bold text-red-800 uppercase text-[9px]">
                      <ShieldAlert size={12} /> Awaiting Reopen Approval
                    </div>
                    <p className="text-zinc-600">Previous CSAT Score: <strong className="text-zinc-900">{ticket.rating ? `${ticket.rating.score}/5` : 'None'}</strong></p>
                    <p className="text-zinc-600 italic bg-white border border-zinc-200 p-1.5 rounded">
                      Reopen Justification: {(() => {
                        const reopenHist = [...ticket.history].reverse().find(h => h.newValue === 'Reopened');
                        const lastComment = [...ticket.comments].reverse().find(c => c.authorRole === 'Customer');
                        return reopenHist ? lastComment?.content || 'Client requested to reopen.' : 'Client rejected verification.';
                      })()}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleApproveReopen}
                        className="flex-1 py-1 bg-green-950 hover:bg-green-800 text-white rounded font-bold uppercase text-[9px] tracking-wider transition"
                      >
                        Authorize
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerRejectionModal('reopen', ticket.id)}
                        className="flex-1 py-1 border border-red-500 text-red-850 hover:bg-red-50 rounded font-bold uppercase text-[9px] tracking-wider transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Consultant Timesheet Effort logging Form */}
          {role === 'Consultant' && ticket.status !== 'Closed' && ticket.status !== 'Resolved' && (
            <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-955 border-b border-zinc-150 pb-2">
                Log effort hours
              </h3>
              
              <form onSubmit={handleLogEffortSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-zinc-450 uppercase">Worked Hours</label>
                    <input
                      type="number"
                      required
                      min={0.1}
                      step={0.1}
                      value={effortHours}
                      onChange={e => setEffortHours(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-zinc-450 uppercase">Activity Type</label>
                    <select
                      value={effortActivity}
                      onChange={e => setEffortActivity(e.target.value as any)}
                      className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none"
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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-zinc-450 uppercase">Billing Category</label>
                    <select
                      value={effortBillable ? 'true' : 'false'}
                      onChange={e => setEffortBillable(e.target.value === 'true')}
                      className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none"
                    >
                      <option value="true">Billable (AMS)</option>
                      <option value="false">Non-Billable</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-zinc-450 uppercase">Work description</label>
                  <input
                    type="text"
                    required
                    placeholder="Provide details..."
                    value={effortDesc}
                    onChange={e => setEffortDesc(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[10px] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-1.5 bg-zinc-950 text-white rounded font-bold uppercase text-[9px] tracking-wider hover:bg-zinc-800 transition"
                >
                  Submit timesheet entry
                </button>
              </form>

              {/* Consultant Resolve Form */}
              <form onSubmit={handleResolveSubmit} className="border-t border-zinc-150 pt-4 mt-2 space-y-3">
                <span className="font-bold text-zinc-500 uppercase text-[9px] block">Submit Resolution</span>
                <input
                  type="text"
                  required
                  placeholder="Root Cause description..."
                  value={rootCause}
                  onChange={e => setRootCause(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none"
                />
                <textarea
                  required
                  rows={2}
                  placeholder="Resolution summary steps..."
                  value={resolutionSummary}
                  onChange={e => setResolutionSummary(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[10px] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="SAP Transport Request (e.g. DEVK900123)"
                  value={transportRequest}
                  onChange={e => setTransportRequest(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded p-1 text-[10px] focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-green-950 text-white rounded font-bold uppercase text-[9px] tracking-wider hover:bg-green-800 transition"
                >
                  Resolve Incident
                </button>
              </form>
            </div>
          )}

          {/* Customer verification actions */}
          {role === 'Customer' && ticket.status === 'Resolved' && (
            <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-3 shadow-sm">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-955 border-b border-zinc-150 pb-2">
                Awaiting Verification
              </h3>
              <button
                type="button"
                onClick={handleCloseClick}
                className="w-full py-2 bg-green-955 text-white hover:bg-green-800 font-bold rounded uppercase text-[10px] tracking-wider transition shadow-sm"
              >
                Confirm resolution
              </button>
              <button
                type="button"
                onClick={() => setShowReopenForm(!showReopenForm)}
                className="w-full py-1.5 border border-zinc-300 hover:border-zinc-900 rounded font-bold uppercase text-[10px] transition text-zinc-700"
              >
                Reject & Reopen Ticket
              </button>

              {showReopenForm && (
                <form onSubmit={handleReopenSubmit} className="space-y-2 pt-2 border-t border-zinc-100 mt-1">
                  <textarea
                    required
                    placeholder="Explain reopen reason..."
                    value={reopenReasonText}
                    onChange={e => setReopenReasonText(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs focus:outline-none"
                  />
                  <button type="submit" className="w-full py-1.5 bg-zinc-950 text-white rounded font-bold uppercase text-[9px] tracking-wider">
                    Confirm Reopen Request
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Customer request reopen if closed */}
          {role === 'Customer' && ticket.status === 'Closed' && (
            <div className="bg-white border border-zinc-200 rounded-lg p-5 space-y-3 shadow-sm">
              <button
                type="button"
                onClick={() => setShowReopenForm(!showReopenForm)}
                className="w-full py-1.5 border border-zinc-300 hover:border-zinc-900 rounded font-bold uppercase text-[10px] transition text-zinc-700"
              >
                Request Reopen
              </button>
              {showReopenForm && (
                <form onSubmit={handleReopenSubmit} className="space-y-2 pt-2 border-t border-zinc-100 mt-1">
                  <textarea
                    required
                    placeholder="Reason to request reopen..."
                    value={reopenReasonText}
                    onChange={e => setReopenReasonText(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs focus:outline-none"
                  />
                  <button type="submit" className="w-full py-1.5 bg-zinc-950 text-white rounded font-bold uppercase text-[9px] tracking-wider">
                    Confirm Request
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ── MANDATORY CSAT CLOSURE DIALOG MODAL ── */}
      {closureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
          <div className="bg-white border border-zinc-250 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 font-mono text-xs text-zinc-955 animate-in fade-in duration-100">
            
            <div className="flex items-center gap-2 text-zinc-900 font-bold uppercase text-[11px] pb-2 border-b border-zinc-150">
              <CheckCircle size={14} className="text-green-600" />
              <span>Confirm Ticket Resolution & Closure</span>
            </div>

            {/* Hours summary splits */}
            <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded space-y-1.5 text-[10px]">
              <span className="font-bold text-zinc-450 uppercase text-[9px] block">Final actual hours summary:</span>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-zinc-700">
                <span>Functional Hours:</span>
                <span className="text-right font-bold text-zinc-900">{actualsSummary.func}h</span>
                <span>Technical Hours:</span>
                <span className="text-right font-bold text-zinc-900">{actualsSummary.tech}h</span>
                <span className="border-t border-zinc-200 pt-1 font-bold">Total Consumed:</span>
                <span className="text-right border-t border-zinc-200 pt-1 font-black text-zinc-955">{actualsSummary.total}h</span>
              </div>
              <div className="border-t border-zinc-200 pt-1.5">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Consultant Effort Log:</span>
                <div className="max-h-24 overflow-y-auto space-y-1 mt-1">
                  {(ticket.consultantEfforts || []).map(a => (
                    <div key={a.id} className="flex justify-between text-zinc-650 text-[9px]">
                      <span>{a.consultantName} ({a.consultantType}):</span>
                      <span className="font-bold">{a.actualHours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CSAT Stars Selector */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-zinc-600 uppercase">CSAT Satisfaction Rating *</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setClosureRating(star)}
                    className="p-1 hover:scale-115 transition cursor-pointer text-zinc-300 hover:text-amber-500"
                  >
                    <Star
                      size={20}
                      className={star <= closureRating ? 'fill-amber-500 text-amber-500' : 'fill-none text-zinc-300'}
                    />
                  </button>
                ))}
                <span className="font-bold text-[10px] text-zinc-700 ml-2">
                  {closureRating === 5 ? 'Excellent (5/5)' : 
                   closureRating === 4 ? 'Good (4/5)' : 
                   closureRating === 3 ? 'Average (3/5)' : 
                   closureRating === 2 ? 'Poor (2/5)' : 
                   'Unacceptable (1/5)'}
                </span>
              </div>
            </div>

            {/* Comment Comments */}
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-zinc-600 uppercase">Closure Feedback Comments *</label>
              <textarea
                value={closureFeedback}
                onChange={(e) => setClosureFeedback(e.target.value)}
                placeholder="Share closure confirmation details, validation steps, or CSAT feedback comments..."
                className="w-full h-20 p-2 bg-white border border-zinc-200 rounded text-xs focus:outline-none focus:border-zinc-950 font-mono"
                maxLength={400}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-150">
              <button
                type="button"
                onClick={() => setClosureModalOpen(false)}
                className="py-1.5 px-3 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 font-bold transition uppercase text-[10px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseSubmit}
                disabled={!closureFeedback.trim()}
                className={`py-1.5 px-4 rounded font-bold transition uppercase text-[10px] ${
                  closureFeedback.trim()
                    ? 'bg-green-955 hover:bg-green-800 text-white shadow-sm'
                    : 'bg-zinc-150 text-zinc-400 cursor-not-allowed border border-zinc-200'
                }`}
              >
                Confirm Closure
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── STATE-DRIVEN REJECTION COMMENTS DIALOG ── */}
      {rejectionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
          <div className="bg-white border border-zinc-250 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 font-mono text-xs text-zinc-955 animate-in fade-in duration-100">
            
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
