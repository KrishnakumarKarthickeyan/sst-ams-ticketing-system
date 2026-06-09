'use client';

import React, { useState, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  X,
  LayoutGrid,
  List,
  Building2,
  Layers,
  Calendar
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { TicketFilterPanel } from '../../../components/tickets/TicketFilterPanel';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Skeleton } from '../../../components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '../../../components/ui/toggle-group';
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
  const router = useRouter();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [scopeFilter, setScopeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');

  React.useEffect(() => {
    const saved = localStorage.getItem('customer.ticketView');
    if (saved === 'card' || saved === 'table') {
      setViewMode(saved);
    }
  }, []);

  const handleViewModeChange = (val: 'table' | 'card') => {
    setViewMode(val);
    localStorage.setItem('customer.ticketView', val);
  };

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

  const activeTicket = useMemo(() => {
    return companyTickets.find(t => t.id === activeTicketId);
  }, [companyTickets, activeTicketId]);

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
    return (t.actualHoursLogs || [])
      .filter((ah: any) => ah.approvalStatus?.toLowerCase() === 'approved')
      .reduce((sum: number, ah: any) => sum + (ah.actualHours || 0), 0);
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
          (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q)) ||
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

      // Date range filtering
      if (dateFilter !== 'All') {
        const created = new Date(t.createdAt);
        const createdMs = created.getTime();
        
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

      return true;
    });
  }, [companyTickets, searchQuery, statusFilter, moduleFilter, priorityFilter, typeFilter, scopeFilter, dateFilter, customStartDate, customEndDate]);

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
Ticket Number  : ${ticket.ticketNumber}
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
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-zinc-200 rounded-lg p-3 shadow-sm">
            {/* Search */}
            <div className="relative w-full md:max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by Ticket ID / Subject..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-955 focus:outline-none focus:border-zinc-950 font-mono"
              />
            </div>

            {/* View Mode */}
            <div className="flex items-center gap-2">
              <ToggleGroup type="single" value={viewMode} onValueChange={(val) => { if (val) handleViewModeChange(val as 'table' | 'card'); }}>
                <ToggleGroupItem value="card" aria-label="Card View" className="h-8 px-2 border border-zinc-200 bg-white text-zinc-700 data-[state=on]:bg-zinc-100 data-[state=on]:text-zinc-900">
                  <LayoutGrid size={14} />
                </ToggleGroupItem>
                <ToggleGroupItem value="table" aria-label="Table View" className="h-8 px-2 border border-zinc-200 bg-white text-zinc-700 data-[state=on]:bg-zinc-100 data-[state=on]:text-zinc-900">
                  <List size={14} />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <TicketFilterPanel
            enabledFilters={['status', 'module', 'priority', 'type', 'scope', 'dateSelect']}
            statusFilter={statusFilter}
            setStatusFilter={(val) => { setStatusFilter(val); setCurrentPage(1); }}
            moduleFilter={moduleFilter}
            setModuleFilter={(val) => { setModuleFilter(val); setCurrentPage(1); }}
            priorityFilter={priorityFilter}
            setPriorityFilter={(val) => { setPriorityFilter(val); setCurrentPage(1); }}
            typeFilter={typeFilter}
            setTypeFilter={(val) => { setTypeFilter(val); setCurrentPage(1); }}
            scopeFilter={scopeFilter}
            setScopeFilter={(val) => { setScopeFilter(val); setCurrentPage(1); }}
            dateFilter={dateFilter}
            setDateFilter={(val) => { setDateFilter(val); setCurrentPage(1); }}
            startDateFilter={customStartDate}
            setStartDateFilter={(val) => { setCustomStartDate(val); setCurrentPage(1); }}
            endDateFilter={customEndDate}
            setEndDateFilter={(val) => { setCustomEndDate(val); setCurrentPage(1); }}
            onResetFilters={() => {
              setStatusFilter('All');
              setModuleFilter('All');
              setPriorityFilter('All');
              setTypeFilter('All');
              setScopeFilter('All');
              setDateFilter('All');
              setCustomStartDate('');
              setCustomEndDate('');
              setCurrentPage(1);
            }}
          />
        </div>


        {/* Data Table Workspace */}
        {loading ? (
          <div className={viewMode === 'card' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "w-full space-y-2"}>
            {Array.from({ length: 6 }).map((_, idx) => (
              viewMode === 'card' ? (
                <Card key={idx} className="border-zinc-200 shadow-sm bg-white overflow-hidden p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <div className="flex gap-1.5">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-12 w-full" />
                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </Card>
              ) : (
                <div key={idx} className="flex gap-4 p-3 border-b border-zinc-100 items-center">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              )
            ))}
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentTickets.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white border border-zinc-200 rounded-xl space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto">
                  <FolderOpen size={20} className="text-zinc-450" />
                </div>
                <p className="text-sm font-medium text-zinc-500">No tickets found matching your selection.</p>
              </div>
            ) : (
              currentTickets.map((t: any) => {
                const actualHours = t.actualHoursLogs ? t.actualHoursLogs.reduce((sum: number, log: any) => sum + (log.actualHours || 0), 0) : 0;
                const isIncident = t.ticketType === 'Incident' || !t.ticketType;
                const hasSla = isIncident && t.slaDueAt !== 'SLA Not Applicable';
                
                const getSlaStatus = () => {
                  if (!hasSla) return { label: 'Not Applicable', color: 'bg-zinc-100 text-zinc-500 border-zinc-200', dot: 'bg-zinc-400' };
                  const nowTime = Date.now();
                  const due = new Date(t.slaDueAt).getTime();
                  const resolved = t.resolvedAt ? new Date(t.resolvedAt).getTime() : null;
                  if (resolved) {
                    if (resolved > due) return { label: 'Breached', color: 'bg-red-50 text-red-650 border-red-200', dot: 'bg-red-500' };
                    return { label: 'Met', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' };
                  }
                  if (nowTime > due) return { label: 'Overdue', color: 'bg-red-50 text-red-650 border-red-200', dot: 'bg-red-500' };
                  if (due - nowTime < 12 * 60 * 60 * 1000) return { label: 'At Risk', color: 'bg-amber-50 text-amber-650 border-amber-200', dot: 'bg-amber-500' };
                  return { label: 'On Track', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' };
                };
                const sla = getSlaStatus();

                const createdDate = new Date(t.createdAt);
                const ageDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                
                const priorityColor = t.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                                      t.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                      t.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                      'bg-zinc-100 text-zinc-605 border-zinc-200';

                const statusColor = (t.status === 'Resolved' || t.status === 'Closed') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                     (t.status === 'Waiting for Customer' || t.status === 'Customer Action') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                     t.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                     'bg-indigo-50 text-indigo-700 border-indigo-200';

                return (
                  <Card key={t.id} className="border-zinc-200 shadow-sm bg-white overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-zinc-400">
                          {t.ticketNumber}
                        </span>
                        <div className="flex gap-1.5">
                          {t.escalationFlag && t.escalationAcknowledgedAt && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 border text-[9px] font-bold uppercase">Priority Handling</Badge>
                          )}
                          <Badge className={`${priorityColor} border text-[9px] font-bold uppercase`}>{t.priority}</Badge>
                          <Badge className={`${statusColor} border text-[9px] font-bold uppercase`}>{t.status}</Badge>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Link
                          href={`/customer/tickets/${t.id}`}
                          className="text-sm font-bold text-zinc-900 hover:text-zinc-950 hover:underline transition-all line-clamp-1 block leading-snug"
                        >
                          {t.title}
                        </Link>
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Layers size={11} className="text-zinc-400" />
                          {t.sapModule || 'General'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 size={11} className="text-zinc-400" />
                          {t.ticketType || 'Incident'}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${sla.color}`}>
                            <span className={`w-1 h-1 rounded-full ${sla.dot}`}></span>
                            SLA: {sla.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-500 font-mono">
                          <Clock size={12} className="text-zinc-400" />
                          <span>Logged: <strong className="text-zinc-800">{actualHours.toFixed(1)}h</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        Age: {ageDays === 0 ? 'Today' : `${ageDays} days`}
                      </span>
                      <Link
                        href={`/customer/tickets/${t.id}`}
                        className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 hover:text-zinc-950 transition flex items-center gap-1"
                      >
                        Manage Ticket
                        <ChevronRight size={12} />
                      </Link>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
          <Card className="border-zinc-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-zinc-50 border-b border-zinc-200">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase font-mono w-[120px] py-3 px-4">Ticket #</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase font-mono py-3 px-4">Title</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase font-mono w-[120px] py-3 px-4">Module</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase font-mono w-[150px] py-3 px-4">Status</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase font-mono w-[120px] py-3 px-4">Priority</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase font-mono w-[120px] py-3 px-4">Created</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase font-mono w-[120px] py-3 px-4">SLA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-zinc-500 font-medium">
                          No records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentTickets.map((t: any) => {
                        const isIncident = t.ticketType === 'Incident' || !t.ticketType;
                        const hasSla = isIncident && t.slaDueAt !== 'SLA Not Applicable';
                        
                        const getSlaStatus = () => {
                          if (!hasSla) return { label: 'N/A', color: 'bg-zinc-100 text-zinc-500 border-zinc-200', dot: 'bg-zinc-400' };
                          const nowTime = Date.now();
                          const due = new Date(t.slaDueAt).getTime();
                          const resolved = t.resolvedAt ? new Date(t.resolvedAt).getTime() : null;
                          if (resolved) {
                            if (resolved > due) return { label: 'Breached', color: 'bg-red-50 text-red-650 border-red-200', dot: 'bg-red-500' };
                            return { label: 'Met', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' };
                          }
                          if (nowTime > due) return { label: 'Overdue', color: 'bg-red-50 text-red-650 border-red-200', dot: 'bg-red-500' };
                          if (due - nowTime < 12 * 60 * 60 * 1000) return { label: 'At Risk', color: 'bg-amber-50 text-amber-650 border-amber-200', dot: 'bg-amber-500' };
                          return { label: 'On Track', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' };
                        };
                        const sla = getSlaStatus();

                        const priorityColor = t.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                                              t.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                              t.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                              'bg-zinc-100 text-zinc-650 border-zinc-200';

                        const statusColor = (t.status === 'Resolved' || t.status === 'Closed') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                             (t.status === 'Waiting for Customer' || t.status === 'Customer Action') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                             t.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                             'bg-indigo-50 text-indigo-700 border-indigo-200';

                        return (
                          <TableRow
                            key={t.id}
                            onClick={() => router.push(`/customer/tickets/${t.id}`)}
                            className="cursor-pointer hover:bg-zinc-50 transition-colors"
                          >
                            <TableCell className="font-mono font-bold text-xs text-zinc-500 py-3 px-4">
                              {t.ticketNumber}
                            </TableCell>
                            <TableCell className="font-semibold text-zinc-900 py-3 px-4">
                              {t.title}
                            </TableCell>
                            <TableCell className="font-medium text-zinc-600 font-mono text-[11px] py-3 px-4">
                              {t.sapModule || 'General'}
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <Badge className={`${statusColor} border text-[9px] font-bold uppercase`}>{t.status}</Badge>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <div className="flex gap-1.5 items-center">
                                <Badge className={`${priorityColor} border text-[9px] font-bold uppercase`}>{t.priority}</Badge>
                                {t.escalationFlag && t.escalationAcknowledgedAt && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 border text-[9px] font-bold uppercase">Priority Handling</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-zinc-500 font-mono text-xs py-3 px-4">
                              {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${sla.color}`}>
                                <span className={`w-1 h-1 rounded-full ${sla.dot}`}></span>
                                {sla.label}
                              </span>
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
        )}

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
              <DialogTitle>Edit Ticket Details: {activeTicket?.ticketNumber}</DialogTitle>
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
              <DialogTitle>Add Comment Response: {activeTicket?.ticketNumber}</DialogTitle>
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
              <DialogTitle>Upload Ticket Attachment: {activeTicket?.ticketNumber}</DialogTitle>
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
              <DialogTitle>Submit SLA Escalation: {activeTicket?.ticketNumber}</DialogTitle>
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
              <DialogTitle>Request Soft-Delete: {activeTicket?.ticketNumber}</DialogTitle>
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
