'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Ticket, TicketStatus, SAPModule, Comment, Attachment, TicketHourEstimate, TicketClosureRequest, TicketUnlockRequest } from '../../types/ticket';
import { useTickets } from '../../context/TicketContext';
import { useAuth } from '../../context/AuthContext';
import { SlaBadge } from './SlaBadge';
import { TicketTimeline } from './TicketTimeline';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client';
import {
  ArrowLeft,
  Clock,
  Layers,
  Check,
  AlertTriangle,
  Building2,
  Paperclip,
  Plus,
  User,
  ShieldCheck,
  CheckCircle,
  Copy,
  ChevronRight,
  Send,
  X,
  FileText,
  AlertCircle,
  Users,
  Briefcase,
  Lock,
  Unlock
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

interface ConsultantTicketDetailsViewProps {
  ticketId: string;
}

const MOCK_MENTIONABLE_USERS = [
  { id: 'manager@sap.com', name: 'Marcus Vance', role: 'SAP Manager' },
  { id: 'consultant@sap.com', name: 'Karthik Subramanian', role: 'Consultant' },
  { id: 'arun@sap.com', name: 'Arun Kumar', role: 'Functional Consultant' },
  { id: 'priya@sap.com', name: 'Priya S', role: 'Functional Consultant' },
  { id: 'rahim@sap.com', name: 'Rahim', role: 'Technical Consultant' },
  { id: 'vijay@sap.com', name: 'Vijay', role: 'Technical Consultant' },
  { id: 'admin@sap.com', name: 'Super Admin', role: 'Super Admin' }
];

export const ConsultantTicketDetailsView: React.FC<ConsultantTicketDetailsViewProps> = ({ ticketId }) => {
  const { user } = useAuth();
  const {
    tickets,
    addComment,
    updateTicketStatus,
    quoteEstimatedHours,
    requestEstimateRevision,
    raiseClosureRequest,
    resubmitClosureRequest,
    requestUnlock
  } = useTickets();

  const ticket = tickets.find((t) => t.id === ticketId);
  const consultantName = user?.name || 'Karthik Subramanian';
  const consultantType = user?.consultantType || 'Functional';

  // UI States
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'quote' | 'revision' | 'closure' | 'resubmit_closure' | 'unlock' | null>(null);

  // Status Dropdown State
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>('');

  // Comment & Mentions States
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [commentFiles, setCommentFiles] = useState<Array<{ id: string; fileName: string; fileSize: number; fileType: string; fileUrl: string }>>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Unlock request states
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockChange, setUnlockChange] = useState('');
  const [unlockRemarks, setUnlockRemarks] = useState('');

  // Validation / Upload States
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);

  // Estimate Quotation / Revision States
  const [estFuncHours, setEstFuncHours] = useState('');
  const [estTechHours, setEstTechHours] = useState('');
  const [estRemarks, setEstRemarks] = useState('');

  // Closure States
  const [actFuncHours, setActFuncHours] = useState('');
  const [actTechHours, setActTechHours] = useState('');
  const [workCompletedSummary, setWorkCompletedSummary] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [pendingItems, setPendingItems] = useState('');

  useEffect(() => {
    if (ticket) {
      setSelectedStatus(ticket.status);
    }
  }, [ticket]);

  if (!ticket) {
    return (
      <div className="p-8 text-center text-red-500 font-bold font-mono bg-red-50 border border-red-200 rounded-lg">
        ERROR: Ticket ID "{ticketId}" not found in database registry.
      </div>
    );
  }

  // Age calculation
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

  const showBannerMessage = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  // Status transition intercept
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as TicketStatus;
    if (!newStatus || newStatus === ticket.status) return;

    if (newStatus === 'Request for Closure') {
      // Prompt closure details modal
      setValidationError(null);
      setActFuncHours('');
      setActTechHours('');
      setWorkCompletedSummary('');
      setRootCause('');
      setResolutionSummary('');
      setPendingItems('');
      setActiveModal('closure');
      return;
    }

    updateTicketStatus(ticket.id, newStatus, consultantName);
    setSelectedStatus(newStatus);
    showBannerMessage(`Ticket status updated to "${newStatus}".`);
  };

  // Comment submit
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const parsedMentions: string[] = [];
    MOCK_MENTIONABLE_USERS.forEach(u => {
      if (commentText.includes(`@${u.name}`)) {
        parsedMentions.push(u.id);
      }
    });

    addComment(
      ticket.id,
      commentText,
      consultantName,
      user?.email || 'consultant@sap.com',
      'Consultant',
      isInternalComment,
      commentFiles.map(f => ({ fileName: f.fileName, fileSize: f.fileSize, fileType: f.fileType, fileUrl: f.fileUrl })),
      parsedMentions
    );

    setCommentText('');
    setCommentFiles([]);
    showBannerMessage(`Reply successfully added to conversation.`);
  };

  // Mentions dropdown keys
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => Math.min(prev + 1, filteredMentions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (mentionIndex >= 0 && filteredMentions[mentionIndex]) {
          insertMention(filteredMentions[mentionIndex].name);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionDropdown(false);
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1 && lastAtPos >= textBeforeCursor.length - 15) {
      const search = textBeforeCursor.slice(lastAtPos + 1);
      if (!search.includes(' ')) {
        setMentionSearch(search);
        setShowMentionDropdown(true);
        setMentionIndex(0);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const insertMention = (name: string) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const val = commentText;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const start = val.slice(0, lastAtPos);
      const end = val.slice(cursor);
      const inserted = `@${name} `;
      setCommentText(start + inserted + end);
      setShowMentionDropdown(false);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = lastAtPos + inserted.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 50);
    }
  };

  const filteredMentions = useMemo(() => {
    return MOCK_MENTIONABLE_USERS.filter(u =>
      u.name.toLowerCase().includes(mentionSearch.toLowerCase())
    );
  }, [mentionSearch]);

  // File Upload Helper
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const filesList = Array.from(files);

    for (const file of filesList) {
      const fileId = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      setUploadProgress(prev => ({ ...prev, [fileId]: 10 }));

      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 10MB limit.`);
        continue;
      }

      let fileUrl = '';
      if (isSupabaseConfigured && supabase) {
        try {
          const filePath = `tickets/${ticket.id}/comments/${fileId}/${file.name}`;
          setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));

          const { error: uploadError } = await supabase.storage.from('tickets') // Simulating bucket access
            .upload(filePath, file, { cacheControl: '3600', upsert: true } as any);

          if (uploadError) {
            alert(`Upload failed for ${file.name}`);
            continue;
          }

          setUploadProgress(prev => ({ ...prev, [fileId]: 95 }));
          const { data: urlData } = supabase.storage.from('tickets').getPublicUrl(filePath);
          fileUrl = urlData?.publicUrl || '';
          setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        } catch (err) {
          alert(`File upload exception: ${file.name}`);
          continue;
        }
      } else {
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        fileUrl = `/files/${file.name}`;
      }

      setCommentFiles(prev => [
        ...prev,
        { id: fileId, fileName: file.name, fileSize: file.size, fileType: file.type, fileUrl }
      ]);
    }
    setIsUploading(false);
  };

  const removeAttachmentFromComment = (idx: number) => {
    setCommentFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Submit Operations
  const handleQuoteHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estFuncHours || !estTechHours) return;

    quoteEstimatedHours(ticket.id, {
      functionalEstimatedHours: Number(estFuncHours),
      technicalEstimatedHours: Number(estTechHours),
      remarks: estRemarks,
      submittedBy: consultantName
    });
    showBannerMessage('Initial hours quote submitted and locked.');
    setActiveModal(null);
  };

  const handleRevisionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estFuncHours || !estTechHours || !estRemarks.trim()) {
      setValidationError('Justification remarks are required for revision requests.');
      return;
    }

    requestEstimateRevision(ticket.id, {
      functionalEstimatedHours: Number(estFuncHours),
      technicalEstimatedHours: Number(estTechHours),
      remarks: estRemarks,
      submittedBy: consultantName
    });
    showBannerMessage('Revision request logged and awaiting Manager review.');
    setActiveModal(null);
  };

  const handleRaiseClosure = (e: React.FormEvent) => {
    e.preventDefault();
    const fHours = Number(actFuncHours) || 0;
    const tHours = Number(actTechHours) || 0;

    if (!workCompletedSummary.trim() || !rootCause.trim() || !resolutionSummary.trim()) {
      setValidationError('Work Summary, Root Cause, and Resolution are required fields.');
      return;
    }

    if (fHours === 0 && tHours === 0) {
      setValidationError('At least one actual hours value (Functional/Technical) must be greater than 0.');
      return;
    }

    setValidationError(null);
    raiseClosureRequest(ticket.id, {
      functionalActualHours: fHours,
      technicalActualHours: tHours,
      workCompletedSummary,
      rootCause,
      resolutionSummary,
      pendingItems: pendingItems || undefined,
      requestedBy: consultantName
    });
    showBannerMessage('Closure request logged successfully. Ticket is now locked.');
    setActiveModal(null);
  };

  const handleResubmitClosure = (e: React.FormEvent) => {
    e.preventDefault();
    const fHours = Number(actFuncHours) || 0;
    const tHours = Number(actTechHours) || 0;

    if (!workCompletedSummary.trim() || !rootCause.trim() || !resolutionSummary.trim()) {
      setValidationError('Work Summary, Root Cause, and Resolution are required fields.');
      return;
    }

    const latestCls = ticket.closureRequests?.[ticket.closureRequests.length - 1];
    if (!latestCls) return;

    setValidationError(null);
    resubmitClosureRequest(ticket.id, latestCls.id, {
      functionalActualHours: fHours,
      technicalActualHours: tHours,
      workCompletedSummary,
      rootCause,
      resolutionSummary,
      pendingItems: pendingItems || undefined,
      requestedBy: consultantName
    });
    showBannerMessage('Closure request resubmitted to Manager.');
    setActiveModal(null);
  };

  const handleRequestUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockReason.trim() || !unlockChange.trim()) {
      setValidationError('Reason and requested changes are required.');
      return;
    }

    setValidationError(null);
    requestUnlock(ticket.id, {
      reason: unlockReason,
      requestedChange: unlockChange,
      remarks: unlockRemarks || undefined,
      requestedBy: consultantName
    });
    showBannerMessage('Unlock request submitted to Manager.');
    setActiveModal(null);
  };

  // Estimates & Closure summaries
  const currentEstimate = (ticket.hourEstimates || [])
    .filter(e => e.status === 'Submitted' || e.status === 'Revision Approved')
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

  const currentRevisionReq = (ticket.hourEstimates || [])
    .filter(e => e.status === 'Revision Requested')
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

  const latestClosureReq = (ticket.closureRequests || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const latestUnlockReq = (ticket.unlockRequests || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const hasPendingUnlock = latestUnlockReq?.status === 'Pending';
  const isLocked = ticket.status === 'Closed' || ticket.status === 'Request for Closure' || (latestClosureReq && latestClosureReq.status === 'Pending Manager Approval');

  return (
    <div className="space-y-6 bg-slate-50 text-slate-900 min-h-screen p-6 md:p-8 font-sans">
      
      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <Link href="/consultant/my-tickets">
            <Button variant="outline" size="icon" className="h-8 w-8 text-slate-600 bg-white">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base font-bold text-slate-950 bg-white px-2 py-0.5 border border-slate-200 rounded">{ticket.id}</span>
              <Badge variant="secondary" className="text-[10px] font-mono font-bold uppercase">{ticket.ticketType || 'Incident'}</Badge>
              <SlaBadge ticket={ticket} />
              <Badge variant="outline" className="text-[10px] bg-white border border-slate-200 text-slate-600 font-mono py-0.5">Age: {ageDays} days</Badge>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1.5">{ticket.title}</h1>
          </div>
        </div>
      </div>

      {/* Banners */}
      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-center gap-2 text-xs font-semibold animate-slide-in">
          <CheckCircle size={15} />
          {successBanner}
        </div>
      )}

      {isLocked && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-semibold">
          <div className="flex items-start gap-2.5">
            <Lock size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] font-mono">Backlog Item Locked</p>
              <p className="mt-1 leading-normal text-red-650 font-mono">
                This ticket is locked because a closure request is pending approval or closed. 
                All modifications (status edits, comments, attachments) are blocked.
              </p>
            </div>
          </div>
          {hasPendingUnlock ? (
            <Badge className="bg-amber-100 border border-amber-300 text-amber-800 font-mono uppercase px-3 py-1 text-[10px]">
              Unlock Requested
            </Badge>
          ) : (
            <Button
              onClick={() => {
                setUnlockReason('');
                setUnlockChange('');
                setUnlockRemarks('');
                setValidationError(null);
                setActiveModal('unlock');
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase font-mono text-[10px] h-8 cursor-pointer"
            >
              Request Manager Unlock
            </Button>
          )}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Core Fields */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Requirement Details */}
          <Card className="bg-white border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <Briefcase size={14} className="text-slate-400" />
              Requirement description details
            </h3>
            <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed pt-1">
              {ticket.description}
            </div>
          </Card>

          {/* Estimated Hours Quotation */}
          <Card className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                Resource Estimates (Quotation)
              </h3>
              
              {!currentEstimate ? (
                <Button
                  disabled={isLocked}
                  onClick={() => {
                    setEstFuncHours('');
                    setEstTechHours('');
                    setEstRemarks('');
                    setActiveModal('quote');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase h-7 cursor-pointer"
                >
                  Quote Estimated Hours
                </Button>
              ) : (
                <Button
                  disabled={isLocked}
                  onClick={() => {
                    setEstFuncHours(String(currentEstimate.functionalEstimatedHours));
                    setEstTechHours(String(currentEstimate.technicalEstimatedHours));
                    setEstRemarks('');
                    setValidationError(null);
                    setActiveModal('revision');
                  }}
                  variant="outline"
                  className="text-[10px] font-bold uppercase h-7 cursor-pointer"
                >
                  Raise Hours Revision Request
                </Button>
              )}
            </div>

            {currentEstimate ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                  {consultantType === 'Functional' ? (
                    <div className="bg-slate-50 p-3 border border-slate-200 rounded border-l-2 border-l-blue-500">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Functional Hours</span>
                      <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">{currentEstimate.functionalEstimatedHours} h</span>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3 border border-slate-200 rounded border-l-2 border-l-violet-500">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Technical Hours</span>
                      <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">{currentEstimate.technicalEstimatedHours} h</span>
                    </div>
                  )}
                  <div className="bg-slate-50 p-3 border border-slate-200 rounded border-l-2 border-l-emerald-500">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Role Estimated Hours</span>
                    <span className="text-lg font-bold text-emerald-600 mt-1 block font-mono">
                      {consultantType === 'Functional' ? currentEstimate.functionalEstimatedHours : currentEstimate.technicalEstimatedHours} h
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 border border-slate-200 rounded text-xs space-y-1.5 text-slate-655 font-mono">
                  <div>Remarks: <span className="text-slate-900 italic">"{currentEstimate.remarks || 'No remarks listed'}"</span></div>
                  <div className="flex justify-between text-[10px] pt-1 text-slate-400 border-t border-slate-200/50">
                    <span>Submitted by: <strong>{currentEstimate.consultantId}</strong></span>
                    <span>Date: <strong>{new Date(currentEstimate.submittedAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-slate-200 bg-slate-50/45 rounded text-xs text-slate-400 italic font-mono">
                No estimates quoted yet. Initial one-time quote required.
              </div>
            )}

            {currentRevisionReq && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded text-xs text-amber-800 space-y-1 font-mono">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle size={13} className="text-amber-600" />
                  Pending Estimate Revision Request
                </div>
                <div>Proposed: <strong>{currentRevisionReq.totalEstimatedHours} h</strong> (Func: {currentRevisionReq.functionalEstimatedHours}h, Tech: {currentRevisionReq.technicalEstimatedHours}h)</div>
                <div className="italic">Justification: "{currentRevisionReq.remarks}"</div>
              </div>
            )}
          </Card>

          {/* Actual Hours & Closure Summary */}
          <Card className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle size={14} className="text-slate-400" />
                Actual Hours & Closure Requests
              </h3>
              
              {ticket.status !== 'Closed' && ticket.status !== 'Request for Closure' && (
                <Button
                  onClick={() => {
                    setActFuncHours('');
                    setActTechHours('');
                    setWorkCompletedSummary('');
                    setRootCause('');
                    setResolutionSummary('');
                    setPendingItems('');
                    setValidationError(null);
                    setActiveModal('closure');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase h-7 cursor-pointer"
                >
                  Raise Closure Request
                </Button>
              )}
            </div>

            {latestClosureReq ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                  {consultantType === 'Functional' ? (
                    <div className="bg-slate-50 p-3 border border-slate-200 rounded border-l-2 border-l-blue-500">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Functional Actual</span>
                      <span className="text-lg font-bold text-slate-900 mt-1 block">{latestClosureReq.functionalActualHours} h</span>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3 border border-slate-200 rounded border-l-2 border-l-violet-500">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Technical Actual</span>
                      <span className="text-lg font-bold text-slate-900 mt-1 block">{latestClosureReq.technicalActualHours} h</span>
                    </div>
                  )}
                  <div className="bg-slate-50 p-3 border border-slate-200 rounded border-l-2 border-l-emerald-500">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Role Actual Hours</span>
                    <span className="text-lg font-bold text-emerald-600 mt-1 block">
                      {consultantType === 'Functional' ? latestClosureReq.functionalActualHours : latestClosureReq.technicalActualHours} h
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border border-slate-200 rounded space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-bold text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Work Completed Summary</span>
                      <p className="text-slate-900 whitespace-pre-line leading-relaxed">{latestClosureReq.workCompletedSummary}</p>
                    </div>
                    <div>
                      <span className="font-bold text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Root Cause</span>
                      <p className="text-slate-900 whitespace-pre-line leading-relaxed">{latestClosureReq.rootCause}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-bold text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Resolution Summary</span>
                      <p className="text-slate-900 whitespace-pre-line leading-relaxed">{latestClosureReq.resolutionSummary}</p>
                    </div>
                    {latestClosureReq.pendingItems && (
                      <div className="md:col-span-2">
                        <span className="font-bold text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Pending Items</span>
                        <p className="text-slate-900">{latestClosureReq.pendingItems}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-2 text-slate-400 border-t border-slate-200/50">
                    <span>Requested by: <strong className="text-slate-700">{latestClosureReq.requestedBy}</strong></span>
                    <div className="flex gap-2 items-center">
                      <span>Approval Status:</span>
                      <Badge className={`uppercase text-[9px] ${
                        latestClosureReq.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                        latestClosureReq.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>{latestClosureReq.status}</Badge>
                    </div>
                  </div>

                  {latestClosureReq.status === 'Rejected' && (
                    <div className="bg-red-50 p-3 rounded border border-red-200 space-y-2 mt-2">
                      <div className="text-red-850 font-bold text-[10px] uppercase font-mono">Manager Rejection Reason:</div>
                      <p className="text-slate-900 italic">"{latestClosureReq.rejectionReason || 'No reason specified.'}"</p>
                      <Button
                        onClick={() => {
                          setActFuncHours(String(latestClosureReq.functionalActualHours));
                          setActTechHours(String(latestClosureReq.technicalActualHours));
                          setWorkCompletedSummary(latestClosureReq.workCompletedSummary);
                          setRootCause(latestClosureReq.rootCause);
                          setResolutionSummary(latestClosureReq.resolutionSummary);
                          setPendingItems(latestClosureReq.pendingItems || '');
                          setValidationError(null);
                          setActiveModal('resubmit_closure');
                        }}
                        className="bg-red-650 hover:bg-red-750 text-white font-mono font-bold text-[9px] h-7 cursor-pointer"
                      >
                        Resubmit Closure Request
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-slate-200 bg-slate-50/45 rounded text-xs text-slate-400 italic font-mono">
                No closure requests submitted.
              </div>
            )}
          </Card>

          {/* Incidents Communication Channel */}
          <Card className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 font-mono">
                Incidents Communication Channel
              </h3>
              
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase font-mono ${!isInternalComment ? 'text-slate-900 font-black' : 'text-slate-400'}`}>Public</span>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setIsInternalComment(!isInternalComment)}
                  className="w-8 h-4 rounded-full bg-slate-100 border border-slate-300 relative transition-all cursor-pointer"
                >
                  <span className={`w-3.5 h-3.5 rounded-full absolute top-0 transition-all ${isInternalComment ? 'left-4 bg-red-500' : 'left-0 bg-slate-400'}`}></span>
                </button>
                <span className={`text-[10px] font-bold uppercase font-mono ${isInternalComment ? 'text-red-500 font-black' : 'text-slate-400'}`}>Internal Note</span>
              </div>
            </div>

            {/* Comment Composer */}
            <form onSubmit={handleAddComment} className="space-y-4 bg-slate-50 p-4 border border-slate-200 rounded-lg relative">
              <textarea
                disabled={isLocked}
                ref={textareaRef}
                value={commentText}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeyDown}
                placeholder={isLocked ? "This conversation channel is locked." : (isInternalComment ? "Write internal log..." : "Reply to Customer...")}
                className="w-full bg-white border border-slate-200 rounded p-3 text-xs h-28 focus:outline-none focus:border-slate-350 text-slate-900 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />

              {showMentionDropdown && filteredMentions.length > 0 && !isLocked && (
                <div className="absolute left-4 bottom-14 z-50 bg-white border border-slate-200 rounded-md shadow-2xl w-60 py-1 text-xs text-slate-700">
                  <div className="px-3 py-1 text-[9px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100">
                    Mention user
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {filteredMentions.map((u, i) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => insertMention(u.name)}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition ${
                          i === mentionIndex ? 'bg-slate-100 text-slate-900' : ''
                        }`}
                      >
                        <span className="font-bold">{u.name}</span>
                        <span className="text-[9px] text-slate-400">{u.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {commentFiles.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/50">
                  {commentFiles.map((file, i) => (
                    <div key={file.id || i} className="flex items-center justify-between bg-white border border-slate-200 rounded p-2 text-[10px] text-slate-700">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Paperclip size={10} className="text-slate-400 shrink-0" />
                        <span className="truncate font-semibold">{file.fileName}</span>
                        <span className="text-slate-400 font-mono">({Math.round(file.fileSize / 1024)} KB)</span>
                      </div>
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => removeAttachmentFromComment(i)}
                        className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-250/50">
                <div className="flex items-center gap-2">
                  <label className={`cursor-pointer p-1.5 hover:bg-white border border-slate-200 rounded text-slate-655 transition flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase ${
                    isLocked || isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
                    <Paperclip size={12} />
                    <span>Choose File</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isLocked || isUploading}
                    />
                  </label>
                  {isUploading && (
                    <span className="text-[10px] font-mono text-slate-400 animate-pulse">Uploading file...</span>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLocked}
                  className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={11} />
                  Send reply
                </Button>
              </div>
            </form>

            {/* Conversation list */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {(ticket.comments || []).map(c => (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                    c.isInternal
                      ? 'bg-red-50/40 border-red-200 border-dashed'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-slate-400" />
                      <span className="font-bold text-slate-900 font-mono">{c.authorName}</span>
                      <Badge className={`text-[8px] tracking-wider uppercase ${
                        c.isInternal ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-655'
                      }`}>{c.isInternal ? 'Internal Note' : c.authorRole}</Badge>
                    </div>
                    <span className="text-slate-400 font-mono">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">{c.content}</p>

                  {c.attachments && c.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                      {c.attachments.map((file, i) => (
                        <a
                          key={i}
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded text-[9px] text-slate-500 font-mono transition"
                        >
                          <Paperclip size={10} className="text-slate-400" />
                          <span>{file.fileName}</span>
                          <span className="text-[8px] text-slate-400">({Math.round(file.fileSize / 1024)} KB)</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Audit History */}
          <Card className="bg-white border border-slate-200 p-5 shadow-sm">
            <TicketTimeline ticket={ticket} />
          </Card>

        </div>

        {/* Right Column: Sidebar metadata */}
        <div className="space-y-6">
          
          {/* Controls */}
          <Card className="bg-white border border-slate-200 p-4 shadow-sm space-y-4">
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest block border-b border-slate-150 pb-2 font-mono">Incident State Controls</span>
            
            <div className="space-y-2">
              <label className="font-bold text-slate-500 uppercase text-[9px] font-mono block">Workflow Status</label>
              <select
                disabled={isLocked}
                value={selectedStatus}
                onChange={handleStatusChange}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 font-mono focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="Requirement Gathering">1. Requirement Gathering</option>
                <option value="Waiting for Hours Approval">2. Waiting for Hours Approval</option>
                <option value="In Progress - Technical">3. In Progress - Technical</option>
                <option value="In Progress - Functional">4. In Progress - Functional</option>
                <option value="Raised to SAP">5. Raised to SAP</option>
                <option value="Customer Action">6. Customer Action</option>
                <option value="Request for Closure">7. Request for Closure</option>
              </select>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-655 font-mono pt-3 border-t border-slate-100">
              <div>SAP Modules: <span className="px-1.5 py-0.2 bg-slate-50 border border-slate-200 rounded font-bold text-slate-700">{ticket.sapModule}</span></div>
              <div className="pt-1">Priority: <span className="font-bold text-slate-900">{ticket.priority}</span></div>
              <div className="pt-1">Classification: <span className="font-bold text-slate-900">{ticket.functionalOrTechnical || 'Functional'}</span></div>
            </div>
          </Card>

          {/* Customer profile */}
          <Card className="bg-white border border-slate-200 p-4 shadow-sm space-y-3">
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest block border-b border-slate-150 pb-2 font-mono">Customer profile</span>
            <div className="space-y-2.5 text-[11px] text-slate-655 font-mono">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                <Building2 size={13} className="text-slate-400" />
                {ticket.organization}
              </div>
              <div className="space-y-1 pt-1 text-[10px]">
                <div>Requester: <b className="text-slate-900">{ticket.createdByName || ticket.requestedBy}</b></div>
                <div>Email: <b className="text-slate-900">{ticket.requestedByEmail || 'customer@sap.com'}</b></div>
                <div>Created: <b>{new Date(ticket.createdAt).toLocaleString()}</b></div>
                <div>Last Updated: <b>{new Date(ticket.updatedAt).toLocaleString()}</b></div>
              </div>
            </div>
          </Card>

          {/* Workflow Approvals status */}
          <Card className="bg-white border border-slate-200 p-4 shadow-sm space-y-3">
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest block border-b border-slate-150 pb-2 font-mono">Workflow Approvals Status</span>
            
            <div className="space-y-3 text-[11px] font-mono">
              
              {/* Estimates revision approvals log */}
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Estimates Revision approvals</span>
                {(ticket.hourEstimates || []).length === 0 ? (
                  <span className="text-slate-400 italic block mt-1">No estimates logged.</span>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    {(ticket.hourEstimates || []).map((est, i) => (
                      <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>{est.totalEstimatedHours} h</span>
                          <span className={
                            est.status.includes('Approved') ? 'text-emerald-600' :
                            est.status.includes('Rejected') ? 'text-red-600' :
                            'text-amber-600'
                          }>{est.status}</span>
                        </div>
                        {est.remarks && <div className="text-[9px] text-slate-450 truncate">"{est.remarks}"</div>}
                        {est.rejectionReason && <div className="text-[9px] text-red-500">Rejection: {est.rejectionReason}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Closure request approvals log */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Closure approvals</span>
                {(ticket.closureRequests || []).length === 0 ? (
                  <span className="text-slate-400 italic block mt-1">No closure requests logged.</span>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    {(ticket.closureRequests || []).map((req, i) => (
                      <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>{req.totalActualHours} h</span>
                          <span className={
                            req.status === 'Approved' ? 'text-emerald-600' :
                            req.status === 'Rejected' ? 'text-red-600' :
                            'text-amber-600'
                          }>{req.status}</span>
                        </div>
                        {req.rejectionReason && <div className="text-[9px] text-red-500">Rejection: {req.rejectionReason}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unlock Requests */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Unlock Requests</span>
                {(ticket.unlockRequests || []).length === 0 ? (
                  <span className="text-slate-400 italic block mt-1">No unlock requests logged.</span>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    {(ticket.unlockRequests || []).map((req, i) => (
                      <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded space-y-1">
                        <div className="flex justify-between font-bold">
                          <span className="truncate max-w-[120px]">{req.reason}</span>
                          <span className={
                            req.status === 'Approved' ? 'text-emerald-600' :
                            req.status === 'Rejected' ? 'text-red-600' :
                            'text-amber-600'
                          }>{req.status}</span>
                        </div>
                        {req.rejectionReason && <div className="text-[9px] text-red-500">Rejection: {req.rejectionReason}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </Card>

          {/* Attachments */}
          <Card className="bg-white border border-slate-200 p-4 shadow-sm space-y-3">
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest block border-b border-slate-150 pb-2 font-mono">Attachments registry</span>
            <div className="space-y-2 text-[10px] font-mono">
              {(ticket.attachments || []).map((a, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="font-bold text-slate-700 truncate max-w-[150px]">{a.fileName}</span>
                  <span className="text-slate-450">{a.fileSize ? `${(a.fileSize/1024).toFixed(0)} KB` : '150 KB'}</span>
                </div>
              ))}
              {(ticket.attachments || []).length === 0 && (
                <span className="text-slate-400 italic text-[10px] block">No attachments.</span>
              )}
            </div>
          </Card>

        </div>

      </div>

      {/* MODALS SECTION */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="bg-white border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in text-slate-900">
            
            {/* Header */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center font-bold uppercase text-[10px] tracking-wide text-slate-900 font-mono">
              <span>
                {activeModal === 'quote' && 'Quote Estimated Hours'}
                {activeModal === 'revision' && 'Request Estimates Revision'}
                {activeModal === 'closure' && 'Raise Closure Request'}
                {activeModal === 'resubmit_closure' && 'Resubmit Closure Request'}
                {activeModal === 'unlock' && 'Request Manager Unlock'}
              </span>
              <button onClick={() => setActiveModal(null)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-950 transition">
                <X size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
              
              {validationError && (
                <div className="p-3 bg-red-50 text-red-800 border border-red-200 text-xs font-mono font-bold rounded flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* QUOTE HOURS */}
              {activeModal === 'quote' && (
                <form onSubmit={handleQuoteHours} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Functional Estimated Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 12.0"
                        value={estFuncHours}
                        onChange={(e) => setEstFuncHours(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 disabled:opacity-50"
                        min="0"
                        required={consultantType === 'Functional'}
                        disabled={consultantType !== 'Functional'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Technical Estimated Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 15.0"
                        value={estTechHours}
                        onChange={(e) => setEstTechHours(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 disabled:opacity-50"
                        min="0"
                        required={consultantType === 'Technical'}
                        disabled={consultantType !== 'Technical'}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Remarks</label>
                    <textarea
                      value={estRemarks}
                      onChange={(e) => setEstRemarks(e.target.value)}
                      placeholder="Add estimate remarks..."
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-24 focus:outline-none"
                    />
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono">
                    Initial estimates do not require manager approvals. They will activate immediately and lock the ticket estimate.
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-150 pt-3">
                    <Button type="button" variant="outline" onClick={() => setActiveModal(null)} className="text-[10px] font-bold font-mono uppercase h-8">Cancel</Button>
                    <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold font-mono uppercase h-8 cursor-pointer">Submit Quote</Button>
                  </div>
                </form>
              )}

              {/* REVISION REQUEST */}
              {activeModal === 'revision' && (
                <form onSubmit={handleRevisionRequest} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">New Functional Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 15.0"
                        value={estFuncHours}
                        onChange={(e) => setEstFuncHours(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 disabled:opacity-50"
                        min="0"
                        required={consultantType === 'Functional'}
                        disabled={consultantType !== 'Functional'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">New Technical Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 20.0"
                        value={estTechHours}
                        onChange={(e) => setEstTechHours(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 disabled:opacity-50"
                        min="0"
                        required={consultantType === 'Technical'}
                        disabled={consultantType !== 'Technical'}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Remarks / Justification (Mandatory)</label>
                    <textarea
                      value={estRemarks}
                      onChange={(e) => setEstRemarks(e.target.value)}
                      placeholder="Detail why hours need to be revised..."
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-24 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="text-[10px] text-amber-600 font-bold font-mono">
                    Revisions require Manager approval before they update.
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-150 pt-3">
                    <Button type="button" variant="outline" onClick={() => setActiveModal(null)} className="text-[10px] font-bold font-mono uppercase h-8">Cancel</Button>
                    <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold font-mono uppercase h-8 cursor-pointer">Submit Revision Request</Button>
                  </div>
                </form>
              )}

              {/* RAISE CLOSURE REQUEST */}
              {activeModal === 'closure' && (
                <form onSubmit={handleRaiseClosure} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Functional Actual Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 6.0"
                        value={actFuncHours}
                        onChange={(e) => setActFuncHours(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 disabled:opacity-50"
                        min="0"
                        required={consultantType === 'Functional'}
                        disabled={consultantType !== 'Functional'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Technical Actual Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 8.0"
                        value={actTechHours}
                        onChange={(e) => setActTechHours(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 disabled:opacity-50"
                        min="0"
                        required={consultantType === 'Technical'}
                        disabled={consultantType !== 'Technical'}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] font-mono block">Work Completed Summary (Mandatory)</label>
                    <textarea
                      value={workCompletedSummary}
                      onChange={(e) => setWorkCompletedSummary(e.target.value)}
                      placeholder="Outline final support deliverables..."
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-16 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-red-500 uppercase text-[9px] font-mono block">Root Cause (Mandatory)</label>
                    <textarea
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      placeholder="Detail root cause..."
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-16 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-red-500 uppercase text-[9px] font-mono block">Resolution Summary (Mandatory)</label>
                    <textarea
                      value={resolutionSummary}
                      onChange={(e) => setResolutionSummary(e.target.value)}
                      placeholder="Detail resolution steps..."
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-16 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px] font-mono block">Pending Items (Optional)</label>
                    <input
                      type="text"
                      value={pendingItems}
                      onChange={(e) => setPendingItems(e.target.value)}
                      placeholder="e.g. transport import to production"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-150 pt-3">
                    <Button type="button" variant="outline" onClick={() => setActiveModal(null)} className="text-[10px] font-bold font-mono uppercase h-8">Cancel</Button>
                    <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold font-mono uppercase h-8 cursor-pointer">Submit Closure Request</Button>
                  </div>
                </form>
              )}

              {/* RESUBMIT CLOSURE */}
              {activeModal === 'resubmit_closure' && (
                <form onSubmit={handleResubmitClosure} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Revised Functional Actual Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        value={actFuncHours}
                        onChange={(e) => setActFuncHours(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 disabled:opacity-50"
                        min="0"
                        required={consultantType === 'Functional'}
                        disabled={consultantType !== 'Functional'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Revised Technical Actual Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        value={actTechHours}
                        onChange={(e) => setActTechHours(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 disabled:opacity-50"
                        min="0"
                        required={consultantType === 'Technical'}
                        disabled={consultantType !== 'Technical'}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-550 uppercase text-[9px] font-mono block">Work Completed Summary</label>
                    <textarea
                      value={workCompletedSummary}
                      onChange={(e) => setWorkCompletedSummary(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-16 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-red-500 uppercase text-[9px] font-mono block">Root Cause</label>
                    <textarea
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-16 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-red-500 uppercase text-[9px] font-mono block">Resolution Summary</label>
                    <textarea
                      value={resolutionSummary}
                      onChange={(e) => setResolutionSummary(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-16 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-550 uppercase text-[9px] font-mono block">Pending Items</label>
                    <input
                      type="text"
                      value={pendingItems}
                      onChange={(e) => setPendingItems(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-150 pt-3">
                    <Button type="button" variant="outline" onClick={() => setActiveModal(null)} className="text-[10px] font-bold font-mono uppercase h-8">Cancel</Button>
                    <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold font-mono uppercase h-8 cursor-pointer">Resubmit Request</Button>
                  </div>
                </form>
              )}

              {/* REQUEST UNLOCK */}
              {activeModal === 'unlock' && (
                <form onSubmit={handleRequestUnlock} className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Reason for Unlock (Mandatory)</label>
                    <input
                      type="text"
                      placeholder="e.g. Need to revise estimates"
                      value={unlockReason}
                      onChange={(e) => setUnlockReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Changes Required (Mandatory)</label>
                    <textarea
                      placeholder="Detail exactly what changes are needed..."
                      value={unlockChange}
                      onChange={(e) => setUnlockChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-24 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Remarks</label>
                    <textarea
                      placeholder="Any additional remarks..."
                      value={unlockRemarks}
                      onChange={(e) => setUnlockRemarks(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-16 focus:outline-none"
                    />
                  </div>

                  <div className="text-[10px] text-amber-600 font-bold font-mono">
                    This submits an unlock request to the SAP Manager. Editing remains locked until approved.
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-150 pt-3">
                    <Button type="button" variant="outline" onClick={() => setActiveModal(null)} className="text-[10px] font-bold font-mono uppercase h-8">Cancel</Button>
                    <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold font-mono uppercase h-8 cursor-pointer">Submit Request</Button>
                  </div>
                </form>
              )}

            </div>

          </Card>
        </div>
      )}

    </div>
  );
};
