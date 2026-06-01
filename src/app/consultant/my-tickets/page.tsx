'use client';

import React, { useState, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { BrandedLogo } from '../../../components/ui/BrandedLogo';
import {
  Search,
  LayoutGrid,
  List,
  Eye,
  MoreHorizontal,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  Paperclip,
  MessageSquare,
  Activity,
  Zap,
  Building2,
  Tag,
  Timer,
  Flag,
  RotateCcw
} from 'lucide-react';
import { TicketStatus } from '../../../types/ticket';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../../../components/ui/table';

// ── Helpers ──────────────────────────────────────────────────────────────────

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  Critical: { label: 'Critical', color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
  High:     { label: 'High',     color: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-400' },
  Medium:   { label: 'Medium',   color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-400' },
  Low:      { label: 'Low',      color: 'text-slate-655 bg-slate-50 border-slate-200', dot: 'bg-slate-400' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  'Requirement Gathering':     { label: 'Req. Gathering', color: 'text-slate-600 bg-slate-100 border-slate-200' },
  'Waiting for Hours Approval':{ label: 'Hrs Approval',   color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'In Progress - Technical':   { label: 'IP Technical',   color: 'text-blue-700 bg-blue-50 border-blue-200' },
  'In Progress - Functional':  { label: 'IP Functional',  color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  'In Progress':               { label: 'In Progress',    color: 'text-blue-700 bg-blue-50 border-blue-200' },
  'Raised to SAP':             { label: 'Raised to SAP',  color: 'text-orange-700 bg-orange-50 border-orange-200' },
  'Customer Action':           { label: 'Cust. Action',   color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'Request for Closure':       { label: 'Req. Closure',   color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'Closed':                    { label: 'Closed',         color: 'text-slate-600 bg-slate-200 border-slate-300' },
  'Reopened':                  { label: 'Reopened',       color: 'text-red-700 bg-red-50 border-red-200' },
  'Awaiting Functional Submission': { label: 'Awaiting Func. Sub', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  'Awaiting Technical Submission':  { label: 'Awaiting Tech. Sub', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  'Awaiting Manager Approval':      { label: 'Awaiting Mgr Appr', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || { label: status, color: 'text-slate-600 bg-slate-50 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase font-mono ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = priorityConfig[priority] || priorityConfig['Low'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold font-mono ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SLAIndicator({ slaDueAt }: { slaDueAt: string }) {
  const now = Date.now();
  const due = new Date(slaDueAt).getTime();
  const hoursLeft = (due - now) / (1000 * 60 * 60);

  if (hoursLeft < 0) return <span className="text-[9px] font-bold text-red-655 font-mono flex items-center gap-1"><AlertTriangle size={10} /> SLA Breached</span>;
  if (hoursLeft < 4)  return <span className="text-[9px] font-bold text-amber-600 font-mono flex items-center gap-1"><Timer size={10} /> {hoursLeft.toFixed(1)}h left</span>;
  return <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1"><Clock size={10} /> {new Date(slaDueAt).toLocaleDateString()}</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ConsultantMyTicketsPage() {
  const {
    tickets,
    loading,
    updateTicketStatus,
    addComment,
    quoteEstimatedHours,
    requestEstimateRevision,
    raiseClosureRequest,
    resubmitClosureRequest
  } = useTickets();

  const { user } = useAuth();
  const consultantName = user?.name || 'Consultant';
  const consultantType = user?.consultantType || 'Functional';

  // ── View mode ──
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');

  // ── Filters ──
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'card' ? 6 : 12;

  // ── Action Modal ──
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<
    'status' | 'comment' | 'attachment' | 'quoteHours' | 'requestRevision' | 'raiseClosure' | 'resubmitClosure' | null
  >(null);

  // ── Form state ──
  const [statusValue, setStatusValue] = useState<TicketStatus | ''>('');
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [estFuncHours, setEstFuncHours] = useState('');
  const [estTechHours, setEstTechHours] = useState('');
  const [estRemarks, setEstRemarks] = useState('');
  const [actFuncHours, setActFuncHours] = useState('');
  const [actTechHours, setActTechHours] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [pendingItems, setPendingItems] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Derived data ──
  const myAssignedTickets = useMemo(() =>
    tickets.filter(t => 
      t.assignedConsultant === consultantName || 
      t.consultantEfforts?.some(e => e.consultantName === consultantName && !e.isDeleted)
    ),
    [tickets, consultantName]
  );

  const tabFilteredTickets = useMemo(() => {
    switch (activeTab) {
      case 'requirement_gathering':
        return myAssignedTickets.filter(t => t.status === 'Requirement Gathering');
      case 'waiting_hours':
        return myAssignedTickets.filter(t => t.status === 'Waiting for Hours Approval');
      case 'in_progress_functional':
        return myAssignedTickets.filter(t => t.status === 'In Progress - Functional' || t.status === 'Awaiting Functional Submission');
      case 'in_progress_technical':
        return myAssignedTickets.filter(t => t.status === 'In Progress - Technical' || t.status === 'Awaiting Technical Submission');
      case 'customer_action':
        return myAssignedTickets.filter(t => t.status === 'Customer Action');
      case 'on_hold':
        return myAssignedTickets.filter(t => t.status === 'On Hold');
      case 'raised_sap':
        return myAssignedTickets.filter(t => t.status === 'Raised to SAP');
      case 'request_closure':
        return myAssignedTickets.filter(t => t.status === 'Request for Closure' || t.status === 'Awaiting Manager Approval');
      case 'closed':
        return myAssignedTickets.filter(t => t.status === 'Closed');
      case 'reopened':
        return myAssignedTickets.filter(t => t.status === 'Reopened');
      default:
        return myAssignedTickets;
    }
  }, [myAssignedTickets, activeTab]);

  const filteredTickets = useMemo(() => {
    const nowTime = Date.now();
    return tabFilteredTickets.filter(t => {
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;

      // Date range filtering
      if (dateFilter !== 'All') {
        const created = new Date(t.createdAt);
        const createdMs = created.getTime();
        const diffMs = nowTime - createdMs;
        
        if (dateFilter === '24h' && diffMs > 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '7d' && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '30d' && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
        
        if (dateFilter === 'current-month') {
          const now = new Date();
          if (created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear()) return false;
        }
        if (dateFilter === 'current-quarter') {
          const now = new Date();
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const createdQuarter = Math.floor(created.getMonth() / 3);
          if (createdQuarter !== currentQuarter || created.getFullYear() !== now.getFullYear()) return false;
        }
        if (dateFilter === 'current-year') {
          const now = new Date();
          if (created.getFullYear() !== now.getFullYear()) return false;
        }
        if (dateFilter === 'custom') {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (createdMs < start.getTime()) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (createdMs > end.getTime()) return false;
          }
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.organization.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tabFilteredTickets, statusFilter, priorityFilter, dateFilter, customStartDate, customEndDate, searchQuery]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = useMemo(() =>
    filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredTickets, currentPage, itemsPerPage]
  );

  const activeTicket = useMemo(() => tickets.find(t => t.id === activeTicketId), [tickets, activeTicketId]);

  const activeTicketEst = useMemo(() => {
    if (!activeTicket) return { estFunc: 0, estTech: 0, totalEst: 0 };
    const latestEst = (activeTicket.hourEstimates || [])
      .filter(e => e.status === 'Submitted' || e.status === 'Revision Approved')
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
    const estFunc = latestEst?.functionalEstimatedHours || 0;
    const estTech = latestEst?.technicalEstimatedHours || 0;
    return { estFunc, estTech, totalEst: estFunc + estTech };
  }, [activeTicket]);

  // ── Actions ──
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const closeActionModal = () => {
    setActiveTicketId(null);
    setActiveAction(null);
    setStatusValue('');
    setCommentText('');
    setIsInternalComment(false);
    setUploadFileName('');
    setEstFuncHours(''); setEstTechHours(''); setEstRemarks('');
    setActFuncHours(''); setActTechHours('');
    setWorkSummary(''); setRootCause(''); setResolutionSummary(''); setPendingItems('');
    setValidationError(null);
    setIsSubmitting(false);
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !statusValue) return;
    if (statusValue === 'Request for Closure') { setValidationError(null); setActiveAction('raiseClosure'); return; }
    updateTicketStatus(activeTicketId, statusValue, consultantName);
    triggerToast(`Status of ${activeTicketId} updated to "${statusValue}".`);
    closeActionModal();
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !commentText.trim()) return;
    addComment(activeTicketId, commentText, consultantName, user?.email || '', 'Consultant', isInternalComment);
    triggerToast('Comment added successfully.');
    closeActionModal();
  };

  const handleAttachmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !uploadFileName) return;
    addComment(activeTicketId, `Uploaded attachment: ${uploadFileName}`, consultantName, user?.email || '', 'Consultant', false,
      [{ fileName: uploadFileName, fileSize: 180 * 1024, fileType: 'application/octet-stream' }]);
    triggerToast(`File "${uploadFileName}" uploaded.`);
    closeActionModal();
  };

  const handleQuoteHoursSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId) return;
    const isFunctional = consultantType === 'Functional';
    if (isFunctional ? !estFuncHours : !estTechHours) return;

    quoteEstimatedHours(activeTicketId, {
      functionalEstimatedHours: isFunctional ? Number(estFuncHours) : 0,
      technicalEstimatedHours: !isFunctional ? Number(estTechHours) : 0,
      remarks: estRemarks,
      submittedBy: consultantName
    });
    triggerToast(`Estimated hours submitted for ${activeTicketId}.`);
    closeActionModal();
  };

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId) return;
    const isFunctional = consultantType === 'Functional';
    const hours = isFunctional ? estFuncHours : estTechHours;
    if (!hours || !estRemarks.trim()) {
      setValidationError('Revision justification and new hours are required.'); return;
    }
    requestEstimateRevision(activeTicketId, {
      functionalEstimatedHours: isFunctional ? Number(estFuncHours) : 0,
      technicalEstimatedHours: !isFunctional ? Number(estTechHours) : 0,
      remarks: estRemarks,
      submittedBy: consultantName
    });
    triggerToast(`Estimate revision submitted for ${activeTicketId}.`);
    closeActionModal();
  };

  const handleClosureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const fHours = Number(actFuncHours) || 0;
    const tHours = Number(actTechHours) || 0;
    if (!activeTicketId || !workSummary.trim() || !rootCause.trim() || !resolutionSummary.trim()) {
      setValidationError('Summary, Root Cause, and Resolution are mandatory.'); return;
    }
    if (fHours === 0 && tHours === 0) {
      setValidationError('Record actual hours for at least one effort type.'); return;
    }
    setValidationError(null);
    setIsSubmitting(true);
    const res = await raiseClosureRequest(activeTicketId, {
      functionalActualHours: fHours, technicalActualHours: tHours,
      workCompletedSummary: workSummary, rootCause, resolutionSummary,
      pendingItems: pendingItems || undefined, requestedBy: consultantName
    });
    setIsSubmitting(false);
    if (!res.success) {
      setValidationError(res.error || 'Failed to raise closure request.');
      return;
    }
    triggerToast(`Closure request submitted for ${activeTicketId}.`);
    closeActionModal();
  };

  const handleResubmitClosureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const fHours = Number(actFuncHours) || 0;
    const tHours = Number(actTechHours) || 0;
    if (!activeTicketId || !workSummary.trim() || !rootCause.trim() || !resolutionSummary.trim()) {
      setValidationError('Summary, Root Cause, and Resolution are mandatory.'); return;
    }
    const latestCls = activeTicket?.closureRequests?.[activeTicket.closureRequests.length - 1];
    if (!latestCls) return;
    setValidationError(null);
    setIsSubmitting(true);
    const res = await resubmitClosureRequest(activeTicketId, latestCls.id, {
      functionalActualHours: fHours, technicalActualHours: tHours,
      workCompletedSummary: workSummary, rootCause, resolutionSummary,
      pendingItems: pendingItems || undefined, requestedBy: consultantName
    });
    setIsSubmitting(false);
    if (!res.success) {
      setValidationError(res.error || 'Failed to resubmit closure request.');
      return;
    }
    triggerToast(`Closure resubmitted for ${activeTicketId}.`);
    closeActionModal();
  };

  // ── Per-ticket computed ──
  const getTicketMeta = (t: typeof myAssignedTickets[0]) => {
    const latestEst = (t.hourEstimates || [])
      .filter(e => e.status === 'Submitted' || e.status === 'Revision Approved')
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
    const approvedClosure = (t.closureRequests || []).find(c => c.status === 'Approved');
    const pendingClosure = (t.closureRequests || []).find(c => c.status === 'Pending Manager Approval');
    const rejectedClosure = (t.closureRequests || []).find(c => c.status === 'Rejected');

    // Find current consultant's effort
    const myEffort = t.consultantEfforts?.find(e => 
      (user?.id && e.consultantId === user.id) || 
      (user?.name && e.consultantName && e.consultantName.toLowerCase() === user.name.toLowerCase())
    );

    let estHours = 0;
    if (myEffort && myEffort.estimatedHours > 0) {
      estHours = myEffort.estimatedHours;
    } else {
      // Fallback to type-specific totals
      const teamTypeEst = t.consultantEfforts
        ?.filter(e => e.consultantType === consultantType)
        .reduce((sum, e) => sum + (e.estimatedHours || 0), 0) || 0;
      
      if (teamTypeEst > 0) {
        estHours = teamTypeEst;
      } else {
        // Fallback to legacy ticket hour estimate
        estHours = consultantType === 'Functional'
          ? (latestEst?.functionalEstimatedHours ?? t.quotedHours ?? 0)
          : (latestEst?.technicalEstimatedHours ?? t.quotedHours ?? 0);
      }
    }

    let actHours = 0;
    if (myEffort && myEffort.closureStatus === 'Approved' && myEffort.actualHours > 0) {
      actHours = myEffort.actualHours;
    } else {
      // Fallback to approved team actual totals
      const teamTypeAct = t.consultantEfforts
        ?.filter(e => e.consultantType === consultantType && e.closureStatus === 'Approved')
        .reduce((sum, e) => sum + (e.actualHours || 0), 0) || 0;

      if (teamTypeAct > 0) {
        actHours = teamTypeAct;
      } else {
        // Fallback to approved closure request
        actHours = consultantType === 'Functional'
          ? (approvedClosure?.functionalActualHours ?? 0)
          : (approvedClosure?.technicalActualHours ?? 0);
      }
    }

    const isLocked = t.status === 'Closed' || t.status === 'Request for Closure' || !!pendingClosure;
    const age = Math.max(0, Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

    return { latestEst, approvedClosure, pendingClosure, rejectedClosure, estHours, actHours, isLocked, age };
  };

  // ── Summary tabs counts ──
  const counts = useMemo(() => ({
    all: myAssignedTickets.length,
    requirementGathering: myAssignedTickets.filter(t => t.status === 'Requirement Gathering').length,
    waitingHoursApproval: myAssignedTickets.filter(t => t.status === 'Waiting for Hours Approval').length,
    inProgressFunctional: myAssignedTickets.filter(t => t.status === 'In Progress - Functional' || t.status === 'Awaiting Functional Submission').length,
    inProgressTechnical: myAssignedTickets.filter(t => t.status === 'In Progress - Technical' || t.status === 'Awaiting Technical Submission').length,
    customerAction: myAssignedTickets.filter(t => t.status === 'Customer Action').length,
    onHold: myAssignedTickets.filter(t => t.status === 'On Hold').length,
    raisedToSap: myAssignedTickets.filter(t => t.status === 'Raised to SAP').length,
    requestForClosure: myAssignedTickets.filter(t => t.status === 'Request for Closure' || t.status === 'Awaiting Manager Approval').length,
    closed: myAssignedTickets.filter(t => t.status === 'Closed').length,
    reopened: myAssignedTickets.filter(t => t.status === 'Reopened').length,
  }), [myAssignedTickets]);

  // ── Ticket Action Dropdown ──
  const TicketActionMenu = ({ t }: { t: typeof myAssignedTickets[0] }) => {
    const { latestEst, rejectedClosure, isLocked } = getTicketMeta(t);

    if (isLocked) {
      return (
        <Button size="icon" variant="ghost" disabled className="h-8 w-8 text-slate-400 cursor-not-allowed">
          <Lock size={14} />
        </Button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="outline" className="h-8 w-8 text-slate-600 cursor-pointer">
            <MoreHorizontal size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 text-xs font-mono">
          <DropdownMenuItem
            className="cursor-pointer font-semibold"
            onClick={() => { setActiveTicketId(t.id); setStatusValue(t.status); setActiveAction('status'); }}>
            <Activity size={12} className="mr-2" /> Change Status
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer font-semibold"
            onClick={() => { setActiveTicketId(t.id); setActiveAction('comment'); }}>
            <MessageSquare size={12} className="mr-2" /> Add Comment
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer font-semibold"
            onClick={() => { setActiveTicketId(t.id); setActiveAction('attachment'); }}>
            <Paperclip size={12} className="mr-2" /> Add Attachment
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {(t.hourEstimates || []).length === 0 ? (
            <DropdownMenuItem
              className="cursor-pointer font-bold text-emerald-700 focus:text-emerald-700"
              onClick={() => { setActiveTicketId(t.id); setActiveAction('quoteHours'); }}>
              <Timer size={12} className="mr-2" /> Quote Estimated Hours
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="cursor-pointer font-bold text-amber-700 focus:text-amber-700"
              onClick={() => {
                setActiveTicketId(t.id);
                setEstFuncHours(String(latestEst?.functionalEstimatedHours || 0));
                setEstTechHours(String(latestEst?.technicalEstimatedHours || 0));
                setActiveAction('requestRevision');
              }}>
              <RotateCcw size={12} className="mr-2" /> Request Hours Revision
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="cursor-pointer font-bold text-emerald-700 focus:text-emerald-700"
            onClick={() => {
              setActiveTicketId(t.id);
              setActFuncHours(''); setActTechHours('');
              setWorkSummary(''); setRootCause(''); setResolutionSummary(''); setPendingItems('');
              setActiveAction('raiseClosure');
            }}>
            <CheckCircle2 size={12} className="mr-2" /> Request Closure
          </DropdownMenuItem>
          {rejectedClosure && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer font-bold text-red-700 focus:text-red-700"
                onClick={() => {
                  setActiveTicketId(t.id);
                  setActFuncHours(String(rejectedClosure.functionalActualHours));
                  setActTechHours(String(rejectedClosure.technicalActualHours));
                  setWorkSummary(rejectedClosure.workCompletedSummary);
                  setRootCause(rejectedClosure.rootCause);
                  setResolutionSummary(rejectedClosure.resolutionSummary);
                  setPendingItems(rejectedClosure.pendingItems || '');
                  setActiveAction('resubmitClosure');
                }}>
                <RotateCcw size={12} className="mr-2" /> Resubmit Closure
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const CardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {paginatedTickets.map(t => {
        const { estHours, actHours, isLocked, age } = getTicketMeta(t);
        const priCfg = priorityConfig[t.priority] || priorityConfig['Low'];
        const completionPct = estHours > 0 ? Math.min(100, Math.round((actHours / estHours) * 100)) : 0;
        
        return (
          <Card key={t.id} className={`bg-white border border-zinc-200/80 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col overflow-hidden ${isLocked ? 'border-zinc-300 bg-zinc-50/50 shadow-none' : ''}`}>
            <div className="p-5 flex flex-col gap-4 flex-1">
              {/* Header row: ID, Priority, Status, Age */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${priCfg.dot} ${t.priority === 'Critical' ? 'animate-pulse' : ''}`} />
                  <span className="text-[11px] font-bold text-zinc-900 font-mono tracking-wider">{t.id}</span>
                  {isLocked && <Lock size={10} className="text-zinc-400" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                </div>
              </div>

              {/* Body: Subject & Description */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                  <Building2 size={12} className="text-zinc-400 shrink-0" />
                  <span className="truncate">{t.organization}</span>
                </div>
                
                <Link href={`/consultant/tickets/${t.id}`} className="group">
                  <h3 className="text-xs font-bold text-zinc-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {t.title}
                  </h3>
                </Link>
                <p className="text-[11px] text-zinc-500 line-clamp-3 leading-relaxed">
                  {t.description}
                </p>
              </div>

              {/* Badges: SAP Modules, Ticket Type */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[8px] font-bold uppercase font-mono px-1.5 py-0.5 bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-50">
                  {t.sapModule}
                </Badge>
                <Badge variant="outline" className="text-[8px] font-bold uppercase font-mono px-1.5 py-0.5 bg-indigo-50/50 text-indigo-700 border-indigo-100 hover:bg-indigo-50/50">
                  {t.ticketType || 'Incident'}
                </Badge>
              </div>

              {/* Hours (Role Specific) */}
              <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-xl flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">{consultantType} Est</span>
                  <strong className="text-zinc-950 text-sm mt-0.5 block">{estHours.toFixed(1)} h</strong>
                </div>
                <div className="border-l border-zinc-200 h-8 mx-2" />
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">{consultantType} Act</span>
                  <strong className="text-emerald-600 text-sm mt-0.5 block">{actHours.toFixed(1)} h</strong>
                </div>
              </div>

              {/* Progress Bar (Hours execution ratio) */}
              {estHours > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                    <span>Effort Logged</span>
                    <span>{completionPct}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-1 overflow-hidden">
                    <div className={`h-full rounded-full ${completionPct > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, completionPct)}%` }} />
                  </div>
                </div>
              )}

              {/* Footer: Created/Updated Date, Comment/Attachment count, Actions */}
              <div className="border-t border-zinc-100 pt-3 flex items-center justify-between text-[9px] font-mono text-zinc-400 mt-auto">
                <div className="space-y-0.5 text-zinc-450">
                  <div>Age: <strong>{age}d old</strong></div>
                  <div>Updated: <strong>{new Date(t.updatedAt).toLocaleDateString()}</strong></div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1" title="Comments count">
                    <MessageSquare size={11} className="text-zinc-400" />
                    <span>{t.comments?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Attachments count">
                    <Paperclip size={11} className="text-zinc-400" />
                    <span>{t.attachments?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 border-l border-zinc-200 pl-3">
                    <Link href={`/consultant/tickets/${t.id}`}>
                      <Button size="icon" variant="outline" className="h-7 w-7 text-zinc-600 cursor-pointer" title="View details">
                        <Eye size={12} />
                      </Button>
                    </Link>
                    <TicketActionMenu t={t} />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {paginatedTickets.length === 0 && (
        <div className="md:col-span-2 xl:col-span-3 py-20 flex flex-col items-center justify-center text-zinc-400 bg-white border border-zinc-250 rounded-2xl">
          <Flag size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-semibold">No tickets match your filters.</p>
          <p className="text-xs mt-1">Try resetting the status/priority filter or search query.</p>
        </div>
      )}
    </div>
  );

  // ── COMPACT LIST VIEW ──
  const CompactListView = () => (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <Table className="w-full">
          <TableHeader className="bg-zinc-50/70 sticky top-0 z-10 border-b border-zinc-200">
            <TableRow>
              <TableHead className="w-[100px] font-mono">Ticket ID</TableHead>
              <TableHead className="w-[150px]">Customer</TableHead>
              <TableHead className="min-w-[200px]">Subject</TableHead>
              <TableHead className="w-[80px]">Modules</TableHead>
              <TableHead className="w-[90px]">Priority</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[80px]">Age</TableHead>
              <TableHead className="w-[70px] text-right">Est Hrs</TableHead>
              <TableHead className="w-[70px] text-right">Act Hrs</TableHead>
              <TableHead className="w-[100px]">Updated</TableHead>
              <TableHead className="w-[80px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTickets.map(t => {
              const { estHours, actHours, isLocked, age } = getTicketMeta(t);
              return (
                <TableRow key={t.id} className={`hover:bg-zinc-50/40 transition-colors ${isLocked ? 'bg-zinc-50/25' : ''}`}>
                  <TableCell className="font-mono font-bold text-zinc-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {t.id}
                      {isLocked && <Lock size={9} className="text-zinc-400" />}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-zinc-700 whitespace-nowrap truncate max-w-[150px]" title={t.organization}>
                    {t.organization}
                  </TableCell>
                  <TableCell className="min-w-[200px] max-w-[320px] truncate" title={t.title}>
                    <Link href={`/consultant/tickets/${t.id}`} className="font-bold text-zinc-950 hover:text-blue-600 transition-colors">
                      {t.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[8px] font-bold font-mono uppercase bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-50">
                      {t.sapModule}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={t.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-zinc-500 font-mono text-[10px] whitespace-nowrap">
                    {age}d old
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-zinc-700">
                    {estHours.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-emerald-600">
                    {actHours.toFixed(1)}h
                  </TableCell>
                  <TableCell className="text-zinc-400 font-mono text-[9px] whitespace-nowrap">
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/consultant/tickets/${t.id}`}>
                        <Button size="icon" variant="outline" className="h-7 w-7 text-zinc-500 cursor-pointer">
                          <Eye size={12} />
                        </Button>
                      </Link>
                      <TicketActionMenu t={t} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {paginatedTickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-20 text-center text-zinc-400 italic font-sans">
                  <Flag size={24} className="mx-auto mb-2 opacity-30" />
                  No tickets found matching your query filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // ── MODAL FORMS ──
  const ModalContent = () => {
    if (!activeAction || !activeTicket) return null;

    const actionLabel: Record<string, string> = {
      status: 'Change Status',
      comment: 'Add Comment',
      attachment: 'Add Attachment',
      quoteHours: 'Quote Estimated Hours',
      requestRevision: 'Request Hours Revision',
      raiseClosure: 'Request Closure',
      resubmitClosure: 'Resubmit Closure Request'
    };

    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="bg-white border border-zinc-200/80 shadow-2xl w-full max-w-lg overflow-hidden text-zinc-950 rounded-2xl">
          {/* Modal Header */}
          <div className="border-b border-zinc-150 px-5 py-4 bg-zinc-50/50 backdrop-blur-md flex justify-between items-center">
            <div>
              <p className="text-[9px] text-zinc-400 font-semibold uppercase tracking-widest font-sans">Action Panel</p>
              <h3 className="text-sm font-bold text-zinc-900">{actionLabel[activeAction]} — <span className="font-mono text-xs">{activeTicketId}</span></h3>
            </div>
            <button onClick={closeActionModal} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-700 transition cursor-pointer">
              <X size={14} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4 text-xs">
            {validationError && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold rounded flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                {validationError}
              </div>
            )}

            {/* CHANGE STATUS */}
            {activeAction === 'status' && (
              <form onSubmit={handleStatusSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="font-bold text-zinc-500 uppercase text-[9px] block">Select Transition Status</label>
                  <select value={statusValue} onChange={e => setStatusValue(e.target.value as TicketStatus)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition" required>
                    <option value="">-- Select Status --</option>
                    <option value="Requirement Gathering">1. Requirement Gathering</option>
                    <option value="Waiting for Hours Approval">2. Waiting for Hours Approval</option>
                    {consultantType === 'Functional' ? (
                      <option value="In Progress - Functional">3. In Progress - Functional</option>
                    ) : (
                      <option value="In Progress - Technical">3. In Progress - Technical</option>
                    )}
                    <option value="Raised to SAP">4. Raised to SAP</option>
                    <option value="Customer Action">5. Customer Action</option>
                    <option value="Request for Closure">6. Request for Closure (Logs Actuals)</option>
                  </select>
                  <span className="text-[9px] text-zinc-450 block">"Request for Closure" will prompt actual hours entry.</span>
                </div>
                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} className="text-[10px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] font-bold uppercase h-8 cursor-pointer">Apply Status</Button>
                </div>
              </form>
            )}

            {/* ADD COMMENT */}
            {activeAction === 'comment' && (
              <form onSubmit={handleCommentSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-500 uppercase text-[9px] block">Comment</label>
                  <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                    placeholder="Write your comment..." className="w-full bg-zinc-50 border border-zinc-200 rounded p-3 text-xs h-28 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition text-zinc-900" required />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="internalCheck" checked={isInternalComment} onChange={e => setIsInternalComment(e.target.checked)} className="rounded border-zinc-300" />
                  <label htmlFor="internalCheck" className="font-bold text-zinc-650 uppercase text-[9px] cursor-pointer select-none">
                    Internal Note (Consultant & Manager only)
                  </label>
                </div>
                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} className="text-[10px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] font-bold uppercase h-8 cursor-pointer">Submit Comment</Button>
                </div>
              </form>
            )}

            {/* ADD ATTACHMENT */}
            {activeAction === 'attachment' && (
              <form onSubmit={handleAttachmentSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase text-[9px] block">File Name</label>
                  <input type="text" placeholder="e.g. transport_log_SST102.txt" value={uploadFileName}
                    onChange={e => setUploadFileName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition" required />
                </div>
                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} className="text-[10px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] font-bold uppercase h-8 cursor-pointer">Upload File</Button>
                </div>
              </form>
            )}

            {/* QUOTE HOURS */}
            {activeAction === 'quoteHours' && (
              <form onSubmit={handleQuoteHoursSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[9px] block">Functional Est. Hours</label>
                    <input type="number" step="0.5" placeholder="e.g. 10.0" value={estFuncHours}
                      onChange={e => setEstFuncHours(e.target.value)} min="0" required={consultantType === 'Functional'}
                      disabled={consultantType !== 'Functional'}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 disabled:opacity-50" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[9px] block">Technical Est. Hours</label>
                    <input type="number" step="0.5" placeholder="e.g. 12.0" value={estTechHours}
                      onChange={e => setEstTechHours(e.target.value)} min="0" required={consultantType === 'Technical'}
                      disabled={consultantType !== 'Technical'}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 disabled:opacity-50" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase text-[9px] block">Remarks</label>
                  <textarea value={estRemarks} onChange={e => setEstRemarks(e.target.value)}
                    placeholder="Estimation scope remarks..." className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 h-20 focus:outline-none" />
                </div>
                <p className="text-[10px] text-zinc-450 font-mono">First-time quote takes effect immediately.</p>
                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} className="text-[10px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] font-bold uppercase h-8 cursor-pointer">Submit Quote</Button>
                </div>
              </form>
            )}

            {/* REQUEST REVISION */}
            {activeAction === 'requestRevision' && (
              <form onSubmit={handleRevisionSubmit} className="space-y-4">
                <div className="bg-zinc-50 p-2.5 border border-zinc-200 rounded text-[10px] text-zinc-500 font-mono">
                  Current Quote: {activeTicketEst.totalEst}h (Func: {activeTicketEst.estFunc}h | Tech: {activeTicketEst.estTech}h)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[9px] block">New Functional Hours</label>
                    <input type="number" step="0.5" value={estFuncHours} onChange={e => setEstFuncHours(e.target.value)} min="0" required={consultantType === 'Functional'}
                      disabled={consultantType !== 'Functional'}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 disabled:opacity-50" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[9px] block">New Technical Hours</label>
                    <input type="number" step="0.5" value={estTechHours} onChange={e => setEstTechHours(e.target.value)} min="0" required={consultantType === 'Technical'}
                      disabled={consultantType !== 'Technical'}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 disabled:opacity-50" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-500 uppercase text-[9px] block">Justification (Mandatory)</label>
                  <textarea value={estRemarks} onChange={e => setEstRemarks(e.target.value)}
                    placeholder="Rationale for revision..." className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 h-20 focus:outline-none" required />
                </div>
                <p className="text-[10px] text-zinc-450 font-mono">Revision requests take effect immediately.</p>
                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} className="text-[10px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] font-bold uppercase h-8 cursor-pointer">Submit Revision</Button>
                </div>
              </form>
            )}

            {/* RAISE CLOSURE */}
            {activeAction === 'raiseClosure' && (
              <form onSubmit={handleClosureSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[9px] block">Functional Actual Hrs</label>
                    <input type="number" step="0.5" placeholder="e.g. 6.0" value={actFuncHours}
                      onChange={e => setActFuncHours(e.target.value)} min="0" required={consultantType === 'Functional'}
                      disabled={consultantType !== 'Functional'}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 disabled:opacity-50" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[9px] block">Technical Actual Hrs</label>
                    <input type="number" step="0.5" placeholder="e.g. 8.0" value={actTechHours}
                      onChange={e => setActTechHours(e.target.value)} min="0" required={consultantType === 'Technical'}
                      disabled={consultantType !== 'Technical'}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 disabled:opacity-50" />
                  </div>
                </div>
                {[
                  { label: 'Work Completed Summary (Mandatory)', val: workSummary, set: setWorkSummary, ph: 'Outline all tasks completed...' },
                  { label: 'Root Cause (Mandatory)', val: rootCause, set: setRootCause, ph: 'Explain actual root cause...' },
                  { label: 'Resolution Summary (Mandatory)', val: resolutionSummary, set: setResolutionSummary, ph: 'Steps taken to resolve...' },
                ].map(({ label, val, set, ph }) => (
                  <div key={label} className="space-y-1">
                    <label className="font-bold text-zinc-550 uppercase text-[9px] block">{label}</label>
                    <textarea value={val} onChange={e => set(e.target.value)} placeholder={ph}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 h-16 focus:outline-none" required />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-550 uppercase text-[9px] block">Pending Items (Optional)</label>
                  <input type="text" value={pendingItems} onChange={e => setPendingItems(e.target.value)}
                    placeholder="e.g. transport release to PRD" className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900" />
                </div>
                <p className="text-[10px] text-zinc-450">Submitting closure locks the ticket pending Manager approval.</p>
                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} disabled={isSubmitting} className="text-[10px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] font-bold uppercase h-8 cursor-pointer">
                    {isSubmitting ? 'Submitting...' : 'Submit Closure Request'}
                  </Button>
                </div>
              </form>
            )}

            {/* RESUBMIT CLOSURE */}
            {activeAction === 'resubmitClosure' && (
              <form onSubmit={handleResubmitClosureSubmit} className="space-y-3">
                <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded text-xs mb-2">
                  Previous Closure Request was rejected by Manager. Update and resubmit.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[9px] block">Revised Functional Hrs</label>
                    <input type="number" step="0.5" value={actFuncHours} onChange={e => setActFuncHours(e.target.value)} min="0" required={consultantType === 'Functional'}
                      disabled={consultantType !== 'Functional'}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 disabled:opacity-50" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-zinc-500 uppercase text-[9px] block">Revised Technical Hrs</label>
                    <input type="number" step="0.5" value={actTechHours} onChange={e => setActTechHours(e.target.value)} min="0" required={consultantType === 'Technical'}
                      disabled={consultantType !== 'Technical'}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 disabled:opacity-50" />
                  </div>
                </div>
                {[
                  { label: 'Work Completed Summary', val: workSummary, set: setWorkSummary },
                  { label: 'Root Cause', val: rootCause, set: setRootCause },
                  { label: 'Resolution Summary', val: resolutionSummary, set: setResolutionSummary },
                ].map(({ label, val, set }) => (
                  <div key={label} className="space-y-1">
                    <label className="font-bold text-zinc-550 uppercase text-[9px] block">{label}</label>
                    <textarea value={val} onChange={e => set(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 h-14 focus:outline-none" required />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="font-bold text-zinc-550 uppercase text-[9px] block">Pending Items</label>
                  <input type="text" value={pendingItems} onChange={e => setPendingItems(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900" />
                </div>
                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} disabled={isSubmitting} className="text-[10px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] font-bold uppercase h-8 cursor-pointer">
                    {isSubmitting ? 'Resubmitting...' : 'Resubmit Request'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // ── RENDER ──
  return (
    <div className="space-y-6 text-zinc-900 font-sans">

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-600 text-white font-semibold text-xs py-3 px-4 rounded-md shadow-2xl flex items-center gap-2 border border-emerald-500">
          <CheckCircle2 size={16} />
          {toastMsg}
        </div>
      )}

      {/* Modal */}
      <ModalContent />

      {/* Page Header */}
      <div className="border-b border-zinc-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 tracking-tight">My Ticket Workspace</h1>
          <p className="text-zinc-500 text-xs mt-1">
            {consultantType} consultant — workload, hours, and closure workflows.
            Active Specialist: <span className="font-semibold text-zinc-900">{consultantName}</span>
          </p>
        </div>
        {/* View Toggle */}
        <div className="flex items-center gap-1 border border-zinc-200 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${viewMode === 'card' ? 'bg-zinc-950 text-white shadow' : 'text-zinc-500 hover:bg-zinc-50'}`}>
            <LayoutGrid size={12} /> Card
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${viewMode === 'compact' ? 'bg-zinc-950 text-white shadow' : 'text-zinc-500 hover:bg-zinc-50'}`}>
            <List size={12} /> List
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={val => { setActiveTab(val); setCurrentPage(1); }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="bg-zinc-100 border border-zinc-200 h-auto p-0.5 rounded-lg flex flex-wrap gap-1">
            <TabsTrigger value="all" className="text-[9px] uppercase font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm px-2.5 py-1.5 cursor-pointer">
              All <Badge variant="outline" className="ml-1.5 text-[8px] px-1 bg-zinc-50">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="requirement_gathering" className="text-[9px] uppercase font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm px-2.5 py-1.5 cursor-pointer">
              Req. Gathering <Badge variant="outline" className="ml-1.5 text-[8px] px-1 bg-zinc-50">{counts.requirementGathering}</Badge>
            </TabsTrigger>
            {/* Hrs Approval tab hidden because estimates do not require approval */}
            <TabsTrigger value="in_progress_functional" className="text-[9px] uppercase font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm px-2.5 py-1.5 cursor-pointer">
              IP Functional <Badge variant="outline" className="ml-1.5 text-[8px] px-1 bg-zinc-50">{counts.inProgressFunctional}</Badge>
            </TabsTrigger>
            <TabsTrigger value="in_progress_technical" className="text-[9px] uppercase font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm px-2.5 py-1.5 cursor-pointer">
              IP Technical <Badge variant="outline" className="ml-1.5 text-[8px] px-1 bg-zinc-50">{counts.inProgressTechnical}</Badge>
            </TabsTrigger>
            <TabsTrigger value="customer_action" className="text-[9px] uppercase font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm px-2.5 py-1.5 cursor-pointer">
              Cust. Action <Badge variant="outline" className="ml-1.5 text-[8px] px-1 bg-zinc-50">{counts.customerAction}</Badge>
            </TabsTrigger>
            <TabsTrigger value="on_hold" className="text-[9px] uppercase font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm px-2.5 py-1.5 cursor-pointer">
              On Hold <Badge variant="outline" className="ml-1.5 text-[8px] px-1 bg-zinc-50">{counts.onHold}</Badge>
            </TabsTrigger>
            <TabsTrigger value="raised_sap" className="text-[9px] uppercase font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm px-2.5 py-1.5 cursor-pointer">
              Raised To SAP <Badge variant="outline" className="ml-1.5 text-[8px] px-1 bg-zinc-50">{counts.raisedToSap}</Badge>
            </TabsTrigger>
            <TabsTrigger value="request_closure" className="text-[9px] uppercase font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm px-2.5 py-1.5 cursor-pointer">
              Req. Closure <Badge variant="outline" className="ml-1.5 text-[8px] px-1 bg-zinc-50">{counts.requestForClosure}</Badge>
            </TabsTrigger>
            <TabsTrigger value="closed" className="text-[9px] uppercase font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm px-2.5 py-1.5 cursor-pointer">
              Closed <Badge variant="outline" className="ml-1.5 text-[8px] px-1 bg-zinc-50">{counts.closed}</Badge>
            </TabsTrigger>
            <TabsTrigger value="reopened" className="text-[9px] uppercase font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-sm px-2.5 py-1.5 cursor-pointer">
              Reopened <Badge variant="outline" className="ml-1.5 text-[8px] px-1 bg-zinc-50">{counts.reopened}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Search + Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search tickets..."
                className="bg-white border border-zinc-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition w-48"
              />
            </div>
            <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-zinc-200 rounded-md p-1.5 text-xs text-zinc-700 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition">
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-zinc-200 rounded-md p-1.5 text-xs text-zinc-700 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition">
              <option value="All">All Statuses</option>
              <option value="Requirement Gathering">Req. Gathering</option>
              {/* <option value="Waiting for Hours Approval">Hrs Approval</option> */}
              {consultantType === 'Functional' ? (
                <option value="In Progress - Functional">IP Functional</option>
              ) : (
                <option value="In Progress - Technical">IP Technical</option>
              )}
              <option value="Raised to SAP">Raised to SAP</option>
              <option value="Customer Action">Customer Action</option>
              <option value="Request for Closure">Req. Closure</option>
              <option value="Closed">Closed</option>
              <option value="Reopened">Reopened</option>
            </select>

            <select value={dateFilter} onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-zinc-200 rounded-md p-1.5 text-xs text-zinc-700 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition">
              <option value="All">All History</option>
              <option value="current-month">This Month</option>
              <option value="current-quarter">This Quarter</option>
              <option value="current-year">This Year</option>
              <option value="custom">Custom Range</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {dateFilter === 'custom' && (
              <>
                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-md p-1 px-2 text-zinc-700">
                  <span className="text-[10px] font-mono">Start:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); }}
                    className="bg-transparent text-xs focus:outline-none cursor-pointer font-mono"
                  />
                </div>
                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-md p-1 px-2 text-zinc-700">
                  <span className="text-[10px] font-mono">End:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); }}
                    className="bg-transparent text-xs focus:outline-none cursor-pointer font-mono"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between mt-2.5">
          <p className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-semibold">
            {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} found in your queue
          </p>
        </div>

        {/* Ticket display */}
        <TabsContent value={activeTab} className="mt-3">
          {loading ? (
            <div className="py-16 text-center text-zinc-500 font-bold uppercase font-mono text-xs">Synchronizing active workspace registry...</div>
          ) : myAssignedTickets.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-400 bg-white border border-zinc-200 rounded-2xl space-y-2 shadow-sm">
              <BrandedLogo width={36} height={36} iconOnly={true} className="mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono">No tickets assigned yet.</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto font-mono text-center">There are no tickets assigned to you yet.</p>
            </div>
          ) : viewMode === 'card' ? (
            <CardView />
          ) : (
            <CompactListView />
          )}
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
            Page {currentPage} of {totalPages} · {filteredTickets.length} tickets
          </span>
          <div className="flex gap-2">
            <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              variant="outline" className="h-8 px-3 text-[10px] font-bold gap-1 cursor-pointer">
              <ChevronLeft size={12} /> Prev
            </Button>
            <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              variant="outline" className="h-8 px-3 text-[10px] font-bold gap-1 cursor-pointer">
              Next <ChevronRight size={12} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
