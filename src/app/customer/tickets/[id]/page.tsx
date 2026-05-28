'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTickets } from '../../../../context/TicketContext';
import { useAuth } from '../../../../context/AuthContext';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileCode,
  FileText,
  File,
  FileImage,
  Paperclip,
  User,
  Users,
  Wrench,
  CheckSquare,
  Archive,
  ShieldCheck,
  Flame,
  History,
  MessageSquare,
  BadgeAlert,
  HelpCircle,
  X,
  Star,
  Trash2,
  Edit,
  Quote,
  Upload,
  Calendar,
  Lock,
  Unlock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';

interface PendingAttachment {
  id: string;
  file: File;
  progress: number;
  previewUrl?: string;
}

export default function CustomerTicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    tickets,
    loading,
    addComment,
    closeTicket,
    reopenTicket,
    requestEscalation,
    updateTicket,
    requestDelete
  } = useTickets();

  const ticketId = Array.isArray(id) ? id[0] : id;
  const ticket = tickets.find((t) => t.id === ticketId);

  // Form & Interaction States
  const [commentText, setCommentText] = useState('');
  
  // Real Multi-File Attachment States
  const [commentFiles, setCommentFiles] = useState<PendingAttachment[]>([]);

  // Rating States
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');

  // Reopen States
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Escalation States
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateSeverity, setEscalateSeverity] = useState<'Low' | 'Medium' | 'High'>('Medium');

  // Edit States (Available before assignment)
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Soft-Delete States
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const showBannerMessage = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  // Sync edit mode from search query param (e.g. ?edit=true)
  useEffect(() => {
    if (ticket) {
      setEditTitle(ticket.title);
      setEditDescription(ticket.description);
      
      const editMode = searchParams.get('edit') === 'true';
      if (editMode && !ticket.assignedConsultant && ticket.status === 'New') {
        setShowEditDialog(true);
      }
    }
  }, [searchParams, ticket]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-zinc-955 font-mono text-xs">
        <div className="text-center space-y-3">
          <span className="animate-spin inline-block w-4 h-4 border border-zinc-955 border-t-transparent rounded-full"></span>
          <p className="tracking-wider">Loading Ticket Details...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center text-red-655 font-bold font-mono text-xs border border-red-200 rounded-lg bg-red-50/50">
        Error: Ticket ID {ticketId} not found in corporate support registers.
      </div>
    );
  }

  // Double check organization scope
  const customerCompany = user?.company || 'Apex Global Industries';
  if (ticket.organization !== customerCompany) {
    return (
      <div className="p-8 text-center text-red-655 font-bold font-mono text-xs border border-red-200 rounded-lg bg-red-50/50">
        Security Breach: You are not authorized to access this support register.
      </div>
    );
  }

  // Filter public comments and attachments
  const visibleComments = (ticket.comments || []).filter(c => !c.isInternal);
  const visibleAttachments = (ticket.attachments || []).filter(a => a.visibility === 'public');

  // Unified activity log timeline (Combining public comments and audits)
  const timelineEvents = [
    ...visibleComments.map(c => ({
      type: 'comment',
      id: c.id,
      title: 'Response Posted',
      author: c.authorName,
      role: c.authorRole,
      content: c.content,
      createdAt: c.createdAt,
      attachments: c.attachments
    })),
    ...(ticket.history || []).map(h => ({
      type: 'audit',
      id: h.id,
      title: `${h.fieldChanged} modified`,
      author: h.changedBy,
      role: 'System',
      content: `Field "${h.fieldChanged}" changed from "${h.oldValue}" to "${h.newValue}"`,
      createdAt: h.createdAt,
      attachments: []
    })),
    ...(ticket.escalations || []).map(e => ({
      type: 'escalation',
      id: e.id,
      title: 'Escalation Alert Logged',
      author: e.escalatedBy,
      role: 'Client Requester',
      content: `Escalation requested. Severity: ${e.severity}. Reason: ${e.reason} [Status: ${e.status}]`,
      createdAt: e.createdAt,
      attachments: []
    }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // SLA status builders
  const isIncident = ticket.ticketType === 'Incident' || !ticket.ticketType;
  const isSlaApplicable = isIncident && ticket.slaDueAt !== 'SLA Not Applicable';
  
  const getSlaStatus = () => {
    if (!isSlaApplicable) return { label: 'SLA Exempted', color: 'bg-zinc-100 text-zinc-500 border-zinc-200' };
    
    const nowTime = new Date().getTime();
    const due = new Date(ticket.slaDueAt).getTime();
    const resolved = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : null;

    if (resolved) {
      if (resolved > due) return { label: 'SLA Breached (Resolved Overdue)', color: 'bg-red-50 text-red-700 border-red-200' };
      return { label: 'SLA Met (Resolved On Time)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }

    if (nowTime > due) return { label: 'SLA Breached (Overdue)', color: 'bg-red-50 text-red-700 border-red-200 animate-pulse' };
    
    const diff = due - nowTime;
    if (diff < 12 * 60 * 60 * 1000) return { label: 'SLA Near Breach', color: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' };
    return { label: 'SLA Active (On Track)', color: 'bg-emerald-50 text-emerald-700 border-emerald-250' };
  };

  const slaStatus = getSlaStatus();

  // Timeline step helper (1-5)
  const getTimelineStep = (status: string) => {
    switch (status) {
      case 'New':
        return 1;
      case 'Assigned':
      case 'Requirement Gathering':
      case 'Awaiting Functional Submission':
      case 'Awaiting Technical Submission':
        return 2;
      case 'In Progress':
      case 'In Progress - Functional':
      case 'In Progress - Technical':
      case 'Waiting for Internal Team':
      case 'Awaiting Manager Approval':
      case 'Awaiting Closure':
      case 'Request for Closure':
      case 'Raised to SAP':
      case 'On Hold':
        return 3;
      case 'Resolved':
      case 'Waiting for Customer':
      case 'Customer Action':
      case 'Reopen Requested':
      case 'Reopened':
        return 4;
      case 'Closed':
        return 5;
      default:
        return 1;
    }
  };

  const currentStepIndex = getTimelineStep(ticket.status);

  // File type icon mapper
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage size={18} className="text-blue-500" />;
    if (fileType.includes('pdf')) return <FileText size={18} className="text-red-500" />;
    if (fileType.includes('sheet') || fileType.includes('excel')) return <FileText size={18} className="text-emerald-500" />;
    return <File size={18} className="text-zinc-500" />;
  };

  // Handle Multi-File Selector
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    
    const newFiles = selected.map(file => {
      const id = `${Date.now()}-${file.name}`;
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      
      const pendingFile: PendingAttachment = { id, file, progress: 0, previewUrl };
      
      // Simulate progress bar loading animation
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setCommentFiles(prev =>
          prev.map(f => f.id === id ? { ...f, progress: currentProgress } : f)
        );
        if (currentProgress >= 100) {
          clearInterval(interval);
        }
      }, 60);

      return pendingFile;
    });

    setCommentFiles(prev => [...prev, ...newFiles]);
  };

  // Remove a pending file from list
  const removePendingFile = (id: string) => {
    setCommentFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  // Handlers
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && commentFiles.length === 0) return;

    // Filter files that are fully "uploaded"
    const filesToSubmit = commentFiles
      .filter(f => f.progress >= 100)
      .map(f => ({
        fileName: f.file.name,
        fileSize: f.file.size,
        fileType: f.file.type,
        fileObj: f.file
      }));

    await addComment(
      ticket.id,
      commentText,
      user?.name || 'Sarah Jenkins',
      user?.email || 'customer@sap.com',
      'Customer',
      false, // isInternal = false
      filesToSubmit.length > 0 ? filesToSubmit : undefined
    );

    setCommentText('');
    setCommentFiles([]);
    showBannerMessage('Comment response successfully added to the ticket timeline.');
  };

  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeTicket(ticket.id, ratingScore, ratingFeedback || 'Accepted by client.', user?.name || 'Sarah Jenkins');
    setShowRatingDialog(false);
    setRatingFeedback('');
    showBannerMessage('Ticket has been closed. CSAT rating successfully recorded.');
  };

  const handleReopenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;

    reopenTicket(ticket.id, reopenReason, user?.name || 'Sarah Jenkins');
    setShowReopenDialog(false);
    setReopenReason('');
    showBannerMessage('Ticket successfully reopened. Status shifted back to Reopened.');
  };

  const handleEscalateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateReason.trim()) return;

    requestEscalation(ticket.id, escalateReason, escalateSeverity, user?.name || 'Sarah Jenkins');
    setShowEscalateDialog(false);
    setEscalateReason('');
    showBannerMessage('Escalation request successfully triggered.');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editDescription.trim()) return;
    
    updateTicket(ticket.id, {
      title: editTitle,
      description: editDescription,
      requestedBy: user?.name || 'Customer'
    });
    setShowEditDialog(false);
    showBannerMessage('Ticket details successfully updated.');
  };

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteReason.trim()) return;

    requestDelete(ticket.id, deleteReason, user?.name || 'Customer');
    setShowDeleteDialog(false);
    setDeleteReason('');
    showBannerMessage('Soft-delete request successfully submitted and is awaiting approvals.');
  };

  // Quotes generator
  const handleQuoteComment = (author: string, content: string) => {
    const formattedQuote = `> ${author} wrote:\n> ${content}\n\n`;
    setCommentText(prev => formattedQuote + prev);
  };

  // Blockquote Parser for Comments
  const renderCommentContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.trim().startsWith('>')) {
        return (
          <blockquote key={idx} className="border-l-4 border-zinc-300 pl-3 italic text-zinc-500 bg-zinc-50 py-1.5 px-2.5 rounded my-1.5 text-[11px] leading-relaxed">
            {line.trim().substring(1).trim()}
          </blockquote>
        );
      }
      return <p key={idx} className="leading-relaxed text-zinc-800 mt-1">{line}</p>;
    });
  };

  // Hours calculations (Reveal ONLY upon Closed status)
  const isClosed = ticket.status === 'Closed';
  const actualFuncHours = isClosed && ticket.actualHoursLogs ? ticket.actualHoursLogs.filter(h => h.consultantType === 'Functional').reduce((sum, h) => sum + h.actualHours, 0) : 0;
  const actualTechHours = isClosed && ticket.actualHoursLogs ? ticket.actualHoursLogs.filter(h => h.consultantType === 'Technical').reduce((sum, h) => sum + h.actualHours, 0) : 0;
  const totalActualHours = actualFuncHours + actualTechHours;

  const totalEffortApproved = (ticket.efforts || [])
    .filter(e => e.status === 'Approved')
    .reduce((sum, e) => sum + e.hoursLogged, 0);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-500 rounded-lg p-4 flex items-start gap-3 text-emerald-800 animate-in fade-in slide-in-from-top-1 duration-200 shadow-md">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider block text-xs">SUCCESS</span>
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
      
      {/* ── HIGH FIDELITY HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-950 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/customer/tickets" className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-zinc-400 hover:text-white uppercase transition border border-zinc-700/60 rounded px-2.5 py-1 bg-zinc-800/40 backdrop-blur-xs">
                <ArrowLeft size={12} /> Back to registers
              </Link>
              <span className="text-xl font-bold font-mono text-indigo-400 tracking-wider">{ticket.id}</span>
              <Badge className="bg-indigo-500 text-white font-mono text-[9px] uppercase rounded border-0 px-2 py-0.5">{ticket.ticketType || 'Incident'}</Badge>
              {ticket.softDeleteStatus === 'Pending Delete' && (
                <Badge variant="outline" className="bg-amber-900/40 text-amber-300 border-amber-500/50 font-mono text-[9px] uppercase px-2 py-0.5 animate-pulse">PENDING DELETION APPROVAL</Badge>
              )}
            </div>
            
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">{ticket.title}</h1>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs font-mono text-zinc-350">
              <div className="flex items-center gap-1.5">
                <Building2 size={13} className="text-zinc-500" />
                <span>{ticket.organization}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-zinc-500" />
                <span>Opened: {new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-zinc-500" />
                <span>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-zinc-500" />
                <span>Module: {ticket.sapModule}</span>
              </div>
            </div>
          </div>

          {/* Call to Actions Panel */}
          <div className="flex flex-wrap gap-2 md:self-end">
            
            {/* Edit Button (Available BEFORE Consultant Assignment only) */}
            {!ticket.assignedConsultant && ticket.status === 'New' && (
              <Button
                onClick={() => setShowEditDialog(true)}
                variant="outline"
                className="bg-zinc-800/80 hover:bg-zinc-700/80 text-white border-zinc-700 text-[10px] font-mono font-bold uppercase tracking-wider h-8 hover:border-white transition flex items-center gap-1"
              >
                <Edit size={12} />
                Edit Incident
              </Button>
            )}

            {ticket.status === 'Resolved' && (
              <>
                {/* Accept & Close */}
                <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-bold uppercase tracking-wider h-8 px-4 transition-all shadow-md">
                      Accept & Close Ticket
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border border-zinc-200 rounded-xl p-6 font-mono text-xs max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-bold uppercase tracking-wider font-mono">Confirm Support Resolution</DialogTitle>
                      <DialogDescription className="text-[11px] font-mono mt-1">
                        Rate your satisfaction with the resolution of incident {ticket.id} to confirm closing.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRatingSubmit} className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Satisfaction Score (CSAT)</label>
                        <div className="flex gap-2 justify-center py-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRatingScore(star)}
                              className="p-1 text-zinc-300 hover:text-amber-500 transition-colors"
                            >
                              <Star
                                size={24}
                                className={star <= ratingScore ? 'fill-amber-500 text-amber-500' : 'text-zinc-200'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Closing Feedback Notes</label>
                        <textarea
                          rows={3}
                          placeholder="Provide details on response time, quality of fix, or other notes..."
                          value={ratingFeedback}
                          onChange={(e) => setRatingFeedback(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="w-full bg-zinc-950 hover:bg-zinc-900 text-white uppercase text-[10px] tracking-wider font-bold">
                          Confirm and Close
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
   
                {/* Reject & Reopen */}
                <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-red-950/20 hover:bg-red-950/40 text-red-200 border-red-500/50 hover:border-red-400 text-[10px] font-mono font-bold uppercase tracking-wider h-8">
                      Reject Fixed & Reopen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border border-zinc-205 rounded-xl p-6 font-mono text-xs max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-bold uppercase tracking-wider font-mono">Reject Fixed & Reopen</DialogTitle>
                      <DialogDescription className="text-[11px] font-mono mt-1">
                        State the reasons why the proposed solution failed to resolve the incident.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleReopenSubmit} className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Detailed Reopen Reason (Mandatory)</label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Replication steps showing issue still persists..."
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950"
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="w-full bg-red-600 hover:bg-red-750 text-white uppercase text-[10px] tracking-wider font-bold">
                          Confirm Reopen
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {ticket.status === 'Closed' && (
              <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-zinc-800/80 hover:bg-zinc-700/80 text-white border-zinc-700 text-[10px] font-mono font-bold uppercase tracking-wider h-8">
                    Request Ticket Reopen
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border border-zinc-200 rounded-xl p-6 font-mono text-xs max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-bold uppercase tracking-wider font-mono">Request Ticket Reopen</DialogTitle>
                    <DialogDescription className="text-[11px] font-mono mt-1">
                      Briefly detail why the ticket needs to be reactivated.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleReopenSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Reopen Reason</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Why do you need to reopen this closed ticket..."
                        value={reopenReason}
                        onChange={(e) => setReopenReason(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full bg-zinc-950 hover:bg-zinc-900 text-white uppercase text-[10px] tracking-wider font-bold">
                        Reopen Ticket
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {/* SLA Escalation */}
            {ticket.status !== 'Closed' && ticket.status !== 'Resolved' && !ticket.escalationFlag && (
              <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-red-950/20 hover:bg-red-950/40 text-red-200 border-red-500/50 hover:border-red-400 text-[10px] font-mono font-bold uppercase tracking-wider h-8">
                    Request Escalation
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border border-zinc-200 rounded-xl p-6 font-mono text-xs max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-bold uppercase tracking-wider font-mono text-red-850">Request SLA Escalation</DialogTitle>
                    <DialogDescription className="text-[11px] font-mono mt-1">
                      Escalate this request to SAP service managers due to business disruption.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleEscalateSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Escalation Level</label>
                      <select
                        value={escalateSeverity}
                        onChange={(e: any) => setEscalateSeverity(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs text-zinc-955 focus:outline-none"
                      >
                        <option value="Low">Low Severity</option>
                        <option value="Medium">Medium Severity</option>
                        <option value="High">High Severity</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Escalation Reason</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="State standard business impact, SLA slippage details, or lack of feedback..."
                        value={escalateReason}
                        onChange={(e) => setEscalateReason(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full bg-zinc-950 hover:bg-zinc-900 text-white uppercase text-[10px] tracking-wider font-bold">
                        Escalate Request
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {/* Soft-Delete Button */}
            {ticket.softDeleteStatus === 'Active' && (
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="outline"
                className="bg-red-950/20 hover:bg-red-950/40 text-red-200 border-red-500/50 hover:border-red-400 text-[10px] font-mono font-bold uppercase tracking-wider h-8 flex items-center gap-1"
              >
                <Trash2 size={12} />
                Request Deletion
              </Button>
            )}

          </div>
        </div>
      </div>

      {/* ── INTERACTIVE TIMELINE WORKSPACE ── */}
      <Card className="border-zinc-200 shadow-sm bg-white p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-mono font-bold text-xs uppercase text-zinc-400 tracking-wider">Ticket Lifecycle Timeline</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-400">Current Phase:</span>
              <Badge className={`font-mono text-[10px] rounded px-2 py-0.5 hover:bg-transparent ${
                ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-emerald-100 text-emerald-850' :
                ticket.status === 'Waiting for Customer' || ticket.status === 'Customer Action' ? 'bg-amber-100 text-amber-850 animate-pulse' :
                ticket.status === 'New' ? 'bg-zinc-955 text-white font-bold' :
                'bg-blue-100 text-blue-800'
              }`}>
                {ticket.status}
              </Badge>
            </div>
          </div>
          
          {/* Timeline Milestones Line */}
          <div className="relative pt-6 pb-2">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-zinc-100 -translate-y-1/2 rounded-full">
              <div 
                className="h-full bg-indigo-650 bg-indigo-500 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(0, ((currentStepIndex - 1) / 4) * 100)}%` }}
              ></div>
            </div>
            
            <div className="relative flex justify-between">
              {[
                { step: 1, label: 'Submitted', desc: 'New Register', icon: <FileText size={14} /> },
                { step: 2, label: 'Allocated', desc: 'Team Assigned', icon: <Users size={14} /> },
                { step: 3, label: 'In Progress', desc: 'Fix & Adjust', icon: <Wrench size={14} /> },
                { step: 4, label: 'Resolved', desc: 'Verify Solution', icon: <CheckSquare size={14} /> },
                { step: 5, label: 'Closed', desc: 'CSAT & Archive', icon: <Archive size={14} /> }
              ].map((milestone) => {
                const isCompleted = milestone.step < currentStepIndex;
                const isActive = milestone.step === currentStepIndex;
                const isUpcoming = milestone.step > currentStepIndex;

                return (
                  <div key={milestone.step} className="flex flex-col items-center text-center space-y-2 relative z-10">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
                      isActive ? 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse' :
                      isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                      'bg-white border-zinc-200 text-zinc-400'
                    }`}>
                      {isCompleted ? <CheckCircle2 size={16} /> : milestone.icon}
                    </div>
                    <div className="space-y-0.5">
                      <span className={`text-[10px] font-bold block font-mono ${isActive ? 'text-indigo-600' : isCompleted ? 'text-emerald-600' : 'text-zinc-650'}`}>
                        {milestone.label}
                      </span>
                      <span className="text-[9px] text-zinc-400 block font-mono max-w-[80px] leading-tight">
                        {milestone.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Critical SLA Alarm Banner */}
      {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && isSlaApplicable && new Date(ticket.slaDueAt).getTime() < Date.now() && (
        <div className="bg-red-50 border border-red-350 rounded-lg p-4 flex items-start gap-3 text-red-800 animate-pulse">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="font-mono text-xs">
            <span className="font-bold uppercase tracking-wider block">CRITICAL ALERT: SLA Breach Incident</span>
            <p className="mt-1 leading-normal text-[11px]">This ticket has crossed its resolution target time. Immediate escalation has been dispatched to functional managers.</p>
          </div>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Overview, Timeline, SLA Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-zinc-100 p-1 border border-zinc-200 rounded-xl flex gap-1 font-mono text-[10px] w-full max-w-md h-auto">
              <TabsTrigger value="overview" className="rounded-lg px-3 py-1.5 text-[10px] uppercase font-bold tracking-wide data-[state=active]:bg-white data-[state=active]:text-zinc-950 flex-1">Overview & Fix</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-lg px-3 py-1.5 text-[10px] uppercase font-bold tracking-wide data-[state=active]:bg-white data-[state=active]:text-zinc-950 flex-1">Timeline ({timelineEvents.length})</TabsTrigger>
              <TabsTrigger value="efforts" className="rounded-lg px-3 py-1.5 text-[10px] uppercase font-bold tracking-wide data-[state=active]:bg-white data-[state=active]:text-zinc-950 flex-1">SLA & Efforts</TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW & DETAILS */}
            <TabsContent value="overview" className="space-y-6">
              {/* Detailed Description */}
              <Card className="border-zinc-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50">
                  <div className="flex flex-wrap gap-4 text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Building2 size={11} /> {ticket.organization}</span>
                    <span>Category: {ticket.category}</span>
                    <span>Source: {ticket.source}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4 font-mono text-xs">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-zinc-400 uppercase text-[9px] tracking-wider">Replication & Description</h3>
                    <p className="text-zinc-800 leading-relaxed text-[11px] whitespace-pre-wrap">{ticket.description}</p>
                  </div>

                  {ticket.businessImpact && (
                    <div className="space-y-1.5 pt-3 border-t border-zinc-100">
                      <h3 className="font-bold text-zinc-400 uppercase text-[9px] tracking-wider">Business Impact</h3>
                      <p className="text-zinc-800 leading-relaxed text-[11px]">{ticket.businessImpact}</p>
                    </div>
                  )}

                  {/* Public Attachments */}
                  {visibleAttachments.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-zinc-100">
                      <h3 className="font-bold text-zinc-400 uppercase text-[9px] tracking-wider flex items-center gap-1">
                        <Paperclip size={11} />
                        Downloadable Attachments ({visibleAttachments.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {visibleAttachments.map(att => (
                          <a
                            key={att.id}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 hover:border-zinc-950 rounded-lg bg-zinc-50 font-mono font-bold text-[10px] text-zinc-700 hover:text-zinc-950 transition-all shadow-2xs"
                          >
                            <FileCode size={13} className="text-zinc-400" />
                            <span>{att.fileName} ({(att.fileSize / 1024).toFixed(0)}kb)</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Proposed resolution (visible only when resolved or closed) */}
              {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
                <Card className="border-emerald-250 bg-emerald-50/20 shadow-sm overflow-hidden">
                  <CardHeader className="bg-emerald-50/40 pb-2 border-b border-emerald-100">
                    <CardTitle className="text-xs font-mono uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <ShieldCheck size={14} />
                      Solution Delivery Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 font-mono text-xs text-zinc-800">
                    {ticket.rootCause && (
                      <div className="space-y-0.5">
                        <span className="font-bold text-emerald-800 uppercase text-[9px] block">Root Cause Mapped:</span>
                        <p className="leading-relaxed text-[11px]">{ticket.rootCause}</p>
                      </div>
                    )}
                    {ticket.resolutionSummary && (
                      <div className="space-y-0.5">
                        <span className="font-bold text-emerald-800 uppercase text-[9px] block">Resolution Summary:</span>
                        <p className="leading-relaxed text-[11px]">{ticket.resolutionSummary}</p>
                      </div>
                    )}
                    {ticket.transportRequest && (
                      <div className="space-y-1">
                        <span className="font-bold text-emerald-800 uppercase text-[9px] block">SAP Transport Request Linked:</span>
                        <Badge className="bg-emerald-100 border border-emerald-200 text-emerald-800 font-mono text-[10px] rounded px-2 py-0.5">
                          {ticket.transportRequest}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB 2: TIMELINE & CONVERSATIONS */}
            <TabsContent value="timeline" className="space-y-6">
              {/* Timeline Thread */}
              <Card className="border-zinc-200 shadow-sm bg-white">
                <CardContent className="p-6 space-y-6">
                  {timelineEvents.length === 0 ? (
                    <div className="text-center py-10 font-mono text-zinc-400 italic">No updates registered on ticket registry.</div>
                  ) : (
                    <div className="relative border-l border-zinc-200 pl-6 ml-2 space-y-6">
                      {timelineEvents.map((evt) => {
                        const isAudit = evt.type === 'audit';
                        const isEsc = evt.type === 'escalation';

                        return (
                          <div key={evt.id} className="relative group">
                            {/* Point Dot Icon */}
                            <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border bg-white ${
                              isEsc ? 'border-red-400 text-red-500 animate-pulse' : isAudit ? 'border-zinc-200 text-zinc-400' : 'border-zinc-950 text-zinc-950'
                            }`}>
                              {isEsc ? <BadgeAlert size={10} /> : isAudit ? <History size={10} /> : <MessageSquare size={10} />}
                            </span>

                            <div className="space-y-1 animate-in fade-in duration-300">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-400">
                                <span className={`font-bold uppercase tracking-wider ${isEsc ? 'text-red-750' : isAudit ? 'text-zinc-500' : 'text-zinc-950'}`}>
                                  {evt.title}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span>{new Date(evt.createdAt).toLocaleString()}</span>
                                  {evt.type === 'comment' && (
                                    <button
                                      onClick={() => handleQuoteComment(evt.author, evt.content)}
                                      className="opacity-0 group-hover:opacity-100 hover:text-zinc-900 flex items-center gap-0.5 text-zinc-400 transition"
                                      title="Quote reply"
                                    >
                                      <Quote size={10} />
                                      <span>Quote</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              <span className="font-semibold text-zinc-505 text-[10px] block font-mono">
                                Actioned by: <span className="font-bold text-zinc-950">{evt.author}</span> {evt.role !== 'System' && `(${evt.role})`}
                              </span>

                              <div className={`mt-1 font-mono text-xs leading-relaxed ${isAudit ? 'text-zinc-500 italic bg-zinc-50 p-2 rounded border border-zinc-100' : 'text-zinc-800'}`}>
                                {isAudit ? evt.content : renderCommentContent(evt.content)}
                              </div>

                              {/* Comment Attachments */}
                              {evt.attachments && evt.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1.5">
                                  {evt.attachments.map((att: any) => (
                                    <a
                                      key={att.id}
                                      href={att.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded font-mono text-[9px] text-zinc-650 hover:border-zinc-950 transition shadow-2xs"
                                    >
                                      <FileCode size={11} className="text-zinc-400" />
                                      <span>{att.fileName}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Message Composer (visible if not closed) */}
              {ticket.status !== 'Closed' && (
                <Card className="border-zinc-200 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="pb-2 border-b border-zinc-100 bg-zinc-50/20">
                    <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-955 flex items-center gap-1.5">
                      <MessageSquare size={13} /> Add Response Reply
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleCommentSubmit} className="space-y-4 font-mono text-xs">
                      <textarea
                        required
                        rows={4}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Provide details on clarifications, feedback requests, or error dumps..."
                        className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-955"
                      />

                      {/* ── HIGH FIDELITY MULTI-FILE ATTACHMENT SELECTOR ── */}
                      <div className="space-y-3 pt-2 border-t border-zinc-100">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Paperclip size={13} className="text-zinc-400" /> Attach files (PDF, Images, Excel, Zip)
                          </label>
                          <span className="text-[9px] text-zinc-400">Max size per file: 10MB</span>
                        </div>

                        {/* Drag & Drop Area Input Box */}
                        <div className="relative border border-dashed border-zinc-300 rounded-lg p-4 bg-zinc-50 hover:bg-zinc-100/50 hover:border-zinc-400 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/zip,application/x-zip-compressed"
                          />
                          <Upload size={18} className="text-zinc-400" />
                          <span className="text-[11px] text-zinc-600 font-bold">Select files or drag & drop</span>
                          <span className="text-[9px] text-zinc-400">Click to choose multiple attachments</span>
                        </div>

                        {/* Files Previews Grid */}
                        {commentFiles.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            {commentFiles.map((pf) => (
                              <div key={pf.id} className="relative flex items-center gap-3 p-2.5 bg-white border border-zinc-200 rounded-lg shadow-2xs font-mono text-[11px]">
                                {pf.previewUrl ? (
                                  <img src={pf.previewUrl} alt="Preview" className="w-10 h-10 object-cover rounded border border-zinc-200" />
                                ) : (
                                  <div className="w-10 h-10 rounded border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                                    {getFileIcon(pf.file.type)}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-zinc-800 truncate">{pf.file.name}</div>
                                  <div className="text-[9px] text-zinc-400">{(pf.file.size / 1024).toFixed(0)} KB</div>
                                  
                                  {/* Progress bar */}
                                  <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-1 border border-zinc-150 overflow-hidden">
                                    <div 
                                      className="bg-indigo-650 bg-indigo-500 h-full transition-all duration-300"
                                      style={{ width: `${pf.progress}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between items-center text-[8px] text-zinc-400 mt-0.5">
                                    <span>{pf.progress >= 100 ? 'Ready' : 'Attaching...'}</span>
                                    <span>{pf.progress}%</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePendingFile(pf.id)}
                                  className="text-zinc-450 hover:text-red-655 p-1 rounded-full hover:bg-zinc-50 transition"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-2 border-t border-zinc-100">
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold uppercase tracking-wider text-[10px] h-9 px-5 shadow-sm">
                          Post Reply
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB 3: SLA & EFFORTS */}
            <TabsContent value="efforts" className="space-y-6">
              {/* SLA details */}
              <Card className="border-zinc-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-955">SLA Resolution Target</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 font-mono text-xs text-zinc-705">
                  <div className="flex justify-between">
                    <span>SLA Application Flag:</span>
                    <span className="font-bold text-zinc-950">{isIncident ? 'ACTIVE (INCIDENT TICKET)' : 'NOT APPLICABLE (EXEMPT TICKET TYPE)'}</span>
                  </div>

                  {isSlaApplicable ? (
                    <>
                      <div className="flex justify-between">
                        <span>Target Resolved Due At:</span>
                        <span className="font-bold text-zinc-950 font-mono">{new Date(ticket.slaDueAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SLA Compliance Status:</span>
                        <Badge className={`${slaStatus.color} font-mono text-[9px] rounded py-0.5 px-1.5 border`}>
                          {slaStatus.label}
                        </Badge>
                      </div>
                      {ticket.resolvedAt && (
                        <div className="flex justify-between">
                          <span>Actual Solution Resolved At:</span>
                          <span className="font-bold text-zinc-950">{new Date(ticket.resolvedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[11px] text-zinc-500 leading-normal flex items-start gap-2">
                      <HelpCircle className="text-zinc-400 shrink-0 mt-0.5" size={14} />
                      <span>
                        SLA tracking applies **only** to Incident class support requests. For other request types (e.g. Enhancement, Change, Service, Training), delivery bounds are governed by target expected resolution schedules rather than system alarms.
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── ACTUAL EFFORTS SECURITY HUB ── */}
              <Card className="border-zinc-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-950">
                    Effort Delivery Logs
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] font-bold border-zinc-200 font-mono">
                    CLIENT VIEW
                  </Badge>
                </CardHeader>
                <CardContent className="p-6 space-y-5 font-mono text-xs">
                  
                  {isClosed ? (
                    <div className="space-y-4 animate-in fade-in duration-500">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-lg flex items-start gap-2.5">
                        <Unlock size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                        <div>
                          <span className="font-bold text-[11px] block uppercase">Actual Delivered Hours Released</span>
                          <span className="text-[10px] text-emerald-700 block mt-0.5">Following customer resolution acceptance and ticket closure, actual time logging registers have been unlocked.</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                        <div className="p-3 bg-slate-50 border border-zinc-200 rounded-lg">
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Functional Hours</span>
                          <span className="text-base font-bold text-zinc-900 block mt-0.5">{actualFuncHours.toFixed(1)}h</span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-zinc-200 rounded-lg">
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Technical Hours</span>
                          <span className="text-base font-bold text-zinc-900 block mt-0.5">{actualTechHours.toFixed(1)}h</span>
                        </div>
                        <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-lg">
                          <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider block">Grand Total Actuals</span>
                          <span className="text-base font-bold text-indigo-650 mt-0.5 block">{totalActualHours.toFixed(1)}h</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 font-mono text-xs">
                      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-center flex flex-col items-center justify-center gap-2">
                        <Lock size={20} className="text-zinc-400" />
                        <span className="font-bold text-zinc-700 uppercase text-[10px] tracking-wider mt-1">Efforts Detail Locked</span>
                        <p className="text-[10px] text-zinc-450 max-w-sm leading-normal">
                          Detailed actual time logs are restricted and locked for executive verification. Timesheet logs are automatically released to the portal upon ticket closure.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[10px] text-zinc-500 leading-normal">
                    <span className="font-bold text-zinc-650 uppercase block mb-1">CONTRACT METRICS DISCLOSURE</span>
                    Incidents governed by AMS contracts accrue effort hours against allocated monthly bundles. In-progress logs are audited internally by technical managers for SLA alignment.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: Status Attributes, Assigned Roster, Owner Details */}
        <div className="space-y-6">
          
          {/* Soft-Delete Request status widget if pending delete */}
          {ticket.softDeleteStatus === 'Pending Delete' && ticket.deleteRequests && ticket.deleteRequests.length > 0 && (
            <Card className="border-amber-250 bg-amber-50/20 shadow-sm overflow-hidden">
              <CardHeader className="bg-amber-50/40 pb-2 border-b border-amber-100">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <Trash2 size={14} className="text-amber-600 animate-pulse" />
                  Soft-Delete Pending
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 font-mono text-xs text-zinc-800">
                {ticket.deleteRequests.map((req, idx) => (
                  <div key={req.id || idx} className="space-y-3">
                    <div className="flex justify-between">
                      <span>Requested By:</span>
                      <span className="font-bold text-zinc-950">{req.requestedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Requested At:</span>
                      <span className="font-bold text-zinc-955">{new Date(req.requestedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="border-t border-amber-100/50 pt-2.5 space-y-1">
                      <span className="font-bold block text-[9px] text-amber-850 uppercase">Reason for Deletion:</span>
                      <p className="italic text-zinc-700">"{req.reason}"</p>
                    </div>
                    <div className="border-t border-amber-100/50 pt-2.5 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 bg-white rounded border border-amber-100 text-center">
                        <span className="font-bold block text-[8px] text-zinc-400 uppercase">Manager</span>
                        <Badge variant="outline" className="mt-1.5 bg-amber-50 text-amber-700 border-amber-200 text-[8px] font-mono rounded">
                          {req.managerApproval}
                        </Badge>
                      </div>
                      <div className="p-2 bg-white rounded border border-amber-100 text-center">
                        <span className="font-bold block text-[8px] text-zinc-400 uppercase">Super Admin</span>
                        <Badge variant="outline" className="mt-1.5 bg-amber-50 text-amber-700 border-amber-200 text-[8px] font-mono rounded">
                          {req.adminApproval}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── STAFFING SUPPORT ROSTER ── */}
          <Card className="border-zinc-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-2 border-b border-zinc-100 bg-zinc-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-955 flex items-center gap-1.5">
                <Users size={13} className="text-zinc-500" /> Support Team Roster
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 font-mono text-xs">
              
              {(!ticket.assignments || ticket.assignments.filter(a => a.active).length === 0) ? (
                <div className="space-y-2 text-center py-4 bg-zinc-50 border border-zinc-150 rounded-lg">
                  <span className="text-[11px] text-zinc-450 italic block">Queue Allocation Pending</span>
                  <p className="text-[9px] text-zinc-400 max-w-[200px] mx-auto leading-normal">Our technical team is reviewing module expertise to assign the primary lead consultant.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(ticket.assignments || [])
                    .filter(a => a.active)
                    .map((assignment) => {
                      return (
                        <div 
                          key={assignment.consultantId} 
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-200 ${
                            assignment.isPrimary 
                              ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs' 
                              : 'bg-slate-50 border-zinc-200'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-zinc-900 block text-xs">{assignment.consultantName}</span>
                              {assignment.isPrimary && (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-[8px] font-mono tracking-wider font-bold py-0 px-1.5 uppercase rounded-sm flex items-center gap-0.5 shadow-2xs">
                                  <Star size={8} className="fill-white" /> Lead
                                </Badge>
                              )}
                            </div>
                            <div className="text-[9px] text-zinc-450 font-mono">
                              Role: <span className="font-bold text-zinc-650">{assignment.consultantType} Consultant</span>
                            </div>
                          </div>
                          
                          <div className="text-right space-y-0.5">
                            <span className="text-[9px] text-zinc-400 font-mono block">
                              Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                            </span>
                            <Badge variant="outline" className={`text-[8px] font-mono uppercase tracking-wider px-1.5 py-0 rounded ${
                              assignment.isPrimary ? 'border-indigo-300 text-indigo-705' : 'border-zinc-300 text-zinc-600'
                            }`}>
                              {assignment.isPrimary ? 'Primary' : 'Secondary'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Registers Card */}
          <Card className="border-zinc-200 shadow-sm bg-white">
            <CardHeader className="pb-2 border-b border-zinc-100 bg-zinc-50/50">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-950">System Registers</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5 font-mono text-xs text-zinc-705">
              <div className="flex justify-between">
                <span>SAP Modules:</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                  {(ticket.sapModules || [ticket.sapModule || 'FICO']).map(m => (
                    <Badge key={m} variant="outline" className="text-[8px] font-mono bg-zinc-50 border-zinc-300 text-zinc-700 rounded py-0 px-1">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <span>Status Flag:</span>
                <Badge className={`font-mono text-[9px] rounded py-0.5 px-1.5 border-0 hover:bg-transparent ${
                  ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-emerald-100 text-emerald-850' :
                  ticket.status === 'Waiting for Customer' ? 'bg-amber-100 text-amber-850 animate-pulse' :
                  ticket.status === 'New' ? 'bg-zinc-950 text-white font-bold' :
                  'bg-zinc-150 text-zinc-800'
                }`}>
                  {ticket.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Severity Priority:</span>
                <Badge className={`font-mono text-[9px] rounded py-0.5 px-1.5 border-0 hover:bg-transparent ${
                  ticket.priority === 'Critical' ? 'bg-red-100 text-red-800 animate-pulse' :
                  ticket.priority === 'High' ? 'bg-zinc-950 text-white' :
                  'bg-zinc-100 text-zinc-800'
                }`}>
                  {ticket.priority}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Scope Category:</span>
                <span className="font-bold text-zinc-900 uppercase text-[10px]">{ticket.functionalOrTechnical || 'Functional'}</span>
              </div>

              <div className="border-t border-zinc-100 pt-3.5 space-y-3.5">
                <div className="flex justify-between">
                  <span>Assigned Lead:</span>
                  <span className="font-bold text-zinc-950">{ticket.assignedConsultant || 'Queue (Pending Allocation)'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Next Action Owner:</span>
                  <span className="font-bold text-zinc-950">{ticket.nextActionOwner || (ticket.assignedConsultant ? ticket.assignedConsultant : 'Support Desk')}</span>
                </div>
                {ticket.expectedResolutionDate && (
                  <div className="flex justify-between">
                    <span>Expected Date:</span>
                    <span className="font-bold text-zinc-905 font-mono">{new Date(ticket.expectedResolutionDate).toLocaleDateString()}</span>
                  </div>
                )}
                {ticket.reopenedCount ? (
                  <div className="flex justify-between">
                    <span>Reopened Loop:</span>
                    <Badge className="bg-red-50 text-red-700 font-mono text-[9px] border-red-200">{ticket.reopenedCount} Times</Badge>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Active Escalation Details */}
          {ticket.escalationFlag && (
            <Card className="border-red-205 bg-red-50/30 shadow-sm">
              <CardHeader className="bg-red-100/40 pb-2 border-b border-red-100">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-red-850 flex items-center gap-1.5">
                  <BadgeAlert size={14} className="text-red-650 animate-pulse" />
                  Active Service Escalation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 font-mono text-xs text-red-950">
                {ticket.escalations && ticket.escalations.length > 0 ? (
                  (() => {
                    const latestEsc = ticket.escalations[ticket.escalations.length - 1];
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span>Severity Level:</span>
                          <span className="uppercase text-red-750">{latestEsc.severity}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold">
                          <span>Status:</span>
                          <Badge className="bg-red-100 text-red-850 border border-red-200 text-[8px] py-0 px-1 rounded-sm uppercase">{latestEsc.status}</Badge>
                        </div>
                        <div className="space-y-0.5 border-t border-red-100/50 pt-2 text-[11px]">
                          <span className="font-bold block text-[9px] text-red-800">Escalation Reason:</span>
                          <p className="italic leading-normal text-red-900 font-mono">"{latestEsc.reason}"</p>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-[11px] text-zinc-550 font-bold">Escalation flag is active. Allocating SLA resolution team.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* SLA Clock Card */}
          {isSlaApplicable && (
            <Card className="border-zinc-200 shadow-sm bg-white">
              <CardHeader className="pb-2 border-b border-zinc-100 bg-zinc-50/50">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-950 flex items-center gap-1">
                  <Clock size={13} />
                  SLA Target Clock
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-center font-mono space-y-3">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Due Date Time</span>
                  <span className="text-xs font-bold text-zinc-950 block mt-1">{new Date(ticket.slaDueAt).toLocaleString()}</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-[10px] font-bold uppercase ${
                  ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-emerald-50 text-emerald-800 border-emerald-250' : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                }`}>
                  {ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'SLA Target Closed' : 'Active Clock Pending'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* DIALOGS FOR EDIT AND DELETE REQUESTS */}

      {/* 1. Edit Description Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md bg-white border border-zinc-200 font-mono text-xs">
          <DialogHeader>
            <DialogTitle>Edit Support Request description</DialogTitle>
            <DialogDescription>
              Modify title and description elements before consultant assignment begins.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">Ticket Title</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">Detailed description</label>
              <textarea
                rows={5}
                required
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="h-8 text-[10px] uppercase font-bold" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" className="h-8 text-[10px] uppercase font-bold bg-zinc-950 text-white">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Soft-Delete Request Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md bg-white border border-zinc-200 font-mono text-xs">
          <DialogHeader>
            <DialogTitle>Submit Deletion Request</DialogTitle>
            <DialogDescription>
              Explain the reason why you are requesting this ticket to be deleted.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeleteSubmit} className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">Reason for deletion</label>
              <textarea
                rows={3}
                required
                placeholder="Mistaken duplicate creation, resolved internally before assignment..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="h-8 text-[10px] uppercase font-bold" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" className="h-8 text-[10px] uppercase font-bold bg-red-650 hover:bg-red-750 text-white">
                Request Soft-Delete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
