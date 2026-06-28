'use client';

import React, { useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { CustomerServiceHealth } from '../../../components/analytics/customer-service-health';
import { useAuth } from '../../../context/AuthContext';
import { getCustomerDashboardData, filterTicketsByScope, getSlaStatus, getTicketAgeDays } from '../../../utils/dashboardService';
import Link from 'next/link';
import { BrandedLogo } from '../../../components/ui/BrandedLogo';
import { BRAND_CONFIG } from '../../../config/branding';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Paperclip,
  MessageSquare,
  Hourglass,
  Flame,
  ArrowUpRight,
  FileText,
  Calendar,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Briefcase,
  UserCheck,
  ShieldAlert,
  Award,
  FileCheck,
  Activity,
  ArrowRight,
  FolderDot,
  Wrench,
  Gauge,
  Timer
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../../../components/ui/chart';
import { chartColors, priorityColors } from '../../../lib/chart-theme';
import { Skeleton } from '../../../components/ui/skeleton';
import { StatCard } from '../../../components/ui/stat-card';
import { EmptyState } from '../../../components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { RotateCcw } from 'lucide-react';

const SYSTEM_NOW = new Date('2026-06-07T08:00:00Z').getTime();

export default function CustomerDashboardPage() {
  const { tickets, contracts, loading } = useTickets();
  const { user } = useAuth();

  const customerCompany = user?.company || 'Apex Global Industries';

  // --- FILTERS & STATE ---
  const [filters, setFilters] = React.useState({
    period: 'This Month',
    dateFrom: '',
    dateTo: '',
    status: 'All',
    priority: 'All',
    module: 'All'
  });

  const baseCompanyTickets = useMemo(() => {
    return filterTicketsByScope(tickets, { type: 'customer', value: customerCompany });
  }, [tickets, customerCompany]);

  const distinctModules = useMemo(() => {
    const mods = baseCompanyTickets.map(t => t.sapModule).filter(Boolean);
    return Array.from(new Set(mods)).sort();
  }, [baseCompanyTickets]);

  const applyFilters = (ticketsList: typeof baseCompanyTickets, f: typeof filters) => {
    return ticketsList.filter(t => {
      // Date period filter
      const ticketDate = new Date(t.createdAt);
      let passDate = true;
      const now = new Date(SYSTEM_NOW);

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

      // Status filter
      if (f.status && f.status !== 'All') {
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

        const isEscalatedMatch = f.status === 'Escalated' && (t.escalationFlag || t.status === 'Raised to SAP');
        const isStatusMatch = f.status === simplifiedStatus;

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

      return true;
    });
  };

  const filteredTickets = useMemo(() => {
    return applyFilters(baseCompanyTickets, filters);
  }, [baseCompanyTickets, filters]);

  const companyTickets = filteredTickets;

  const dashboardData = useMemo(() => {
    return getCustomerDashboardData(customerCompany, filteredTickets, contracts);
  }, [customerCompany, filteredTickets, contracts]);

  const {
    openTickets,
    closedTickets,
    reopenedTickets: reopenedTicketsCount,
    escalatedTickets,
    avgTicketAgeDays,
    avgResolutionTimeHours,
    slaHealthy,
    slaWarning,
    slaBreached,
    unassignedTickets,
    onHoldTickets,
    raisedToSapTickets,
    customerActionPendingTickets,
    resolvedTickets,
    criticalTickets,
    remainingHours,
    usagePercentage
  } = dashboardData;

  const totalTickets = companyTickets.length;
  const inProgressTickets = companyTickets.filter(t => 
    t.status === 'In Progress' ||
    t.status === 'In Progress - Functional' ||
    t.status === 'In Progress - Technical' ||
    t.status === 'Awaiting Functional Submission' ||
    t.status === 'Awaiting Technical Submission'
  ).length;
  const technicalTickets = companyTickets.filter(t => t.functionalOrTechnical === 'Technical').length;
  const functionalTickets = companyTickets.filter(t => t.functionalOrTechnical === 'Functional' || !t.functionalOrTechnical).length;
  const totalQuotedHours = companyTickets.reduce((sum, t) => sum + (t.quotedHours || 0), 0);
  const totalConsumedHours = dashboardData.totalApprovedHoursUsed;
  const consumptionPercentage = totalQuotedHours > 0 ? (totalConsumedHours / totalQuotedHours) * 100 : 0;

  // Active Contract details for verification
  const activeContract = useMemo(() => {
    return contracts.find(c => 
      (user?.organizationId && c.customerId === user.organizationId && c.isActive) ||
      (c.organizationName === customerCompany && c.isActive)
    );
  }, [contracts, customerCompany, user?.organizationId]);

  const contractMetrics = useMemo(() => {
    if (!activeContract) return null;

    const startDate = new Date(activeContract.startDate);
    const endDate = new Date(activeContract.endDate);
    
    // Contract Duration in Days
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Expiry Status
    const today = new Date();
    let expiryStatus: 'Active' | 'Expiring Soon' | 'Expired' = 'Active';
    if (today > endDate) {
      expiryStatus = 'Expired';
    } else {
      const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30) {
        expiryStatus = 'Expiring Soon';
      }
    }

    return {
      startDate: activeContract.startDate,
      endDate: activeContract.endDate,
      durationDays,
      expiryStatus,
      totalHours: dashboardData.totalContractedHours,
      monthlyBudgetHours: dashboardData.monthlyAllocatedHours,
      totalUtilizedHours: dashboardData.totalApprovedHoursUsed,
      totalLoggedHours: dashboardData.totalLoggedHoursUsed,
      totalRemainingHours: dashboardData.remainingHours,
      currentMonthUtilizedHours: dashboardData.monthlyApprovedActualHoursUsed,
      currentMonthLoggedHours: dashboardData.monthlyLoggedHoursUsed,
      currentMonthRemainingHours: dashboardData.monthlyRemainingHours,
      usagePercentage: dashboardData.usagePercentage
    };
  }, [activeContract, dashboardData]);

  // --- SECTIONS DATA SOURCES ---

  // D. Action Required
  const actionRequiredList = companyTickets.filter(t =>
    (t.status === 'Waiting for Customer' || t.customerActionRequired) &&
    t.status !== 'Closed' && t.status !== 'Resolved'
  );

  // E. Critical / Alerts
  const alertTicketsList = companyTickets.filter(t =>
    t.priority === 'Critical' ||
    getSlaStatus(t) === 'Breached' ||
    t.raisedToSap ||
    t.status === 'Reopened'
  );

  // F. Recent Activity chronological feed
  type FeedType = 'comment' | 'attachment' | 'status' | 'escalation';
  const timelineActivityFeed = useMemo(() => {
    const feed: { id: string; type: FeedType; timestamp: string; message: string; detail: string; ticketId: string; ticketNumber: string }[] = [];

    // History rows store the event label in field_changed (old/new values are empty),
    // so map each label to a clean past-tense, role-neutral sentence with ticket_number.
    const describeHistory = (field: string, actor: string, num: string): { message: string; type: FeedType } | null => {
      switch (field) {
        case 'Closed': return { message: `${actor} closed ${num}`, type: 'status' };
        case 'Assigned':
        case 'Assigned Lead Consultant':
        case 'Resource Assigned': return { message: `${actor} updated the assignment on ${num}`, type: 'status' };
        case 'Hours Submitted':
        case 'Actual Hours Submitted': return { message: `${actor} logged work on ${num}`, type: 'status' };
        case 'Estimated Hours Quoted': return { message: `${actor} quoted estimated effort on ${num}`, type: 'status' };
        case 'Approval Requested': return { message: `${actor} requested approval on ${num}`, type: 'status' };
        case 'Closure Requested': return { message: `${actor} requested closure of ${num}`, type: 'status' };
        case 'Status':
        case 'Status Changed': return { message: `${actor} updated the status of ${num}`, type: 'status' };
        case 'Escalation Raised': return { message: `${num} was escalated by ${actor}`, type: 'escalation' };
        // 'Incident Created' / 'Ticket' / 'Comment Added' are excluded (registration / handled elsewhere).
        default: return null;
      }
    };

    companyTickets.forEach(t => {
      const num = t.ticketNumber || '—';

      // Comments — role-prefixed actor, past tense, ticket_number.
      (t.comments || []).forEach(c => {
        feed.push({
          id: `comment-${c.id}`,
          type: 'comment',
          timestamp: c.createdAt,
          message: `${c.authorName || 'A user'} (${c.authorRole || 'Customer'}) commented on ${num}`,
          detail: (c.content || '').trim(),
          ticketId: t.id, ticketNumber: num
        });
      });

      // Attachments
      (t.attachments || []).forEach(a => {
        feed.push({
          id: `attachment-${a.id}`,
          type: 'attachment',
          timestamp: a.createdAt,
          message: `${a.uploadedBy || 'A user'} attached a file to ${num}`,
          detail: `${a.fileName} · ${(a.fileSize / 1024).toFixed(0)} KB`,
          ticketId: t.id, ticketNumber: num
        });
      });

      // Status transitions & escalations (mapped from the event label)
      (t.history || []).forEach(h => {
        const described = describeHistory(h.fieldChanged || '', h.changedBy || 'System', num);
        if (!described) return;
        feed.push({
          id: `hist-${h.id}`,
          type: described.type,
          timestamp: h.createdAt,
          message: described.message,
          detail: '',
          ticketId: t.id, ticketNumber: num
        });
      });
    });

    // Latest 15 operational events (creations are excluded — they are registration
    // rows, not activity). Underlying data is untouched.
    return feed
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);
  }, [companyTickets]);

  // Group the feed by calendar day for subtle date separators.
  const feedByDay = useMemo(() => {
    const dayLabel = (d: Date) => {
      const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
      const diff = Math.round((startOf(new Date(SYSTEM_NOW)) - startOf(d)) / 86400000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    const groups: { label: string; items: typeof timelineActivityFeed }[] = [];
    const byKey = new Map<string, { label: string; items: typeof timelineActivityFeed }>();
    timelineActivityFeed.forEach(item => {
      const d = new Date(item.timestamp);
      const key = d.toDateString();
      if (!byKey.has(key)) {
        const g = { label: dayLabel(d), items: [] as typeof timelineActivityFeed };
        byKey.set(key, g);
        groups.push(g);
      }
      byKey.get(key)!.items.push(item);
    });
    return groups;
  }, [timelineActivityFeed]);

  // Relative Time Helper
  const formatTimeAgo = (dateStr: string) => {
    const now = Date.now();
    const diffMs = now - new Date(dateStr).getTime();
    if (diffMs < 0) return 'Just now';
    const mins = Math.floor(diffMs / 65000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // --- CHART CALCULATIONS ---

  // 1. Status distribution
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    companyTickets.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [companyTickets]);

  // 2. Ticket Type distribution
  const typeChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    companyTickets.forEach(t => {
      const type = t.ticketType || 'Incident';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [companyTickets]);

  // 3. Module-wise Ticket Count
  const moduleChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    companyTickets.forEach(t => {
      const mods = t.sapModules && t.sapModules.length > 0 ? t.sapModules : [t.sapModule || 'FICO'];
      mods.forEach((m: string) => {
        counts[m] = (counts[m] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [companyTickets]);

  // 4. Priority-wise Ticket Count
  const priorityChartData = useMemo(() => {
    const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    companyTickets.forEach(t => {
      counts[t.priority] = (counts[t.priority] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [companyTickets]);

  // ── TREND INTERVALS FOR DYNAMIC PERIODS ──
  const trendIntervals = useMemo(() => {
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

    const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const intervals: { name: string; start: Date; end: Date }[] = [];

    if (durationDays <= 31) {
      // Daily intervals
      const curr = new Date(start);
      while (curr <= end) {
        const s = new Date(curr);
        s.setHours(0,0,0,0);
        const e = new Date(curr);
        e.setHours(23,59,59,999);
        intervals.push({
          name: curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          start: s,
          end: e
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
        intervals.push({
          name: `Wk ${wkIdx++}`,
          start: s,
          end: e
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
        intervals.push({
          name: `${monthsNames[curr.getMonth()]} ${curr.getFullYear().toString().slice(-2)}`,
          start: s,
          end: e
        });
        curr.setMonth(curr.getMonth() + 1);
      }
    }
    return intervals;
  }, [filters]);

  // 5. Monthly Ticket Trend (Last 6 Months)
  const monthlyTrendData = useMemo(() => {
    return trendIntervals.map(interval => {
      let ticketsCount = 0;
      let resolvedCount = 0;

      companyTickets.forEach(t => {
        const date = new Date(t.createdAt);
        if (date >= interval.start && date <= interval.end) {
          ticketsCount++;
          if (t.status === 'Resolved' || t.status === 'Closed') {
            resolvedCount++;
          }
        }
      });

      return {
        month: interval.name,
        Tickets: ticketsCount,
        Resolved: resolvedCount
      };
    });
  }, [companyTickets, trendIntervals]);

  // 6. SLA Status Chart for Incident tickets only
  const slaChartData = useMemo(() => {
    return [
      { name: 'SLA Healthy', value: slaHealthy, fill: chartColors.semantic.success },
      { name: 'SLA Warning', value: slaWarning, fill: chartColors.semantic.warning },
      { name: 'SLA Breached', value: slaBreached, fill: chartColors.semantic.danger }
    ].filter(item => item.value > 0);
  }, [slaHealthy, slaWarning, slaBreached]);

  // 7. Technical vs Functional Tickets
  const classificationChartData = useMemo(() => {
    return [
      { name: 'Functional', value: functionalTickets, fill: '#18181b' },
      { name: 'Technical', value: technicalTickets, fill: '#71717a' }
    ].filter(item => item.value > 0);
  }, [functionalTickets, technicalTickets]);

  // 8. Open vs Closed Trend (Accumulated over time)
  const openClosedTrendData = useMemo(() => {
    return trendIntervals.map(interval => {
      let openCount = 0;
      let closedCount = 0;

      companyTickets.forEach(t => {
        const date = new Date(t.createdAt);
        if (date >= interval.start && date <= interval.end) {
          if (t.status === 'Closed' || t.status === 'Resolved') {
            closedCount++;
          } else {
            openCount++;
          }
        }
      });

      return {
        month: interval.name,
        Open: openCount,
        Closed: closedCount
      };
    });
  }, [companyTickets, trendIntervals]);

  const COLORS = chartColors.categorical;
  const PRIORITY_COLORS = priorityColors;

  const chartConfig = {
    volume: {
      label: 'Tickets count',
      color: '#18181b'
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        {/* Page Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-line pb-5 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-zinc-200" />
            <Skeleton className="h-4 w-96 bg-surface-subtle" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 bg-zinc-200 rounded-lg" />
            <Skeleton className="h-10 w-36 bg-zinc-250 rounded-lg" />
          </div>
        </div>

        {/* Brand Banner Skeleton */}
        <div className="border border-line rounded-lg p-5 bg-surface shadow-card flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div className="flex gap-4 items-center">
            <Skeleton className="h-12 w-12 rounded-full bg-zinc-200" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48 bg-zinc-200" />
              <Skeleton className="h-3 w-80 bg-surface-subtle" />
            </div>
          </div>
          <Skeleton className="h-8 w-32 bg-zinc-200 rounded-lg" />
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

        {/* Two Column Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-line rounded-lg p-6 bg-surface space-y-4 shadow-card">
            <Skeleton className="h-6 w-48 bg-zinc-200" />
            <div className="space-y-3.5">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-line pb-3 last:border-b-0 animate-pulse">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-1/3 bg-zinc-200" />
                    <Skeleton className="h-3 w-1/2 bg-surface-subtle" />
                  </div>
                  <Skeleton className="h-6 w-16 bg-surface-subtle rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="border border-line rounded-lg p-6 bg-surface space-y-4 shadow-card">
            <Skeleton className="h-6 w-48 bg-zinc-200" />
            <Skeleton className="h-56 w-full bg-surface-subtle rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      
      {/* A. Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-line pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink uppercase flex items-center gap-2">
            <span>{customerCompany}</span>
            <Badge variant="outline" className="text-[11px] font-bold border-line-strong tracking-wider text-ink-secondary bg-surface-muted py-0.5">
              CUSTOMER PORTAL
            </Badge>
          </h1>
          <p className="text-xs text-ink-secondary font-medium mt-1">
            Welcome back! Here is your service performance overview, SLA compliance indicators, and accounting summary for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/customer/create-ticket"
            className="h-9 px-4 inline-flex items-center justify-center bg-ink hover:bg-ink text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-card"
          >
            Create Ticket
          </Link>
          <Link
            href="/customer/tickets"
            className="h-9 px-4 inline-flex items-center justify-center bg-surface border border-line hover:border-line-strong text-ink text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all"
          >
            View Tickets
          </Link>
          <Link
            href="/customer/reports"
            className="h-9 px-4 inline-flex items-center justify-center bg-surface border border-line hover:border-ink text-ink text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all"
          >
            Export Report
          </Link>
        </div>
      </div>

      {/* ── CUSTOMER DYNAMIC FILTER BAR ── */}
      <Card className="border border-line bg-surface p-4 shadow-card mb-6 rounded-lg">
        <div className="flex flex-wrap items-end gap-3 md:flex-nowrap">
          {/* 1. PERIOD */}
          <div className="flex flex-col flex-1 min-w-[260px] max-w-[320px]">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Period</span>
            <div className="flex bg-surface-subtle p-0.5 rounded-lg border border-line h-9">
              {(['This Month', 'This Quarter', 'This Year', 'Custom'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, period: p }))}
                  className={`flex-1 h-full flex items-center justify-center text-[11px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                    filters.period === p
                      ? 'bg-surface text-ink shadow-card border border-line/50'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {p.replace('This ', '')}
                </button>
              ))}
            </div>
          </div>

          {/* 2. STATUS */}
          <div className="flex flex-col flex-1 min-w-[140px]">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Status</span>
            <Select
              value={filters.status}
              onValueChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
            >
              <SelectTrigger className="h-9 w-full bg-surface text-ink font-sans text-xs border border-line shadow-card focus:ring-brand/30">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="font-sans">
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Pending Closure">Pending Closure</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Reopened">Reopened</SelectItem>
                <SelectItem value="Escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3. PRIORITY */}
          <div className="flex flex-col flex-1 min-w-[140px]">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Priority</span>
            <Select
              value={filters.priority}
              onValueChange={(val) => setFilters(prev => ({ ...prev, priority: val }))}
            >
              <SelectTrigger className="h-9 w-full bg-surface text-ink font-sans text-xs border border-line shadow-card focus:ring-brand/30">
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
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">SAP Module</span>
            <Select
              value={filters.module}
              onValueChange={(val) => setFilters(prev => ({ ...prev, module: val }))}
            >
              <SelectTrigger className="h-9 w-full bg-surface text-ink font-sans text-xs border border-line shadow-card focus:ring-brand/30">
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

          {/* 5. RESET BUTTON */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({
              period: 'This Month',
              dateFrom: '',
              dateTo: '',
              status: 'All',
              priority: 'All',
              module: 'All'
            })}
            className="h-9 gap-1.5 ml-auto text-xs font-semibold hover:bg-surface-subtle hover:text-ink border border-line shadow-card"
          >
            <RotateCcw size={14} />
            Reset
          </Button>
        </div>

        {/* Row 2: Custom Date Picker Inputs */}
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

      {companyTickets.length === 0 ? (
        <Card className="border-line shadow-card bg-surface overflow-hidden p-8 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
          <div className="h-16 w-16 rounded-full bg-surface-muted border border-line flex items-center justify-center">
            <BrandedLogo width={32} height={32} iconOnly={true} className="opacity-45" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
              No Ticket Records Found
            </h3>
            <p className="text-xs text-ink-secondary font-medium leading-relaxed">
              Your organization does not have any active or resolved SAP support tickets. You can raise a new ticket to request consultant assistance with functional or technical modules.
            </p>
          </div>
          <div className="flex justify-center">
            <Link
              href="/customer/create-ticket"
              className="h-9 px-4 inline-flex items-center justify-center bg-ink hover:bg-ink text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-card"
            >
              Create First Ticket
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* B. KPI Summary Cards — shared StatCard, tone-coded, grouped */}
          <div className="space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Executive Dashboard KPI Console</h2>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Volume &amp; Status</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <StatCard dense label="Total Tickets" value={totalTickets} icon={FileText} tone="neutral" sub="Total scope size" />
                <StatCard dense label="Open" value={openTickets} icon={Timer} tone="brand" sub="Unresolved backlog" />
                <StatCard dense label="Unassigned" value={unassignedTickets} icon={Hourglass} tone="warning" sub="Awaiting resource" />
                <StatCard dense label="In Progress" value={inProgressTickets} icon={Activity} tone="info" sub="Active resolution" />
                <StatCard dense label="Reopened" value={reopenedTicketsCount} icon={AlertTriangle} tone="critical" sub="Rework loop count" />
                <StatCard dense label="Resolved" value={resolvedTickets} icon={CheckCircle2} tone="success" sub="Awaiting closure" />
                <StatCard dense label="Closed" value={closedTickets} icon={FileCheck} tone="success" sub="Verified archives" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Scope &amp; Action</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard dense label="Technical Scope" value={technicalTickets} icon={Wrench} tone="neutral" sub="ABAP / BASIS / CPI" />
                <StatCard dense label="Functional Scope" value={functionalTickets} icon={FolderDot} tone="neutral" sub="FICO / MM / SD / PP" />
                <StatCard dense label="On Hold" value={onHoldTickets} icon={Clock} tone="warning" sub="Paused waiting updates" />
                <StatCard dense label="Raised to SAP" value={raisedToSapTickets} icon={ShieldAlert} tone="critical" sub="Vendor support scope" />
                <StatCard dense label="Customer Action" value={customerActionPendingTickets} icon={UserCheck} tone="warning" sub="Awaiting your approval" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Priority, SLA &amp; Performance</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard dense label="Critical P1" value={criticalTickets} icon={Flame} tone="critical" sub="Severe blocker incidents" />
                <StatCard dense label="SLA Healthy" value={slaHealthy} icon={CheckCircle2} tone="success" sub="Incidents on schedule" />
                <StatCard dense label="SLA Warnings" value={slaWarning} icon={Hourglass} tone="warning" sub="Warning threshold limits" />
                <StatCard dense label="SLA Breached" value={slaBreached} icon={AlertTriangle} tone="critical" sub="Escalated misses" />
                <StatCard dense label="Avg Ticket Age" value={`${avgTicketAgeDays.toFixed(1)}d`} icon={Calendar} tone="info" sub="Mean age active tickets" />
                <StatCard dense label="Avg MTTR" value={`${avgResolutionTimeHours.toFixed(1)}h`} icon={Timer} tone="info" sub="Mean time to resolution" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Effort</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <StatCard dense label="Quoted Efforts" value={`${totalQuotedHours.toFixed(1)}h`} icon={Briefcase} tone="neutral" sub="Accumulated quoted scope" />
                <StatCard dense label="Efforts (Logged / Approved)" value={`${dashboardData.totalLoggedHoursUsed.toFixed(1)}h / ${totalConsumedHours.toFixed(1)}h`} icon={Award} tone="neutral" sub="Total logged vs verified approved logs" />
              </div>
            </div>
          </div>

          {/* Curated service-health analytics (replaces the 8 numbered charts) */}
          <CustomerServiceHealth
            companyTickets={companyTickets}
            contractUsage={contractMetrics ? { used: contractMetrics.totalUtilizedHours, total: contractMetrics.totalHours } : null}
            monthlyQuota={contractMetrics ? contractMetrics.monthlyBudgetHours : null}
            loading={loading}
            now={Date.now()}
          />
          {/* D. Action Required Section */}
          <Card className="border-line shadow-card bg-surface overflow-hidden">
            <CardHeader className="pb-3 border-b border-line bg-amber-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Hourglass size={14} className="text-amber-700 animate-pulse" />
                  Action Required Workspace ({actionRequiredList.length})
                </CardTitle>
                <CardDescription className="text-[11px] text-amber-800/80 mt-0.5">
                  Tickets currently waiting on customer validation, ratings, responses, or information inputs.
                </CardDescription>
              </div>
              <Badge className="bg-amber-100 text-amber-850 border-amber-300 border text-[11px] font-bold tracking-wider">
                ATTENTION QUEUE
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader className="bg-surface-muted border-b border-line text-[11px]">
                    <TableRow>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4">Ticket ID</TableHead>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4">Subject</TableHead>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4">Priority</TableHead>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4">Status</TableHead>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4">Age</TableHead>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4">Last Updated</TableHead>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4 text-right">Action Required</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-[11px]">
                    {actionRequiredList.map((t: any) => {
                      const ageDays = getTicketAgeDays(t);
                      return (
                        <TableRow key={t.id} className="hover:bg-amber-50/20 bg-amber-50/10 border-b border-line transition-colors">
                          <TableCell className="py-2.5 px-4 font-bold text-ink">
                            <Link href={`/customer/tickets/${t.id}`} className="hover:underline text-ink">
                              {t.ticketNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="py-2.5 px-4 font-semibold text-ink max-w-[220px] truncate">{t.title}</TableCell>
                          <TableCell className="py-2.5 px-4">
                            <Badge variant="outline" className={`text-[11px] border-red-200 ${
                              t.priority === 'Critical' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {t.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 px-4">
                            <Badge variant="outline" className="bg-amber-100 text-amber-850 border-amber-250 text-[11px]">
                              {t.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-ink-secondary">{ageDays.toFixed(1)} days</TableCell>
                          <TableCell className="py-2.5 px-4 text-ink-secondary">{formatTimeAgo(t.updatedAt)}</TableCell>
                          <TableCell className="py-2.5 px-4 text-right font-bold text-amber-700">
                            Provide Info / Confirm Solution
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {actionRequiredList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-ink-muted italic">
                          Zero pending customer actions. Excellent!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* E. Critical / Alert Section */}
          <Card className="border-line shadow-card bg-surface overflow-hidden">
            <CardHeader className="pb-3 border-b border-line bg-red-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs uppercase tracking-wider text-red-900 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-red-700" />
                  Critical Escalations & Alerts ({alertTicketsList.length})
                </CardTitle>
                <CardDescription className="text-[11px] text-red-800/80 mt-0.5">
                  Monitors critical tickets, SLA breached cases, reopened items, and vendor SAP-raised items.
                </CardDescription>
              </div>
              <Badge className="bg-red-100 text-red-850 border-red-300 border text-[11px] font-bold tracking-wider">
                CRITICAL MONITOR
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader className="bg-surface-muted border-b border-line text-[11px]">
                    <TableRow>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4">Ticket Number</TableHead>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4">Subject</TableHead>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4">Priority</TableHead>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4">Status</TableHead>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4">Alert Reason</TableHead>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4">Age</TableHead>
                      <TableHead className="font-bold text-ink-secondary uppercase tracking-wider py-2.5 px-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-[11px]">
                    {alertTicketsList.map((t: any) => {
                      const alertReasons: string[] = [];
                      if (t.priority === 'Critical') alertReasons.push('Critical P1');
                      if (getSlaStatus(t) === 'Breached') alertReasons.push('SLA Breached');
                      if (t.raisedToSap) alertReasons.push('SAP Raised');
                      if (t.status === 'Reopened') alertReasons.push('Reopened');

                      return (
                        <TableRow key={t.id} className="hover:bg-red-50/10 border-b border-line transition-colors">
                          <TableCell className="py-2.5 px-4 font-bold text-red-700">
                            <Link href={`/customer/tickets/${t.id}`} className="hover:underline text-critical">
                              {t.ticketNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="py-2.5 px-4 font-semibold text-ink max-w-[200px] truncate">{t.title}</TableCell>
                          <TableCell className="py-2.5 px-4">
                            <Badge className="bg-red-600 text-white hover:bg-red-600 text-[11px] rounded">
                              {t.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 px-4">
                            <Badge variant="outline" className="border-red-200 text-critical bg-red-50 text-[11px]">
                              {t.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-critical font-bold">
                            {alertReasons.join(' & ')}
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-ink-secondary">{getTicketAgeDays(t).toFixed(1)} days</TableCell>
                          <TableCell className="py-2.5 px-4 text-right">
                            <Link href={`/customer/tickets/${t.id}`} className="text-ink font-bold hover:underline">
                              Open Desk &rarr;
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {alertTicketsList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-ink-muted italic">
                          Zero critical alerts active. System healthy!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* F. Recent Activity Section (Unified Vertical Timeline Layout) */}
          <Card className="border-line shadow-card bg-surface">
            <CardHeader className="pb-3 border-b border-line">
              <CardTitle className="text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Activity size={14} className="text-ink-secondary" />
                Support Operation Timeline Feed
              </CardTitle>
              <CardDescription className="text-[11px]">
                Comments, file attachments, status changes and escalations across your tickets.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-4 p-6">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-2.5 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : timelineActivityFeed.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No recent activity"
                  description="Comments, attachments, status changes and escalations on your tickets will appear here."
                  compact
                />
              ) : (
                <div className="divide-y divide-line">
                  {feedByDay.map(group => (
                    <div key={group.label}>
                      <div className="sticky top-0 z-[1] border-b border-line bg-surface-muted/70 px-6 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted backdrop-blur-sm">
                        {group.label}
                      </div>
                      <ul>
                        {group.items.map(item => {
                          const isLatest = item.id === timelineActivityFeed[0]?.id;
                          const isSeverity = item.type === 'escalation';
                          const Icon = item.type === 'comment' ? MessageSquare
                            : item.type === 'attachment' ? Paperclip
                              : item.type === 'escalation' ? ShieldAlert
                                : Activity;
                          return (
                            <li key={item.id} className="flex items-start gap-3 px-6 py-3 transition-colors hover:bg-surface-muted/40">
                              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                                isSeverity ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : isLatest ? 'border-brand bg-brand text-white'
                                    : 'border-line bg-surface-subtle text-ink-secondary'
                              }`}>
                                <Icon size={13} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-3">
                                  <p className="truncate text-xs font-semibold text-ink" title={item.message}>{item.message}</p>
                                  <span className="shrink-0 text-[11px] text-ink-muted" title={new Date(item.timestamp).toLocaleString()}>
                                    {formatTimeAgo(item.timestamp)}
                                  </span>
                                </div>
                                {item.detail && (
                                  <p className="mt-0.5 truncate text-[11px] text-ink-muted" title={item.detail}>{item.detail}</p>
                                )}
                                <Link href={`/customer/tickets/${item.ticketId}`} className="mt-1 inline-block text-[11px] font-bold text-brand hover:underline">
                                  {item.ticketNumber}
                                </Link>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                  <div className="px-6 py-2.5 text-center">
                    <Link href="/customer/tickets" className="text-[11px] font-semibold text-brand hover:underline">
                      View all activity →
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* G. Hours Summary Section */}
          <Card className="border-line shadow-card bg-surface overflow-hidden">
            <CardHeader className="pb-3 border-b border-line bg-surface-muted/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <Briefcase size={14} />
                  Quoted vs Consumed Accounting Hours Summary
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Aggregated support effort quotas, consumed burn rates, and active contract remaining pool metrics.
                </CardDescription>
              </div>
              <Badge className="bg-surface-subtle text-ink border-line text-[11px] font-bold tracking-wider">
                ACCUMULATED STATS
              </Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Main stats layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-ink">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Total Quoted Hours</span>
                  <div className="text-2xl font-black">{totalQuotedHours.toFixed(1)}h</div>
                  <span className="text-[11px] text-ink-muted block leading-tight">Total ticket-level quoted efforts</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Logged / Approved Consumed Hours</span>
                  <div className="text-2xl font-black text-emerald-700">
                    {dashboardData.totalLoggedHoursUsed.toFixed(1)}h / {totalConsumedHours.toFixed(1)}h
                  </div>
                  <span className="text-[11px] text-ink-muted block leading-tight">Total logged vs verified and approved hours</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Remaining Pool Hours</span>
                  <div className="text-2xl font-black text-emerald-700">{remainingHours.toFixed(1)}h</div>
                  <span className="text-[11px] text-ink-muted block leading-tight">Estimated remaining balance pool</span>
                </div>
              </div>

              {/* Stacked Progress Bars: Current Month Usage & Total Contract Usage */}
              <div className="space-y-6 pt-4 border-t border-line">
                {/* 1. Current Month Usage Progress Bar */}
                {(() => {
                  const monthlyAllocated = dashboardData.monthlyAllocatedHours || 1;
                  const monthlyApproved = dashboardData.monthlyApprovedActualHoursUsed || 0;
                  const monthlyLogged = dashboardData.monthlyLoggedHoursUsed || 0;
                  const monthlyPending = Math.max(0, monthlyLogged - monthlyApproved);
                  const monthlyBurnPct = (monthlyApproved / monthlyAllocated) * 100;
                  
                  // Color thresholds: <70% healthy (success), 70-90% warning, >90% critical
                  const barColorClass = monthlyBurnPct > 90 
                    ? 'bg-critical' 
                    : monthlyBurnPct >= 70 
                      ? 'bg-warning' 
                      : 'bg-success';

                  const textColorClass = monthlyBurnPct > 90 
                    ? 'text-critical' 
                    : monthlyBurnPct >= 70 
                      ? 'text-warning' 
                      : 'text-success';

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-ink-secondary uppercase tracking-wider text-[11px]">Current Month Usage</span>
                        <span className={`font-black ${textColorClass}`}>{monthlyBurnPct.toFixed(1)}% burned</span>
                      </div>
                      <div className="w-full bg-surface-subtle rounded-full h-3.5 border border-line overflow-hidden p-0.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${barColorClass}`}
                          style={{ width: `${Math.min(100, monthlyBurnPct)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-ink-muted">
                        <span>Allocated: {monthlyAllocated.toFixed(1)}h</span>
                        <div className="flex gap-3">
                          <span>Burned: <strong className="text-ink-secondary">{monthlyApproved.toFixed(1)}h</strong></span>
                          <span>Pending Approval: <strong className="text-ink-secondary">{monthlyPending.toFixed(1)}h</strong></span>
                          <span>Remaining: <strong className="text-ink-secondary">{dashboardData.monthlyRemainingHours.toFixed(1)}h</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Total Contract Usage Progress Bar */}
                {(() => {
                  const totalContractHours = dashboardData.totalContractedHours || 1;
                  const totalApproved = dashboardData.totalApprovedHoursUsed || 0;
                  const totalLogged = dashboardData.totalLoggedHoursUsed || 0;
                  const totalPending = Math.max(0, totalLogged - totalApproved);
                  const totalBurnPct = (totalApproved / totalContractHours) * 100;

                  // Color thresholds: <70% healthy (success), 70-90% warning, >90% critical
                  const barColorClass = totalBurnPct > 90 
                    ? 'bg-critical' 
                    : totalBurnPct >= 70 
                      ? 'bg-warning' 
                      : 'bg-success';

                  const textColorClass = totalBurnPct > 90 
                    ? 'text-critical' 
                    : totalBurnPct >= 70 
                      ? 'text-warning' 
                      : 'text-success';

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-ink-secondary uppercase tracking-wider text-[11px]">Total Contract Usage</span>
                        <span className={`font-black ${textColorClass}`}>{totalBurnPct.toFixed(1)}% burned</span>
                      </div>
                      <div className="w-full bg-surface-subtle rounded-full h-3.5 border border-line overflow-hidden p-0.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${barColorClass}`}
                          style={{ width: `${Math.min(100, totalBurnPct)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-ink-muted">
                        <span>Contract Total: {totalContractHours.toFixed(1)}h</span>
                        <div className="flex gap-3">
                          <span>Burned: <strong className="text-ink-secondary">{totalApproved.toFixed(1)}h</strong></span>
                          <span>Pending Approval: <strong className="text-ink-secondary">{totalPending.toFixed(1)}h</strong></span>
                          <span>Remaining Balance: <strong className="text-ink-secondary">{remainingHours.toFixed(1)}h</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <p className="text-[11px] text-ink-muted">
                  * Note: Effort logs are compiled from verified consultant timesheets. Billing and approval processes are handled internally.
                </p>
              </div>

              {/* Active Contract Block */}
              {activeContract && contractMetrics && (
                <div className="mt-6 border border-line bg-surface-muted/60 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink uppercase">
                        Active Support Contract: {activeContract.contractType}
                      </span>
                      <Badge variant="outline" className={`text-[11px] font-bold ${
                        contractMetrics.expiryStatus === 'Expired'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : contractMetrics.expiryStatus === 'Expiring Soon'
                            ? 'bg-amber-50 text-amber-700 border-amber-250 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {contractMetrics.expiryStatus.toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-ink-muted">
                      Valid through {activeContract.endDate ? new Date(activeContract.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-ink">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Contract Start</span>
                      <span className="text-xs font-bold">{new Date(contractMetrics.startDate).toLocaleDateString()}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Contract End</span>
                      <span className="text-xs font-bold">{new Date(contractMetrics.endDate).toLocaleDateString()}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Duration</span>
                      <span className="text-xs font-bold">{contractMetrics.durationDays} Days</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Total Allocated</span>
                      <span className="text-xs font-bold">{contractMetrics.totalHours.toFixed(1)}h</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Monthly Allocated</span>
                      <span className="text-xs font-bold">{contractMetrics.monthlyBudgetHours.toFixed(1)}h</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Usage Burn %</span>
                      <span className="text-xs font-bold">{contractMetrics.usagePercentage.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-line text-ink">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Total Utilized</span>
                      <span className="text-sm font-black text-ink">{contractMetrics.totalUtilizedHours.toFixed(1)}h</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Total Remaining</span>
                      <span className="text-sm font-black text-emerald-700">{contractMetrics.totalRemainingHours.toFixed(1)}h</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Current Month Utilized</span>
                      <span className="text-sm font-black text-ink">{contractMetrics.currentMonthUtilizedHours.toFixed(1)}h</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">Current Month Remaining</span>
                      <span className="text-sm font-black text-emerald-700">{contractMetrics.currentMonthRemainingHours.toFixed(1)}h</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
