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
  Users,
  Wrench,
  CheckSquare,
  Archive,
  ShieldCheck,
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
  Sparkles,
  ChevronRight,
  HelpCircle as QuestionIcon
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

  // Interaction States
  const [commentText, setCommentText] = useState('');
  const [commentFiles, setCommentFiles] = useState<PendingAttachment[]>([]);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateSeverity, setEscalateSeverity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const showBannerMessage = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  // Sync edit mode details from query params or database record
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
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <span className="absolute inset-0 rounded-full border-4 border-indigo-500/30"></span>
            <span className="absolute inset-0 rounded-full border-4 border-t-indigo-400 animate-spin"></span>
          </div>
          <p className="font-mono text-sm tracking-widest text-indigo-300">SECURE CONTEXT RETRIEVAL...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 text-center rounded-xl bg-slate-900 border border-red-500/30 text-white shadow-2xl space-y-4">
        <AlertCircle size={40} className="mx-auto text-red-400" />
        <h2 className="text-lg font-bold font-mono text-red-300">TICKET NOT FOUND</h2>
        <p className="text-xs text-zinc-400 font-mono">
          Incident record ID "{ticketId}" could not be resolved in active organization directories.
        </p>
        <Link href="/customer/tickets" className="inline-block mt-4 text-xs font-mono text-indigo-400 hover:text-indigo-300 underline">
          Return to Registry
        </Link>
      </div>
    );
  }

  // Cross-tenant access validation check
  const customerCompany = user?.company || 'Apex Global Industries';
  if (ticket.organization !== customerCompany) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 text-center rounded-xl bg-slate-950 border border-red-500/50 text-white shadow-2xl space-y-4">
        <BadgeAlert size={44} className="mx-auto text-red-500 animate-pulse" />
        <h2 className="text-lg font-bold font-mono text-red-400 tracking-wider">SECURITY VIOLATION DETECTED</h2>
        <p className="text-xs text-zinc-450 leading-relaxed font-mono">
          Unauthorized attempt to access organization record scope. This transaction has been audited.
        </p>
        <Link href="/customer/tickets" className="inline-block text-xs font-mono text-zinc-400 hover:text-white underline">
          Safe Exit
        </Link>
      </div>
    );
  }

  // Filter out internal comments/attachments to comply with customer view constraints
  const visibleComments = (ticket.comments || []).filter(c => !c.isInternal);
  const visibleAttachments = (ticket.attachments || []).filter(a => a.visibility === 'public');

  // Unified timeline event assembly
  const timelineEvents = [
    ...visibleComments.map(c => ({
      type: 'comment',
      id: c.id,
      title: 'Support Response',
      author: c.authorName,
      role: c.authorRole,
      content: c.content,
      createdAt: c.createdAt,
      attachments: c.attachments
    })),
    ...(ticket.history || []).map(h => ({
      type: 'audit',
      id: h.id,
      title: 'Lifecycle Update',
      author: h.changedBy,
      role: 'System Audit',
      content: `State change: "${h.fieldChanged}" adjusted from "${h.oldValue}" to "${h.newValue}"`,
      createdAt: h.createdAt,
      attachments: []
    })),
    ...(ticket.escalations || []).map(e => ({
      type: 'escalation',
      id: e.id,
      title: 'Escalation Filed',
      author: e.escalatedBy,
      role: 'Customer Flag',
      content: `Disruption escalation registered. Tier: ${e.severity}. Purpose: ${e.reason} [Status: ${e.status}]`,
      createdAt: e.createdAt,
      attachments: []
    }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // SLA assessment calculations
  const isIncident = ticket.ticketType === 'Incident' || !ticket.ticketType;
  const isSlaApplicable = isIncident && ticket.slaDueAt !== 'SLA Not Applicable';

  const getSlaStatus = () => {
    if (!isSlaApplicable) return { label: 'SLA Exempted', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    
    const nowTime = Date.now();
    const due = new Date(ticket.slaDueAt).getTime();
    const resolved = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : null;

    if (resolved) {
      if (resolved > due) return { label: 'SLA Breached', color: 'bg-red-950/40 text-red-400 border-red-900/60' };
      return { label: 'SLA Met (On-Time)', color: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60' };
    }

    if (nowTime > due) return { label: 'SLA Breached (Overdue)', color: 'bg-red-950/50 text-red-300 border-red-700/50 animate-pulse' };
    if (due - nowTime < 12 * 60 * 60 * 1000) return { label: 'SLA Warning Threshold', color: 'bg-amber-950/40 text-amber-400 border-amber-800/40' };
    return { label: 'SLA Active', color: 'bg-indigo-950/40 text-indigo-400 border-indigo-900/60' };
  };

  const slaStatus = getSlaStatus();

  // Unified visual step maps
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
      case 'Raised to SAP':
      case 'On Hold':
        return 3;
      case 'Resolved':
      case 'Awaiting Manager Approval':
      case 'Awaiting Closure':
      case 'Request for Closure':
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

  // File Icon Helpers
  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.startsWith('image/')) return <FileImage size={18} className="text-cyan-400" />;
    if (type.includes('pdf')) return <FileText size={18} className="text-red-400" />;
    if (type.includes('sheet') || type.includes('excel')) return <FileText size={18} className="text-emerald-400" />;
    return <File size={18} className="text-zinc-400" />;
  };

  // Multi-file selection attachment queue
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    
    const newFiles = selected.map(file => {
      const id = `${Date.now()}-${file.name}`;
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      const pendingFile: PendingAttachment = { id, file, progress: 0, previewUrl };

      // Micro-animation for file upload progression
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setCommentFiles(prev =>
          prev.map(f => f.id === id ? { ...f, progress: currentProgress } : f)
        );
        if (currentProgress >= 100) {
          clearInterval(interval);
        }
      }, 50);

      return pendingFile;
    });

    setCommentFiles(prev => [...prev, ...newFiles]);
  };

  const removePendingFile = (id: string) => {
    setCommentFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  // Interaction handlers
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && commentFiles.length === 0) return;

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
      user?.name || 'Customer Requester',
      user?.email || 'customer@sap.com',
      'Customer',
      false,
      filesToSubmit.length > 0 ? filesToSubmit : undefined
    );

    setCommentText('');
    setCommentFiles([]);
    showBannerMessage('Reply submitted successfully to the support ticket thread.');
  };

  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeTicket(ticket.id, ratingScore, ratingFeedback || 'Closed by user.', user?.name || 'Sarah Jenkins');
    setShowRatingDialog(false);
    setRatingFeedback('');
    showBannerMessage('Incident closed. Satisfaction details captured.');
  };

  const handleReopenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;

    reopenTicket(ticket.id, reopenReason, user?.name || 'Customer User');
    setShowReopenDialog(false);
    setReopenReason('');
    showBannerMessage('Ticket status reverted back to Reopened.');
  };

  const handleEscalateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateReason.trim()) return;

    requestEscalation(ticket.id, escalateReason, escalateSeverity, user?.name || 'Customer User');
    setShowEscalateDialog(false);
    setEscalateReason('');
    showBannerMessage('Urgent SLA escalation flag requested.');
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
    showBannerMessage('Incident definition updated.');
  };

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteReason.trim()) return;

    requestDelete(ticket.id, deleteReason, user?.name || 'Customer');
    setShowDeleteDialog(false);
    setDeleteReason('');
    showBannerMessage('Soft-deletion request registered.');
  };

  const handleQuoteComment = (author: string, content: string) => {
    const formattedQuote = `> ${author} wrote:\n> ${content}\n\n`;
    setCommentText(prev => formattedQuote + prev);
  };

  const renderCommentContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.trim().startsWith('>')) {
        return (
          <blockquote key={idx} className="border-l-4 border-indigo-500 pl-3 italic text-zinc-400 bg-slate-900/50 py-1 px-3 rounded my-2 text-xs">
            {line.trim().substring(1).trim()}
          </blockquote>
        );
      }
      return <p key={idx} className="leading-relaxed mt-1 text-slate-350">{line}</p>;
    });
  };

  // Effort lock-box calculations
  const isClosed = ticket.status === 'Closed';
  const actualFuncHours = isClosed && ticket.actualHoursLogs ? ticket.actualHoursLogs.filter(h => h.consultantType === 'Functional').reduce((sum, h) => sum + h.actualHours, 0) : 0;
  const actualTechHours = isClosed && ticket.actualHoursLogs ? ticket.actualHoursLogs.filter(h => h.consultantType === 'Technical').reduce((sum, h) => sum + h.actualHours, 0) : 0;
  const totalActualHours = actualFuncHours + actualTechHours;

  return (
    <div className="space-y-6 pb-12 text-slate-100 min-h-screen bg-slate-950 p-4 md:p-8 font-sans">
      
      {/* Dynamic Success Notice */}
      {successBanner && (
        <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-4 flex items-center gap-3 text-emerald-300 shadow-lg backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <div className="flex-1 text-xs font-mono">{successBanner}</div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-white font-mono text-[10px] uppercase font-bold px-2 py-1 rounded hover:bg-emerald-900/50 transition">Dismiss</button>
        </div>
      )}

      {/* ── Sleek Enterprise Hero Panel ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-950 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/customer/tickets" className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-zinc-400 hover:text-white uppercase transition border border-slate-800 rounded-lg px-3 py-1.5 bg-slate-950 hover:bg-slate-900">
                <ArrowLeft size={12} /> Back to registers
              </Link>
              <span className="text-lg font-bold font-mono text-indigo-400 tracking-wider">{ticket.id}</span>
              <Badge className="bg-indigo-650 hover:bg-indigo-600 text-white font-mono text-[10px] uppercase px-2.5 py-0.5 rounded-md border-0">{ticket.ticketType || 'Incident'}</Badge>
              {ticket.softDeleteStatus === 'Pending Delete' && (
                <Badge variant="outline" className="bg-amber-950/50 text-amber-300 border-amber-500/50 font-mono text-[10px] uppercase px-2 py-0.5 animate-pulse">Pending Removal approval</Badge>
              )}
            </div>
            
            <h1 className="text-xl md:text-3xl font-extrabold tracking-tight text-white">{ticket.title}</h1>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs font-mono text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Building2 size={14} className="text-indigo-400" />
                <span>{ticket.organization}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-400" />
                <span>Submitted: {new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-indigo-400" />
                <span>Modified: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-400" />
                <span>Module: {ticket.sapModule}</span>
              </div>
            </div>
          </div>

          {/* Action Operations Console */}
          <div className="flex flex-wrap gap-2 md:self-end">
            
            {/* Edit details link */}
            {!ticket.assignedConsultant && ticket.status === 'New' && (
              <Button
                onClick={() => setShowEditDialog(true)}
                variant="outline"
                className="bg-slate-900 border-slate-800 hover:border-slate-700 text-zinc-300 hover:text-white text-[11px] font-mono uppercase h-9 flex items-center gap-1.5 transition"
              >
                <Edit size={13} /> Edit Description
              </Button>
            )}

            {ticket.status === 'Resolved' && (
              <>
                <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono uppercase h-9 px-4 shadow-lg transition">
                      Accept & Close Ticket
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white max-w-sm font-sans">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-bold uppercase font-mono text-indigo-400">Confirm Ticket Resolution</DialogTitle>
                      <DialogDescription className="text-xs text-zinc-400 mt-1">
                        Please evaluate the support quality of incident {ticket.id} to confirm closure.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRatingSubmit} className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">CSAT Satisfaction Score</label>
                        <div className="flex gap-2 justify-center py-2 bg-slate-950 rounded-lg border border-slate-850">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRatingScore(star)}
                              className="p-1 transition-transform active:scale-95"
                            >
                              <Star
                                size={26}
                                className={star <= ratingScore ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">Feedback Summary</label>
                        <textarea
                          rows={3}
                          placeholder="Tell us about the solution speed, accuracy, or consultant professionalism..."
                          value={ratingFeedback}
                          onChange={(e) => setRatingFeedback(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="w-full bg-indigo-650 hover:bg-indigo-600 text-white uppercase text-xs font-mono font-bold tracking-widest py-2.5 rounded-lg">
                          Confirm Closure
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
   
                <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-red-950/20 hover:bg-red-950/40 text-red-200 border-red-900/60 hover:border-red-500 text-[11px] font-mono uppercase h-9">
                      Reject & Reopen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-bold uppercase font-mono text-red-400">Reject Fix & Reopen</DialogTitle>
                      <DialogDescription className="text-xs text-zinc-400 mt-1">
                        State the technical grounds or verification errors showing the problem remains unresolved.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleReopenSubmit} className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">Explanation Notes (Mandatory)</label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Explain what failed, system steps to reproduce, error codes, etc..."
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="w-full bg-red-650 hover:bg-red-700 text-white uppercase text-xs font-mono font-bold py-2.5 rounded-lg">
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
                  <Button variant="outline" className="bg-slate-900 border-slate-800 hover:border-slate-700 text-zinc-300 hover:text-white text-[11px] font-mono uppercase h-9">
                    Request Reopen
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-bold uppercase font-mono text-indigo-400">Request Closed Ticket Reopen</DialogTitle>
                    <DialogDescription className="text-xs text-zinc-400 mt-1">
                      Briefly detail why this archived incident must be reactivated for review.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleReopenSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase block font-mono">Reason for reopening</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Detail subsequent issues or incomplete patches related to this scope..."
                        value={reopenReason}
                        onChange={(e) => setReopenReason(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full bg-indigo-650 hover:bg-indigo-600 text-white uppercase text-xs font-mono font-bold tracking-widest py-2.5 rounded-lg">
                        Submit Reopen Request
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {/* SLA Escalation request */}
            {ticket.status !== 'Closed' && ticket.status !== 'Resolved' && !ticket.escalationFlag && (
              <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-red-950/20 hover:bg-red-950/40 text-red-200 border-red-900/60 hover:border-red-500 text-[11px] font-mono uppercase h-9">
                    Escalate Incident
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm font-bold uppercase font-mono text-red-400">File SLA Escalation</DialogTitle>
                    <DialogDescription className="text-xs text-zinc-400 mt-1">
                      Alert SAP Support coordinators regarding business-critical blocks.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleEscalateSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase block font-mono">Escalation Tier</label>
                      <select
                        value={escalateSeverity}
                        onChange={(e: any) => setEscalateSeverity(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none"
                      >
                        <option value="Low">Low (Response Delay)</option>
                        <option value="Medium">Medium (Disruption Escalation)</option>
                        <option value="High">High (Production Blocked)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase block font-mono">Justification</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Detail production impact, financial losses, or lack of consultant feedback..."
                        value={escalateReason}
                        onChange={(e) => setEscalateReason(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full bg-indigo-650 hover:bg-indigo-600 text-white uppercase text-xs font-mono font-bold tracking-widest py-2.5 rounded-lg">
                        Submit Escalation
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {ticket.softDeleteStatus === 'Active' && (
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="outline"
                className="bg-red-955/20 hover:bg-red-950/40 text-red-300 border-red-950 hover:border-red-500 text-[11px] font-mono uppercase h-9 flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Request Deletion
              </Button>
            )}

          </div>
        </div>
      </div>

      {/* ── Interactive Progress Step Timeline ── */}
      <div className="p-6 rounded-2xl border border-slate-850 bg-slate-900/50 backdrop-blur-md shadow-lg space-y-5">
        <div className="flex justify-between items-center">
          <span className="font-mono font-bold text-xs uppercase text-zinc-400 tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            Resolution Lifecycle
          </span>
          <Badge className={`font-mono text-[10px] tracking-wide rounded px-3 py-1 hover:bg-transparent ${
            ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40' :
            ticket.status === 'Waiting for Customer' || ticket.status === 'Customer Action' ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40 animate-pulse' :
            ticket.status === 'New' ? 'bg-indigo-950 text-indigo-300 border border-indigo-900/50' :
            'bg-slate-950 text-zinc-400 border border-slate-800'
          }`}>
            {ticket.status}
          </Badge>
        </div>
        
        <div className="relative pt-6 pb-2 px-2">
          {/* Progress Connecting Line */}
          <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-slate-800 -translate-y-1/2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(0, ((currentStepIndex - 1) / 4) * 100)}%` }}
            ></div>
          </div>
          
          <div className="relative flex justify-between">
            {[
              { step: 1, label: 'Submitted', desc: 'Ticket Registered', icon: <FileText size={14} /> },
              { step: 2, label: 'Allocated', desc: 'Lead Assigned', icon: <Users size={14} /> },
              { step: 3, label: 'In Progress', desc: 'Analysis & Fix', icon: <Wrench size={14} /> },
              { step: 4, label: 'Resolved', desc: 'Review Delivery', icon: <CheckSquare size={14} /> },
              { step: 5, label: 'Closed', desc: 'CSAT Saved', icon: <Archive size={14} /> }
            ].map((milestone) => {
              const isCompleted = milestone.step < currentStepIndex;
              const isActive = milestone.step === currentStepIndex;

              return (
                <div key={milestone.step} className="flex flex-col items-center text-center space-y-2.5 relative z-10">
                  <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 ${
                    isActive ? 'bg-indigo-600 border-indigo-500 text-white ring-4 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.5)]' :
                    isCompleted ? 'bg-emerald-500 border-emerald-400 text-white' :
                    'bg-slate-950 border-slate-800 text-zinc-500'
                  }`}>
                    {isCompleted ? <CheckCircle2 size={16} /> : milestone.icon}
                  </div>
                  <div className="space-y-0.5">
                    <span className={`text-[11px] font-bold block font-mono ${isActive ? 'text-indigo-400' : isCompleted ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {milestone.label}
                    </span>
                    <span className="text-[9px] text-zinc-500 block font-mono max-w-[90px] leading-snug">
                      {milestone.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical Breached Warning */}
      {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && isSlaApplicable && new Date(ticket.slaDueAt).getTime() < Date.now() && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-300 animate-pulse shadow-md">
          <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-400" />
          <div className="font-mono text-xs">
            <span className="font-bold uppercase tracking-wider block text-red-400">SLA TARGET EXCEEDED</span>
            <p className="mt-0.5 leading-relaxed text-zinc-300">This request has slipped beyond its target operational contract window. Action notifications have been routed to AMS directors.</p>
          </div>
        </div>
      )}

      {/* Primary Split Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side (2/3 width): Conversation and Logs tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-slate-900 border border-slate-800 p-1.5 rounded-xl flex gap-1 font-mono text-[11px] w-full max-w-md h-auto">
              <TabsTrigger value="overview" className="rounded-lg px-3 py-2 text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-slate-800 data-[state=active]:text-white flex-1 transition">Overview & Fix</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-lg px-3 py-2 text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-slate-800 data-[state=active]:text-white flex-1 transition">Timeline ({timelineEvents.length})</TabsTrigger>
              <TabsTrigger value="efforts" className="rounded-lg px-3 py-2 text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-slate-800 data-[state=active]:text-white flex-1 transition">SLA & Efforts</TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-200">
              <Card className="border-slate-850 bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-850 bg-slate-900/50">
                  <div className="flex flex-wrap gap-4 text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Building2 size={12} className="text-indigo-400" /> {ticket.organization}</span>
                    <span>Category: {ticket.category}</span>
                    <span>Source: {ticket.source}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-5 font-mono text-xs">
                  <div className="space-y-2">
                    <h3 className="font-bold text-zinc-550 uppercase text-[9px] tracking-widest font-mono">Incident Details & Symptoms</h3>
                    <p className="text-slate-300 leading-relaxed text-[12px] whitespace-pre-wrap font-sans bg-slate-950/40 p-4 rounded-xl border border-slate-850/60">{ticket.description}</p>
                  </div>

                  {ticket.businessImpact && (
                    <div className="space-y-2 pt-4 border-t border-slate-850">
                      <h3 className="font-bold text-zinc-550 uppercase text-[9px] tracking-widest font-mono">Business Justification</h3>
                      <p className="text-slate-350 leading-relaxed text-[11px] font-sans">{ticket.businessImpact}</p>
                    </div>
                  )}

                  {visibleAttachments.length > 0 && (
                    <div className="space-y-2.5 pt-4 border-t border-slate-850">
                      <h3 className="font-bold text-zinc-550 uppercase text-[9px] tracking-widest font-mono flex items-center gap-1.5">
                        <Paperclip size={12} className="text-indigo-400" /> Downloadable Attachments ({visibleAttachments.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {visibleAttachments.map(att => (
                          <a
                            key={att.id}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 border border-slate-800 hover:border-slate-700 rounded-lg bg-slate-900/80 font-mono font-bold text-[10px] text-zinc-300 hover:text-white transition-all shadow-sm hover:scale-[1.01]"
                          >
                            <FileCode size={14} className="text-indigo-400" />
                            <span>{att.fileName} ({(att.fileSize / 1024).toFixed(0)}kb)</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resolved Delivery Metadata block */}
              {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
                <Card className="border-emerald-500/20 bg-emerald-950/5 shadow-lg overflow-hidden">
                  <CardHeader className="bg-emerald-950/10 pb-2.5 border-b border-emerald-900/20">
                    <CardTitle className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-400" />
                      Resolution Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 font-mono text-xs text-zinc-300">
                    {ticket.rootCause && (
                      <div className="space-y-1">
                        <span className="font-bold text-emerald-400 uppercase text-[9px] block">Analyzed Root Cause:</span>
                        <p className="leading-relaxed text-[11px] font-sans">{ticket.rootCause}</p>
                      </div>
                    )}
                    {ticket.resolutionSummary && (
                      <div className="space-y-1">
                        <span className="font-bold text-emerald-400 uppercase text-[9px] block">Delivery Fix Action:</span>
                        <p className="leading-relaxed text-[11px] font-sans text-zinc-200">{ticket.resolutionSummary}</p>
                      </div>
                    )}
                    {ticket.transportRequest && (
                      <div className="space-y-1.5">
                        <span className="font-bold text-emerald-400 uppercase text-[9px] block font-mono">SAP Transport Request linked:</span>
                        <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-900/60 font-mono text-[10px] rounded px-2.5 py-0.5">
                          {ticket.transportRequest}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB 2: CONVERSATION timeline */}
            <TabsContent value="timeline" className="space-y-6 animate-in fade-in duration-200">
              <Card className="border-slate-850 bg-slate-900/40 backdrop-blur-md shadow-sm">
                <CardContent className="p-6">
                  {timelineEvents.length === 0 ? (
                    <div className="text-center py-10 font-mono text-zinc-500 italic">No communication logs recorded.</div>
                  ) : (
                    <div className="relative border-l border-slate-800 pl-6 ml-2 space-y-6">
                      {timelineEvents.map((evt) => {
                        const isAudit = evt.type === 'audit';
                        const isEsc = evt.type === 'escalation';

                        return (
                          <div key={evt.id} className="relative group">
                            {/* Point Icon wrapper */}
                            <span className={`absolute -left-[32px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-slate-950 ${
                              isEsc ? 'border-red-500 text-red-400 animate-pulse' : isAudit ? 'border-slate-800 text-zinc-500' : 'border-indigo-500 text-indigo-400'
                            }`}>
                              {isEsc ? <BadgeAlert size={11} /> : isAudit ? <History size={11} /> : <MessageSquare size={11} />}
                            </span>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-500">
                                <span className={`font-bold uppercase tracking-wider ${isEsc ? 'text-red-400' : isAudit ? 'text-zinc-500' : 'text-indigo-400'}`}>
                                  {evt.title}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span>{new Date(evt.createdAt).toLocaleString()}</span>
                                  {evt.type === 'comment' && (
                                    <button
                                      onClick={() => handleQuoteComment(evt.author, evt.content)}
                                      className="opacity-0 group-hover:opacity-100 hover:text-white flex items-center gap-0.5 text-zinc-400 transition"
                                      title="Quote message response"
                                    >
                                      <Quote size={10} />
                                      <span>Quote</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              <span className="font-semibold text-zinc-400 text-[10px] block font-mono">
                                Action By: <span className="font-bold text-zinc-250">{evt.author}</span> {evt.role !== 'System Audit' && `(${evt.role})`}
                              </span>

                              <div className={`mt-1.5 font-mono text-xs leading-relaxed ${isAudit ? 'text-zinc-500 italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-900/60' : 'text-zinc-300'}`}>
                                {isAudit ? evt.content : renderCommentContent(evt.content)}
                              </div>

                              {evt.attachments && evt.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {evt.attachments.map((att: any) => (
                                    <a
                                      key={att.id}
                                      href={att.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded font-mono text-[9px] text-zinc-300 hover:border-slate-700 transition"
                                    >
                                      <FileCode size={12} className="text-indigo-400" />
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

              {/* Message chat composer block */}
              {ticket.status !== 'Closed' && (
                <Card className="border-slate-850 bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden">
                  <CardHeader className="pb-2.5 border-b border-slate-850 bg-slate-900/50">
                    <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
                      <MessageSquare size={14} className="text-indigo-400" /> Compose Response Reply
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleCommentSubmit} className="space-y-4 font-mono text-xs">
                      <textarea
                        required
                        rows={4}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write standard clarification details, request updates, or drop SAP error dumps here..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500/80 transition placeholder-zinc-650"
                      />

                      {/* Multi-file drag and drop panel */}
                      <div className="space-y-3 pt-2.5 border-t border-slate-850">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                            <Paperclip size={14} className="text-indigo-400" /> Attach Files
                          </label>
                          <span className="text-[9px] text-zinc-500">Limits: 10MB per file</span>
                        </div>

                        <div className="relative border border-dashed border-slate-800 rounded-xl p-6 bg-slate-950 hover:bg-slate-900/40 hover:border-slate-700 transition flex flex-col items-center justify-center gap-1.5 cursor-pointer">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/zip,application/x-zip-compressed"
                          />
                          <Upload size={22} className="text-zinc-500" />
                          <span className="text-[12px] text-zinc-300 font-bold font-sans">Browse files or drop them here</span>
                          <span className="text-[9px] text-zinc-500">Hold shift/ctrl for multiple selection selection</span>
                        </div>

                        {/* File upload previews container */}
                        {commentFiles.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            {commentFiles.map((pf) => (
                              <div key={pf.id} className="relative flex items-center gap-3 p-3 bg-slate-950 border border-slate-850 rounded-xl shadow-inner font-mono text-[11px] text-zinc-300">
                                {pf.previewUrl ? (
                                  <img src={pf.previewUrl} alt="Upload preview" className="w-12 h-12 object-cover rounded-lg border border-slate-800" />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg border border-slate-850 bg-slate-900 flex items-center justify-center">
                                    {getFileIcon(pf.file.type)}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-zinc-200 truncate pr-4">{pf.file.name}</div>
                                  <div className="text-[9px] text-zinc-500">{(pf.file.size / 1024).toFixed(0)} KB</div>
                                  
                                  {/* Progress bar visualizer */}
                                  <div className="w-full bg-slate-900 rounded-full h-1 mt-1.5 overflow-hidden">
                                    <div 
                                      className="bg-indigo-500 h-full transition-all duration-300"
                                      style={{ width: `${pf.progress}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between items-center text-[8px] text-zinc-500 mt-1">
                                    <span>{pf.progress >= 100 ? 'Ready to upload' : 'Scanning and caching...'}</span>
                                    <span>{pf.progress}%</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePendingFile(pf.id)}
                                  className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 p-1 hover:bg-slate-900 rounded-full transition"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-3.5 border-t border-slate-850">
                        <Button type="submit" className="bg-indigo-650 hover:bg-indigo-600 text-white font-mono uppercase text-xs tracking-wider h-10 px-6 rounded-lg transition shadow-md">
                          Send Reply Message
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB 3: SLA & EFFORTS */}
            <TabsContent value="efforts" className="space-y-6 animate-in fade-in duration-200">
              <Card className="border-slate-850 bg-slate-900/40 backdrop-blur-md shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-850 bg-slate-900/50">
                  <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-300">SLA Contract Scope</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 font-mono text-xs text-zinc-400">
                  <div className="flex justify-between">
                    <span>SLA Coverage Status:</span>
                    <span className="font-bold text-zinc-200">{isIncident ? 'Active Incident Contract' : 'Exempt Category Type'}</span>
                  </div>

                  {isSlaApplicable ? (
                    <>
                      <div className="flex justify-between">
                        <span>Target Resolution Clock:</span>
                        <span className="font-bold text-zinc-200 font-mono">{new Date(ticket.slaDueAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status Rating:</span>
                        <Badge className={`${slaStatus.color} font-mono text-[10px] rounded px-2 py-0.5 border`}>
                          {slaStatus.label}
                        </Badge>
                      </div>
                      {ticket.resolvedAt && (
                        <div className="flex justify-between">
                          <span>Delivered At:</span>
                          <span className="font-bold text-zinc-200">{new Date(ticket.resolvedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-[11px] text-zinc-450 leading-relaxed flex items-start gap-2.5">
                      <HelpCircle className="text-indigo-400 shrink-0 mt-0.5" size={16} />
                      <p className="font-sans">
                        SLA alarms track Incident classification tickets. Enhancement and change request classifications are managed via scheduled milestone delivery expectations instead of automated breach clocks.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Secure Actual Hours Disclosure Box */}
              <Card className="border-slate-850 bg-slate-900/40 backdrop-blur-md shadow-lg overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-850 bg-slate-900/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-300">
                    Delivered Efforts Registry
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] font-bold border-slate-800 text-indigo-400 font-mono">
                    PORTAL CLEARANCE
                  </Badge>
                </CardHeader>
                <CardContent className="p-6 space-y-5 font-mono text-xs">
                  
                  {isClosed ? (
                    <div className="space-y-4 animate-in fade-in duration-500">
                      <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 rounded-xl flex items-start gap-3">
                        <Unlock size={18} className="shrink-0 mt-0.5 text-emerald-400" />
                        <div>
                          <span className="font-bold text-[11px] block uppercase tracking-wider font-mono">Audit Released</span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5 leading-relaxed font-sans">Delivered actual hours have been unlocked following resolution confirmation and ticket audit closure.</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                        <div className="p-4.5 bg-slate-950 border border-slate-850 rounded-xl">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">Functional Hours</span>
                          <span className="text-xl font-bold text-white block mt-1">{actualFuncHours.toFixed(1)}h</span>
                        </div>
                        <div className="p-4.5 bg-slate-950 border border-slate-850 rounded-xl">
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">Technical Hours</span>
                          <span className="text-xl font-bold text-white block mt-1">{actualTechHours.toFixed(1)}h</span>
                        </div>
                        <div className="p-4.5 bg-indigo-950/30 border border-indigo-900/40 rounded-xl">
                          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block font-mono">Total actuals</span>
                          <span className="text-xl font-bold text-indigo-400 mt-1 block">{totalActualHours.toFixed(1)}h</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-6 bg-slate-950 border border-slate-850 rounded-xl text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-zinc-500 border border-slate-800">
                          <Lock size={20} className="animate-pulse" />
                        </div>
                        <span className="font-bold text-zinc-300 uppercase text-[11px] tracking-wider mt-1 font-mono">Delivered Efforts Encrypted</span>
                        <p className="text-[11px] text-zinc-500 max-w-sm leading-relaxed font-sans">
                          Delivered hours are verified internally by team managers. Summary statements will automatically unlock in this workspace upon ticket closure.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-[10px] text-zinc-550 leading-relaxed font-mono">
                    <span className="font-bold text-indigo-400 uppercase block mb-1">AMS Contract Disclosures</span>
                    Actual timesheet allocations are calculated against active support bundle budgets. Internal reviews occur weekly to optimize deployment performance.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Side (1/3 width): Attributes, Assigned Roster, System Registers */}
        <div className="space-y-6">
          
          {/* Deletion flag alert box */}
          {ticket.softDeleteStatus === 'Pending Delete' && ticket.deleteRequests && ticket.deleteRequests.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-950/20 shadow-sm overflow-hidden">
              <CardHeader className="bg-amber-950/30 pb-2 border-b border-amber-900/30">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Trash2 size={14} className="text-amber-400 animate-pulse" />
                  Deletion Pending Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 font-mono text-xs text-zinc-350">
                {ticket.deleteRequests.map((req, idx) => (
                  <div key={req.id || idx} className="space-y-3">
                    <div className="flex justify-between">
                      <span>Requester:</span>
                      <span className="font-bold text-zinc-200">{req.requestedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Submitted:</span>
                      <span className="font-bold text-zinc-200">{new Date(req.requestedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="border-t border-slate-800/80 pt-2.5 space-y-1">
                      <span className="font-bold block text-[9px] text-amber-400 uppercase">Reason description:</span>
                      <p className="italic text-zinc-400 font-sans">"{req.reason}"</p>
                    </div>
                    <div className="border-t border-slate-800/80 pt-2.5 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 bg-slate-950 rounded border border-slate-850 text-center">
                        <span className="font-bold block text-[8px] text-zinc-500 uppercase">Manager</span>
                        <Badge variant="outline" className="mt-1.5 bg-amber-950/60 text-amber-400 border-amber-900/40 text-[8px] font-mono rounded">
                          {req.managerApproval}
                        </Badge>
                      </div>
                      <div className="p-2 bg-slate-950 rounded border border-slate-850 text-center">
                        <span className="font-bold block text-[8px] text-zinc-500 uppercase">Director</span>
                        <Badge variant="outline" className="mt-1.5 bg-amber-950/60 text-amber-400 border-amber-900/40 text-[8px] font-mono rounded">
                          {req.adminApproval}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Support Roster with glowing Star badges */}
          <Card className="border-slate-850 bg-slate-900/40 backdrop-blur-md shadow-sm overflow-hidden">
            <CardHeader className="pb-2.5 border-b border-slate-850 bg-slate-900/50">
              <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
                <Users size={14} className="text-indigo-400" /> Assigned Roster
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 font-mono text-xs">
              
              {(!ticket.assignments || ticket.assignments.filter(a => a.active).length === 0) ? (
                <div className="space-y-2 text-center py-6 bg-slate-950/40 border border-slate-850 rounded-xl">
                  <span className="text-[11px] text-zinc-500 italic block">Resource Allocation Pending</span>
                  <p className="text-[9px] text-zinc-500 max-w-[200px] mx-auto leading-relaxed font-sans">SAP module leads are assigning a consultant with matching SAP expertise.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(ticket.assignments || [])
                    .filter(a => a.active)
                    .map((assignment) => {
                      return (
                        <div 
                          key={assignment.consultantId} 
                          className={`p-3.5 rounded-xl border flex items-center justify-between transition-all hover:scale-[1.01] ${
                            assignment.isPrimary 
                              ? 'bg-indigo-950/30 border-indigo-900/50 shadow-sm' 
                              : 'bg-slate-950/50 border-slate-850'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-200 block text-xs">{assignment.consultantName}</span>
                              {assignment.isPrimary && (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-[8px] font-mono tracking-wider font-bold py-0.5 px-2 uppercase rounded-md flex items-center gap-0.5 shadow-sm">
                                  <Star size={8} className="fill-white" /> Lead
                                </Badge>
                              )}
                            </div>
                            <div className="text-[9px] text-zinc-500 font-mono">
                              Category: <span className="font-bold text-zinc-400">{assignment.consultantType} Expert</span>
                            </div>
                          </div>
                          
                          <div className="text-right space-y-0.5">
                            <span className="text-[9px] text-zinc-500 font-mono block">
                              {new Date(assignment.assignedAt).toLocaleDateString()}
                            </span>
                            <Badge variant="outline" className={`text-[8px] font-mono uppercase tracking-wider px-2 py-0 rounded ${
                              assignment.isPrimary ? 'border-indigo-850 text-indigo-400' : 'border-slate-800 text-zinc-500'
                            }`}>
                              {assignment.isPrimary ? 'Primary' : 'Support'}
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

          {/* System Registers properties list */}
          <Card className="border-slate-850 bg-slate-900/40 backdrop-blur-md shadow-sm">
            <CardHeader className="pb-2.5 border-b border-slate-850 bg-slate-900/50">
              <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-300">System attributes</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5 font-mono text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>SAP Modules:</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                  {(ticket.sapModules || [ticket.sapModule || 'FICO']).map(m => (
                    <Badge key={m} variant="outline" className="text-[8px] font-mono bg-slate-950 border-slate-850 text-zinc-300 rounded py-0.5 px-1.5">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <span>State Type:</span>
                <Badge className={`font-mono text-[9px] rounded py-0.5 px-1.5 border-0 hover:bg-transparent ${
                  ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' :
                  ticket.status === 'Waiting for Customer' ? 'bg-amber-950 text-amber-400 border border-amber-900/40 animate-pulse' :
                  ticket.status === 'New' ? 'bg-indigo-950 text-indigo-300 border border-indigo-900/50' :
                  'bg-slate-950 text-zinc-400 border border-slate-850'
                }`}>
                  {ticket.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Priority:</span>
                <Badge className={`font-mono text-[9px] rounded py-0.5 px-1.5 border-0 hover:bg-transparent ${
                  ticket.priority === 'Critical' ? 'bg-red-950 text-red-400 border border-red-900/60 animate-pulse' :
                  ticket.priority === 'High' ? 'bg-indigo-950 text-indigo-350 border border-indigo-905' :
                  'bg-slate-950 text-zinc-400 border border-slate-800'
                }`}>
                  {ticket.priority}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Scope Category:</span>
                <span className="font-bold text-zinc-350 uppercase text-[10px]">{ticket.functionalOrTechnical || 'Functional'}</span>
              </div>

              <div className="border-t border-slate-850 pt-3.5 space-y-3.5">
                <div className="flex justify-between">
                  <span>Assigned Lead:</span>
                  <span className="font-bold text-zinc-350">{ticket.assignedConsultant || 'Queue (Allocation Pending)'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Action Owner:</span>
                  <span className="font-bold text-zinc-350">{ticket.nextActionOwner || (ticket.assignedConsultant ? ticket.assignedConsultant : 'Support Desk')}</span>
                </div>
                {ticket.expectedResolutionDate && (
                  <div className="flex justify-between">
                    <span>Target Date:</span>
                    <span className="font-bold text-zinc-300 font-mono">{new Date(ticket.expectedResolutionDate).toLocaleDateString()}</span>
                  </div>
                )}
                {ticket.reopenedCount ? (
                  <div className="flex justify-between">
                    <span>Reopen Count:</span>
                    <Badge className="bg-red-950 text-red-400 font-mono text-[9px] border border-red-900/40">{ticket.reopenedCount} Iterations</Badge>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Active Escalation Details box */}
          {ticket.escalationFlag && (
            <Card className="border-red-500/20 bg-red-950/10 shadow-sm">
              <CardHeader className="bg-red-950/20 pb-2.5 border-b border-red-900/20">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <BadgeAlert size={14} className="text-red-400 animate-pulse" />
                  Active Service Escalation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 font-mono text-xs text-red-300">
                {ticket.escalations && ticket.escalations.length > 0 ? (
                  (() => {
                    const latestEsc = ticket.escalations[ticket.escalations.length - 1];
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px]">
                          <span>Criticality Level:</span>
                          <span className="uppercase text-red-400 font-bold">{latestEsc.severity}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span>Action status:</span>
                          <Badge className="bg-red-950 text-red-400 border border-red-900/40 text-[8px] py-0.5 px-1.5 rounded uppercase">{latestEsc.status}</Badge>
                        </div>
                        <div className="space-y-1.5 border-t border-red-900/20 pt-2 text-[11px]">
                          <span className="font-bold block text-[9px] text-red-400 uppercase">Logged Justification:</span>
                          <p className="italic leading-relaxed text-red-300 font-mono">"{latestEsc.reason}"</p>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-[11px] text-zinc-400 font-bold">Escalation active. Allocating service delivery managers.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* SLA Clock details */}
          {isSlaApplicable && (
            <Card className="border-slate-850 bg-slate-900/40 backdrop-blur-md shadow-sm">
              <CardHeader className="pb-2 border-b border-slate-850 bg-slate-900/50">
                <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-400" />
                  Target SLA Windows
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-center font-mono space-y-3">
                <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">Resolution Due</span>
                  <span className="text-xs font-bold text-indigo-300 block mt-1">{new Date(ticket.slaDueAt).toLocaleString()}</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-[10px] font-bold uppercase ${
                  ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-emerald-950 text-emerald-450 border-emerald-900/30' : 'bg-slate-950 text-zinc-450 border-slate-850'
                }`}>
                  {ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'Resolution Complete' : 'SLA Target Clock Active'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* DIALOGS FOR DEFINITION CORRECTIONS AND DELETION VERIFICATION */}

      {/* Edit Description Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border border-slate-800 text-white font-mono text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase text-indigo-400">Edit Incident Details</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Modify the incident definition tags before a lead consultant has been allocated.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Ticket Title</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Description symptoms</label>
              <textarea
                rows={5}
                required
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="h-9 text-[10px] uppercase font-bold border-slate-800 text-zinc-400" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="h-9 text-[10px] uppercase font-bold bg-indigo-650 hover:bg-indigo-600 text-white">
                Save description changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Soft-Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border border-slate-800 text-white font-mono text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase text-red-400">Request Incident Deletion</DialogTitle>
            <DialogDescription className="text-xs text-zinc-450">
              Submit deletion request. Deletion requires audit signatures from account managers.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeleteSubmit} className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Justification for removal</label>
              <textarea
                rows={3}
                required
                placeholder="Mistaken duplicate submission, resolve completed offline, scope change..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="h-9 text-[10px] uppercase font-bold border-slate-800 text-zinc-400" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="h-9 text-[10px] uppercase font-bold bg-red-600 hover:bg-red-750 text-white border-0">
                Submit request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
