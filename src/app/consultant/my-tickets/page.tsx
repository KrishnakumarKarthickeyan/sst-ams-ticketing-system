'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { matchesTicketNumber } from '../../../lib/ticket-search';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
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
import { TicketFilterPanel } from '../../../components/tickets/TicketFilterPanel';
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
import { TanstackTable } from '../../../components/ui/tanstack-table';
import type { ColumnDef } from '@tanstack/react-table';
import { statusConfig, priorityConfig } from '../../../lib/status-theme';
import { categoryOf, TICKET_CATEGORIES, categoryCounts } from '../../../lib/ticket-categories';

// ── Helpers ──────────────────────────────────────────────────────────────────



function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || { label: status, color: 'text-slate-600 bg-slate-50 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-bold uppercase ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = priorityConfig[priority] || priorityConfig['Low'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
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
  const router = useRouter();
  const openTicket = (id: string) => router.push(`/consultant/tickets/${id}`);
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  // Persist the card/list choice so returning from a ticket keeps the view (CP5).
  useEffect(() => {
    const v = localStorage.getItem('consultant_tickets_view');
    if (v === 'card' || v === 'compact') setViewMode(v);
  }, []);
  const changeView = (v: 'card' | 'compact') => {
    setViewMode(v);
    try { localStorage.setItem('consultant_tickets_view', v); } catch { /* ignore */ }
  };

  // ── Filters ──
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Deep-link support: a ?tab= (e.g. from a dashboard status tile) preselects it.
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab) setActiveTab(tab);
  }, []);

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

  // ── Single filtered source ── dropdowns + date + search (NO category tab). The
  // category tab badges AND the card list both derive from this, so the counts
  // reflect the active dropdown filters (they can't diverge from the cards).
  const dropdownFilteredTickets = useMemo(() => {
    const nowTime = Date.now();
    return myAssignedTickets.filter(t => {
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
          matchesTicketNumber(t.ticketNumber, q) ||
          t.title.toLowerCase().includes(q) ||
          t.organization.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [myAssignedTickets, statusFilter, priorityFilter, dateFilter, customStartDate, customEndDate, searchQuery]);

  // Card list = the single filtered source + the active category tab, then sorted
  // (escalated+acknowledged first). Its category counts equal the tab badges.
  const filteredTickets = useMemo(() => {
    const result = activeTab === 'all'
      ? dropdownFilteredTickets
      : dropdownFilteredTickets.filter(t => categoryOf(t) === activeTab);
    return [...result].sort((a, b) => {
      const aEscAck = (a.isEscalated && a.escalationAcknowledgedAt) ? 1 : 0;
      const bEscAck = (b.isEscalated && b.escalationAcknowledgedAt) ? 1 : 0;
      if (aEscAck !== bEscAck) return bEscAck - aEscAck;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [dropdownFilteredTickets, activeTab]);

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
    triggerToast(`Status of ${activeTicket?.ticketNumber || activeTicketId} updated to "${statusValue}".`);
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
  // Shared reconciling tally — every ticket lands in exactly one bucket.
  const counts = useMemo(() => categoryCounts(dropdownFilteredTickets), [dropdownFilteredTickets]);

  // TanStack column model for the compact list view (sortable, paginated, row-styled).
  const consultantTicketColumns = useMemo<ColumnDef<any, unknown>[]>(() => [
    { id: 'ticket', accessorKey: 'ticketNumber', header: 'Ticket ID',
      cell: ({ row }) => { const t = row.original; const { isLocked } = getTicketMeta(t); const isEscAck = t.isEscalated && t.escalationAcknowledgedAt; return (
        <div className="flex items-center gap-1.5 flex-wrap font-bold text-ink-secondary whitespace-nowrap">
          <span>{t.ticketNumber || t.id}</span>
          {isEscAck && <Badge variant="destructive" className="text-[11px] font-bold py-0.5 px-1.5 uppercase leading-none h-4">TOP PRIORITY</Badge>}
          {isLocked && <Lock size={9} className="text-ink-muted" />}
        </div>); } },
    { id: 'customer', accessorKey: 'organization', header: 'Customer',
      cell: ({ row }) => <span className="font-semibold text-ink-secondary truncate max-w-[150px] inline-block align-middle" title={row.original.organization}>{row.original.organization}</span> },
    { id: 'subject', accessorKey: 'title', header: 'Subject',
      cell: ({ row }) => <Link href={`/consultant/tickets/${row.original.id}`} onClick={(e) => e.stopPropagation()} className="font-bold text-ink hover:text-blue-600 transition-colors truncate max-w-[320px] inline-block align-middle">{row.original.title}</Link> },
    { id: 'modules', accessorKey: 'sapModule', header: 'Modules', enableSorting: false,
      cell: ({ row }) => <Badge variant="outline" className="text-[11px] font-bold uppercase bg-surface-muted text-ink-secondary border-line hover:bg-surface-muted">{row.original.sapModule}</Badge> },
    { id: 'priority', accessorKey: 'priority', header: 'Priority',
      cell: ({ row }) => <PriorityBadge priority={row.original.priority} /> },
    { id: 'status', accessorKey: 'status', header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: 'age', accessorFn: (t: any) => getTicketMeta(t).age, header: 'Age',
      cell: ({ row }) => <span className="text-ink-secondary text-[11px] whitespace-nowrap">{getTicketMeta(row.original).age}d old</span> },
    { id: 'est', accessorFn: (t: any) => getTicketMeta(t).estHours, header: 'Est Hrs',
      cell: ({ row }) => <span className="block text-right font-semibold text-ink-secondary">{getTicketMeta(row.original).estHours.toFixed(1)}h</span> },
    { id: 'act', accessorFn: (t: any) => getTicketMeta(t).actHours, header: 'Act Hrs',
      cell: ({ row }) => <span className="block text-right font-semibold text-success">{getTicketMeta(row.original).actHours.toFixed(1)}h</span> },
    { id: 'updated', accessorKey: 'updatedAt', header: 'Updated',
      cell: ({ row }) => <span className="text-ink-muted text-[11px] whitespace-nowrap">{new Date(row.original.updatedAt).toLocaleDateString()}</span> },
    { id: 'actions', header: 'Actions', enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Link href={`/consultant/tickets/${row.original.id}`}><Button size="icon" variant="outline" className="h-7 w-7 text-ink-secondary cursor-pointer"><Eye size={12} /></Button></Link>
          <TicketActionMenu t={row.original} />
        </div>) },
  ], []);

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
        <DropdownMenuContent align="end" className="w-52 text-xs">
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
              className="cursor-pointer font-bold text-success-strong focus:text-success-strong"
              onClick={() => { setActiveTicketId(t.id); setActiveAction('quoteHours'); }}>
              <Timer size={12} className="mr-2" /> Quote Estimated Hours
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="cursor-pointer font-bold text-warning-strong focus:text-warning-strong"
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
            className="cursor-pointer font-bold text-success-strong focus:text-success-strong"
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
                className="cursor-pointer font-bold text-critical-strong focus:text-critical-strong"
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
        
        const isEscAck = t.isEscalated && t.escalationAcknowledgedAt;
        return (
          <Card key={t.id} onClick={() => openTicket(t.id)} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') openTicket(t.id); }} className={`bg-surface border border-line/80 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer ${isLocked ? 'border-line-strong bg-surface-muted/60 shadow-none' : ''} ${isEscAck ? 'border-l-4 border-l-destructive' : ''}`}>
            <div className="p-5 flex flex-col gap-4 flex-1">
              {/* Header row: ID, Priority, Status, Age */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${priCfg.dot} ${t.priority === 'Critical' ? 'animate-pulse' : ''}`} />
                  <span className="text-[11px] font-bold text-ink tracking-wider">{t.ticketNumber || t.id}</span>
                  {isLocked && <Lock size={10} className="text-ink-muted" />}
                </div>
                <div className="flex items-center gap-1.5">
                  {isEscAck && (
                    <Badge className="bg-red-150 text-critical-strong border-critical-border font-bold text-[11px] py-0 px-1 uppercase leading-none h-4">TOP PRIORITY</Badge>
                  )}
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                </div>
              </div>

              {/* Body: Subject & Description */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                  <Building2 size={12} className="text-ink-muted shrink-0" />
                  <span className="truncate">{t.organization}</span>
                </div>
                
                <Link href={`/consultant/tickets/${t.id}`} className="group">
                  <h3 className="text-xs font-bold text-ink leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {t.title}
                  </h3>
                </Link>
                <p className="text-[11px] text-ink-secondary line-clamp-3 leading-relaxed">
                  {t.description}
                </p>
              </div>

              {/* Badges: SAP Modules, Ticket Type */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[11px] font-bold uppercase px-1.5 py-0.5 bg-surface-muted text-ink-secondary border-line hover:bg-surface-muted">
                  {t.sapModule}
                </Badge>
                <Badge variant="outline" className="text-[11px] font-bold uppercase px-1.5 py-0.5 bg-info-soft/50 text-info-strong border-info-border hover:bg-info-soft/50">
                  {t.ticketType || 'Incident'}
                </Badge>
              </div>

              {/* Hours (Role Specific) */}
              <div className="bg-surface-muted border border-line p-3 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">{consultantType} Est</span>
                  <strong className="text-ink text-sm mt-0.5 block">{estHours.toFixed(1)} h</strong>
                </div>
                <div className="border-l border-line h-8 mx-2" />
                <div>
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">{consultantType} Act</span>
                  <strong className="text-success text-sm mt-0.5 block">{actHours.toFixed(1)} h</strong>
                </div>
              </div>

              {/* Progress Bar (Hours execution ratio) */}
              {estHours > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-ink-muted">
                    <span>Effort Logged</span>
                    <span>{completionPct}%</span>
                  </div>
                  <div className="w-full bg-surface-subtle rounded-full h-1 overflow-hidden">
                    <div className={`h-full rounded-full ${completionPct > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, completionPct)}%` }} />
                  </div>
                </div>
              )}

              {/* Footer: Created/Updated Date, Comment/Attachment count, Actions */}
              <div className="border-t border-line pt-3 flex items-center justify-between text-[11px] text-ink-muted mt-auto">
                <div className="space-y-0.5 text-ink-muted">
                  <div>Age: <strong>{age}d old</strong></div>
                  <div>Updated: <strong>{new Date(t.updatedAt).toLocaleDateString()}</strong></div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1" title="Comments count">
                    <MessageSquare size={11} className="text-ink-muted" />
                    <span>{t.comments?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Attachments count">
                    <Paperclip size={11} className="text-ink-muted" />
                    <span>{t.attachments?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 border-l border-line pl-3" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/consultant/tickets/${t.id}`}>
                      <Button size="icon" variant="outline" className="h-7 w-7 text-ink-secondary cursor-pointer" title="View details">
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
        <div className="md:col-span-2 xl:col-span-3 py-20 flex flex-col items-center justify-center text-ink-muted bg-surface border border-line rounded-2xl">
          <Flag size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-semibold">No tickets match your filters.</p>
          <p className="text-xs mt-1">Try resetting the status/priority filter or search query.</p>
        </div>
      )}
    </div>
  );

  // ── COMPACT LIST VIEW ──
  const CompactListView = () => (
    <TanstackTable
      columns={consultantTicketColumns}
      data={filteredTickets}
      pageSize={12}
      initialSort={[{ id: 'updated', desc: true }]}
      onRowClick={(t) => openTicket(t.id)}
      rowClassName={(t) => { const { isLocked } = getTicketMeta(t); const isEscAck = t.isEscalated && t.escalationAcknowledgedAt; return `${isLocked ? 'bg-surface-muted/25 ' : ''}${isEscAck ? 'border-l-4 border-l-destructive' : ''}`.trim() || undefined; }}
      emptyTitle="No tickets found"
      emptyDescription="No tickets match your query filters."
    />
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
        <Card className="bg-surface border border-line/80 shadow-2xl w-full max-w-lg overflow-hidden text-ink rounded-2xl">
          {/* Modal Header */}
          <div className="border-b border-line px-5 py-4 bg-surface-muted/60 backdrop-blur-md flex justify-between items-center">
            <div>
              <p className="text-[11px] text-ink-muted font-semibold uppercase tracking-widest font-sans">Action Panel</p>
              <h3 className="text-sm font-bold text-ink">{actionLabel[activeAction]} — <span className="text-xs">{activeTicket?.ticketNumber || activeTicketId}</span></h3>
            </div>
            <button onClick={closeActionModal} className="p-1.5 hover:bg-surface-subtle rounded text-ink-muted hover:text-ink-secondary transition cursor-pointer">
              <X size={14} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4 text-xs">
            {validationError && (
              <div className="p-3 bg-critical-soft text-red-800 border border-critical-border text-[11px] font-bold rounded flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                {validationError}
              </div>
            )}

            {/* CHANGE STATUS */}
            {activeAction === 'status' && (
              <form onSubmit={handleStatusSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="font-bold text-ink-secondary uppercase text-[11px] block">Select Transition Status</label>
                  <select value={statusValue} onChange={e => setStatusValue(e.target.value as TicketStatus)}
                    className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition" required>
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
                  <span className="text-[11px] text-ink-muted block">&quot;Request for Closure&quot; will prompt actual hours entry.</span>
                </div>
                <div className="flex justify-end gap-2 border-t border-line pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} className="text-[11px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" className="bg-ink text-white hover:bg-zinc-800 text-[11px] font-bold uppercase h-8 cursor-pointer">Apply Status</Button>
                </div>
              </form>
            )}

            {/* ADD COMMENT */}
            {activeAction === 'comment' && (
              <form onSubmit={handleCommentSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-ink-secondary uppercase text-[11px] block">Comment</label>
                  <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                    placeholder="Write your comment..." className="w-full bg-surface-muted border border-line rounded p-3 text-xs h-28 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition text-ink" required />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="internalCheck" checked={isInternalComment} onChange={e => setIsInternalComment(e.target.checked)} className="rounded border-line-strong" />
                  <label htmlFor="internalCheck" className="font-bold text-ink-secondary uppercase text-[11px] cursor-pointer select-none">
                    Internal Note (Consultant & Manager only)
                  </label>
                </div>
                <div className="flex justify-end gap-2 border-t border-line pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} className="text-[11px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" className="bg-ink text-white hover:bg-zinc-800 text-[11px] font-bold uppercase h-8 cursor-pointer">Submit Comment</Button>
                </div>
              </form>
            )}

            {/* ADD ATTACHMENT */}
            {activeAction === 'attachment' && (
              <form onSubmit={handleAttachmentSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold text-ink-secondary uppercase text-[11px] block">File Name</label>
                  <input type="text" placeholder="e.g. transport_log_AS360_102.txt" value={uploadFileName}
                    onChange={e => setUploadFileName(e.target.value)}
                    className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition" required />
                </div>
                <div className="flex justify-end gap-2 border-t border-line pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} className="text-[11px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" className="bg-ink text-white hover:bg-zinc-800 text-[11px] font-bold uppercase h-8 cursor-pointer">Upload File</Button>
                </div>
              </form>
            )}

            {/* QUOTE HOURS */}
            {activeAction === 'quoteHours' && (
              <form onSubmit={handleQuoteHoursSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] block">Functional Est. Hours</label>
                    <input type="number" step="0.5" placeholder="e.g. 10.0" value={estFuncHours}
                      onChange={e => setEstFuncHours(e.target.value)} min="0" required={consultantType === 'Functional'}
                      disabled={consultantType !== 'Functional'}
                      className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink disabled:opacity-50" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] block">Technical Est. Hours</label>
                    <input type="number" step="0.5" placeholder="e.g. 12.0" value={estTechHours}
                      onChange={e => setEstTechHours(e.target.value)} min="0" required={consultantType === 'Technical'}
                      disabled={consultantType !== 'Technical'}
                      className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink disabled:opacity-50" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-ink-secondary uppercase text-[11px] block">Remarks</label>
                  <textarea value={estRemarks} onChange={e => setEstRemarks(e.target.value)}
                    placeholder="Estimation scope remarks..." className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink h-20 focus:outline-none" />
                </div>
                <p className="text-[11px] text-ink-muted">First-time quote takes effect immediately.</p>
                <div className="flex justify-end gap-2 border-t border-line pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} className="text-[11px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" className="bg-ink text-white hover:bg-zinc-800 text-[11px] font-bold uppercase h-8 cursor-pointer">Submit Quote</Button>
                </div>
              </form>
            )}

            {/* REQUEST REVISION */}
            {activeAction === 'requestRevision' && (
              <form onSubmit={handleRevisionSubmit} className="space-y-4">
                <div className="bg-surface-muted p-2.5 border border-line rounded text-[11px] text-ink-secondary">
                  Current Quote: {activeTicketEst.totalEst}h (Func: {activeTicketEst.estFunc}h | Tech: {activeTicketEst.estTech}h)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] block">New Functional Hours</label>
                    <input type="number" step="0.5" value={estFuncHours} onChange={e => setEstFuncHours(e.target.value)} min="0" required={consultantType === 'Functional'}
                      disabled={consultantType !== 'Functional'}
                      className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink disabled:opacity-50" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] block">New Technical Hours</label>
                    <input type="number" step="0.5" value={estTechHours} onChange={e => setEstTechHours(e.target.value)} min="0" required={consultantType === 'Technical'}
                      disabled={consultantType !== 'Technical'}
                      className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink disabled:opacity-50" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-ink-secondary uppercase text-[11px] block">Justification (Mandatory)</label>
                  <textarea value={estRemarks} onChange={e => setEstRemarks(e.target.value)}
                    placeholder="Rationale for revision..." className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink h-20 focus:outline-none" required />
                </div>
                <p className="text-[11px] text-ink-muted">Revision requests take effect immediately.</p>
                <div className="flex justify-end gap-2 border-t border-line pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} className="text-[11px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" className="bg-ink text-white hover:bg-zinc-800 text-[11px] font-bold uppercase h-8 cursor-pointer">Submit Revision</Button>
                </div>
              </form>
            )}

            {/* RAISE CLOSURE */}
            {activeAction === 'raiseClosure' && (
              <form onSubmit={handleClosureSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] block">Functional Actual Hrs</label>
                    <input type="number" step="0.5" placeholder="e.g. 6.0" value={actFuncHours}
                      onChange={e => setActFuncHours(e.target.value)} min="0" required={consultantType === 'Functional'}
                      disabled={consultantType !== 'Functional'}
                      className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink disabled:opacity-50" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] block">Technical Actual Hrs</label>
                    <input type="number" step="0.5" placeholder="e.g. 8.0" value={actTechHours}
                      onChange={e => setActTechHours(e.target.value)} min="0" required={consultantType === 'Technical'}
                      disabled={consultantType !== 'Technical'}
                      className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink disabled:opacity-50" />
                  </div>
                </div>
                {[
                  { label: 'Work Completed Summary (Mandatory)', val: workSummary, set: setWorkSummary, ph: 'Outline all tasks completed...' },
                  { label: 'Root Cause (Mandatory)', val: rootCause, set: setRootCause, ph: 'Explain actual root cause...' },
                  { label: 'Resolution Summary (Mandatory)', val: resolutionSummary, set: setResolutionSummary, ph: 'Steps taken to resolve...' },
                ].map(({ label, val, set, ph }) => (
                  <div key={label} className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] block">{label}</label>
                    <textarea value={val} onChange={e => set(e.target.value)} placeholder={ph}
                      className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink h-16 focus:outline-none" required />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="font-bold text-ink-secondary uppercase text-[11px] block">Pending Items (Optional)</label>
                  <input type="text" value={pendingItems} onChange={e => setPendingItems(e.target.value)}
                    placeholder="e.g. transport release to PRD" className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink" />
                </div>
                <p className="text-[11px] text-ink-muted">Submitting closure locks the ticket pending Manager approval.</p>
                <div className="flex justify-end gap-2 border-t border-line pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} disabled={isSubmitting} className="text-[11px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-ink text-white hover:bg-zinc-800 text-[11px] font-bold uppercase h-8 cursor-pointer">
                    {isSubmitting ? 'Submitting...' : 'Submit Closure Request'}
                  </Button>
                </div>
              </form>
            )}

            {/* RESUBMIT CLOSURE */}
            {activeAction === 'resubmitClosure' && (
              <form onSubmit={handleResubmitClosureSubmit} className="space-y-3">
                <div className="p-3 bg-critical-soft text-red-800 border border-critical-border rounded text-xs mb-2">
                  Previous Closure Request was rejected by Manager. Update and resubmit.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] block">Revised Functional Hrs</label>
                    <input type="number" step="0.5" value={actFuncHours} onChange={e => setActFuncHours(e.target.value)} min="0" required={consultantType === 'Functional'}
                      disabled={consultantType !== 'Functional'}
                      className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink disabled:opacity-50" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] block">Revised Technical Hrs</label>
                    <input type="number" step="0.5" value={actTechHours} onChange={e => setActTechHours(e.target.value)} min="0" required={consultantType === 'Technical'}
                      disabled={consultantType !== 'Technical'}
                      className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink disabled:opacity-50" />
                  </div>
                </div>
                {[
                  { label: 'Work Completed Summary', val: workSummary, set: setWorkSummary },
                  { label: 'Root Cause', val: rootCause, set: setRootCause },
                  { label: 'Resolution Summary', val: resolutionSummary, set: setResolutionSummary },
                ].map(({ label, val, set }) => (
                  <div key={label} className="space-y-1">
                    <label className="font-bold text-ink-secondary uppercase text-[11px] block">{label}</label>
                    <textarea value={val} onChange={e => set(e.target.value)}
                      className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink h-14 focus:outline-none" required />
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="font-bold text-ink-secondary uppercase text-[11px] block">Pending Items</label>
                  <input type="text" value={pendingItems} onChange={e => setPendingItems(e.target.value)}
                    className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink" />
                </div>
                <div className="flex justify-end gap-2 border-t border-line pt-3">
                  <Button type="button" variant="outline" onClick={closeActionModal} disabled={isSubmitting} className="text-[11px] font-bold uppercase h-8">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-ink text-white hover:bg-zinc-800 text-[11px] font-bold uppercase h-8 cursor-pointer">
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
    <div className="space-y-6 text-ink font-sans">

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-600 text-white font-semibold text-xs py-3 px-4 rounded-md shadow-2xl flex items-center gap-2 border border-emerald-500">
          <CheckCircle2 size={16} />
          {toastMsg}
        </div>
      )}

      {/* Modal — called as a function (not mounted as a component) so it never
          remounts/loses state on parent re-render. */}
      {ModalContent()}

      {/* Page Header */}
      <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">My Ticket Workspace</h1>
          <p className="text-ink-secondary text-xs mt-1">
            {consultantType} consultant — workload, hours, and closure workflows.
            Active Specialist: <span className="font-semibold text-ink">{consultantName}</span>
          </p>
        </div>
        {/* View Toggle */}
        <div className="flex items-center gap-1 border border-line bg-surface rounded-lg p-1 shadow-card">
          <button
            onClick={() => changeView('card')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold uppercase transition cursor-pointer ${viewMode === 'card' ? 'bg-ink text-white shadow' : 'text-ink-secondary hover:bg-surface-muted'}`}>
            <LayoutGrid size={12} /> Card
          </button>
          <button
            onClick={() => changeView('compact')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold uppercase transition cursor-pointer ${viewMode === 'compact' ? 'bg-ink text-white shadow' : 'text-ink-secondary hover:bg-surface-muted'}`}>
            <List size={12} /> List
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={val => { setActiveTab(val); setCurrentPage(1); }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="bg-surface-subtle border border-line h-auto p-0.5 rounded-lg flex flex-wrap gap-1">
            {TICKET_CATEGORIES.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="text-[11px] uppercase font-bold data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-card px-2.5 py-1.5 cursor-pointer">
                {tab.label} <Badge variant="outline" className="ml-1.5 text-[11px] px-1 bg-surface-muted">{counts[tab.key] ?? 0}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Search + Filters */}
          <div className="space-y-4 mt-4 w-full">
            <div className="relative w-full">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search tickets..."
                className="bg-surface border border-line rounded-md pl-9 pr-3 py-2 text-xs text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition w-full"
              />
            </div>
            <TicketFilterPanel
              enabledFilters={['priority', 'status', 'dateSelect']}
              priorityFilter={priorityFilter}
              setPriorityFilter={(val) => { setPriorityFilter(val); setCurrentPage(1); }}
              statusFilter={statusFilter}
              setStatusFilter={(val) => { setStatusFilter(val); setCurrentPage(1); }}
              dateFilter={dateFilter}
              setDateFilter={(val) => { setDateFilter(val); setCurrentPage(1); }}
              startDateFilter={customStartDate}
              setStartDateFilter={(val) => { setCustomStartDate(val); setCurrentPage(1); }}
              endDateFilter={customEndDate}
              setEndDateFilter={(val) => { setCustomEndDate(val); setCurrentPage(1); }}
              onResetFilters={() => {
                setPriorityFilter('All');
                setStatusFilter('All');
                setDateFilter('All');
                setCustomStartDate('');
                setCustomEndDate('');
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between mt-2.5">
          <p className="text-[11px] text-ink-muted uppercase tracking-wider font-semibold">
            {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} found in your queue
          </p>
        </div>

        {/* Ticket display */}
        <TabsContent value={activeTab} className="mt-3">
          {loading ? (
            <div className="py-16 text-center text-ink-secondary font-bold uppercase text-xs">Synchronizing active workspace registry...</div>
          ) : myAssignedTickets.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-ink-muted bg-surface border border-line rounded-2xl space-y-2 shadow-card">
              <BrandedLogo width={36} height={36} iconOnly={true} className="mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider">No tickets assigned yet.</h3>
              <p className="text-xs text-ink-secondary max-w-sm mx-auto text-center">There are no tickets assigned to you yet.</p>
            </div>
          ) : viewMode === 'card' ? (
            CardView()
          ) : (
            CompactListView()
          )}
        </TabsContent>
      </Tabs>

      {/* Pagination (card view; compact list paginates internally) */}
      {viewMode === 'card' && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-line">
          <span className="text-[11px] text-ink-secondary uppercase tracking-wider">
            Page {currentPage} of {totalPages} · {filteredTickets.length} tickets
          </span>
          <div className="flex gap-2">
            <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              variant="outline" className="h-8 px-3 text-[11px] font-bold gap-1 cursor-pointer">
              <ChevronLeft size={12} /> Prev
            </Button>
            <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              variant="outline" className="h-8 px-3 text-[11px] font-bold gap-1 cursor-pointer">
              Next <ChevronRight size={12} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
