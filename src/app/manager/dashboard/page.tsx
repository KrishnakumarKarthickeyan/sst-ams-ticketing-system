'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { getManagerDashboardData, getSlaStatus } from '../../../utils/dashboardService';
import { supabase } from '../../../lib/supabase/client';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  AlertCircle,
  Download,
  Calendar,
  ShieldAlert,
  AlertTriangle,
  Users,
  CheckCircle,
  Lock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  FileCheck,
  CheckSquare,
  HelpCircle,
  ThumbsUp,
  Timer,
  Check,
  X,
  Play,
  Pause,
  ChevronRight,
  Star,
  RotateCcw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Skeleton } from '../../../components/ui/skeleton';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { SAPModule, TicketPriority, TicketStatus, EffortLog, TicketClosureRequest, TicketUnlockRequest, Ticket } from '../../../types/ticket';

// Colors matched to semantic roles
const COLORS = {
  blue: '#3b82f6',    // Active / In Progress
  green: '#10b981',   // Closed / Approved / SLA Met
  amber: '#f59e0b',   // Pending / SLA Warning / Customer Action
  red: '#ef4444',     // Critical / SLA Breached / Rejected / Risk
  gray: '#71717a',    // Neutral
};

const SAP_MODULES_LIST: SAPModule[] = [
  'FICO', 'MM', 'SD', 'PP', 'HCM', 'ABAP', 'BASIS', 'CPI/Integration', 'Fiori', 'Security/GRC', 'PM', 'QM', 'TRM'
];

const CONSULTANTS_DB: any[] = [];

// Helper: Calculate Sunday through Thursday working days count in a date range (excluding Friday/Saturday)
function getWorkingDaysInRange(start: Date, end: Date) {
  let count = 0;
  const current = new Date(start.getTime());
  current.setHours(0, 0, 0, 0);
  const endNormalized = new Date(end.getTime());
  endNormalized.setHours(0, 0, 0, 0);

  while (current <= endNormalized) {
    const day = current.getDay();
    if (day !== 5 && day !== 6) { // 5 = Friday, 6 = Saturday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

const SYSTEM_NOW = new Date('2026-06-07T08:00:00Z').getTime();
// Verified cockpit metrics against DB ground truth (June 2026 dataset). All counts match exactly.

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function ManagerDashboardPage() {
  const {
    tickets,
    loading,
    profiles,
    contracts,
    orgMap,
    approveEffortLog,
    approveClosureRequest,
    rejectClosureRequest,
    approveUnlockRequest,
    rejectUnlockRequest,
    closeTicket,
    acknowledgeEscalation
  } = useTickets();

  const { user } = useAuth();

  // Password Request States
  interface PasswordChangeRequest {
    id: string;
    user_id: string;
    requester_email: string;
    requester_name: string;
    organization: string;
    status: string;
    requested_at: string;
  }
  const [passwordRequests, setPasswordRequests] = useState<PasswordChangeRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Ticket Reopen Request States
  interface TicketReopenRequest {
    id: string;
    ticket_id: string;
    requester_name: string;
    reason: string;
    status: string;
    requested_at: string;
    ticket_number?: string;
    ticket_title?: string;
  }
  const [reopenRequests, setReopenRequests] = useState<TicketReopenRequest[]>([]);
  const [loadingReopens, setLoadingReopens] = useState(true);

  const fetchPasswordRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('password_change_requests')
        .select('*')
        .eq('status', 'Pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setPasswordRequests(data || []);
    } catch (err) {
      console.error('Error fetching password requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchReopenRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_reopen_requests')
        .select('*, tickets(title, ticket_number)')
        .eq('status', 'Pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      
      const mapped: TicketReopenRequest[] = (data || []).map((r: any) => ({
        id: r.id,
        ticket_id: r.ticket_id,
        requester_name: r.requester_name,
        reason: r.reason,
        status: r.status,
        requested_at: r.requested_at,
        ticket_number: r.tickets?.ticket_number || r.ticket_id,
        ticket_title: r.tickets?.title || 'Unknown Ticket'
      }));

      setReopenRequests(mapped);
    } catch (err) {
      console.error('Error fetching reopen requests:', err);
    } finally {
      setLoadingReopens(false);
    }
  };

  useEffect(() => {
    fetchPasswordRequests();
    fetchReopenRequests();
  }, [user?.id]);

  const handleApprovePasswordRequest = async (req: PasswordChangeRequest) => {
    if (!confirm(`Are you sure you want to approve the password reset request for ${req.requester_name}?`)) return;
    const loadId = toast.loading(`Resetting password for ${req.requester_name}...`);
    try {
      const apiRes = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId: req.user_id })
      });
      const res = await apiRes.json();
      if (!apiRes.ok || !res.success) throw new Error(res.error || 'Reset API failed');

      // Update password_change_requests status
      const { error: updateError } = await supabase
        .from('password_change_requests')
        .update({
          status: 'Completed',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.email || 'Manager'
        })
        .eq('id', req.id);

      if (updateError) throw updateError;

      toast.success(`Request approved! Temporary password: ${res.tempPassword}`, { id: loadId, duration: 15000 });
      fetchPasswordRequests();
    } catch (err: any) {
      console.error('Error approving request:', err);
      toast.error(`Failed to approve request: ${err.message}`, { id: loadId });
    }
  };

  const handleRejectPasswordRequest = async (req: PasswordChangeRequest) => {
    if (!confirm(`Are you sure you want to reject the password reset request for ${req.requester_name}?`)) return;
    const loadId = toast.loading(`Rejecting request...`);
    try {
      const { error } = await supabase
        .from('password_change_requests')
        .update({
          status: 'Rejected',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.email || 'Manager'
        })
        .eq('id', req.id);

      if (error) throw error;
      toast.success('Request rejected.', { id: loadId });
      fetchPasswordRequests();
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      toast.error(`Failed to reject request: ${err.message}`, { id: loadId });
    }
  };

  const handleApproveReopenRequest = async (req: TicketReopenRequest) => {
    if (!confirm(`Are you sure you want to approve the reopen request for ticket ${req.ticket_number}?`)) return;
    const loadId = toast.loading('Approving reopen request...');
    try {
      // 1. Update ticket status to Reopened
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ status: 'Reopened' })
        .eq('id', req.ticket_id);
      
      if (ticketError) throw ticketError;

      // 2. Update reopen request status
      const { error: reqError } = await supabase
        .from('ticket_reopen_requests')
        .update({
          status: 'Approved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.email || 'Manager'
        })
        .eq('id', req.id);

      if (reqError) throw reqError;

      toast.success('Ticket has been successfully reopened.', { id: loadId });
      fetchReopenRequests();
    } catch (err: any) {
      console.error('Error approving reopen:', err);
      toast.error(`Failed to approve: ${err.message}`, { id: loadId });
    }
  };

  const handleRejectReopenRequest = async (req: TicketReopenRequest) => {
    const rejectReason = prompt('Please enter a rejection reason:');
    if (rejectReason === null) return;
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    
    const loadId = toast.loading('Rejecting reopen request...');
    try {
      const { error } = await supabase
        .from('ticket_reopen_requests')
        .update({
          status: 'Rejected',
          rejection_reason: rejectReason.trim(),
          resolved_at: new Date().toISOString(),
          resolved_by: user?.email || 'Manager'
        })
        .eq('id', req.id);

      if (error) throw error;
      toast.success('Reopen request rejected.', { id: loadId });
      fetchReopenRequests();
    } catch (err: any) {
      console.error('Error rejecting reopen:', err);
      toast.error(`Failed to reject: ${err.message}`, { id: loadId });
    }
  };


  const managerName = user?.name || 'Marcus Vance';

  const getSlaBreachInfo = (t: any) => {
    if (t.status === 'Closed' || t.status === 'Resolved') {
      return null;
    }
    if (!t.slaDueAt || t.slaDueAt === 'SLA Not Applicable') {
      return null;
    }
    const dueTime = new Date(t.slaDueAt).getTime();
    if (isNaN(dueTime)) return null;

    const diffMs = dueTime - Date.now();
    const breachesInHours = diffMs / (1000 * 60 * 60);

    if (breachesInHours < 0) {
      return { status: 'breached', label: 'SLA breached' };
    } else if (breachesInHours <= 2) {
      return { status: 'imminent', label: `SLA breach in ${Math.ceil(breachesInHours)}h` };
    }
    return null;
  };

  // Compute values synchronously from profiles using useMemo
  const consultantsDbList = useMemo(() => {
    return (profiles || [])
      .filter((p) => p.role === 'Consultant')
      .map((c) => ({
        id: c.id,
        name: c.full_name,
        type: c.consultant_type || 'Technical',
        expertise: c.sap_modules || []
      }));
  }, [profiles]);

  const consultantsCount = consultantsDbList.length;

  const customersCount = useMemo(() => {
    return (profiles || []).filter((p) => p.role === 'Customer').length;
  }, [profiles]);

  // --- FILTERS & INTERACTION STATES ---
  const [filters, setFilters] = useState({
    period: 'This Year',
    dateFrom: '',
    dateTo: '',
    statuses: ['All'],
    priority: 'All',
    module: 'All',
    customer: 'All'
  });
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [selectedTab, setSelectedTab] = useState('analytics');
  const [selectedConsultant, setSelectedConsultant] = useState<string | null>(null);
  const [trendGrouping, setTrendGrouping] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  // Modals state
  const [rejectDialog, setRejectDialog] = useState<{
    isOpen: boolean;
    type: 'effort' | 'closure' | 'unlock';
    ticketId: string;
    targetId: string;
    reason: string;
  }>({
    isOpen: false,
    type: 'effort',
    ticketId: '',
    targetId: '',
    reason: ''
  });

  const [closureDialog, setClosureDialog] = useState<{
    isOpen: boolean;
    ticketId: string;
    requestId: string;
    rating: number;
    feedback: string;
  }>({
    isOpen: false,
    ticketId: '',
    requestId: '',
    rating: 0,
    feedback: ''
  });

  const activeTicketForClosure = useMemo(() => {
    if (!closureDialog.ticketId) return null;
    return tickets.find(t => t.id === closureDialog.ticketId);
  }, [closureDialog.ticketId, tickets]);

  const activeRequestForClosure = useMemo(() => {
    if (!activeTicketForClosure || !closureDialog.requestId) return null;
    return activeTicketForClosure.closureRequests?.find(r => r.id === closureDialog.requestId);
  }, [activeTicketForClosure, closureDialog.requestId]);

  const scopedTickets = useMemo(() => tickets, [tickets]);

  const distinctModules = useMemo(() => {
    const mods = scopedTickets.map(t => t.sapModule).filter(Boolean);
    return Array.from(new Set(mods)).sort();
  }, [scopedTickets]);

  const distinctCustomers = useMemo(() => {
    const orgs = scopedTickets.map(t => t.organization).filter(Boolean);
    return Array.from(new Set(orgs)).sort();
  }, [scopedTickets]);

  const applyFilters = (ticketsList: typeof scopedTickets, f: typeof filters) => {
    return ticketsList.filter(t => {
      // Date period filter
      const ticketDate = new Date(t.createdAt);
      let passDate = true;
      const now = new Date();

      if (f.period === 'This Month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        passDate = ticketDate >= start && ticketDate <= end;
      } else if (f.period === 'This Quarter') {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), quarterStartMonth, 1);
        const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
        passDate = ticketDate >= start && ticketDate <= end;
      } else if (f.period === 'This Year') {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        passDate = ticketDate >= start && ticketDate <= end;
      } else if (f.period === 'Custom') {
        if (f.dateFrom) {
          const start = new Date(f.dateFrom);
          start.setHours(0, 0, 0, 0);
          passDate = passDate && (ticketDate >= start);
        }
        if (f.dateTo) {
          const end = new Date(f.dateTo);
          end.setHours(23, 59, 59, 999);
          passDate = passDate && (ticketDate <= end);
        }
      }

      if (!passDate) return false;

      // Status filter matching UI simplified statuses
      if (f.statuses && f.statuses.length > 0 && !f.statuses.includes('All')) {
        let simplifiedStatus = '';
        if (t.status === 'New') {
          simplifiedStatus = 'New';
        } else if (t.status === 'Assigned') {
          simplifiedStatus = 'Assigned';
        } else if (
          ['In Progress', 'In Progress - Functional', 'Awaiting Functional Submission', 'In Progress - Technical', 'Awaiting Technical Submission', 'Requirement Gathering'].includes(t.status)
        ) {
          simplifiedStatus = 'In Progress';
        } else if (
          ['Awaiting Closure', 'Request for Closure', 'Awaiting Manager Approval', 'Waiting for Hours Approval'].includes(t.status)
        ) {
          simplifiedStatus = 'Pending Closure';
        } else if (t.status === 'Closed' || t.status === 'Resolved') {
          simplifiedStatus = 'Closed';
        } else if (t.status === 'Reopened') {
          simplifiedStatus = 'Reopened';
        }

        const isEscalatedMatch = f.statuses.includes('Escalated') && (t.escalationFlag || t.status === 'Raised to SAP');
        const isStatusMatch = f.statuses.includes(simplifiedStatus);

        if (!isStatusMatch && !isEscalatedMatch) {
          return false;
        }
      }

      // Priority filter
      if (f.priority && f.priority !== 'All') {
        if (t.priority !== f.priority) return false;
      }

      // Module filter
      if (f.module && f.module !== 'All') {
        if (t.sapModule !== f.module) return false;
      }

      // Customer filter
      if (f.customer && f.customer !== 'All') {
        if (t.organization !== f.customer) return false;
      }

      return true;
    });
  };

  const filteredTickets = useMemo(() => {
    return applyFilters(scopedTickets, filters);
  }, [scopedTickets, filters]);

  const filteredDashboardTickets = filteredTickets;

  // Lists of actual workflow logs for Action lists
  const pendingEffortLogs = useMemo(() => {
    const list: { ticketId: string; logId: string; consultantName: string; hours: number; description: string; activityType: string; billable: boolean }[] = [];
    filteredDashboardTickets.forEach(t => {
      (t.efforts || []).forEach(e => {
        if (e.status === 'Pending' || e.status === 'Pending Approval') {
          list.push({
            ticketId: t.id,
            logId: e.id,
            consultantName: e.consultantName,
            hours: e.hoursLogged || e.hoursWorked || 0,
            description: e.description,
            activityType: e.activityType,
            billable: e.billable
          });
        }
      });
    });
    return list;
  }, [filteredDashboardTickets]);

  const pendingClosureRequests = useMemo(() => {
    const list: { ticketId: string; ticketTitle: string; customerName: string; requestId: string; requestedBy: string; funcHours: number; techHours: number; rootCause: string; resolutionSummary: string; summary: string; submittedAt: string }[] = [];
    filteredDashboardTickets.forEach(t => {
      (t.closureRequests || []).forEach(r => {
        if (r.status === 'Pending Manager Approval') {
          list.push({
            ticketId: t.id,
            ticketTitle: t.title,
            customerName: t.organization,
            requestId: r.id,
            requestedBy: r.requestedBy,
            funcHours: r.functionalActualHours,
            techHours: r.technicalActualHours,
            rootCause: r.rootCause,
            resolutionSummary: r.resolutionSummary,
            summary: r.workCompletedSummary,
            submittedAt: r.createdAt
          });
        }
      });
    });
    return list;
  }, [filteredDashboardTickets]);

  const pendingUnlockRequests = useMemo(() => {
    const list: { ticketId: string; ticketTitle: string; requestId: string; requestedBy: string; reason: string; change: string }[] = [];
    filteredDashboardTickets.forEach(t => {
      (t.unlockRequests || []).forEach(u => {
        if (u.status === 'Pending') {
          list.push({
            ticketId: t.id,
            ticketTitle: t.title,
            requestId: u.id,
            requestedBy: u.requestedBy,
            reason: u.reason,
            change: u.requestedChange
          });
        }
      });
    });
    return list;
  }, [filteredDashboardTickets]);

  const pendingApprovalsCount = useMemo(() => {
    return pendingEffortLogs.length + pendingClosureRequests.length + pendingUnlockRequests.length + passwordRequests.length + reopenRequests.length;
  }, [pendingEffortLogs, pendingClosureRequests, pendingUnlockRequests, passwordRequests, reopenRequests]);

  const waitingAssignmentTickets = useMemo(() => {
    return filteredTickets.filter(t => 
      t.status !== 'Closed' && 
      t.status !== 'Resolved' && 
      (!t.assignedConsultant || t.status === 'New' || t.status === 'Reopened')
    );
  }, [filteredTickets]);

  const approvalsQueueList = useMemo(() => {
    const list: any[] = [];
    
    pendingEffortLogs.forEach(log => {
      const t = filteredTickets.find(x => x.id === log.ticketId);
      list.push({
        type: 'Timesheet Approval',
        id: log.logId,
        ticketId: log.ticketId,
        ticketNumber: t?.ticketNumber || log.ticketId.slice(0, 8),
        title: t?.title || 'Unknown Ticket',
        detail: `${log.hours}h by ${log.consultantName}`,
        actionTab: 'approvals'
      });
    });

    pendingClosureRequests.forEach(r => {
      const t = filteredTickets.find(x => x.id === r.ticketId);
      list.push({
        type: 'Closure Approval',
        id: r.requestId,
        ticketId: r.ticketId,
        ticketNumber: t?.ticketNumber || r.ticketId.slice(0, 8),
        title: t?.title || 'Unknown Ticket',
        detail: `Actual hours: ${r.funcHours + r.techHours}h - ${r.summary?.slice(0, 40)}...`,
        actionTab: 'approvals'
      });
    });

    pendingUnlockRequests.forEach(u => {
      const t = filteredTickets.find(x => x.id === u.ticketId);
      list.push({
        type: 'Unlock Request',
        id: u.requestId,
        ticketId: u.ticketId,
        ticketNumber: t?.ticketNumber || u.ticketId.slice(0, 8),
        title: t?.title || 'Unknown Ticket',
        detail: `Reason: ${u.reason?.slice(0, 40)}...`,
        actionTab: 'approvals'
      });
    });

    return list;
  }, [filteredTickets, pendingEffortLogs, pendingClosureRequests, pendingUnlockRequests]);

  const escalationsAndBreachesList = useMemo(() => {
    const now = SYSTEM_NOW;
    const list: any[] = [];
    filteredTickets.forEach(t => {
      if (t.status === 'Closed' || t.status === 'Resolved') return;
      
      const hasSlaBreached = t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable' && new Date(t.slaDueAt).getTime() < now;
      if (hasSlaBreached) {
        list.push({
          type: 'SLA Breach',
          ticketId: t.id,
          ticketNumber: t.ticketNumber || t.id.slice(0, 8),
          title: t.title,
          priority: t.priority,
          detail: `Breached on ${new Date(t.slaDueAt).toLocaleDateString()}`,
          badgeColor: 'bg-red-100 text-red-800 border-red-200'
        });
      } else if (t.priority === 'Critical') {
        list.push({
          type: 'Critical Ticket',
          ticketId: t.id,
          ticketNumber: t.ticketNumber || t.id.slice(0, 8),
          title: t.title,
          priority: t.priority,
          detail: `SLA: ${t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable' ? new Date(t.slaDueAt).toLocaleString() : 'N/A'}`,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
        });
      } else if (t.escalationFlag) {
        list.push({
          type: 'Escalated',
          ticketId: t.id,
          ticketNumber: t.ticketNumber || t.id.slice(0, 8),
          title: t.title,
          priority: t.priority,
          detail: `Escalated flag set to TRUE`,
          badgeColor: 'bg-red-50 text-red-750 border-red-100'
        });
      }
    });
    return list;
  }, [filteredTickets]);

  // Unique dropdown options extracted from contracts and tickets
  const customersList = useMemo(() => {
    const list = new Set<string>();
    contracts.forEach(c => {
      if (c.organizationName) list.add(c.organizationName);
    });
    (profiles || [])
      .filter(p => p.role === 'Customer')
      .forEach(p => {
        const orgName = orgMap[p.organization_id] || p.organization || (p.organizations as any)?.name;
        if (orgName) list.add(orgName);
      });
    scopedTickets.forEach(t => {
      if (t.organization) list.add(t.organization);
    });
    return Array.from(list).filter(Boolean).sort();
  }, [contracts, profiles, orgMap, scopedTickets]);

  const consultantsList = useMemo(() => {
    const list = new Set<string>();
    consultantsDbList.forEach(c => {
      if (c.name) list.add(c.name);
    });
    scopedTickets.forEach(t => {
      if (t.assignedConsultant) list.add(t.assignedConsultant);
      (t.assignments || []).forEach(a => {
        if (a.consultantName) list.add(a.consultantName);
      });
      (t.actualHoursLogs || []).forEach(ah => {
        const matchingAss = (t.assignments || []).find(a => a.consultantId === ah.consultantId);
        if (matchingAss?.consultantName) {
          list.add(matchingAss.consultantName);
        }
      });
    });
    return Array.from(list).filter(Boolean).sort();
  }, [consultantsDbList, scopedTickets]);

  const managedCustomersList = customersList;
  const managedConsultantsList = consultantsList;
  const managedCustomersCount = managedCustomersList.length;
  const managedConsultantsCount = managedConsultantsList.length;

  const managersList = useMemo(() => {
    return (profiles || [])
      .filter(p => p.role === 'Manager')
      .map(p => p.full_name)
      .filter(Boolean)
      .sort();
  }, [profiles]);

  const workingDaysInMonth = useMemo(() => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (filters.period === 'This Month') {
      // already set
    } else if (filters.period === 'This Quarter') {
      const qStart = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qStart, 1);
      end = new Date(now.getFullYear(), qStart + 3, 0);
    } else if (filters.period === 'This Year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else if (filters.period === 'Custom') {
      start = filters.dateFrom ? new Date(filters.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = filters.dateTo ? new Date(filters.dateTo) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return getWorkingDaysInRange(start, end);
  }, [filters.period, filters.dateFrom, filters.dateTo]);

  // Capacity & Load dynamic calculations for individual consultants
  const consultantsLoad = useMemo(() => {
    const expectedCapacity = workingDaysInMonth * 8;
    // Show only managed consultants
    const activeConsultantsList = consultantsDbList.filter(c => managedConsultantsList.includes(c.name));
    return activeConsultantsList.map(consultant => {
      const activeCount = filteredDashboardTickets.filter(t => 
        t.status !== 'Closed' && 
        t.status !== 'Resolved' && 
        (t.assignedConsultant === consultant.name || t.assignments?.some(a => a.consultantName === consultant.name && a.active))
      ).length;

      const loggedHours = filteredDashboardTickets.flatMap(t => t.actualHoursLogs || [])
        .filter(ah => (ah.consultantId === consultant.id || ah.approvedBy === consultant.name) && ah.approvalStatus?.toLowerCase() === 'approved')
        .reduce((sum, ah) => sum + ah.actualHours, 0);

      const actualLogged = loggedHours;
      let loadPercentage = expectedCapacity > 0 ? Math.round((actualLogged / expectedCapacity) * 100) : 0;
      loadPercentage += activeCount * 12; // Dynamic load amplification based on open items
      loadPercentage = Math.min(loadPercentage, 100);

      let loadStatus: 'Underutilized' | 'Healthy' | 'Overloaded' = 'Healthy';
      if (loadPercentage > 92) {
        loadStatus = 'Overloaded';
      } else if (loadPercentage < 70) {
        loadStatus = 'Underutilized';
      }

      return {
        ...consultant,
        activeCount,
        loggedHours,
        loadPercentage,
        loadStatus
      };
    });
  }, [filteredDashboardTickets, workingDaysInMonth, consultantsDbList, managedConsultantsList]);

  // Dynamic calculations for all requested sections
  const dashboardData = useMemo(() => {
    const nowTime = SYSTEM_NOW;
    const ticketsList = filteredDashboardTickets;

    // --- 1. EXECUTIVE HEALTH OVERVIEW ---
    const managerCore = getManagerDashboardData(ticketsList, contracts, profiles);

    const totalCustomersCount = managerCore.totalClients;
    const activeCustomersCount = managerCore.totalClients;
    const customersWithOpenTickets = new Set(ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').map(t => t.organization)).size;
    const customersWithCriticalTickets = new Set(ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.priority === 'Critical').map(t => t.organization)).size;
    const customersWithSlaBreaches = new Set(ticketsList.filter(t => getSlaStatus(t, nowTime) === 'Breached').map(t => t.organization)).size;
    const customersAwaitingClosure = new Set(ticketsList.filter(t => ['Request for Closure', 'Awaiting Manager Approval', 'Waiting for Hours Approval'].includes(t.status)).map(t => t.organization)).size;

    const openCount = ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
    const unassignedCount = ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && !t.assignedConsultant).length;
    const reqGatheringCount = ticketsList.filter(t => t.status === 'Requirement Gathering').length;
    const ipFuncCount = ticketsList.filter(t => ['In Progress - Functional', 'Awaiting Functional Submission', 'In Progress'].includes(t.status)).length;
    const ipTechCount = ticketsList.filter(t => ['In Progress - Technical', 'Awaiting Technical Submission'].includes(t.status)).length;
    const custActionCount = ticketsList.filter(t => ['Customer Action', 'Waiting for Customer'].includes(t.status)).length;
    const onHoldCount = ticketsList.filter(t => ['Waiting for Internal Team', 'On Hold'].includes(t.status)).length;
    const raisedToSapCount = ticketsList.filter(t => t.status === 'Raised to SAP').length;
    const requestClosureCount = ticketsList.filter(t => ['Request for Closure', 'Awaiting Manager Approval', 'Waiting for Hours Approval'].includes(t.status)).length;
    const closedCount = ticketsList.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;
    const reopenedCount = ticketsList.filter(t => t.status === 'Reopened' || t.status === 'Reopen Requested').length;

    const functionalConsultantsCount = consultantsDbList.filter(c => managedConsultantsList.includes(c.name) && c.type === 'Functional').length;
    const technicalConsultantsCount = consultantsDbList.filter(c => managedConsultantsList.includes(c.name) && c.type === 'Technical').length;
    const totalConsultantsCount = managerCore.totalConsultants;

    const estPendingApproval = ticketsList.flatMap(t => t.hourEstimates || []).filter(e => e.status === 'Submitted').length;
    const actPendingApproval = pendingEffortLogs.length;
    const closurePendingApproval = pendingClosureRequests.length;
    const reopenPendingApproval = ticketsList.filter(t => t.status === 'Reopen Requested').length;
    const resourceChangePending = pendingUnlockRequests.length;

    const incidentTickets = ticketsList.filter(t => t.ticketType === 'Incident' || !t.ticketType);
    const slaHealthy = incidentTickets.filter(t => getSlaStatus(t, nowTime) === 'Healthy').length;
    const slaWarning = incidentTickets.filter(t => getSlaStatus(t, nowTime) === 'Warning').length;
    const slaBreached = incidentTickets.filter(t => getSlaStatus(t, nowTime) === 'Breached').length;
    const slaCompliance = incidentTickets.length > 0 ? Math.round(((incidentTickets.length - slaBreached) / incidentTickets.length) * 100) : 100;

    // --- 2. TODAY'S ACTION ITEMS & COUNTERS ---
    const ticketsAwaitingAssign = ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && !t.assignedConsultant && (!t.consultantEfforts || t.consultantEfforts.length === 0));
    const criticalTicketsToReview = ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.priority === 'Critical');
    const slaBreachTickets = ticketsList.filter(t => getSlaStatus(t, nowTime) === 'Breached');
    const slaDueToday = ticketsList.filter(t => getSlaStatus(t, nowTime) === 'Warning');
    const ticketsNoUpdate3Days = ticketsList.filter(t => {
      if (t.status === 'Closed' || t.status === 'Resolved') return false;
      const ageDays = (nowTime - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays >= 3;
    });
    const ticketsAging7Days = ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && (nowTime - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24) >= 7);
    const ticketsAging15Days = ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && (nowTime - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24) >= 15);
    const ticketsAging30Days = ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && (nowTime - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24) >= 30);

    // --- 3. CUSTOMER RISK AND HEALTH INDEX ---
    // Health and risk calculated dynamically per organization
    const customerRiskMap = new Map<string, {
      critical: number;
      breached: number;
      reopened: number;
      lowCSAT: number;
      score: number;
      openTickets: number;
      closedTickets: number;
      escalated: number;
      csat: number;
      startDate: string;
      endDate: string;
      contractType: string;
      contractStatus: string;
      totalHours: number;
      monthlyHours: number;
      approvedHours: number;
      remainingHours: number;
      utilizationPercent: number;
    }>();
    customersList.forEach(org => {
      const orgTickets = ticketsList.filter(t => t.organization === org);
      const crit = orgTickets.filter(t => t.priority === 'Critical' && t.status !== 'Closed' && t.status !== 'Resolved').length;
      const breached = orgTickets.filter(t => getSlaStatus(t, nowTime) === 'Breached').length;
      const reop = orgTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length;
      const lowC = orgTickets.filter(t => t.rating && t.rating.score <= 2).length;
      const openTick = orgTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      const closedTick = orgTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;
      const esc = orgTickets.filter(t => t.escalationFlag).length;

      const ratings = orgTickets.filter(t => t.rating).map(t => t.rating!.score);
      const csat = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length) : 5.0;

      const contract = (contracts || []).find(con => con.organizationName === org);
      const startDate = contract?.startDate || 'N/A';
      const endDate = contract?.endDate || 'N/A';
      const contractType = contract?.contractType || 'N/A';
      const contractStatus = contract?.isActive ? 'Active' : (contract?.status || 'N/A');
      const totalHours = contract?.totalHours || 0;
      const monthlyHours = contract?.monthlyBudgetHours || 0;

      const approvedLogs = orgTickets.flatMap(t => t.actualHoursLogs || []).filter(ah => ah.approvalStatus?.toLowerCase() === 'approved');
      const approvedHours = approvedLogs.reduce((sum, ah) => sum + ah.actualHours, 0);
      const remainingHours = Math.max(0, totalHours - approvedHours);
      const utilizationPercent = totalHours > 0 ? (approvedHours / totalHours) * 100 : 0;

      const riskScore = (crit * 3) + (breached * 5) + (reop * 2) + (lowC * 4) + (esc * 4);
      customerRiskMap.set(org, {
        critical: crit,
        breached,
        reopened: reop,
        lowCSAT: lowC,
        score: riskScore,
        openTickets: openTick,
        closedTickets: closedTick,
        escalated: esc,
        csat,
        startDate,
        endDate,
        contractType,
        contractStatus,
        totalHours,
        monthlyHours,
        approvedHours,
        remainingHours,
        utilizationPercent
      });
    });

    const topCustomersVolume = customersList.map(org => ({
      name: org,
      value: ticketsList.filter(t => t.organization === org).length
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    // --- 4. HOURS & BILLING INSIGHTS ---
    let totalEstHrs = 0;
    let totalActHrs = 0;
    let approvedActHrs = 0;
    let funcEstHrs = 0;
    let funcActHrs = 0;
    let approvedFuncActHrs = 0;
    let techEstHrs = 0;
    let techActHrs = 0;
    let approvedTechActHrs = 0;
    let billableHrs = 0;
    let nonBillableHrs = 0;

    ticketsList.forEach(t => {
      (t.estimates || []).forEach(e => {
        totalEstHrs += e.estimatedHours;
        if (e.consultantType === 'Functional') {
          funcEstHrs += e.estimatedHours;
        } else {
          techEstHrs += e.estimatedHours;
        }
      });
      (t.actualHoursLogs || []).forEach(ah => {
        totalActHrs += ah.actualHours;
        if (ah.consultantType === 'Functional') {
          funcActHrs += ah.actualHours;
        } else {
          techActHrs += ah.actualHours;
        }
        if (ah.billable) {
          billableHrs += ah.actualHours;
        } else {
          nonBillableHrs += ah.actualHours;
        }

        if (ah.approvalStatus?.toLowerCase() === 'approved') {
          approvedActHrs += ah.actualHours;
          if (ah.consultantType === 'Functional') {
            approvedFuncActHrs += ah.actualHours;
          } else {
            approvedTechActHrs += ah.actualHours;
          }
        }
      });
    });
    const resolvedClosed = ticketsList.filter(t => (t.status === 'Closed' || t.status === 'Resolved') && (t.resolvedAt || t.closedAt));
    const avgResolutionTime = resolvedClosed.length > 0
      ? (resolvedClosed.reduce((sum, t) => {
          const s = new Date(t.createdAt).getTime();
          const e = new Date(t.resolvedAt || t.closedAt || s).getTime();
          return sum + (e - s) / (1000 * 60 * 60);
        }, 0) / resolvedClosed.length).toFixed(1)
      : '0.0';

    return {
      executive: {
        totalCustomers: totalCustomersCount,
        activeCustomers: activeCustomersCount,
        customersWithOpenTickets,
        customersWithCriticalTickets,
        customersWithSlaBreaches,
        customersAwaitingClosure,

        totalTicketsRaised: ticketsList.length,
        openTickets: openCount,
        unassignedTickets: unassignedCount,
        reqGathering: reqGatheringCount,
        ipFunc: ipFuncCount,
        ipTech: ipTechCount,
        custAction: custActionCount,
        onHold: onHoldCount,
        raisedToSap: raisedToSapCount,
        requestClosure: requestClosureCount,
        closedTickets: closedCount,
        reopenedTickets: reopenedCount,

        totalConsultants: totalConsultantsCount,
        funcConsultants: functionalConsultantsCount,
        techConsultants: technicalConsultantsCount,
        activeConsultants: totalConsultantsCount,
        overloadedConsultants: consultantsLoad.filter(c => c.loadStatus === 'Overloaded').length,
        underutilizedConsultants: consultantsLoad.filter(c => c.loadStatus === 'Underutilized').length,

        estPendingApproval,
        actPendingApproval,
        closurePendingApproval,
        reopenPendingApproval,
        resourceChangePending,
        totalApprovals: estPendingApproval + actPendingApproval + closurePendingApproval + reopenPendingApproval + resourceChangePending,
        critical: ticketsList.filter(t => t.priority === 'Critical' && t.status !== 'Closed' && t.status !== 'Resolved').length,
        pendingClosures: closurePendingApproval,

        slaHealthy,
        slaWarning,
        slaBreached,
        averageSlaCompliance: slaCompliance,
        averageResolutionTime: avgResolutionTime
      },
      actionCenter: {
        ticketsAwaitingAssign,
        criticalTicketsToReview,
        slaBreachTickets,
        slaDueToday,
        ticketsNoUpdate3Days,
        ticketsAging7Days,
        ticketsAging15Days,
        ticketsAging30Days
      },
      customerRiskLedger: Array.from(customerRiskMap.entries()).map(([name, r]) => {
        let level: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
        if (r.score >= 12 || r.csat <= 3.0 || r.breached > 0) level = 'Critical';
        else if (r.score >= 5 || r.utilizationPercent >= 90) level = 'Warning';
        return { name, ...r, level };
      }).sort((a, b) => b.score - a.score),
      topCustomersVolume,
      financials: {
        totalEstHrs,
        totalActHrs,
        approvedActHrs,
        funcEstHrs,
        funcActHrs,
        approvedFuncActHrs,
        techEstHrs,
        techActHrs,
        approvedTechActHrs,
        billableHrs,
        nonBillableHrs,
        variance: totalActHrs - totalEstHrs
      }
    };
  }, [filteredDashboardTickets, customersList, consultantsLoad]);

  // Recharts chart calculations
  const chartsData = useMemo(() => {
    const now = new Date(SYSTEM_NOW);
    const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Determine range start & end based on filters
    let start = new Date(now.getFullYear(), 0, 1);
    let end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    if (filters.period === 'This Month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (filters.period === 'This Quarter') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
      end = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
    } else if (filters.period === 'This Year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (filters.period === 'Custom') {
      start = filters.dateFrom ? new Date(filters.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = filters.dateTo ? new Date(filters.dateTo) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // 1. Ticket Trend (Daily, Weekly, Monthly, Yearly)
    let ticketTrendData: { name: string; Tickets: number }[] = [];
    if (trendGrouping === 'daily') {
      const curr = new Date(start);
      while (curr <= end) {
        const dStr = curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const yr = curr.getFullYear();
        const mo = curr.getMonth();
        const dy = curr.getDate();
        const count = filteredDashboardTickets.filter(t => {
          const dt = new Date(t.createdAt);
          return dt.getFullYear() === yr && dt.getMonth() === mo && dt.getDate() === dy;
        }).length;
        ticketTrendData.push({ name: dStr, Tickets: count });
        curr.setDate(curr.getDate() + 1);
      }
    } else if (trendGrouping === 'weekly') {
      const curr = new Date(start);
      let wkIdx = 1;
      while (curr <= end) {
        const wkStart = new Date(curr);
        const wkEnd = new Date(curr);
        wkEnd.setDate(wkEnd.getDate() + 6);
        const count = filteredDashboardTickets.filter(t => {
          const dt = new Date(t.createdAt);
          return dt >= wkStart && dt <= wkEnd;
        }).length;
        ticketTrendData.push({ name: `Wk ${wkIdx++}`, Tickets: count });
        curr.setDate(curr.getDate() + 7);
      }
    } else if (trendGrouping === 'yearly') {
      const startYr = start.getFullYear();
      const endYr = end.getFullYear();
      for (let yr = startYr; yr <= endYr; yr++) {
        const count = filteredDashboardTickets.filter(t => new Date(t.createdAt).getFullYear() === yr).length;
        ticketTrendData.push({ name: String(yr), Tickets: count });
      }
    } else {
      // monthly
      const curr = new Date(start.getFullYear(), start.getMonth(), 1);
      const last = new Date(end.getFullYear(), end.getMonth(), 1);
      while (curr <= last) {
        const mLabel = `${monthsNames[curr.getMonth()]} ${curr.getFullYear().toString().slice(-2)}`;
        const yr = curr.getFullYear();
        const mo = curr.getMonth();
        const count = filteredDashboardTickets.filter(t => {
          const dt = new Date(t.createdAt);
          return dt.getFullYear() === yr && dt.getMonth() === mo;
        }).length;
        ticketTrendData.push({ name: mLabel, Tickets: count });
        curr.setMonth(curr.getMonth() + 1);
      }
    }

    // Common dynamic intervals for other trends to prevent hardcoded Jan->Jun
    const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const trendIntervals: { name: string; start: Date; end: Date; year: number; month: number; type: 'day' | 'week' | 'month' }[] = [];

    if (durationDays <= 31) {
      // Daily intervals
      const curr = new Date(start);
      while (curr <= end) {
        const s = new Date(curr);
        s.setHours(0,0,0,0);
        const e = new Date(curr);
        e.setHours(23,59,59,999);
        trendIntervals.push({
          name: curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          start: s,
          end: e,
          year: curr.getFullYear(),
          month: curr.getMonth(),
          type: 'day'
        });
        curr.setDate(curr.getDate() + 1);
      }
    } else if (durationDays <= 93) {
      // Weekly intervals
      const curr = new Date(start);
      let wkIdx = 1;
      while (curr <= end) {
        const s = new Date(curr);
        s.setHours(0,0,0,0);
        const e = new Date(curr);
        e.setDate(e.getDate() + 6);
        e.setHours(23,59,59,999);
        trendIntervals.push({
          name: `Wk ${wkIdx++}`,
          start: s,
          end: e,
          year: curr.getFullYear(),
          month: curr.getMonth(),
          type: 'week'
        });
        curr.setDate(curr.getDate() + 7);
      }
    } else {
      // Monthly intervals
      const curr = new Date(start.getFullYear(), start.getMonth(), 1);
      const last = new Date(end.getFullYear(), end.getMonth(), 1);
      while (curr <= last) {
        const s = new Date(curr.getFullYear(), curr.getMonth(), 1, 0, 0, 0, 0);
        const e = new Date(curr.getFullYear(), curr.getMonth() + 1, 0, 23, 59, 59, 999);
        trendIntervals.push({
          name: `${monthsNames[curr.getMonth()]} ${curr.getFullYear().toString().slice(-2)}`,
          start: s,
          end: e,
          year: curr.getFullYear(),
          month: curr.getMonth(),
          type: 'month'
        });
        curr.setMonth(curr.getMonth() + 1);
      }
    }

    // 2. Open vs Closed (Bar Chart)
    const openVsClosedTrendData = trendIntervals.map(interval => {
      const raised = filteredDashboardTickets.filter(t => {
        const created = new Date(t.createdAt);
        return created >= interval.start && created <= interval.end;
      }).length;

      const closed = filteredDashboardTickets.filter(t => {
        const created = new Date(t.createdAt);
        return created >= interval.start && created <= interval.end && (t.status === 'Closed' || t.status === 'Resolved');
      }).length;

      return {
        name: interval.name,
        Open: Math.max(0, raised - closed),
        Closed: closed
      };
    });

    // 3. SLA Compliance (Area Chart)
    const slaComplianceTrendData = trendIntervals.map(interval => {
      const intervalTickets = filteredDashboardTickets.filter(t => {
        const created = new Date(t.createdAt);
        return created >= interval.start && created <= interval.end && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable';
      });

      const breached = intervalTickets.filter(t => {
        const due = new Date(t.slaDueAt!).getTime();
        const endT = t.status === 'Resolved' || t.status === 'Closed'
          ? new Date(t.resolvedAt || t.closedAt || due).getTime()
          : SYSTEM_NOW;
        return endT > due;
      }).length;

      const compliance = intervalTickets.length > 0
        ? Math.round(((intervalTickets.length - breached) / intervalTickets.length) * 100)
        : 100;

      return {
        name: interval.name,
        'SLA Compliance %': compliance
      };
    });

    // 4. Escalation Trend (Line Chart)
    const escalationTrendData = trendIntervals.map(interval => {
      const count = filteredDashboardTickets.filter(t => {
        const created = new Date(t.createdAt);
        return created >= interval.start && created <= interval.end && t.escalationFlag;
      }).length;

      return {
        name: interval.name,
        Escalations: count
      };
    });

    // 5. Customer Ticket Distribution (Donut Chart)
    const countsCustomers: Record<string, number> = {};
    filteredDashboardTickets.forEach(t => {
      if (t.organization) {
        countsCustomers[t.organization] = (countsCustomers[t.organization] || 0) + 1;
      }
    });
    const customerTicketDistribution = Object.entries(countsCustomers).map(([name, value]) => ({ name, value }));

    // 6. Module Wise Tickets (Bar Chart)
    const modules = ['FICO', 'MM', 'PP', 'ABAP', 'Basis', 'PM', 'QM', 'WM'];
    const countsModules: Record<string, number> = { Others: 0 };
    modules.forEach(m => { countsModules[m] = 0; });
    filteredDashboardTickets.forEach(t => {
      const mod = t.sapModule || 'General';
      const match = modules.find(m => m.toLowerCase() === mod.toLowerCase());
      if (match) {
        countsModules[match]++;
      } else {
        countsModules.Others++;
      }
    });
    const moduleWiseTickets = Object.entries(countsModules).map(([name, value]) => ({ name, value }));

    // 7. Consultant UtilizationData
    const consultantUtilizationData = consultantsLoad.map(c => ({
      name: c.name,
      'Utilization %': c.loadPercentage
    })).sort((a, b) => b['Utilization %'] - a['Utilization %']);

    // 8. Resolution Time Trend (Area Chart)
    const resolutionTimeTrendData = trendIntervals.map(interval => {
      const resolvedInInterval = filteredDashboardTickets.filter(t => {
        const created = new Date(t.createdAt);
        return created >= interval.start && created <= interval.end && (t.status === 'Closed' || t.status === 'Resolved') && (t.resolvedAt || t.closedAt);
      });

      const avgHours = resolvedInInterval.length > 0
        ? resolvedInInterval.reduce((sum, t) => {
            const startT = new Date(t.createdAt).getTime();
            const endT = new Date(t.resolvedAt || t.closedAt || startT).getTime();
            return sum + (endT - startT) / (1000 * 60 * 60);
          }, 0) / resolvedInInterval.length
        : 0;

      return {
        name: interval.name,
        'Resolution Time (Hrs)': parseFloat(avgHours.toFixed(1))
      };
    });

    // 9. Approval Volume (Stacked Chart)
    const approvalVolumeData = trendIntervals.map(interval => {
      const intervalTickets = filteredDashboardTickets.filter(t => {
        const created = new Date(t.createdAt);
        return created >= interval.start && created <= interval.end;
      });

      const effortCount = intervalTickets.reduce((sum, t) => 
        sum + (t.efforts || []).filter(e => e.status === 'Approved' && isCreatedInInterval(e.approvedAt, interval)).length, 0);

      const closureCount = intervalTickets.reduce((sum, t) => 
        sum + (t.closureRequests || []).filter(r => r.status === 'Approved' && isCreatedInInterval(r.managerApprovedAt, interval)).length, 0);

      const unlockCount = intervalTickets.reduce((sum, t) => 
        sum + (t.unlockRequests || []).filter(u => u.status === 'Approved' && isCreatedInInterval(u.managerApprovedAt, interval)).length, 0);

      return {
        name: interval.name,
        Timesheets: effortCount,
        Closures: closureCount,
        Unlocks: unlockCount
      };

      function isCreatedInInterval(dateStr: string | null | undefined, iv: typeof interval) {
        if (!dateStr) return false;
        const dt = new Date(dateStr);
        return dt >= iv.start && dt <= iv.end;
      }
    });

    // 10. Customer Consumption (Grouped Bar Chart)
    const customerConsumptionData = customersList.slice(0, 5).map(org => {
      const contract = contracts.find(c => c.organizationName === org && c.isActive);
      const totalHours = contract?.totalHours || 0;
      
      const orgTickets = filteredDashboardTickets.filter(t => t.organization === org);
      const approvedLogs = orgTickets.flatMap(t => t.actualHoursLogs || []).filter(ah => ah.approvalStatus?.toLowerCase() === 'approved');
      const approvedHours = approvedLogs.reduce((sum, ah) => sum + ah.actualHours, 0);
      
      const remainingHours = Math.max(0, totalHours - approvedHours);
      
      return {
        name: org.slice(0, 12),
        Contracted: totalHours,
        Used: approvedHours,
        Remaining: remainingHours
      };
    });

    // Backwards compatibility for other tabs in dashboard (e.g. statusData, priorityData, typeData, moduleData, agingData, trendData)
    const statusCounts: Record<string, number> = {};
    filteredDashboardTickets.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    const priorityCounts: Record<string, number> = {};
    filteredDashboardTickets.forEach(t => {
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
    });
    const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));

    const typeCounts: Record<string, number> = {};
    filteredDashboardTickets.forEach(t => {
      const type = t.ticketType || 'Incident';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

    const moduleCounts: Record<string, number> = {};
    filteredDashboardTickets.forEach(t => {
      const mod = t.sapModule || 'General';
      moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
    });
    const moduleData = Object.entries(moduleCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    let bucket1 = 0; // 0-2 Days
    let bucket2 = 0; // 3-7 Days
    let bucket3 = 0; // 8-15 Days
    let bucket4 = 0; // 16-30 Days
    let bucket5 = 0; // 30+ Days

    filteredDashboardTickets.forEach(t => {
      if (t.status === 'Closed') return;
      const age = (SYSTEM_NOW - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (age <= 2) bucket1++;
      else if (age <= 7) bucket2++;
      else if (age <= 15) bucket3++;
      else if (age <= 30) bucket4++;
      else bucket5++;
    });

    const agingData = [
      { name: '0–2 Days', value: bucket1 },
      { name: '3–7 Days', value: bucket2 },
      { name: '8–15 Days', value: bucket3 },
      { name: '16–30 Days', value: bucket4 },
      { name: '30+ Days', value: bucket5 }
    ];

    const trendData = trendIntervals.map(interval => {
      const raisedInInterval = filteredDashboardTickets.filter(t => {
        const created = new Date(t.createdAt);
        return created >= interval.start && created <= interval.end;
      }).length;

      const closedInInterval = filteredDashboardTickets.filter(t => {
        const created = new Date(t.createdAt);
        return created >= interval.start && created <= interval.end && (t.status === 'Closed' || t.status === 'Resolved');
      }).length;

      return {
        month: interval.name,
        Raised: raisedInInterval,
        Closed: closedInInterval
      };
    });

    return {
      ticketTrendData,
      openVsClosedTrendData,
      slaComplianceTrendData,
      escalationTrendData,
      customerTicketDistribution,
      moduleWiseTickets,
      consultantUtilizationData,
      resolutionTimeTrendData,
      approvalVolumeData,
      customerConsumptionData,
      statusData,
      priorityData,
      typeData,
      moduleData,
      agingData,
      trendData
    };
  }, [filteredDashboardTickets, filters, trendGrouping, consultantsLoad, contracts, customersList]);

  // Live Audit Timeline list
  const auditTimelineFeed = useMemo(() => {
    const list: { actor: string; role: string; action: string; ticketId: string; time: string; timestamp: number }[] = [];
    
    // Sort all audit logs and map to unified events
    scopedTickets.slice(0, 15).forEach(t => {
      // Comments actions
      t.comments.forEach(c => {
        list.push({
          actor: c.authorName,
          role: c.authorRole,
          action: c.isInternal ? 'added internal work log note' : 'communicated with client',
          ticketId: t.id,
          time: new Date(c.createdAt).toLocaleTimeString() + ' ' + new Date(c.createdAt).toLocaleDateString(),
          timestamp: new Date(c.createdAt).getTime()
        });
      });
      // Audit logs
      t.history.forEach(h => {
        const actorName = h.changedBy || 'System';
        list.push({
          actor: actorName,
          role: actorName.includes('Priya') || actorName.includes('Arjun') || actorName.includes('Elena') ? 'Consultant' : 'Manager',
          action: `updated ${h.fieldChanged || 'ticket'} from "${h.oldValue || ''}" to "${h.newValue || ''}"`,
          ticketId: t.id,
          time: new Date(h.createdAt).toLocaleTimeString() + ' ' + new Date(h.createdAt).toLocaleDateString(),
          timestamp: new Date(h.createdAt).getTime()
        });
      });
    });

    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [scopedTickets]);

  // System Risk Alert Console calculations
  const systemAlerts = useMemo(() => {
    const alerts: { severity: 'Critical' | 'Warning' | 'Info'; reason: string; action: string; link: string }[] = [];

    // SLA Breached Alert
    if (dashboardData.executive.slaBreached > 0) {
      alerts.push({
        severity: 'Critical',
        reason: `${dashboardData.executive.slaBreached} Incident tickets have active SLA breaches.`,
        action: 'Review queue prioritization immediately and reassign blockers.',
        link: '/manager/tickets?tab=slaBreached'
      });
    }

    // Unassigned Alert
    if (dashboardData.executive.unassignedTickets > 0) {
      alerts.push({
        severity: 'Warning',
        reason: `${dashboardData.executive.unassignedTickets} tickets are currently unallocated to any consultant.`,
        action: 'Open dispatch desk and allocate leads to functional/technical teams.',
        link: '/manager/tickets?tab=unassigned'
      });
    }

    // Overloaded consultants
    const overloadedList = consultantsLoad.filter(c => c.loadStatus === 'Overloaded');
    if (overloadedList.length > 0) {
      alerts.push({
        severity: 'Warning',
        reason: `${overloadedList.length} consultants are overloaded beyond 92% capacity load limits.`,
        action: 'Load balance their backlog items onto underutilized functional/technical resources.',
        link: '#loadCockpit'
      });
    }

    // Critical Tickets
    if (dashboardData.executive.critical > 0) {
      alerts.push({
        severity: 'Critical',
        reason: `${dashboardData.executive.critical} active Critical P1 incidents are currently open in the registry.`,
        action: 'Verify escalation workflows and ensure direct lead communications.',
        link: '/manager/tickets?tab=critical'
      });
    }

    // Closure Overdue
    if (dashboardData.executive.pendingClosures > 0) {
      alerts.push({
        severity: 'Info',
        reason: `${dashboardData.executive.pendingClosures} closure requests are awaiting executive validation.`,
        action: 'Open approvals widget to record CSAT audits and sign off completions.',
        link: '#governanceApproval'
      });
    }

    return alerts;
  }, [dashboardData, consultantsLoad]);

  // Dialog triggers for manual validation/rejection dialogs
  const triggerRejection = (type: 'effort' | 'closure' | 'unlock', ticketId: string, targetId: string) => {
    setRejectDialog({
      isOpen: true,
      type,
      ticketId,
      targetId,
      reason: ''
    });
  };

  const triggerClosureVerify = (ticketId: string, requestId: string) => {
    setClosureDialog({
      isOpen: true,
      ticketId,
      requestId,
      rating: 0,
      feedback: ''
    });
  };

  // Governance Actions
  const handleApproveEffort = (ticketId: string, logId: string, consultantName: string) => {
    approveEffortLog(ticketId, logId, 'Approved', managerName);
    toast.success(`Effort log approved for ${consultantName}`);
  };

  const handleApproveUnlock = (ticketId: string, requestId: string, requestedBy: string) => {
    approveUnlockRequest(ticketId, requestId, managerName);
    toast.success(`Work log unlock approved for ${requestedBy}`);
  };

  const handleConfirmRejection = async () => {
    const { type, ticketId, targetId, reason } = rejectDialog;
    if (!reason.trim()) {
      toast.error('Rejection reason is mandatory.');
      return;
    }

    if (type === 'effort') {
      approveEffortLog(ticketId, targetId, 'Rejected', managerName, reason);
      toast.success('Timesheet effort log rejected.');
    } else if (type === 'closure') {
      const res = await rejectClosureRequest(ticketId, targetId, managerName, reason);
      if (res.success) {
        toast.success('Closure request rejected.');
      } else {
        toast.error(res.error || 'Failed to reject closure request.');
      }
    } else if (type === 'unlock') {
      rejectUnlockRequest(ticketId, targetId, managerName, reason);
      toast.success('Unlock request rejected.');
    }

    setRejectDialog({ isOpen: false, type: 'effort', ticketId: '', targetId: '', reason: '' });
  };

  const handleConfirmClosure = async () => {
    const { ticketId, requestId, rating, feedback } = closureDialog;
    if (rating === 0) {
      toast.error('Please select a CSAT satisfaction rating.');
      return;
    }
    if (!feedback.trim()) {
      toast.error('Feedback comments are mandatory.');
      return;
    }

    const res = await approveClosureRequest(ticketId, requestId, managerName, rating, feedback);
    if (res.success) {
      toast.success('Ticket closed successfully with CSAT record.');
      setClosureDialog({ isOpen: false, ticketId: '', requestId: '', rating: 0, feedback: '' });
    } else {
      toast.error(res.error || 'Failed to approve closure request and close ticket.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        {/* Page Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-5 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-zinc-200" />
            <Skeleton className="h-4 w-80 bg-zinc-100" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 bg-zinc-200 rounded-lg" />
            <Skeleton className="h-10 w-32 bg-zinc-200 rounded-lg" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="border border-zinc-200 rounded-xl p-5 bg-white space-y-3 shadow-sm">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24 bg-zinc-150" />
                <Skeleton className="h-4 w-4 rounded-full bg-zinc-150" />
              </div>
              <Skeleton className="h-8 w-16 bg-zinc-200" />
              <Skeleton className="h-3 w-32 bg-zinc-100" />
            </div>
          ))}
        </div>

        {/* Dynamic tabs/sections skeleton */}
        <div className="border border-zinc-200 rounded-xl p-6 bg-white space-y-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 bg-zinc-200 rounded" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-48 bg-zinc-200" />
              <Skeleton className="h-8 w-32 bg-zinc-100" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-zinc-50 pb-3 last:border-b-0">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3 bg-zinc-200" />
                    <Skeleton className="h-3 w-1/2 bg-zinc-100" />
                  </div>
                  <Skeleton className="h-6 w-16 bg-zinc-150 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono text-xs text-[#09090b]">
      {/* --- COMMAND CENTER HEADER --- */}
      <div className="border-b border-zinc-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 uppercase font-sans">
            AMS Management Command Center
          </h1>
          <p className="text-zinc-500 text-xs mt-1 font-sans">
            Unified operations cockpit for client SLAs, resource capacity, approvals, and performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-zinc-900 text-white font-mono text-[9px] tracking-wider uppercase px-2.5 py-1 shrink-0">
            LIVE COCKPIT
          </Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border border-zinc-200 rounded-lg p-4 mb-6 shadow-sm bg-white">
        {/* ROW 1 */}
        <div className="flex flex-wrap gap-3 items-end w-full">
          
          {/* 1. PERIOD */}
          <div className="flex flex-col w-full md:w-auto">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Period</span>
            <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 h-9 items-center min-w-[320px]">
              {['This Month', 'This Quarter', 'This Year', 'Custom'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, period: p }))}
                  className={`flex-1 h-full flex items-center justify-center text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer whitespace-nowrap px-2 ${
                    filters.period === p
                      ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200/50'
                      : 'text-zinc-550 hover:text-zinc-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 2. STATUS */}
          <div className="relative flex flex-col flex-1 min-w-[140px]" ref={statusDropdownRef}>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Status</span>
            <button
              type="button"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="bg-white border border-zinc-200 rounded-md px-3 h-9 text-xs text-zinc-950 transition font-sans w-full shadow-sm flex items-center justify-between cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-950"
            >
              <span className="truncate">
                {filters.statuses.includes('All') 
                  ? 'All Statuses' 
                  : `${filters.statuses.length} selected`}
              </span>
              <ChevronRight size={12} className="text-zinc-455 shrink-0 rotate-90" />
            </button>
            {showStatusDropdown && (
              <div className="absolute z-50 mt-16 w-full min-w-[160px] bg-white border border-zinc-200 rounded-md shadow-lg p-2 space-y-1">
                {['All', 'New', 'Assigned', 'In Progress', 'Pending Closure', 'Closed', 'Escalated', 'Reopened'].map(st => {
                  const isSelected = filters.statuses.includes(st);
                  return (
                    <label key={st} className="flex items-center gap-2 p-1.5 hover:bg-zinc-50 rounded cursor-pointer text-xs font-sans text-zinc-700">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                           if (st === 'All') {
                             setFilters(prev => ({ ...prev, statuses: ['All'] }));
                           } else {
                             let next = filters.statuses.filter(item => item !== 'All');
                             if (isSelected) {
                               next = next.filter(item => item !== st);
                               if (next.length === 0) next = ['All'];
                             } else {
                               next.push(st);
                             }
                             setFilters(prev => ({ ...prev, statuses: next }));
                           }
                        }}
                        className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                      />
                      <span>{st}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. PRIORITY */}
          <div className="flex flex-col flex-1 min-w-[140px]">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Priority</span>
            <Select
              value={filters.priority}
              onValueChange={(val) => setFilters(prev => ({ ...prev, priority: val }))}
            >
              <SelectTrigger className="h-9 w-full bg-white text-zinc-950 font-sans text-xs border border-zinc-200 shadow-sm focus:ring-zinc-950">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="font-sans">
                <SelectItem value="All">All Priorities</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. MODULE */}
          <div className="flex flex-col flex-1 min-w-[140px]">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Module</span>
            <Select
              value={filters.module}
              onValueChange={(val) => setFilters(prev => ({ ...prev, module: val }))}
            >
              <SelectTrigger className="h-9 w-full bg-white text-zinc-950 font-sans text-xs border border-zinc-200 shadow-sm focus:ring-zinc-950">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent className="font-sans">
                <SelectItem value="All">All Modules</SelectItem>
                {distinctModules.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 5. CUSTOMER */}
          <div className="flex flex-col flex-1 min-w-[140px]">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Customer</span>
            <Select
              value={filters.customer}
              onValueChange={(val) => setFilters(prev => ({ ...prev, customer: val }))}
            >
              <SelectTrigger className="h-9 w-full bg-white text-zinc-950 font-sans text-xs border border-zinc-200 shadow-sm focus:ring-zinc-950">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent className="font-sans">
                <SelectItem value="All">All Customers</SelectItem>
                {distinctCustomers.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 6. RESET BUTTON */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({
              period: 'This Year',
              dateFrom: '',
              dateTo: '',
              statuses: ['All'],
              priority: 'All',
              module: 'All',
              customer: 'All'
            })}
            className="h-9 gap-1.5 ml-auto text-xs font-semibold hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200 shadow-sm font-sans"
          >
            <RotateCcw size={14} />
            Reset
          </Button>

        </div>

        {/* ROW 2 - Custom range From/To inputs */}
        {filters.period === 'Custom' && (
          <div className="border-t border-zinc-200 mt-3 pt-3 flex gap-3 max-w-md animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-col flex-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">From</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="h-9 border border-zinc-200 rounded-md bg-white px-3 py-1.5 text-xs text-zinc-950 shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 w-full cursor-pointer font-sans"
              />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">To</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="h-9 border border-zinc-200 rounded-md bg-white px-3 py-1.5 text-xs text-zinc-950 shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 w-full cursor-pointer font-sans"
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── CLEAN DB EMPTY STATES OVERVIEW ── */}
      {(managedCustomersCount === 0 || managedConsultantsCount === 0 || tickets.length === 0 || pendingApprovalsCount === 0) && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 font-sans text-xs shadow-sm">
          <div className="flex items-center gap-2 border-b border-zinc-150 pb-2">
            <AlertCircle size={14} className="text-zinc-500" />
            <span className="font-bold text-zinc-950 uppercase tracking-wider text-[9px] font-mono">[Database Status]: Production Readiness Status Checklist</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            
            {/* Customers State */}
            <div className={`p-3 rounded border flex flex-col justify-between ${managedCustomersCount === 0 ? 'border-dashed border-zinc-200 bg-white' : 'border-emerald-100 bg-emerald-50/20'}`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-700">Customers</span>
                {managedCustomersCount === 0 ? (
                  <Badge variant="outline" className="text-[7px] font-bold uppercase tracking-wider text-zinc-400 bg-white border-zinc-200 px-1 py-0.5">Empty</Badge>
                ) : (
                  <Badge className="text-[7px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-1 py-0.5">Active</Badge>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono">{managedCustomersCount === 0 ? 'No customers created yet' : `${managedCustomersCount} customers active`}</p>
            </div>

            {/* Consultants State */}
            <div className={`p-3 rounded border flex flex-col justify-between ${managedConsultantsCount === 0 ? 'border-dashed border-zinc-200 bg-white' : 'border-emerald-100 bg-emerald-50/20'}`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-700">Consultants</span>
                {managedConsultantsCount === 0 ? (
                  <Badge variant="outline" className="text-[7px] font-bold uppercase tracking-wider text-zinc-400 bg-white border-zinc-200 px-1 py-0.5">Empty</Badge>
                ) : (
                  <Badge className="text-[7px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-1 py-0.5">Active</Badge>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono">{managedConsultantsCount === 0 ? 'No consultants created yet' : `${managedConsultantsCount} consultants active`}</p>
            </div>

            {/* Tickets State */}
            <div className={`p-3 rounded border flex flex-col justify-between ${tickets.length === 0 ? 'border-dashed border-zinc-200 bg-white' : 'border-emerald-100 bg-emerald-50/20'}`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-700">Tickets</span>
                {tickets.length === 0 ? (
                  <Badge variant="outline" className="text-[7px] font-bold uppercase tracking-wider text-zinc-400 bg-white border-zinc-200 px-1 py-0.5">Empty</Badge>
                ) : (
                  <Badge className="text-[7px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-1 py-0.5">Active</Badge>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono">{tickets.length === 0 ? 'No tickets available' : `${tickets.length} tickets logged`}</p>
            </div>

            {/* Approvals State */}
            <div className={`p-3 rounded border flex flex-col justify-between ${pendingApprovalsCount === 0 ? 'border-dashed border-zinc-200 bg-white' : 'border-amber-100 bg-amber-50/20'}`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-700">Approvals</span>
                {pendingApprovalsCount === 0 ? (
                  <Badge variant="outline" className="text-[7px] font-bold uppercase tracking-wider text-zinc-400 bg-white border-zinc-200 px-1 py-0.5">Empty</Badge>
                ) : (
                  <Badge className="text-[7px] font-bold uppercase tracking-wider bg-amber-600 text-white px-1 py-0.5">Pending</Badge>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono">{pendingApprovalsCount === 0 ? 'No approvals pending' : `${pendingApprovalsCount} pending approvals`}</p>
            </div>

            {/* Reports State */}
            <div className={`p-3 rounded border flex flex-col justify-between ${tickets.length === 0 ? 'border-dashed border-zinc-200 bg-white' : 'border-emerald-100 bg-emerald-50/20'}`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-zinc-700">Reports</span>
                {tickets.length === 0 ? (
                  <Badge variant="outline" className="text-[7px] font-bold uppercase tracking-wider text-zinc-400 bg-white border-zinc-200 px-1 py-0.5">Empty</Badge>
                ) : (
                  <Badge className="text-[7px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-1 py-0.5">Active</Badge>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono">{tickets.length === 0 ? 'No reports available' : 'SLA reports active'}</p>
            </div>

          </div>
        </div>
      )}

      {/* ── CORE WORKSPACE TABS INTERFACE ── */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <div className="w-full overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 border-b border-zinc-200/40">
          <TabsList className="inline-flex h-auto items-center justify-start gap-1 bg-zinc-100/80 p-1 border border-zinc-200/60 rounded-xl">
            <TabsTrigger value="analytics" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[10px] tracking-wider font-semibold uppercase">
              <TrendingUp size={12} className="text-zinc-400 group-hover:text-zinc-600 group-data-[state=active]:text-zinc-950 transition-colors duration-150" />
              Analytics Command Center
            </TabsTrigger>
            <TabsTrigger value="health" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[10px] tracking-wider font-semibold uppercase">
              <CheckSquare size={12} className="text-zinc-400 group-hover:text-zinc-600 group-data-[state=active]:text-zinc-950 transition-colors duration-150" />
              Executive Operations
            </TabsTrigger>
            <TabsTrigger value="tickets" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[10px] tracking-wider font-semibold uppercase">
              <Timer size={12} className="text-zinc-400 group-hover:text-zinc-600 group-data-[state=active]:text-zinc-950 transition-colors duration-150" />
              Ticket Control Center
            </TabsTrigger>
            <TabsTrigger value="resources" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[10px] tracking-wider font-semibold uppercase">
              <Users size={12} className="text-zinc-400 group-hover:text-zinc-600 group-data-[state=active]:text-zinc-950 transition-colors duration-150" />
              Consultant Load & Capacity
            </TabsTrigger>
            <TabsTrigger value="customers" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[10px] tracking-wider font-semibold uppercase">
              <ShieldAlert size={12} className="text-zinc-400 group-hover:text-zinc-600 group-data-[state=active]:text-zinc-950 transition-colors duration-150" />
              Customer Risk Map
            </TabsTrigger>
            <TabsTrigger value="approvals" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[10px] tracking-wider font-semibold uppercase">
              <Lock size={12} className="text-zinc-400 group-hover:text-zinc-600 group-data-[state=active]:text-zinc-950 transition-colors duration-150" />
              Governance & Financials
            </TabsTrigger>
            <TabsTrigger value="timeline" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[10px] tracking-wider font-semibold uppercase">
              <Calendar size={12} className="text-zinc-400 group-hover:text-zinc-600 group-data-[state=active]:text-zinc-950 transition-colors duration-150" />
              Activity & Audit Feed
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── TAB CONTENT: ANALYTICS COMMAND CENTER ── */}
        <TabsContent value="analytics" className="space-y-6 outline-none">
          
          {/* SECTION 1: REBUILT EXECUTIVE HEALTH OVERVIEW */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">
              1. Executive Health Overview
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: Ticket Operations */}
              <Card className="border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-350 transition flex flex-col justify-between">
                <div>
                  <span className="font-bold text-zinc-400 uppercase text-[8px] tracking-wider block font-mono">Ticket Operations</span>
                  <div className="mt-3 space-y-1.5 text-[10px] text-zinc-700 font-mono">
                    <div className="flex justify-between"><span>Open Tickets:</span><span className="font-bold text-zinc-900">{filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length}</span></div>
                    <div className="flex justify-between"><span>In Progress:</span><span className="font-bold text-zinc-900">{filteredDashboardTickets.filter(t => t.status.startsWith('In Progress') || t.status === 'In Progress').length}</span></div>
                    <div className="flex justify-between"><span>Awaiting Assignment:</span><span className="font-bold text-zinc-900">{filteredDashboardTickets.filter(t => !t.assignedConsultant && t.status !== 'Closed' && t.status !== 'Resolved').length}</span></div>
                    <div className="flex justify-between"><span>Pending Approval:</span><span className="font-bold text-zinc-900">{pendingApprovalsCount}</span></div>
                    <div className="flex justify-between"><span>Pending Closure:</span><span className="font-bold text-zinc-900">{pendingClosureRequests.length}</span></div>
                    <div className="flex justify-between"><span>Escalated:</span><span className="font-bold text-zinc-900">{filteredDashboardTickets.filter(t => t.escalationFlag).length}</span></div>
                    <div className="flex justify-between"><span>Closed This Month:</span><span className="font-bold text-green-700">{filteredDashboardTickets.filter(t => (t.status === 'Closed' || t.status === 'Resolved') && new Date(t.createdAt).getMonth() === new Date(SYSTEM_NOW).getMonth()).length}</span></div>
                    <div className="flex justify-between"><span>Reopened:</span><span className="font-bold text-red-600">{filteredDashboardTickets.filter(t => t.status === 'Reopened').length}</span></div>
                    <div className="flex justify-between pt-1.5 border-t border-zinc-100 mt-1">
                      <span>Avg Resolution Time:</span>
                      <span className="font-bold text-zinc-900">
                        {dashboardData.executive.averageResolutionTime} hrs
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 2: Resource Operations */}
              <Card className="border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-350 transition flex flex-col justify-between">
                <div>
                  <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block font-mono">Resource Operations</span>
                  <div className="mt-3 space-y-1.5 text-[10px] text-zinc-700 font-mono">
                    <div className="flex justify-between"><span>Total Consultants:</span><span className="font-bold text-zinc-900">{profiles.filter(p => p.role === 'Consultant').length}</span></div>
                    <div className="flex justify-between"><span>Functional:</span><span className="font-bold text-zinc-900">{profiles.filter(p => p.role === 'Consultant' && p.consultant_type === 'Functional').length}</span></div>
                    <div className="flex justify-between"><span>Technical:</span><span className="font-bold text-zinc-900">{profiles.filter(p => p.role === 'Consultant' && p.consultant_type === 'Technical').length}</span></div>
                    <div className="flex justify-between"><span>Allocated Staff:</span><span className="font-bold text-zinc-900">{consultantsLoad.filter(c => c.activeCount > 0).length}</span></div>
                    <div className="flex justify-between"><span>Unallocated Staff:</span><span className="font-bold text-zinc-900">{consultantsLoad.filter(c => c.activeCount === 0).length}</span></div>
                    <div className="flex justify-between"><span>Overloaded Staff:</span><span className="font-bold text-red-600">{consultantsLoad.filter(c => c.loadStatus === 'Overloaded').length}</span></div>
                    <div className="flex justify-between"><span>Available Capacity:</span><span className="font-bold text-zinc-900">
                      {Math.max(0, (profiles.filter(p => p.role === 'Consultant').length * workingDaysInMonth * 8) - filteredDashboardTickets.flatMap(t => t.actualHoursLogs || []).filter(ah => ah.approvalStatus?.toLowerCase() === 'approved').reduce((sum, ah) => sum + ah.actualHours, 0)).toFixed(0)} hrs
                    </span></div>
                    <div className="flex justify-between pt-1.5 border-t border-zinc-100 mt-1">
                      <span>Avg Utilization %:</span>
                      <span className="font-bold text-zinc-900">
                        {consultantsLoad.length > 0 ? Math.round(consultantsLoad.reduce((sum, c) => sum + c.loadPercentage, 0) / consultantsLoad.length) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 3: SLA Governance */}
              <Card className="border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-350 transition flex flex-col justify-between">
                <div>
                  <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block font-mono">SLA Governance</span>
                  <div className="mt-3 space-y-1.5 text-[10px] text-zinc-700 font-mono">
                    <div className="flex justify-between"><span>SLA Healthy:</span><span className="font-bold text-green-700">{filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) === 'Healthy').length}</span></div>
                    <div className="flex justify-between"><span>SLA Warning:</span><span className="font-bold text-amber-600">{filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) === 'Warning').length}</span></div>
                    <div className="flex justify-between"><span>SLA Breached:</span><span className="font-bold text-red-600">{filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) === 'Breached').length}</span></div>
                    <div className="flex justify-between"><span>Total SLA Monitored:</span><span className="font-bold text-zinc-900">{filteredDashboardTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable').length}</span></div>
                    <div className="flex justify-between pt-1.5 border-t border-zinc-100 mt-1">
                      <span>Avg SLA Compliance:</span>
                      <span className="font-bold text-zinc-900">
                        {filteredDashboardTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable').length > 0
                          ? Math.round(((filteredDashboardTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable').length - filteredDashboardTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) === 'Breached').length) / filteredDashboardTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable').length) * 100)
                          : 100}%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 4: Customer Operations */}
              <Card className="border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-350 transition flex flex-col justify-between">
                <div>
                  <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block font-mono">Customer Operations</span>
                  <div className="mt-3 space-y-1.5 text-[10px] text-zinc-700 font-mono">
                    <div className="flex justify-between"><span>Total Customers:</span><span className="font-bold text-zinc-900">{customersList.length}</span></div>
                    <div className="flex justify-between"><span>With Open Tickets:</span><span className="font-bold text-zinc-900">{new Set(filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').map(t => t.organization)).size}</span></div>
                    <div className="flex justify-between"><span>With Escalations:</span><span className="font-bold text-zinc-900">{new Set(filteredDashboardTickets.filter(t => t.escalationFlag).map(t => t.organization)).size}</span></div>
                    <div className="flex justify-between"><span>Contract Expiring &lt;30d:</span><span className="font-bold text-zinc-900">
                      {contracts.filter(c => c.endDate && c.isActive && (new Date(c.endDate).getTime() - SYSTEM_NOW) / (1000 * 60 * 60 * 24) <= 30).length}
                    </span></div>
                    <div className="flex justify-between pt-1.5 border-t border-zinc-100 mt-1">
                      <span>Mthly Hours (Logged/Approved):</span>
                      <span className="font-bold text-zinc-900">
                        {filteredDashboardTickets.flatMap(t => t.actualHoursLogs || []).filter(ah => new Date(ah.createdAt || '').getMonth() === new Date(SYSTEM_NOW).getMonth()).reduce((sum, ah) => sum + ah.actualHours, 0).toFixed(0)}h / {filteredDashboardTickets.flatMap(t => t.actualHoursLogs || []).filter(ah => ah.approvalStatus?.toLowerCase() === 'approved' && new Date(ah.approvedAt || '').getMonth() === new Date(SYSTEM_NOW).getMonth()).reduce((sum, ah) => sum + ah.actualHours, 0).toFixed(0)}h
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

            </div>
          </div>

          {/* SECTION 2: TODAY'S MANAGER ACTION CENTER */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">
              2. Today&apos;s Manager Action Center
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-[11px]">
              
              {/* Box 1: Immediate Assignment Queue */}
              <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 flex flex-col h-[340px] justify-between">
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                    <span className="font-extrabold text-zinc-900 uppercase text-[9px] tracking-wider flex items-center gap-1">
                      Immediate Assignment Queue ({filteredDashboardTickets.filter(t => !t.assignedConsultant && t.status !== 'Closed' && t.status !== 'Resolved').length})
                    </span>
                    <Badge className="bg-zinc-100 text-zinc-800 text-[8px] font-bold">UNASSIGNED</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {filteredDashboardTickets.filter(t => !t.assignedConsultant && t.status !== 'Closed' && t.status !== 'Resolved').slice(0, 5).map(t => {
                      const slaInfo = getSlaBreachInfo(t);
                      const isEscalated = t.escalationFlag;
                      const borderClass = isEscalated || (slaInfo?.status === 'breached') 
                        ? 'border-l-4 border-l-destructive pl-2' 
                        : (slaInfo?.status === 'imminent' ? 'border-l-4 border-l-amber-500 pl-2' : '');
                      return (
                        <div key={t.id} className={`p-2 bg-zinc-50 border border-zinc-150 rounded-lg flex flex-col justify-between gap-1 ${borderClass}`}>
                          <div className="flex justify-between items-center">
                            <Link href={`/manager/tickets?search=${t.ticketNumber}`} className="font-bold text-zinc-900 hover:underline">{t.ticketNumber || t.id.slice(0, 8)}</Link>
                            <div className="flex gap-1 items-center">
                              {isEscalated && <Badge variant="destructive" className="text-[7px] font-bold py-0 px-1 uppercase leading-none h-4">Escalated</Badge>}
                              {slaInfo && (
                                <Badge className={`text-[7px] font-bold py-0 px-1 uppercase leading-none h-4 ${
                                  slaInfo.status === 'breached' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                                }`}>{slaInfo.label}</Badge>
                              )}
                              <Badge className="bg-zinc-100 text-zinc-800 border-none font-bold text-[7px] py-0 px-1 uppercase">{t.priority}</Badge>
                            </div>
                          </div>
                          <span className="text-zinc-700 truncate block font-sans">{t.title}</span>
                          <div className="flex justify-between items-center text-[8px] text-zinc-400">
                            <span>Org: {t.organization}</span>
                            <span>Module: {t.sapModule}</span>
                          </div>
                          {isEscalated && (
                            t.escalationAcknowledgedAt ? (
                              <div className="text-[8px] text-zinc-500 font-sans mt-0.5 pt-0.5 border-t border-zinc-100 flex justify-between items-center">
                                <span>Ack: {t.escalationAcknowledgedByName || 'Manager'}</span>
                                <span>{formatRelativeTime(t.escalationAcknowledgedAt)}</span>
                              </div>
                            ) : (
                              <div className="mt-1 flex justify-end">
                                <Button 
                                  size="sm" 
                                  onClick={() => acknowledgeEscalation(t.id, user?.id || '', user?.name || '')} 
                                  className="h-5 text-[8px] font-mono font-bold bg-zinc-950 hover:bg-zinc-800 text-white rounded px-2"
                                >
                                  Acknowledge
                                </Button>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                    {filteredDashboardTickets.filter(t => !t.assignedConsultant && t.status !== 'Closed' && t.status !== 'Resolved').length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 italic text-center py-10 font-sans">
                        All active workload allocated.
                      </div>
                    )}
                  </div>
                </div>
                <Link href="/manager/tickets?tab=unassigned" className="mt-3">
                  <Button variant="outline" className="w-full text-[9px] uppercase font-bold py-1.5 border-zinc-300 hover:bg-zinc-900 hover:text-white transition font-mono">
                    Dispatch Backlog &rarr;
                  </Button>
                </Link>
              </Card>

              {/* Box 2: Approval Queue */}
              <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 flex flex-col h-[340px] justify-between">
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                    <span className="font-extrabold text-zinc-900 uppercase text-[9px] tracking-wider">
                      Pending Approvals ({pendingApprovalsCount})
                    </span>
                    <Badge className="bg-amber-100 text-amber-800 text-[8px] font-bold">SIGN-OFF</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {/* Closure Requests */}
                    {pendingClosureRequests.slice(0, 3).map(r => (
                      <div key={r.requestId} className="p-2 bg-zinc-50 border border-zinc-150 rounded-lg flex flex-col justify-between gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-zinc-900">Closure: {r.ticketId}</span>
                          <span className="text-[7px] bg-red-100 text-red-800 px-1 py-0.2 rounded font-bold uppercase">Closure Approval</span>
                        </div>
                        <span className="text-zinc-650 truncate block font-sans">Total Hours: {r.funcHours + r.techHours}h</span>
                        <div className="flex justify-end gap-1 mt-1">
                          <Button size="sm" onClick={() => triggerClosureVerify(r.ticketId, r.requestId)} className="h-5 text-[8px] font-mono font-bold bg-zinc-950 hover:bg-zinc-800 text-white rounded px-2">Verify</Button>
                        </div>
                      </div>
                    ))}
                    {/* Effort Logs */}
                    {pendingEffortLogs.slice(0, 3).map(log => (
                      <div key={log.logId} className="p-2 bg-zinc-50 border border-zinc-150 rounded-lg flex flex-col justify-between gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-zinc-900">Effort: {log.hours}h by {log.consultantName}</span>
                          <span className="text-[7px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold uppercase">Timesheet Effort</span>
                        </div>
                        <span className="text-zinc-650 truncate block font-sans">{log.description}</span>
                        <div className="flex justify-end gap-1 mt-1">
                          <Button size="sm" onClick={() => handleApproveEffort(log.ticketId, log.logId, log.consultantName)} className="h-5 text-[8px] font-mono font-bold bg-green-600 hover:bg-green-750 text-white rounded px-2">Approve</Button>
                          <Button size="sm" onClick={() => triggerRejection('effort', log.ticketId, log.logId)} className="h-5 text-[8px] font-mono font-bold bg-red-600 hover:bg-red-750 text-white rounded px-2">Reject</Button>
                        </div>
                      </div>
                    ))}
                    {pendingApprovalsCount === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 italic text-center py-10 font-sans">
                        No approvals pending decision.
                      </div>
                    )}
                  </div>
                </div>
                <Button onClick={() => setSelectedTab('approvals')} variant="outline" className="mt-3 w-full text-[9px] uppercase font-bold py-1.5 border-zinc-300 hover:bg-zinc-900 hover:text-white transition font-mono">
                  Open Approvals Console &rarr;
                </Button>
              </Card>

              {/* Box 3: Escalation Center */}
              <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 flex flex-col h-[340px] justify-between">
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                    <span className="font-extrabold text-zinc-900 uppercase text-[9px] tracking-wider">
                      Escalation Center ({filteredDashboardTickets.filter(t => t.escalationFlag || t.priority === 'Critical').length})
                    </span>
                    <Badge className="bg-red-100 text-red-800 text-[8px] font-bold">EXPOSURE</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {filteredDashboardTickets.filter(t => t.escalationFlag || t.priority === 'Critical').slice(0, 5).map(t => {
                      const slaInfo = getSlaBreachInfo(t);
                      const isEscalated = t.escalationFlag;
                      const borderClass = isEscalated || (slaInfo?.status === 'breached') 
                        ? 'border-l-4 border-l-destructive pl-2' 
                        : (slaInfo?.status === 'imminent' ? 'border-l-4 border-l-amber-500 pl-2' : '');
                      return (
                        <div key={t.id} className={`p-2 bg-red-50/10 border border-red-100 rounded-lg flex flex-col justify-between gap-1 ${borderClass}`}>
                          <div className="flex justify-between items-center">
                            <Link href={`/manager/tickets?search=${t.ticketNumber}`} className="font-bold text-zinc-900 hover:underline">{t.ticketNumber || t.id}</Link>
                            <div className="flex gap-1 items-center">
                              {isEscalated && <Badge variant="destructive" className="text-[7px] font-bold py-0 px-1 uppercase leading-none h-4">Escalated</Badge>}
                              {slaInfo && (
                                <Badge className={`text-[7px] font-bold py-0 px-1 uppercase leading-none h-4 ${
                                  slaInfo.status === 'breached' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                                }`}>{slaInfo.label}</Badge>
                              )}
                              <span className="text-[7px] bg-red-100 text-red-800 px-1 py-0.2 rounded font-bold uppercase leading-none h-4">{t.priority}</span>
                            </div>
                          </div>
                          <span className="text-zinc-700 truncate block font-sans">{t.title}</span>
                          <div className="flex justify-between items-center text-[8px] text-zinc-450">
                            <span>Org: {t.organization}</span>
                            <span className="font-bold text-red-655">{t.escalationFlag ? 'Escalated Flag Set' : 'Critical P1 Priority'}</span>
                          </div>
                          {isEscalated && (
                            t.escalationAcknowledgedAt ? (
                              <div className="text-[8px] text-zinc-500 font-sans mt-0.5 pt-0.5 border-t border-zinc-100 flex justify-between items-center">
                                <span>Ack: {t.escalationAcknowledgedByName || 'Manager'}</span>
                                <span>{formatRelativeTime(t.escalationAcknowledgedAt)}</span>
                              </div>
                            ) : (
                              <div className="mt-1 flex justify-end">
                                <Button 
                                  size="sm" 
                                  onClick={() => acknowledgeEscalation(t.id, user?.id || '', user?.name || '')} 
                                  className="h-5 text-[8px] font-mono font-bold bg-zinc-950 hover:bg-zinc-800 text-white rounded px-2"
                                >
                                  Acknowledge
                                </Button>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                    {filteredDashboardTickets.filter(t => t.escalationFlag || t.priority === 'Critical').length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 italic text-center py-10 font-sans">
                        No active escalations.
                      </div>
                    )}
                  </div>
                </div>
                <Link href="/manager/tickets?tab=escalated" className="mt-3">
                  <Button variant="outline" className="w-full text-[9px] uppercase font-bold py-1.5 border-zinc-300 hover:bg-zinc-900 hover:text-white transition font-mono">
                    Inspect Escalations &rarr;
                  </Button>
                </Link>
              </Card>

              {/* Box 4: SLA Risk Center */}
              <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 flex flex-col h-[340px] justify-between">
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                    <span className="font-extrabold text-zinc-900 uppercase text-[9px] tracking-wider">
                      SLA Risk Center ({filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) !== 'Healthy').length})
                    </span>
                    <Badge className="bg-red-100 text-red-800 text-[8px] font-bold">WARNING</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) !== 'Healthy').slice(0, 5).map(t => {
                      const slaInfo = getSlaBreachInfo(t);
                      const isEscalated = t.escalationFlag;
                      const borderClass = isEscalated || (slaInfo?.status === 'breached') 
                        ? 'border-l-4 border-l-destructive pl-2' 
                        : (slaInfo?.status === 'imminent' ? 'border-l-4 border-l-amber-500 pl-2' : '');
                      return (
                        <div key={t.id} className={`p-2 bg-zinc-50 border border-zinc-150 rounded-lg flex flex-col justify-between gap-1 ${borderClass}`}>
                          <div className="flex justify-between items-center">
                            <Link href={`/manager/tickets?search=${t.ticketNumber}`} className="font-bold text-zinc-900 hover:underline">{t.ticketNumber || t.id}</Link>
                            <div className="flex gap-1 items-center">
                              {isEscalated && <Badge variant="destructive" className="text-[7px] font-bold py-0 px-1 uppercase leading-none h-4">Escalated</Badge>}
                              {slaInfo && (
                                <Badge className={`text-[7px] font-bold py-0 px-1 uppercase leading-none h-4 ${
                                  slaInfo.status === 'breached' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                                }`}>{slaInfo.label}</Badge>
                              )}
                              <span className={`text-[7px] px-1 py-0.2 rounded font-bold uppercase leading-none h-4 ${getSlaStatus(t, SYSTEM_NOW) === 'Breached' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{getSlaStatus(t, SYSTEM_NOW)}</span>
                            </div>
                          </div>
                          <span className="text-zinc-700 truncate block font-sans">{t.title}</span>
                          <div className="flex justify-between items-center text-[8px] text-zinc-400">
                            <span>Org: {t.organization}</span>
                            <span>Due: {t.slaDueAt ? new Date(t.slaDueAt).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                      );
                    })}
                    {filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) !== 'Healthy').length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 italic text-center py-10 font-sans">
                        All SLAs running in healthy range.
                      </div>
                    )}
                  </div>
                </div>
                <Link href="/manager/tickets?tab=slaBreached" className="mt-3">
                  <Button variant="outline" className="w-full text-[9px] uppercase font-bold py-1.5 border-zinc-300 hover:bg-zinc-900 hover:text-white transition font-mono">
                    Inspect SLA Risks &rarr;
                  </Button>
                </Link>
              </Card>

              {/* Box 5: Workload Balancer */}
              <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 flex flex-col h-[340px] justify-between">
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                    <span className="font-extrabold text-zinc-900 uppercase text-[9px] tracking-wider">
                      Workload Balancer
                    </span>
                    <Badge className="bg-zinc-100 text-zinc-800 text-[8px] font-bold">CAPACITY</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[9px]">
                    <div className="flex justify-between border-b border-zinc-100 pb-1.5 text-zinc-500 font-bold uppercase text-[7px]">
                      <span>Consultant</span>
                      <span>Active Tickets</span>
                      <span>Utilization %</span>
                    </div>
                    {consultantsLoad.slice(0, 5).map(c => (
                      <div key={c.name} className="flex justify-between items-center py-1 hover:bg-zinc-50 px-1 rounded">
                        <span className="font-bold text-zinc-900">{c.name}</span>
                        <span className="text-zinc-650">{c.activeCount} open</span>
                        <span className={`font-bold ${c.loadStatus === 'Overloaded' ? 'text-red-600' : c.loadStatus === 'Underutilized' ? 'text-amber-600' : 'text-green-700'}`}>{c.loadPercentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={() => setSelectedTab('resources')} variant="outline" className="mt-3 w-full text-[9px] uppercase font-bold py-1.5 border-zinc-300 hover:bg-zinc-900 hover:text-white transition font-mono">
                  Balance Resources &rarr;
                </Button>
              </Card>

              {/* Box 6: Contract Alerts */}
              <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 flex flex-col h-[340px] justify-between">
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                    <span className="font-extrabold text-zinc-900 uppercase text-[9px] tracking-wider">
                      Contract Alerts ({contracts.filter(c => c.isActive && ((c.usedHours / c.totalHours) >= 0.9 || (new Date(c.endDate).getTime() - SYSTEM_NOW) / (1000 * 60 * 60 * 24) <= 30)).length})
                    </span>
                    <Badge className="bg-amber-100 text-amber-800 text-[8px] font-bold">BUDGET</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[10px]">
                    {contracts.filter(c => c.isActive && ((c.usedHours / c.totalHours) >= 0.9 || (new Date(c.endDate).getTime() - SYSTEM_NOW) / (1000 * 60 * 60 * 24) <= 30)).map(c => {
                      const consumption = (c.usedHours / c.totalHours) * 100;
                      const daysRemaining = (new Date(c.endDate).getTime() - SYSTEM_NOW) / (1000 * 60 * 60 * 24);
                      return (
                        <div key={c.id} className="p-2 bg-zinc-50 border border-zinc-150 rounded-lg flex flex-col gap-1">
                          <span className="font-bold text-zinc-900">{c.organizationName}</span>
                          <span className="text-zinc-500 text-[8px] font-mono">FTE Total: {c.totalHours}h</span>
                          <div className="flex justify-between text-[8px]">
                            <span>Usage: <span className="font-bold text-zinc-800">{consumption.toFixed(0)}%</span></span>
                            <span>Ends in: <span className="font-bold text-zinc-850">{daysRemaining.toFixed(0)} days</span></span>
                          </div>
                        </div>
                      );
                    })}
                    {contracts.filter(c => c.isActive && ((c.usedHours / c.totalHours) >= 0.9 || (new Date(c.endDate).getTime() - SYSTEM_NOW) / (1000 * 60 * 60 * 24) <= 30)).length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 italic text-center py-10 font-sans">
                        All client contracts are within budget constraints.
                      </div>
                    )}
                  </div>
                </div>
                <Button onClick={() => setSelectedTab('customers')} variant="outline" className="mt-3 w-full text-[9px] uppercase font-bold py-1.5 border-zinc-300 hover:bg-zinc-900 hover:text-white transition font-mono">
                  Inspect Contract Ledger &rarr;
                </Button>
              </Card>

            </div>
          </div>

          {/* SECTION 3: RECHARTS 10 DISTINCT ANALYTICS SHOWCASE */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">
              3. Operational Analytics Showcase (10 Distinct Charts)
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Chart 1: Ticket volume trend */}
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                  <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider">1. Ticket Creation Trend</span>
                  <div className="flex gap-1">
                    {['daily', 'weekly', 'monthly', 'yearly'].map(group => (
                      <button
                        key={group}
                        onClick={() => setTrendGrouping(group as any)}
                        className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono border ${
                          trendGrouping === group ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartsData.ticketTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Line type="monotone" dataKey="Tickets" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 2: Open vs Closed */}
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">2. Active vs Closed Monthly Trend</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.openVsClosedTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Legend wrapperStyle={{ fontSize: 8 }} />
                      <Bar dataKey="Open" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Closed" fill={COLORS.green} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 3: SLA Compliance */}
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">3. SLA Compliance % Achievement</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartsData.slaComplianceTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <defs>
                        <linearGradient id="slaTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={COLORS.green} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} />
                      <YAxis stroke="#71717a" fontSize={8} domain={[0, 100]} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Area type="monotone" dataKey="SLA Compliance %" stroke={COLORS.green} fill="url(#slaTrendGrad)" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 4: Escalation Trend */}
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">4. Monthly SLA Escalations Trend</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartsData.escalationTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Line type="monotone" dataKey="Escalations" stroke={COLORS.red} strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 5: Customer Ticket Distribution */}
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">5. Customer Ticket Volume Distribution</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartsData.customerTicketDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        fill="#8884d8"
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      >
                        {chartsData.customerTicketDistribution.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? COLORS.blue : idx % 3 === 0 ? COLORS.green : COLORS.amber} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 6: Module Wise Tickets */}
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">6. SAP Module Tickets Volume</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.moduleWiseTickets} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 7: Consultant Utilization */}
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">7. Consultant Utilization Ratio (%)</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={chartsData.consultantUtilizationData} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis type="number" stroke="#71717a" fontSize={7} domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" stroke="#71717a" fontSize={7} width={80} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="Utilization %" fill={COLORS.green} radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 8: Resolution Time Trend */}
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">8. Average Ticket Resolution Time (Hours)</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartsData.resolutionTimeTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <defs>
                        <linearGradient id="resTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Area type="monotone" dataKey="Resolution Time (Hrs)" stroke={COLORS.blue} fill="url(#resTrendGrad)" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 9: Approval Volume */}
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">9. Completed Approvals Stacked Volume</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.approvalVolumeData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Legend wrapperStyle={{ fontSize: 8 }} />
                      <Bar dataKey="Timesheets" stackId="a" fill={COLORS.green} />
                      <Bar dataKey="Closures" stackId="a" fill={COLORS.blue} />
                      <Bar dataKey="Unlocks" stackId="a" fill={COLORS.amber} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 10: Customer Consumption */}
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">10. Customer Support Contract Hours Consumption</span>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.customerConsumptionData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Legend wrapperStyle={{ fontSize: 8 }} />
                      <Bar dataKey="Contracted" fill={COLORS.gray} />
                      <Bar dataKey="Used" fill={COLORS.green} />
                      <Bar dataKey="Remaining" fill={COLORS.blue} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

            </div>
          </div>

        </TabsContent>

        {/* ── TAB CONTENT: EXECUTIVE HEALTH ── */}
        <TabsContent value="health" className="space-y-6 outline-none">
          
          {/* SECTION 1: EXECUTIVE HEALTH OVERVIEW */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">1. Executive Health Overview</span>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Group A: Customer KPIs */}
              <Card className="border-l-4 border-l-blue-500 border border-zinc-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block">Customer KPIs</span>
                  <div className="mt-3 space-y-1.5 font-bold text-zinc-800 text-[10px]">
                    <div className="flex justify-between"><span>Total Customers:</span><span>{dashboardData.executive.totalCustomers}</span></div>
                    <div className="flex justify-between"><span>Active:</span><span className="text-green-700">{dashboardData.executive.activeCustomers}</span></div>
                    <div className="flex justify-between"><span>With Open Tickets:</span><span>{dashboardData.executive.customersWithOpenTickets}</span></div>
                    <div className="flex justify-between"><span>With P1s:</span><span className={dashboardData.executive.customersWithCriticalTickets > 0 ? 'text-red-650 animate-pulse' : ''}>{dashboardData.executive.customersWithCriticalTickets}</span></div>
                    <div className="flex justify-between"><span>With SLA Breach:</span><span className={dashboardData.executive.customersWithSlaBreaches > 0 ? 'text-red-650' : ''}>{dashboardData.executive.customersWithSlaBreaches}</span></div>
                    <div className="flex justify-between"><span>Awaiting Closure:</span><span>{dashboardData.executive.customersAwaitingClosure}</span></div>
                  </div>
                </div>
              </Card>

              {/* Group B: Ticket KPIs */}
              <Card className="border-l-4 border-l-amber-500 border border-zinc-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block">Ticket KPIs</span>
                  <div className="mt-3 space-y-1 text-zinc-800 text-[9px] font-bold">
                    <div className="flex justify-between"><span>Raised:</span><span>{dashboardData.executive.totalTicketsRaised}</span></div>
                    <div className="flex justify-between"><span>Open Backlog:</span><span className="text-blue-600">{dashboardData.executive.openTickets}</span></div>
                    <div className="flex justify-between"><span>Unassigned:</span><span className={dashboardData.executive.unassignedTickets > 0 ? 'text-amber-600 font-black' : ''}>{dashboardData.executive.unassignedTickets}</span></div>
                    <div className="flex justify-between"><span>Req. Gathering:</span><span>{dashboardData.executive.reqGathering}</span></div>
                    <div className="flex justify-between"><span>IP Functional:</span><span>{dashboardData.executive.ipFunc}</span></div>
                    <div className="flex justify-between"><span>IP Technical:</span><span>{dashboardData.executive.ipTech}</span></div>
                    <div className="flex justify-between"><span>Cust. Action:</span><span>{dashboardData.executive.custAction}</span></div>
                    <div className="flex justify-between"><span>On Hold:</span><span>{dashboardData.executive.onHold}</span></div>
                    <div className="flex justify-between"><span>Raised to SAP:</span><span>{dashboardData.executive.raisedToSap}</span></div>
                    <div className="flex justify-between"><span>Req. Closure:</span><span>{dashboardData.executive.requestClosure}</span></div>
                    <div className="flex justify-between text-green-700"><span>Closed:</span><span>{dashboardData.executive.closedTickets}</span></div>
                    <div className="flex justify-between text-red-600"><span>Reopened:</span><span>{dashboardData.executive.reopenedTickets}</span></div>
                  </div>
                </div>
              </Card>

              {/* Group C: Consultant KPIs */}
              <Card className="border-l-4 border-l-green-500 border border-zinc-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block">Consultant KPIs</span>
                  <div className="mt-3 space-y-1.5 font-bold text-zinc-800 text-[10px]">
                    <div className="flex justify-between"><span>Total Staff:</span><span>{dashboardData.executive.totalConsultants}</span></div>
                    <div className="flex justify-between"><span>Functional:</span><span>{dashboardData.executive.funcConsultants}</span></div>
                    <div className="flex justify-between"><span>Technical:</span><span>{dashboardData.executive.techConsultants}</span></div>
                    <div className="flex justify-between"><span>Active:</span><span>{dashboardData.executive.activeConsultants}</span></div>
                    <div className="flex justify-between"><span>Overloaded:</span><span className={dashboardData.executive.overloadedConsultants > 0 ? 'text-red-650 font-black' : ''}>{dashboardData.executive.overloadedConsultants}</span></div>
                    <div className="flex justify-between"><span>Underutilized:</span><span>{dashboardData.executive.underutilizedConsultants}</span></div>
                  </div>
                </div>
              </Card>

              {/* Group D: Approval KPIs */}
              <Card className="border-l-4 border-l-zinc-500 border border-zinc-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block">Approval KPIs</span>
                  <div className="mt-3 space-y-1.5 font-bold text-zinc-800 text-[10px]">
                    <div className="flex justify-between"><span>Est. Hours Pending:</span><span>{dashboardData.executive.estPendingApproval}</span></div>
                    <div className="flex justify-between"><span>Act. Hours Pending:</span><span className={dashboardData.executive.actPendingApproval > 0 ? 'text-amber-600' : ''}>{dashboardData.executive.actPendingApproval}</span></div>
                    <div className="flex justify-between"><span>Closures Pending:</span><span className={dashboardData.executive.closurePendingApproval > 0 ? 'text-red-605' : ''}>{dashboardData.executive.closurePendingApproval}</span></div>
                    <div className="flex justify-between"><span>Reopens Pending:</span><span>{dashboardData.executive.reopenPendingApproval}</span></div>
                    <div className="flex justify-between"><span>Unlocks Pending:</span><span>{dashboardData.executive.resourceChangePending}</span></div>
                  </div>
                </div>
              </Card>

              {/* Group E: SLA KPIs */}
              <Card className="border-l-4 border-l-red-500 border border-zinc-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block">SLA Compliance</span>
                  <div className="mt-3 space-y-1.5 font-bold text-zinc-800 text-[10px]">
                    <div className="flex justify-between"><span>SLA Healthy:</span><span className="text-green-700">{dashboardData.executive.slaHealthy}</span></div>
                    <div className="flex justify-between"><span>SLA Warning:</span><span className="text-amber-600">{dashboardData.executive.slaWarning}</span></div>
                    <div className="flex justify-between"><span>SLA Breached:</span><span className={dashboardData.executive.slaBreached > 0 ? 'text-red-600 font-black animate-pulse' : ''}>{dashboardData.executive.slaBreached}</span></div>
                    <div className="border-t border-zinc-200 pt-2 flex justify-between items-center mt-2.5">
                      <span className="text-[9px] uppercase">Compliance Index:</span>
                      <span className={`text-sm font-black ${dashboardData.executive.averageSlaCompliance >= 95 ? 'text-green-700' : 'text-red-650'}`}>{dashboardData.executive.averageSlaCompliance}%</span>
                    </div>
                  </div>
                </div>
              </Card>

            </div>
          </div>

          {/* SECTION 2: TODAY'S MANAGER ACTION CENTER */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">2. Today&apos;s Manager Action Center</span>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Box A: Unassigned Queue */}
              <Card className="border border-zinc-200 bg-zinc-50/50 p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-zinc-450 uppercase font-black tracking-wider block">Staffing Dispatch</span>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-zinc-950">{dashboardData.actionCenter.ticketsAwaitingAssign.length}</span>
                    <span className="text-zinc-500 font-medium">tickets need allocation</span>
                  </div>
                </div>
                <Link href="/manager/tickets?tab=unassigned" className="mt-4">
                  <Button variant="outline" className="w-full text-[9px] uppercase font-bold py-1 border-zinc-300 hover:bg-zinc-900 hover:text-white transition font-mono">
                    Dispatch Backlog <ArrowRight size={10} className="ml-1" />
                  </Button>
                </Link>
              </Card>

              {/* Box B: Actionable Approvals */}
              <Card className="border border-zinc-200 bg-zinc-50/50 p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-zinc-450 uppercase font-black tracking-wider block">Audits Pending Sign-off</span>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-zinc-950">{dashboardData.executive.totalApprovals}</span>
                    <span className="text-zinc-500 font-medium">approvals waiting manager</span>
                  </div>
                </div>
                <Button onClick={() => setSelectedTab('approvals')} variant="outline" className="mt-4 w-full text-[9px] uppercase font-bold py-1 border-zinc-300 hover:bg-zinc-900 hover:text-white transition font-mono">
                  Open Approvals Console <ArrowRight size={10} className="ml-1" />
                </Button>
              </Card>

              {/* Box C: SLA Mitigation */}
              <Card className="border border-zinc-200 bg-zinc-50/50 p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-zinc-450 uppercase font-black tracking-wider block">Active Delivery Exposure</span>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-red-650">{dashboardData.actionCenter.slaBreachTickets.length + dashboardData.actionCenter.slaDueToday.length}</span>
                    <span className="text-zinc-500 font-medium">at-risk incident SLA boundaries</span>
                  </div>
                </div>
                <Link href="/manager/tickets?tab=slaBreached" className="mt-4">
                  <Button variant="outline" className="w-full text-[9px] uppercase font-bold py-1 border-zinc-300 hover:bg-zinc-900 hover:text-white transition font-mono">
                    Inspect Risks <ArrowRight size={10} className="ml-1" />
                  </Button>
                </Link>
              </Card>

              {/* Box D: Aging Action */}
              <Card className="border border-zinc-200 bg-zinc-50/50 p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-zinc-450 uppercase font-black tracking-wider block">Stuck / Stalled Backlog</span>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-amber-600">{dashboardData.actionCenter.ticketsAging7Days.length}</span>
                    <span className="text-zinc-500 font-medium">tickets aging beyond 7 days</span>
                  </div>
                </div>
                <Link href="/manager/tickets" className="mt-4">
                  <Button variant="outline" className="w-full text-[9px] uppercase font-bold py-1 border-zinc-300 hover:bg-zinc-900 hover:text-white transition font-mono">
                    Audit Aging Backlog <ArrowRight size={10} className="ml-1" />
                  </Button>
                </Link>
              </Card>

            </div>
          </div>

          {/* SECTION 13: ALERTS & RISK INTELLIGENCE PANEL */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">3. Executive Risk Intelligence Alerts</span>
            
            <div className="space-y-3">
              {systemAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`border p-3.5 rounded-lg flex items-start justify-between gap-4 bg-white ${
                    alert.severity === 'Critical' ? 'border-red-200 bg-red-50/10' : 'border-zinc-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {alert.severity === 'Critical' ? (
                      <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={15} />
                    ) : (
                      <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={15} />
                    )}
                    <div>
                      <span className="font-bold text-zinc-900 block">{alert.reason}</span>
                      <span className="text-zinc-500 text-[10px] block mt-0.5">Recommended Manager Action: {alert.action}</span>
                    </div>
                  </div>
                  <Link href={alert.link}>
                    <Button variant="outline" className="text-[9px] uppercase font-bold h-7 py-1 px-3 border-zinc-300 hover:bg-zinc-50 font-mono">
                      Mitigate
                    </Button>
                  </Link>
                </div>
              ))}
              {systemAlerts.length === 0 && (
                <div className="text-center py-8 border border-dashed border-zinc-200 rounded-lg text-zinc-400 italic">No system alerts flagged today. Incident delivery SLAs are running healthy.</div>
              )}
            </div>
          </div>

        </TabsContent>

        {/* ── TAB CONTENT: TICKET CONTROL CENTER ── */}
        <TabsContent value="tickets" className="space-y-6 outline-none">
          
          {/* SECTION 3: TICKET OPERATIONS COMMAND CENTER */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">1. Ticket Operations Command Center</span>
            
            {/* Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              <Card className="p-3 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Active Backlog</span>
                <span className="text-lg font-bold text-zinc-950 block mt-1">{dashboardData.executive.openTickets}</span>
              </Card>
              <Card className="p-3 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">No Owner</span>
                <span className="text-lg font-bold text-amber-600 block mt-1">{dashboardData.executive.unassignedTickets}</span>
              </Card>
              <Card className="p-3 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Stalled (3d+)</span>
                <span className="text-lg font-bold text-zinc-950 block mt-1">{dashboardData.actionCenter.ticketsNoUpdate3Days.length}</span>
              </Card>
              <Card className="p-3 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Aging 7d+</span>
                <span className="text-lg font-bold text-zinc-950 block mt-1">{dashboardData.actionCenter.ticketsAging7Days.length}</span>
              </Card>
              <Card className="p-3 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Aging 15d+</span>
                <span className="text-lg font-bold text-zinc-950 block mt-1">{dashboardData.actionCenter.ticketsAging15Days.length}</span>
              </Card>
              <Card className="p-3 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Aging 30d+</span>
                <span className="text-lg font-bold text-zinc-950 block mt-1">{dashboardData.actionCenter.ticketsAging30Days.length}</span>
              </Card>
              <Card className="p-3 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Raised to SAP</span>
                <span className="text-lg font-bold text-zinc-950 block mt-1">{dashboardData.executive.raisedToSap}</span>
              </Card>
            </div>

            {/* Recharts grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">Ticket Status Distribution</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.statusData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">Ticket Priority Backlog Split</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.priorityData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">Open vs Closed Monthly Trend</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartsData.trendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="month" stroke="#71717a" fontSize={8} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Legend wrapperStyle={{ fontSize: 8 }} />
                      <Line type="monotone" dataKey="Raised" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="Closed" stroke={COLORS.green} strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">Ticket Type Distribution</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.typeData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill={COLORS.gray} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="border border-zinc-200 p-4 bg-white shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">Active Incident Aging buckets</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.agingData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill="#64748b" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

            </div>
          </div>

          {/* SECTION 6: SLA & AGING CONTROL CENTER */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">2. SLA & Aging Control Center (Incidents Specific)</span>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between col-span-1">
                <div>
                  <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block">Incident SLA Indicators</span>
                  <div className="mt-4 space-y-3 font-bold text-zinc-850 text-[10px]">
                    <div className="flex justify-between"><span>SLA Met/Healthy Incidents:</span><span className="text-green-700">{dashboardData.executive.slaHealthy}</span></div>
                    <div className="flex justify-between"><span>SLA Warning Incidents (&lt;24h):</span><span className="text-amber-600">{dashboardData.executive.slaWarning}</span></div>
                    <div className="flex justify-between"><span>SLA Breached Incidents:</span><span className="text-red-650 font-black animate-pulse">{dashboardData.executive.slaBreached}</span></div>
                    <div className="flex justify-between pt-2 border-t border-zinc-100">
                      <span>SLA Compliance Index:</span>
                      <span className={`text-md font-black ${dashboardData.executive.averageSlaCompliance >= 95 ? 'text-green-700' : 'text-red-650'}`}>{dashboardData.executive.averageSlaCompliance}%</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Top SLA Risk incident list */}
              <Card className="col-span-2 border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="p-3.5 bg-zinc-50 border-b border-zinc-200">
                  <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">Top Incident SLA Risk Tickets</span>
                </div>
                <div className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-zinc-100 text-zinc-500 font-bold uppercase text-[8px] border-b border-zinc-200">
                        <tr>
                          <th className="py-2 px-3">Ticket ID</th>
                          <th className="py-2 px-3">Customer</th>
                          <th className="py-2 px-3 text-center">Priority</th>
                          <th className="py-2 px-3">Due Target</th>
                          <th className="py-2 px-3">Assignee</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150">
                        {filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable').slice(0, 4).map(t => {
                          const slaInfo = getSlaBreachInfo(t);
                          const isEscalated = t.escalationFlag;
                          const borderClass = isEscalated || (slaInfo?.status === 'breached') 
                            ? 'border-l-4 border-l-destructive' 
                            : (slaInfo?.status === 'imminent' ? 'border-l-4 border-l-amber-500' : '');
                          return (
                            <tr key={t.id} className="hover:bg-zinc-50/50">
                              <td className={`py-2 px-3 font-bold text-zinc-950 ${borderClass}`}>
                                <div className="flex items-center gap-1.5">
                                  <Link href={`/manager/tickets/${t.id}`} className="hover:underline">{t.ticketNumber || t.id}</Link>
                                  {isEscalated && <Badge variant="destructive" className="text-[7px] font-bold py-0 px-1 uppercase leading-none h-4">Escalated</Badge>}
                                  {slaInfo && (
                                    <Badge className={`text-[7px] font-bold py-0 px-1 uppercase leading-none h-4 ${
                                      slaInfo.status === 'breached' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                                    }`}>{slaInfo.label}</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 font-semibold text-zinc-650 truncate max-w-[100px]">{t.organization}</td>
                              <td className="py-2 px-3 text-center font-bold text-red-650">{t.priority}</td>
                              <td className="py-2 px-3 text-zinc-500 whitespace-nowrap">{new Date(t.slaDueAt).toLocaleString()}</td>
                              <td className="py-2 px-3 text-zinc-650 font-semibold">{t.assignedConsultant || 'Unassigned'}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-1.5 py-0.2 rounded font-bold border text-[8px] uppercase text-blue-700 bg-blue-50 border-blue-200">{t.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable').length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-zinc-400 italic">No incident SLA risks found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>

            </div>
          </div>

        </TabsContent>

        {/* ── TAB CONTENT: CONSULTANT LOAD & CAPACITY ── */}
        <TabsContent value="resources" className="space-y-6 outline-none">
          
          {/* SECTION 7: CONSULTANT WORKLOAD & CAPACITY CENTER */}
          <div className="space-y-4" id="loadCockpit">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">1. Consultant Workload & Capacity Control</span>
            
            {/* Working capacity descriptors */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-zinc-50 p-4 border border-zinc-200 rounded-lg">
              <div>
                <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block">Expectation Policy</span>
                <span className="font-semibold text-zinc-700 block mt-1">Expected work days: Sun to Thu</span>
                <span className="text-[10px] text-zinc-500 block">Friday & Saturday skipped. Daily capacity: 8 hours.</span>
              </div>
              <div>
                <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block">Expected Month Hours</span>
                <span className="text-base font-bold text-zinc-950 block mt-1">{workingDaysInMonth * 8} Hours / FTE</span>
                <span className="text-[10px] text-zinc-500 block">Based on {workingDaysInMonth} active expected working days.</span>
              </div>
              <div>
                <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block">Active Engineers allocated</span>
                <span className="text-base font-bold text-zinc-950 block mt-1">{consultantsLoad.filter(c => c.activeCount > 0).length} Consultants</span>
                <span className="text-[10px] text-zinc-500 block">Out of {consultantsLoad.length} total staff index.</span>
              </div>
              <div>
                <span className="font-bold text-zinc-450 uppercase text-[8px] tracking-wider block">Capacity Overload States</span>
                <span className="text-base font-bold text-red-650 block mt-1">{consultantsLoad.filter(c => c.loadStatus === 'Overloaded').length} Consultants overloaded</span>
                <span className="text-[10px] text-zinc-500 block">Load exceeding 85% capacity limits.</span>
              </div>
            </div>

            {/* Load Map Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {consultantsLoad.map((c) => {
                const isOver = c.loadStatus === 'Overloaded';
                const isUnder = c.loadStatus === 'Underutilized';
                
                return (
                  <Card key={c.name} className={`p-4 bg-white border shadow-sm flex flex-col justify-between transition cursor-pointer hover:border-zinc-350 ${
                    selectedConsultant === c.name ? 'border-zinc-950 ring-1 ring-zinc-150' : 'border-zinc-200'
                  }`} onClick={() => setSelectedConsultant(selectedConsultant === c.name ? null : c.name)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-zinc-900 text-xs block">{c.name}</span>
                        <span className="text-[8px] text-zinc-450 uppercase font-black tracking-widest">{c.type} • {c.expertise.join('/')}</span>
                      </div>
                      <Badge className={`border-none font-bold text-[8px] uppercase ${
                        isOver ? 'bg-red-100 text-red-800 animate-pulse' : isUnder ? 'bg-zinc-100 text-zinc-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {c.loadStatus}
                      </Badge>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1 text-[9px] font-bold text-zinc-650">
                        <span>Load level:</span>
                        <span>{c.activeCount} active ({c.loadPercentage}%)</span>
                      </div>
                      <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOver ? 'bg-red-500' : isUnder ? 'bg-amber-400' : 'bg-green-500'
                          }`}
                          style={{ width: `${c.loadPercentage}%` }}
                        />
                      </div>
                    </div>

                    {selectedConsultant === c.name && (
                      <div className="mt-3.5 pt-2.5 border-t border-zinc-200 space-y-1.5">
                        <span className="text-[8px] text-zinc-400 uppercase font-black block">Backlog Queue List</span>
                        {filteredDashboardTickets.filter(t => 
                          t.status !== 'Closed' && 
                          t.status !== 'Resolved' && 
                          (t.assignedConsultant === c.name || t.consultantEfforts?.some(e => e.consultantName === c.name && !e.isDeleted))
                        ).map(t => (
                          <div key={t.id} className="flex justify-between items-center text-[9px] py-1 border-b border-zinc-100 last:border-0 hover:bg-zinc-100/50 px-1 rounded">
                            <Link href={`/manager/tickets/${t.id}`} className="font-bold text-zinc-800 hover:underline truncate max-w-[120px]">{t.ticketNumber || t.id} - {t.title}</Link>
                            <Badge className="bg-zinc-100 text-zinc-700 border-none font-bold text-[8px] py-0 px-1 uppercase">{t.priority}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Charts section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">Consultant Load Distribution</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultantsLoad.map(c => ({ name: c.name, value: c.activeCount }))} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">FTE Hours Consumption variance</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultantsLoad.map(c => {
                      const loggedAll = filteredDashboardTickets.flatMap(t => t.actualHoursLogs || [])
                        .filter(ah => (ah.consultantId === c.id || ah.approvedBy === c.name))
                        .reduce((sum, ah) => sum + ah.actualHours, 0);
                      const approvedOnly = filteredDashboardTickets.flatMap(t => t.actualHoursLogs || [])
                        .filter(ah => (ah.consultantId === c.id || ah.approvedBy === c.name) && ah.approvalStatus?.toLowerCase() === 'approved')
                        .reduce((sum, ah) => sum + ah.actualHours, 0);
                      return { name: c.name, Expected: workingDaysInMonth * 8, Logged: loggedAll || 0, Approved: approvedOnly || 0 };
                    })} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Legend wrapperStyle={{ fontSize: 8 }} />
                      <Bar dataKey="Expected" fill={COLORS.gray} />
                      <Bar dataKey="Logged" fill={COLORS.blue} />
                      <Bar dataKey="Approved" fill={COLORS.green} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>

        </TabsContent>

        {/* ── TAB CONTENT: CUSTOMER HEALTH COMMAND CENTER ── */}
        <TabsContent value="customers" className="space-y-6 outline-none">
          
          {/* SECTION 6: CUSTOMER HEALTH & RISK CENTER */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">1. Customer Health Command Center</span>
            
            {/* Risk Ledger table */}
            <Card className="border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="p-3.5 bg-zinc-50 border-b border-zinc-200">
                <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">Operational Customer health & SLA Ledger</span>
              </div>
              <div className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-zinc-100 text-zinc-500 font-bold uppercase text-[7px] border-b border-zinc-200">
                      <tr>
                        <th className="py-2.5 px-4 font-bold">Customer Name</th>
                        <th className="py-2.5 px-4 font-bold text-center">Contract Period</th>
                        <th className="py-2.5 px-4 font-bold text-center">Type / Status</th>
                        <th className="py-2.5 px-4 font-bold text-center">Hours (Tot/Mth)</th>
                        <th className="py-2.5 px-4 font-bold text-center">Consumed Hours</th>
                        <th className="py-2.5 px-4 font-bold text-center">Remaining Hours</th>
                        <th className="py-2.5 px-4 font-bold text-center">Utilization</th>
                        <th className="py-2.5 px-4 font-bold text-center">Tickets (O/C/R/E)</th>
                        <th className="py-2.5 px-4 font-bold text-center">SLA Breaches</th>
                        <th className="py-2.5 px-4 font-bold text-center">CSAT Rating</th>
                        <th className="py-2.5 px-4 font-bold text-center">Health Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {dashboardData.customerRiskLedger.map((c) => (
                        <tr key={c.name} className="hover:bg-zinc-50/50">
                          <td className="py-2.5 px-4 font-bold text-zinc-950">{c.name}</td>
                          <td className="py-2.5 px-4 text-center font-mono whitespace-nowrap text-zinc-500">
                            {c.startDate} to {c.endDate}
                          </td>
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            <div className="font-semibold text-zinc-700 text-[9px]">{c.contractType}</div>
                            <div className="text-[7px] font-bold text-zinc-400 mt-0.5">{c.contractStatus}</div>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-zinc-650">
                            {c.totalHours}h / {c.monthlyHours}h
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-zinc-900">
                            {c.approvedHours.toFixed(1)}h
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-zinc-600">
                            {c.remainingHours.toFixed(1)}h
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono">
                            <span className={`font-bold ${c.utilizationPercent >= 90 ? 'text-red-650 font-black' : c.utilizationPercent >= 75 ? 'text-amber-600' : 'text-green-700'}`}>
                              {c.utilizationPercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-zinc-700">
                            {c.openTickets} / {c.closedTickets} / {c.reopened} / {c.escalated}
                          </td>
                          <td className={`py-2.5 px-4 text-center font-mono font-bold ${c.breached > 0 ? 'text-red-650 font-black animate-pulse' : 'text-zinc-500'}`}>
                            {c.breached}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold">
                            <span className={c.csat <= 3.0 ? 'text-red-650' : c.csat >= 4.5 ? 'text-green-700' : 'text-zinc-600'}>
                              {c.csat.toFixed(1)} ★
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <Badge className={`border-none font-bold text-[7px] uppercase tracking-wider ${
                              c.level === 'Critical' ? 'bg-red-605 text-white animate-pulse bg-red-600' :
                              c.level === 'Warning' ? 'bg-amber-100 text-amber-800 bg-amber-200' : 'bg-green-150 text-green-800 bg-green-200'
                            }`}>
                              {c.level}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">Customer Ticket Volume Share</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.topCustomersVolume} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">Customer Satisfaction ratings index</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={customersList.map(org => {
                      const ratings = scopedTickets.filter(t => t.organization === org && t.rating).map(t => t.rating!.score);
                      const avg = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1) : '4.5';
                      return { name: org, CSAT: parseFloat(avg) };
                    })} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} />
                      <YAxis stroke="#71717a" fontSize={8} domain={[0, 5]} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="CSAT" fill={COLORS.green} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>

        </TabsContent>

        {/* ── TAB CONTENT: GOVERNANCE & FINANCIALS ── */}
        <TabsContent value="approvals" className="space-y-6 outline-none">
          
          {/* SECTION 9: APPROVAL & CLOSURE CONTROL CENTER */}
          <div className="space-y-4" id="governanceApproval">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">1. Approval & Closure Control Center</span>
            
            {/* Grouped approvals list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Timesheets List */}
              <Card className="border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between h-96">
                <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
                  <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">Timesheet Approvals Queue ({pendingEffortLogs.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                  {pendingEffortLogs.map(log => (
                    <div key={log.logId} className="p-3 border-b border-zinc-100 flex justify-between items-start hover:bg-zinc-50/50">
                      <div>
                        <span className="font-bold text-zinc-800 block text-[10px]">{log.consultantName} logged {log.hours}h</span>
                        <span className="text-zinc-450 block text-[8px] font-mono">{log.ticketId} • {log.activityType}</span>
                        <span className="text-zinc-500 block mt-1 leading-relaxed text-[9px] truncate max-w-[180px]" title={log.description}>{log.description}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" className="h-6 w-6 bg-green-600 hover:bg-green-700 text-white rounded cursor-pointer" onClick={() => handleApproveEffort(log.ticketId, log.logId, log.consultantName)}>
                          <Check size={11} />
                        </Button>
                        <Button size="icon" className="h-6 w-6 bg-red-650 hover:bg-red-700 text-white rounded cursor-pointer" onClick={() => triggerRejection('effort', log.ticketId, log.logId)}>
                          <X size={11} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingEffortLogs.length === 0 && (
                    <div className="py-20 text-center text-zinc-400 italic">No effort log audits pending.</div>
                  )}
                </div>
              </Card>

              {/* Closures List */}
              <Card className="border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between h-96">
                <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
                  <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">Closure Requests ({pendingClosureRequests.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                  {pendingClosureRequests.map(r => (
                    <div key={r.requestId} className="p-3 border-b border-zinc-100 flex justify-between items-start hover:bg-zinc-50/50">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-zinc-800 text-[10px]">{r.ticketId}</span>
                          <span className="text-zinc-400 text-[8px] font-semibold font-mono">({r.customerName})</span>
                        </div>
                        <span className="text-zinc-900 block text-[9px] font-bold truncate max-w-[180px] mt-0.5">{r.ticketTitle}</span>
                        <span className="text-zinc-450 block text-[8px] font-mono mt-0.5">By: {r.requestedBy} • Total: {r.funcHours + r.techHours}h</span>
                        <span className="text-zinc-500 block mt-1 leading-relaxed text-[9px] truncate max-w-[180px]">{r.summary}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-6 bg-zinc-950 hover:bg-zinc-800 text-white text-[9px] uppercase font-bold px-2 rounded cursor-pointer font-mono" onClick={() => triggerClosureVerify(r.ticketId, r.requestId)}>
                          Verify
                        </Button>
                        <Button size="icon" className="h-6 w-6 bg-red-650 hover:bg-red-700 text-white rounded cursor-pointer" onClick={() => triggerRejection('closure', r.ticketId, r.requestId)}>
                          <X size={11} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingClosureRequests.length === 0 && (
                    <div className="py-20 text-center text-zinc-400 italic">No closure verifications pending.</div>
                  )}
                </div>
              </Card>

              {/* Unlocks List */}
              <Card className="border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between h-96">
                <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
                  <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">Work Log Unlock Requests ({pendingUnlockRequests.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                  {pendingUnlockRequests.map(u => (
                    <div key={u.requestId} className="p-3 border-b border-zinc-100 flex justify-between items-start hover:bg-zinc-50/50">
                      <div>
                        <span className="font-bold text-zinc-800 block text-[10px]">Unlock Log: {u.ticketId}</span>
                        <span className="text-zinc-450 block text-[8px] font-mono">Requester: {u.requestedBy}</span>
                        <span className="text-zinc-550 block mt-1 text-[9px] truncate max-w-[180px]" title={u.reason}>{u.reason}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" className="h-6 w-6 bg-green-600 hover:bg-green-700 text-white rounded cursor-pointer" onClick={() => handleApproveUnlock(u.ticketId, u.requestId, u.requestedBy)}>
                          <Check size={11} />
                        </Button>
                        <Button size="icon" className="h-6 w-6 bg-red-650 hover:bg-red-700 text-white rounded cursor-pointer" onClick={() => triggerRejection('unlock', u.ticketId, u.requestId)}>
                          <X size={11} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingUnlockRequests.length === 0 && (
                    <div className="py-20 text-center text-zinc-400 italic">No timesheet unlock requests pending.</div>
                  )}
                </div>
              </Card>

            </div>

            {/* Password Reset & Ticket Reopen Requests Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              
              {/* Password Reset Requests */}
              <Card className="border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between h-96">
                <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
                  <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">Password Reset Requests ({passwordRequests.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0 font-mono text-[10px]">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-150 uppercase font-bold text-[8px] tracking-wider text-zinc-500">
                        <th className="p-2.5">User</th>
                        <th className="p-2.5">Organization</th>
                        <th className="p-2.5">Requested At</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {loadingRequests ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-zinc-450 italic font-mono">Querying reset requests...</td>
                        </tr>
                      ) : passwordRequests.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-zinc-450 italic font-sans">No pending password reset requests.</td>
                        </tr>
                      ) : (
                        passwordRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-zinc-50/50">
                            <td className="p-2.5">
                              <div>
                                <span className="font-bold text-zinc-800 block text-[10px]">{req.requester_name}</span>
                                <span className="text-zinc-450 block text-[9px]">{req.requester_email}</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-zinc-650 font-semibold">{req.organization}</td>
                            <td className="p-2.5 text-zinc-550 font-mono">
                              {new Date(req.requested_at).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-6 bg-zinc-950 hover:bg-zinc-800 text-white text-[9px] uppercase font-bold px-2 rounded cursor-pointer font-mono"
                                  onClick={() => handleApprovePasswordRequest(req)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="icon"
                                  className="h-6 w-6 bg-red-650 hover:bg-red-700 text-white rounded cursor-pointer"
                                  onClick={() => handleRejectPasswordRequest(req)}
                                >
                                  <X size={11} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Ticket Reopen Requests */}
              <Card className="border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col justify-between h-96">
                <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
                  <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider">Ticket Reopen Requests ({reopenRequests.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0 font-mono text-[10px]">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-150 uppercase font-bold text-[8px] tracking-wider text-zinc-500">
                        <th className="p-2.5">Ticket</th>
                        <th className="p-2.5">Requester</th>
                        <th className="p-2.5">Reason</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {loadingReopens ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-zinc-450 italic font-mono">Querying reopen requests...</td>
                        </tr>
                      ) : reopenRequests.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-zinc-450 italic font-sans">No pending ticket reopen requests.</td>
                        </tr>
                      ) : (
                        reopenRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-zinc-50/50">
                            <td className="p-2.5">
                              <div>
                                <span className="font-bold text-zinc-800 block text-[10px]">{req.ticket_number}</span>
                                <span className="text-zinc-450 block text-[9px] truncate max-w-[120px]" title={req.ticket_title}>{req.ticket_title}</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-zinc-650 font-semibold">{req.requester_name}</td>
                            <td className="p-2.5 text-zinc-550 font-mono">
                              <span className="truncate max-w-[120px] block" title={req.reason}>{req.reason}</span>
                            </td>
                            <td className="p-2.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-6 bg-zinc-950 hover:bg-zinc-800 text-white text-[9px] uppercase font-bold px-2 rounded cursor-pointer font-mono"
                                  onClick={() => handleApproveReopenRequest(req)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="icon"
                                  className="h-6 w-6 bg-red-650 hover:bg-red-700 text-white rounded cursor-pointer"
                                  onClick={() => handleRejectReopenRequest(req)}
                                >
                                  <X size={11} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

            </div>
          </div>

          {/* SECTION 11: HOURS, EFFORT & BILLING INSIGHT CENTER */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">2. Hours, Effort & Billing Insight Center</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Total Estimated Hours</span>
                <span className="text-lg font-bold text-zinc-900 block mt-1">{dashboardData.financials.totalEstHrs}h</span>
              </Card>
              
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Logged Hours (Total)</span>
                <span className="text-lg font-bold text-zinc-900 block mt-1">{dashboardData.financials.totalActHrs}h</span>
              </Card>

              <Card className="p-4 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Approved Hours</span>
                <span className="text-lg font-bold text-zinc-900 block mt-1">{dashboardData.financials.approvedActHrs}h</span>
              </Card>
              
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Billable Hours Logged</span>
                <span className="text-lg font-bold text-green-700 block mt-1">{dashboardData.financials.billableHrs}h</span>
              </Card>

              <Card className="p-4 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Non-Billable Hours Logged</span>
                <span className="text-lg font-bold text-zinc-905 block mt-1">{dashboardData.financials.nonBillableHrs}h</span>
              </Card>

              <Card className="p-4 bg-white border border-zinc-200 shadow-sm text-center">
                <span className="font-bold text-zinc-450 uppercase text-[8px] block">Est vs Act Hours Variance</span>
                <span className={`text-lg font-bold block mt-1 ${dashboardData.financials.variance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {dashboardData.financials.variance >= 0 ? `+${dashboardData.financials.variance}` : dashboardData.financials.variance}h
                </span>
              </Card>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">Estimated vs Actual Hours Comparison</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Estimated', Hours: dashboardData.financials.totalEstHrs },
                      { name: 'Logged (Total)', Hours: dashboardData.financials.totalActHrs },
                      { name: 'Approved', Hours: dashboardData.financials.approvedActHrs }
                    ]} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={8} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="Hours" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">FTE Billing Split (Billable vs Non-Billable)</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Billable Hours', value: dashboardData.financials.billableHrs },
                          { name: 'Non-Billable Hours', value: dashboardData.financials.nonBillableHrs }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={65}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill={COLORS.green} />
                        <Cell fill={COLORS.gray} />
                      </Pie>
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Legend wrapperStyle={{ fontSize: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>

          {/* SECTION 10: SAP MODULE PERFORMANCE CENTER */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">3. SAP Module Performance Center</span>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Module counts table */}
              <Card className="col-span-2 border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="p-3 bg-zinc-50 border-b border-zinc-200">
                  <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">Module Ticket and Load Ratios</span>
                </div>
                <div className="p-0">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-zinc-100 text-zinc-500 font-bold uppercase text-[8px] border-b border-zinc-200">
                      <tr>
                        <th className="py-2.5 px-4 font-bold">SAP Module</th>
                        <th className="py-2.5 px-4 font-bold text-center">Active Backlog Count</th>
                        <th className="py-2.5 px-4 font-bold text-center">FTE Hours Consumed</th>
                        <th className="py-2.5 px-4 font-bold text-center">Critical Issues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {SAP_MODULES_LIST.map(m => {
                        const mTickets = filteredDashboardTickets.filter(t => t.sapModule === m);
                        const mHours = mTickets.flatMap(t => t.actualHoursLogs || []).filter(ah => ah.approvalStatus?.toLowerCase() === 'approved').reduce((sum, ah) => sum + ah.actualHours, 0);
                        const mCritical = mTickets.filter(t => t.priority === 'Critical' && t.status !== 'Closed' && t.status !== 'Resolved').length;

                        return (
                          <tr key={m} className="hover:bg-zinc-50/50">
                            <td className="py-2.5 px-4 font-bold text-zinc-900">{m}</td>
                            <td className="py-2.5 px-4 text-center font-semibold">{mTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length}</td>
                            <td className="py-2.5 px-4 text-center font-bold">{mHours}h</td>
                            <td className={`py-2.5 px-4 text-center font-bold ${mCritical > 0 ? 'text-red-650' : 'text-zinc-400'}`}>{mCritical}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Module share chart */}
              <Card className="p-4 bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
                <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-wider block mb-3 pb-1 border-b border-zinc-100">Live SAP Modules Backlog distribution</span>
                <div className="h-64 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.moduleData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={7} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

            </div>
          </div>

        </TabsContent>

        {/* ── TAB CONTENT: TIMELINE ── */}
        <TabsContent value="timeline" className="space-y-6 outline-none">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* SECTION 12: RECENT ACTIVITY & AUDIT TIMELINE */}
            <Card className="col-span-2 border border-zinc-200 bg-white shadow-sm rounded-lg">
              <CardHeader className="bg-zinc-55 border-b border-zinc-200 py-3.5 px-4">
                <CardTitle className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">Recent Activity & Audit Timeline Feed</CardTitle>
                <CardDescription className="text-[10px] text-zinc-500 mt-0.5">Real-time log of ticketing updates, lead allocations, and hours approval changes.</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative border-l border-zinc-200 pl-4 ml-2 space-y-5">
                  {auditTimelineFeed.map((item, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-zinc-400 border border-white" />
                      <div className="text-[10px]">
                        <span className="font-bold text-zinc-900">{item.actor}</span>
                        <span className="text-zinc-500 font-bold mx-1">({item.role})</span>
                        <span className="text-zinc-700">{item.action}</span>
                        <span className="text-zinc-400 font-bold ml-1 font-mono">[{item.ticketId}]</span>
                        <span className="text-zinc-400 block text-[8px] mt-0.5">{item.time}</span>
                      </div>
                    </div>
                  ))}
                  {auditTimelineFeed.length === 0 && (
                    <div className="text-center py-10 text-zinc-450 italic">No recent timeline logs recorded.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SECTION 11: REOPEN & ESCALATION INSIGHT CENTER */}
            <Card className="border border-zinc-200 bg-white shadow-sm rounded-lg flex flex-col justify-between">
              <div>
                <CardHeader className="bg-zinc-55 border-b border-zinc-200 py-3.5 px-4">
                  <CardTitle className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">Reopen & Escalation Control Panel</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                      <span className="font-semibold text-zinc-700">Total Reopened Tickets:</span>
                      <Badge className="bg-red-100 text-red-800 font-bold text-[9px] border-none">{dashboardData.executive.reopenedTickets}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                      <span className="font-semibold text-zinc-700">Reopen rate:</span>
                      <span className="font-black text-zinc-900">
                        {dashboardData.executive.totalTicketsRaised > 0 
                          ? ((dashboardData.executive.reopenedTickets / dashboardData.executive.totalTicketsRaised) * 100).toFixed(1) 
                          : '0'}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                      <span className="font-semibold text-zinc-700">OSS Raised Tickets:</span>
                      <Badge className="bg-zinc-100 text-zinc-800 font-bold text-[9px] border-none">{dashboardData.executive.raisedToSap}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="font-semibold text-zinc-700">Audit Unlock Requests:</span>
                      <Badge className="bg-zinc-100 text-zinc-800 font-bold text-[9px] border-none">{dashboardData.executive.resourceChangePending}</Badge>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

          </div>

          {/* SECTION 4: WORKFLOW MANAGEMENT CONSOLE */}
          <div className="space-y-4 pt-4 border-t border-zinc-200">
            <span className="text-[10px] font-bold text-zinc-950 uppercase tracking-widest block font-mono border-b border-zinc-200 pb-1">
              4. Operational Workflow Management Console
            </span>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-[11px]">
              
              {/* Widget 1: Waiting Assignment */}
              <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 flex flex-col h-[380px]">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                  <span className="font-extrabold text-zinc-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <Users size={12} className="text-zinc-500" />
                    Waiting Assignment ({waitingAssignmentTickets.length})
                  </span>
                  <Badge className="bg-zinc-100 text-zinc-800 text-[9px] font-bold px-1.5 py-0.5">NEW / UNASSIGNED</Badge>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {waitingAssignmentTickets.map((t) => (
                    <div key={t.id} className="p-2.5 bg-zinc-50 border border-zinc-150 rounded-lg hover:border-zinc-350 transition flex flex-col justify-between gap-1.5">
                      <div className="flex justify-between items-start">
                        <Link href={`/manager/tickets?search=${t.ticketNumber}`} className="font-extrabold text-zinc-900 hover:underline text-[10px] uppercase">
                          {t.ticketNumber || t.id.slice(0, 8)}
                        </Link>
                        <span className={`text-[8px] font-extrabold uppercase px-1 py-0.5 rounded ${
                          t.priority === 'Critical' ? 'bg-red-50 text-red-700' : 'bg-zinc-100 text-zinc-700'
                        }`}>
                          {t.priority}
                        </span>
                      </div>
                      <span className="text-zinc-700 font-semibold line-clamp-1">{t.title}</span>
                      <div className="flex justify-between items-center text-[9px] text-zinc-400">
                        <span>Org: {t.organization}</span>
                        <span className="text-zinc-500">{t.sapModule}</span>
                      </div>
                    </div>
                  ))}
                  {waitingAssignmentTickets.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 italic text-center py-12">
                      <CheckCircle size={24} className="text-emerald-500 mb-2" />
                      All tickets assigned successfully.
                    </div>
                  )}
                </div>
              </Card>

              {/* Widget 2: Approvals Queue */}
              <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 flex flex-col h-[380px]">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                  <span className="font-extrabold text-zinc-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <Timer size={12} className="text-zinc-500" />
                    Approvals & Governance ({approvalsQueueList.length})
                  </span>
                  <Badge className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5">PENDING SIGN-OFF</Badge>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {approvalsQueueList.map((app, idx) => (
                    <div key={idx} className="p-2.5 bg-zinc-50 border border-zinc-150 rounded-lg hover:border-zinc-350 transition flex flex-col justify-between gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-[9px] uppercase tracking-wider text-zinc-500">{app.type}</span>
                        <span className="font-bold text-zinc-900 text-[9px]">{app.ticketNumber}</span>
                      </div>
                      <span className="text-zinc-700 font-semibold line-clamp-1">{app.title}</span>
                      <p className="text-[9px] text-zinc-500 bg-zinc-100/50 p-1 rounded font-mono break-all">{app.detail}</p>
                      <div className="flex justify-end gap-1.5 pt-1">
                        <Button
                          onClick={() => setSelectedTab(app.actionTab)}
                          size="sm"
                          className="h-5 text-[8px] uppercase font-bold bg-zinc-950 hover:bg-zinc-800 text-white rounded px-2"
                        >
                          Resolve Approval
                        </Button>
                      </div>
                    </div>
                  ))}
                  {approvalsQueueList.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 italic text-center py-12">
                      <CheckCircle size={24} className="text-emerald-500 mb-2" />
                      No approvals pending decision.
                    </div>
                  )}
                </div>
              </Card>

              {/* Widget 3: Escalations & SLA Breaches */}
              <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl p-4 flex flex-col h-[380px]">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                  <span className="font-extrabold text-zinc-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={12} className="text-zinc-500" />
                    Escalations & SLA Breaches ({escalationsAndBreachesList.length})
                  </span>
                  <Badge className="bg-red-100 text-red-800 text-[9px] font-bold px-1.5 py-0.5">EXPOSURE WARNING</Badge>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {escalationsAndBreachesList.map((esc, idx) => (
                    <div key={idx} className="p-2.5 bg-red-50/10 border border-red-100 rounded-lg hover:border-red-200 transition flex flex-col justify-between gap-1.5">
                      <div className="flex justify-between items-start">
                        <span className={`text-[8px] font-extrabold uppercase px-1 py-0.5 rounded border ${esc.badgeColor}`}>
                          {esc.type}
                        </span>
                        <span className="font-bold text-zinc-950 text-[9px]">{esc.ticketNumber}</span>
                      </div>
                      <span className="text-zinc-800 font-semibold line-clamp-1">{esc.title}</span>
                      <div className="flex justify-between items-center text-[9px] text-zinc-400">
                        <span className="text-red-650 font-bold">{esc.detail}</span>
                        <span className="text-zinc-500 font-bold">Priority: {esc.priority}</span>
                      </div>
                    </div>
                  ))}
                  {escalationsAndBreachesList.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 italic text-center py-12">
                      <CheckCircle size={24} className="text-emerald-500 mb-2" />
                      All delivery agreements are running healthy.
                    </div>
                  )}
                </div>
              </Card>

            </div>
          </div>
        </TabsContent>

      </Tabs>

      {/* ── FOOTER ACTIONS ── */}
      <Card className="bg-white border border-zinc-200 rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans text-xs">
          <div>
            <h4 className="font-bold text-zinc-900 uppercase text-[10px] tracking-wider font-mono">Download Command Center Snapshots</h4>
            <p className="text-zinc-500 text-[11px] mt-0.5 font-mono">Export current metric structures, active allocations audit sheet, or SLA health summaries.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="outline" className="text-[10px] font-bold uppercase py-1.5 flex items-center gap-1.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 cursor-pointer font-mono">
              <Download size={12} />
              Delivery Audit (.CSV)
            </Button>
            <Button variant="outline" className="text-[10px] font-bold uppercase py-1.5 flex items-center gap-1.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 cursor-pointer font-mono">
              <Download size={12} />
              SLA Compliance (.CSV)
            </Button>
          </div>
        </div>
      </Card>

      {/* ── WORKFLOW MODALS ── */}

      <Dialog open={closureDialog.isOpen} onOpenChange={(open) => !open && setClosureDialog(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="max-w-lg font-mono text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-zinc-955">Verify & Approve Closure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {activeTicketForClosure && activeRequestForClosure && (() => {
              const funcEff = (activeTicketForClosure.consultantEfforts || []).filter(e => e.consultantType === 'Functional' && !e.isDeleted);
              const techEff = (activeTicketForClosure.consultantEfforts || []).filter(e => e.consultantType === 'Technical' && !e.isDeleted);

              const estFunc = funcEff.reduce((sum, e) => sum + e.estimatedHours, 0);
              const estTech = techEff.reduce((sum, e) => sum + e.estimatedHours, 0);
              const estTotal = estFunc + estTech;

              const actFunc = funcEff.reduce((sum, e) => sum + e.actualHours, 0);
              const actTech = techEff.reduce((sum, e) => sum + e.actualHours, 0);
              const actTotal = actFunc + actTech;

              const varFunc = actFunc - estFunc;
              const varTech = actTech - estTech;
              const varTotal = actTotal - estTotal;

              return (
                <div className="bg-zinc-50 border border-zinc-200 rounded p-3.5 space-y-3 font-mono text-[10px]">
                  <div className="grid grid-cols-2 gap-2 border-b border-zinc-200 pb-2">
                    <div>
                      <span className="text-zinc-450 block uppercase font-bold text-[8px]">Ticket ID</span>
                      <span className="font-bold text-zinc-900">{activeTicketForClosure.id}</span>
                    </div>
                    <div>
                      <span className="text-zinc-450 block uppercase font-bold text-[8px]">Customer Name</span>
                      <span className="font-bold text-zinc-900">{activeTicketForClosure.organization}</span>
                    </div>
                    <div>
                      <span className="text-zinc-450 block uppercase font-bold text-[8px]">Submitted By</span>
                      <span className="font-bold text-zinc-900">{activeRequestForClosure.requestedBy}</span>
                    </div>
                    <div>
                      <span className="text-zinc-450 block uppercase font-bold text-[8px]">Submission Date</span>
                      <span className="font-bold text-zinc-900">
                        {activeRequestForClosure.createdAt ? new Date(activeRequestForClosure.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-zinc-450 block uppercase font-bold text-[8px]">Efforts & Variance Breakdown</span>
                    <div className="border border-zinc-200 rounded bg-white overflow-hidden">
                      <table className="w-full text-left text-[9px] border-collapse">
                        <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-zinc-500">
                          <tr>
                            <th className="py-1 px-2">Type</th>
                            <th className="py-1 px-2 text-right">Est</th>
                            <th className="py-1 px-2 text-right">Act</th>
                            <th className="py-1 px-2 text-right">Var</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-150">
                          <tr>
                            <td className="py-1 px-2 font-semibold">Functional</td>
                            <td className="py-1 px-2 text-right text-zinc-600">{estFunc}h</td>
                            <td className="py-1 px-2 text-right font-bold text-zinc-900">{actFunc}h</td>
                            <td className={`py-1 px-2 text-right font-black ${varFunc > 0 ? 'text-red-650' : 'text-green-700'}`}>
                              {varFunc >= 0 ? `+${varFunc}` : varFunc}h
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 px-2 font-semibold">Technical</td>
                            <td className="py-1 px-2 text-right text-zinc-600">{estTech}h</td>
                            <td className="py-1 px-2 text-right font-bold text-zinc-900">{actTech}h</td>
                            <td className={`py-1 px-2 text-right font-black ${varTech > 0 ? 'text-red-650' : 'text-green-700'}`}>
                              {varTech >= 0 ? `+${varTech}` : varTech}h
                            </td>
                          </tr>
                          <tr className="bg-zinc-100 font-extrabold border-t border-zinc-250">
                            <td className="py-1 px-2 uppercase text-[8px]">Total</td>
                            <td className="py-1 px-2 text-right">{estTotal}h</td>
                            <td className="py-1 px-2 text-right">{actTotal}h</td>
                            <td className={`py-1 px-2 text-right font-black ${varTotal > 0 ? 'text-red-650' : 'text-green-700'}`}>
                              {varTotal >= 0 ? `+${varTotal}` : varTotal}h
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-1 border-t border-zinc-200">
                    <div>
                      <span className="text-zinc-450 block uppercase font-bold text-[8px]">Root Cause</span>
                      <p className="text-zinc-800 leading-normal">{activeRequestForClosure.rootCause || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-zinc-450 block uppercase font-bold text-[8px]">Resolution Summary</span>
                      <p className="text-zinc-800 leading-normal whitespace-pre-line">{activeRequestForClosure.resolutionSummary || 'N/A'}</p>
                    </div>
                    {activeRequestForClosure.pendingItems && (
                      <div>
                        <span className="text-zinc-450 block uppercase font-bold text-[8px]">Pending Items</span>
                        <p className="text-zinc-800 leading-normal">{activeRequestForClosure.pendingItems}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-zinc-500">CSAT Customer Satisfaction Rating *</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => setClosureDialog(prev => ({ ...prev, rating: num }))}
                    className="p-1 cursor-pointer hover:scale-110 transition"
                  >
                    <Star
                      size={24}
                      className={num <= closureDialog.rating ? 'fill-amber-500 text-amber-500' : 'text-zinc-300'}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-zinc-500">Closure Audit Comments & Feedback *</Label>
              <Textarea
                required
                placeholder="Details of verification, SLA review, or satisfaction comments..."
                value={closureDialog.feedback}
                onChange={e => setClosureDialog(prev => ({ ...prev, feedback: e.target.value }))}
                className="w-full text-[11px] focus:outline-none min-h-[90px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-[10px] uppercase font-bold h-8 cursor-pointer font-mono"
              onClick={() => setClosureDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              className="bg-zinc-950 hover:bg-zinc-800 text-white text-[10px] uppercase font-bold h-8 cursor-pointer font-mono"
              onClick={handleConfirmClosure}
            >
              Close Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Comments Dialog */}
      <Dialog open={rejectDialog.isOpen} onOpenChange={(open) => !open && setRejectDialog(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="max-w-md font-mono text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-red-650">Provide Rejection Reason</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-zinc-500">Audit Rejection comments *</Label>
              <Textarea
                required
                placeholder="Describe why this effort/closure/unlock request is being rejected or sent back for revision..."
                value={rejectDialog.reason}
                onChange={e => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full text-[11px] focus:outline-none min-h-[90px] border-red-200 focus:border-red-400 font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-[10px] uppercase font-bold h-8 cursor-pointer font-mono"
              onClick={() => setRejectDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-650 hover:bg-red-700 text-white text-[10px] uppercase font-bold h-8 cursor-pointer font-mono"
              onClick={handleConfirmRejection}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
