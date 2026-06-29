'use client';

import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTickets } from '../../../../context/TicketContext';
import { SlaTelemetryPanel } from '../../../../components/tickets/SlaTelemetryPanel';
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
  Send,
  CircleDot,
  Tag,
  Layers,
  User,
  ExternalLink,
  AlertTriangle,
  Info,
  Timer,
  Activity,
  Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '../../../../components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import { TicketTimeline } from '../../../../components/tickets/TicketTimeline';
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
import AttachmentPanel from '../../../../components/tickets/AttachmentPanel';
import { isSupabaseConfigured, supabase } from '../../../../lib/supabase/client';
import { toast } from 'sonner';

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
    requestDelete,
    fetchTicketById
  } = useTickets();

  const ticketId = Array.isArray(id) ? id[0] : id;
  const [ticket, setTicket] = useState<any | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  if (fetchError) {
    throw fetchError;
  }

  useEffect(() => {
    let active = true;
    const loadTicket = async () => {
      if (!ticketId) return;
      try {
        const found = tickets.find((t) => t.id === ticketId);
        if (found) {
          if (active) {
            setTicket(found);
            setLocalLoading(false);
          }
        } else if (fetchTicketById) {
          const fresh = await fetchTicketById(ticketId);
          if (active) {
            setTicket(fresh);
            setLocalLoading(false);
          }
        } else {
          if (active) setLocalLoading(false);
        }
      } catch (err: unknown) {
        if (active) {
          setFetchError(err instanceof Error ? err : new Error(getErrorMessage(err) || 'Failed to load ticket details'));
          setLocalLoading(false);
        }
      }
    };
    loadTicket();
    return () => {
      active = false;
    };
  }, [ticketId, tickets, fetchTicketById]);

  // Interaction States
  const [commentText, setCommentText] = useState('');
  const [commentFiles, setCommentFiles] = useState<PendingAttachment[]>([]);
  const [escalateFiles, setEscalateFiles] = useState<PendingAttachment[]>([]);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [escalationReasonInput, setEscalationReasonInput] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateSeverity, setEscalateSeverity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [pendingReopenRequest, setPendingReopenRequest] = useState<any>(null);

  const fetchPendingReopenRequest = async () => {
    if (!ticketId || !isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('ticket_reopen_requests')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('status', 'Pending')
        .maybeSingle();

      if (!error && data) {
        setPendingReopenRequest(data);
      } else {
        setPendingReopenRequest(null);
      }
    } catch (err) {
      console.error('Error fetching reopen request:', err);
    }
  };

  useEffect(() => {
    fetchPendingReopenRequest();
  }, [ticketId]);

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

  if (localLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-10 h-10 mx-auto">
            <span className="absolute inset-0 rounded-full border-[3px] border-line"></span>
            <span className="absolute inset-0 rounded-full border-[3px] border-t-zinc-950 animate-spin"></span>
          </div>
          <p className="text-sm text-ink-muted">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-lg mx-auto my-16 p-8 text-center rounded-2xl bg-surface border border-line shadow-card space-y-4">
        <div className="w-14 h-14 rounded-full bg-critical-soft flex items-center justify-center mx-auto">
          <AlertCircle size={24} className="text-critical" />
        </div>
        <h2 className="text-lg font-semibold text-ink">Ticket Not Found</h2>
        <p className="text-sm text-ink-secondary">
          The ticket with ID &quot;{ticketId}&quot; could not be found in your records.
        </p>
        <Link href="/customer/tickets" className="inline-flex items-center gap-1.5 text-sm font-medium text-info hover:text-info transition">
          <ArrowLeft size={14} /> Back to tickets
        </Link>
      </div>
    );
  }

  // Cross-tenant access validation check
  const customerCompany = user?.company || 'Apex Global Industries';
  if (ticket.organization !== customerCompany) {
    return (
      <div className="max-w-lg mx-auto my-16 p-8 text-center rounded-2xl bg-surface border border-critical-border shadow-card space-y-4">
        <div className="w-14 h-14 rounded-full bg-critical-soft flex items-center justify-center mx-auto">
          <ShieldCheck size={24} className="text-critical" />
        </div>
        <h2 className="text-lg font-semibold text-critical-strong">Access Denied</h2>
        <p className="text-sm text-ink-secondary">
          You don&apos;t have permission to view this ticket. It belongs to a different organization.
        </p>
        <Link href="/customer/tickets" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink transition">
          <ArrowLeft size={14} /> Return to my tickets
        </Link>
      </div>
    );
  }

  // Filter out internal comments/attachments
  const visibleComments = (ticket.comments || []).filter(c => !c.isInternal);
  const visibleAttachments = (ticket.attachments || []).filter(a => a.visibility === 'public');

  // Unified timeline
  const timelineEvents = [
    ...visibleComments.map(c => ({
      type: 'comment',
      id: c.id,
      title: c.authorRole === 'Customer' ? 'Your Message' : 'Support Response',
      author: c.authorName,
      role: c.authorRole,
      content: c.content,
      createdAt: c.createdAt,
      attachments: c.attachments
    })),
    ...(ticket.history || []).map(h => ({
      type: 'audit',
      id: h.id,
      title: 'Status Update',
      author: h.changedBy,
      role: 'System',
      content: `${h.fieldChanged} changed from "${h.oldValue}" to "${h.newValue}"`,
      createdAt: h.createdAt,
      attachments: []
    })),
    ...(ticket.escalations || []).map(e => ({
      type: 'escalation',
      id: e.id,
      title: 'Escalation Filed',
      author: e.escalatedBy,
      role: 'Escalation',
      content: `Severity: ${e.severity} — ${e.reason} (${e.status})`,
      createdAt: e.createdAt,
      attachments: []
    }))
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // SLA
  const isIncident = ticket.ticketType === 'Incident' || !ticket.ticketType;
  const isSlaApplicable = isIncident && ticket.slaDueAt !== 'SLA Not Applicable';

  // Single source of truth: the engine status attached to every ticket by
  // TicketContext (computeSla). No wall-clock recompute here.
  const getSlaStatus = () => {
    if (!isSlaApplicable) return { label: 'Not Applicable', color: 'bg-surface-subtle text-ink-secondary border-line', dot: 'bg-zinc-400' };
    switch (ticket.slaStatus) {
      case 'Breached': return { label: 'Breached', color: 'bg-critical-soft text-critical border-critical-border', dot: 'bg-red-500 animate-pulse' };
      case 'At Risk': return { label: 'At Risk', color: 'bg-warning-soft text-warning border-warning-border', dot: 'bg-amber-500' };
      case 'Met': return { label: 'Met', color: 'bg-success-soft text-success border-success-border', dot: 'bg-emerald-500' };
      case 'Not Started': return { label: 'Not Started', color: 'bg-surface-subtle text-ink-secondary border-line', dot: 'bg-zinc-400' };
      case 'On Track':
      default: return { label: 'On Track', color: 'bg-success-soft text-success border-success-border', dot: 'bg-emerald-500' };
    }
  };
  const slaStatus = getSlaStatus();

  // Step progression
  const getTimelineStep = (status: string) => {
    switch (status) {
      case 'New': return 1;
      case 'Assigned': case 'Requirement Gathering': case 'Awaiting Functional Submission': case 'Awaiting Technical Submission': return 2;
      case 'In Progress': case 'In Progress - Functional': case 'In Progress - Technical': case 'Waiting for Internal Team': case 'Raised to SAP': case 'On Hold': return 3;
      case 'Resolved': case 'Awaiting Manager Approval': case 'Awaiting Closure': case 'Request for Closure': case 'Waiting for Customer': case 'Customer Action': case 'Reopen Requested': case 'Reopened': return 4;
      case 'Closed': return 5;
      default: return 1;
    }
  };
  const currentStepIndex = getTimelineStep(ticket.status);

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.startsWith('image/')) return <FileImage size={16} className="text-ink-secondary" />;
    if (type.includes('pdf')) return <FileText size={16} className="text-critical" />;
    if (type.includes('sheet') || type.includes('excel')) return <FileText size={16} className="text-success" />;
    return <File size={16} className="text-ink-muted" />;
  };

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const blockedExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.vbs', '.msi', '.dll', '.scr', '.com', '.bin', '.cgi', '.py', '.php', '.phtml', '.pl', '.jsp', '.asp', '.aspx'];
    
    const validFiles: PendingAttachment[] = [];
    for (const file of selected) {
      if (file.size > 10 * 1024 * 1024) {
        showBannerMessage(`Error: File size exceeds 10MB limit: ${file.name}`);
        continue;
      }
      
      const lastDotIdx = file.name.lastIndexOf('.');
      const fileExtension = lastDotIdx !== -1 ? file.name.slice(lastDotIdx).toLowerCase() : '';
      if (blockedExtensions.includes(fileExtension)) {
        showBannerMessage(`Error: Forbidden file extension: ${file.name}. Executable and script files are blocked.`);
        continue;
      }

      const id = `${Date.now()}-${file.name}`;
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      const pendingFile: PendingAttachment = { id, file, progress: 0, previewUrl };
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setCommentFiles(prev => prev.map(f => f.id === id ? { ...f, progress: currentProgress } : f));
        if (currentProgress >= 100) clearInterval(interval);
      }, 50);
      validFiles.push(pendingFile);
    }
    
    if (validFiles.length > 0) {
      setCommentFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removePendingFile = (id: string) => {
    setCommentFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const handleEscalateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const blockedExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.vbs', '.msi', '.dll', '.scr', '.com', '.bin', '.cgi', '.py', '.php', '.phtml', '.pl', '.jsp', '.asp', '.aspx'];
    
    const validFiles: PendingAttachment[] = [];
    for (const file of selected) {
      if (file.size > 10 * 1024 * 1024) {
        showBannerMessage(`Error: File size exceeds 10MB limit: ${file.name}`);
        continue;
      }
      
      const lastDotIdx = file.name.lastIndexOf('.');
      const fileExtension = lastDotIdx !== -1 ? file.name.slice(lastDotIdx).toLowerCase() : '';
      if (blockedExtensions.includes(fileExtension)) {
        showBannerMessage(`Error: Forbidden file extension: ${file.name}. Executable and script files are blocked.`);
        continue;
      }

      const id = `${Date.now()}-${file.name}`;
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      const pendingFile: PendingAttachment = { id, file, progress: 0, previewUrl };
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setEscalateFiles(prev => prev.map(f => f.id === id ? { ...f, progress: currentProgress } : f));
        if (currentProgress >= 100) clearInterval(interval);
      }, 50);
      validFiles.push(pendingFile);
    }
    
    if (validFiles.length > 0) {
      setEscalateFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeEscalateFile = (id: string) => {
    setEscalateFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const handleDownloadFile = async (fileName: string, path: string) => {
    const { isSupabaseConfigured, supabase } = await import('../../../../lib/supabase/client');
    if (isSupabaseConfigured && supabase && path) {
      try {
        let relativePath = path;
        if (path.includes('/sap-tickets/')) {
          const parts = path.split('/sap-tickets/');
          relativePath = parts[parts.length - 1];
        }
        
        console.log(`[STORAGE] Generating signed URL for path: ${relativePath}`);
        const { data, error } = await supabase.storage
          .from('sap-tickets')
          .createSignedUrl(relativePath, 60);

        if (error) {
          console.error('[STORAGE] Error generating signed URL:', error);
          if (path.startsWith('http://') || path.startsWith('https://')) {
            window.open(path, '_blank');
          } else {
            showBannerMessage(`Failed to generate signed URL: ${error.message}`);
          }
          return;
        }

        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        } else {
          window.open(path, '_blank');
        }
      } catch (err: unknown) {
        console.error('[STORAGE] Error generating signed URL:', err);
        window.open(path, '_blank');
      }
    } else {
      if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
        window.open(path, '_blank');
      } else {
        showBannerMessage(`Simulated download: Fetching file "${fileName}" from secure path: ${path}`);
      }
    }
  };

  // Handlers
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && commentFiles.length === 0) return;
    const filesToSubmit = commentFiles.filter(f => f.progress >= 100).map(f => ({
      fileName: f.file.name, fileSize: f.file.size, fileType: f.file.type, fileObj: f.file
    }));
    await addComment(ticket.id, commentText, user?.name || 'Customer Requester', user?.email || 'customer@sap.com', 'Customer', false, filesToSubmit.length > 0 ? filesToSubmit : undefined);
    setCommentText('');
    setCommentFiles([]);
    showBannerMessage('Your reply has been submitted successfully.');
  };

  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeTicket(ticket.id, ratingScore, ratingFeedback || 'Closed by user.', user?.name || 'Sarah Jenkins');
    setShowRatingDialog(false);
    setRatingFeedback('');
    showBannerMessage('Ticket closed. Thank you for your feedback!');
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;

    if (isSupabaseConfigured && supabase) {
      const toastId = toast.loading('Submitting reopen request...');
      try {
        const { data, error } = await supabase
          .from('ticket_reopen_requests')
          .insert({
            ticket_id: ticket.id,
            requester_name: user?.name || 'Customer User',
            reason: reopenReason.trim(),
            status: 'Pending'
          })
          .select()
          .single();

        if (error) throw error;
        setPendingReopenRequest(data);
        setShowReopenDialog(false);
        setReopenReason('');
        toast.success('Ticket reopen request submitted to support managers.', { id: toastId });
        showBannerMessage('Reopen request has been submitted to support managers.');
      } catch (err: unknown) {
        console.error('Error submitting reopen request:', err);
        toast.error(`Failed to submit request: ${getErrorMessage(err)}`, { id: toastId });
      }
    } else {
      // Local fallback
      setPendingReopenRequest({
        id: `rr-${Date.now()}`,
        ticket_id: ticket.id,
        requester_name: user?.name || 'Customer User',
        reason: reopenReason,
        status: 'Pending',
        requested_at: new Date().toISOString()
      });
      setShowReopenDialog(false);
      setReopenReason('');
      showBannerMessage('Reopen request submitted locally.');
    }
  };

  const handleEscalateConfirm = async () => {
    if (escalationReasonInput.trim().length < 10) return;
    const toastId = toast.loading('Submitting escalation...');
    try {
      const res = await requestEscalation(
        ticket.id,
        escalationReasonInput.trim(),
        "High",
        user?.name || 'Customer User'
      );
      if (res.success) {
        toast.success("Your ticket has been escalated. A manager will review it shortly.", { id: toastId });
        setEscalationReasonInput('');
        router.refresh();
      } else {
        toast.error(res.error || "Failed to escalate ticket.", { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || "An unexpected error occurred.", { id: toastId });
    } finally {
      setShowEscalateDialog(false);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editDescription.trim()) return;
    updateTicket(ticket.id, { title: editTitle, description: editDescription, requestedBy: user?.name || 'Customer' });
    setShowEditDialog(false);
    showBannerMessage('Ticket details have been updated.');
  };

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteReason.trim()) return;
    requestDelete(ticket.id, deleteReason, user?.name || 'Customer');
    setShowDeleteDialog(false);
    setDeleteReason('');
    showBannerMessage('Deletion request has been submitted for approval.');
  };

  const handleQuoteComment = (author: string, content: string) => {
    const formattedQuote = `> ${author} wrote:\n> ${content}\n\n`;
    setCommentText(prev => formattedQuote + prev);
  };

  const renderCommentContent = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.trim().startsWith('>')) {
        return (
          <blockquote key={idx} className="border-l-[3px] border-info-border pl-3 italic text-ink-secondary bg-info-soft/50 py-1.5 px-3 rounded-r-lg my-2 text-[13px]">
            {line.trim().substring(1).trim()}
          </blockquote>
        );
      }
      return <p key={idx} className="leading-relaxed text-ink-secondary">{line}</p>;
    });
  };

  // Effort calculations
  const isClosed = ticket.status === 'Closed';
  const actualFuncHours = isClosed && ticket.actualHoursLogs ? ticket.actualHoursLogs.filter(h => h.consultantType === 'Functional').reduce((sum, h) => sum + h.actualHours, 0) : 0;
  const actualTechHours = isClosed && ticket.actualHoursLogs ? ticket.actualHoursLogs.filter(h => h.consultantType === 'Technical').reduce((sum, h) => sum + h.actualHours, 0) : 0;
  const totalActualHours = actualFuncHours + actualTechHours;

  // Status color helper
  const getStatusStyle = (status: string) => {
    if (status === 'Resolved' || status === 'Closed') return 'bg-success-soft text-success-strong border-success-border';
    if (status === 'Waiting for Customer' || status === 'Customer Action') return 'bg-warning-soft text-warning-strong border-warning-border';
    if (status === 'New') return 'bg-brand-soft text-brand-strong border-brand-border';
    if (status === 'In Progress' || status.includes('Progress')) return 'bg-info-soft text-info-strong border-info-border';
    if (status === 'Reopened' || status === 'Reopen Requested') return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-surface-subtle text-ink-secondary border-line';
  };

  const getPriorityStyle = (priority: string) => {
    if (priority === 'Critical') return 'bg-critical-soft text-critical-strong border-critical-border';
    if (priority === 'High') return 'bg-orange-50 text-orange-700 border-orange-200';
    if (priority === 'Medium') return 'bg-warning-soft text-warning-strong border-warning-border';
    return 'bg-surface-subtle text-ink-secondary border-line';
  };

  const steps = [
    { step: 1, label: 'Submitted', icon: FileText },
    { step: 2, label: 'Assigned', icon: Users },
    { step: 3, label: 'In Progress', icon: Wrench },
    { step: 4, label: 'Resolved', icon: CheckSquare },
    { step: 5, label: 'Closed', icon: Archive }
  ];

  return (
    <div className="space-y-6 pb-12">

      {/* ── Success Banner ── */}
      {successBanner && (
        <div className="bg-success-soft border border-success-border rounded-lg p-4 flex items-center gap-3 shadow-card animate-in slide-in-from-top-2 duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} className="text-success" />
          </div>
          <p className="flex-1 text-sm text-emerald-800 font-medium">{successBanner}</p>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-success p-1 rounded-lg hover:bg-emerald-100 transition">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Back & Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-ink-secondary">
        <Link href="/customer/tickets" className="inline-flex items-center gap-1.5 text-ink-secondary hover:text-ink font-medium transition group">
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> My Tickets
        </Link>
        <ChevronRight size={14} className="text-ink-muted" />
        <span className="text-ink font-semibold">{ticket.ticketNumber}</span>
      </div>

      {/* ── Hero Header Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-line/80 bg-surface shadow-card">
        
        <div className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Left: Title & Meta */}
            <div className="space-y-4 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Status Badge */}
                {(() => {
                  const status = ticket.status.toUpperCase();
                  if (status === 'NEW') {
                    return <Badge variant="secondary" className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full">{ticket.status}</Badge>;
                  }
                  if (status === 'CLOSED' || status === 'RESOLVED') {
                    return <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-white border-transparent text-[11px] font-semibold px-2.5 py-0.5 rounded-full">{ticket.status}</Badge>;
                  }
                  return <Badge variant="outline" className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full">{ticket.status}</Badge>;
                })()}

                {/* Type Badge */}
                {ticket.ticketType === 'Incident' || !ticket.ticketType ? (
                  <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 rounded-full">Incident</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[11px] font-medium px-2.5 py-0.5 rounded-full">{ticket.ticketType}</Badge>
                )}

                {/* Priority Badge */}
                {(() => {
                  const priority = ticket.priority.toUpperCase();
                  if (priority === 'HIGH' || priority === 'CRITICAL') {
                    return <Badge variant="destructive" className="text-[11px] font-medium px-2.5 py-0.5 rounded-full">{ticket.priority}</Badge>;
                  }
                  return <Badge variant="secondary" className="text-[11px] font-medium px-2.5 py-0.5 rounded-full">{ticket.priority}</Badge>;
                })()}

                 {ticket.softDeleteStatus === 'Pending Delete' && (
                  <Badge className="bg-warning-soft text-warning border border-warning-border text-[11px] font-medium px-2.5 py-0.5 rounded-full animate-pulse hover:bg-transparent">
                    Pending Deletion
                  </Badge>
                )}

                {ticket.escalationFlag && ticket.escalationAcknowledgedAt && (
                  <Badge variant="secondary" className="bg-surface-subtle text-ink border-line text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Info size={12} className="text-ink-secondary shrink-0" />
                    Critical Priority — Being handled
                  </Badge>
                )}
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-ink leading-tight tracking-tight">
                {ticket.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-secondary">
                <span className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-ink-muted" />
                  {ticket.organization}
                </span>
                <span className="flex items-center gap-1.5">
                  <Layers size={14} className="text-ink-muted" />
                  {ticket.sapModule}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-ink-muted" />
                  Created {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {isSlaApplicable && (
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${slaStatus.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${slaStatus.dot}`}></span>
                    SLA: {slaStatus.label}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap gap-2 lg:self-start shrink-0">
              {!ticket.assignedConsultant && ticket.status === 'New' && (
                <Button
                  onClick={() => setShowEditDialog(true)}
                  variant="outline"
                  className="h-9 text-[13px] font-medium border-line text-ink-secondary hover:text-ink hover:bg-surface-muted rounded-lg gap-1.5"
                >
                  <Edit size={14} /> Edit
                </Button>
              )}

              {ticket.status === 'Resolved' && (
                <>
                  <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
                    <DialogTrigger asChild>
                      <Button className="h-9 text-[13px] font-semibold bg-emerald-600 hover:bg-success-strong text-white rounded-lg gap-1.5 shadow-card">
                        <CheckCircle2 size={14} /> Accept & Close
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-surface border border-line rounded-2xl p-0 max-w-md overflow-hidden">
                      <div className="p-6 space-y-5">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-bold text-ink">Close Ticket</DialogTitle>
                          <DialogDescription className="text-sm text-ink-secondary">
                            Provide any final remarks or feedback before closing ticket {ticket.ticketNumber}.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleRatingSubmit} className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Closure Comments (Optional)</label>
                            <textarea
                              rows={3}
                              placeholder="Provide any closure comments or feedback..."
                              value={ratingFeedback}
                              onChange={(e) => setRatingFeedback(e.target.value)}
                              className="w-full bg-surface-muted border border-line rounded-lg p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info-border transition placeholder:text-ink-muted resize-none"
                            />
                          </div>
                          <DialogFooter>
                            <Button type="submit" className="w-full bg-emerald-600 hover:bg-success-strong text-white font-semibold py-2.5 rounded-lg shadow-card">
                              Confirm & Close
                            </Button>
                          </DialogFooter>
                        </form>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-9 text-[13px] font-medium border-critical-border text-critical hover:bg-critical-soft rounded-lg gap-1.5">
                        Reject & Reopen
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-surface border border-line rounded-2xl p-0 max-w-md overflow-hidden">
                      <div className="p-6 space-y-5">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-bold text-ink">Reject Resolution</DialogTitle>
                          <DialogDescription className="text-sm text-ink-secondary">
                            Explain why the fix doesn&apos;t resolve your issue.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleReopenSubmit} className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Reason</label>
                            <textarea
                              required
                              rows={4}
                              placeholder="Describe what's still not working..."
                              value={reopenReason}
                              onChange={(e) => setReopenReason(e.target.value)}
                              className="w-full bg-surface-muted border border-line rounded-lg p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition placeholder:text-ink-muted resize-none"
                            />
                          </div>
                          <DialogFooter>
                            <Button type="submit" className="w-full bg-red-600 hover:bg-critical-strong text-white font-semibold py-2.5 rounded-lg">
                              Reopen Ticket
                            </Button>
                          </DialogFooter>
                        </form>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {ticket.status === 'Closed' && (
                <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      disabled={!!pendingReopenRequest}
                      className="h-9 text-[13px] font-medium border-line text-ink-secondary hover:text-ink hover:bg-surface-muted rounded-lg gap-1.5"
                    >
                      {pendingReopenRequest ? 'Reopen Pending Approval' : 'Request Reopen'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-surface border border-line rounded-2xl p-0 max-w-md overflow-hidden">
                    <div className="p-6 space-y-5">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-ink">Reopen Ticket</DialogTitle>
                        <DialogDescription className="text-sm text-ink-secondary">
                          Explain why this closed ticket needs to be reopened.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleReopenSubmit} className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Reason</label>
                          <textarea
                            required
                            rows={4}
                            placeholder="Describe the recurring or new issue..."
                            value={reopenReason}
                            onChange={(e) => setReopenReason(e.target.value)}
                            className="w-full bg-surface-muted border border-line rounded-lg p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info-border transition placeholder:text-ink-muted resize-none"
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" className="w-full bg-info hover:bg-info-strong text-white font-semibold py-2.5 rounded-lg">
                            Submit Reopen Request
                          </Button>
                        </DialogFooter>
                      </form>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {ticket.status !== 'Closed' && ticket.status !== 'Resolved' && (
                ticket.isEscalated ? (
                  <Badge variant="destructive" className="h-9 text-[13px] font-medium border-critical-border bg-red-100 text-red-800 hover:bg-red-100 rounded-lg">
                    Escalated — Awaiting Acknowledgment
                  </Badge>
                ) : (
                  <Dialog open={showEscalateDialog} onOpenChange={(open) => {
                    setShowEscalateDialog(open);
                    if (!open) setEscalationReasonInput('');
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="h-9 text-[13px] font-medium border-orange-200 text-warning hover:bg-orange-50 rounded-lg gap-1.5">
                        <Zap size={14} /> Escalate
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-surface border border-line rounded-2xl p-6 max-w-md overflow-hidden font-sans text-sm">
                      <DialogHeader className="space-y-2">
                        <DialogTitle className="text-lg font-bold text-ink normal-case tracking-normal">Escalate Ticket</DialogTitle>
                        <DialogDescription className="text-sm text-ink-secondary">
                          Escalating will notify your support manager immediately and flag this ticket for priority handling.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 mt-4">
                        <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider block">Reason for escalation</label>
                        <textarea
                          rows={4}
                          placeholder="Please describe the business impact or reason for escalating this ticket (minimum 10 characters)..."
                          value={escalationReasonInput}
                          onChange={(e) => setEscalationReasonInput(e.target.value)}
                          className="w-full bg-surface-muted border border-line rounded-lg p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition placeholder:text-ink-muted resize-none"
                        />
                        {escalationReasonInput.trim().length > 0 && escalationReasonInput.trim().length < 10 && (
                          <p className="text-xs text-critical font-semibold">Reason must be at least 10 characters (currently {escalationReasonInput.trim().length}).</p>
                        )}
                      </div>
                      <DialogFooter className="mt-6 flex gap-2">
                        <Button variant="outline" onClick={() => {
                          setShowEscalateDialog(false);
                          setEscalationReasonInput('');
                        }}>
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleEscalateConfirm}
                          disabled={escalationReasonInput.trim().length < 10}
                        >
                          Escalate
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )
              )}

              {ticket.softDeleteStatus === 'Active' && (
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="outline"
                  className="h-9 text-[13px] font-medium border-line text-ink-secondary hover:text-critical hover:border-critical-border hover:bg-critical-soft rounded-lg gap-1.5 transition"
                >
                  <Trash2 size={14} /> Delete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Progress Stepper ── */}
        <div className="px-6 md:px-8 pb-6 pt-2">
          <div className="flex items-center justify-between relative">
            {/* Connection line */}
            <div className="absolute top-5 left-[40px] right-[40px] h-[2px] bg-muted">
              <div
                className="h-full bg-primary transition-all duration-700 ease-out rounded-full"
                style={{ width: `${Math.max(0, ((currentStepIndex - 1) / 4) * 100)}%` }}
              ></div>
            </div>

            {steps.map((milestone) => {
              const isCompleted = milestone.step < currentStepIndex;
              const isActive = milestone.step === currentStepIndex;
              const Icon = milestone.icon;

              return (
                <div key={milestone.step} className="flex flex-col items-center text-center relative z-10 w-[80px]">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-surface border-2 border-muted text-muted-foreground/60'
                  }`}>
                    {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={16} />}
                  </div>
                  <span className={`mt-2 text-[11px] font-semibold transition-colors ${
                    isActive ? 'text-primary font-bold' : 'text-muted-foreground'
                  }`}>
                    {milestone.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Escalation Banners */}
      {ticket.isEscalated && !ticket.escalationAcknowledgedAt && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Escalation Raised</AlertTitle>
          <AlertDescription>
            Your escalation is pending manager acknowledgment.
          </AlertDescription>
        </Alert>
      )}

      {ticket.isEscalated && ticket.escalationAcknowledgedAt && (
        <Alert className="border-success-border bg-success-soft text-emerald-800">
          <ShieldCheck className="size-4 text-success" />
          <AlertTitle>Escalation Acknowledged — Priority Handling Active</AlertTitle>
          <AlertDescription>
            Your support team has acknowledged this escalation and is actively working
            to resolve it as a top priority.
          </AlertDescription>
        </Alert>
      )}

      {/* SLA Breach Warning */}
      {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && isSlaApplicable && ticket.slaStatus === 'Breached' && (
        <div className="bg-critical-soft border border-critical-border rounded-lg p-4 flex items-start gap-3 shadow-card">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle size={16} className="text-critical" />
          </div>
          <div>
            <p className="font-semibold text-critical-strong text-sm">SLA Target Exceeded</p>
            <p className="text-[13px] text-critical/80 mt-0.5 leading-relaxed">This ticket has exceeded its resolution target. The support team has been notified for immediate action.</p>
          </div>
        </div>
      )}

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="space-y-5">
            <TabsList className="bg-surface-subtle/80 border border-line/60 p-1 rounded-lg flex gap-0.5 w-full max-w-lg h-auto">
              <TabsTrigger value="details" className="rounded-lg px-4 py-2 text-[13px] font-semibold data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-card flex-1 transition text-ink-secondary">
                Details
              </TabsTrigger>
              <TabsTrigger value="conversation" className="rounded-lg px-4 py-2 text-[13px] font-semibold data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-card flex-1 transition text-ink-secondary">
                Conversation ({timelineEvents.length})
              </TabsTrigger>
              <TabsTrigger value="sla" className="rounded-lg px-4 py-2 text-[13px] font-semibold data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-card flex-1 transition text-ink-secondary">
                SLA & Efforts
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Details */}
            <TabsContent value="details" className="space-y-5 animate-in fade-in duration-200">
              {/* Description Card */}
              <div className="bg-surface rounded-2xl border border-line/80 shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-line flex items-center gap-2">
                  <FileText size={16} className="text-info" />
                  <h3 className="text-sm font-semibold text-ink">Description</h3>
                </div>
                <div className="p-6 space-y-5">
                  <p className="text-[14px] text-ink-secondary leading-relaxed whitespace-pre-wrap">{ticket.description}</p>

                  {ticket.businessImpact && (
                    <div className="pt-4 border-t border-line space-y-2">
                      <h4 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Business Impact</h4>
                      <p className="text-[13px] text-ink-secondary leading-relaxed">{ticket.businessImpact}</p>
                    </div>
                  )}

                  {/* Category & Source metadata row */}
                  <div className="pt-4 border-t border-line flex flex-wrap gap-4 text-[13px] text-ink-secondary">
                    <span className="flex items-center gap-1.5"><Tag size={13} className="text-ink-muted" /> {ticket.category}</span>
                    <span className="flex items-center gap-1.5"><CircleDot size={13} className="text-ink-muted" /> {ticket.source}</span>
                    <span className="flex items-center gap-1.5"><Layers size={13} className="text-ink-muted" /> {ticket.functionalOrTechnical || 'Functional'}</span>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <AttachmentPanel ticketId={ticket.id} />

              {/* Resolution Summary */}
              {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
                <div className="bg-success-soft/50 rounded-2xl border border-success-border/60 shadow-card overflow-hidden">
                  <div className="px-6 py-4 border-b border-emerald-100 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-success" />
                    <h3 className="text-sm font-semibold text-emerald-800">Resolution Summary</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {ticket.rootCause && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-semibold text-success-strong uppercase tracking-wider">Root Cause</h4>
                        <p className="text-[13px] text-ink-secondary leading-relaxed">{ticket.rootCause}</p>
                      </div>
                    )}
                    {ticket.resolutionSummary && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-semibold text-success-strong uppercase tracking-wider">Fix Applied</h4>
                        <p className="text-[13px] text-ink-secondary leading-relaxed">{ticket.resolutionSummary}</p>
                      </div>
                    )}
                    {ticket.transportRequest && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-semibold text-success-strong uppercase tracking-wider">SAP Transport</h4>
                        <Badge className="bg-emerald-100 text-success-strong border border-success-border text-xs rounded-lg px-2.5 py-0.5 hover:bg-transparent">
                          {ticket.transportRequest}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Operation Timeline — shared, redesigned TicketTimeline (open & closed tickets) */}
              <div className="bg-surface rounded-2xl border border-line/80 shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-line flex items-center gap-2">
                  <History size={16} className="text-info" />
                  <h3 className="text-sm font-semibold text-ink">Operation Timeline</h3>
                </div>
                <div className="p-6">
                  <TicketTimeline ticket={ticket} userRole="Customer" />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Conversation */}
            <TabsContent value="conversation" className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-surface rounded-2xl border border-line/80 shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-line flex items-center gap-2">
                  <MessageSquare size={16} className="text-info" />
                  <h3 className="text-sm font-semibold text-ink">Activity Timeline</h3>
                </div>
                <div className="p-6">
                  {timelineEvents.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-surface-subtle flex items-center justify-center mx-auto">
                        <MessageSquare size={20} className="text-ink-muted" />
                      </div>
                      <p className="text-sm text-ink-muted">No activity yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {timelineEvents.map((evt) => {
                        const isAudit = evt.type === 'audit';
                        const isEsc = evt.type === 'escalation';
                        const isCustomer = evt.role === 'Customer';

                        return (
                          <div key={evt.id} className={`rounded-lg border p-4 transition-all hover:shadow-card group ${
                            isEsc
                              ? 'bg-orange-50/50 border-orange-200/60'
                              : isAudit
                                ? 'bg-surface-muted/60 border-line/60'
                                : isCustomer
                                  ? 'bg-info-soft/30 border-info-border/50'
                                  : 'bg-surface border-line/60'
                          }`}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${
                                  isEsc ? 'bg-orange-500' : isAudit ? 'bg-zinc-400' : isCustomer ? 'bg-info-soft0' : 'bg-zinc-800'
                                }`}>
                                  {isEsc ? <Zap size={13} /> : isAudit ? <History size={13} /> : <User size={13} />}
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-ink">{evt.author}</span>
                                  <span className="text-[11px] text-ink-muted ml-1.5">
                                    {evt.role !== 'System' && `· ${evt.role}`}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-ink-muted">
                                  {new Date(evt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(evt.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {evt.type === 'comment' && (
                                  <button
                                    onClick={() => handleQuoteComment(evt.author, evt.content)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-subtle text-ink-muted hover:text-ink-secondary transition"
                                    title="Quote"
                                  >
                                    <Quote size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className={`ml-[38px] text-[13px] leading-relaxed ${isAudit ? 'text-ink-secondary italic' : 'text-ink-secondary'}`}>
                              {isAudit ? evt.content : renderCommentContent(evt.content)}
                            </div>

                            {evt.attachments && evt.attachments.length > 0 && (
                              <div className="ml-[38px] flex flex-wrap gap-2 mt-3">
                                {evt.attachments.map((att: any) => (
                                  <a
                                    key={att.id}
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handleDownloadFile(att.fileName, att.fileUrl || att.filePath); }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface border border-line rounded-lg text-[12px] text-ink-secondary hover:border-info-border hover:text-info transition font-medium"
                                  >
                                    <FileCode size={12} className="text-info" />
                                    {att.fileName}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Composer */}
              {ticket.status !== 'Closed' && (
                <div className="bg-surface rounded-2xl border border-line/80 shadow-card overflow-hidden">
                  <div className="px-6 py-4 border-b border-line flex items-center gap-2">
                    <Send size={16} className="text-info" />
                    <h3 className="text-sm font-semibold text-ink">Reply</h3>
                  </div>
                  <div className="p-6">
                    <form onSubmit={handleCommentSubmit} className="space-y-4">
                      <textarea
                        required
                        rows={4}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write your message here..."
                        className="w-full bg-surface-muted border border-line rounded-lg p-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info-border transition placeholder:text-ink-muted resize-none"
                      />

                      {/* Attachments */}
                      <div className="space-y-3">
                        <div className="relative border-2 border-dashed border-line rounded-lg p-5 bg-surface-muted/60 hover:bg-info-soft/30 hover:border-info-border transition flex flex-col items-center justify-center gap-2 cursor-pointer group">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/zip,application/x-zip-compressed"
                          />
                          <div className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center group-hover:border-info-border group-hover:bg-info-soft transition">
                            <Upload size={18} className="text-ink-muted group-hover:text-info transition" />
                          </div>
                          <span className="text-sm text-ink-secondary font-medium">Drop files here or click to browse</span>
                          <span className="text-[11px] text-ink-muted">Max 10MB per file</span>
                        </div>

                        {commentFiles.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {commentFiles.map((pf) => (
                              <div key={pf.id} className="relative flex items-center gap-3 p-3 bg-surface-muted border border-line rounded-lg">
                                {pf.previewUrl ? (
                                  <img src={pf.previewUrl} alt="Preview" className="w-11 h-11 object-cover rounded-lg border border-line" />
                                ) : (
                                  <div className="w-11 h-11 rounded-lg border border-line bg-surface flex items-center justify-center">
                                    {getFileIcon(pf.file.type)}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-ink truncate pr-6">{pf.file.name}</p>
                                  <p className="text-[11px] text-ink-muted">{(pf.file.size / 1024).toFixed(0)} KB</p>
                                  <div className="w-full bg-zinc-200 rounded-full h-1 mt-1.5 overflow-hidden">
                                    <div className="bg-info-soft0 h-full transition-all duration-300 rounded-full" style={{ width: `${pf.progress}%` }}></div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePendingFile(pf.id)}
                                  className="absolute top-2 right-2 text-ink-muted hover:text-critical p-1 rounded-full hover:bg-critical-soft transition"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button type="submit" className="bg-info hover:bg-info-strong text-white font-semibold text-sm h-10 px-6 rounded-lg shadow-card transition gap-1.5">
                          <Send size={14} /> Send Reply
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: SLA & Efforts */}
            <TabsContent value="sla" className="space-y-5 animate-in fade-in duration-200">
              {/* SLA Governance — shared engine panel, identical to every other role. */}
              <SlaTelemetryPanel ticket={ticket} />

              {/* Effort Hours Card */}
              <div className="bg-surface rounded-2xl border border-line/80 shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-info" />
                    <h3 className="text-sm font-semibold text-ink">Effort Hours</h3>
                  </div>
                  <Badge className="bg-surface-subtle text-ink-secondary border border-line text-[11px] font-medium px-2 py-0 rounded-full hover:bg-transparent">
                    {isClosed ? 'Released' : 'Locked'}
                  </Badge>
                </div>
                <div className="p-6">
                  {isClosed ? (
                    <div className="space-y-5">
                      <div className="bg-success-soft border border-success-border rounded-lg p-4 flex items-start gap-3">
                        <Unlock size={16} className="text-success shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-emerald-800 text-sm">Hours Released</p>
                          <p className="text-[12px] text-success mt-0.5">Actual effort hours are now visible after ticket closure.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-4 bg-surface-muted border border-line rounded-lg text-center">
                          <p className="text-[11px] text-ink-secondary font-medium uppercase tracking-wider">Functional</p>
                          <p className="text-2xl font-bold text-ink mt-1">{actualFuncHours.toFixed(1)}<span className="text-sm font-normal text-ink-muted">h</span></p>
                        </div>
                        <div className="p-4 bg-surface-muted border border-line rounded-lg text-center">
                          <p className="text-[11px] text-ink-secondary font-medium uppercase tracking-wider">Technical</p>
                          <p className="text-2xl font-bold text-ink mt-1">{actualTechHours.toFixed(1)}<span className="text-sm font-normal text-ink-muted">h</span></p>
                        </div>
                        <div className="p-4 bg-info-soft border border-info-border rounded-lg text-center">
                          <p className="text-[11px] text-info font-semibold uppercase tracking-wider">Total</p>
                          <p className="text-2xl font-bold text-info mt-1">{totalActualHours.toFixed(1)}<span className="text-sm font-normal text-info">h</span></p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-3">
                      <div className="w-14 h-14 rounded-full bg-surface-subtle flex items-center justify-center mx-auto">
                        <Lock size={22} className="text-ink-muted" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-secondary text-sm">Effort Hours Locked</p>
                        <p className="text-[13px] text-ink-muted max-w-xs mx-auto leading-relaxed mt-1">
                          Hours are verified by team managers and will become visible once this ticket is closed.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-5">

          {/* Pending Delete Alert */}
          {ticket.softDeleteStatus === 'Pending Delete' && ticket.deleteRequests && ticket.deleteRequests.length > 0 && (
            <div className="bg-warning-soft rounded-2xl border border-warning-border/60 shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-amber-100 flex items-center gap-2">
                <Trash2 size={14} className="text-warning" />
                <h3 className="text-sm font-semibold text-amber-800">Deletion Pending</h3>
              </div>
              <div className="p-5 space-y-3 text-sm">
                {(ticket.deleteRequests || []).map((req, idx) => (
                  <div key={req.id || idx} className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Requested by</span>
                      <span className="font-medium text-ink">{req.requestedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Date</span>
                      <span className="font-medium text-ink">{new Date(req.requestedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[13px] text-ink-secondary italic bg-surface/60 rounded-lg p-3 border border-amber-100">&quot;{req.reason}&quot;</p>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2.5 bg-surface rounded-lg border border-amber-100">
                        <p className="text-[11px] text-ink-muted font-medium uppercase">Manager</p>
                        <Badge className="mt-1 bg-amber-100 text-warning-strong border border-warning-border text-[11px] rounded-full hover:bg-transparent">{req.managerApproval}</Badge>
                      </div>
                      <div className="p-2.5 bg-surface rounded-lg border border-amber-100">
                        <p className="text-[11px] text-ink-muted font-medium uppercase">Director</p>
                        <Badge className="mt-1 bg-amber-100 text-warning-strong border border-warning-border text-[11px] rounded-full hover:bg-transparent">{req.adminApproval}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Team */}
          <div className="bg-surface rounded-2xl border border-line/80 shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line flex items-center gap-2">
              <Users size={14} className="text-info" />
              <h3 className="text-sm font-semibold text-ink">Assigned Team</h3>
            </div>
            <div className="p-5">
              {(!ticket.assignments || ticket.assignments.filter(a => a.active).length === 0) ? (
                <div className="text-center py-6 space-y-2">
                  <div className="w-11 h-11 rounded-full bg-surface-subtle flex items-center justify-center mx-auto">
                    <Users size={18} className="text-ink-muted" />
                  </div>
                  <p className="text-sm text-ink-secondary font-medium">Not yet assigned</p>
                  <p className="text-[12px] text-ink-muted max-w-[200px] mx-auto leading-relaxed">A consultant will be assigned based on the SAP module.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(ticket.assignments || []).filter(a => a.active).map((assignment) => (
                    <div
                      key={assignment.consultantId}
                      className={`p-3.5 rounded-lg border flex items-center justify-between transition hover:shadow-card ${
                        assignment.isPrimary ? 'bg-info-soft/50 border-info-border/60' : 'bg-surface-muted/60 border-line'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          assignment.isPrimary ? 'bg-info-soft0' : 'bg-zinc-400'
                        }`}>
                          {assignment.consultantName?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{assignment.consultantName}</p>
                          <p className="text-[11px] text-ink-muted">{assignment.consultantType} Consultant</p>
                        </div>
                      </div>
                      {assignment.isPrimary && (
                        <Badge className="bg-amber-100 text-warning-strong border border-warning-border text-[11px] font-semibold rounded-full px-2 py-0 hover:bg-transparent">
                          <Star size={9} className="fill-amber-500 text-amber-500 mr-0.5" /> Lead
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ticket Properties */}
          <div className="bg-surface rounded-2xl border border-line/80 shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line flex items-center gap-2">
              <Layers size={14} className="text-info" />
              <h3 className="text-sm font-semibold text-ink">Properties</h3>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-ink-secondary">SAP Module</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {(ticket.sapModules || [ticket.sapModule || 'FICO']).map(m => (
                    <Badge key={m} className="bg-surface-subtle text-ink-secondary border border-line text-[11px] font-medium rounded-md px-2 py-0 hover:bg-transparent">{m}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-line pt-3">
                <span className="text-ink-secondary">Status</span>
                <Badge className={`${getStatusStyle(ticket.status)} border text-[11px] font-semibold px-2.5 py-0.5 rounded-full hover:bg-transparent`}>{ticket.status}</Badge>
              </div>
              <div className="flex justify-between items-center border-t border-line pt-3">
                <span className="text-ink-secondary">Priority</span>
                <Badge className={`${getPriorityStyle(ticket.priority)} border text-[11px] font-semibold px-2.5 py-0.5 rounded-full hover:bg-transparent`}>{ticket.priority}</Badge>
              </div>
              <div className="flex justify-between items-center border-t border-line pt-3">
                <span className="text-ink-secondary">Type</span>
                <span className="font-medium text-ink">{ticket.functionalOrTechnical || 'Functional'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-line pt-3">
                <span className="text-ink-secondary">Lead</span>
                <span className="font-medium text-ink">{ticket.assignedConsultant || 'Pending'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-line pt-3">
                <span className="text-ink-secondary">Action Owner</span>
                <span className="font-medium text-ink">{ticket.nextActionOwner || ticket.assignedConsultant || 'Support Desk'}</span>
              </div>
              {ticket.expectedResolutionDate && (
                <div className="flex justify-between items-center border-t border-line pt-3">
                  <span className="text-ink-secondary">Target Date</span>
                  <span className="font-medium text-ink">{new Date(ticket.expectedResolutionDate).toLocaleDateString()}</span>
                </div>
              )}
              {ticket.reopenedCount ? (
                <div className="flex justify-between items-center border-t border-line pt-3">
                  <span className="text-ink-secondary">Reopens</span>
                  <Badge className="bg-orange-50 text-warning border border-orange-200 text-[11px] font-medium rounded-full px-2 py-0 hover:bg-transparent">{ticket.reopenedCount}×</Badge>
                </div>
              ) : null}
            </div>
          </div>

          {/* Active Escalation */}
          {ticket.escalationFlag && (
            <div className="bg-orange-50/50 rounded-2xl border border-orange-200/60 shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-orange-100 flex items-center gap-2">
                <Zap size={14} className="text-warning" />
                <h3 className="text-sm font-semibold text-orange-800">Active Escalation</h3>
              </div>
              <div className="p-5 text-sm space-y-3">
                {ticket.escalations && ticket.escalations.length > 0 ? (
                  (() => {
                    const latestEsc = ticket.escalations[ticket.escalations.length - 1];
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-ink-secondary">Severity</span>
                          <Badge className="bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-semibold rounded-full px-2.5 py-0 hover:bg-transparent">{latestEsc.severity}</Badge>
                        </div>
                        <div className="flex justify-between border-t border-orange-100 pt-3">
                          <span className="text-ink-secondary">Status</span>
                          <Badge className="bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-semibold rounded-full px-2.5 py-0 hover:bg-transparent">{latestEsc.status}</Badge>
                        </div>
                        <div className="border-t border-orange-100 pt-3">
                          <p className="text-xs text-ink-secondary font-medium mb-1.5">Reason</p>
                          <p className="text-[13px] text-ink-secondary italic leading-relaxed bg-surface/60 rounded-lg p-3 border border-orange-100">&quot;{latestEsc.reason}&quot;</p>
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <p className="text-[13px] text-ink-secondary">Escalation active. A service manager has been notified.</p>
                )}
              </div>
            </div>
          )}

          {/* SLA Clock */}
          {isSlaApplicable && (
            <div className="bg-surface rounded-2xl border border-line/80 shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-line flex items-center gap-2">
                <Clock size={14} className="text-info" />
                <h3 className="text-sm font-semibold text-ink">SLA Clock</h3>
              </div>
              <div className="p-5 text-center space-y-3">
                <div className="p-4 bg-surface-muted border border-line rounded-lg">
                  <p className="text-[11px] text-ink-secondary font-medium uppercase tracking-wider">Resolution Due</p>
                  <p className="text-sm font-bold text-ink mt-1">{new Date(ticket.slaDueAt).toLocaleString()}</p>
                </div>
                <div className={`p-2.5 rounded-lg border text-[11px] font-semibold ${
                  ticket.status === 'Resolved' || ticket.status === 'Closed'
                    ? 'bg-success-soft text-success border-success-border'
                    : 'bg-info-soft text-info border-info-border'
                }`}>
                  {ticket.status === 'Resolved' || ticket.status === 'Closed' ? '✓ Resolution Complete' : '◉ Clock Active'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ Dialogs ══ */}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-surface border border-line rounded-2xl p-0 max-w-md overflow-hidden">
          <div className="p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-ink">Edit Ticket Details</DialogTitle>
              <DialogDescription className="text-sm text-ink-secondary">
                Update the title and description before a consultant is assigned.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-surface-muted border border-line rounded-lg p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info-border transition"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Description</label>
                <textarea
                  rows={5}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-surface-muted border border-line rounded-lg p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info-border transition resize-none"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-lg border-line text-ink-secondary hover:bg-surface-muted">
                  Cancel
                </Button>
                <Button type="submit" className="bg-info hover:bg-info-strong text-white rounded-lg font-semibold">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-surface border border-line rounded-2xl p-0 max-w-md overflow-hidden">
          <div className="p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-ink">Request Deletion</DialogTitle>
              <DialogDescription className="text-sm text-ink-secondary">
                This requires approval from your account manager.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Why should this ticket be deleted?"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full bg-surface-muted border border-line rounded-lg p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition placeholder:text-ink-muted resize-none"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-lg border-line text-ink-secondary hover:bg-surface-muted">
                  Cancel
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-critical-strong text-white rounded-lg font-semibold">
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
