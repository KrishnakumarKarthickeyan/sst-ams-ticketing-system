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

const MOCK_MENTIONABLE_USERS: any[] = [];

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
  const consultantName = user?.name || 'Unassigned';
  const consultantType = user?.consultantType || 'Functional';

  const [dbMentionableUsers, setDbMentionableUsers] = useState<any[]>([]);
  const MOCK_MENTIONABLE_USERS = dbMentionableUsers;

  useEffect(() => {
    const fetchDbMentionableUsers = async () => {
      const { isSupabaseConfigured, supabase } = await import('../../lib/supabase/client');
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, consultant_type, sap_modules, role_title, phone_number');
        if (!error && data) {
          setDbMentionableUsers(data.map(p => ({
            id: p.email,
            name: p.full_name,
            role: p.role,
            consultantType: p.consultant_type,
            sapModules: p.sap_modules,
            roleTitle: p.role_title,
            phoneNumber: p.phone_number
          })));
        }
      }
    };
    fetchDbMentionableUsers();
  }, []);

  // UI States
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'quote' | 'revision' | 'closure' | 'resubmit_closure' | 'unlock' | null>(null);

  // Status Dropdown State
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>('');

  // Comment & Mentions States
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [commentFiles, setCommentFiles] = useState<Array<{ id: string; fileName: string; fileSize: number; fileType: string; fileUrl: string; progress: number; isUploading: boolean }>>([]);
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

  const filteredMentions = useMemo(() => {
    if (!ticket) return [];
    const assignedNames = new Set((ticket.consultantEfforts || []).map(e => e.consultantName));
    if (ticket.assignedConsultant) {
      assignedNames.add(ticket.assignedConsultant);
    }
    return MOCK_MENTIONABLE_USERS.filter(u => {
      const isAssigned = assignedNames.has(u.name) || 
                         (ticket.assignedManager && u.name === ticket.assignedManager) ||
                         u.role === 'Manager' || 
                         u.role === 'SuperAdmin';
      return isAssigned && u.name.toLowerCase().includes(mentionSearch.toLowerCase());
    });
  }, [mentionSearch, MOCK_MENTIONABLE_USERS, ticket]);

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

  // filteredMentions moved above early return to preserve Hook order

  // Highlight mentions in comment strings
  const renderCommentContent = (content: string) => {
    if (!content) return '';
    const sortedUsers = [...MOCK_MENTIONABLE_USERS].sort((a, b) => b.name.length - a.name.length);
    const parts: React.ReactNode[] = [];
    
    if (sortedUsers.length > 0) {
      const namesPattern = sortedUsers.map(u => u.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const regex = new RegExp(`@(${namesPattern})`, 'g');
      
      let match;
      let lastIndex = 0;
      let keyCounter = 0;
      
      while ((match = regex.exec(content)) !== null) {
        const matchIdx = match.index;
        const matchText = match[0];
        
        if (matchIdx > lastIndex) {
          parts.push(content.substring(lastIndex, matchIdx));
        }
        
        parts.push(
          <span key={`mention-${keyCounter++}`} className="bg-zinc-900 text-white font-mono px-1.5 py-0.5 rounded text-[10px] font-bold inline-block mx-0.5 shadow-sm">
            {matchText}
          </span>
        );
        
        lastIndex = regex.lastIndex;
      }
      
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }
    } else {
      parts.push(content);
    }
    
    return parts.length > 0 ? parts : content;
  };

  // File Upload Helper
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const filesList = Array.from(files);

    for (const file of filesList) {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const newAttachment = {
        id: fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl: '',
        progress: 5,
        isUploading: true
      };

      setCommentFiles(prev => [...prev, newAttachment]);

      if (file.size > 10 * 1024 * 1024) {
        setCommentFiles(prev => prev.map(a => a.id === fileId ? { ...a, progress: 0, isUploading: false, fileName: `${a.fileName} (Exceeds 10MB limit)` } : a));
        continue;
      }

      try {
        if (isSupabaseConfigured && supabase) {
          const filePath = `tickets/${ticket.id}/comments/${fileId}/${file.name}`;
          
          let prog = 10;
          const interval = setInterval(() => {
            prog = Math.min(90, prog + 15);
            setCommentFiles(prev => prev.map(a => a.id === fileId && a.isUploading ? { ...a, progress: prog } : a));
          }, 150);

          const { error: uploadError } = await supabase.storage
            .from('sap-tickets')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

          clearInterval(interval);

          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            setCommentFiles(prev => prev.filter(a => a.id !== fileId));
            continue;
          }

          const { data: urlData } = supabase.storage.from('sap-tickets').getPublicUrl(filePath);
          const fileUrl = urlData?.publicUrl || '';
          
          setCommentFiles(prev => prev.map(a => a.id === fileId ? { ...a, fileUrl, progress: 100, isUploading: false } : a));
        } else {
          // Simulated upload for mock mode
          let prog = 10;
          const interval = setInterval(() => {
            prog += 20;
            if (prog >= 100) {
              clearInterval(interval);
              setCommentFiles(prev => prev.map(a => a.id === fileId ? { ...a, fileUrl: `/files/${file.name}`, progress: 100, isUploading: false } : a));
            } else {
              setCommentFiles(prev => prev.map(a => a.id === fileId ? { ...a, progress: prog } : a));
            }
          }, 150);
        }
      } catch (err) {
        console.error("Upload exception:", err);
        setCommentFiles(prev => prev.filter(a => a.id !== fileId));
      }
    }
    setIsUploading(false);
  };

  const removeAttachmentFromComment = (idx: number) => {
    setCommentFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQuoteHours = (e: React.FormEvent) => {
    e.preventDefault();
    const isFunctional = consultantType === 'Functional';
    if (isFunctional ? !estFuncHours : !estTechHours) return;

    quoteEstimatedHours(ticket.id, {
      functionalEstimatedHours: isFunctional ? Number(estFuncHours) : 0,
      technicalEstimatedHours: !isFunctional ? Number(estTechHours) : 0,
      remarks: estRemarks,
      submittedBy: consultantName
    });
    showBannerMessage('Initial hours quote submitted and locked.');
    setActiveModal(null);
  };

  const handleRevisionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const isFunctional = consultantType === 'Functional';
    const hours = isFunctional ? estFuncHours : estTechHours;
    if (!hours || !estRemarks.trim()) {
      setValidationError('Justification remarks and new hours are required.');
      return;
    }

    requestEstimateRevision(ticket.id, {
      functionalEstimatedHours: isFunctional ? Number(estFuncHours) : 0,
      technicalEstimatedHours: !isFunctional ? Number(estTechHours) : 0,
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
  const myEffort = (ticket.consultantEfforts || []).find(e => (e.consultantId === user?.id || e.consultantName === consultantName) && !e.isDeleted);
  const myEstimatedHours = myEffort ? myEffort.estimatedHours : 0;

  const teamEstimatedHours = (ticket.consultantEfforts || [])
    .filter(e => e.consultantId !== user?.id && e.consultantName !== consultantName && !e.isDeleted)
    .reduce((sum, e) => sum + (e.estimatedHours || 0), 0);

  const functionalTotalEst = (ticket.consultantEfforts || [])
    .filter(e => e.consultantType === 'Functional' && !e.isDeleted)
    .reduce((sum, e) => sum + (e.estimatedHours || 0), 0);

  const technicalTotalEst = (ticket.consultantEfforts || [])
    .filter(e => e.consultantType === 'Technical' && !e.isDeleted)
    .reduce((sum, e) => sum + (e.estimatedHours || 0), 0);

  const grandTotalEst = (ticket.consultantEfforts || [])
    .filter(e => !e.isDeleted)
    .reduce((sum, e) => sum + (e.estimatedHours || 0), 0);

  const myActualHours = myEffort ? myEffort.actualHours : 0;

  const teamActualHours = (ticket.consultantEfforts || [])
    .filter(e => e.consultantId !== user?.id && e.consultantName !== consultantName && !e.isDeleted)
    .reduce((sum, e) => sum + (e.actualHours || 0), 0);

  const functionalTotalAct = (ticket.consultantEfforts || [])
    .filter(e => e.consultantType === 'Functional' && !e.isDeleted)
    .reduce((sum, e) => sum + (e.actualHours || 0), 0);

  const technicalTotalAct = (ticket.consultantEfforts || [])
    .filter(e => e.consultantType === 'Technical' && !e.isDeleted)
    .reduce((sum, e) => sum + (e.actualHours || 0), 0);

  const grandTotalAct = (ticket.consultantEfforts || [])
    .filter(e => !e.isDeleted)
    .reduce((sum, e) => sum + (e.actualHours || 0), 0);

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
  const isTicketFullyLocked = ticket.status === 'Closed' || ticket.status === 'Request for Closure' || (latestClosureReq && latestClosureReq.status === 'Pending Manager Approval');
  const isLockedForMe = isTicketFullyLocked || myEffort?.closureStatus === 'Submitted';

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

      {isTicketFullyLocked && (
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

      {myEffort?.closureStatus === 'Submitted' && !isTicketFullyLocked && (
        <div className="bg-amber-50 border border-amber-250 text-amber-800 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-semibold">
          <div className="flex items-start gap-2.5">
            <Lock size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] font-mono">My Effort Locked</p>
              <p className="mt-1 leading-normal text-amber-750 font-mono">
                You have submitted your effort details for this ticket. Your inputs, comments, and uploads are locked. 
                Other allocated consultants can still update their efforts.
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
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase font-mono text-[10px] h-8 cursor-pointer border border-amber-500"
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
          
          {/* Ticket Overview Card */}
          <Card className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Briefcase size={14} className="text-slate-400" />
                Ticket Overview
              </h3>
              <div className="flex gap-2">
                <Badge variant={ticket.priority === 'Critical' || ticket.priority === 'High' ? 'destructive' : 'secondary'} className="uppercase text-[9px] font-bold">
                  {ticket.priority} Priority
                </Badge>
                <Badge className="bg-zinc-900 text-white uppercase text-[9px] font-mono">
                  {ticket.status}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Ticket ID</span>
                  <span className="text-slate-900 font-bold text-sm bg-slate-50 px-2 py-0.5 border border-slate-200 rounded inline-block mt-0.5">{ticket.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Subject / Title</span>
                  <span className="text-slate-900 font-semibold block mt-0.5">{ticket.title}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Description</span>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed mt-1 font-sans text-xs bg-slate-50/50 p-2.5 rounded border border-slate-100">{ticket.description}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Classification</span>
                  <span className="text-slate-955 font-bold block mt-0.5">{ticket.classification || ticket.functionalOrTechnical || 'Functional'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Issue Category</span>
                  <span className="text-slate-900 font-bold block mt-0.5">{ticket.category}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Created On</span>
                    <span className="text-slate-700 text-[10px] block mt-0.5">{new Date(ticket.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Last Updated</span>
                    <span className="text-slate-700 text-[10px] block mt-0.5">{new Date(ticket.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-400 text-[9px] uppercase font-bold">SLA Target Due</span>
                  <SlaBadge ticket={ticket} />
                </div>
              </div>
            </div>
          </Card>

          {/* Customer / Client Details Card */}
          <Card className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building2 size={14} className="text-slate-400" />
              Customer & Requester details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Company / Organization</span>
                <span className="text-slate-900 font-bold flex items-center gap-1">
                  <Building2 size={12} className="text-slate-400 shrink-0" />
                  {ticket.organization}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Requester Name</span>
                <span className="text-slate-900 font-bold flex items-center gap-1">
                  <User size={12} className="text-slate-400 shrink-0" />
                  {ticket.createdByName || ticket.requestedBy}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Contact Coordinates</span>
                <span className="text-slate-700 block">{ticket.requestedByEmail || 'customer@sap.com'}</span>
                {(() => {
                  const reqProf = MOCK_MENTIONABLE_USERS.find(u => u.name === (ticket.createdByName || ticket.requestedBy));
                  const phone = ticket.requestedByPhone || reqProf?.phoneNumber;
                  return phone ? (
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Phone: {phone}</span>
                  ) : null;
                })()}
              </div>
            </div>
          </Card>

          {/* SAP Scope Card */}
          <Card className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <Layers size={14} className="text-slate-400" />
              SAP Scope & Business Impact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Scope Modules</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {ticket.sapModules && ticket.sapModules.length > 0 ? (
                    ticket.sapModules.map((mod, i) => (
                      <Badge key={i} className="bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-150 font-mono text-[9px] uppercase px-1.5 py-0.2">
                        {mod}
                      </Badge>
                    ))
                  ) : (
                    <Badge className="bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-150 font-mono text-[9px] uppercase px-1.5 py-0.2">
                      {ticket.sapModule}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Business Impact Severity</span>
                <span className="text-slate-900 font-semibold block">{ticket.businessImpactLevel || ticket.businessImpact || 'Standard Operations'}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">SAP Transport Request</span>
                <span className="font-bold text-slate-900 block mt-0.5">{ticket.transportRequest || 'None Specified'}</span>
              </div>

              {ticket.businessJustification && (
                <div className="md:col-span-3 space-y-1 pt-1 border-t border-slate-50">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Business Justification</span>
                  <p className="text-slate-700 font-sans text-xs italic">"{ticket.businessJustification}"</p>
                </div>
              )}
            </div>
          </Card>

          {/* Assigned Team Grid Card */}
          <Card className="bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <Users size={14} className="text-slate-400" />
              Assigned AMS Specialist Teams
            </h3>
            
            <div className="space-y-4 font-mono">
              {/* Functional Consultants */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Functional Consulting Team
                </span>
                {(() => {
                  const list = (ticket.consultantEfforts || []).filter(e => e.consultantType === 'Functional');
                  if (list.length === 0) {
                    return <div className="text-[10px] text-slate-450 italic p-3 bg-slate-50 border border-slate-150 rounded">No Functional consultants assigned to this ticket.</div>;
                  }
                  return (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px]">
                            <th className="p-2">Name</th>
                            <th className="p-2">Specialty / Module</th>
                            <th className="p-2">SLA Role</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-right">Est. Hours</th>
                            <th className="p-2 text-right">Act. Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {list.map((e, idx) => {
                            const prof = MOCK_MENTIONABLE_USERS.find(u => u.name === e.consultantName);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-2 font-bold text-slate-900">{e.consultantName}</td>
                                <td className="p-2 text-slate-655">{prof?.sapModules?.join(', ') || ticket.sapModule}</td>
                                <td className="p-2 text-slate-500">{prof?.roleTitle || 'Functional Consultant'}</td>
                                <td className="p-2 text-center">
                                  <Badge className={`uppercase text-[8px] px-1.5 py-0.2 tracking-wider ${
                                    e.closureStatus === 'Submitted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-850'
                                  }`}>
                                    {e.closureStatus || 'Pending'}
                                  </Badge>
                                </td>
                                <td className="p-2 text-right font-bold text-slate-500">{e.estimatedHours}h</td>
                                <td className="p-2 text-right font-bold text-slate-900">{e.actualHours}h</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Technical Consultants */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                  Technical Development Team
                </span>
                {(() => {
                  const list = (ticket.consultantEfforts || []).filter(e => e.consultantType === 'Technical');
                  if (list.length === 0) {
                    return <div className="text-[10px] text-slate-450 italic p-3 bg-slate-50 border border-slate-150 rounded">No Technical developers assigned to this ticket.</div>;
                  }
                  return (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px]">
                            <th className="p-2">Name</th>
                            <th className="p-2">Specialty / Module</th>
                            <th className="p-2">SLA Role</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-right">Est. Hours</th>
                            <th className="p-2 text-right">Act. Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {list.map((e, idx) => {
                            const prof = MOCK_MENTIONABLE_USERS.find(u => u.name === e.consultantName);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-2 font-bold text-slate-900">{e.consultantName}</td>
                                <td className="p-2 text-slate-655">{prof?.sapModules?.join(', ') || ticket.sapModule}</td>
                                <td className="p-2 text-slate-500">{prof?.roleTitle || 'ABAP Developer'}</td>
                                <td className="p-2 text-center">
                                  <Badge className={`uppercase text-[8px] px-1.5 py-0.2 tracking-wider ${
                                    e.closureStatus === 'Submitted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-850'
                                  }`}>
                                    {e.closureStatus || 'Pending'}
                                  </Badge>
                                </td>
                                <td className="p-2 text-right font-bold text-slate-500">{e.estimatedHours}h</td>
                                <td className="p-2 text-right font-bold text-slate-900">{e.actualHours}h</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
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
                  disabled={isLockedForMe}
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
                  disabled={isLockedForMe}
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

            {(currentEstimate || grandTotalEst > 0) ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                  <div className="bg-slate-50 p-2.5 border border-slate-200 rounded border-l-2 border-l-blue-500">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">My Estimate</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block font-mono">{myEstimatedHours} h</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 border border-slate-200 rounded border-l-2 border-l-indigo-500">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Team Estimate</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block font-mono">{teamEstimatedHours} h</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 border border-slate-200 rounded border-l-2 border-l-cyan-500">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Functional Total</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block font-mono">{functionalTotalEst} h</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 border border-slate-200 rounded border-l-2 border-l-violet-500">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Technical Total</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block font-mono">{technicalTotalEst} h</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 border border-slate-200 rounded border-l-2 border-l-emerald-500 col-span-2 md:col-span-1">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Grand Total</span>
                    <span className="text-sm font-bold text-emerald-600 mt-0.5 block font-mono">{grandTotalEst} h</span>
                  </div>
                </div>

                {currentEstimate && (
                  <div className="bg-slate-50 p-3 border border-slate-200 rounded text-xs space-y-1.5 text-slate-655 font-mono">
                    <div>Remarks: <span className="text-slate-900 italic">"{currentEstimate.remarks || 'No remarks listed'}"</span></div>
                    <div className="flex justify-between text-[10px] pt-1 text-slate-400 border-t border-slate-200/50">
                      <span>Submitted by: <strong>{currentEstimate.consultantId}</strong></span>
                      <span>Date: <strong>{new Date(currentEstimate.submittedAt).toLocaleDateString()}</strong></span>
                    </div>
                  </div>
                )}
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
              
              {ticket.status !== 'Closed' && ticket.status !== 'Request for Closure' && myEffort?.closureStatus !== 'Submitted' && (
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

            {(latestClosureReq || grandTotalAct > 0) ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                  <div className="bg-slate-50 p-2.5 border border-slate-200 rounded border-l-2 border-l-blue-500">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">My Actual</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block font-mono">{myActualHours} h</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 border border-slate-200 rounded border-l-2 border-l-indigo-500">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Team Actual</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block font-mono">{teamActualHours} h</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 border border-slate-200 rounded border-l-2 border-l-cyan-500">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Functional Total</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block font-mono">{functionalTotalAct} h</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 border border-slate-200 rounded border-l-2 border-l-violet-500">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Technical Total</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block font-mono">{technicalTotalAct} h</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 border border-slate-200 rounded border-l-2 border-l-emerald-500 col-span-2 md:col-span-1">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Grand Total</span>
                    <span className="text-sm font-bold text-emerald-600 mt-0.5 block font-mono">{grandTotalAct} h</span>
                  </div>
                </div>

                {latestClosureReq && (
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
                )}
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
                  disabled={isLockedForMe}
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
                disabled={isLockedForMe}
                ref={textareaRef}
                value={commentText}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeyDown}
                placeholder={isLockedForMe ? "This conversation channel is locked." : (isInternalComment ? "Write internal log..." : "Reply to Customer...")}
                className="w-full bg-white border border-slate-200 rounded p-3 text-xs h-28 focus:outline-none focus:border-slate-350 text-slate-900 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />

              {showMentionDropdown && filteredMentions.length > 0 && !isLockedForMe && (
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
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Uploaded files ({commentFiles.length})</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {commentFiles.map((file, i) => {
                      const isImage = file.fileType.startsWith('image/');
                      return (
                        <div key={file.id || i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs relative overflow-hidden">
                          {/* Thumbnail / Icon Preview */}
                          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded flex items-center justify-center shrink-0 overflow-hidden">
                            {isImage && file.fileUrl ? (
                              <img src={file.fileUrl} alt={file.fileName} className="w-full h-full object-cover" />
                            ) : (
                              <FileText size={16} className="text-slate-400" />
                            )}
                          </div>
                          
                          {/* File info and Progress */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[10px] font-bold text-slate-800 truncate block pr-2">{file.fileName}</span>
                              <span className="text-[8px] text-slate-450 font-mono shrink-0">({Math.round(file.fileSize / 1024)} KB)</span>
                            </div>
                            
                            {file.isUploading ? (
                              <div className="space-y-1">
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div className="h-full bg-slate-900 transition-all duration-300" style={{ width: `${file.progress}%` }} />
                                </div>
                                <span className="text-[8px] text-slate-400 font-mono block">Uploading... {file.progress}%</span>
                              </div>
                            ) : (
                              <span className="text-[8px] text-emerald-600 font-bold uppercase font-mono block">Ready to send</span>
                            )}
                          </div>
                          
                          {/* Delete Action */}
                          <button
                            type="button"
                            disabled={isLockedForMe}
                            onClick={() => removeAttachmentFromComment(i)}
                            className="text-slate-400 hover:text-red-500 disabled:opacity-30 cursor-pointer p-1 rounded hover:bg-slate-50 shrink-0 transition"
                            title={file.isUploading ? "Cancel upload" : "Remove file"}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-250/50">
                <div className="flex items-center gap-2">
                  <label className={`cursor-pointer p-1.5 hover:bg-white border border-slate-200 rounded text-slate-655 transition flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase ${
                    isLockedForMe || isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
                    <Paperclip size={12} />
                    <span>Choose File</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isLockedForMe || isUploading}
                    />
                  </label>
                  {isUploading && (
                    <span className="text-[10px] font-mono text-slate-400 animate-pulse">Uploading file...</span>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLockedForMe}
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
                  <p className="text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">{renderCommentContent(c.content)}</p>

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
            <TicketTimeline ticket={ticket} userRole="Consultant" />
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
                disabled={isLockedForMe}
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
                  {consultantType === 'Functional' ? (
                    <>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Functional Actual Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          placeholder="e.g. 6.0"
                          value={actFuncHours}
                          onChange={(e) => setActFuncHours(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900"
                          min="0"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500 uppercase text-[9px] font-mono block">Business Validation Summary (Mandatory)</label>
                        <textarea
                          value={workCompletedSummary}
                          onChange={(e) => setWorkCompletedSummary(e.target.value)}
                          placeholder="Detail functional testing and business validation results..."
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-20 focus:outline-none"
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
                        <label className="font-bold text-red-500 uppercase text-[9px] font-mono block">Functional Closure Notes (Mandatory)</label>
                        <textarea
                          value={resolutionSummary}
                          onChange={(e) => setResolutionSummary(e.target.value)}
                          placeholder="Specify the functional alignment and configuration changes made..."
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-20 focus:outline-none"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Technical Actual Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          placeholder="e.g. 8.0"
                          value={actTechHours}
                          onChange={(e) => setActTechHours(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900"
                          min="0"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500 uppercase text-[9px] font-mono block">Work Completed Summary (Mandatory)</label>
                        <textarea
                          value={workCompletedSummary}
                          onChange={(e) => setWorkCompletedSummary(e.target.value)}
                          placeholder="Outline completed development, code fixes, and technical deliverables..."
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-20 focus:outline-none"
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
                        <label className="font-bold text-red-500 uppercase text-[9px] font-mono block">Technical Resolution Notes (Mandatory)</label>
                        <textarea
                          value={resolutionSummary}
                          onChange={(e) => setResolutionSummary(e.target.value)}
                          placeholder="Specify the technical resolution, code modules modified, or SAP notes applied..."
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-20 focus:outline-none"
                          required
                        />
                      </div>
                    </>
                  )}

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
                  {consultantType === 'Functional' ? (
                    <>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Revised Functional Actual Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          value={actFuncHours}
                          onChange={(e) => setActFuncHours(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900"
                          min="0"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-550 uppercase text-[9px] font-mono block">Business Validation Summary</label>
                        <textarea
                          value={workCompletedSummary}
                          onChange={(e) => setWorkCompletedSummary(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-20 focus:outline-none"
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
                        <label className="font-bold text-red-500 uppercase text-[9px] font-mono block">Functional Closure Notes</label>
                        <textarea
                          value={resolutionSummary}
                          onChange={(e) => setResolutionSummary(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-20 focus:outline-none"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-655 uppercase text-[9px] font-mono block">Revised Technical Actual Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          value={actTechHours}
                          onChange={(e) => setActTechHours(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900"
                          min="0"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-550 uppercase text-[9px] font-mono block">Work Completed Summary</label>
                        <textarea
                          value={workCompletedSummary}
                          onChange={(e) => setWorkCompletedSummary(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-20 focus:outline-none"
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
                        <label className="font-bold text-red-500 uppercase text-[9px] font-mono block">Technical Resolution Notes</label>
                        <textarea
                          value={resolutionSummary}
                          onChange={(e) => setResolutionSummary(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs text-slate-900 h-20 focus:outline-none"
                          required
                        />
                      </div>
                    </>
                  )}

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
