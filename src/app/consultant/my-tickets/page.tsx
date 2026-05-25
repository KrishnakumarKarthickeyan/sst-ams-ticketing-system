'use client';

import React, { useState, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import {
  Search,
  Filter,
  Layers,
  ChevronDown,
  Eye,
  Settings,
  MoreVertical,
  Activity,
  MessageSquare,
  Paperclip,
  Check,
  X,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Lock
} from 'lucide-react';
import { SAPModule, TicketPriority, TicketStatus, EffortActivityType, TicketType, FunctionalOrTechnical } from '../../../types/ticket';

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
  const consultantName = user?.name || 'Karthik Subramanian';

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Sorting
  const [sortField, setSortField] = useState<string>('id');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Active modals action
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<
    | 'status'
    | 'comment'
    | 'attachment'
    | 'quoteHours'
    | 'requestRevision'
    | 'raiseClosure'
    | 'resubmitClosure'
    | null
  >(null);

  // Form states
  const [statusValue, setStatusValue] = useState<TicketStatus | ''>('');
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState('240'); // in kb
  
  // Estimation fields
  const [estFuncHours, setEstFuncHours] = useState('');
  const [estTechHours, setEstTechHours] = useState('');
  const [estRemarks, setEstRemarks] = useState('');

  // Closure fields
  const [actFuncHours, setActFuncHours] = useState('');
  const [actTechHours, setActTechHours] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [pendingItems, setPendingItems] = useState('');

  const [toastMsg, setToastMsg] = useState('');

  // Base scope filters (only assigned tickets)
  const myAssignedTickets = useMemo(() => {
    return tickets.filter(t => t.assignedConsultant === consultantName);
  }, [tickets, consultantName]);

  // Apply filters
  const filteredTickets = useMemo(() => {
    return myAssignedTickets.filter(t => {
      if (clientFilter !== 'All' && t.organization !== clientFilter) return false;
      if (moduleFilter !== 'All' && t.sapModule !== moduleFilter) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (typeFilter !== 'All' && t.ticketType !== typeFilter) return false;

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
  }, [myAssignedTickets, clientFilter, moduleFilter, priorityFilter, statusFilter, typeFilter, searchQuery]);

  // Apply sorting
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      let valA: any = a[sortField as keyof typeof a];
      let valB: any = b[sortField as keyof typeof b];

      if (sortField === 'lastUpdated') {
        valA = new Date(a.updatedAt).getTime();
        valB = new Date(b.updatedAt).getTime();
      }

      if (valA === undefined) return 1;
      if (valB === undefined) return -1;

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredTickets, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedTickets.length / itemsPerPage);
  const paginatedTickets = useMemo(() => {
    return sortedTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [sortedTickets, currentPage]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const clientsList = useMemo(() => Array.from(new Set(myAssignedTickets.map(t => t.organization))), [myAssignedTickets]);
  const modulesList = useMemo(() => Array.from(new Set(myAssignedTickets.map(t => t.sapModule))), [myAssignedTickets]);

  const activeTicket = useMemo(() => tickets.find(t => t.id === activeTicketId), [tickets, activeTicketId]);

  const activeTicketEst = useMemo(() => {
    if (!activeTicket) return { estFunc: 0, estTech: 0, totalEst: 0 };
    const latestEst = (activeTicket.hourEstimates || [])
      .filter(e => e.status === 'Submitted' || e.status === 'Revision Approved')
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
    const estFunc = latestEst?.functionalEstimatedHours || (activeTicket.functionalOrTechnical !== 'Technical' ? activeTicket.quotedHours || 0 : 0);
    const estTech = latestEst?.technicalEstimatedHours || (activeTicket.functionalOrTechnical === 'Technical' ? activeTicket.quotedHours || 0 : 0);
    return {
      estFunc,
      estTech,
      totalEst: estFunc + estTech
    };
  }, [activeTicket]);

  // Modal Handlers
  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !statusValue) return;

    updateTicketStatus(activeTicketId, statusValue, consultantName);
    triggerToast(`Status of ${activeTicketId} updated to "${statusValue}".`);
    closeActionModal();
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !commentText.trim()) return;

    addComment(
      activeTicketId,
      commentText,
      consultantName,
      user?.email || 'consultant@sap.com',
      'Consultant',
      isInternalComment
    );
    triggerToast(`Comment added as ${isInternalComment ? 'Internal Note' : 'Public Reply'}.`);
    closeActionModal();
  };

  const handleAttachmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !uploadFileName) return;

    addComment(
      activeTicketId,
      `Uploaded file: ${uploadFileName}`,
      consultantName,
      user?.email || 'consultant@sap.com',
      'Consultant',
      false,
      [{ fileName: uploadFileName, fileSize: Number(uploadFileSize) * 1024, fileType: 'application/octet-stream' }]
    );
    triggerToast(`File "${uploadFileName}" uploaded successfully.`);
    closeActionModal();
  };

  const handleQuoteHoursSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !estFuncHours || !estTechHours) return;

    quoteEstimatedHours(activeTicketId, {
      functionalEstimatedHours: Number(estFuncHours),
      technicalEstimatedHours: Number(estTechHours),
      remarks: estRemarks,
      submittedBy: consultantName
    });
    triggerToast(`Estimated hours successfully quoted for ticket ${activeTicketId}.`);
    closeActionModal();
  };

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !estFuncHours || !estTechHours) return;

    requestEstimateRevision(activeTicketId, {
      functionalEstimatedHours: Number(estFuncHours),
      technicalEstimatedHours: Number(estTechHours),
      remarks: estRemarks,
      submittedBy: consultantName
    });
    triggerToast(`Estimate revision request submitted for ticket ${activeTicketId}.`);
    closeActionModal();
  };

  const handleClosureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !actFuncHours || !actTechHours || !workSummary.trim() || !rootCause.trim() || !resolutionSummary.trim()) return;

    raiseClosureRequest(activeTicketId, {
      functionalActualHours: Number(actFuncHours),
      technicalActualHours: Number(actTechHours),
      workCompletedSummary: workSummary,
      rootCause,
      resolutionSummary,
      pendingItems: pendingItems || undefined,
      requestedBy: consultantName
    });
    triggerToast(`Closure request successfully submitted for ticket ${activeTicketId}.`);
    closeActionModal();
  };

  const handleResubmitClosureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !actFuncHours || !actTechHours || !workSummary.trim() || !rootCause.trim() || !resolutionSummary.trim()) return;

    const latestCls = activeTicket?.closureRequests?.[activeTicket.closureRequests.length - 1];
    if (!latestCls) return;

    resubmitClosureRequest(activeTicketId, latestCls.id, {
      functionalActualHours: Number(actFuncHours),
      technicalActualHours: Number(actTechHours),
      workCompletedSummary: workSummary,
      rootCause,
      resolutionSummary,
      pendingItems: pendingItems || undefined,
      requestedBy: consultantName
    });
    triggerToast(`Closure request resubmitted for ticket ${activeTicketId}.`);
    closeActionModal();
  };

  const closeActionModal = () => {
    setActiveTicketId(null);
    setActiveAction(null);
    setStatusValue('');
    setCommentText('');
    setIsInternalComment(false);
    setUploadFileName('');
    setEstFuncHours('');
    setEstTechHours('');
    setEstRemarks('');
    setActFuncHours('');
    setActTechHours('');
    setWorkSummary('');
    setRootCause('');
    setResolutionSummary('');
    setPendingItems('');
  };

  return (
    <div className="space-y-6 font-sans bg-zinc-50 text-zinc-950 min-h-screen p-6 md:p-8">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-600 text-zinc-900 font-semibold text-xs py-3 px-4 rounded-md shadow-2xl flex items-center gap-2 border border-emerald-500 animate-slide-in">
          <CheckCircle2 size={16} />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold uppercase text-zinc-900 tracking-tight font-mono">Incident Backlog Registry</h1>
          <p className="text-zinc-600 text-sm mt-1">
            Enterprise workload tracker showing functional / technical breakdowns and closure workflows.
          </p>
        </div>
      </div>

      {/* Filters backdrop card */}
      <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Keyword Search */}
          <div className="col-span-1 sm:col-span-2 relative">
            <label className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider block mb-1">Search Keywords</label>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket ID, title, description..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-300 font-mono"
              />
            </div>
          </div>

          {/* Client Filter */}
          <div>
            <label className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider block mb-1">Customer / Client</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded p-1.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-300"
            >
              <option value="All">All Customers</option>
              {clientsList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* SAP Module Filter */}
          <div>
            <label className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider block mb-1">SAP Module</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded p-1.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-300"
            >
              <option value="All">All Modules</option>
              {modulesList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider block mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded p-1.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-300"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="font-bold text-zinc-500 uppercase text-[9px] tracking-wider block mb-1">Workflow Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded p-1.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-300"
            >
              <option value="All">All Statuses</option>
              <option value="Requirement Gathering">Requirement Gathering</option>
              <option value="Waiting for Hours Approval">Waiting for Hours Approval</option>
              <option value="In Progress - Technical">In Progress - Technical</option>
              <option value="In Progress - Functional">In Progress - Functional</option>
              <option value="Raised to SAP">Raised to SAP</option>
              <option value="Customer Action">Customer Action</option>
              <option value="Request for Closure">Request for Closure</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

        </div>
      </div>

      {/* 17-COLUMN TICKET REGISTRY TABLE */}
      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col justify-between">
        <div className="overflow-x-auto w-full relative">
          <table className="w-full text-left border-collapse table-auto min-w-[1800px]">
            <thead>
              <tr className="bg-zinc-50 text-zinc-600 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider font-mono">
                <th className="py-3.5 px-3 text-center border-r border-zinc-200 w-16">S.No</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('id')}>Ticket ID</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('organization')}>Customer</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 w-96">Subject</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 w-28">SAP Modules</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 w-24 text-center">Priority</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 w-36">Status</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 w-32">Classification</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 text-center w-28">Est Func Hrs</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 text-center w-28">Est Tech Hrs</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 text-center w-28">Act Func Hrs</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 text-center w-28">Act Tech Hrs</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 text-center w-28">Total Est</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 text-center w-28">Total Act</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 w-40">Closure Status</th>
                <th className="py-3.5 px-3 border-r border-zinc-200 w-28 cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('lastUpdated')}>Last Updated</th>
                <th className="py-3.5 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800 text-xs text-zinc-700">
              {loading ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-zinc-600 font-bold uppercase font-mono">Loading Backlog Registry...</td>
                </tr>
              ) : paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-zinc-500 italic">No tickets assigned to you match this filter.</td>
                </tr>
              ) : (
                paginatedTickets.map((t, idx) => {
                  const sNo = (currentPage - 1) * itemsPerPage + idx + 1;
                  
                  // Compute Estimations
                  const latestEst = (t.hourEstimates || [])
                    .filter(e => e.status === 'Submitted' || e.status === 'Revision Approved')
                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
                  
                  // Compute Actuals
                  const latestCls = (t.closureRequests || [])
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

                  // Compute Estimations & Actuals from Efforts
                  const activeEfforts = (t.consultantEfforts || []).filter(e => !e.isDeleted);
                  const hasEfforts = activeEfforts.length > 0;

                  const estFunc = hasEfforts 
                    ? activeEfforts.filter(e => e.consultantType === 'Functional').reduce((s, c) => s + c.estimatedHours, 0)
                    : latestEst?.functionalEstimatedHours || (t.functionalOrTechnical !== 'Technical' ? t.quotedHours || 0 : 0);

                  const estTech = hasEfforts
                    ? activeEfforts.filter(e => e.consultantType === 'Technical').reduce((s, c) => s + c.estimatedHours, 0)
                    : latestEst?.technicalEstimatedHours || (t.functionalOrTechnical === 'Technical' ? t.quotedHours || 0 : 0);

                  const totalEst = hasEfforts
                    ? activeEfforts.reduce((s, c) => s + c.estimatedHours, 0)
                    : latestEst?.totalEstimatedHours || t.quotedHours || 0;

                  const actFunc = hasEfforts
                    ? activeEfforts.filter(e => e.consultantType === 'Functional').reduce((s, c) => s + c.actualHours, 0)
                    : latestCls?.functionalActualHours || 0;

                  const actTech = hasEfforts
                    ? activeEfforts.filter(e => e.consultantType === 'Technical').reduce((s, c) => s + c.actualHours, 0)
                    : latestCls?.technicalActualHours || 0;

                  const totalAct = hasEfforts
                    ? activeEfforts.reduce((s, c) => s + c.actualHours, 0)
                    : latestCls?.totalActualHours || 0;

                  const closureStatus = latestCls ? latestCls.status : 'N/A';
                  const isRowLocked = t.status === 'Closed' || (t.status === 'Request for Closure' && closureStatus === 'Pending Manager Approval');
                  
                  return (
                    <tr key={t.id} className="hover:bg-zinc-100/60 border-b border-zinc-200/80 transition">
                      <td className="py-3 px-3 text-center border-r border-zinc-200/60 text-zinc-500 font-mono">{sNo}</td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 whitespace-nowrap">
                        <Link href={`/consultant/tickets/${t.id}`} className="font-bold text-zinc-900 hover:underline flex items-center gap-1 font-mono">
                          {t.id}
                          <ArrowUpRight size={10} className="text-zinc-500" />
                        </Link>
                      </td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 font-semibold text-zinc-900 truncate max-w-[140px]" title={t.organization}>{t.organization}</td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 font-medium text-zinc-950 max-w-[240px] truncate" title={t.title}>{t.title}</td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-zinc-50 border border-zinc-200 rounded font-bold text-zinc-600 text-[9px] uppercase font-mono">
                          {t.sapModule}
                        </span>
                      </td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border font-mono ${
                          t.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                          t.priority === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          t.priority === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-zinc-100 text-zinc-800 border-zinc-200'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3 border-r border-zinc-200/60">
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase font-mono ${
                          t.status === 'Requirement Gathering' ? 'bg-zinc-100 text-zinc-800 border-zinc-200' :
                          t.status === 'Waiting for Hours Approval' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          t.status === 'In Progress - Technical' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          t.status === 'In Progress - Functional' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                          t.status.startsWith('In Progress') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          t.status === 'Raised to SAP' ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold' :
                          t.status === 'Customer Action' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          t.status === 'Request for Closure' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          t.status === 'Closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          t.status === 'Reopened' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-zinc-100 text-zinc-800 border-zinc-200'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 font-mono text-[10px]">{t.functionalOrTechnical || 'Functional'}</td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 text-center font-mono">{estFunc.toFixed(1)} h</td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 text-center font-mono">{estTech.toFixed(1)} h</td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 text-center font-mono text-emerald-450">{actFunc.toFixed(1)} h</td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 text-center font-mono text-emerald-455">{actTech.toFixed(1)} h</td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 text-center font-mono font-bold text-zinc-950">{totalEst.toFixed(1)} h</td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 text-center font-mono font-bold text-emerald-500">{totalAct.toFixed(1)} h</td>
                      <td className="py-3 px-3 border-r border-zinc-200/60">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold ${
                          closureStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          closureStatus === 'Pending Manager Approval' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          closureStatus === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-zinc-100 text-zinc-800 border-zinc-200'
                        }`}>
                          {closureStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 border-r border-zinc-200/60 text-zinc-500 whitespace-nowrap font-mono">{new Date(t.updatedAt).toLocaleDateString()}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Link href={`/consultant/tickets/${t.id}`} className="p-1 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 rounded text-zinc-600 hover:text-zinc-900" title="View details Workspace">
                            <Eye size={12} />
                          </Link>
                          
                          {isRowLocked ? (
                            <span className="p-1 border border-zinc-200 rounded text-zinc-400 bg-zinc-50 cursor-not-allowed inline-block" title="Locked - Pending Manager Review">
                              <Lock size={12} />
                            </span>
                          ) : (
                            <div className="relative group">
                              <button className="p-1 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 rounded text-zinc-600 hover:text-zinc-900">
                                <MoreVertical size={12} />
                              </button>
                              
                              {/* Action Dropdown */}
                              <div className="hidden group-hover:block absolute right-0 mt-0.5 z-30 bg-white border border-zinc-200 rounded-md shadow-xl w-52 text-[11px] text-left py-1 text-zinc-700">
                                <button
                                  onClick={() => {
                                    setActiveTicketId(t.id);
                                    setStatusValue(t.status);
                                    setActiveAction('status');
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-900 flex items-center gap-1.5 font-semibold"
                                >
                                  Change Status
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveTicketId(t.id);
                                    setActiveAction('comment');
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-900 flex items-center gap-1.5 font-semibold"
                                >
                                  Add Comment
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveTicketId(t.id);
                                    setActiveAction('attachment');
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-900 flex items-center gap-1.5 font-semibold"
                                >
                                  Add Attachment
                                </button>
                                
                                {/* Conditionally show quote hours if no estimate has been submitted */}
                                {(t.hourEstimates || []).length === 0 ? (
                                  <button
                                    onClick={() => {
                                      setActiveTicketId(t.id);
                                      setActiveAction('quoteHours');
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-900 text-emerald-600 flex items-center gap-1.5 font-semibold"
                                  >
                                    Quote Estimated Hours
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setActiveTicketId(t.id);
                                      setEstFuncHours(estFunc.toString());
                                      setEstTechHours(estTech.toString());
                                      setActiveAction('requestRevision');
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-900 text-amber-600 flex items-center gap-1.5 font-semibold"
                                  >
                                    Request Estimate Revision
                                  </button>
                                )}

                                {t.status !== 'Closed' && t.status !== 'Request for Closure' && (
                                  <button
                                    onClick={() => {
                                      setActiveTicketId(t.id);
                                      setActFuncHours(actFunc.toString());
                                      setActTechHours(actTech.toString());
                                      setWorkSummary('');
                                      setRootCause('');
                                      setResolutionSummary('');
                                      setPendingItems('');
                                      setActiveAction('raiseClosure');
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-900 text-emerald-600 flex items-center gap-1.5 font-semibold"
                                  >
                                    Raise Closure Request
                                  </button>
                                )}

                                {latestCls?.status === 'Rejected' && (
                                  <button
                                    onClick={() => {
                                      setActiveTicketId(t.id);
                                      setActFuncHours(latestCls.functionalActualHours.toString());
                                      setActTechHours(latestCls.technicalActualHours.toString());
                                      setWorkSummary(latestCls.workCompletedSummary);
                                      setRootCause(latestCls.rootCause);
                                      setResolutionSummary(latestCls.resolutionSummary);
                                      setPendingItems(latestCls.pendingItems || '');
                                      setActiveAction('resubmitClosure');
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-zinc-100 hover:text-zinc-900 text-red-655 flex items-center gap-1.5 font-semibold"
                                  >
                                    Resubmit Closure Request
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-zinc-50 px-4 py-3.5 border-t border-zinc-200 flex items-center justify-between font-mono text-[10px]">
          <span className="text-zinc-500 uppercase">
            Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedTickets.length)} of {sortedTickets.length} Incidents
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border border-zinc-200 rounded hover:border-zinc-300 disabled:opacity-40 disabled:hover:border-zinc-200 text-zinc-700 font-bold tracking-wide transition"
            >
              PREVIOUS
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 bg-white border border-zinc-200 rounded hover:border-zinc-300 disabled:opacity-40 disabled:hover:border-zinc-200 text-zinc-700 font-bold tracking-wide transition"
            >
              NEXT
            </button>
          </div>
        </div>

      </div>

      {/* OVERLAY ACTION DIALOG MODALS */}
      {activeAction && activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in text-zinc-900">
            
            {/* Modal Header */}
            <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex justify-between items-center font-bold uppercase text-[10px] tracking-wide text-zinc-900">
              <span>{activeAction.replace(/([A-Z])/g, ' $1')} &bull; {activeTicketId}</span>
              <button onClick={closeActionModal} className="p-1 hover:bg-zinc-100 rounded text-zinc-600 hover:text-zinc-900">
                <X size={14} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-5 max-h-[75vh] overflow-y-auto">
              
              {/* CHANGE STATUS FORM */}
              {activeAction === 'status' && (
                <form onSubmit={handleStatusSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-bold text-zinc-600 uppercase text-[9px]">Select Transition Status</label>
                    <select
                      value={statusValue}
                      onChange={(e) => setStatusValue(e.target.value as TicketStatus)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-300"
                      required
                    >
                      <option value="">-- Select Status --</option>
                      <option value="Requirement Gathering">1. Requirement Gathering</option>
                      <option value="Waiting for Hours Approval">2. Waiting for Hours Approval</option>
                      <option value="In Progress - Technical">3. In Progress - Technical</option>
                      <option value="In Progress - Functional">4. In Progress - Functional</option>
                      <option value="Raised to SAP">5. Raised to SAP</option>
                      <option value="Customer Action">6. Customer Action</option>
                      <option value="Request for Closure">7. Request for Closure</option>
                    </select>
                    <span className="text-[10px] text-zinc-500 block mt-1">Consultants are restricted from directly Closing tickets.</span>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                    <button type="button" onClick={closeActionModal} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Apply Status</button>
                  </div>
                </form>
              )}

              {/* ADD COMMENT FORM */}
              {activeAction === 'comment' && (
                <form onSubmit={handleCommentSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-600 uppercase text-[9px] block">Comment content</label>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Type comments, notes, or queries here..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs h-28 focus:outline-none focus:border-zinc-300 text-zinc-950 font-mono"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="internalCommentCheck"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="rounded accent-white"
                    />
                    <label htmlFor="internalCommentCheck" className="font-bold text-zinc-700 uppercase text-[9px] cursor-pointer">
                      Internal Note (Invisible to Customer)
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                    <button type="button" onClick={closeActionModal} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Submit Comment</button>
                  </div>
                </form>
              )}

              {/* ADD ATTACHMENT FORM */}
              {activeAction === 'attachment' && (
                <form onSubmit={handleAttachmentSubmit} className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">File Name</label>
                      <input
                        type="text"
                        placeholder="transport_request_log.txt"
                        value={uploadFileName}
                        onChange={(e) => setUploadFileName(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                    <button type="button" onClick={closeActionModal} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Upload</button>
                  </div>
                </form>
              )}

              {/* QUOTE ESTIMATED HOURS FORM */}
              {activeAction === 'quoteHours' && (
                <form onSubmit={handleQuoteHoursSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">Functional Estimated Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 10"
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
                        placeholder="e.g. 15"
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
                      placeholder="Explain estimation scope..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-20 focus:outline-none"
                    />
                  </div>

                  <div className="text-[10px] text-zinc-500 font-bold">
                    Note: First-time estimate quotation is auto-approved and will move the ticket status to "Waiting for Hours Approval".
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                    <button type="button" onClick={closeActionModal} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Submit Quote</button>
                  </div>
                </form>
              )}

              {/* REQUEST ESTIMATED HOURS REVISION */}
              {activeAction === 'requestRevision' && (
                <form onSubmit={handleRevisionSubmit} className="space-y-4">
                  <div className="bg-zinc-50 p-3 border border-zinc-200 rounded text-xs text-zinc-600 mb-2">
                    Current Quote: Functional: {activeTicketEst.estFunc}h | Technical: {activeTicketEst.estTech}h | Total: {activeTicketEst.totalEst}h
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">New Functional Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 12"
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
                        placeholder="e.g. 18"
                        value={estTechHours}
                        onChange={(e) => setEstTechHours(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-600 uppercase text-[9px]">Reason for Revision (Remarks)</label>
                    <textarea
                      value={estRemarks}
                      onChange={(e) => setEstRemarks(e.target.value)}
                      placeholder="State the justification for hours revision..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-20 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="text-[10px] text-amber-500 font-bold">
                    Attention: Revision requests require manager approval. The values will update once approved.
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                    <button type="button" onClick={closeActionModal} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Submit Revision Request</button>
                  </div>
                </form>
              )}

              {/* RAISE CLOSURE REQUEST */}
              {activeAction === 'raiseClosure' && (
                <form onSubmit={handleClosureSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-600 uppercase text-[9px]">Functional Actual Hours</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 8"
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
                        placeholder="e.g. 10"
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
                      value={workSummary}
                      onChange={(e) => setWorkSummary(e.target.value)}
                      placeholder="Outline all deliverables, customization steps, transports..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-16 focus:outline-none font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-red-400 uppercase text-[9px]">Root Cause (Mandatory)</label>
                    <textarea
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      placeholder="Explain root cause..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-16 focus:outline-none font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-red-400 uppercase text-[9px]">Resolution Summary (Mandatory)</label>
                    <textarea
                      value={resolutionSummary}
                      onChange={(e) => setResolutionSummary(e.target.value)}
                      placeholder="Detail resolution steps..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950 h-16 focus:outline-none font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-zinc-450 uppercase text-[9px]">Pending Items (If any)</label>
                    <input
                      type="text"
                      value={pendingItems}
                      onChange={(e) => setPendingItems(e.target.value)}
                      placeholder="e.g. transport import to PRD"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-950"
                    />
                  </div>

                  <div className="text-[10px] text-zinc-500">
                    Raising closure request will submit actual hours to Manager for approval. Ticket status becomes "Request for Closure".
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3">
                    <button type="button" onClick={closeActionModal} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Submit Closure Request</button>
                  </div>
                </form>
              )}

              {/* RESUBMIT CLOSURE REQUEST */}
              {activeAction === 'resubmitClosure' && (
                <form onSubmit={handleResubmitClosureSubmit} className="space-y-3">
                  <div className="bg-red-950/40 text-red-400 p-3 border border-red-900/30 rounded text-xs mb-2">
                    Previous Closure Request Rejected by Manager. Please revise and resubmit.
                  </div>

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
                      value={workSummary}
                      onChange={(e) => setWorkSummary(e.target.value)}
                      placeholder="Summary..."
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
                    <button type="button" onClick={closeActionModal} className="px-3 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded font-bold uppercase text-[10px]">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded font-bold uppercase text-[10px]">Resubmit Closure</button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
