'use client';

import { getErrorMessage } from '@/lib/errors';
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
import { PageHeader } from '../../../components/ui/page-header';
import { AICard, AIInsightRow } from '../../../components/ui/ai-card';
import { ManagerTeamPerformance } from '../../../components/analytics/manager-team-performance';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Skeleton } from '../../../components/ui/skeleton';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { SAPModule, TicketPriority, TicketStatus, EffortLog, TicketClosureRequest, TicketUnlockRequest, Ticket } from '../../../types/ticket';

import { COLORS, chartColors } from '../../../lib/chart-theme';
import { isUnassigned } from '../../../lib/manager-desk-predicates';

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

const SYSTEM_NOW = Date.now(); // real current time (was a frozen demo clock)
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

// Helper Components for Action Center
const QueueTicketRow = ({
  ticket,
  slaInfo,
  acknowledgeEscalation,
  user,
}: {
  ticket: Ticket;
  slaInfo: { status: string; label: string } | null;
  acknowledgeEscalation: (id: string, userId: string, userName: string) => void;
  user: any;
}) => {
  const isHighPriority = ticket.priority === 'High' || ticket.priority === 'Critical';
  const isEscalated = ticket.escalationFlag;
  // Remove "ESCALATED" badge and red border on queue row unless priority is HIGH.
  const showRedBorder = (isEscalated && isHighPriority) || (slaInfo?.status === 'breached');
  const showEscalatedBadge = isEscalated && isHighPriority;

  const borderClass = showRedBorder
    ? 'border-l-4 border-l-destructive pl-2'
    : (slaInfo?.status === 'imminent' ? 'border-l-4 border-l-amber-500 pl-2' : '');

  return (
    <div className={`p-2 bg-surface-muted border border-line rounded-lg flex flex-col justify-between gap-1 ${borderClass}`}>
      <div className="flex justify-between items-center">
        <Link href={`/manager/tickets/${ticket.id}`} className="font-bold text-ink hover:underline">
          {ticket.ticketNumber}
        </Link>
        <div className="flex gap-1 items-center">
          {showEscalatedBadge && (
            <Badge variant="destructive" className="text-[11px] font-bold py-0 px-1 uppercase leading-none h-4">
              Escalated
            </Badge>
          )}
          {slaInfo && (
            <Badge className={`text-[11px] font-bold py-0 px-1 uppercase leading-none h-4 ${
              slaInfo.status === 'breached' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
            }`}>{slaInfo.label}</Badge>
          )}
          <Badge className="bg-surface-subtle text-ink border-none font-bold text-[11px] py-0 px-1 uppercase">{ticket.priority}</Badge>
        </div>
      </div>
      <span className="text-ink-secondary truncate block font-sans">{ticket.title}</span>
      <div className="flex justify-between items-center text-[11px] text-ink-muted">
        <span>Org: {ticket.organization}</span>
        <span>Module: {ticket.sapModule}</span>
      </div>
      {isEscalated && (
        ticket.escalationAcknowledgedAt ? (
          <div className="text-[11px] text-ink-secondary font-sans mt-0.5 pt-0.5 border-t border-line flex justify-between items-center">
            <span>Ack: {ticket.escalationAcknowledgedByName || 'Manager'}</span>
            <span>{formatRelativeTime(ticket.escalationAcknowledgedAt)}</span>
          </div>
        ) : (
          <div className="mt-1 flex justify-end">
            <Button 
              size="sm" 
              onClick={() => acknowledgeEscalation(ticket.id, user?.id || '', user?.name || '')} 
              className="h-5 text-[11px] font-bold bg-ink hover:bg-zinc-800 text-white rounded px-2"
            >
              Acknowledge
            </Button>
          </div>
        )
      )}
    </div>
  );
};

const EscalationTicketRow = ({
  ticket,
  slaInfo,
  acknowledgeEscalation,
  user,
  profiles,
}: {
  ticket: Ticket;
  slaInfo: { status: string; label: string } | null;
  acknowledgeEscalation: (id: string, userId: string, userName: string) => void;
  user: any;
  profiles: any[];
}) => {
  const customerName = profiles.find(p => p.id === ticket.escalatedBy)?.full_name || ticket.requestedBy || 'Customer';
  const escReason = ticket.escalationReason || (ticket.escalations && ticket.escalations.length > 0 ? ticket.escalations[ticket.escalations.length - 1].reason : null) || 'No reason provided';

  return (
    <div className="p-3 bg-surface-muted/60 border border-line rounded-lg flex flex-col gap-2.5">
      {/* Row 1: Ticket Number, ESCALATED Badge, Priority Badge */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="font-medium text-ink">
          <Link href={`/manager/tickets/${ticket.id}`} className="hover:underline">
            {ticket.ticketNumber}
          </Link>
        </span>
        <span className="text-ink-muted">·</span>
        <Badge variant="outline" className="text-[11px] font-semibold bg-warning-soft text-amber-800 border-warning-border uppercase py-0.5 px-1.5 leading-none h-5">
          ESCALATED
        </Badge>
        <Badge variant="outline" className="text-[11px] font-semibold bg-surface-muted text-ink-secondary border-line uppercase py-0.5 px-1.5 leading-none h-5">
          {ticket.priority}
        </Badge>
      </div>
      
      {/* Row 2: Title */}
      <div className="text-sm font-medium text-ink font-sans line-clamp-1">
        {ticket.title}
      </div>
      
      {/* Row 3: Org, Escalated by, Relative time */}
      <div className="text-xs text-muted-foreground font-sans">
        Org: {ticket.organization} · Escalated by {customerName} · {formatRelativeTime(ticket.escalatedAt || ticket.createdAt)} ago
      </div>

      {/* Row 4: Escalation Reason quote block */}
      <div className="border-l-2 border-line-strong pl-2.5 italic text-xs text-ink-secondary font-sans leading-relaxed">
        &quot;{escReason}&quot;
      </div>
      
      {/* Footer: right-aligned Acknowledge Button */}
      <div className="flex justify-end mt-1">
        <Button 
          variant="default" 
          size="sm" 
          className="bg-ink hover:bg-zinc-800 text-white font-semibold rounded-lg text-xs py-1.5 px-4"
          onClick={() => acknowledgeEscalation(ticket.id, user?.id || '', user?.name || '')}
        >
          Acknowledge
        </Button>
      </div>
    </div>
  );
};

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
    acknowledgeEscalation,
    createDBNotification,
    refetchData
  } = useTickets();

  const { user } = useAuth();

  // AI operations briefing — every value below is derived live from the queue;
  // nothing is static or sampled.
  const aiBriefing = useMemo(() => {
    const now = Date.now();
    const open = tickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
    const hasSla = (t: { slaDueAt: string }) => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable';
    const atRisk = open.filter(t => hasSla(t) && new Date(t.slaDueAt).getTime() - now > 0 && new Date(t.slaDueAt).getTime() - now < 12 * 3600e3);
    const breached = open.filter(t => hasSla(t) && new Date(t.slaDueAt).getTime() < now);
    const unackedEscalations = tickets.filter(t => t.escalationFlag && !t.escalationAcknowledgedAt);
    const unassigned = open.filter(t => !t.leadConsultantId); // dispatch backlog = no lead yet (matches desk Unassigned tab)
    const loadMap: Record<string, number> = {};
    open.forEach(t => {
      if (t.assignedConsultant) loadMap[t.assignedConsultant] = (loadMap[t.assignedConsultant] || 0) + 1;
    });
    const ranked = Object.entries(loadMap).sort((a, b) => b[1] - a[1]);
    return {
      openCount: open.length,
      atRisk,
      breached,
      unackedEscalations,
      unassigned,
      busiest: ranked[0] ?? null,
      lightest: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    };
  }, [tickets]);

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
    } catch (err: unknown) {
      console.error('Error approving request:', err);
      toast.error(`Failed to approve request: ${getErrorMessage(err)}`, { id: loadId });
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
    } catch (err: unknown) {
      console.error('Error rejecting request:', err);
      toast.error(`Failed to reject request: ${getErrorMessage(err)}`, { id: loadId });
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

      // 3. Dispatch notifications to customer and consultants
      const ticketObj = tickets.find(t => t.id === req.ticket_id);
      if (ticketObj) {
        const customerProfile = profiles.find(p => p.full_name === ticketObj.requestedBy || p.email === ticketObj.requestedByEmail);
        const customerUserId = customerProfile?.id || ticketObj.createdByUser;
        
        const consultantsToNotify = new Set<string>();
        if (ticketObj.primaryConsultantId) consultantsToNotify.add(ticketObj.primaryConsultantId);
        if (ticketObj.leadConsultantId) consultantsToNotify.add(ticketObj.leadConsultantId);
        (ticketObj.assignments || []).forEach(a => {
          if (a.active && a.consultantId) {
            consultantsToNotify.add(a.consultantId);
          }
        });

        if (customerUserId) {
          await createDBNotification({
            userId: customerUserId,
            type: 'reopen_approved',
            title: 'Reopen Request Approved',
            message: `Your request to reopen ticket ${ticketObj.ticketNumber || ticketObj.id} has been approved by management.`,
            ticketId: req.ticket_id,
            linkPath: `/customer/tickets/${req.ticket_id}`
          });
        }

        for (const consId of consultantsToNotify) {
          if (consId !== customerUserId) {
            await createDBNotification({
              userId: consId,
              type: 'reopen_approved',
              title: `Ticket Reopened: ${ticketObj.ticketNumber || ticketObj.id}`,
              message: `Ticket ${ticketObj.ticketNumber || ticketObj.id} has been reopened by management. Please resume work.`,
              ticketId: req.ticket_id,
              linkPath: `/consultant/tickets/${req.ticket_id}`
            });
          }
        }
      }

      toast.success('Ticket has been successfully reopened.', { id: loadId });
      fetchReopenRequests();
      if (refetchData) refetchData();
    } catch (err: unknown) {
      console.error('Error approving reopen:', err);
      toast.error(`Failed to approve: ${getErrorMessage(err)}`, { id: loadId });
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

      // 3. Dispatch notifications to customer and consultants
      const ticketObj = tickets.find(t => t.id === req.ticket_id);
      if (ticketObj) {
        const customerProfile = profiles.find(p => p.full_name === ticketObj.requestedBy || p.email === ticketObj.requestedByEmail);
        const customerUserId = customerProfile?.id || ticketObj.createdByUser;
        
        const consultantsToNotify = new Set<string>();
        if (ticketObj.primaryConsultantId) consultantsToNotify.add(ticketObj.primaryConsultantId);
        if (ticketObj.leadConsultantId) consultantsToNotify.add(ticketObj.leadConsultantId);
        (ticketObj.assignments || []).forEach(a => {
          if (a.active && a.consultantId) {
            consultantsToNotify.add(a.consultantId);
          }
        });

        if (customerUserId) {
          await createDBNotification({
            userId: customerUserId,
            type: 'reopen_rejected',
            title: 'Reopen Request Rejected',
            message: `Your request to reopen ticket ${ticketObj.ticketNumber || ticketObj.id} has been rejected. Reason: ${rejectReason.trim()}`,
            ticketId: req.ticket_id,
            linkPath: `/customer/tickets/${req.ticket_id}`
          });
        }

        for (const consId of consultantsToNotify) {
          if (consId !== customerUserId) {
            await createDBNotification({
              userId: consId,
              type: 'reopen_rejected',
              title: `Reopen Rejected: ${ticketObj.ticketNumber || ticketObj.id}`,
              message: `Reopen request for ticket ${ticketObj.ticketNumber || ticketObj.id} has been rejected by management. Reason: ${rejectReason.trim()}`,
              ticketId: req.ticket_id,
              linkPath: `/consultant/tickets/${req.ticket_id}`
            });
          }
        }
      }

      toast.success('Reopen request rejected.', { id: loadId });
      fetchReopenRequests();
      if (refetchData) refetchData();
    } catch (err: unknown) {
      console.error('Error rejecting reopen:', err);
      toast.error(`Failed to reject: ${getErrorMessage(err)}`, { id: loadId });
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

  const [checklistData, setChecklistData] = useState<{
    customers: { count: number; status: 'ACTIVE' | 'EMPTY' | 'ERROR' };
    consultants: { count: number; status: 'ACTIVE' | 'EMPTY' | 'ERROR' };
    tickets: { count: number; status: 'ACTIVE' | 'EMPTY' | 'ERROR' };
    approvals: { count: number; status: 'ACTIVE' | 'EMPTY' | 'ERROR' };
    reports: { count: number; status: 'ACTIVE' | 'EMPTY' | 'ERROR' };
  } | null>(null);

  const fetchChecklist = async () => {
    if (!supabase) return;
    try {
      const [customersRes, consultantsRes, ticketsRes, closureRes, pwdRes, reopenRes, pingRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'Customer').eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'Consultant').eq('is_active', true),
        supabase.from('tickets').select('id', { count: 'exact', head: true }),
        supabase.from('ticket_closure_requests').select('id', { count: 'exact', head: true }).ilike('status', 'pending'),
        supabase.from('password_change_requests').select('id', { count: 'exact', head: true }).ilike('status', 'pending'),
        supabase.from('ticket_reopen_requests').select('id', { count: 'exact', head: true }).ilike('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1)
      ]);

      const customersCount = customersRes.error ? -1 : (customersRes.count ?? 0);
      const consultantsCount = consultantsRes.error ? -1 : (consultantsRes.count ?? 0);
      const ticketsCount = ticketsRes.error ? -1 : (ticketsRes.count ?? 0);
      const approvalsCount = (closureRes.error || pwdRes.error || reopenRes.error) 
        ? -1 
        : ((closureRes.count ?? 0) + (pwdRes.count ?? 0) + (reopenRes.count ?? 0));
      const reportsCount = pingRes.error ? -1 : 1;

      const getStatus = (count: number): 'ACTIVE' | 'EMPTY' | 'ERROR' => {
        if (count === -1) return 'ERROR';
        return count > 0 ? 'ACTIVE' : 'EMPTY';
      };

      const data = {
        customers: { count: customersCount === -1 ? 0 : customersCount, status: getStatus(customersCount) },
        consultants: { count: consultantsCount === -1 ? 0 : consultantsCount, status: getStatus(consultantsCount) },
        tickets: { count: ticketsCount === -1 ? 0 : ticketsCount, status: getStatus(ticketsCount) },
        approvals: { count: approvalsCount === -1 ? 0 : approvalsCount, status: getStatus(approvalsCount) },
        reports: { count: reportsCount === -1 ? 0 : reportsCount, status: getStatus(reportsCount) }
      };

      setChecklistData(data);

      console.log('--- DATABASE STATUS: PRODUCTION READINESS STATUS CHECKLIST ---');
      console.log(`Customers: DB Count = ${customersCount}, Rendered Status = ${data.customers.status}`);
      console.log(`Consultants: DB Count = ${consultantsCount}, Rendered Status = ${data.consultants.status}`);
      console.log(`Tickets: DB Count = ${ticketsCount}, Rendered Status = ${data.tickets.status}`);
      console.log(`Approvals: DB Count = ${approvalsCount}, Rendered Status = ${data.approvals.status}`);
      console.log(`Reports: DB Count = ${reportsCount === 1 ? 'System Online (1)' : 'System Error (0)'}, Rendered Status = ${data.reports.status}`);
    } catch (err) {
      console.error('Error fetching checklist data:', err);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, [filters]);

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
    const list: { ticketId: string; ticketNumber: string; logId: string; consultantName: string; hours: number; description: string; activityType: string; billable: boolean }[] = [];
    filteredDashboardTickets.forEach(t => {
      (t.efforts || []).forEach(e => {
        if (e.status === 'Pending' || e.status === 'Pending Approval') {
          list.push({
            ticketId: t.id,
            ticketNumber: t.ticketNumber || t.id,
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
    const list: { ticketId: string; ticketNumber: string; ticketTitle: string; customerName: string; requestId: string; requestedBy: string; funcHours: number; techHours: number; rootCause: string; resolutionSummary: string; summary: string; submittedAt: string }[] = [];
    filteredDashboardTickets.forEach(t => {
      (t.closureRequests || []).forEach(r => {
        if (r.status === 'Pending Manager Approval') {
          const requestLogs = (t.actualHoursLogs || []).filter((ah: any) => ah.closureRequestId === r.id);
          const hasLogs = requestLogs.length > 0;
          const funcHours = hasLogs
            ? requestLogs.filter((ah: any) => ah.consultantType === 'Functional').reduce((sum, ah) => sum + ah.actualHours, 0)
            : r.functionalActualHours;
          const techHours = hasLogs
            ? requestLogs.filter((ah: any) => ah.consultantType === 'Technical').reduce((sum, ah) => sum + ah.actualHours, 0)
            : r.technicalActualHours;

          list.push({
            ticketId: t.id,
            ticketNumber: t.ticketNumber || t.id,
            ticketTitle: t.title,
            customerName: t.organization,
            requestId: r.id,
            requestedBy: r.requestedBy,
            funcHours,
            techHours,
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
    const list: { ticketId: string; ticketNumber: string; ticketTitle: string; requestId: string; requestedBy: string; reason: string; change: string }[] = [];
    filteredDashboardTickets.forEach(t => {
      (t.unlockRequests || []).forEach(u => {
        if (u.status === 'Pending') {
          list.push({
            ticketId: t.id,
            ticketNumber: t.ticketNumber || t.id,
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
        ticketNumber: t?.ticketNumber || log.ticketId,
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
        ticketNumber: t?.ticketNumber || r.ticketId,
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
        ticketNumber: t?.ticketNumber || u.ticketId,
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
          ticketNumber: t.ticketNumber || t.id,
          title: t.title,
          priority: t.priority,
          detail: `Breached on ${new Date(t.slaDueAt).toLocaleDateString()}`,
          badgeColor: 'bg-red-100 text-red-800 border-critical-border'
        });
      } else if (t.priority === 'Critical') {
        list.push({
          type: 'Critical Ticket',
          ticketId: t.id,
          ticketNumber: t.ticketNumber || t.id,
          title: t.title,
          priority: t.priority,
          detail: `SLA: ${t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable' ? new Date(t.slaDueAt).toLocaleString() : 'N/A'}`,
          badgeColor: 'bg-amber-100 text-amber-800 border-warning-border'
        });
      } else if (t.escalationFlag) {
        list.push({
          type: 'Escalated',
          ticketId: t.id,
          ticketNumber: t.ticketNumber || t.id,
          title: t.title,
          priority: t.priority,
          detail: `Escalated flag set to TRUE`,
          badgeColor: 'bg-critical-soft text-red-750 border-red-100'
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
    const unassignedCount = ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && !t.leadConsultantId).length;
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
    const ticketTrendData: { name: string; Tickets: number }[] = [];
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
    const { ticketId, requestId, feedback } = closureDialog;
    if (!feedback.trim()) {
      toast.error('Feedback comments are mandatory.');
      return;
    }

    const rating = 5; // Default rating
    const res = await approveClosureRequest(ticketId, requestId, managerName, rating, feedback);
    if (res.success) {
      toast.success('Ticket closed successfully.');
      setClosureDialog({ isOpen: false, ticketId: '', requestId: '', rating: 0, feedback: '' });
    } else {
      toast.error(res.error || 'Failed to approve closure request and close ticket.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        {/* Page Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-line pb-5 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-zinc-200" />
            <Skeleton className="h-4 w-80 bg-surface-subtle" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 bg-zinc-200 rounded-lg" />
            <Skeleton className="h-10 w-32 bg-zinc-200 rounded-lg" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="border border-line rounded-lg p-5 bg-surface space-y-3 shadow-card">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24 bg-surface-subtle" />
                <Skeleton className="h-4 w-4 rounded-full bg-surface-subtle" />
              </div>
              <Skeleton className="h-8 w-16 bg-zinc-200" />
              <Skeleton className="h-3 w-32 bg-surface-subtle" />
            </div>
          ))}
        </div>

        {/* Dynamic tabs/sections skeleton */}
        <div className="border border-line rounded-lg p-6 bg-surface space-y-6 shadow-card">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 bg-zinc-200 rounded" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-48 bg-zinc-200" />
              <Skeleton className="h-8 w-32 bg-surface-subtle" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-zinc-50 pb-3 last:border-b-0">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3 bg-zinc-200" />
                    <Skeleton className="h-3 w-1/2 bg-surface-subtle" />
                  </div>
                  <Skeleton className="h-6 w-16 bg-surface-subtle rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-ink">
      {/* --- COMMAND CENTER HEADER --- */}
      <PageHeader
        title="AMS Management Command Center"
        description="Unified operations cockpit for client SLAs, resource capacity, approvals, and performance metrics."
        actions={
          <span className="type-status inline-flex items-center gap-1.5 rounded-full border border-success-border bg-success-soft px-2.5 py-1 font-semibold text-success-strong uppercase">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Live Cockpit
          </span>
        }
      />

      {/* Filter Bar */}
      <Card className="border border-line rounded-lg p-4 mb-6 shadow-card bg-surface">
        {/* ROW 1 */}
        <div className="flex flex-wrap gap-3 items-end w-full">
          
          {/* 1. PERIOD */}
          <div className="flex flex-col w-full md:w-auto">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Period</span>
            <div className="flex bg-surface-subtle p-0.5 rounded-lg border border-line h-9 items-center min-w-[320px]">
              {['This Month', 'This Quarter', 'This Year', 'Custom'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, period: p }))}
                  className={`flex-1 h-full flex items-center justify-center text-[11px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer whitespace-nowrap px-2 ${
                    filters.period === p
                      ? 'bg-surface text-ink shadow-card border border-line/50'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 2. STATUS */}
          <div className="relative flex flex-col flex-1 min-w-[140px]" ref={statusDropdownRef}>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Status</span>
            <button
              type="button"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="bg-surface border border-line rounded-md px-3 h-9 text-xs text-ink transition font-sans w-full shadow-card flex items-center justify-between cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand/30"
            >
              <span className="truncate">
                {filters.statuses.includes('All') 
                  ? 'All Statuses' 
                  : `${filters.statuses.length} selected`}
              </span>
              <ChevronRight size={12} className="text-ink-muted shrink-0 rotate-90" />
            </button>
            {showStatusDropdown && (
              <div className="absolute z-50 mt-16 w-full min-w-[160px] bg-surface border border-line rounded-md shadow-lg p-2 space-y-1">
                {['All', 'New', 'Assigned', 'In Progress', 'Pending Closure', 'Closed', 'Escalated', 'Reopened'].map(st => {
                  const isSelected = filters.statuses.includes(st);
                  return (
                    <label key={st} className="flex items-center gap-2 p-1.5 hover:bg-surface-muted rounded cursor-pointer text-xs font-sans text-ink-secondary">
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
                        className="rounded border-line-strong text-ink focus:ring-brand/30"
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
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Priority</span>
            <Select
              value={filters.priority}
              onValueChange={(val) => setFilters(prev => ({ ...prev, priority: val }))}
            >
              <SelectTrigger aria-label="Filter by priority" className="h-9 w-full bg-surface text-ink font-sans text-xs border border-line shadow-card focus:ring-brand/30">
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
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Module</span>
            <Select
              value={filters.module}
              onValueChange={(val) => setFilters(prev => ({ ...prev, module: val }))}
            >
              <SelectTrigger aria-label="Filter by module" className="h-9 w-full bg-surface text-ink font-sans text-xs border border-line shadow-card focus:ring-brand/30">
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
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Customer</span>
            <Select
              value={filters.customer}
              onValueChange={(val) => setFilters(prev => ({ ...prev, customer: val }))}
            >
              <SelectTrigger aria-label="Filter by customer" className="h-9 w-full bg-surface text-ink font-sans text-xs border border-line shadow-card focus:ring-brand/30">
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
            className="h-9 gap-1.5 ml-auto text-xs font-semibold hover:bg-surface-subtle hover:text-ink border border-line shadow-card font-sans"
          >
            <RotateCcw size={14} />
            Reset
          </Button>

        </div>

        {/* ROW 2 - Custom range From/To inputs */}
        {filters.period === 'Custom' && (
          <div className="border-t border-line mt-3 pt-3 flex gap-3 max-w-md animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-col flex-1">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">From</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="h-9 border border-line rounded-md bg-surface px-3 py-1.5 text-xs text-ink shadow-card focus:outline-none focus:ring-1 focus:ring-brand/30 w-full cursor-pointer font-sans"
              />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">To</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="h-9 border border-line rounded-md bg-surface px-3 py-1.5 text-xs text-ink shadow-card focus:outline-none focus:ring-1 focus:ring-brand/30 w-full cursor-pointer font-sans"
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── PRODUCTION READINESS STATUS CHECKLIST ── */}
      {checklistData && (
        <div className="bg-surface-muted border border-line rounded-lg p-4 space-y-3 font-sans text-xs shadow-card">
          <div className="flex items-center gap-2 border-b border-line pb-2">
            <AlertCircle size={14} className="text-ink-secondary" />
            <span className="font-bold text-ink uppercase tracking-wider text-[11px]">[Database Status]: Production Readiness Status Checklist</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            
            {/* Customers Row */}
            <div className={`p-3 rounded border flex flex-col justify-between ${
              checklistData.customers.status === 'ACTIVE' ? 'border-success-border bg-success-soft/10' :
              checklistData.customers.status === 'EMPTY' ? 'border-dashed border-line bg-surface' : 'border-critical-border bg-critical-soft/10'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink-secondary">Customers</span>
                {checklistData.customers.status === 'ACTIVE' && <Badge className="text-[11px] font-bold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-700 text-white px-1 py-0.5 border-none">Active</Badge>}
                {checklistData.customers.status === 'EMPTY' && <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-wider text-warning-strong bg-warning-soft border-amber-255 px-1 py-0.5">Empty</Badge>}
                {checklistData.customers.status === 'ERROR' && <Badge className="text-[11px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-600 text-white px-1 py-0.5 border-none">Error</Badge>}
              </div>
              <p className="text-[11px] text-ink-secondary mt-1">
                {checklistData.customers.status === 'ERROR' ? 'Query failed' : `${checklistData.customers.count} customers active`}
              </p>
            </div>

            {/* Consultants Row */}
            <div className={`p-3 rounded border flex flex-col justify-between ${
              checklistData.consultants.status === 'ACTIVE' ? 'border-success-border bg-success-soft/10' :
              checklistData.consultants.status === 'EMPTY' ? 'border-dashed border-line bg-surface' : 'border-critical-border bg-critical-soft/10'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink-secondary">Consultants</span>
                {checklistData.consultants.status === 'ACTIVE' && <Badge className="text-[11px] font-bold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-700 text-white px-1 py-0.5 border-none">Active</Badge>}
                {checklistData.consultants.status === 'EMPTY' && <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-wider text-warning-strong bg-warning-soft border-amber-255 px-1 py-0.5">Empty</Badge>}
                {checklistData.consultants.status === 'ERROR' && <Badge className="text-[11px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-600 text-white px-1 py-0.5 border-none">Error</Badge>}
              </div>
              <p className="text-[11px] text-ink-secondary mt-1">
                {checklistData.consultants.status === 'ERROR' ? 'Query failed' : `${checklistData.consultants.count} consultants active`}
              </p>
            </div>

            {/* Tickets Row */}
            <div className={`p-3 rounded border flex flex-col justify-between ${
              checklistData.tickets.status === 'ACTIVE' ? 'border-success-border bg-success-soft/10' :
              checklistData.tickets.status === 'EMPTY' ? 'border-dashed border-line bg-surface' : 'border-critical-border bg-critical-soft/10'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink-secondary">Tickets</span>
                {checklistData.tickets.status === 'ACTIVE' && <Badge className="text-[11px] font-bold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-700 text-white px-1 py-0.5 border-none">Active</Badge>}
                {checklistData.tickets.status === 'EMPTY' && <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-wider text-warning-strong bg-warning-soft border-amber-255 px-1 py-0.5">Empty</Badge>}
                {checklistData.tickets.status === 'ERROR' && <Badge className="text-[11px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-600 text-white px-1 py-0.5 border-none">Error</Badge>}
              </div>
              <p className="text-[11px] text-ink-secondary mt-1">
                {checklistData.tickets.status === 'ERROR' ? 'Query failed' : `${checklistData.tickets.count} tickets logged`}
              </p>
            </div>

            {/* Approvals Row */}
            <div className={`p-3 rounded border flex flex-col justify-between ${
              checklistData.approvals.status === 'ACTIVE' ? 'border-success-border bg-success-soft/10' :
              checklistData.approvals.status === 'EMPTY' ? 'border-dashed border-line bg-surface' : 'border-critical-border bg-critical-soft/10'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink-secondary">Approvals</span>
                {checklistData.approvals.status === 'ACTIVE' && <Badge className="text-[11px] font-bold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-700 text-white px-1 py-0.5 border-none">Active</Badge>}
                {checklistData.approvals.status === 'EMPTY' && <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-wider text-warning-strong bg-warning-soft border-amber-255 px-1 py-0.5">Empty</Badge>}
                {checklistData.approvals.status === 'ERROR' && <Badge className="text-[11px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-600 text-white px-1 py-0.5 border-none">Error</Badge>}
              </div>
              <p className="text-[11px] text-ink-secondary mt-1">
                {checklistData.approvals.status === 'ERROR' ? 'Query failed' : `${checklistData.approvals.count} pending approvals`}
              </p>
            </div>

            {/* Reports Row */}
            <div className={`p-3 rounded border flex flex-col justify-between ${
              checklistData.reports.status === 'ACTIVE' ? 'border-success-border bg-success-soft/10' :
              checklistData.reports.status === 'EMPTY' ? 'border-dashed border-line bg-surface' : 'border-critical-border bg-critical-soft/10'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink-secondary">Reports</span>
                {checklistData.reports.status === 'ACTIVE' && <Badge className="text-[11px] font-bold uppercase tracking-wider bg-emerald-700 hover:bg-emerald-700 text-white px-1 py-0.5 border-none">Active</Badge>}
                {checklistData.reports.status === 'EMPTY' && <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-wider text-warning-strong bg-warning-soft border-amber-255 px-1 py-0.5">Empty</Badge>}
                {checklistData.reports.status === 'ERROR' && <Badge className="text-[11px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-600 text-white px-1 py-0.5 border-none">Error</Badge>}
              </div>
              <p className="text-[11px] text-ink-secondary mt-1">
                {checklistData.reports.status === 'ERROR' ? 'System offline' : 'System online'}
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ── AI OPERATIONS BRIEFING (all values derived live from the queue) ── */}
      <AICard title="AI Operations Briefing">
        <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
          <AIInsightRow
            icon={ShieldAlert}
            label={aiBriefing.breached.length > 0 ? 'SLA breaches needing action' : 'SLA breaches'}
            value={
              <span className={aiBriefing.breached.length > 0 ? 'text-critical' : 'text-success'}>
                {aiBriefing.breached.length}
              </span>
            }
          />
          <AIInsightRow
            icon={Timer}
            label="Breach risk in next 12h"
            value={
              <span className={aiBriefing.atRisk.length > 0 ? 'text-warning-strong' : 'text-success'}>
                {aiBriefing.atRisk.length}
              </span>
            }
          />
          <AIInsightRow
            icon={Users}
            label={
              aiBriefing.busiest
                ? `Heaviest load: ${aiBriefing.busiest[0]}`
                : 'No consultant load registered'
            }
            value={aiBriefing.busiest ? `${aiBriefing.busiest[1]} open` : '—'}
          />
          <AIInsightRow
            icon={TrendingUp}
            label="Unassigned in queue"
            value={
              <span className={aiBriefing.unassigned.length > 0 ? 'text-warning-strong' : 'text-success'}>
                {aiBriefing.unassigned.length}
              </span>
            }
          />
        </div>
        {(aiBriefing.unackedEscalations.length > 0 || (aiBriefing.busiest && aiBriefing.lightest && aiBriefing.busiest[1] - aiBriefing.lightest[1] >= 3)) && (
          <p className="type-meta mt-2 border-t border-info-border/50 pt-2 text-info-strong">
            {aiBriefing.unackedEscalations.length > 0 &&
              `${aiBriefing.unackedEscalations.length} escalation${aiBriefing.unackedEscalations.length === 1 ? '' : 's'} await acknowledgement. `}
            {aiBriefing.busiest && aiBriefing.lightest && aiBriefing.busiest[1] - aiBriefing.lightest[1] >= 3 &&
              `Workload is skewed — consider moving tickets from ${aiBriefing.busiest[0]} to ${aiBriefing.lightest[0]}.`}
          </p>
        )}
      </AICard>

      {/* ── CORE WORKSPACE TABS INTERFACE ── */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <div className="w-full overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 border-b border-line/40">
          <TabsList className="inline-flex h-auto items-center justify-start gap-1 bg-surface-subtle/80 p-1 border border-line/60 rounded-lg">
            <TabsTrigger value="analytics" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[11px] tracking-wider font-semibold uppercase">
              <TrendingUp size={12} className="text-ink-muted group-hover:text-ink-secondary group-data-[state=active]:text-ink transition-colors duration-150" />
              Analytics Command Center
            </TabsTrigger>
            <TabsTrigger value="health" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[11px] tracking-wider font-semibold uppercase">
              <CheckSquare size={12} className="text-ink-muted group-hover:text-ink-secondary group-data-[state=active]:text-ink transition-colors duration-150" />
              Executive Operations
            </TabsTrigger>
            <TabsTrigger value="tickets" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[11px] tracking-wider font-semibold uppercase">
              <Timer size={12} className="text-ink-muted group-hover:text-ink-secondary group-data-[state=active]:text-ink transition-colors duration-150" />
              Ticket Control Center
            </TabsTrigger>
            <TabsTrigger value="resources" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[11px] tracking-wider font-semibold uppercase">
              <Users size={12} className="text-ink-muted group-hover:text-ink-secondary group-data-[state=active]:text-ink transition-colors duration-150" />
              Consultant Load & Capacity
            </TabsTrigger>
            <TabsTrigger value="customers" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[11px] tracking-wider font-semibold uppercase">
              <ShieldAlert size={12} className="text-ink-muted group-hover:text-ink-secondary group-data-[state=active]:text-ink transition-colors duration-150" />
              Customer Risk Map
            </TabsTrigger>
            <TabsTrigger value="approvals" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[11px] tracking-wider font-semibold uppercase">
              <Lock size={12} className="text-ink-muted group-hover:text-ink-secondary group-data-[state=active]:text-ink transition-colors duration-150" />
              Governance & Financials
            </TabsTrigger>
            <TabsTrigger value="timeline" className="group shrink-0 px-4 py-2 flex items-center gap-2 text-[11px] tracking-wider font-semibold uppercase">
              <Calendar size={12} className="text-ink-muted group-hover:text-ink-secondary group-data-[state=active]:text-ink transition-colors duration-150" />
              Activity & Audit Feed
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── TAB CONTENT: ANALYTICS COMMAND CENTER ── */}
        <TabsContent value="analytics" className="space-y-6 outline-none">
          
          {/* SECTION 1: REBUILT EXECUTIVE HEALTH OVERVIEW */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">
              1. Executive Health Overview
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: Ticket Operations */}
              <Card className="border border-line bg-surface p-4 shadow-card hover:border-line-strong transition flex flex-col justify-between">
                <div>
                  <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">Ticket Operations</span>
                  <div className="mt-3 space-y-1.5 text-[11px] text-ink-secondary">
                    <div className="flex justify-between"><span>Open Tickets:</span><span className="font-bold text-ink">{filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length}</span></div>
                    <div className="flex justify-between"><span>In Progress:</span><span className="font-bold text-ink">{filteredDashboardTickets.filter(t => t.status.startsWith('In Progress') || t.status === 'In Progress').length}</span></div>
                    <div className="flex justify-between"><span>Awaiting Assignment:</span><span className="font-bold text-ink">{filteredDashboardTickets.filter(t => !t.assignedConsultant && t.status !== 'Closed' && t.status !== 'Resolved').length}</span></div>
                    <div className="flex justify-between"><span>Pending Approval:</span><span className="font-bold text-ink">{pendingApprovalsCount}</span></div>
                    <div className="flex justify-between"><span>Pending Closure:</span><span className="font-bold text-ink">{pendingClosureRequests.length}</span></div>
                    <div className="flex justify-between"><span>Escalated:</span><span className="font-bold text-ink">{filteredDashboardTickets.filter(t => t.escalationFlag).length}</span></div>
                    <div className="flex justify-between"><span>Closed This Month:</span><span className="font-bold text-green-700">{filteredDashboardTickets.filter(t => (t.status === 'Closed' || t.status === 'Resolved') && new Date(t.createdAt).getMonth() === new Date(SYSTEM_NOW).getMonth()).length}</span></div>
                    <div className="flex justify-between"><span>Reopened:</span><span className="font-bold text-critical">{filteredDashboardTickets.filter(t => t.status === 'Reopened').length}</span></div>
                    <div className="flex justify-between pt-1.5 border-t border-line mt-1">
                      <span>Avg Resolution Time:</span>
                      <span className="font-bold text-ink">
                        {dashboardData.executive.averageResolutionTime} hrs
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 2: Resource Operations */}
              <Card className="border border-line bg-surface p-4 shadow-card hover:border-line-strong transition flex flex-col justify-between">
                <div>
                  <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">Resource Operations</span>
                  <div className="mt-3 space-y-1.5 text-[11px] text-ink-secondary">
                    <div className="flex justify-between"><span>Total Consultants:</span><span className="font-bold text-ink">{profiles.filter(p => p.role === 'Consultant').length}</span></div>
                    <div className="flex justify-between"><span>Functional:</span><span className="font-bold text-ink">{profiles.filter(p => p.role === 'Consultant' && p.consultant_type === 'Functional').length}</span></div>
                    <div className="flex justify-between"><span>Technical:</span><span className="font-bold text-ink">{profiles.filter(p => p.role === 'Consultant' && p.consultant_type === 'Technical').length}</span></div>
                    <div className="flex justify-between"><span>Allocated Staff:</span><span className="font-bold text-ink">{consultantsLoad.filter(c => c.activeCount > 0).length}</span></div>
                    <div className="flex justify-between"><span>Unallocated Staff:</span><span className="font-bold text-ink">{consultantsLoad.filter(c => c.activeCount === 0).length}</span></div>
                    <div className="flex justify-between"><span>Overloaded Staff:</span><span className="font-bold text-critical">{consultantsLoad.filter(c => c.loadStatus === 'Overloaded').length}</span></div>
                    <div className="flex justify-between"><span>Available Capacity:</span><span className="font-bold text-ink">
                      {Math.max(0, (profiles.filter(p => p.role === 'Consultant').length * workingDaysInMonth * 8) - filteredDashboardTickets.flatMap(t => t.actualHoursLogs || []).filter(ah => ah.approvalStatus?.toLowerCase() === 'approved').reduce((sum, ah) => sum + ah.actualHours, 0)).toFixed(0)} hrs
                    </span></div>
                    <div className="flex justify-between pt-1.5 border-t border-line mt-1">
                      <span>Avg Utilization %:</span>
                      <span className="font-bold text-ink">
                        {consultantsLoad.length > 0 ? Math.round(consultantsLoad.reduce((sum, c) => sum + c.loadPercentage, 0) / consultantsLoad.length) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 3: SLA Governance */}
              <Card className="border border-line bg-surface p-4 shadow-card hover:border-line-strong transition flex flex-col justify-between">
                <div>
                  <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">SLA Governance</span>
                  <div className="mt-3 space-y-1.5 text-[11px] text-ink-secondary">
                    <div className="flex justify-between"><span>SLA Healthy:</span><span className="font-bold text-green-700">{filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) === 'Healthy').length}</span></div>
                    <div className="flex justify-between"><span>SLA Warning:</span><span className="font-bold text-warning">{filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) === 'Warning').length}</span></div>
                    <div className="flex justify-between"><span>SLA Breached:</span><span className="font-bold text-critical">{filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) === 'Breached').length}</span></div>
                    <div className="flex justify-between"><span>Total SLA Monitored:</span><span className="font-bold text-ink">{filteredDashboardTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable').length}</span></div>
                    <div className="flex justify-between pt-1.5 border-t border-line mt-1">
                      <span>Avg SLA Compliance:</span>
                      <span className="font-bold text-ink">
                        {filteredDashboardTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable').length > 0
                          ? Math.round(((filteredDashboardTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable').length - filteredDashboardTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) === 'Breached').length) / filteredDashboardTickets.filter(t => t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable').length) * 100)
                          : 100}%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 4: Customer Operations */}
              <Card className="border border-line bg-surface p-4 shadow-card hover:border-line-strong transition flex flex-col justify-between">
                <div>
                  <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">Customer Operations</span>
                  <div className="mt-3 space-y-1.5 text-[11px] text-ink-secondary">
                    <div className="flex justify-between"><span>Total Customers:</span><span className="font-bold text-ink">{filters.customer === 'All' ? customersList.length : customersList.includes(filters.customer) ? 1 : 0}</span></div>
                    <div className="flex justify-between"><span>With Open Tickets:</span><span className="font-bold text-ink">{new Set(filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').map(t => t.organization)).size}</span></div>
                    <div className="flex justify-between"><span>With Escalations:</span><span className="font-bold text-ink">{new Set(filteredDashboardTickets.filter(t => t.escalationFlag).map(t => t.organization)).size}</span></div>
                    <div className="flex justify-between"><span>Contract Expiring &lt;30d:</span><span className="font-bold text-ink">
                      {contracts.filter(c => c.endDate && c.isActive && (filters.customer === 'All' || c.organizationName === filters.customer) && (new Date(c.endDate).getTime() - SYSTEM_NOW) / (1000 * 60 * 60 * 24) <= 30).length}
                    </span></div>
                    <div className="flex justify-between pt-1.5 border-t border-line mt-1">
                      <span>Mthly Hours (Logged/Approved):</span>
                      <span className="font-bold text-ink">
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
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">
              2. Today&apos;s Manager Action Center
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px]">
              
              {/* Box 1: Immediate Assignment Queue */}
              <Card className="bg-surface border border-line shadow-card rounded-lg p-4 flex flex-col h-[340px] justify-between">
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-line pb-2 mb-3">
                    <span className="font-extrabold text-ink uppercase text-[11px] tracking-wider flex items-center gap-1">
                      Immediate Assignment Queue ({filteredDashboardTickets.filter(isUnassigned).length})
                    </span>
                    <Badge className="bg-surface-subtle text-ink text-[11px] font-bold">UNASSIGNED</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {filteredDashboardTickets
                      .filter(isUnassigned)
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .map(t => {
                        const slaInfo = getSlaBreachInfo(t);
                        return (
                          <QueueTicketRow
                            key={t.id}
                            ticket={t}
                            slaInfo={slaInfo}
                            acknowledgeEscalation={acknowledgeEscalation}
                            user={user}
                          />
                        );
                      })}
                    {filteredDashboardTickets.filter(isUnassigned).length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-ink-muted italic text-center py-10 font-sans">
                        All active workload allocated.
                      </div>
                    )}
                  </div>
                </div>
                <Link href="/manager/tickets?tab=unassigned" className="mt-3">
                  <Button variant="outline" className="w-full text-[11px] uppercase font-bold py-1.5 border-line-strong hover:bg-ink hover:text-white transition">
                    Dispatch Backlog &rarr;
                  </Button>
                </Link>
              </Card>

              {/* Box 2: Approval Queue */}
              <Card className="bg-surface border border-line shadow-card rounded-lg p-4 flex flex-col h-[340px] justify-between">
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-line pb-2 mb-3">
                    <span className="font-extrabold text-ink uppercase text-[11px] tracking-wider">
                      Pending Approvals ({pendingApprovalsCount})
                    </span>
                    <Badge className="bg-amber-100 text-amber-800 text-[11px] font-bold">SIGN-OFF</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {/* Closure Requests */}
                    {pendingClosureRequests.map(r => (
                      <div key={r.requestId} className="p-2 bg-surface-muted border border-line rounded-lg flex flex-col justify-between gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-ink">Closure: <Link href={`/manager/tickets/${r.ticketId}`} className="hover:underline">{r.ticketNumber}</Link></span>
                          <span className="text-[11px] bg-red-100 text-red-800 px-1 py-0.2 rounded font-bold uppercase">Closure Approval</span>
                        </div>
                        <span className="text-ink-secondary truncate block font-sans">Total Hours: {r.funcHours + r.techHours}h</span>
                        <div className="flex justify-end gap-1 mt-1">
                          <Button size="sm" onClick={() => triggerClosureVerify(r.ticketId, r.requestId)} className="h-5 text-[11px] font-bold bg-ink hover:bg-zinc-800 text-white rounded px-2">Verify</Button>
                        </div>
                      </div>
                    ))}
                    {/* Effort Logs */}
                    {pendingEffortLogs.map(log => (
                      <div key={log.logId} className="p-2 bg-surface-muted border border-line rounded-lg flex flex-col justify-between gap-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-ink">Effort: {log.hours}h by {log.consultantName}</span>
                          <span className="text-[11px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold uppercase">Timesheet Effort</span>
                        </div>
                        <span className="text-ink-secondary truncate block font-sans">{log.description}</span>
                        <div className="flex justify-end gap-1 mt-1">
                          <Button size="sm" onClick={() => handleApproveEffort(log.ticketId, log.logId, log.consultantName)} className="h-5 text-[11px] font-bold bg-green-600 hover:bg-green-750 text-white rounded px-2">Approve</Button>
                          <Button size="sm" onClick={() => triggerRejection('effort', log.ticketId, log.logId)} className="h-5 text-[11px] font-bold bg-red-600 hover:bg-red-750 text-white rounded px-2">Reject</Button>
                        </div>
                      </div>
                    ))}
                    {pendingApprovalsCount === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-ink-muted italic text-center py-10 font-sans">
                        No approvals pending decision.
                      </div>
                    )}
                  </div>
                </div>
                <Button onClick={() => setSelectedTab('approvals')} variant="outline" className="mt-3 w-full text-[11px] uppercase font-bold py-1.5 border-line-strong hover:bg-ink hover:text-white transition">
                  Open Approvals Console &rarr;
                </Button>
              </Card>

              {/* Box 3: Escalation Center */}
              <Card className="bg-surface border border-line shadow-card rounded-lg p-4 flex flex-col h-[340px] justify-between">
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-line pb-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5 text-ink-secondary" />
                      <span className="font-extrabold text-ink uppercase text-[11px] tracking-wider">
                        ESCALATION CENTER ({filteredDashboardTickets.filter(t => t.isEscalated && !t.escalationAcknowledgedAt).length})
                      </span>
                    </div>
                    <Badge className="bg-surface-subtle text-ink text-[11px] font-bold border border-line">EXPOSURE</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {/* Active Escalations List */}
                    <div className="space-y-2">
                      {filteredDashboardTickets.filter(t => t.isEscalated && !t.escalationAcknowledgedAt).map(t => {
                        const slaInfo = getSlaBreachInfo(t);
                        return (
                          <EscalationTicketRow
                            key={t.id}
                            ticket={t}
                            slaInfo={slaInfo}
                            acknowledgeEscalation={acknowledgeEscalation}
                            user={user}
                            profiles={profiles}
                          />
                        );
                      })}
                      {filteredDashboardTickets.filter(t => t.isEscalated && !t.escalationAcknowledgedAt).length === 0 && (
                        <div className="text-ink-muted italic text-center py-2 font-sans text-[11px]">
                          No active escalations.
                        </div>
                      )}
                    </div>

                    {/* Recently Acknowledged Escalations Sub-list */}
                    {filteredDashboardTickets.filter(t => t.isEscalated && t.escalationAcknowledgedAt).length > 0 && (
                      <div className="mt-3 pt-2 border-t border-line space-y-2">
                        <span className="font-bold text-ink-secondary uppercase text-[11px] tracking-wider block">
                          Recently Acknowledged
                        </span>
                        {filteredDashboardTickets
                          .filter(t => t.isEscalated && t.escalationAcknowledgedAt)
                          .sort((a, b) => new Date(b.escalationAcknowledgedAt || 0).getTime() - new Date(a.escalationAcknowledgedAt || 0).getTime())
                          .slice(0, 3)
                          .map(t => (
                            <div key={t.id} className="p-2 bg-surface-muted/60 border border-line rounded-lg flex flex-col justify-between gap-1">
                              <div className="flex justify-between items-center">
                                <Link href={`/manager/tickets/${t.id}`} className="font-semibold text-ink hover:underline">{t.ticketNumber || t.id}</Link>
                                <div className="flex gap-1.5 items-center">
                                  <Badge className="bg-success-soft text-success-strong border-emerald-150 text-[11px] font-semibold py-0.5 px-1.5 uppercase leading-none h-4.5 flex items-center gap-1">
                                    <Check className="size-2.5 text-success" /> Ack
                                  </Badge>
                                  <span className="text-[11px] bg-surface-subtle text-ink px-1 py-0.2 rounded font-bold uppercase leading-none h-4 flex items-center">{t.priority}</span>
                                </div>
                              </div>
                              <span className="text-ink-secondary truncate block font-sans text-[11px]">{t.title}</span>
                              <div className="text-[11px] text-ink-secondary mt-0.5 pt-0.5 border-t border-line/50 flex justify-between items-center">
                                <span>Ack: {t.escalationAcknowledgedByName || 'Manager'}</span>
                                <span>{formatRelativeTime(t.escalationAcknowledgedAt)}</span>
                              </div>
                            </div>
                          ))}
                        {filteredDashboardTickets.filter(t => t.isEscalated && t.escalationAcknowledgedAt).length > 3 && (
                          <div className="text-right">
                            <Link href="/manager/tickets?tab=escalated" className="text-[11px] text-ink-secondary hover:text-ink font-bold hover:underline">
                              View full history &rarr;
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Link href="/manager/tickets?tab=escalated" className="mt-3">
                  <Button variant="outline" className="w-full text-[11px] uppercase font-bold py-1.5 border-line-strong hover:bg-ink hover:text-white transition">
                    Inspect Escalations &rarr;
                  </Button>
                </Link>
              </Card>

              {/* Box 4: SLA Risk Center */}
              <Card className="bg-surface border border-line shadow-card rounded-lg p-4 flex flex-col h-[340px] justify-between">
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-line pb-2 mb-3">
                    <span className="font-extrabold text-ink uppercase text-[11px] tracking-wider">
                      SLA Risk Center ({filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) !== 'Healthy').length})
                    </span>
                    <Badge className="bg-red-100 text-red-800 text-[11px] font-bold">WARNING</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) !== 'Healthy').map(t => {
                      const slaInfo = getSlaBreachInfo(t);
                      const isEscalated = t.escalationFlag;
                      const borderClass = isEscalated || (slaInfo?.status === 'breached') 
                        ? 'border-l-4 border-l-destructive pl-2' 
                        : (slaInfo?.status === 'imminent' ? 'border-l-4 border-l-amber-500 pl-2' : '');
                      return (
                        <div key={t.id} className={`p-2 bg-surface-muted border border-line rounded-lg flex flex-col justify-between gap-1 ${borderClass}`}>
                          <div className="flex justify-between items-center">
                            <Link href={`/manager/tickets/${t.id}`} className="font-bold text-ink hover:underline">{t.ticketNumber || t.id}</Link>
                            <div className="flex gap-1 items-center">
                              {isEscalated && <Badge variant="destructive" className="text-[11px] font-bold py-0 px-1 uppercase leading-none h-4">Escalated</Badge>}
                              {slaInfo && (
                                <Badge className={`text-[11px] font-bold py-0 px-1 uppercase leading-none h-4 ${
                                  slaInfo.status === 'breached' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                                }`}>{slaInfo.label}</Badge>
                              )}
                              <span className={`text-[11px] px-1 py-0.2 rounded font-bold uppercase leading-none h-4 ${getSlaStatus(t, SYSTEM_NOW) === 'Breached' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{getSlaStatus(t, SYSTEM_NOW)}</span>
                            </div>
                          </div>
                          <span className="text-ink-secondary truncate block font-sans">{t.title}</span>
                          <div className="flex justify-between items-center text-[11px] text-ink-muted">
                            <span>Org: {t.organization}</span>
                            <span>Due: {t.slaDueAt ? new Date(t.slaDueAt).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                      );
                    })}
                    {filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable' && getSlaStatus(t, SYSTEM_NOW) !== 'Healthy').length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-ink-muted italic text-center py-10 font-sans">
                        All SLAs running in healthy range.
                      </div>
                    )}
                  </div>
                </div>
                <Link href="/manager/tickets?tab=slaBreached" className="mt-3">
                  <Button variant="outline" className="w-full text-[11px] uppercase font-bold py-1.5 border-line-strong hover:bg-ink hover:text-white transition">
                    Inspect SLA Risks &rarr;
                  </Button>
                </Link>
              </Card>

              {/* Box 5: Workload Balancer */}
              <Card className="bg-surface border border-line shadow-card rounded-lg p-4 flex flex-col h-[340px] justify-between">
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-line pb-2 mb-3">
                    <span className="font-extrabold text-ink uppercase text-[11px] tracking-wider">
                      Workload Balancer
                    </span>
                    <Badge className="bg-surface-subtle text-ink text-[11px] font-bold">CAPACITY</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1 text-[11px]">
                    {/* Shared grid template on header + every row guarantees the columns
                        line up at any name length or data volume (low or high). */}
                    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_4.5rem] gap-2 border-b border-line pb-1.5 mb-1 text-ink-secondary font-bold uppercase text-[11px] sticky top-0 bg-surface z-10">
                      <span>Consultant</span>
                      <span className="text-right">Active</span>
                      <span className="text-right">Util %</span>
                    </div>
                    <div className="space-y-1">
                      {consultantsLoad.map(c => (
                        <div key={c.name} className="grid grid-cols-[minmax(0,1fr)_5.5rem_4.5rem] gap-2 items-center py-1 hover:bg-surface-muted px-1 rounded">
                          <span className="font-bold text-ink truncate" title={c.name}>{c.name}</span>
                          <span className="text-ink-secondary text-right tabular-nums">{c.activeCount} open</span>
                          <span className={`text-right tabular-nums font-bold ${c.loadStatus === 'Overloaded' ? 'text-critical' : c.loadStatus === 'Underutilized' ? 'text-warning' : 'text-green-700'}`}>{c.loadPercentage}%</span>
                        </div>
                      ))}
                      {consultantsLoad.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-ink-muted italic text-center py-10 font-sans">
                          No consultant load data.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Button onClick={() => setSelectedTab('resources')} variant="outline" className="mt-3 w-full text-[11px] uppercase font-bold py-1.5 border-line-strong hover:bg-ink hover:text-white transition">
                  Balance Resources &rarr;
                </Button>
              </Card>

              {/* Box 6: Contract Alerts */}
              <Card className="bg-surface border border-line shadow-card rounded-lg p-4 flex flex-col h-[340px] justify-between">
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-line pb-2 mb-3">
                    <span className="font-extrabold text-ink uppercase text-[11px] tracking-wider">
                      Contract Alerts ({contracts.filter(c => c.isActive && ((c.usedHours / c.totalHours) >= 0.9 || (new Date(c.endDate).getTime() - SYSTEM_NOW) / (1000 * 60 * 60 * 24) <= 30)).length})
                    </span>
                    <Badge className="bg-amber-100 text-amber-800 text-[11px] font-bold">BUDGET</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[11px]">
                    {contracts.filter(c => c.isActive && ((c.usedHours / c.totalHours) >= 0.9 || (new Date(c.endDate).getTime() - SYSTEM_NOW) / (1000 * 60 * 60 * 24) <= 30)).map(c => {
                      const consumption = (c.usedHours / c.totalHours) * 100;
                      const daysRemaining = (new Date(c.endDate).getTime() - SYSTEM_NOW) / (1000 * 60 * 60 * 24);
                      return (
                        <div key={c.id} className="p-2 bg-surface-muted border border-line rounded-lg flex flex-col gap-1">
                          <span className="font-bold text-ink">{c.organizationName}</span>
                          <span className="text-ink-secondary text-[11px]">FTE Total: {c.totalHours}h</span>
                          <div className="flex justify-between text-[11px]">
                            <span>Usage: <span className="font-bold text-ink">{consumption.toFixed(0)}%</span></span>
                            <span>Ends in: <span className="font-bold text-ink">{daysRemaining.toFixed(0)} days</span></span>
                          </div>
                        </div>
                      );
                    })}
                    {contracts.filter(c => c.isActive && ((c.usedHours / c.totalHours) >= 0.9 || (new Date(c.endDate).getTime() - SYSTEM_NOW) / (1000 * 60 * 60 * 24) <= 30)).length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-ink-muted italic text-center py-10 font-sans">
                        All client contracts are within budget constraints.
                      </div>
                    )}
                  </div>
                </div>
                <Button onClick={() => setSelectedTab('customers')} variant="outline" className="mt-3 w-full text-[11px] uppercase font-bold py-1.5 border-line-strong hover:bg-ink hover:text-white transition">
                  Inspect Contract Ledger &rarr;
                </Button>
              </Card>

            </div>
          </div>

          {/* Team Performance + Demand & Quality — single home (titles render once).
              The former ManagerTeamCockpit duplicated these section titles and was
              fully hand-rolled (raw table, raw stat divs, ChartFrame); retired. */}
          <ManagerTeamPerformance tickets={filteredTickets} loading={loading} now={Date.now()} />
        </TabsContent>

        {/* ── TAB CONTENT: EXECUTIVE HEALTH ── */}
        <TabsContent value="health" className="space-y-6 outline-none">
          
          {/* SECTION 1: EXECUTIVE HEALTH OVERVIEW */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">1. Executive Health Overview</span>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Group A: Customer KPIs */}
              <Card className="border-l-4 border-l-blue-500 border border-line bg-surface p-4 shadow-card flex flex-col justify-between">
                <div>
                  <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">Customer KPIs</span>
                  <div className="mt-3 space-y-1.5 font-bold text-ink text-[11px]">
                    <div className="flex justify-between"><span>Total Customers:</span><span>{dashboardData.executive.totalCustomers}</span></div>
                    <div className="flex justify-between"><span>Active:</span><span className="text-green-700">{dashboardData.executive.activeCustomers}</span></div>
                    <div className="flex justify-between"><span>With Open Tickets:</span><span>{dashboardData.executive.customersWithOpenTickets}</span></div>
                    <div className="flex justify-between"><span>With P1s:</span><span className={dashboardData.executive.customersWithCriticalTickets > 0 ? 'text-critical animate-pulse' : ''}>{dashboardData.executive.customersWithCriticalTickets}</span></div>
                    <div className="flex justify-between"><span>With SLA Breach:</span><span className={dashboardData.executive.customersWithSlaBreaches > 0 ? 'text-critical' : ''}>{dashboardData.executive.customersWithSlaBreaches}</span></div>
                    <div className="flex justify-between"><span>Awaiting Closure:</span><span>{dashboardData.executive.customersAwaitingClosure}</span></div>
                  </div>
                </div>
              </Card>

              {/* Group B: Ticket KPIs */}
              <Card className="border-l-4 border-l-amber-500 border border-line bg-surface p-4 shadow-card flex flex-col justify-between">
                <div>
                  <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">Ticket KPIs</span>
                  <div className="mt-3 space-y-1 text-ink text-[11px] font-bold">
                    <div className="flex justify-between"><span>Raised:</span><span>{dashboardData.executive.totalTicketsRaised}</span></div>
                    <div className="flex justify-between"><span>Open Backlog:</span><span className="text-blue-600">{dashboardData.executive.openTickets}</span></div>
                    <div className="flex justify-between"><span>Unassigned:</span><span className={dashboardData.executive.unassignedTickets > 0 ? 'text-warning font-black' : ''}>{dashboardData.executive.unassignedTickets}</span></div>
                    <div className="flex justify-between"><span>Req. Gathering:</span><span>{dashboardData.executive.reqGathering}</span></div>
                    <div className="flex justify-between"><span>IP Functional:</span><span>{dashboardData.executive.ipFunc}</span></div>
                    <div className="flex justify-between"><span>IP Technical:</span><span>{dashboardData.executive.ipTech}</span></div>
                    <div className="flex justify-between"><span>Cust. Action:</span><span>{dashboardData.executive.custAction}</span></div>
                    <div className="flex justify-between"><span>On Hold:</span><span>{dashboardData.executive.onHold}</span></div>
                    <div className="flex justify-between"><span>Raised to SAP:</span><span>{dashboardData.executive.raisedToSap}</span></div>
                    <div className="flex justify-between"><span>Req. Closure:</span><span>{dashboardData.executive.requestClosure}</span></div>
                    <div className="flex justify-between text-green-700"><span>Closed:</span><span>{dashboardData.executive.closedTickets}</span></div>
                    <div className="flex justify-between text-critical"><span>Reopened:</span><span>{dashboardData.executive.reopenedTickets}</span></div>
                  </div>
                </div>
              </Card>

              {/* Group C: Consultant KPIs */}
              <Card className="border-l-4 border-l-green-500 border border-line bg-surface p-4 shadow-card flex flex-col justify-between">
                <div>
                  <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">Consultant KPIs</span>
                  <div className="mt-3 space-y-1.5 font-bold text-ink text-[11px]">
                    <div className="flex justify-between"><span>Total Staff:</span><span>{dashboardData.executive.totalConsultants}</span></div>
                    <div className="flex justify-between"><span>Functional:</span><span>{dashboardData.executive.funcConsultants}</span></div>
                    <div className="flex justify-between"><span>Technical:</span><span>{dashboardData.executive.techConsultants}</span></div>
                    <div className="flex justify-between"><span>Active:</span><span>{dashboardData.executive.activeConsultants}</span></div>
                    <div className="flex justify-between"><span>Overloaded:</span><span className={dashboardData.executive.overloadedConsultants > 0 ? 'text-critical font-black' : ''}>{dashboardData.executive.overloadedConsultants}</span></div>
                    <div className="flex justify-between"><span>Underutilized:</span><span>{dashboardData.executive.underutilizedConsultants}</span></div>
                  </div>
                </div>
              </Card>

              {/* Group D: Approval KPIs */}
              <Card className="border-l-4 border-l-zinc-500 border border-line bg-surface p-4 shadow-card flex flex-col justify-between">
                <div>
                  <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">Approval KPIs</span>
                  <div className="mt-3 space-y-1.5 font-bold text-ink text-[11px]">
                    <div className="flex justify-between"><span>Est. Hours Pending:</span><span>{dashboardData.executive.estPendingApproval}</span></div>
                    <div className="flex justify-between"><span>Act. Hours Pending:</span><span className={dashboardData.executive.actPendingApproval > 0 ? 'text-warning' : ''}>{dashboardData.executive.actPendingApproval}</span></div>
                    <div className="flex justify-between"><span>Closures Pending:</span><span className={dashboardData.executive.closurePendingApproval > 0 ? 'text-red-605' : ''}>{dashboardData.executive.closurePendingApproval}</span></div>
                    <div className="flex justify-between"><span>Reopens Pending:</span><span>{dashboardData.executive.reopenPendingApproval}</span></div>
                    <div className="flex justify-between"><span>Unlocks Pending:</span><span>{dashboardData.executive.resourceChangePending}</span></div>
                  </div>
                </div>
              </Card>

              {/* Group E: SLA KPIs */}
              <Card className="border-l-4 border-l-red-500 border border-line bg-surface p-4 shadow-card flex flex-col justify-between">
                <div>
                  <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">SLA Compliance</span>
                  <div className="mt-3 space-y-1.5 font-bold text-ink text-[11px]">
                    <div className="flex justify-between"><span>SLA Healthy:</span><span className="text-green-700">{dashboardData.executive.slaHealthy}</span></div>
                    <div className="flex justify-between"><span>SLA Warning:</span><span className="text-warning">{dashboardData.executive.slaWarning}</span></div>
                    <div className="flex justify-between"><span>SLA Breached:</span><span className={dashboardData.executive.slaBreached > 0 ? 'text-critical font-black animate-pulse' : ''}>{dashboardData.executive.slaBreached}</span></div>
                    <div className="border-t border-line pt-2 flex justify-between items-center mt-2.5">
                      <span className="text-[11px] uppercase">Compliance Index:</span>
                      <span className={`text-sm font-black ${dashboardData.executive.averageSlaCompliance >= 95 ? 'text-green-700' : 'text-critical'}`}>{dashboardData.executive.averageSlaCompliance}%</span>
                    </div>
                  </div>
                </div>
              </Card>

            </div>
          </div>

          {/* SECTION 2: TODAY'S MANAGER ACTION CENTER */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">2. Today&apos;s Manager Action Center</span>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Box A: Unassigned Queue */}
              <Card className="border border-line bg-surface-muted/60 p-4 shadow-card flex flex-col justify-between">
                <div>
                  <span className="text-[11px] text-ink-muted uppercase font-black tracking-wider block">Staffing Dispatch</span>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-ink">{dashboardData.actionCenter.ticketsAwaitingAssign.length}</span>
                    <span className="text-ink-secondary font-medium">tickets need allocation</span>
                  </div>
                </div>
                <Link href="/manager/tickets?tab=unassigned" className="mt-4">
                  <Button variant="outline" className="w-full text-[11px] uppercase font-bold py-1 border-line-strong hover:bg-ink hover:text-white transition">
                    Dispatch Backlog <ArrowRight size={10} className="ml-1" />
                  </Button>
                </Link>
              </Card>

              {/* Box B: Actionable Approvals */}
              <Card className="border border-line bg-surface-muted/60 p-4 shadow-card flex flex-col justify-between">
                <div>
                  <span className="text-[11px] text-ink-muted uppercase font-black tracking-wider block">Audits Pending Sign-off</span>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-ink">{dashboardData.executive.totalApprovals}</span>
                    <span className="text-ink-secondary font-medium">approvals waiting manager</span>
                  </div>
                </div>
                <Button onClick={() => setSelectedTab('approvals')} variant="outline" className="mt-4 w-full text-[11px] uppercase font-bold py-1 border-line-strong hover:bg-ink hover:text-white transition">
                  Open Approvals Console <ArrowRight size={10} className="ml-1" />
                </Button>
              </Card>

              {/* Box C: SLA Mitigation */}
              <Card className="border border-line bg-surface-muted/60 p-4 shadow-card flex flex-col justify-between">
                <div>
                  <span className="text-[11px] text-ink-muted uppercase font-black tracking-wider block">Active Delivery Exposure</span>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-critical">{dashboardData.actionCenter.slaBreachTickets.length + dashboardData.actionCenter.slaDueToday.length}</span>
                    <span className="text-ink-secondary font-medium">at-risk incident SLA boundaries</span>
                  </div>
                </div>
                <Link href="/manager/tickets?tab=slaBreached" className="mt-4">
                  <Button variant="outline" className="w-full text-[11px] uppercase font-bold py-1 border-line-strong hover:bg-ink hover:text-white transition">
                    Inspect Risks <ArrowRight size={10} className="ml-1" />
                  </Button>
                </Link>
              </Card>

              {/* Box D: Aging Action */}
              <Card className="border border-line bg-surface-muted/60 p-4 shadow-card flex flex-col justify-between">
                <div>
                  <span className="text-[11px] text-ink-muted uppercase font-black tracking-wider block">Stuck / Stalled Backlog</span>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-warning">{dashboardData.actionCenter.ticketsAging7Days.length}</span>
                    <span className="text-ink-secondary font-medium">tickets aging beyond 7 days</span>
                  </div>
                </div>
                <Link href="/manager/tickets" className="mt-4">
                  <Button variant="outline" className="w-full text-[11px] uppercase font-bold py-1 border-line-strong hover:bg-ink hover:text-white transition">
                    Audit Aging Backlog <ArrowRight size={10} className="ml-1" />
                  </Button>
                </Link>
              </Card>

            </div>
          </div>

          {/* SECTION 13: ALERTS & RISK INTELLIGENCE PANEL */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">3. Executive Risk Intelligence Alerts</span>
            
            <div className="space-y-3">
              {systemAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`border p-3.5 rounded-lg flex items-start justify-between gap-4 bg-surface ${
                    alert.severity === 'Critical' ? 'border-critical-border bg-critical-soft/10' : 'border-line'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {alert.severity === 'Critical' ? (
                      <ShieldAlert className="text-critical shrink-0 mt-0.5" size={15} />
                    ) : (
                      <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={15} />
                    )}
                    <div>
                      <span className="font-bold text-ink block">{alert.reason}</span>
                      <span className="text-ink-secondary text-[11px] block mt-0.5">Recommended Manager Action: {alert.action}</span>
                    </div>
                  </div>
                  <Link href={alert.link}>
                    <Button variant="outline" className="text-[11px] uppercase font-bold h-7 py-1 px-3 border-line-strong hover:bg-surface-muted">
                      Mitigate
                    </Button>
                  </Link>
                </div>
              ))}
              {systemAlerts.length === 0 && (
                <div className="text-center py-8 border border-dashed border-line rounded-lg text-ink-muted italic">No system alerts flagged today. Incident delivery SLAs are running healthy.</div>
              )}
            </div>
          </div>

        </TabsContent>

        {/* ── TAB CONTENT: TICKET CONTROL CENTER ── */}
        <TabsContent value="tickets" className="space-y-6 outline-none">
          
          {/* SECTION 3: TICKET OPERATIONS COMMAND CENTER */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">1. Ticket Operations Command Center</span>
            
            {/* Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              <Card className="p-3 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">Active Backlog</span>
                <span className="text-lg font-bold text-ink block mt-1">{dashboardData.executive.openTickets}</span>
              </Card>
              <Card className="p-3 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">No Owner</span>
                <span className="text-lg font-bold text-warning block mt-1">{dashboardData.executive.unassignedTickets}</span>
              </Card>
              <Card className="p-3 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">Stalled (3d+)</span>
                <span className="text-lg font-bold text-ink block mt-1">{dashboardData.actionCenter.ticketsNoUpdate3Days.length}</span>
              </Card>
              <Card className="p-3 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">Aging 7d+</span>
                <span className="text-lg font-bold text-ink block mt-1">{dashboardData.actionCenter.ticketsAging7Days.length}</span>
              </Card>
              <Card className="p-3 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">Aging 15d+</span>
                <span className="text-lg font-bold text-ink block mt-1">{dashboardData.actionCenter.ticketsAging15Days.length}</span>
              </Card>
              <Card className="p-3 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">Aging 30d+</span>
                <span className="text-lg font-bold text-ink block mt-1">{dashboardData.actionCenter.ticketsAging30Days.length}</span>
              </Card>
              <Card className="p-3 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">Raised to SAP</span>
                <span className="text-lg font-bold text-ink block mt-1">{dashboardData.executive.raisedToSap}</span>
              </Card>
            </div>

            {/* Recharts grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <Card className="border border-line p-4 bg-surface shadow-card flex flex-col justify-between">
                <span className="font-bold text-[11px] text-ink-secondary uppercase tracking-wider block mb-3 pb-1 border-b border-line">Ticket Status Distribution</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.statusData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" interval={0} stroke="#71717a" fontSize={7} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="border border-line p-4 bg-surface shadow-card flex flex-col justify-between">
                <span className="font-bold text-[11px] text-ink-secondary uppercase tracking-wider block mb-3 pb-1 border-b border-line">Ticket Priority Backlog Split</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.priorityData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" interval={0} stroke="#71717a" fontSize={8} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill={COLORS.red} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="border border-line p-4 bg-surface shadow-card flex flex-col justify-between">
                <span className="font-bold text-[11px] text-ink-secondary uppercase tracking-wider block mb-3 pb-1 border-b border-line">Open vs Closed Monthly Trend</span>
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
              
              <Card className="border border-line p-4 bg-surface shadow-card flex flex-col justify-between">
                <span className="font-bold text-[11px] text-ink-secondary uppercase tracking-wider block mb-3 pb-1 border-b border-line">Ticket Type Distribution</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.typeData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" interval={0} stroke="#71717a" fontSize={8} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill={COLORS.gray} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="border border-line p-4 bg-surface shadow-card flex flex-col justify-between">
                <span className="font-bold text-[11px] text-ink-secondary uppercase tracking-wider block mb-3 pb-1 border-b border-line">Active Incident Aging buckets</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.agingData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" interval={0} stroke="#71717a" fontSize={8} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill={COLORS.gray} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

            </div>
          </div>

          {/* SECTION 6: SLA & AGING CONTROL CENTER */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">2. SLA & Aging Control Center (Incidents Specific)</span>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <Card className="p-4 bg-surface border border-line shadow-card flex flex-col justify-between col-span-1">
                <div>
                  <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">Incident SLA Indicators</span>
                  <div className="mt-4 space-y-3 font-bold text-ink text-[11px]">
                    <div className="flex justify-between"><span>SLA Met/Healthy Incidents:</span><span className="text-green-700">{dashboardData.executive.slaHealthy}</span></div>
                    <div className="flex justify-between"><span>SLA Warning Incidents (&lt;24h):</span><span className="text-warning">{dashboardData.executive.slaWarning}</span></div>
                    <div className="flex justify-between"><span>SLA Breached Incidents:</span><span className="text-critical font-black animate-pulse">{dashboardData.executive.slaBreached}</span></div>
                    <div className="flex justify-between pt-2 border-t border-line">
                      <span>SLA Compliance Index:</span>
                      <span className={`text-md font-black ${dashboardData.executive.averageSlaCompliance >= 95 ? 'text-green-700' : 'text-critical'}`}>{dashboardData.executive.averageSlaCompliance}%</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Top SLA Risk incident list */}
              <Card className="col-span-2 border border-line bg-surface shadow-card overflow-hidden">
                <div className="p-3.5 bg-surface-muted border-b border-line">
                  <span className="font-bold text-ink uppercase text-[11px] tracking-wider">Top Incident SLA Risk Tickets</span>
                </div>
                <div className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-surface-subtle text-ink-secondary font-bold uppercase text-[11px] border-b border-line">
                        <tr>
                          <th className="py-2 px-3">Ticket ID</th>
                          <th className="py-2 px-3">Customer</th>
                          <th className="py-2 px-3 text-center">Priority</th>
                          <th className="py-2 px-3">Due Target</th>
                          <th className="py-2 px-3">Assignee</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable').slice(0, 4).map(t => {
                          const slaInfo = getSlaBreachInfo(t);
                          const isEscalated = t.escalationFlag;
                          const borderClass = isEscalated || (slaInfo?.status === 'breached') 
                            ? 'border-l-4 border-l-destructive' 
                            : (slaInfo?.status === 'imminent' ? 'border-l-4 border-l-amber-500' : '');
                          return (
                            <tr key={t.id} className="hover:bg-surface-muted/60">
                              <td className={`py-2 px-3 font-bold text-ink ${borderClass}`}>
                                <div className="flex items-center gap-1.5">
                                  <Link href={`/manager/tickets/${t.id}`} className="hover:underline">{t.ticketNumber || t.id}</Link>
                                  {isEscalated && <Badge variant="destructive" className="text-[11px] font-bold py-0 px-1 uppercase leading-none h-4">Escalated</Badge>}
                                  {slaInfo && (
                                    <Badge className={`text-[11px] font-bold py-0 px-1 uppercase leading-none h-4 ${
                                      slaInfo.status === 'breached' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                                    }`}>{slaInfo.label}</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 font-semibold text-ink-secondary truncate max-w-[100px]">{t.organization}</td>
                              <td className="py-2 px-3 text-center font-bold text-critical">{t.priority}</td>
                              <td className="py-2 px-3 text-ink-secondary whitespace-nowrap">{new Date(t.slaDueAt).toLocaleString()}</td>
                              <td className="py-2 px-3 text-ink-secondary font-semibold">{t.assignedConsultant || 'Unassigned'}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-1.5 py-0.2 rounded font-bold border text-[11px] uppercase text-brand-strong bg-brand-soft border-brand-border">{t.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredDashboardTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.slaDueAt !== 'SLA Not Applicable').length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-ink-muted italic">No incident SLA risks found.</td>
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
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">1. Consultant Workload & Capacity Control</span>
            
            {/* Working capacity descriptors */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-surface-muted p-4 border border-line rounded-lg">
              <div>
                <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">Expectation Policy</span>
                <span className="font-semibold text-ink-secondary block mt-1">Expected work days: Sun to Thu</span>
                <span className="text-[11px] text-ink-secondary block">Friday & Saturday skipped. Daily capacity: 8 hours.</span>
              </div>
              <div>
                <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">Expected Month Hours</span>
                <span className="text-base font-bold text-ink block mt-1">{workingDaysInMonth * 8} Hours / FTE</span>
                <span className="text-[11px] text-ink-secondary block">Based on {workingDaysInMonth} active expected working days.</span>
              </div>
              <div>
                <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">Active Engineers allocated</span>
                <span className="text-base font-bold text-ink block mt-1">{consultantsLoad.filter(c => c.activeCount > 0).length} Consultants</span>
                <span className="text-[11px] text-ink-secondary block">Out of {consultantsLoad.length} total staff index.</span>
              </div>
              <div>
                <span className="font-bold text-ink-muted uppercase text-[11px] tracking-wider block">Capacity Overload States</span>
                <span className="text-base font-bold text-critical block mt-1">{consultantsLoad.filter(c => c.loadStatus === 'Overloaded').length} Consultants overloaded</span>
                <span className="text-[11px] text-ink-secondary block">Load exceeding 85% capacity limits.</span>
              </div>
            </div>

            {/* Load Map Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {consultantsLoad.map((c) => {
                const isOver = c.loadStatus === 'Overloaded';
                const isUnder = c.loadStatus === 'Underutilized';
                
                return (
                  <Card key={c.name} className={`p-4 bg-surface border shadow-card flex flex-col justify-between transition cursor-pointer hover:border-line-strong ${
                    selectedConsultant === c.name ? 'border-ink ring-1 ring-zinc-150' : 'border-line'
                  }`} onClick={() => setSelectedConsultant(selectedConsultant === c.name ? null : c.name)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-ink text-xs block">{c.name}</span>
                        <span className="text-[11px] text-ink-muted uppercase font-black tracking-widest">{c.type} • {c.expertise.join('/')}</span>
                      </div>
                      <Badge className={`border-none font-bold text-[11px] uppercase ${
                        isOver ? 'bg-red-100 text-red-800 animate-pulse' : isUnder ? 'bg-surface-subtle text-ink' : 'bg-green-100 text-green-800'
                      }`}>
                        {c.loadStatus}
                      </Badge>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1 text-[11px] font-bold text-ink-secondary">
                        <span>Load level:</span>
                        <span>{c.activeCount} active ({c.loadPercentage}%)</span>
                      </div>
                      <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOver ? 'bg-red-500' : isUnder ? 'bg-amber-400' : 'bg-green-500'
                          }`}
                          style={{ width: `${c.loadPercentage}%` }}
                        />
                      </div>
                    </div>

                    {selectedConsultant === c.name && (
                      <div className="mt-3.5 pt-2.5 border-t border-line space-y-1.5">
                        <span className="text-[11px] text-ink-muted uppercase font-black block">Backlog Queue List</span>
                        {filteredDashboardTickets.filter(t => 
                          t.status !== 'Closed' && 
                          t.status !== 'Resolved' && 
                          (t.assignedConsultant === c.name || t.consultantEfforts?.some(e => e.consultantName === c.name && !e.isDeleted))
                        ).map(t => (
                          <div key={t.id} className="flex justify-between items-center text-[11px] py-1 border-b border-line last:border-0 hover:bg-surface-subtle/50 px-1 rounded">
                            <Link href={`/manager/tickets/${t.id}`} className="font-bold text-ink hover:underline truncate max-w-[120px]">{t.ticketNumber || t.id} - {t.title}</Link>
                            <Badge className="bg-surface-subtle text-ink-secondary border-none font-bold text-[11px] py-0 px-1 uppercase">{t.priority}</Badge>
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
              <Card className="p-4 bg-surface border border-line shadow-card flex flex-col justify-between">
                <span className="font-bold text-[11px] text-ink-secondary uppercase tracking-wider block mb-3 pb-1 border-b border-line">Consultant Load Distribution</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultantsLoad.map(c => ({ name: c.name, value: c.activeCount }))} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" interval={0} stroke="#71717a" fontSize={7} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4 bg-surface border border-line shadow-card flex flex-col justify-between">
                <span className="font-bold text-[11px] text-ink-secondary uppercase tracking-wider block mb-3 pb-1 border-b border-line">FTE Hours Consumption variance</span>
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
                      <XAxis dataKey="name" interval={0} stroke="#71717a" fontSize={7} />
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
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">1. Customer Health Command Center</span>
            
            {/* Risk Ledger table */}
            <Card className="border border-line bg-surface shadow-card overflow-hidden">
              <div className="p-3.5 bg-surface-muted border-b border-line">
                <span className="font-bold text-ink uppercase text-[11px] tracking-wider">Operational Customer health & SLA Ledger</span>
              </div>
              <div className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-surface-subtle text-ink-secondary font-bold uppercase text-[11px] border-b border-line">
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
                        <th className="py-2.5 px-4 font-bold text-center">Health Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {dashboardData.customerRiskLedger.map((c) => (
                        <tr key={c.name} className="hover:bg-surface-muted/60">
                          <td className="py-2.5 px-4 font-bold text-ink">{c.name}</td>
                          <td className="py-2.5 px-4 text-center whitespace-nowrap text-ink-secondary">
                            {c.startDate} to {c.endDate}
                          </td>
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            <div className="font-semibold text-ink-secondary text-[11px]">{c.contractType}</div>
                            <div className="text-[11px] font-bold text-ink-muted mt-0.5">{c.contractStatus}</div>
                          </td>
                          <td className="py-2.5 px-4 text-center text-ink-secondary">
                            {c.totalHours}h / {c.monthlyHours}h
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-ink">
                            {c.approvedHours.toFixed(1)}h
                          </td>
                          <td className="py-2.5 px-4 text-center text-ink-secondary">
                            {c.remainingHours.toFixed(1)}h
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`font-bold ${c.utilizationPercent >= 90 ? 'text-critical font-black' : c.utilizationPercent >= 75 ? 'text-warning' : 'text-green-700'}`}>
                              {c.utilizationPercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center text-ink-secondary">
                            {c.openTickets} / {c.closedTickets} / {c.reopened} / {c.escalated}
                          </td>
                          <td className={`py-2.5 px-4 text-center font-bold ${c.breached > 0 ? 'text-critical font-black animate-pulse' : 'text-ink-secondary'}`}>
                            {c.breached}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <Badge className={`border-none font-bold text-[11px] uppercase tracking-wider ${
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

            <div className="pt-3">
              <Card className="p-4 bg-surface border border-line shadow-card flex flex-col justify-between">
                <span className="font-bold text-[11px] text-ink-secondary uppercase tracking-wider block mb-3 pb-1 border-b border-line">Customer Ticket Volume Share</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.topCustomersVolume} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" interval={0} stroke="#71717a" fontSize={7} />
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

        {/* ── TAB CONTENT: GOVERNANCE & FINANCIALS ── */}
        <TabsContent value="approvals" className="space-y-6 outline-none">
          
          {/* SECTION 9: APPROVAL & CLOSURE CONTROL CENTER */}
          <div className="space-y-4" id="governanceApproval">
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">1. Approval & Closure Control Center</span>
            
            {/* Grouped approvals list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Timesheets List */}
              <Card className="border border-line bg-surface shadow-card overflow-hidden flex flex-col justify-between h-96">
                <div className="p-3 bg-surface-muted border-b border-line flex justify-between items-center">
                  <span className="font-bold text-ink uppercase text-[11px] tracking-wider">Timesheet Approvals Queue ({pendingEffortLogs.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                  {pendingEffortLogs.map(log => (
                    <div key={log.logId} className="p-3 border-b border-line flex justify-between items-start hover:bg-surface-muted/60">
                      <div>
                        <span className="font-bold text-ink block text-[11px]">{log.consultantName} logged {log.hours}h</span>
                        <span className="text-ink-muted block text-[11px]">{log.ticketNumber} • {log.activityType}</span>
                        <span className="text-ink-secondary block mt-1 leading-relaxed text-[11px] truncate max-w-[180px]" title={log.description}>{log.description}</span>
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
                    <div className="py-20 text-center text-ink-muted italic">No effort log audits pending.</div>
                  )}
                </div>
              </Card>

              {/* Closures List */}
              <Card className="border border-line bg-surface shadow-card overflow-hidden flex flex-col justify-between h-96">
                <div className="p-3 bg-surface-muted border-b border-line flex justify-between items-center">
                  <span className="font-bold text-ink uppercase text-[11px] tracking-wider">Closure Requests ({pendingClosureRequests.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                  {pendingClosureRequests.map(r => (
                    <div key={r.requestId} className="p-3 border-b border-line flex justify-between items-start hover:bg-surface-muted/60">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-ink text-[11px]">{r.ticketNumber}</span>
                          <span className="text-ink-muted text-[11px] font-semibold">({r.customerName})</span>
                        </div>
                        <span className="text-ink block text-[11px] font-bold truncate max-w-[180px] mt-0.5">{r.ticketTitle}</span>
                        <span className="text-ink-muted block text-[11px] mt-0.5">By: {r.requestedBy} • Total: {r.funcHours + r.techHours}h</span>
                        <span className="text-ink-secondary block mt-1 leading-relaxed text-[11px] truncate max-w-[180px]">{r.summary}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-6 bg-ink hover:bg-zinc-800 text-white text-[11px] uppercase font-bold px-2 rounded cursor-pointer" onClick={() => triggerClosureVerify(r.ticketId, r.requestId)}>
                          Verify
                        </Button>
                        <Button size="icon" className="h-6 w-6 bg-red-650 hover:bg-red-700 text-white rounded cursor-pointer" onClick={() => triggerRejection('closure', r.ticketId, r.requestId)}>
                          <X size={11} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingClosureRequests.length === 0 && (
                    <div className="py-20 text-center text-ink-muted italic">No closure verifications pending.</div>
                  )}
                </div>
              </Card>

              {/* Unlocks List */}
              <Card className="border border-line bg-surface shadow-card overflow-hidden flex flex-col justify-between h-96">
                <div className="p-3 bg-surface-muted border-b border-line flex justify-between items-center">
                  <span className="font-bold text-ink uppercase text-[11px] tracking-wider">Work Log Unlock Requests ({pendingUnlockRequests.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                  {pendingUnlockRequests.map(u => (
                    <div key={u.requestId} className="p-3 border-b border-line flex justify-between items-start hover:bg-surface-muted/60">
                      <div>
                        <span className="font-bold text-ink block text-[11px]">Unlock Log: {u.ticketNumber}</span>
                        <span className="text-ink-muted block text-[11px]">Requester: {u.requestedBy}</span>
                        <span className="text-ink-secondary block mt-1 text-[11px] truncate max-w-[180px]" title={u.reason}>{u.reason}</span>
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
                    <div className="py-20 text-center text-ink-muted italic">No timesheet unlock requests pending.</div>
                  )}
                </div>
              </Card>

            </div>

            {/* Password Reset & Ticket Reopen Requests Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              
              {/* Password Reset Requests */}
              <Card className="border border-line bg-surface shadow-card overflow-hidden flex flex-col justify-between h-96">
                <div className="p-3 bg-surface-muted border-b border-line flex justify-between items-center">
                  <span className="font-bold text-ink uppercase text-[11px] tracking-wider">Password Reset Requests ({passwordRequests.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0 text-[11px]">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-surface-muted border-b border-line uppercase font-bold text-[11px] tracking-wider text-ink-secondary">
                        <th className="p-2.5">User</th>
                        <th className="p-2.5">Organization</th>
                        <th className="p-2.5">Requested At</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {loadingRequests ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-ink-muted italic">Querying reset requests...</td>
                        </tr>
                      ) : passwordRequests.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-ink-muted italic font-sans">No pending password reset requests.</td>
                        </tr>
                      ) : (
                        passwordRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-surface-muted/60">
                            <td className="p-2.5">
                              <div>
                                <span className="font-bold text-ink block text-[11px]">{req.requester_name}</span>
                                <span className="text-ink-muted block text-[11px]">{req.requester_email}</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-ink-secondary font-semibold">{req.organization}</td>
                            <td className="p-2.5 text-ink-secondary">
                              {new Date(req.requested_at).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-6 bg-ink hover:bg-zinc-800 text-white text-[11px] uppercase font-bold px-2 rounded cursor-pointer"
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
              <Card className="border border-line bg-surface shadow-card overflow-hidden flex flex-col justify-between h-96">
                <div className="p-3 bg-surface-muted border-b border-line flex justify-between items-center">
                  <span className="font-bold text-ink uppercase text-[11px] tracking-wider">Ticket Reopen Requests ({reopenRequests.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0 text-[11px]">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-surface-muted border-b border-line uppercase font-bold text-[11px] tracking-wider text-ink-secondary">
                        <th className="p-2.5">Ticket</th>
                        <th className="p-2.5">Requester</th>
                        <th className="p-2.5">Reason</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {loadingReopens ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-ink-muted italic">Querying reopen requests...</td>
                        </tr>
                      ) : reopenRequests.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-ink-muted italic font-sans">No pending ticket reopen requests.</td>
                        </tr>
                      ) : (
                        reopenRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-surface-muted/60">
                            <td className="p-2.5">
                              <div>
                                <span className="font-bold text-ink block text-[11px]">{req.ticket_number}</span>
                                <span className="text-ink-muted block text-[11px] truncate max-w-[120px]" title={req.ticket_title}>{req.ticket_title}</span>
                              </div>
                            </td>
                            <td className="p-2.5 text-ink-secondary font-semibold">{req.requester_name}</td>
                            <td className="p-2.5 text-ink-secondary">
                              <span className="truncate max-w-[120px] block" title={req.reason}>{req.reason}</span>
                            </td>
                            <td className="p-2.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-6 bg-ink hover:bg-zinc-800 text-white text-[11px] uppercase font-bold px-2 rounded cursor-pointer"
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
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">2. Hours, Effort & Billing Insight Center</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              
              <Card className="p-4 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">Total Estimated Hours</span>
                <span className="text-lg font-bold text-ink block mt-1">{dashboardData.financials.totalEstHrs}h</span>
              </Card>
              
              <Card className="p-4 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">Logged Hours (Total)</span>
                <span className="text-lg font-bold text-ink block mt-1">{dashboardData.financials.totalActHrs}h</span>
              </Card>

              <Card className="p-4 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">Approved Hours</span>
                <span className="text-lg font-bold text-ink block mt-1">{dashboardData.financials.approvedActHrs}h</span>
              </Card>
              
              <Card className="p-4 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">Billable Hours Logged</span>
                <span className="text-lg font-bold text-green-700 block mt-1">{dashboardData.financials.billableHrs}h</span>
              </Card>

              <Card className="p-4 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">Non-Billable Hours Logged</span>
                <span className="text-lg font-bold text-ink block mt-1">{dashboardData.financials.nonBillableHrs}h</span>
              </Card>

              <Card className="p-4 bg-surface border border-line shadow-card text-center">
                <span className="font-bold text-ink-muted uppercase text-[11px] block">Est vs Act Hours Variance</span>
                <span className={`text-lg font-bold block mt-1 ${dashboardData.financials.variance > 0 ? 'text-critical' : 'text-green-700'}`}>
                  {dashboardData.financials.variance >= 0 ? `+${dashboardData.financials.variance}` : dashboardData.financials.variance}h
                </span>
              </Card>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3">
              <Card className="p-4 bg-surface border border-line shadow-card flex flex-col justify-between">
                <span className="font-bold text-[11px] text-ink-secondary uppercase tracking-wider block mb-3 pb-1 border-b border-line">Estimated vs Actual Hours Comparison</span>
                <div className="h-48 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Estimated', Hours: dashboardData.financials.totalEstHrs },
                      { name: 'Logged (Total)', Hours: dashboardData.financials.totalActHrs },
                      { name: 'Approved', Hours: dashboardData.financials.approvedActHrs }
                    ]} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" interval={0} stroke="#71717a" fontSize={8} />
                      <YAxis stroke="#71717a" fontSize={8} />
                      <RechartsTooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="Hours" fill={COLORS.blue} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4 bg-surface border border-line shadow-card flex flex-col justify-between">
                <span className="font-bold text-[11px] text-ink-secondary uppercase tracking-wider block mb-3 pb-1 border-b border-line">FTE Billing Split (Billable vs Non-Billable)</span>
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
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">3. SAP Module Performance Center</span>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Module counts table */}
              <Card className="col-span-2 border border-line bg-surface shadow-card overflow-hidden">
                <div className="p-3 bg-surface-muted border-b border-line">
                  <span className="font-bold text-ink uppercase text-[11px] tracking-wider">Module Ticket and Load Ratios</span>
                </div>
                <div className="p-0">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-surface-subtle text-ink-secondary font-bold uppercase text-[11px] border-b border-line">
                      <tr>
                        <th className="py-2.5 px-4 font-bold">SAP Module</th>
                        <th className="py-2.5 px-4 font-bold text-center">Active Backlog Count</th>
                        <th className="py-2.5 px-4 font-bold text-center">FTE Hours Consumed</th>
                        <th className="py-2.5 px-4 font-bold text-center">Critical Issues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {SAP_MODULES_LIST.map(m => {
                        const mTickets = filteredDashboardTickets.filter(t => t.sapModule === m);
                        const mHours = mTickets.flatMap(t => t.actualHoursLogs || []).filter(ah => ah.approvalStatus?.toLowerCase() === 'approved').reduce((sum, ah) => sum + ah.actualHours, 0);
                        const mCritical = mTickets.filter(t => t.priority === 'Critical' && t.status !== 'Closed' && t.status !== 'Resolved').length;

                        return (
                          <tr key={m} className="hover:bg-surface-muted/60">
                            <td className="py-2.5 px-4 font-bold text-ink">{m}</td>
                            <td className="py-2.5 px-4 text-center font-semibold">{mTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length}</td>
                            <td className="py-2.5 px-4 text-center font-bold">{mHours}h</td>
                            <td className={`py-2.5 px-4 text-center font-bold ${mCritical > 0 ? 'text-critical' : 'text-ink-muted'}`}>{mCritical}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Module share chart */}
              <Card className="p-4 bg-surface border border-line shadow-card flex flex-col justify-between">
                <span className="font-bold text-[11px] text-ink-secondary uppercase tracking-wider block mb-3 pb-1 border-b border-line">Live SAP Modules Backlog distribution</span>
                <div className="h-64 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartsData.moduleData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" interval={0} stroke="#71717a" fontSize={7} />
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
            <Card className="col-span-2 border border-line bg-surface shadow-card rounded-lg">
              <CardHeader className="bg-surface-muted border-b border-line py-3.5 px-4">
                <CardTitle className="text-xs font-bold text-ink uppercase tracking-wider">Recent Activity & Audit Timeline Feed</CardTitle>
                <CardDescription className="text-[11px] text-ink-secondary mt-0.5">Real-time log of ticketing updates, lead allocations, and hours approval changes.</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="relative border-l border-line pl-4 ml-2 space-y-5">
                  {auditTimelineFeed.map((item, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-zinc-400 border border-white" />
                      <div className="text-[11px]">
                        <span className="font-bold text-ink">{item.actor}</span>
                        <span className="text-ink-secondary font-bold mx-1">({item.role})</span>
                        <span className="text-ink-secondary">{item.action}</span>
                        <span className="text-ink-muted font-bold ml-1">[{item.ticketId}]</span>
                        <span className="text-ink-muted block text-[11px] mt-0.5">{item.time}</span>
                      </div>
                    </div>
                  ))}
                  {auditTimelineFeed.length === 0 && (
                    <div className="text-center py-10 text-ink-muted italic">No recent timeline logs recorded.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SECTION 11: REOPEN & ESCALATION INSIGHT CENTER */}
            <Card className="border border-line bg-surface shadow-card rounded-lg flex flex-col justify-between">
              <div>
                <CardHeader className="bg-surface-muted border-b border-line py-3.5 px-4">
                  <CardTitle className="text-xs font-bold text-ink uppercase tracking-wider">Reopen & Escalation Control Panel</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-1.5 border-b border-line">
                      <span className="font-semibold text-ink-secondary">Total Reopened Tickets:</span>
                      <Badge className="bg-red-100 text-red-800 font-bold text-[11px] border-none">{dashboardData.executive.reopenedTickets}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-line">
                      <span className="font-semibold text-ink-secondary">Reopen rate:</span>
                      <span className="font-black text-ink">
                        {dashboardData.executive.totalTicketsRaised > 0 
                          ? ((dashboardData.executive.reopenedTickets / dashboardData.executive.totalTicketsRaised) * 100).toFixed(1) 
                          : '0'}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-line">
                      <span className="font-semibold text-ink-secondary">OSS Raised Tickets:</span>
                      <Badge className="bg-surface-subtle text-ink font-bold text-[11px] border-none">{dashboardData.executive.raisedToSap}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="font-semibold text-ink-secondary">Audit Unlock Requests:</span>
                      <Badge className="bg-surface-subtle text-ink font-bold text-[11px] border-none">{dashboardData.executive.resourceChangePending}</Badge>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

          </div>

          {/* SECTION 4: WORKFLOW MANAGEMENT CONSOLE */}
          <div className="space-y-4 pt-4 border-t border-line">
            <span className="text-[11px] font-bold text-ink uppercase tracking-widest block border-b border-line pb-1">
              4. Operational Workflow Management Console
            </span>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-[11px]">
              
              {/* Widget 1: Waiting Assignment */}
              <Card className="bg-surface border border-line shadow-card rounded-lg p-4 flex flex-col h-[380px]">
                <div className="flex justify-between items-center border-b border-line pb-2 mb-3">
                  <span className="font-extrabold text-ink uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <Users size={12} className="text-ink-secondary" />
                    Waiting Assignment ({waitingAssignmentTickets.length})
                  </span>
                  <Badge className="bg-surface-subtle text-ink text-[11px] font-bold px-1.5 py-0.5">NEW / UNASSIGNED</Badge>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {waitingAssignmentTickets.map((t) => (
                    <div key={t.id} className="p-2.5 bg-surface-muted border border-line rounded-lg hover:border-line-strong transition flex flex-col justify-between gap-1.5">
                      <div className="flex justify-between items-start">
                        <Link href={`/manager/tickets/${t.id}`} className="font-extrabold text-ink hover:underline text-[11px] uppercase">
                          {t.ticketNumber}
                        </Link>
                        <span className={`text-[11px] font-extrabold uppercase px-1 py-0.5 rounded ${
                          t.priority === 'Critical' ? 'bg-critical-soft text-critical-strong' : 'bg-surface-subtle text-ink-secondary'
                        }`}>
                          {t.priority}
                        </span>
                      </div>
                      <span className="text-ink-secondary font-semibold line-clamp-1">{t.title}</span>
                      <div className="flex justify-between items-center text-[11px] text-ink-muted">
                        <span>Org: {t.organization}</span>
                        <span className="text-ink-secondary">{t.sapModule}</span>
                      </div>
                    </div>
                  ))}
                  {waitingAssignmentTickets.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-ink-muted italic text-center py-12">
                      <CheckCircle size={24} className="text-success mb-2" />
                      All tickets assigned successfully.
                    </div>
                  )}
                </div>
              </Card>

              {/* Widget 2: Approvals Queue */}
              <Card className="bg-surface border border-line shadow-card rounded-lg p-4 flex flex-col h-[380px]">
                <div className="flex justify-between items-center border-b border-line pb-2 mb-3">
                  <span className="font-extrabold text-ink uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <Timer size={12} className="text-ink-secondary" />
                    Approvals & Governance ({approvalsQueueList.length})
                  </span>
                  <Badge className="bg-amber-100 text-amber-800 text-[11px] font-bold px-1.5 py-0.5">PENDING SIGN-OFF</Badge>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {approvalsQueueList.map((app, idx) => (
                    <div key={idx} className="p-2.5 bg-surface-muted border border-line rounded-lg hover:border-line-strong transition flex flex-col justify-between gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-[11px] uppercase tracking-wider text-ink-secondary">{app.type}</span>
                        <span className="font-bold text-ink text-[11px]">{app.ticketNumber}</span>
                      </div>
                      <span className="text-ink-secondary font-semibold line-clamp-1">{app.title}</span>
                      <p className="text-[11px] text-ink-secondary bg-surface-subtle/50 p-1 rounded break-all">{app.detail}</p>
                      <div className="flex justify-end gap-1.5 pt-1">
                        <Button
                          onClick={() => setSelectedTab(app.actionTab)}
                          size="sm"
                          className="h-5 text-[11px] uppercase font-bold bg-ink hover:bg-zinc-800 text-white rounded px-2"
                        >
                          Resolve Approval
                        </Button>
                      </div>
                    </div>
                  ))}
                  {approvalsQueueList.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-ink-muted italic text-center py-12">
                      <CheckCircle size={24} className="text-success mb-2" />
                      No approvals pending decision.
                    </div>
                  )}
                </div>
              </Card>

              {/* Widget 3: Escalations & SLA Breaches */}
              <Card className="bg-surface border border-line shadow-card rounded-lg p-4 flex flex-col h-[380px]">
                <div className="flex justify-between items-center border-b border-line pb-2 mb-3">
                  <span className="font-extrabold text-ink uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={12} className="text-ink-secondary" />
                    Escalations & SLA Breaches ({escalationsAndBreachesList.length})
                  </span>
                  <Badge className="bg-red-100 text-red-800 text-[11px] font-bold px-1.5 py-0.5">EXPOSURE WARNING</Badge>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {escalationsAndBreachesList.map((esc, idx) => (
                    <div key={idx} className="p-2.5 bg-critical-soft/10 border border-red-100 rounded-lg hover:border-critical-border transition flex flex-col justify-between gap-1.5">
                      <div className="flex justify-between items-start">
                        <span className={`text-[11px] font-extrabold uppercase px-1 py-0.5 rounded border ${esc.badgeColor}`}>
                          {esc.type}
                        </span>
                        <span className="font-bold text-ink text-[11px]">{esc.ticketNumber}</span>
                      </div>
                      <span className="text-ink font-semibold line-clamp-1">{esc.title}</span>
                      <div className="flex justify-between items-center text-[11px] text-ink-muted">
                        <span className="text-critical font-bold">{esc.detail}</span>
                        <span className="text-ink-secondary font-bold">Priority: {esc.priority}</span>
                      </div>
                    </div>
                  ))}
                  {escalationsAndBreachesList.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-ink-muted italic text-center py-12">
                      <CheckCircle size={24} className="text-success mb-2" />
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
      <Card className="bg-surface border border-line rounded-lg shadow-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans text-xs">
          <div>
            <h4 className="font-bold text-ink uppercase text-[11px] tracking-wider">Download Command Center Snapshots</h4>
            <p className="text-ink-secondary text-[11px] mt-0.5">Export current metric structures, active allocations audit sheet, or SLA health summaries.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="outline" className="text-[11px] font-bold uppercase py-1.5 flex items-center gap-1.5 border border-line-strong hover:bg-surface-muted text-ink-secondary cursor-pointer">
              <Download size={12} />
              Delivery Audit (.CSV)
            </Button>
            <Button variant="outline" className="text-[11px] font-bold uppercase py-1.5 flex items-center gap-1.5 border border-line-strong hover:bg-surface-muted text-ink-secondary cursor-pointer">
              <Download size={12} />
              SLA Compliance (.CSV)
            </Button>
          </div>
        </div>
      </Card>

      {/* ── WORKFLOW MODALS ── */}

      <Dialog open={closureDialog.isOpen} onOpenChange={(open) => !open && setClosureDialog(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="max-w-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-ink">Verify & Approve Closure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {activeTicketForClosure && activeRequestForClosure && (() => {
              const funcEff = (activeTicketForClosure.consultantEfforts || []).filter(e => e.consultantType === 'Functional' && !e.isDeleted);
              const techEff = (activeTicketForClosure.consultantEfforts || []).filter(e => e.consultantType === 'Technical' && !e.isDeleted);

              const estFunc = funcEff.reduce((sum, e) => sum + e.estimatedHours, 0);
              const estTech = techEff.reduce((sum, e) => sum + e.estimatedHours, 0);
              const estTotal = estFunc + estTech;

              // Compute request-specific actual hours
              const requestLogs = (activeTicketForClosure.actualHoursLogs || []).filter((ah: any) => ah.closureRequestId === activeRequestForClosure.id);
              const hasLogs = requestLogs.length > 0;

              const actFunc = hasLogs
                ? requestLogs.filter((ah: any) => ah.consultantType === 'Functional').reduce((sum, ah) => sum + ah.actualHours, 0)
                : activeRequestForClosure.functionalActualHours;
              const actTech = hasLogs
                ? requestLogs.filter((ah: any) => ah.consultantType === 'Technical').reduce((sum, ah) => sum + ah.actualHours, 0)
                : activeRequestForClosure.technicalActualHours;
              const actTotal = hasLogs ? (actFunc + actTech) : activeRequestForClosure.totalActualHours;

              const varFunc = actFunc - estFunc;
              const varTech = actTech - estTech;
              const varTotal = actTotal - estTotal;

              return (
                <div className="bg-surface-muted border border-line rounded p-3.5 space-y-3 text-[11px]">
                  <div className="grid grid-cols-2 gap-2 border-b border-line pb-2">
                    <div>
                      <span className="text-ink-muted block uppercase font-bold text-[11px]">Ticket Number</span>
                      <span className="font-bold text-ink">{activeTicketForClosure.ticketNumber}</span>
                    </div>
                    <div>
                      <span className="text-ink-muted block uppercase font-bold text-[11px]">Customer Name</span>
                      <span className="font-bold text-ink">{activeTicketForClosure.organization}</span>
                    </div>
                    <div>
                      <span className="text-ink-muted block uppercase font-bold text-[11px]">Submitted By</span>
                      <span className="font-bold text-ink">{activeRequestForClosure.requestedBy}</span>
                    </div>
                    <div>
                      <span className="text-ink-muted block uppercase font-bold text-[11px]">Submission Date</span>
                      <span className="font-bold text-ink">
                        {activeRequestForClosure.createdAt ? new Date(activeRequestForClosure.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pb-1">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold border border-line bg-surface-subtle text-ink-secondary">
                      FUNC: {actFunc}h Logged / {estFunc}h Quoted
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold border border-line bg-surface-subtle text-ink-secondary">
                      TECH: {actTech}h Logged / {estTech}h Quoted
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-ink-muted block uppercase font-bold text-[11px]">Per-Consultant Efforts Breakdown</span>
                    <div className="border border-line rounded bg-surface overflow-hidden">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead className="bg-surface-muted border-b border-line font-bold uppercase text-ink-secondary">
                          <tr>
                            <th className="py-1 px-2">Consultant</th>
                            <th className="py-1 px-2">Type</th>
                            <th className="py-1 px-2 text-right">Logged Hours</th>
                            <th className="py-1 px-2 text-right">Quoted Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {(() => {
                            const efforts = (activeTicketForClosure.consultantEfforts || []).filter(e => !e.isDeleted).map(e => {
                              const actLog = requestLogs.find((ah: any) => ah.consultantId === e.consultantId);
                              return {
                                ...e,
                                actualHours: actLog ? actLog.actualHours : 0
                              };
                            });
                            return efforts.map((e, idx) => (
                              <tr key={e.id || idx}>
                                <td className="py-1 px-2 font-semibold text-ink">
                                  {e.consultantName}{e.isPrimary ? ' (Lead)' : ''}
                                </td>
                                <td className="py-1 px-2 text-ink-secondary">{e.consultantType}</td>
                                <td className="py-1 px-2 text-right font-bold text-ink">{e.actualHours}h</td>
                                <td className="py-1 px-2 text-right text-ink-secondary">{e.estimatedHours}h</td>
                              </tr>
                            ));
                          })()}
                          <tr className="bg-surface-subtle font-extrabold border-t border-line">
                            <td className="py-1 px-2 uppercase text-[11px]" colSpan={2}>Total</td>
                            <td className="py-1 px-2 text-right">{actTotal}h</td>
                            <td className="py-1 px-2 text-right">{estTotal}h</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-1 border-t border-line">
                    <div>
                      <span className="text-ink-muted block uppercase font-bold text-[11px]">Root Cause</span>
                      <p className="text-ink leading-normal">{activeRequestForClosure.rootCause || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-ink-muted block uppercase font-bold text-[11px]">Resolution Summary</span>
                      <p className="text-ink leading-normal whitespace-pre-line">{activeRequestForClosure.resolutionSummary || 'N/A'}</p>
                    </div>
                    {activeRequestForClosure.pendingItems && (
                      <div>
                        <span className="text-ink-muted block uppercase font-bold text-[11px]">Pending Items</span>
                        <p className="text-ink leading-normal">{activeRequestForClosure.pendingItems}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}


            <div className="space-y-1">
              <Label className="text-[11px] uppercase font-bold text-ink-secondary">Closure Audit Comments & Feedback *</Label>
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
              className="text-[11px] uppercase font-bold h-8 cursor-pointer"
              onClick={() => setClosureDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              className="bg-ink hover:bg-zinc-800 text-white text-[11px] uppercase font-bold h-8 cursor-pointer"
              onClick={handleConfirmClosure}
            >
              Close Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Comments Dialog */}
      <Dialog open={rejectDialog.isOpen} onOpenChange={(open) => !open && setRejectDialog(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-critical">Provide Rejection Reason</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase font-bold text-ink-secondary">Audit Rejection comments *</Label>
              <Textarea
                required
                placeholder="Describe why this effort/closure/unlock request is being rejected or sent back for revision..."
                value={rejectDialog.reason}
                onChange={e => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full text-[11px] focus:outline-none min-h-[90px] border-critical-border focus:border-red-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-[11px] uppercase font-bold h-8 cursor-pointer"
              onClick={() => setRejectDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-650 hover:bg-red-700 text-white text-[11px] uppercase font-bold h-8 cursor-pointer"
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
