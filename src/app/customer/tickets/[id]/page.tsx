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
  Paperclip,
  User,
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
  Quote
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

export default function CustomerTicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    tickets,
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
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState('');

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

  if (!ticket) {
    return (
      <div className="p-8 text-center text-red-650 font-bold font-mono text-xs border border-red-200 rounded-lg bg-red-50/50">
        Error: Ticket ID {ticketId} not found in corporate support registers.
      </div>
    );
  }

  // Double check organization scope
  const customerCompany = user?.company || 'Apex Global Industries';
  if (ticket.organization !== customerCompany) {
    return (
      <div className="p-8 text-center text-red-650 font-bold font-mono text-xs border border-red-200 rounded-lg bg-red-50/50">
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

  // Hours calculations
  const totalApprovedHours = (ticket.efforts || [])
    .filter(e => e.status === 'Approved')
    .reduce((sum, e) => sum + e.hoursLogged, 0);

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

  // Handlers
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const files = uploadFileName
      ? [{ fileName: uploadFileName, fileSize: Number(uploadFileSize) || 150000, fileType: 'application/octet-stream' }]
      : undefined;

    addComment(
      ticket.id,
      commentText,
      user?.name || 'Sarah Jenkins',
      user?.email || 'customer@sap.com',
      'Customer',
      false,
      files
    );

    setCommentText('');
    setUploadFileName('');
    setUploadFileSize('');
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

  // Quoted vs Consumed progress stats
  const quoted = ticket.quotedHours || 0;
  const consumed = totalApprovedHours;
  const progressPercent = quoted > 0 ? Math.min(100, (consumed / quoted) * 100) : 0;
  const exceedsBudget = consumed > quoted && quoted > 0;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-500 rounded p-4 flex items-start gap-3 text-emerald-800 animate-in fade-in slide-in-from-top-1 duration-200">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
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
      
      {/* Top Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/customer/tickets" className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-950 transition">
            <ArrowLeft size={14} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-zinc-955">{ticket.id}</span>
              <Badge className="bg-zinc-950 text-white font-mono text-[9px] uppercase rounded border-0">{ticket.ticketType || 'Incident'}</Badge>
              {ticket.softDeleteStatus === 'Pending Delete' && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-250 font-mono text-[9px]">PENDING DELETION APPROVAL</Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-1 font-semibold">{ticket.title}</p>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex flex-wrap gap-2">
          
          {/* Edit Button (Available BEFORE Consultant Assignment only) */}
          {!ticket.assignedConsultant && ticket.status === 'New' && (
            <Button
              onClick={() => setShowEditDialog(true)}
              variant="outline"
              className="border-zinc-200 text-zinc-700 text-[10px] font-mono font-bold uppercase tracking-wider h-8 hover:border-zinc-950 flex items-center gap-1"
            >
              <Edit size={12} />
              Edit Description
            </Button>
          )}

          {ticket.status === 'Resolved' && (
            <>
              {/* Accept & Close */}
              <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-mono font-bold uppercase tracking-wider h-8">
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
                        className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full bg-zinc-955 hover:bg-zinc-900 text-white uppercase text-[10px] tracking-wider font-bold">
                        Confirm and Close
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
 
              {/* Reject & Reopen */}
              <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-red-200 text-red-650 hover:bg-red-50 text-[10px] font-mono font-bold uppercase tracking-wider h-8 hover:border-red-400">
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
                        className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
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
                <Button variant="outline" className="border-zinc-300 text-zinc-800 text-[10px] font-mono font-bold uppercase tracking-wider h-8 hover:border-zinc-950">
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
                <Button variant="outline" className="border-zinc-200 text-zinc-650 text-[10px] font-mono font-bold uppercase tracking-wider h-8 hover:text-red-750 hover:border-red-400 hover:bg-red-50/50">
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
              className="border-red-200 text-red-655 text-[10px] font-mono font-bold uppercase tracking-wider h-8 hover:text-red-700 hover:border-red-400 hover:bg-red-50/50 flex items-center gap-1"
            >
              <Trash2 size={12} />
              Request Deletion
            </Button>
          )}

        </div>
      </div>

      {/* Critical SLA Banner */}
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
            <TabsList className="bg-zinc-100 p-1 border border-zinc-200 rounded-lg flex gap-1 font-mono text-[10px] w-full max-w-md h-auto">
              <TabsTrigger value="overview" className="rounded px-3 py-1.5 text-[10px] uppercase font-bold tracking-wide data-[state=active]:bg-white data-[state=active]:text-zinc-950 flex-1">Overview & Fix</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded px-3 py-1.5 text-[10px] uppercase font-bold tracking-wide data-[state=active]:bg-white data-[state=active]:text-zinc-950 flex-1">Timeline ({timelineEvents.length})</TabsTrigger>
              <TabsTrigger value="efforts" className="rounded px-3 py-1.5 text-[10px] uppercase font-bold tracking-wide data-[state=active]:bg-white data-[state=active]:text-zinc-950 flex-1">SLA & Efforts</TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW & DETAILS */}
            <TabsContent value="overview" className="space-y-6">
              {/* Detailed Description */}
              <Card className="border-zinc-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50">
                  <div className="flex flex-wrap gap-4 text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Building2 size={11} /> {ticket.organization}</span>
                    <span>Category: {ticket.category}</span>
                    <span>Source: {ticket.source}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4 font-mono text-xs">
                  <div className="space-y-1">
                    <h3 className="font-bold text-zinc-400 uppercase text-[9px] tracking-wider">Replication & Description</h3>
                    <p className="text-zinc-800 leading-relaxed text-[11px] whitespace-pre-wrap">{ticket.description}</p>
                  </div>

                  {ticket.businessImpact && (
                    <div className="space-y-1 pt-3 border-t border-zinc-100">
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
                            href="#"
                            onClick={(e) => { e.preventDefault(); showBannerMessage(`Simulated download: "${att.fileName}" retrieved successfully from Supabase storage.`); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 hover:border-zinc-950 rounded-lg bg-zinc-50 font-mono font-bold text-[10px] text-zinc-700 hover:text-zinc-950 transition-all"
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
                        <Badge className="bg-emerald-105 bg-emerald-100 border border-emerald-200 text-emerald-800 font-mono text-[10px]">
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

                            <div className="space-y-1">
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
                              
                              <span className="font-semibold text-zinc-500 text-[10px] block font-mono">
                                Actioned by: <span className="font-bold text-zinc-950">{evt.author}</span> {evt.role !== 'System' && `(${evt.role})`}
                              </span>

                              <div className={`mt-1 font-mono text-xs leading-relaxed ${isAudit ? 'text-zinc-500 italic bg-zinc-50 p-2 rounded' : 'text-zinc-800'}`}>
                                {isAudit ? evt.content : renderCommentContent(evt.content)}
                              </div>

                              {/* Comment Attachments */}
                              {evt.attachments && evt.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1.5">
                                  {evt.attachments.map((att: any) => (
                                    <a
                                      key={att.id}
                                      href="#"
                                      onClick={(e) => { e.preventDefault(); showBannerMessage('Simulated download: Comment attachment file retrieved successfully.'); }}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded font-mono text-[9px] text-zinc-650 hover:border-zinc-950 transition"
                                    >
                                      <FileCode size={11} className="text-zinc-400" />
                                      {att.fileName}
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
                <Card className="border-zinc-200 shadow-sm bg-white">
                  <CardHeader className="pb-2 border-b border-zinc-100">
                    <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-955">Add Reply Comment</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleCommentSubmit} className="space-y-4 font-mono text-xs">
                      <textarea
                        required
                        rows={4}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Provide details on clarifications, feedback requests, or error dumps..."
                        className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950"
                      />

                      {/* Mockup file uploader for comments */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Add Attachment File Name (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. billing_dump.log"
                            value={uploadFileName}
                            onChange={(e) => setUploadFileName(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs focus:outline-none focus:border-zinc-950"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">File Size (Bytes)</label>
                          <input
                            type="number"
                            placeholder="e.g., 240000"
                            value={uploadFileSize}
                            onChange={(e) => setUploadFileSize(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded p-1.5 text-xs focus:outline-none focus:border-zinc-950"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button type="submit" className="bg-zinc-950 hover:bg-zinc-800 text-white font-mono font-bold uppercase tracking-wider text-[10px] h-9">
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
                  <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-950">SLA Resolution Target</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 font-mono text-xs text-zinc-705">
                  <div className="flex justify-between">
                    <span>SLA Application Flag:</span>
                    <span className="font-bold text-zinc-955">{isIncident ? 'ACTIVE (INCIDENT TICKET)' : 'NOT APPLICABLE (EXEMPT TICKET TYPE)'}</span>
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

              {/* Efforts summary (Restricting individual logs list and showing Quoted vs Consumed progress bar) */}
              <Card className="border-zinc-200 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-zinc-100 bg-zinc-50/50">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-950 flex items-center justify-between">
                    <span>Effort Delivery Tracking</span>
                    <Badge variant="outline" className="text-[9px] font-bold border-zinc-200">EXECUTIVE OVERVIEW</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {quoted === 0 ? (
                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex justify-between">
                        <span>Consumed Hours:</span>
                        <span className="font-bold text-zinc-900">{consumed.toFixed(1)}h</span>
                      </div>
                      <p className="text-[10px] text-zinc-450 italic">
                        No quoted hours budget has been set for this ticket yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Quoted Budget</span>
                          <span className="text-sm font-bold text-zinc-900 block mt-0.5">{quoted.toFixed(1)}h</span>
                        </div>
                        <div className={`p-3 border rounded-lg ${exceedsBudget ? 'bg-red-50 border-red-200' : 'bg-zinc-50 border-zinc-200'}`}>
                          <span className={`text-[8px] font-bold uppercase tracking-wider block ${exceedsBudget ? 'text-red-750' : 'text-zinc-400'}`}>Consumed</span>
                          <span className={`text-sm font-bold block mt-0.5 ${exceedsBudget ? 'text-red-650' : 'text-zinc-900'}`}>{consumed.toFixed(1)}h</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span>Hours Utilization</span>
                          <span className={exceedsBudget ? 'text-red-650 font-black' : 'text-zinc-650'}>
                            {progressPercent.toFixed(0)}% Used
                          </span>
                        </div>
                        <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              exceedsBudget ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                        {exceedsBudget && (
                          <span className="text-[9px] text-red-700 block font-bold mt-1 uppercase flex items-center gap-1">
                            <AlertCircle size={10} />
                            Budget Exceeded. Contact Account Manager to review AMS quoted limits.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[10px] text-zinc-450 leading-relaxed font-mono">
                    <span className="font-bold text-zinc-500 uppercase block mb-1">Visibility restriction note</span>
                    Timesheet logs are summarized at the executive level for client portals. Detailed consultant timesheet logs, audits, and billing references are restricted to interior teams.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: Status Attributes, Owner Details, Escalation statuses */}
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
                      <span className="font-bold text-zinc-950">{new Date(req.requestedAt).toLocaleDateString()}</span>
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
                  <span>Assigned Consultant:</span>
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
                {quoted > 0 && (
                  <div className="flex justify-between">
                    <span>Quoted Hours Budget:</span>
                    <span className="font-bold text-zinc-905 font-mono">{quoted}h</span>
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
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-red-800 flex items-center gap-1.5">
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
                          <p className="italic leading-normal text-red-900">"{latestEsc.reason}"</p>
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
                className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">Detailed description</label>
              <textarea
                rows={5}
                required
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
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
              <Button type="submit" variant="destructive" className="h-8 text-[10px] uppercase font-bold bg-red-600 hover:bg-red-700 text-white">
                Request Soft-Delete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
