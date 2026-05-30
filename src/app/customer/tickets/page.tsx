'use client';

import React, { useState, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { BrandedLogo } from '../../../components/ui/BrandedLogo';
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpDown,
  FileSpreadsheet,
  Flame,
  Trash2,
  Eye,
  MessageSquare,
  Paperclip,
  Clock,
  HelpCircle,
  AlertTriangle,
  FolderOpen,
  Upload,
  X
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../../components/ui/dropdown-menu';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../../components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../../components/ui/tooltip';

interface PendingAttachment {
  id: string;
  file: File;
  progress: number;
  previewUrl?: string;
}

export default function CustomerTicketsPage() {
  const { tickets, loading, requestEscalation, requestDelete, updateTicket, addComment } = useTickets();
  const { user } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [scopeFilter, setScopeFilter] = useState('All');

  // Sorting state
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog Operation states
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [attachFileName, setAttachFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateSeverity, setEscalateSeverity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [escalateFiles, setEscalateFiles] = useState<PendingAttachment[]>([]);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const customerCompany = user?.company || 'Apex Global Industries';
  const companyTickets = useMemo(() => {
    return tickets.filter(t => t.organization === customerCompany && t.softDeleteStatus !== 'Archived');
  }, [tickets, customerCompany]);

  const now = Date.now();

  // Helper: Compute Ticket Age in Days
  const getTicketAgeDays = (t: any) => {
    const start = new Date(t.createdAt).getTime();
    const end = t.status === 'Closed' || t.status === 'Resolved'
      ? new Date(t.resolvedAt || t.closedAt || now).getTime()
      : now;
    return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
  };

  // Helper: SLA Status for Incidents
  const getSlaStatus = (t: any) => {
    const isInc = t.ticketType === 'Incident' || !t.ticketType;
    if (!isInc || t.slaDueAt === 'SLA Not Applicable') return 'Not Applicable';

    const start = new Date(t.createdAt).getTime();
    const due = new Date(t.slaDueAt).getTime();
    const end = t.status === 'Resolved' || t.status === 'Closed'
      ? new Date(t.resolvedAt || t.closedAt || now).getTime()
      : now;

    if (end > due) return 'Breached';
    
    // SLA warning: remaining time is less than 30% of total SLA time
    const totalSlaTime = due - start;
    const remainingTime = due - now;
    if (t.status !== 'Resolved' && t.status !== 'Closed' && remainingTime > 0 && (remainingTime / totalSlaTime) <= 0.3) {
      return 'Warning';
    }
    
    return 'Healthy';
  };

  // Helper: Sum Approved efforts hours logged
  const getConsumedHours = (t: any) => {
    return (t.efforts || [])
      .filter((e: any) => e.status === 'Approved')
      .reduce((sum: number, e: any) => sum + e.hoursLogged, 0);
  };

  // Column Visibility Config - 20 togglable fields + Actions
  const columnsList = [
    { key: 'sno', label: 'S.No', defaultVisible: true },
    { key: 'id', label: 'Ticket ID', defaultVisible: true },
    { key: 'createdBy', label: 'Created By', defaultVisible: true },
    { key: 'createdAt', label: 'Created At', defaultVisible: true },
    { key: 'title', label: 'Subject', defaultVisible: true },
    { key: 'sapModules', label: 'SAP Modules', defaultVisible: true },
    { key: 'ticketType', label: 'Ticket Type', defaultVisible: true },
    { key: 'functionalOrTechnical', label: 'Functional / Technical', defaultVisible: true },
    { key: 'priority', label: 'Priority', defaultVisible: true },
    { key: 'status', label: 'Status', defaultVisible: true },
    { key: 'slaStatus', label: 'SLA Status', defaultVisible: true },
    { key: 'age', label: 'Ticket Age', defaultVisible: true },
    { key: 'currentOwner', label: 'Current Owner', defaultVisible: true },
    { key: 'functionalConsultant', label: 'Functional Consultant', defaultVisible: false },
    { key: 'technicalConsultant', label: 'Technical Consultant', defaultVisible: false },
    { key: 'quotedHours', label: 'Quoted Hours', defaultVisible: false },
    { key: 'consumedHours', label: 'Consumed Hours', defaultVisible: false },
    { key: 'attachments', label: 'Attachments', defaultVisible: false },
    { key: 'comments', label: 'Comments', defaultVisible: false },
    { key: 'updatedAt', label: 'Last Updated', defaultVisible: true }
  ];

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    columnsList.reduce((acc, col) => ({ ...acc, [col.key]: col.defaultVisible }), {})
  );

  const toggleColumn = (colKey: string) => {
    setVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  // Sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter Data
  const filteredTickets = useMemo(() => {
    return companyTickets.filter(t => {
      // Search Box
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Status
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;

      // Module
      if (moduleFilter !== 'All') {
        const mods = t.sapModules && t.sapModules.length > 0 ? t.sapModules : [t.sapModule || 'FICO'];
        if (!mods.includes(moduleFilter as any)) return false;
      }

      // Priority
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;

      // Ticket Type
      if (typeFilter !== 'All') {
        const type = t.ticketType || 'Incident';
        if (type !== typeFilter) return false;
      }

      // Scope Classification
      if (scopeFilter !== 'All') {
        const ft = t.functionalOrTechnical || 'Functional';
        if (ft !== scopeFilter) return false;
      }

      return true;
    });
  }, [companyTickets, searchQuery, statusFilter, moduleFilter, priorityFilter, typeFilter, scopeFilter]);

  // Sort Data
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'age') {
        valA = getTicketAgeDays(a);
        valB = getTicketAgeDays(b);
      } else if (sortField === 'consumedHours') {
        valA = getConsumedHours(a);
        valB = getConsumedHours(b);
      } else if (sortField === 'slaStatus') {
        valA = getSlaStatus(a);
        valB = getSlaStatus(b);
      } else if (sortField === 'sapModules') {
        valA = (a.sapModules || [a.sapModule]).join(', ');
        valB = (b.sapModules || [b.sapModule]).join(', ');
      } else if (sortField === 'createdBy') {
        valA = a.createdByName || a.requestedBy || '';
        valB = b.createdByName || b.requestedBy || '';
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
  }, [filteredTickets, sortField, sortOrder]);

  // Pagination bounds
  const totalItems = sortedTickets.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = sortedTickets.slice(indexOfFirstItem, indexOfLastItem);

  // SLA Color Class logic
  const getSlaBadge = (t: any) => {
    const sla = getSlaStatus(t);
    if (sla === 'Healthy') {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-250 text-[9px] font-mono font-bold rounded px-1.5 py-0">
          Healthy
        </Badge>
      );
    }
    if (sla === 'Warning') {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-250 text-[9px] font-mono font-bold rounded px-1.5 py-0">
          Warning
        </Badge>
      );
    }
    if (sla === 'Breached') {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[9px] font-mono font-bold rounded px-1.5 py-0 animate-pulse">
          Breached
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-zinc-100 text-zinc-400 border-zinc-200 text-[9px] font-mono font-bold rounded px-1.5 py-0">
        N/A
      </Badge>
    );
  };

  // Priority badge logic
  const getPriorityBadge = (prio: string) => {
    if (prio === 'Critical') {
      return (
        <Badge className="bg-red-600 hover:bg-red-600 text-white text-[9px] font-mono font-bold rounded px-1.5 py-0">
          Critical
        </Badge>
      );
    }
    if (prio === 'High') {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[9px] font-mono font-bold rounded px-1.5 py-0">
          High
        </Badge>
      );
    }
    if (prio === 'Medium') {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-mono font-bold rounded px-1.5 py-0">
          Medium
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-zinc-50 text-zinc-500 border-zinc-200 text-[9px] font-mono font-bold rounded px-1.5 py-0">
        Low
      </Badge>
    );
  };

  // Status badge logic
  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      New: 'bg-zinc-100 text-zinc-500 border-zinc-200',
      Unassigned: 'bg-amber-50 text-amber-700 border-amber-250',
      Assigned: 'bg-zinc-100 text-zinc-800 border-zinc-200',
      'In Progress': 'bg-zinc-100 text-zinc-850 border-zinc-250',
      'Waiting for Customer': 'bg-amber-50 text-amber-700 border-amber-250',
      'Waiting for Internal Team': 'bg-zinc-100 text-zinc-800 border-zinc-200',
      Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-250',
      Closed: 'bg-emerald-50 text-emerald-700 border-emerald-250',
      Reopened: 'bg-red-50 text-red-700 border-red-250'
    };

    return (
      <Badge variant="outline" className={`text-[9px] font-mono font-bold rounded px-1.5 py-0 ${classes[status] || 'bg-zinc-50 text-zinc-650'}`}>
        {status === 'Waiting for Customer' ? 'Awaiting Customer' : status === 'Waiting for Internal Team' ? 'Awaiting Internal' : status}
      </Badge>
    );
  };

  // Age badge logic
  const getAgeBadge = (t: any) => {
    const ageDays = getTicketAgeDays(t);
    const label = `${ageDays.toFixed(1)}d`;
    if (ageDays <= 2) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-250 text-[9px] font-mono font-bold rounded px-1.5 py-0">
          {label}
        </Badge>
      );
    }
    if (ageDays <= 7) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-250 text-[9px] font-mono font-bold rounded px-1.5 py-0">
          {label}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[9px] font-mono font-bold rounded px-1.5 py-0">
        {label}
      </Badge>
    );
  };

  // CSV Spreadsheet Export Trigger
  const handleDownloadCSV = () => {
    const headers = columnsList.map(c => c.label);
    const rows = sortedTickets.map((t: any) =>
      columnsList.map(col => {
        let val = t[col.key];
        if (col.key === 'age') val = getTicketAgeDays(t).toFixed(2);
        if (col.key === 'consumedHours') val = getConsumedHours(t).toFixed(1);
        if (col.key === 'slaStatus') val = getSlaStatus(t);
        if (col.key === 'sapModules') val = (t.sapModules || [t.sapModule]).join(';');
        if (col.key === 'createdBy') val = t.createdByName || t.requestedBy || '';
        if (col.key === 'attachments') val = t.attachments?.length || 0;
        if (col.key === 'comments') val = t.comments?.length || 0;
        if (val === undefined || val === null) return '';
        return String(val).replace(/"/g, '""');
      })
    );

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tickets_registry_${customerCompany.toLowerCase().replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Actions Dialog Triggers
  const handleTriggerEdit = (t: any) => {
    setActiveTicketId(t.id);
    setEditTitle(t.title);
    setEditDesc(t.description);
    setIsEditOpen(true);
  };

  const handleTriggerComment = (t: any) => {
    setActiveTicketId(t.id);
    setCommentText('');
    setIsCommentOpen(true);
  };

  const handleTriggerAttachment = (t: any) => {
    setActiveTicketId(t.id);
    setAttachFileName('');
    setIsAttachmentOpen(true);
  };

  const handleTriggerEscalate = (t: any) => {
    setActiveTicketId(t.id);
    setEscalateReason('');
    setEscalateSeverity('Medium');
    setIsEscalateOpen(true);
  };

  const handleTriggerDelete = (t: any) => {
    setActiveTicketId(t.id);
    setDeleteReason('');
    setIsDeleteOpen(true);
  };

  // Actions Submissions
  const submitEdit = () => {
    if (!activeTicketId || !editTitle.trim()) return;
    updateTicket(activeTicketId, { title: editTitle, description: editDesc });
    setIsEditOpen(false);
  };

  const submitComment = () => {
    if (!activeTicketId || !commentText.trim() || !user) return;
    addComment(activeTicketId, commentText, user.name, user.email, 'Customer', false);
    setIsCommentOpen(false);
  };

  const submitAttachment = () => {
    if (!activeTicketId || !attachFileName.trim() || !user) return;
    setIsUploading(true);
    setTimeout(() => {
      const ticket = companyTickets.find(t => t.id === activeTicketId);
      if (ticket) {
        const newAttach = {
          id: `a-${Date.now()}`,
          ticketId: activeTicketId,
          fileName: attachFileName,
          filePath: `/files/${attachFileName}`,
          fileUrl: `/files/${attachFileName}`,
          fileType: attachFileName.split('.').pop() || 'txt',
          fileSize: 1024 * 145,
          uploadedBy: user.name,
          visibility: 'public' as const,
          createdAt: new Date().toISOString()
        };
        updateTicket(activeTicketId, { attachments: [...(ticket.attachments || []), newAttach] });
      }
      setIsUploading(false);
      setIsAttachmentOpen(false);
    }, 1200);
  };

  const handleEscalateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const newFiles = selected.map(file => {
      const id = `${Date.now()}-${file.name}`;
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      const pendingFile: PendingAttachment = { id, file, progress: 0, previewUrl };
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setEscalateFiles(prev => prev.map(f => f.id === id ? { ...f, progress: currentProgress } : f));
        if (currentProgress >= 100) clearInterval(interval);
      }, 50);
      return pendingFile;
    });
    setEscalateFiles(prev => [...prev, ...newFiles]);
  };

  const removeEscalateFile = (id: string) => {
    setEscalateFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const submitEscalate = async () => {
    if (!activeTicketId || !escalateReason.trim() || !user) return;
    const filesToSubmit = escalateFiles.filter(f => f.progress >= 100).map(f => ({
      fileName: f.file.name,
      fileSize: f.file.size,
      fileType: f.file.type || f.file.name.split('.').pop() || 'pdf',
      fileObj: f.file
    }));
    await requestEscalation(activeTicketId, escalateReason, escalateSeverity, user.name, filesToSubmit.length > 0 ? filesToSubmit : undefined);
    setIsEscalateOpen(false);
    setEscalateFiles([]);
  };

  const submitDelete = () => {
    if (!activeTicketId || !deleteReason.trim() || !user) return;
    requestDelete(activeTicketId, deleteReason, user.name);
    setIsDeleteOpen(false);
  };

  // Synchronous text file export
  const handleExportTextReport = (ticket: any) => {
    const ageVal = getTicketAgeDays(ticket).toFixed(1);
    const effortsVal = getConsumedHours(ticket).toFixed(1);
    const content = `SAP SUPPORT DESK - TICKET RECORD EXPORT
==================================================
Ticket ID      : ${ticket.id}
Created By     : ${ticket.createdByName || ticket.requestedBy}
Created At     : ${new Date(ticket.createdAt).toLocaleString()}
Subject        : ${ticket.title}
SAP Modules    : ${(ticket.sapModules || [ticket.sapModule]).join(', ')}
Type           : ${ticket.ticketType || 'Incident'}
Classification : ${ticket.functionalOrTechnical || 'Functional'}
Priority       : ${ticket.priority}
Status         : ${ticket.status}
SLA Status     : ${getSlaStatus(ticket)}
Active Age     : ${ageVal} days
Consumed Hours : ${effortsVal} hrs
Quoted Hours   : ${(ticket.quotedHours || 0).toFixed(1)} hrs
--------------------------------------------------
Description:
${ticket.description}
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket_report_${ticket.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-zinc-200 pb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight font-mono text-zinc-950 uppercase flex items-center gap-1.5">
              <FolderOpen size={18} />
              SAP Service Desk Registry
            </h1>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              Review and manage support request records assigned under organization <span className="font-bold text-zinc-800">{customerCompany}</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/customer/create-ticket"
              className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-900 text-white rounded-lg font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus size={13} />
              Submit Ticket
            </Link>
            <Button
              onClick={handleDownloadCSV}
              variant="outline"
              className="h-8.5 text-[10px] font-mono font-bold uppercase tracking-wider border-zinc-200 hover:border-zinc-950 flex items-center gap-1.5"
            >
              <FileSpreadsheet size={13} />
              Export CSV Sheet ({totalItems})
            </Button>
          </div>
        </div>

        {/* Filtering Panel */}
        <Card className="border-zinc-200 shadow-sm bg-white">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by Ticket ID / Subject..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950 font-mono"
                />
              </div>

              {/* Column visibility checkbox menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-8.5 text-[10px] font-mono font-bold uppercase tracking-wider border-zinc-200 flex items-center gap-1 text-zinc-700">
                    <SlidersHorizontal size={13} />
                    <span>Toggle Fields</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 font-mono text-[10px] bg-white border border-zinc-200 rounded-lg shadow-md max-h-64 overflow-y-auto">
                  <DropdownMenuLabel>Visible Table Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {columnsList.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.key}
                      checked={visibleColumns[col.key]}
                      onCheckedChange={() => toggleColumn(col.key)}
                      className="cursor-pointer hover:bg-zinc-50 py-1"
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 border-t border-zinc-100 pt-4">
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[11px] font-mono text-zinc-800 focus:outline-none focus:border-zinc-950"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Waiting for Customer">Awaiting Customer</option>
                  <option value="Waiting for Internal Team">Awaiting Internal</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                  <option value="Reopened">Reopened</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">SAP Module</label>
                <select
                  value={moduleFilter}
                  onChange={(e) => { setModuleFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[11px] font-mono text-zinc-800 focus:outline-none"
                >
                  <option value="All">All Modules</option>
                  <option value="FICO">FICO</option>
                  <option value="MM">MM</option>
                  <option value="SD">SD</option>
                  <option value="PP">PP</option>
                  <option value="BASIS">BASIS</option>
                  <option value="ABAP">ABAP</option>
                  <option value="SuccessFactors">SuccessFactors</option>
                  <option value="Security/GRC">Security/GRC</option>
                  <option value="CPI/Integration">CPI/Integration</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[11px] font-mono text-zinc-800 focus:outline-none"
                >
                  <option value="All">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Ticket Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[11px] font-mono text-zinc-800 focus:outline-none"
                >
                  <option value="All">All Types</option>
                  <option value="Incident">Incident</option>
                  <option value="Service Request">Service Request</option>
                  <option value="Enhancement Request">Enhancement Request</option>
                  <option value="Change Request">Change Request</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Classification</label>
                <select
                  value={scopeFilter}
                  onChange={(e) => { setScopeFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[11px] font-mono text-zinc-800 focus:outline-none"
                >
                  <option value="All">All Scope</option>
                  <option value="Functional">Functional</option>
                  <option value="Technical">Technical</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table Workspace */}
        <Card className="border-zinc-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] w-full">
              <Table className="min-w-[1200px]">
                <TableHeader className="sticky top-0 bg-zinc-50 z-10 border-b border-zinc-200">
                  <TableRow>
                    {columnsList.map((col) => {
                      if (!visibleColumns[col.key]) return null;
                      const isSortable = ['id', 'createdAt', 'title', 'priority', 'status', 'slaStatus', 'age', 'updatedAt'].includes(col.key);
                      return (
                        <TableHead
                          key={col.key}
                          onClick={() => isSortable && handleSort(col.key)}
                          className={`text-[9px] font-bold text-zinc-500 uppercase tracking-wider py-3.5 px-4 cursor-pointer select-none font-mono ${
                            isSortable ? 'hover:bg-zinc-100 hover:text-zinc-950' : ''
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span>{col.label}</span>
                            {isSortable && <ArrowUpDown size={10} className="text-zinc-450 shrink-0" />}
                          </div>
                        </TableHead>
                      );
                    })}
                    <TableHead className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider py-3.5 px-4 text-right font-mono sticky right-0 bg-zinc-50 z-10 border-l border-zinc-200">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Skeleton load placeholders
                    Array.from({ length: 5 }).map((_, rIdx) => (
                      <TableRow key={rIdx} className="bg-zinc-50/50">
                        {columnsList.map((col) => {
                          if (!visibleColumns[col.key]) return null;
                          return (
                            <TableCell key={col.key} className="py-4 px-4">
                              <Skeleton className="h-3 w-16" />
                            </TableCell>
                          );
                        })}
                        <TableCell className="py-4 px-4 sticky right-0 bg-zinc-50/50 border-l border-zinc-200">
                          <Skeleton className="h-6 w-8 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : companyTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columnsList.length + 1} className="py-24 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <BrandedLogo width={36} height={36} iconOnly={true} className="opacity-40" />
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono">No tickets created yet.</h3>
                            <p className="text-xs text-zinc-500 max-w-sm mx-auto font-mono">Submit a support ticket to get started.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : currentTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columnsList.length + 1} className="py-24 text-center text-zinc-400 font-mono italic text-xs">
                        Zero tickets matched the filtering parameters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentTickets.map((t: any, idx) => {
                      const serialNumber = indexOfFirstItem + idx + 1;
                      const ownerName = t.currentOwner || t.assignedConsultant || 'Support Desk';
                      const isFunc = (t.functionalOrTechnical || 'Functional') === 'Functional';
                      const isTech = (t.functionalOrTechnical || 'Functional') === 'Technical';
                      const functionalConsultant = isFunc ? (t.assignedConsultant || 'Unassigned') : '-';
                      const technicalConsultant = isTech ? (t.assignedConsultant || 'Unassigned') : '-';

                      return (
                        <TableRow key={t.id} className="hover:bg-zinc-50/50 border-b border-zinc-100 transition-colors">
                          {columnsList.map((col) => {
                            if (!visibleColumns[col.key]) return null;

                            if (col.key === 'sno') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-mono font-bold text-zinc-500 text-[10px]">
                                  {serialNumber}
                                </TableCell>
                              );
                            }
                            if (col.key === 'id') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-mono font-bold text-zinc-950 text-[11px]">
                                  <Link href={`/customer/tickets/${t.id}`} className="hover:underline hover:text-zinc-600">
                                    {t.id}
                                  </Link>
                                </TableCell>
                              );
                            }
                            if (col.key === 'createdBy') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 text-zinc-650 truncate max-w-[120px]" title={t.createdByName || t.requestedBy}>
                                  {t.createdByName || t.requestedBy || '-'}
                                </TableCell>
                              );
                            }
                            if (col.key === 'createdAt') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-mono text-zinc-500 whitespace-nowrap">
                                  {new Date(t.createdAt).toLocaleDateString()}
                                </TableCell>
                              );
                            }
                            if (col.key === 'title') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="max-w-[200px] truncate font-semibold text-zinc-900 cursor-help">
                                        {t.title}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs font-sans text-xs bg-zinc-950 text-white rounded p-2">
                                      {t.title}
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                              );
                            }
                            if (col.key === 'sapModules') {
                              const mods = t.sapModules && t.sapModules.length > 0 ? t.sapModules : [t.sapModule || 'FICO'];
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 max-w-[150px]">
                                  <div className="flex flex-wrap gap-1">
                                    {mods.map((m: string) => (
                                      <Badge key={m} variant="outline" className="text-[8px] font-mono bg-zinc-50 text-zinc-700 border-zinc-300 rounded px-1 py-0">
                                        {m}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                              );
                            }
                            if (col.key === 'ticketType') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-mono text-zinc-650 text-[10px]">
                                  {t.ticketType || 'Incident'}
                                </TableCell>
                              );
                            }
                            if (col.key === 'functionalOrTechnical') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-mono text-[9px] uppercase font-bold text-zinc-500">
                                  {t.functionalOrTechnical || 'Functional'}
                                </TableCell>
                              );
                            }
                            if (col.key === 'priority') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4">
                                  {getPriorityBadge(t.priority)}
                                </TableCell>
                              );
                            }
                            if (col.key === 'status') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4">
                                  {getStatusBadge(t.status)}
                                </TableCell>
                              );
                            }
                            if (col.key === 'slaStatus') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4">
                                  {getSlaBadge(t)}
                                </TableCell>
                              );
                            }
                            if (col.key === 'age') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4">
                                  {getAgeBadge(t)}
                                </TableCell>
                              );
                            }
                            if (col.key === 'currentOwner') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-medium text-zinc-700 truncate max-w-[120px]" title={ownerName}>
                                  {ownerName}
                                </TableCell>
                              );
                            }
                            if (col.key === 'functionalConsultant') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-mono text-zinc-600 truncate max-w-[120px]" title={functionalConsultant}>
                                  {functionalConsultant}
                                </TableCell>
                              );
                            }
                            if (col.key === 'technicalConsultant') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-mono text-zinc-600 truncate max-w-[120px]" title={technicalConsultant}>
                                  {technicalConsultant}
                                </TableCell>
                              );
                            }
                            if (col.key === 'quotedHours') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-mono text-zinc-950 font-bold text-right">
                                  {(t.quotedHours || 0).toFixed(1)}h
                                </TableCell>
                              );
                            }
                            if (col.key === 'consumedHours') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-mono text-zinc-950 font-bold text-right">
                                  {getConsumedHours(t).toFixed(1)}h
                                </TableCell>
                              );
                            }
                            if (col.key === 'attachments') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-mono text-center font-bold text-zinc-600">
                                  {t.attachments?.length || 0}
                                </TableCell>
                              );
                            }
                            if (col.key === 'comments') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-mono text-center font-bold text-zinc-600">
                                  {t.comments?.length || 0}
                                </TableCell>
                              );
                            }
                            if (col.key === 'updatedAt') {
                              return (
                                <TableCell key={col.key} className="py-2.5 px-4 font-mono text-zinc-500 whitespace-nowrap">
                                  {new Date(t.updatedAt).toLocaleDateString()}
                                </TableCell>
                              );
                            }

                            return null;
                          })}

                          {/* Actions Dropdown sticky right cell */}
                          <TableCell className="py-2.5 px-4 text-right whitespace-nowrap sticky right-0 bg-white z-10 border-l border-zinc-200">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-7 w-7 p-0 hover:bg-zinc-100 border border-zinc-200">
                                  <SlidersHorizontal size={12} className="text-zinc-600" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 font-mono text-[11px] bg-white border border-zinc-200 shadow-md p-1">
                                <DropdownMenuLabel>Workspace Options</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem asChild className="cursor-pointer hover:bg-zinc-50">
                                  <Link href={`/customer/tickets/${t.id}`} className="flex items-center gap-2 w-full">
                                    <Eye size={12} className="text-zinc-500" />
                                    <span>View Workspace</span>
                                  </Link>
                                </DropdownMenuItem>

                                {/* Edit Detail (unassigned ticket only) */}
                                {!t.assignedConsultant && t.status === 'New' && (
                                  <DropdownMenuItem
                                    onClick={() => handleTriggerEdit(t)}
                                    className="cursor-pointer hover:bg-zinc-50 flex items-center gap-2 w-full"
                                  >
                                    <SlidersHorizontal size={12} className="text-zinc-500" />
                                    <span>Edit Description</span>
                                  </DropdownMenuItem>
                                )}

                                {/* Add Comment */}
                                <DropdownMenuItem
                                  onClick={() => handleTriggerComment(t)}
                                  className="cursor-pointer hover:bg-zinc-50 flex items-center gap-2 w-full"
                                >
                                  <MessageSquare size={12} className="text-zinc-500" />
                                  <span>Add Comment</span>
                                </DropdownMenuItem>

                                {/* Add Attachment */}
                                <DropdownMenuItem
                                  onClick={() => handleTriggerAttachment(t)}
                                  className="cursor-pointer hover:bg-zinc-50 flex items-center gap-2 w-full"
                                >
                                  <Paperclip size={12} className="text-zinc-500" />
                                  <span>Add Attachment</span>
                                </DropdownMenuItem>

                                {/* Export Ticket text report */}
                                <DropdownMenuItem
                                  onClick={() => handleExportTextReport(t)}
                                  className="cursor-pointer hover:bg-zinc-50 flex items-center gap-2 w-full"
                                >
                                  <FileSpreadsheet size={12} className="text-zinc-500" />
                                  <span>Export Ticket</span>
                                </DropdownMenuItem>

                                {/* Escalate (if active) */}
                                {t.status !== 'Closed' && t.status !== 'Resolved' && !t.escalationFlag && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleTriggerEscalate(t)}
                                      className="cursor-pointer hover:bg-red-50 text-red-600 hover:text-red-700 flex items-center gap-2 w-full"
                                    >
                                      <Flame size={12} className="text-red-500" />
                                      <span>Escalate Ticket</span>
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {/* Request Delete (if active) */}
                                {t.softDeleteStatus === 'Active' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleTriggerDelete(t)}
                                      className="cursor-pointer hover:bg-red-50 text-red-650 hover:text-red-750 flex items-center gap-2 w-full"
                                    >
                                      <Trash2 size={12} className="text-red-500" />
                                      <span>Request Deletion</span>
                                    </DropdownMenuItem>
                                  </>
                                )}

                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Footer Pagination console */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border border-zinc-200 rounded-lg p-4 bg-white shadow-sm font-mono text-[11px]">
            <div className="text-zinc-500 font-bold">
              Showing <span className="text-zinc-900">{indexOfFirstItem + 1}</span> to{' '}
              <span className="text-zinc-900">{Math.min(indexOfLastItem, totalItems)}</span> of{' '}
              <span className="text-zinc-900 font-black">{totalItems}</span> matching records
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="h-8 px-2 font-mono flex items-center border-zinc-200"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </Button>
              <div className="flex items-center px-3 border border-zinc-200 rounded-lg bg-zinc-50 font-bold">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="h-8 px-2 font-mono flex items-center border-zinc-200"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* WORKSPACE OPERATION DIALOGS */}

        {/* 1. Edit Description Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-zinc-200 font-mono text-xs">
            <DialogHeader>
              <DialogTitle>Edit Ticket Details: {activeTicketId}</DialogTitle>
              <DialogDescription>
                Modify ticket subject or description details before resources are allocated.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">Ticket Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Enter descriptive subject summary..."
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">Detailed Description</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the issue, workflow conditions, error transactions, or desired scope additions..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="h-8 text-[10px] uppercase font-bold" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" className="h-8 text-[10px] uppercase font-bold bg-zinc-950 text-white" onClick={submitEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2. Add Comment Dialog */}
        <Dialog open={isCommentOpen} onOpenChange={setIsCommentOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-zinc-200 font-mono text-xs">
            <DialogHeader>
              <DialogTitle>Add Comment Response: {activeTicketId}</DialogTitle>
              <DialogDescription>
                Post a response, validation check feedback, or info request update directly on this ticket.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">Comment Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type your comment, query response, or additional instructions..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="h-8 text-[10px] uppercase font-bold" onClick={() => setIsCommentOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" className="h-8 text-[10px] uppercase font-bold bg-zinc-950 text-white" onClick={submitComment}>
                Submit Comment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 3. Add Attachment Dialog */}
        <Dialog open={isAttachmentOpen} onOpenChange={setIsAttachmentOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-zinc-200 font-mono text-xs">
            <DialogHeader>
              <DialogTitle>Upload Ticket Attachment: {activeTicketId}</DialogTitle>
              <DialogDescription>
                Attach screenshot files, log dump texts, or custom configuration documents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. error_dump_fico.txt or sap_invoice_block.png"
                  value={attachFileName}
                  onChange={(e) => setAttachFileName(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs text-zinc-950 focus:outline-none focus:border-zinc-950"
                />
              </div>
              {isUploading && (
                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-[9px] text-zinc-550">
                    <span>Uploading attachment...</span>
                    <span>100%</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-zinc-950 h-1.5 rounded-full animate-pulse w-full"></div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="h-8 text-[10px] uppercase font-bold" onClick={() => setIsAttachmentOpen(false)} disabled={isUploading}>
                Cancel
              </Button>
              <Button variant="default" className="h-8 text-[10px] uppercase font-bold bg-zinc-950 text-white" onClick={submitAttachment} disabled={isUploading || !attachFileName.trim()}>
                Upload File
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 4. Escalate Ticket Dialog */}
        <Dialog open={isEscalateOpen} onOpenChange={setIsEscalateOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-zinc-200 font-mono text-xs">
            <DialogHeader>
              <DialogTitle>Submit SLA Escalation: {activeTicketId}</DialogTitle>
              <DialogDescription>
                Flag this ticket as an active SLA escalation, alerting SAP Managers immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">Severity Level</label>
                <select
                  value={escalateSeverity}
                  onChange={(e: any) => setEscalateSeverity(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950"
                >
                  <option value="Medium">Medium Alarm</option>
                  <option value="High">High Severity Alarm</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">Escalation Rationale</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this ticket is being escalated (e.g. system downtime, critical project blockages, SLA breached)..."
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">Escalation Attachments</label>
                <div className="relative border-2 border-dashed border-zinc-200 rounded-xl p-4 bg-zinc-50/50 hover:bg-orange-50/30 hover:border-orange-300 transition flex flex-col items-center justify-center gap-1 cursor-pointer group">
                  <input
                    type="file"
                    multiple
                    onChange={handleEscalateFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*,application/pdf,application/zip,application/x-zip-compressed"
                  />
                  <Upload size={16} className="text-zinc-400 group-hover:text-orange-500 transition" />
                  <span className="text-xs text-zinc-650 font-medium">Select files to attach</span>
                  <span className="text-[10px] text-zinc-400">Max 10MB per file</span>
                </div>

                {escalateFiles.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {escalateFiles.map((pf) => (
                      <div key={pf.id} className="relative flex items-center gap-3 p-2 bg-zinc-50 border border-zinc-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-900 truncate pr-6">{pf.file.name}</p>
                          <p className="text-[10px] text-zinc-450">{(pf.file.size / 1024).toFixed(0)} KB</p>
                          <div className="w-full bg-zinc-200 rounded-full h-1 mt-1 overflow-hidden">
                            <div className="bg-orange-500 h-full transition-all duration-300 rounded-full" style={{ width: `${pf.progress}%` }}></div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEscalateFile(pf.id)}
                          className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 p-0.5 rounded-full hover:bg-red-50 transition"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="h-8 text-[10px] uppercase font-bold" onClick={() => setIsEscalateOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" className="h-8 text-[10px] uppercase font-bold bg-zinc-950 text-white" onClick={submitEscalate}>
                Submit Escalation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 5. Request Delete Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-zinc-200 font-mono text-xs">
            <DialogHeader>
              <DialogTitle>Request Soft-Delete: {activeTicketId}</DialogTitle>
              <DialogDescription>
                Initiate a soft-deletion request workflow. Requires validation approvals from Managers and Admins.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider block">Deletion Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this ticket should be deleted (e.g. duplicate, invalid scope, solved internally)..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="h-8 text-[10px] uppercase font-bold" onClick={() => setIsDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="h-8 text-[10px] uppercase font-bold bg-red-650 hover:bg-red-750 text-white" onClick={submitDelete}>
                Request Deletion
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}
