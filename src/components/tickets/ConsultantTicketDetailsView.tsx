'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Ticket, TicketStatus, SAPModule, Comment, Attachment, TicketHourEstimate, TicketClosureRequest, TicketConsultantEffort, TicketUnlockRequest } from '../../types/ticket';
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
  CornerDownRight,
  PlusCircle,
  Trash2,
  Briefcase,
  Lock,
  Unlock
} from 'lucide-react';
import Link from 'next/link';

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
    updateConsultantEfforts,
    requestUnlock
  } = useTickets();

  const ticket = tickets.find((t) => t.id === ticketId);
  const consultantName = user?.name || 'Karthik Subramanian';

  // UI States
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'quote' | 'revision' | 'closure' | 'resubmit_closure' | 'add_effort' | 'unlock' | null>(null);

  // General Status Dropdown
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>('');

  // Form states - Comment & Mentions
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

  // Validation / file upload states
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  // Form states - Estimate Quotation / Revision
  const [estFuncHours, setEstFuncHours] = useState('');
  const [estTechHours, setEstTechHours] = useState('');
  const [estRemarks, setEstRemarks] = useState('');

  // Form states - Closure Requests
  const [actFuncHours, setActFuncHours] = useState('');
  const [actTechHours, setActTechHours] = useState('');
  const [workCompletedSummary, setWorkCompletedSummary] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [pendingItems, setPendingItems] = useState('');

  // Form states - Consultant Efforts Breakdown
  const [newEffortName, setNewEffortName] = useState('Arun Kumar');
  const [newEffortType, setNewEffortType] = useState<'Functional' | 'Technical'>('Functional');
  const [newEffortEst, setNewEffortEst] = useState('');
  const [newEffortAct, setNewEffortAct] = useState('');
  const [newEffortRemarks, setNewEffortRemarks] = useState('');

  useEffect(() => {
    if (ticket) {
      setSelectedStatus(ticket.status);
    }
  }, [ticket]);

  if (!ticket) {
    return (
      <div className="p-8 text-center text-red-500 font-bold font-mono bg-zinc-50 border border-red-900 rounded-lg">
        ERROR: Ticket ID "{ticketId}" not found in database registry.
      </div>
    );
  }

  const effortsBreakdown = useMemo(() => {
    return ticket.consultantEfforts || [];
  }, [ticket.consultantEfforts]);

  const functionalConsultants = effortsBreakdown.filter(e => e.consultantType === 'Functional');
  const technicalConsultants = effortsBreakdown.filter(e => e.consultantType === 'Technical');

  const totalFunctionalEst = functionalConsultants.reduce((s, c) => s + c.estimatedHours, 0);
  const totalFunctionalAct = functionalConsultants.reduce((s, c) => s + c.actualHours, 0);
  const totalTechnicalEst = technicalConsultants.reduce((s, c) => s + c.estimatedHours, 0);
  const totalTechnicalAct = technicalConsultants.reduce((s, c) => s + c.actualHours, 0);

  const grandTotalEst = totalFunctionalEst + totalTechnicalEst;
  const grandTotalAct = totalFunctionalAct + totalTechnicalAct;

  // Age calculations
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

  const showBannerMessage = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  // Status transitions
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as TicketStatus;
    if (!newStatus || newStatus === ticket.status) return;

    updateTicketStatus(ticket.id, newStatus, consultantName);
    setSelectedStatus(newStatus);
    showBannerMessage(`Ticket workflow status updated to "${newStatus}".`);
  };

  // Add Comment with Mentions & Attachments
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    // Parse mentions: extract any @User and notify/register
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
    showBannerMessage(`Reply successfully logged to conversation${isInternalComment ? ' as Internal Note' : ''}.`);
  };

  // Mention Dropdown handlers
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
      
      // Refocus textarea
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

  // Comment Attachment Uploader Helper using Supabase Storage
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newFilesList = Array.from(files);

    for (const file of newFilesList) {
      const fileId = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      setUploadProgress(prev => ({ ...prev, [fileId]: 10 }));

      // Max size limit validation: 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} exceeds the maximum 10MB upload limit.`);
        continue;
      }

      // File extension validation
      const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.zip'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(fileExt)) {
        alert(`File extension "${fileExt}" is not supported. Supported formats: ${allowedExtensions.join(', ')}`);
        continue;
      }

      let fileUrl = '';
      if (isSupabaseConfigured && supabase) {
        try {
          const filePath = `tickets/${ticket.id}/comments/${fileId}/${file.name}`;
          setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));

          const { error: uploadError } = await supabase.storage
            .from('tickets')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

          if (uploadError) {
            console.error('Supabase storage upload failed:', uploadError);
            alert(`Upload failed for ${file.name}: ${uploadError.message}`);
            continue;
          }

          setUploadProgress(prev => ({ ...prev, [fileId]: 95 }));

          const { data: urlData } = supabase.storage
            .from('tickets')
            .getPublicUrl(filePath);

          fileUrl = urlData?.publicUrl || '';
          setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        } catch (err: any) {
          console.error('File upload exception:', err);
          alert(`File upload failed for ${file.name}`);
          continue;
        }
      } else {
        // Fallback simulated progress
        let progress = 10;
        const interval = setInterval(() => {
          progress += 30;
          if (progress >= 100) {
            clearInterval(interval);
            setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
          } else {
            setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
          }
        }, 150);

        await new Promise(resolve => setTimeout(resolve, 600));
        fileUrl = `/files/${file.name}`;
      }

      setCommentFiles(prev => [
        ...prev,
        {
          id: fileId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileUrl: fileUrl
        }
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
    showBannerMessage('Initial hours quote submitted successfully. Estimates are active.');
    setActiveModal(null);
  };

  const handleRevisionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estFuncHours || !estTechHours) return;

    requestEstimateRevision(ticket.id, {
      functionalEstimatedHours: Number(estFuncHours),
      technicalEstimatedHours: Number(estTechHours),
      remarks: estRemarks,
      submittedBy: consultantName
    });
    showBannerMessage('Estimate hours revision request logged and pending Manager approval.');
    setActiveModal(null);
  };

  const handleRaiseClosure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workCompletedSummary.trim() || !rootCause.trim() || !resolutionSummary.trim()) {
      setValidationError('Work completed summary, Root cause, and Resolution summary are required.');
      return;
    }

    const functionalExists = effortsBreakdown.some(e => e.consultantType === 'Functional');
    const technicalExists = effortsBreakdown.some(e => e.consultantType === 'Technical');

    const fHours = Number(actFuncHours) || 0;
    const tHours = Number(actTechHours) || 0;

    if (functionalExists && fHours <= 0) {
      setValidationError('Functional actual hours are required because a Functional consultant is assigned to this ticket.');
      return;
    }
    if (technicalExists && tHours <= 0) {
      setValidationError('Technical actual hours are required because a Technical consultant is assigned to this ticket.');
      return;
    }
    if (fHours === 0 && tHours === 0) {
      setValidationError('At least one actual hour value must be greater than 0.');
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
    showBannerMessage('Closure request with actual hours submitted to Manager.');
    setActiveModal(null);
  };

  const handleResubmitClosure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workCompletedSummary.trim() || !rootCause.trim() || !resolutionSummary.trim()) {
      setValidationError('Work completed summary, Root cause, and Resolution summary are required.');
      return;
    }

    const latestCls = ticket.closureRequests?.[ticket.closureRequests.length - 1];
    if (!latestCls) return;

    const functionalExists = effortsBreakdown.some(e => e.consultantType === 'Functional');
    const technicalExists = effortsBreakdown.some(e => e.consultantType === 'Technical');

    const fHours = Number(actFuncHours) || 0;
    const tHours = Number(actTechHours) || 0;

    if (functionalExists && fHours <= 0) {
      setValidationError('Revised Functional actual hours are required because a Functional consultant is assigned to this ticket.');
      return;
    }
    if (technicalExists && tHours <= 0) {
      setValidationError('Revised Technical actual hours are required because a Technical consultant is assigned to this ticket.');
      return;
    }
    if (fHours === 0 && tHours === 0) {
      setValidationError('At least one actual hour value must be greater than 0.');
      return;
    }

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
    showBannerMessage('Closure request has been resubmitted to manager.');
    setActiveModal(null);
  };

  const handleRequestUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockReason.trim() || !unlockChange.trim()) {
      setValidationError('Unlock reason and What needs to be changed are required.');
      return;
    }
    setValidationError(null);
    requestUnlock(ticket.id, {
      reason: unlockReason,
      requestedChange: unlockChange,
      remarks: unlockRemarks || undefined,
      requestedBy: consultantName
    });
    showBannerMessage('Manager unlock/change request has been submitted.');
    setActiveModal(null);
  };

  const handleAddConsultantEffort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEffortName || !newEffortEst || !newEffortAct) return;

    const newEff: TicketConsultantEffort = {
      id: `eff-${Date.now()}`,
      ticketId: ticket.id,
      consultantId: newEffortName.toLowerCase().replace(/ /g, '_'),
      consultantName: newEffortName,
      consultantType: newEffortType,
      estimatedHours: Number(newEffortEst),
      actualHours: Number(newEffortAct),
      remarks: newEffortRemarks || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    updateConsultantEfforts(ticket.id, [...effortsBreakdown, newEff]);
    showBannerMessage(`Consultant effort for ${newEffortName} added successfully.`);
    
    // reset
    setNewEffortEst('');
    setNewEffortAct('');
    setNewEffortRemarks('');
    setActiveModal(null);
  };

  const deleteConsultantEffort = (id: string) => {
    const list = effortsBreakdown.filter(e => e.id !== id);
    updateConsultantEfforts(ticket.id, list);
    showBannerMessage('Consultant effort record deleted.');
  };

  // Latest Estimates & Closure Request details
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
  const isLocked = ticket.status === 'Closed' || (ticket.status === 'Request for Closure' && latestClosureReq?.status === 'Pending Manager Approval');

  return (
    <div className="space-y-6 font-sans bg-zinc-50 text-zinc-950 min-h-screen p-6 md:p-8">
      
      {/* Top Header / Navigation panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <Link href="/consultant/my-tickets" className="p-1.5 border border-zinc-200 bg-white rounded-md text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 transition">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base font-bold text-zinc-900 bg-white px-2 py-0.5 border border-zinc-200 rounded">{ticket.id}</span>
              <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-300 rounded text-[10px] font-mono font-bold uppercase">{ticket.ticketType || 'Incident'}</span>
              <SlaBadge ticket={ticket} />
              <span className="text-[10px] bg-white border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded font-mono font-bold">Age: {ageDays} days</span>
            </div>
            <h1 className="text-xl font-bold text-zinc-900 mt-1.5">{ticket.title}</h1>
          </div>
        </div>
      </div>

      {/* Success banner */}
      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-center gap-2 text-xs font-semibold animate-slide-in">
          <CheckCircle size={15} />
          {successBanner}
        </div>
      )}

      {/* Locked state banner */}
      {isLocked && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-semibold animate-slide-in">
          <div className="flex items-start gap-2.5">
            <Lock size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px]">Security / Access Lock Enforced</p>
              <p className="mt-1 leading-normal text-red-600 font-mono">
                This ticket is locked because a closure request has been submitted and is pending manager approval.
                You cannot update this ticket until the manager approves an unlock/change request.
              </p>
            </div>
          </div>
          {hasPendingUnlock ? (
            <span className="px-3.5 py-2 bg-amber-100 text-amber-800 rounded font-mono font-bold text-[10px] border border-amber-200 uppercase">
              Unlock Request Pending
            </span>
          ) : (
            ticket.status !== 'Closed' && (
              <button
                onClick={() => {
                  setUnlockReason('');
                  setUnlockChange('');
                  setUnlockRemarks('');
                  setValidationError(null);
                  setActiveModal('unlock');
                }}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-mono font-bold uppercase text-[10px] whitespace-nowrap shadow transition"
              >
                Request Manager Unlock / Change Request
              </button>
            )
          )}
        </div>
      )}

      {/* Detail Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left main content columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Requirement Details */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-mono font-bold text-zinc-600 uppercase tracking-widest border-b border-zinc-200 pb-2 flex items-center gap-2">
              <Briefcase size={14} className="text-zinc-500" />
              Requirement Details
            </h3>
            <div className="text-sm text-zinc-700 whitespace-pre-line leading-relaxed pt-1">
              {ticket.description}
            </div>
          </div>

          {/* Section 2: Estimated Hours quotation */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <h3 className="text-xs font-mono font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                <Clock size={14} className="text-zinc-500" />
                Resource Estimates (Quotation)
              </h3>
              
              {!currentEstimate ? (
                <button
                  disabled={isLocked}
                  onClick={() => {
                    setEstFuncHours('');
                    setEstTechHours('');
                    setEstRemarks('');
                    setActiveModal('quote');
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 rounded text-[10px] font-bold uppercase transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Quote Estimated Hours
                </button>
              ) : (
                <button
                  disabled={isLocked}
                  onClick={() => {
                    setEstFuncHours(currentEstimate.functionalEstimatedHours.toString());
                    setEstTechHours(currentEstimate.technicalEstimatedHours.toString());
                    setEstRemarks('');
                    setActiveModal('revision');
                  }}
                  className="px-3 py-1 bg-zinc-150 hover:bg-zinc-200 text-zinc-900 rounded text-[10px] font-bold uppercase transition border border-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Raise Estimate Revision
                </button>
              )}
            </div>

            {currentEstimate ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-zinc-50 p-3 border border-zinc-200 rounded">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Functional Hours</span>
                    <span className="text-lg font-bold text-zinc-900 mt-1 block">{currentEstimate.functionalEstimatedHours} hrs</span>
                  </div>
                  <div className="bg-zinc-50 p-3 border border-zinc-200 rounded">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Technical Hours</span>
                    <span className="text-lg font-bold text-zinc-900 mt-1 block">{currentEstimate.technicalEstimatedHours} hrs</span>
                  </div>
                  <div className="bg-zinc-50 p-3 border border-zinc-200 rounded border-l-2 border-l-emerald-500">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Total Estimated</span>
                    <span className="text-lg font-bold text-emerald-400 mt-1 block">{currentEstimate.totalEstimatedHours} hrs</span>
                  </div>
                </div>

                <div className="bg-zinc-50 p-3 border border-zinc-200 rounded text-xs space-y-1.5 text-zinc-600">
                  <div>Remarks: <span className="text-zinc-900 font-mono italic">"{currentEstimate.remarks || 'No remarks provided'}"</span></div>
                  <div className="flex justify-between text-[10px] pt-1 text-zinc-500 border-t border-zinc-200/50">
                    <span>Submitted by: <strong className="text-zinc-700">{currentEstimate.consultantId}</strong></span>
                    <span>Date: <strong>{new Date(currentEstimate.submittedAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-zinc-200 bg-zinc-50/40 rounded text-xs text-zinc-500 italic">
                No hours estimated or quoted yet. Please submit the first-time quotation.
              </div>
            )}

            {/* Revision Request Monitor */}
            {currentRevisionReq && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded text-xs text-amber-800 space-y-1.5">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle size={13} className="text-amber-600" />
                  Pending Estimate Revision Request
                </div>
                <div>Proposed Hours: <strong>{currentRevisionReq.totalEstimatedHours} hrs</strong> (Func: {currentRevisionReq.functionalEstimatedHours}h, Tech: {currentRevisionReq.technicalEstimatedHours}h)</div>
                <div className="italic">Justification: "{currentRevisionReq.remarks}"</div>
              </div>
            )}
          </div>

          {/* Section 3: Actual Hours & Closure requests */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <h3 className="text-xs font-mono font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle size={14} className="text-zinc-500" />
                Actual Hours & Closure Requests
              </h3>
              
              {ticket.status !== 'Closed' && ticket.status !== 'Request for Closure' && (
                <button
                  onClick={() => {
                    setActFuncHours(totalFunctionalEst.toString());
                    setActTechHours(totalTechnicalEst.toString());
                    setWorkCompletedSummary('');
                    setRootCause('');
                    setResolutionSummary('');
                    setPendingItems('');
                    setActiveModal('closure');
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 rounded text-[10px] font-bold uppercase transition"
                >
                  Raise Closure Request
                </button>
              )}
            </div>

            {latestClosureReq ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-zinc-50 p-3 border border-zinc-200 rounded">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Actual Functional</span>
                    <span className="text-lg font-bold text-zinc-900 mt-1 block">{latestClosureReq.functionalActualHours} hrs</span>
                  </div>
                  <div className="bg-zinc-50 p-3 border border-zinc-200 rounded">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Actual Technical</span>
                    <span className="text-lg font-bold text-zinc-900 mt-1 block">{latestClosureReq.technicalActualHours} hrs</span>
                  </div>
                  <div className="bg-zinc-50 p-3 border border-zinc-200 rounded border-l-2 border-l-emerald-500">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Total Actual</span>
                    <span className="text-lg font-bold text-emerald-400 mt-1 block">{latestClosureReq.totalActualHours} hrs</span>
                  </div>
                </div>

                <div className="bg-zinc-50 p-4 border border-zinc-200 rounded text-xs space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-zinc-350">
                    <div>
                      <span className="font-bold text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">Work Completed Summary</span>
                      <p className="font-mono text-zinc-900">{latestClosureReq.workCompletedSummary}</p>
                    </div>
                    <div>
                      <span className="font-bold text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">Root Cause</span>
                      <p className="font-mono text-red-400">{latestClosureReq.rootCause}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-bold text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">Resolution Summary</span>
                      <p className="font-mono text-zinc-900">{latestClosureReq.resolutionSummary}</p>
                    </div>
                    {latestClosureReq.pendingItems && (
                      <div className="md:col-span-2">
                        <span className="font-bold text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">Pending Items</span>
                        <p className="font-mono text-amber-400">{latestClosureReq.pendingItems}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-2 text-zinc-500 border-t border-zinc-200/50">
                    <span>Requested by: <strong className="text-zinc-700">{latestClosureReq.requestedBy}</strong></span>
                    <div className="flex gap-2 items-center">
                      <span>Closure Status: </span>
                      <span className={`px-2 py-0.5 rounded border font-mono font-bold uppercase text-[9px] ${
                        latestClosureReq.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        latestClosureReq.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>{latestClosureReq.status}</span>
                    </div>
                  </div>

                  {latestClosureReq.status === 'Rejected' && (
                    <div className="bg-red-50 p-3 rounded border border-red-200 space-y-2 mt-2">
                      <div className="text-red-700 font-bold text-[10px] uppercase font-mono">Manager Rejection Reason:</div>
                      <p className="text-zinc-900 italic">"{latestClosureReq.rejectionReason || 'No reason listed'}"</p>
                      <button
                        onClick={() => {
                          setActFuncHours(latestClosureReq.functionalActualHours.toString());
                          setActTechHours(latestClosureReq.technicalActualHours.toString());
                          setWorkCompletedSummary(latestClosureReq.workCompletedSummary);
                          setRootCause(latestClosureReq.rootCause);
                          setResolutionSummary(latestClosureReq.resolutionSummary);
                          setPendingItems(latestClosureReq.pendingItems || '');
                          setActiveModal('resubmit_closure');
                        }}
                        className="px-3 py-1.5 bg-red-650 hover:bg-red-750 text-zinc-900 rounded font-bold uppercase text-[9px] transition"
                      >
                        Resubmit Closure Request
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-zinc-200 bg-zinc-50/40 rounded text-xs text-zinc-500 italic">
                No closure requests submitted.
              </div>
            )}
          </div>

          {/* Section 4: Effort Breakdowns (Functional & Technical) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Functional breakdown */}
            <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                  <Users size={14} className="text-zinc-500" />
                  Functional effort breakdown
                </span>
                
                <button
                  disabled={isLocked}
                  onClick={() => {
                    setNewEffortName('Arun Kumar');
                    setNewEffortType('Functional');
                    setNewEffortEst('');
                    setNewEffortAct('');
                    setNewEffortRemarks('');
                    setActiveModal('add_effort');
                  }}
                  className="text-zinc-600 hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add Consultant"
                >
                  <PlusCircle size={15} />
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {functionalConsultants.map(c => (
                  <div key={c.id} className="p-2.5 bg-zinc-50 rounded border border-zinc-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-zinc-900">{c.consultantName}</span>
                      <button
                        disabled={isLocked}
                        onClick={() => deleteConsultantEffort(c.id)}
                        className="text-zinc-655 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                      <span>Estimated: <strong>{c.estimatedHours} hrs</strong></span>
                      <span>Actual: <strong className="text-emerald-400">{c.actualHours} hrs</strong></span>
                    </div>
                    {c.remarks && <p className="text-[10px] text-zinc-500 italic mt-0.5">"{c.remarks}"</p>}
                  </div>
                ))}
                {functionalConsultants.length === 0 && (
                  <p className="italic text-zinc-500 py-6 text-center text-xs">No functional consultants defined.</p>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-200/60 flex justify-between font-mono text-[10px] text-zinc-600">
                <span>Total Functional Est: <strong>{totalFunctionalEst}h</strong></span>
                <span>Total Actual: <strong className="text-emerald-400">{totalFunctionalAct}h</strong></span>
              </div>
            </div>

            {/* Technical breakdown */}
            <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                  <Users size={14} className="text-zinc-500" />
                  Technical effort breakdown
                </span>
                
                <button
                  disabled={isLocked}
                  onClick={() => {
                    setNewEffortName('Rahim');
                    setNewEffortType('Technical');
                    setNewEffortEst('');
                    setNewEffortAct('');
                    setNewEffortRemarks('');
                    setActiveModal('add_effort');
                  }}
                  className="text-zinc-600 hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add Consultant"
                >
                  <PlusCircle size={15} />
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {technicalConsultants.map(c => (
                  <div key={c.id} className="p-2.5 bg-zinc-50 rounded border border-zinc-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-zinc-900">{c.consultantName}</span>
                      <button
                        disabled={isLocked}
                        onClick={() => deleteConsultantEffort(c.id)}
                        className="text-zinc-655 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                      <span>Estimated: <strong>{c.estimatedHours} hrs</strong></span>
                      <span>Actual: <strong className="text-emerald-400">{c.actualHours} hrs</strong></span>
                    </div>
                    {c.remarks && <p className="text-[10px] text-zinc-500 italic mt-0.5">"{c.remarks}"</p>}
                  </div>
                ))}
                {technicalConsultants.length === 0 && (
                  <p className="italic text-zinc-500 py-6 text-center text-xs">No technical consultants defined.</p>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-200/60 flex justify-between font-mono text-[10px] text-zinc-600">
                <span>Total Technical Est: <strong>{totalTechnicalEst}h</strong></span>
                <span>Total Actual: <strong className="text-emerald-400">{totalTechnicalAct}h</strong></span>
              </div>
            </div>

          </div>

          {/* Effort Summary Box */}
          <div className="bg-white border border-zinc-200 rounded-lg p-4 flex justify-between items-center text-xs font-mono">
            <span className="font-bold text-zinc-600">GRAND EFFORT TOTALS</span>
            <div className="space-x-6">
              <span>Estimated Budget: <strong className="text-zinc-900">{grandTotalEst} hrs</strong></span>
              <span>Actual Invoiced: <strong className="text-emerald-400">{grandTotalAct} hrs</strong></span>
            </div>
          </div>

          {/* Section 5: Conversations Feeds */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-600">
                Incidents Communication Channel
              </h3>
              
              {/* Note toggle */}
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase ${!isInternalComment ? 'text-zinc-900 font-black' : 'text-zinc-500'}`}>Public</span>
                <button
                  type="button"
                  onClick={() => setIsInternalComment(!isInternalComment)}
                  className="w-8 h-4 rounded-full bg-zinc-100 border border-zinc-300 relative transition-all"
                >
                  <span className={`w-3.5 h-3.5 rounded-full absolute top-0 transition-all ${isInternalComment ? 'left-4 bg-red-500' : 'left-0 bg-zinc-500'}`}></span>
                </button>
                <span className={`text-[10px] font-bold uppercase ${isInternalComment ? 'text-red-500 font-black' : 'text-zinc-500'}`}>Internal Note</span>
              </div>
            </div>

            {/* Comment Composer */}
            <form onSubmit={handleAddComment} className="space-y-4 bg-zinc-50 p-4 border border-zinc-200 rounded-lg relative">
              <div className="relative">
                <textarea
                  disabled={isLocked}
                  ref={textareaRef}
                  value={commentText}
                  onChange={handleTextareaChange}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder={isLocked ? "This conversation channel is locked while a closure request is pending manager review." : (isInternalComment ? "Write internal log (visible only to Consultants & Managers)..." : "Reply to Customer (supports @mentions)...")}
                  className="w-full bg-white border border-zinc-200 rounded p-3 text-xs h-28 focus:outline-none focus:border-zinc-300 text-zinc-950 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />

                {/* Autocomplete mention dropdown */}
                {showMentionDropdown && filteredMentions.length > 0 && !isLocked && (
                  <div className="absolute left-0 bottom-full mb-1 z-50 bg-white border border-zinc-200 rounded-md shadow-2xl w-60 py-1 text-xs text-zinc-700">
                    <div className="px-3 py-1 text-[9px] uppercase tracking-wider font-bold text-zinc-500 border-b border-zinc-200">
                      Mention User
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-zinc-850">
                      {filteredMentions.map((u, i) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => insertMention(u.name)}
                          className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-zinc-100 transition ${
                            i === mentionIndex ? 'bg-zinc-100 text-zinc-900' : ''
                          }`}
                        >
                          <span className="font-bold">{u.name}</span>
                          <span className="text-[9px] text-zinc-500">{u.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Previews & Progress */}
              {commentFiles.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-200/50">
                  {commentFiles.map((file, i) => {
                    const prog = uploadProgress[file.id] || 100;
                    return (
                      <div key={file.id || i} className="flex flex-col gap-1 bg-white border border-zinc-200 rounded p-2 text-[10px] text-zinc-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Paperclip size={10} className="text-zinc-500 shrink-0" />
                            <span className="truncate font-semibold">{file.fileName}</span>
                            <span className="text-zinc-400 font-mono">({Math.round(file.fileSize / 1024)} KB)</span>
                          </div>
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => removeAttachmentFromComment(i)}
                            className="text-zinc-500 hover:text-red-400 disabled:opacity-30"
                          >
                            <X size={10} />
                          </button>
                        </div>
                        {prog < 100 && (
                          <div className="w-full bg-zinc-100 rounded-full h-1 mt-1 overflow-hidden">
                            <div className="bg-blue-600 h-full transition-all" style={{ width: `${prog}%` }}></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-200/50">
                <div className="flex items-center gap-2">
                  <label className={`cursor-pointer p-1.5 hover:bg-zinc-100 border border-zinc-200 rounded text-zinc-700 transition flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase ${
                    isLocked || isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
                    <Paperclip size={12} />
                    <span>Choose File</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isLocked || isUploading}
                    />
                  </label>
                  {isUploading && (
                    <span className="text-[10px] font-mono text-zinc-500 animate-pulse">Uploading file...</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLocked}
                  className="px-4 py-2 bg-white hover:bg-zinc-200 text-zinc-950 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={11} />
                  Send comment
                </button>
              </div>
            </form>

            {/* Conversation Timeline */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {(ticket.comments || []).map(c => (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                    c.isInternal
                      ? 'bg-red-50 border-red-200 border-dashed'
                      : 'bg-white/40 border-zinc-200 shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-zinc-500" />
                      <span className="font-bold text-zinc-900">{c.authorName}</span>
                      <span className={`px-1.5 rounded border uppercase font-bold text-[8px] ${
                        c.isInternal ? 'bg-red-50 text-red-700 border-red-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                      }`}>
                        {c.isInternal ? 'Internal Note' : c.authorRole}
                      </span>
                    </div>
                    <span className="text-zinc-500 font-mono">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>

                  <p className="text-zinc-700 leading-relaxed font-mono whitespace-pre-wrap">{c.content}</p>

                  {/* Render attachments directly in comment bubbles */}
                  {c.attachments && c.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200/50">
                      {c.attachments.map((file, i) => (
                        <a
                          key={i}
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded text-[9px] text-zinc-600 font-mono transition"
                        >
                          <Paperclip size={10} className="text-zinc-500" />
                          <span>{file.fileName}</span>
                          <span className="text-[8px] text-zinc-600">({Math.round(file.fileSize / 1024)} KB)</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Audit History */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm">
            <TicketTimeline ticket={ticket} />
          </div>

        </div>

        {/* Right metadata columns */}
        <div className="space-y-6">
          
          {/* Section 7: Ticket Controls */}
          <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm space-y-4">
            <span className="font-bold text-[10px] text-zinc-600 uppercase tracking-widest block border-b border-zinc-200 pb-2 font-mono">Incident State Controls</span>
            
            <div className="space-y-2">
              <label className="font-bold text-zinc-500 uppercase text-[9px] block">Workflow Status</label>
              <select
                disabled={isLocked}
                value={selectedStatus}
                onChange={handleStatusChange}
                className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 font-mono focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="space-y-1.5 text-[11px] text-zinc-600 border-t border-zinc-200/60 pt-3">
              <div>SAP Modules: <span className="px-1.5 py-0.2 bg-zinc-50 border border-zinc-200 rounded text-zinc-700 font-mono">{ticket.sapModule}</span></div>
              <div className="pt-1">Priority: <span className="font-bold text-zinc-900">{ticket.priority}</span></div>
              <div className="pt-1">Classification: <span className="font-bold text-zinc-900">{ticket.functionalOrTechnical || 'Functional'}</span></div>
            </div>
          </div>

          {/* Section 8: Customer Info */}
          <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm space-y-3">
            <span className="font-bold text-[10px] text-zinc-600 uppercase tracking-widest block border-b border-zinc-200 pb-2 font-mono">Customer Profile</span>
            <div className="space-y-2.5 text-[11px] text-zinc-600">
              <div className="flex items-center gap-1.5 text-zinc-900 font-bold text-sm">
                <Building2 size={13} className="text-zinc-500" />
                {ticket.organization}
              </div>
              <div className="space-y-1 pt-1 font-mono text-[10px]">
                <div>Requester: <b className="text-zinc-900">{ticket.createdByName || ticket.requestedBy}</b></div>
                <div>Email: <b className="text-zinc-900">{ticket.requestedByEmail || 'customer@sap.com'}</b></div>
                <div>Created: <b>{new Date(ticket.createdAt).toLocaleString()}</b></div>
                <div>Last Updated: <b>{new Date(ticket.updatedAt).toLocaleString()}</b></div>
              </div>
            </div>
          </div>

          {/* Section 9: Manager Approval Status */}
          <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm space-y-3">
            <span className="font-bold text-[10px] text-zinc-600 uppercase tracking-widest block border-b border-zinc-200 pb-2 font-mono">Workflow Approvals Status</span>
            
            <div className="space-y-3 text-[11px]">
              
              {/* Estimates revision approvals log */}
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">Estimates revisions approvals</span>
                {(ticket.hourEstimates || []).length === 0 ? (
                  <span className="text-zinc-500 italic block mt-1">No revision requests logged.</span>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    {(ticket.hourEstimates || []).map((est, i) => (
                      <div key={i} className="p-2 bg-zinc-50 border border-zinc-200 rounded space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>{est.totalEstimatedHours} hrs</span>
                          <span className={
                            est.status === 'Revision Approved' ? 'text-emerald-400' :
                            est.status === 'Revision Rejected' ? 'text-red-400' :
                            'text-amber-400'
                          }>{est.status}</span>
                        </div>
                        {est.remarks && <div className="text-[10px] text-zinc-500 truncate">"{est.remarks}"</div>}
                        {est.rejectionReason && <div className="text-[9px] text-red-500">Rejection: {est.rejectionReason}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Closure request approvals log */}
              <div className="pt-2 border-t border-zinc-200/60">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">Closure approvals</span>
                {(ticket.closureRequests || []).length === 0 ? (
                  <span className="text-zinc-500 italic block mt-1">No closure requests logged.</span>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    {(ticket.closureRequests || []).map((req, i) => (
                      <div key={i} className="p-2 bg-zinc-50 border border-zinc-200 rounded space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>{req.totalActualHours} hrs</span>
                          <span className={
                            req.status === 'Approved' ? 'text-emerald-400' :
                            req.status === 'Rejected' ? 'text-red-400' :
                            'text-amber-400'
                          }>{req.status}</span>
                        </div>
                        {req.rejectionReason && <div className="text-[9px] text-red-500">Rejection: {req.rejectionReason}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unlock requests log */}
              <div className="pt-2 border-t border-zinc-200/60">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">Unlock Requests</span>
                {(ticket.unlockRequests || []).length === 0 ? (
                  <span className="text-zinc-500 italic block mt-1">No unlock requests logged.</span>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    {(ticket.unlockRequests || []).map((req, i) => (
                      <div key={i} className="p-2 bg-zinc-50 border border-zinc-200 rounded space-y-1">
                        <div className="flex justify-between font-bold">
                          <span className="truncate max-w-[120px]">{req.reason}</span>
                          <span className={
                            req.status === 'Approved' ? 'text-emerald-500' :
                            req.status === 'Rejected' ? 'text-red-500' :
                            'text-amber-500'
                          }>{req.status}</span>
                        </div>
                        {req.rejectionReason && <div className="text-[9px] text-red-500">Rejection: {req.rejectionReason}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Section 10: Attachments */}
          <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm space-y-4">
            <span className="font-bold text-[10px] text-zinc-600 uppercase tracking-widest block border-b border-zinc-200 pb-2 font-mono">Attachments registry</span>
            
            <div className="space-y-3">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase font-mono block">Public Customer Visible</span>
                <div className="space-y-1.5 mt-1.5">
                  {(ticket.attachments || []).filter(a => a.visibility !== 'internal').map((a, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-zinc-50 border border-zinc-200 rounded text-[10px]">
                      <span className="font-bold text-zinc-700 truncate max-w-[150px]">{a.fileName}</span>
                      <span className="text-zinc-500">{a.fileSize ? `${(a.fileSize/1024).toFixed(0)} KB` : '150 KB'}</span>
                    </div>
                  ))}
                  {(ticket.attachments || []).filter(a => a.visibility !== 'internal').length === 0 && (
                    <span className="text-zinc-650 italic text-[10px] block">No public attachments.</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[9px] text-red-400 uppercase font-mono block">Internal Notes Attachments</span>
                <div className="space-y-1.5 mt-1.5">
                  {(ticket.attachments || []).filter(a => a.visibility === 'internal').map((a, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-zinc-50 border border-zinc-200 rounded text-[10px]">
                      <span className="font-bold text-red-400 truncate max-w-[150px]">{a.fileName}</span>
                      <span className="text-zinc-500">{a.fileSize ? `${(a.fileSize/1024).toFixed(0)} KB` : '150 KB'}</span>
                    </div>
                  ))}
                  {(ticket.attachments || []).filter(a => a.visibility === 'internal').length === 0 && (
                    <span className="text-zinc-650 italic text-[10px] block">No internal attachments.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* DIALOG MODALS SECTION */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in text-zinc-900">
            
            {/* Header */}
            <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex justify-between items-center font-bold uppercase text-[10px] tracking-wide text-zinc-900">
              <span>
                {activeModal === 'quote' && 'Quote Estimated Hours'}
                {activeModal === 'revision' && 'Request Estimates Revision'}
                {activeModal === 'closure' && 'Raise Closure Request'}
                {activeModal === 'resubmit_closure' && 'Resubmit Closure Request'}
                {activeModal === 'add_effort' && 'Add Consultant to Breakdown'}
                {activeModal === 'unlock' && 'Request Manager Unlock / Change Request'}
              </span>
              <button onClick={() => setActiveModal(null)} className="p-1 hover:bg-zinc-100 rounded text-zinc-600 hover:text-zinc-900">
                <X size={14} />
              </button>
            </div>

            {/* Form wrappers */}
            <div className="p-5 max-h-[75vh] overflow-y-auto">
              
              {validationError && (
                <div className="mb-4 p-3 bg-red-55 text-red-700 rounded text-xs font-mono font-bold flex items-center gap-2 border border-red-200">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
              
              {/* QUOTE HOURS */}
              {activeModal === 'quote' && (
                <form onSubmit={handleQuoteHours} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">Functional Estimated Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 15"
                        value={estFuncHours}
                        onChange={(e) => setEstFuncHours(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                        min="0"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">Technical Estimated Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 20"
                        value={estTechHours}
                        onChange={(e) => setEstTechHours(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-600 uppercase text-[9px]">Remarks</label>
                    <textarea
                      value={estRemarks}
                      onChange={(e) => setEstRemarks(e.target.value)}
                      placeholder="Add estimation remarks..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-24 focus:outline-none"
                    />
                  </div>

                  <div className="text-[10px] text-zinc-500 font-mono">
                    Initial estimates do not require manager approvals. They will activate immediately.
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                    <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Submit Quote</button>
                  </div>
                </form>
              )}

              {/* REVISION REQUEST */}
              {activeModal === 'revision' && (
                <form onSubmit={handleRevisionRequest} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">New Functional Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 15"
                        value={estFuncHours}
                        onChange={(e) => setEstFuncHours(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                        min="0"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">New Technical Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 25"
                        value={estTechHours}
                        onChange={(e) => setEstTechHours(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-600 uppercase text-[9px]">Remarks / Justification</label>
                    <textarea
                      value={estRemarks}
                      onChange={(e) => setEstRemarks(e.target.value)}
                      placeholder="Detail why hours need to be revised..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-24 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="text-[10px] text-amber-500 font-bold">
                    Revisions require Manager approval before they update.
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                    <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Submit Revision Request</button>
                  </div>
                </form>
              )}

              {/* RAISE CLOSURE REQUEST */}
              {activeModal === 'closure' && (
                <form onSubmit={handleRaiseClosure} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">Functional Actual Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        value={actFuncHours}
                        onChange={(e) => setActFuncHours(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                        min="0"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">Technical Actual Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        value={actTechHours}
                        onChange={(e) => setActTechHours(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-450 uppercase text-[9px]">Work Completed Summary</label>
                    <textarea
                      value={workCompletedSummary}
                      onChange={(e) => setWorkCompletedSummary(e.target.value)}
                      placeholder="Outline final tasks completed..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-16 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-red-400 uppercase text-[9px]">Root Cause (Mandatory)</label>
                    <textarea
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      placeholder="Detail root cause..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-16 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-red-400 uppercase text-[9px]">Resolution Summary (Mandatory)</label>
                    <textarea
                      value={resolutionSummary}
                      onChange={(e) => setResolutionSummary(e.target.value)}
                      placeholder="Detail resolution steps..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-16 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-450 uppercase text-[9px]">Pending Items (If any)</label>
                    <input
                      type="text"
                      value={pendingItems}
                      onChange={(e) => setPendingItems(e.target.value)}
                      placeholder="e.g. transport import to production"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                    />
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                    <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Submit Closure Request</button>
                  </div>
                </form>
              )}

              {/* RESUBMIT CLOSURE */}
              {activeModal === 'resubmit_closure' && (
                <form onSubmit={handleResubmitClosure} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">Revised Functional Actual Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        value={actFuncHours}
                        onChange={(e) => setActFuncHours(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                        min="0"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">Revised Technical Actual Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        value={actTechHours}
                        onChange={(e) => setActTechHours(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-450 uppercase text-[9px]">Work Completed Summary</label>
                    <textarea
                      value={workCompletedSummary}
                      onChange={(e) => setWorkCompletedSummary(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-16 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-red-400 uppercase text-[9px]">Root Cause</label>
                    <textarea
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-16 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-red-400 uppercase text-[9px]">Resolution Summary</label>
                    <textarea
                      value={resolutionSummary}
                      onChange={(e) => setResolutionSummary(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-16 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-450 uppercase text-[9px]">Pending Items</label>
                    <input
                      type="text"
                      value={pendingItems}
                      onChange={(e) => setPendingItems(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                    />
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                    <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Resubmit Request</button>
                  </div>
                </form>
              )}

              {/* ADD CONSULTANT EFFORT */}
              {activeModal === 'add_effort' && (
                <form onSubmit={handleAddConsultantEffort} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">Consultant Name</label>
                      <select
                        value={newEffortName}
                        onChange={(e) => setNewEffortName(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                      >
                        {MOCK_MENTIONABLE_USERS.filter(u => u.role.includes('Consultant')).map(u => (
                          <option key={u.id} value={u.name}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">Classification Type</label>
                      <select
                        value={newEffortType}
                        onChange={(e) => setNewEffortType(e.target.value as 'Functional' | 'Technical')}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                      >
                        <option value="Functional">Functional</option>
                        <option value="Technical">Technical</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">Estimated Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 8"
                        value={newEffortEst}
                        onChange={(e) => setNewEffortEst(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                        min="0"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">Actual Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 6"
                        value={newEffortAct}
                        onChange={(e) => setNewEffortAct(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-600 uppercase text-[9px]">Activity remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. customized reports..."
                      value={newEffortRemarks}
                      onChange={(e) => setNewEffortRemarks(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                    />
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                    <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Add Effort</button>
                  </div>
                </form>
              )}

              {/* REQUEST UNLOCK */}
              {activeModal === 'unlock' && (
                <form onSubmit={handleRequestUnlock} className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-650 uppercase text-[9px] block">Reason for Unlock (Mandatory)</label>
                    <input
                      type="text"
                      placeholder="e.g. Need to revise estimated hours"
                      value={unlockReason}
                      onChange={(e) => setUnlockReason(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-650 uppercase text-[9px] block">What needs to be changed (Mandatory)</label>
                    <textarea
                      placeholder="Specify exactly what changes are required..."
                      value={unlockChange}
                      onChange={(e) => setUnlockChange(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-24 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-650 uppercase text-[9px] block">Additional Remarks</label>
                    <textarea
                      placeholder="Any additional remarks..."
                      value={unlockRemarks}
                      onChange={(e) => setUnlockRemarks(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-16 focus:outline-none"
                    />
                  </div>

                  <div className="text-[10px] text-amber-500 font-bold font-mono">
                    This will send an unlock request to the SAP Manager. Editing will remain locked until approved.
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                    <button type="button" onClick={() => setActiveModal(null)} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Submit Request</button>
                  </div>
                </form>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
