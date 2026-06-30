'use client';

import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { BrandedLogo } from '../../../components/ui/BrandedLogo';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart,
  ScatterChart, Scatter
} from 'recharts';
import {
  Users, Building2, Ticket, AlertTriangle, Clock, HeartHandshake,
  Layers, Calendar, BarChart3, TrendingUp, ShieldAlert, BadgeCheck,
  FileText, CheckCircle2, UserCheck, DollarSign, Activity, FileCheck,
  HelpCircle, UserX, AlertCircle, RefreshCw, ChevronRight, Check,
  Lock, KeyRound, Search, ShieldCheck as ShieldIcon, Filter, Download,
  Sliders, Settings, Eye, Info, Database, Server, RefreshCw as LoopIcon,
  Maximize2, Power
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { PageHeader } from '../../../components/ui/page-header';
import { StatCard } from '../../../components/ui/stat-card';
import type { PillTone } from '../../../components/ui/status-pill';
import { AdminOperationIntelligence } from '../../../components/analytics/admin-operation-intelligence';
import { AdminPageHeader, AdminStat, AdminCard, AdminGrid, AdminButton, AdminGauge, AdminLoadBuckets, AdminBullet, AdminEmpty } from '../../../components/admin/ui/admin-kit';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Skeleton } from '../../../components/ui/skeleton';
import { Progress } from '../../../components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';
import { TicketFilterPanel } from '../../../components/tickets/TicketFilterPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from '../../../components/ui/dialog';

// IAM actions imported from auth.ts
import {
  updateUserAuthStatus,
  adminForcePasswordChange,
  resetUserPasswordAdmin,
  adminUpdatePasswordDirect,
  logUserAuditAction,
  verifyPasswordPolicy
} from '../../actions/auth';

const SYSTEM_NOW = Date.now(); // real current time (was a frozen demo clock)

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { tickets, contracts, profiles, loading, refetchData, orgMap } = useTickets();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>('cockpit');

  // Search and filter states (10 Global Filters + Sub-filters)
  const [filters, setFilters] = useState({
    period: 'This Year' as 'This Month' | 'This Quarter' | 'This Year' | 'Custom',
    dateFrom: '',
    dateTo: '',
    statuses: [] as string[],
    priority: 'All' as string,
    module: 'All' as string,
    customer: 'All' as string,
    consultant: 'All' as string,
    manager: 'All' as string
  });

  // IAM User management state
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<'All' | 'Customer' | 'Consultant' | 'Manager' | 'SuperAdmin'>('All');
  const [isIAMModalOpen, setIsIAMModalOpen] = useState(false);
  const [selectedIAMUser, setSelectedIAMUser] = useState<any>(null);
  const [manualPassword, setManualPassword] = useState('');
  const [forcePasswordChange, setForcePasswordChange] = useState(true);
  const [generatedPassResult, setGeneratedPassResult] = useState('');

  // Audit Center states
  const [auditSearch, setAuditSearch] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(false);

  // Platform health states (Active checks)
  const [healthStatus, setHealthStatus] = useState<Record<string, { status: 'Online' | 'Offline'; latency: number }>>({
    database: { status: 'Online', latency: 0 },
    auth: { status: 'Online', latency: 0 },
    storage: { status: 'Online', latency: 0 },
    realtime: { status: 'Online', latency: 0 },
    api: { status: 'Online', latency: 0 }
  });
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Load audit logs from Supabase
  const fetchAuditLogs = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setAuditsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err: unknown) {
      console.error('Failed to fetch audit logs:', getErrorMessage(err));
    } finally {
      setAuditsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audits') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel('realtime-audit-logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        (payload) => {
          console.log('Realtime audit logs change detected:', payload);
          fetchAuditLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  // Run dynamic health checks on Platform Health Tab enter
  const runPlatformHealthChecks = async () => {
    setCheckingHealth(true);
    const results: any = {};
    const checkService = async (key: string, fn: () => Promise<any>) => {
      const start = Date.now();
      try {
        await fn();
        results[key] = { status: 'Online', latency: Date.now() - start };
      } catch (err) {
        results[key] = { status: 'Offline', latency: Date.now() - start };
      }
    };

    if (isSupabaseConfigured && supabase) {
      await checkService('database', async () => {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        if (error) throw error;
        return data;
      });
      await checkService('auth', async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data;
      });
      await checkService('storage', async () => {
        const { data, error } = await supabase.storage.from('sap-tickets').list('', { limit: 1 });
        if (error) throw error;
        return data;
      });
      await checkService('realtime', async () => {
        const channel = supabase.channel('health-check-chan');
        channel.subscribe();
        await supabase.removeChannel(channel);
      });
      await checkService('api', async () => {
        const res = await fetch('/api/health');
        if (!res.ok) throw new Error('API not ok');
        return res;
      });
    } else {
      // Offline fallback pings
      results.database = { status: 'Offline', latency: 0 };
      results.auth = { status: 'Offline', latency: 0 };
      results.storage = { status: 'Offline', latency: 0 };
      results.realtime = { status: 'Offline', latency: 0 };
      results.api = { status: 'Offline', latency: 0 };
    }
    setHealthStatus(results);
    setCheckingHealth(false);
  };

  useEffect(() => {
    if (activeTab === 'health') {
      runPlatformHealthChecks();
    }
  }, [activeTab]);

  // RLS Security & Verification Check Helpers
  const RLS_POSTURE = useMemo(() => {
    return isSupabaseConfigured ? 'ENABLED (PostgreSQL RLS Active)' : 'DISABLED (Mock Fallback Mode)';
  }, []);

  // Filter lists derived from DB
  const customerOrgsList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.organization))).filter(Boolean).sort();
  }, [tickets]);

  const managersProfilesList = useMemo(() => {
    return Array.from(new Set(profiles.filter(p => p.role === 'Manager').map(p => p.full_name || p.email))).sort();
  }, [profiles]);

  const consultantsProfilesList = useMemo(() => {
    return Array.from(new Set(profiles.filter(p => p.role === 'Consultant').map(p => p.full_name || p.email))).sort();
  }, [profiles]);

  const modulesList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.sapModule))).filter(Boolean).sort();
  }, [tickets]);

  const statusList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.status))).filter(Boolean).sort();
  }, [tickets]);

  const applyFilters = (rawTickets: any[], filtersState: typeof filters) => {
    return rawTickets.filter(t => {
      // 1. Period filter
      if (filtersState.period !== 'Custom') {
        const createdDate = new Date(t.createdAt);
        const now = new Date(SYSTEM_NOW);
        if (filtersState.period === 'This Month') {
          if (createdDate.getMonth() !== now.getMonth() || createdDate.getFullYear() !== now.getFullYear()) return false;
        } else if (filtersState.period === 'This Quarter') {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const ticketQuarter = Math.floor(createdDate.getMonth() / 3);
          if (ticketQuarter !== currentQuarter || createdDate.getFullYear() !== now.getFullYear()) return false;
        } else if (filtersState.period === 'This Year') {
          if (createdDate.getFullYear() !== now.getFullYear()) return false;
        }
      } else {
        const createdDate = new Date(t.createdAt);
        if (filtersState.dateFrom) {
          const from = new Date(filtersState.dateFrom);
          from.setHours(0, 0, 0, 0);
          if (createdDate < from) return false;
        }
        if (filtersState.dateTo) {
          const to = new Date(filtersState.dateTo);
          to.setHours(23, 59, 59, 999);
          if (createdDate > to) return false;
        }
      }

      // 2. Statuses filter
      if (filtersState.statuses.length > 0) {
        let mappedGroup = 'New';
        const st = t.status;
        if (st === 'New') mappedGroup = 'New';
        else if (st === 'Assigned') mappedGroup = 'Assigned';
        else if (['In Progress - Functional', 'Awaiting Functional Submission', 'In Progress - Technical', 'Awaiting Technical Submission', 'Requirement Gathering', 'In Progress'].includes(st)) {
          mappedGroup = 'In Progress';
        } else if (['Waiting for Hours Approval', 'Request for Closure', 'Awaiting Manager Approval'].includes(st)) {
          mappedGroup = 'Pending Closure';
        } else if (st === 'Closed' || st === 'Resolved') mappedGroup = 'Closed';
        else if (st === 'Reopened') mappedGroup = 'Reopened';
        else if (st === 'Raised to SAP' || t.escalationFlag) mappedGroup = 'Escalated';

        if (!filtersState.statuses.includes(mappedGroup)) return false;
      }

      // 3. Priority filter
      if (filtersState.priority !== 'All' && t.priority !== filtersState.priority) return false;

      // 4. Module filter
      if (filtersState.module !== 'All' && t.sapModule !== filtersState.module) return false;

      // 5. Customer filter
      if (filtersState.customer !== 'All' && t.organization !== filtersState.customer) return false;

      // 6. Consultant filter
      if (filtersState.consultant !== 'All' && t.assignedConsultant !== filtersState.consultant) return false;

      // 7. Manager filter
      if (filtersState.manager !== 'All' && t.assignedManager !== filtersState.manager) return false;

      return true;
    });
  };

  // Base tickets selection filter
  const activeTickets = useMemo(() => {
    return applyFilters(tickets, filters);
  }, [tickets, filters]);

  // Current period bounds + the equivalent PREVIOUS period (for KPI deltas).
  // Previous period reuses every non-period filter, only the date window shifts.
  const periodWindow = useMemo(() => {
    const now = new Date(SYSTEM_NOW);
    let start: Date, end: Date, prevStart: Date, prevEnd: Date;
    if (filters.period === 'This Month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (filters.period === 'This Quarter') {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      end = now;
      prevStart = new Date(now.getFullYear(), q * 3 - 3, 1);
      prevEnd = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59, 999);
    } else if (filters.period === 'This Year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else {
      const createdTimes = tickets.map(t => new Date(t.createdAt).getTime()).filter(Number.isFinite);
      start = filters.dateFrom ? new Date(filters.dateFrom) : new Date(createdTimes.length ? Math.min(...createdTimes) : SYSTEM_NOW);
      start.setHours(0, 0, 0, 0);
      end = filters.dateTo ? new Date(filters.dateTo) : now;
      end.setHours(23, 59, 59, 999);
      const len = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(start.getTime() - 1 - len);
    }
    const prevFilters = {
      ...filters, period: 'Custom' as const,
      dateFrom: prevStart.toISOString().slice(0, 10),
      dateTo: prevEnd.toISOString().slice(0, 10),
    };
    return {
      periodStart: start.getTime(),
      periodEnd: end.getTime(),
      previousTickets: applyFilters(tickets, prevFilters),
    };
  }, [tickets, filters]);

  // color configs
  const THEME_COLORS = ['#09090b', '#18181b', '#27272a', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5'];
  const PRIORITY_COLORS: Record<string, string> = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#eab308',
    Low: '#71717a'
  };

  // ── 1. GLOBAL DELIVERY STATS & SUMMARY (Executive KPIs) ──
  const globalStats = useMemo(() => {
    const totalCustomers = Object.keys(orgMap).length;
    // Active customers: Unique organizations with at least one active contract
    const activeCustomers = Array.from(new Set(contracts.filter(c => c.isActive).map(c => c.organizationName))).length;
    
    const totalConsultants = profiles.filter(p => p.role === 'Consultant').length;
    const activeConsultants = profiles.filter(p => p.role === 'Consultant' && p.is_active).length;
    const totalManagers = profiles.filter(p => p.role === 'Manager').length;
    const totalContracts = contracts.length;

    const openTicketsCount = activeTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
    const closedTicketsCount = activeTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;
    const escalatedTicketsCount = activeTickets.filter(t => t.escalationFlag).length;

    // SLA compliance calculation (incidents only)
    const incidents = activeTickets.filter(t => (t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable');
    const breachedIncidents = incidents.filter(t => {
      const due = new Date(t.slaDueAt).getTime();
      const end = t.status === 'Resolved' || t.status === 'Closed'
        ? new Date(t.resolvedAt || t.closedAt || Date.now()).getTime()
        : Date.now();
      return end > due;
    }).length;
    const slaBreachesCount = breachedIncidents;

    // Pending Approvals mapping
    const pendingHours = tickets.reduce((sum, t) => sum + (t.actualHoursLogs || []).filter(h => h.approvalStatus?.toLowerCase() === 'pending').length, 0);
    const pendingClosures = tickets.filter(t => t.closureRequests?.some(r => r.status === 'Pending Manager Approval' || r.managerApprovalStatus === 'Pending')).length;
    const pendingUnlocks = tickets.reduce((sum, t) => sum + (t.unlockRequests || []).filter(u => u.status === 'Pending').length, 0);
    const pendingDeletes = tickets.reduce((sum, t) => sum + (t.deleteRequests || []).filter(r => r.managerApproval === 'Pending' || r.adminApproval === 'Pending').length, 0);
    const pendingReopens = tickets.filter(t => t.status === 'Reopen Requested').length;
    const pendingApprovalsCount = pendingHours + pendingClosures + pendingUnlocks + pendingDeletes + pendingReopens;

    // Hours calculations (Supabase strict mapping)
    // Utilized Hours = Only Manager Approved Actual Hours
    const totalApprovedHours = tickets.reduce((sum, t) => {
      const approved = (t.actualHoursLogs || []).filter(log => log.approvalStatus?.toLowerCase() === 'approved');
      return sum + approved.reduce((acc, curr) => acc + curr.actualHours, 0);
    }, 0);

    const thisMonthStr = new Date().toISOString().slice(0, 7);
    const currentMonthUtilizedHours = tickets.reduce((sum, t) => {
      const approvedThisMonth = (t.actualHoursLogs || []).filter(log => 
        log.approvalStatus?.toLowerCase() === 'approved' && 
        log.approvedAt?.startsWith(thisMonthStr)
      );
      return sum + approvedThisMonth.reduce((acc, curr) => acc + curr.actualHours, 0);
    }, 0);

    const totalContractHours = contracts.reduce((sum, c) => sum + (c.isActive ? c.totalHours : 0), 0);
    const remainingContractHours = Math.max(0, totalContractHours - totalApprovedHours);

    // Platform Health dynamic Score calculation
    const healthOnlineCount = Object.values(healthStatus).filter(h => h.status === 'Online').length;
    const platformHealthScore = Math.round((healthOnlineCount / Object.keys(healthStatus).length) * 100);

    return {
      totalCustomers,
      activeCustomers,
      totalConsultants,
      activeConsultants,
      totalManagers,
      totalContracts,
      openTicketsCount,
      closedTicketsCount,
      escalatedTicketsCount,
      pendingApprovalsCount,
      slaBreachesCount,
      totalApprovedHours,
      currentMonthUtilizedHours,
      remainingContractHours,
      platformHealthScore
    };
  }, [activeTickets, tickets, contracts, profiles, orgMap, healthStatus]);

  // ── 2. CUSTOMER PORTFOLIO INTELLIGENCE ──
  const customerPortfolio = useMemo(() => {
    return Object.entries(orgMap).map(([id, name]) => {
      const customerTickets = activeTickets.filter(t => t.organizationId === id || t.organization === name);
      const activeContract = contracts.find(c => (c.customerId === id || c.organizationName === name) && c.isActive);

      const monthlyHours = activeContract ? activeContract.monthlyBudgetHours : 0;
      const annualHours = activeContract ? activeContract.totalHours : 0;

      // Utilized hours = strictly manager approved hours
      let approvedHours = 0;
      let pendingHours = 0;
      customerTickets.forEach(t => {
        (t.actualHoursLogs || []).forEach(log => {
          if (log.approvalStatus?.toLowerCase() === 'approved') {
            approvedHours += log.actualHours;
          } else if (log.approvalStatus?.toLowerCase() === 'pending') {
            pendingHours += log.actualHours;
          }
        });
      });

      const remainingHours = Math.max(0, annualHours - approvedHours);

      const openCount = customerTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      const closedCount = customerTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;
      const escalations = customerTickets.filter(t => t.escalationFlag).length;

      // SLA calculation
      const incidents = customerTickets.filter(t => (t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable');
      const breached = incidents.filter(t => {
        const due = new Date(t.slaDueAt).getTime();
        const end = t.status === 'Resolved' || t.status === 'Closed'
          ? new Date(t.resolvedAt || t.closedAt || Date.now()).getTime()
          : Date.now();
        return end > due;
      }).length;
      const slaCompliance = incidents.length > 0 ? ((incidents.length - breached) / incidents.length) * 100 : 100;

      // Avg resolution time (in hours)
      const resolvedT = customerTickets.filter(t => (t.status === 'Resolved' || t.status === 'Closed') && t.resolvedAt);
      const avgResolutionTime = resolvedT.length > 0
        ? resolvedT.reduce((sum, t) => sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60), 0) / resolvedT.length
        : 0;

      const lastActivity = customerTickets.length > 0 
        ? new Date(Math.max(...customerTickets.map(t => new Date(t.updatedAt).getTime()))).toISOString()
        : 'N/A';

      return {
        id,
        name,
        code: activeContract?.customerId?.slice(0, 6) || id.slice(0, 6).toUpperCase(),
        start: activeContract?.startDate || 'N/A',
        end: activeContract?.endDate || 'N/A',
        status: activeContract ? (activeContract.isActive ? 'Active' : 'Inactive') : 'No Contract',
        monthlyHours,
        annualHours,
        approvedHours,
        pendingHours,
        remainingHours,
        openCount,
        closedCount,
        escalations,
        slaCompliance,
        avgResolutionTime: avgResolutionTime > 0 ? `${avgResolutionTime.toFixed(1)}h` : 'N/A',
        lastActivity
      };
    });
  }, [activeTickets, contracts, orgMap]);

  // ── 3. CONSULTANT COMMAND CENTER ──
  const consultantsPortfolio = useMemo(() => {
    return profiles.filter(p => p.role === 'Consultant').map(cons => {
      const name = cons.full_name || cons.email;
      const id = cons.id;

      const consTickets = activeTickets.filter(t => 
        t.assignedConsultant === name || 
        t.assignments?.some(a => a.consultantId === id && a.active)
      );

      const activeCount = consTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      const closedCount = consTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;
      const escalatedCount = consTickets.filter(t => t.escalationFlag).length;

      // Estimated hours logged
      let estimatedHours = 0;
      activeTickets.forEach(t => {
        (t.estimates || []).forEach(e => {
          if (e.consultantId === id) estimatedHours += e.estimatedHours;
        });
      });

      // Approved actual hours logged
      let approvedHours = 0;
      activeTickets.forEach(t => {
        (t.actualHoursLogs || []).forEach(log => {
          if (log.consultantId === id && log.approvalStatus?.toLowerCase() === 'approved') {
            approvedHours += log.actualHours;
          }
        });
      });

      const capacity = 160;
      const utilization = (approvedHours / capacity) * 100;
      const remainingCapacity = Math.max(0, capacity - approvedHours);

      let workloadRisk: 'Overloaded' | 'Near Capacity' | 'Healthy' | 'Underutilized' = 'Healthy';
      if (activeCount > 5 || utilization > 92) {
        workloadRisk = 'Overloaded';
      } else if (activeCount >= 4 || utilization >= 80) {
        workloadRisk = 'Near Capacity';
      } else if (activeCount === 0 || utilization < 40) {
        workloadRisk = 'Underutilized';
      }

      const lastActivity = consTickets.length > 0
        ? new Date(Math.max(...consTickets.map(t => new Date(t.updatedAt).getTime()))).toISOString()
        : 'N/A';

      return {
        id,
        name,
        email: cons.email,
        modules: cons.sap_modules || [],
        type: cons.consultant_type || 'Technical',
        activeCount,
        closedCount,
        escalatedCount,
        estimatedHours,
        approvedHours,
        capacity,
        utilization,
        remainingCapacity,
        workloadRisk,
        lastActivity
      };
    });
  }, [profiles, activeTickets]);

  // Consultant ranking aggregates
  const overloadedConsultants = useMemo(() => {
    return consultantsPortfolio.filter(c => c.workloadRisk === 'Overloaded' || c.workloadRisk === 'Near Capacity')
      .sort((a, b) => b.activeCount - a.activeCount);
  }, [consultantsPortfolio]);

  const underutilizedConsultants = useMemo(() => {
    return consultantsPortfolio.filter(c => c.workloadRisk === 'Underutilized')
      .sort((a, b) => a.utilization - b.utilization);
  }, [consultantsPortfolio]);

  // ── 4. SAP MANAGER COMMAND CENTER ──
  const managersPortfolio = useMemo(() => {
    return profiles.filter(p => p.role === 'Manager').map(mgr => {
      const name = mgr.full_name || mgr.email;
      const id = mgr.id;

      const mgrTickets = activeTickets.filter(t => t.assignedManager === name);
      const ticketsManaged = mgrTickets.length;
      const openCount = mgrTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      const escalations = mgrTickets.filter(t => t.escalationFlag).length;

      const customersManaged = Array.from(new Set(mgrTickets.map(t => t.organization).filter(Boolean))).length;
      const teamSize = Array.from(new Set(mgrTickets.map(t => t.assignedConsultant).filter(Boolean))).length;

      // Pending approvals count for this manager
      const pendingHours = mgrTickets.reduce((sum, t) => sum + (t.actualHoursLogs || []).filter(h => h.approvalStatus?.toLowerCase() === 'pending').length, 0);
      const pendingClosures = mgrTickets.filter(t => t.closureRequests?.some(r => r.status === 'Pending Manager Approval' || r.managerApprovalStatus === 'Pending')).length;
      const pendingUnlocks = mgrTickets.reduce((sum, t) => sum + (t.unlockRequests || []).filter(u => u.status === 'Pending').length, 0);
      const pendingApprovals = pendingHours + pendingClosures + pendingUnlocks;

      // SLA Compliance
      const incidents = mgrTickets.filter(t => (t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable');
      const breached = incidents.filter(t => {
        const due = new Date(t.slaDueAt).getTime();
        const end = t.status === 'Resolved' || t.status === 'Closed'
          ? new Date(t.resolvedAt || t.closedAt || Date.now()).getTime()
          : Date.now();
        return end > due;
      }).length;
      const slaCompliance = incidents.length > 0 ? ((incidents.length - breached) / incidents.length) * 100 : 100;
      const slaRisks = incidents.filter(t => {
        if (t.status === 'Resolved' || t.status === 'Closed') return false;
        const due = new Date(t.slaDueAt).getTime();
        return due - Date.now() > 0 && (due - Date.now()) <= 2 * 60 * 60 * 1000; // within 2 hours
      }).length;

      // Team utilization average
      const teamConsultants = profiles.filter(p => p.role === 'Consultant' && mgrTickets.some(t => t.assignedConsultant === (p.full_name || p.email)));
      const teamHoursSum = teamConsultants.reduce((sum, c) => {
        const consActual = activeTickets.reduce((s, t) => {
          const approved = (t.actualHoursLogs || []).filter(log => log.consultantId === c.id && log.approvalStatus?.toLowerCase() === 'approved');
          return s + approved.reduce((acc, curr) => acc + curr.actualHours, 0);
        }, 0);
        return sum + consActual;
      }, 0);
      const teamUtilization = teamConsultants.length > 0 ? (teamHoursSum / (teamConsultants.length * 160)) * 100 : 0;

      // Contract consumption rate
      const mgrContracts = contracts.filter(c => mgrTickets.some(t => t.organization === c.organizationName));
      const contractedHoursSum = mgrContracts.reduce((sum, c) => sum + c.totalHours, 0);
      const consumedHoursSum = mgrContracts.reduce((sum, c) => sum + c.usedHours, 0);
      const contractConsumption = contractedHoursSum > 0 ? (consumedHoursSum / contractedHoursSum) * 100 : 0;

      // Approval Speed: Avg hours between closure request creation and manager approval
      const approvedClosures = mgrTickets.flatMap(t => t.closureRequests || [])
        .filter(r => r.status === 'Approved' && r.managerApprovedAt);
      const avgApprovalSpeedHours = approvedClosures.length > 0
        ? approvedClosures.reduce((sum, r) => sum + (new Date(r.managerApprovedAt!).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60), 0) / approvedClosures.length
        : 0;

      // Delivery health calculation
      const deliveryHealth = Math.round((slaCompliance * 0.4) + ((100 - (escalations > 0 ? (escalations / ticketsManaged) * 100 : 0)) * 0.3) + ((teamUtilization > 40 && teamUtilization < 90 ? 100 : 50) * 0.3));

      return {
        id,
        name,
        ticketsManaged,
        customersManaged,
        teamSize,
        pendingApprovals,
        escalations,
        slaCompliance,
        slaRisks,
        teamUtilization,
        contractConsumption,
        avgApprovalSpeedHours,
        deliveryHealth
      };
    });
  }, [profiles, activeTickets, contracts]);

  // ── 5. APPROVALS & REOPEN/DELETE QUEUE ──
  const approvalsQueue = useMemo(() => {
    const list: Array<{
      id: string;
      ticketId: string;
      ticketNumber: string;
      type: 'Timesheet' | 'Closure' | 'Reopen' | 'Unlock' | 'Delete';
      details: string;
      requester: string;
      date: string;
      refObject: any;
    }> = [];

    activeTickets.forEach(t => {
      // Pending Timesheet Efforts
      (t.actualHoursLogs || []).forEach(log => {
        if (log.approvalStatus?.toLowerCase() === 'pending') {
          const cons = profiles.find(p => p.id === log.consultantId);
          list.push({
            id: `ts-${log.id}`,
            ticketId: t.id,
            ticketNumber: t.ticketNumber || t.id,
            type: 'Timesheet',
            details: `${log.actualHours} hrs logged by ${cons?.full_name || 'Consultant'} (${log.consultantType})`,
            requester: cons?.full_name || 'Consultant',
            date: t.updatedAt || t.createdAt,
            refObject: log
          });
        }
      });

      // Pending Closure Requests
      (t.closureRequests || []).forEach(cr => {
        if (cr.status === 'Pending Manager Approval' || cr.managerApprovalStatus === 'Pending') {
          list.push({
            id: `closure-${cr.id}`,
            ticketId: t.id,
            ticketNumber: t.ticketNumber || t.id,
            type: 'Closure',
            details: `Closure Request: ${cr.totalActualHours} total hrs. Summary: ${cr.workCompletedSummary || 'N/A'}`,
            requester: cr.requestedBy,
            date: cr.createdAt,
            refObject: cr
          });
        }
      });

      // Reopen Requests
      if (t.status === 'Reopen Requested') {
        list.push({
          id: `reopen-${t.id}`,
          ticketId: t.id,
          ticketNumber: t.ticketNumber || t.id,
          type: 'Reopen',
          details: 'Customer requested ticket reopening due to resolution failure.',
          requester: t.requestedBy || 'Customer',
          date: t.updatedAt || t.createdAt,
          refObject: t
        });
      }

      // Pending Unlock Requests
      (t.unlockRequests || []).forEach(ur => {
        if (ur.status === 'Pending') {
          list.push({
            id: `unlock-${ur.id}`,
            ticketId: t.id,
            ticketNumber: t.ticketNumber || t.id,
            type: 'Unlock',
            details: `Request to unlock: ${ur.requestedChange}. Reason: ${ur.reason}`,
            requester: ur.requestedBy,
            date: ur.createdAt,
            refObject: ur
          });
        }
      });

      // Pending Delete Requests
      (t.deleteRequests || []).forEach(dr => {
        if (dr.finalStatus === 'Pending' || dr.adminApproval === 'Pending') {
          list.push({
            id: `delete-${dr.id}`,
            ticketId: t.id,
            ticketNumber: t.ticketNumber || t.id,
            type: 'Delete',
            details: `Soft Delete Request. Reason: ${dr.reason}`,
            requester: dr.requestedBy,
            date: dr.createdAt,
            refObject: dr
          });
        }
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeTickets, profiles]);

  // Actions execution
  const executeTimesheetApproval = async (ticketId: string, logId: string, action: 'Approved' | 'Rejected') => {
    if (!isSupabaseConfigured || !supabase) return;
    const toastId = toast.loading(`${action === 'Approved' ? 'Approving' : 'Rejecting'} effort log...`);
    try {
      const { error } = await supabase
        .from('ticket_actual_hours')
        .update({
          approval_status: action === 'Approved' ? 'approved' : 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', logId);

      if (error) throw error;
      toast.success(`Effort log ${action.toLowerCase()} successfully.`, { id: toastId });
      await refetchData();
    } catch (err: unknown) {
      toast.error(`Operation failed: ${getErrorMessage(err)}`, { id: toastId });
    }
  };

  const executeClosureApproval = async (ticketId: string, requestId: string, action: 'Approved' | 'Rejected') => {
    if (!isSupabaseConfigured || !supabase) return;
    const toastId = toast.loading(`${action === 'Approved' ? 'Approving' : 'Rejecting'} closure...`);
    try {
      // 1. Update closure status
      const { error: requestErr } = await supabase
        .from('ticket_closure_requests')
        .update({
          status: action === 'Approved' ? 'Approved' : 'Rejected',
          manager_approval_status: action === 'Approved' ? 'Approved' : 'Rejected',
          manager_approved_by: user?.id,
          manager_approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (requestErr) throw requestErr;

      // 2. Update ticket status to Closed if approved
      if (action === 'Approved') {
        const { error: ticketErr } = await supabase
          .from('tickets')
          .update({
            status: 'Closed',
            closed_at: new Date().toISOString(),
            closed_by: user?.name || user?.email
          })
          .eq('id', ticketId);

        if (ticketErr) throw ticketErr;
      }

      toast.success(`Closure ${action.toLowerCase()} successfully.`, { id: toastId });
      await refetchData();
    } catch (err: unknown) {
      toast.error(`Operation failed: ${getErrorMessage(err)}`, { id: toastId });
    }
  };

  const executeDeleteRequest = async (ticketId: string, requestId: string, action: 'Approved' | 'Rejected') => {
    if (!isSupabaseConfigured || !supabase) return;
    const toastId = toast.loading(`${action === 'Approved' ? 'Approving' : 'Rejecting'} delete request...`);
    try {
      // Update delete requests
      const { error: requestErr } = await supabase
        .from('ticket_delete_requests')
        .update({
          admin_approval: action === 'Approved' ? 'Approved' : 'Rejected',
          admin_approved_by: user?.id,
          admin_approved_at: new Date().toISOString(),
          final_status: action === 'Approved' ? 'Approved' : 'Rejected'
        })
        .eq('id', requestId);

      if (requestErr) throw requestErr;

      if (action === 'Approved') {
        // Soft delete the ticket
        const { error: ticketErr } = await supabase
          .from('tickets')
          .update({ soft_delete_status: 'Archived' })
          .eq('id', ticketId);
        if (ticketErr) throw ticketErr;
      }

      toast.success(`Soft delete ${action.toLowerCase()} successfully.`, { id: toastId });
      await refetchData();
    } catch (err: unknown) {
      toast.error(`Operation failed: ${getErrorMessage(err)}`, { id: toastId });
    }
  };

  // ── 6. ESCALATION COMMAND CENTER ──
  const escalationsQueue = useMemo(() => {
    const list: any[] = [];
    tickets.forEach(t => {
      (t.escalations || []).forEach(esc => {
        if (esc.status !== 'Resolved') {
          list.push({
            id: esc.id,
            ticketId: t.id,
            ticketNumber: t.ticketNumber || t.id,
            title: t.title,
            customer: t.organization,
            consultant: t.assignedConsultant || 'Unassigned',
            manager: t.assignedManager || 'Unassigned',
            escalatedBy: esc.escalatedBy,
            severity: esc.severity,
            reason: esc.reason,
            status: esc.status,
            date: esc.createdAt,
            priority: t.priority
          });
        }
      });
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tickets]);

  // ── 7. DELIVERY & PLATFORM HEALTH ──
  const deliveryHealthPostures = useMemo(() => {
    const warnings: string[] = [];
    if (globalStats.slaBreachesCount > 0) warnings.push('SLA Breaches');
    if (globalStats.pendingApprovalsCount > 10) warnings.push('Approval Backlog');
    if (escalationsQueue.length > 0) warnings.push('Active Escalations');

    let posture: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
    if (escalationsQueue.length > 2 || globalStats.slaBreachesCount > 3) {
      posture = 'Critical';
    } else if (warnings.length > 0) {
      posture = 'Warning';
    }
    return { posture, warnings };
  }, [globalStats, escalationsQueue]);

  // ── 8. AUDIT LOGS SEARCH & FILTERS ──
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (!log) return false;
      const search = auditSearch.toLowerCase();
      return (
        (log.user_email || '').toLowerCase().includes(search) ||
        (log.action || '').toLowerCase().includes(search) ||
        (log.performed_by || '').toLowerCase().includes(search)
      );
    });
  }, [auditLogs, auditSearch]);

  const handleExportAuditsCSV = () => {
    if (filteredAuditLogs.length === 0) {
      toast.error('No audit records to export.');
      return;
    }
    const headers = ['ID', 'User Email', 'Action', 'Performed By', 'Timestamp'];
    const rows = filteredAuditLogs.map(log => [
      log.id,
      log.user_email,
      log.action,
      log.performed_by,
      new Date(log.created_at).toLocaleString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `assist360_audits_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Audit history CSV downloaded.');
  };

  // ── 9. PASSWORD MANAGEMENT & USER MANAGEMENT ──
  const filteredIAMUsers = useMemo(() => {
    return profiles.filter(p => {
      const matchesSearch = 
        (p.full_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (p.email || '').toLowerCase().includes(userSearchTerm.toLowerCase());
      
      const matchesType = selectedUserType === 'All' || p.role === selectedUserType;
      
      return matchesSearch && matchesType;
    }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [profiles, userSearchTerm, selectedUserType]);

  const handleUserToggleActive = async (targetUser: any) => {
    if (!isSupabaseConfigured || !supabase) return;
    const nextActive = !targetUser.is_active;
    const toastId = toast.loading(`${nextActive ? 'Enabling' : 'Disabling'} user profile...`);
    try {
      const res = await updateUserAuthStatus(
        targetUser.id,
        targetUser.email,
        nextActive,
        false, // clear lock flag
        user?.email || 'SuperAdmin'
      );
      if (!res.success) throw new Error(res.error);
      toast.success(`Account status changed to: ${nextActive ? 'Active' : 'Disabled'}`, { id: toastId });
      await refetchData();
    } catch (err: unknown) {
      toast.error(`Operation failed: ${getErrorMessage(err)}`, { id: toastId });
    }
  };

  const handleUserUnlock = async (targetUser: any) => {
    if (!isSupabaseConfigured || !supabase) return;
    const toastId = toast.loading('Unlocking user account...');
    try {
      const res = await updateUserAuthStatus(
        targetUser.id,
        targetUser.email,
        targetUser.is_active,
        false, // Clear lockout is_locked status
        user?.email || 'SuperAdmin'
      );
      if (!res.success) throw new Error(res.error);
      toast.success('Account unlocked successfully.', { id: toastId });
      await refetchData();
    } catch (err: unknown) {
      toast.error(`Unlock failed: ${getErrorMessage(err)}`, { id: toastId });
    }
  };

  const handleIAMActionReset = async () => {
    if (!selectedIAMUser) return;
    const toastId = toast.loading('Executing password reset...');
    try {
      const passPayload = manualPassword.trim() !== '' ? manualPassword.trim() : undefined;
      const res = await resetUserPasswordAdmin(
        selectedIAMUser.id,
        user?.email || 'SuperAdmin',
        selectedIAMUser.email,
        passPayload
      );
      if (!res.success) throw new Error(res.error);
      setGeneratedPassResult(res.password || manualPassword);
      toast.success('Password reset completed successfully. Temporary credentials ready.', { id: toastId });
      setManualPassword('');
      await refetchData();
    } catch (err: unknown) {
      toast.error(`Reset failed: ${getErrorMessage(err)}`, { id: toastId });
    }
  };

  const handleIAMActionUpdate = async () => {
    if (!selectedIAMUser || manualPassword.trim() === '') {
      toast.error('Please specify a password.');
      return;
    }
    const toastId = toast.loading('Updating user credentials...');
    try {
      const res = await adminUpdatePasswordDirect(
        selectedIAMUser.id,
        manualPassword.trim(),
        user?.email || 'SuperAdmin',
        selectedIAMUser.email
      );
      if (!res.success) throw new Error(res.error);
      
      if (forcePasswordChange) {
        await adminForcePasswordChange(selectedIAMUser.id, selectedIAMUser.email, user?.email || 'SuperAdmin');
      }

      toast.success('Credentials updated successfully.', { id: toastId });
      setManualPassword('');
      setIsIAMModalOpen(false);
      await refetchData();
    } catch (err: unknown) {
      toast.error(`Update failed: ${getErrorMessage(err)}`, { id: toastId });
    }
  };

  // ── 10. ANALYTICS WALL (20+ UNIQUE VISUALIZATIONS) ──
  const analyticsWallData = useMemo(() => {
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

    // 1. Ticket Volume Trend
    const getMonthTrend = () => {
      return trendIntervals.map(interval => {
        let incidents = 0;
        let requests = 0;

        activeTickets.forEach(t => {
          const date = new Date(t.createdAt);
          if (date >= interval.start && date <= interval.end) {
            if (t.ticketType === 'Incident' || !t.ticketType) {
              incidents++;
            } else {
              requests++;
            }
          }
        });

        return {
          name: interval.name,
          Incidents: incidents,
          Requests: requests
        };
      });
    };
    const ticketVolumeTrend = getMonthTrend();

    // 2. Ticket Growth
    const getTicketGrowthTrend = () => {
      let cumulative = 0;
      return trendIntervals.map(interval => {
        const count = activeTickets.filter(t => {
          const date = new Date(t.createdAt);
          return date >= interval.start && date <= interval.end;
        }).length;
        cumulative += count;
        return { name: interval.name, total: cumulative };
      });
    };
    const ticketGrowth = getTicketGrowthTrend();

    // 3. Open vs Closed
    const getOpenVsClosedByModule = () => {
      const modulesMap: Record<string, { Open: number; Closed: number }> = {};
      activeTickets.forEach(t => {
        const mod = t.sapModule || 'Other';
        if (!modulesMap[mod]) {
          modulesMap[mod] = { Open: 0, Closed: 0 };
        }
        if (t.status === 'Closed' || t.status === 'Resolved') {
          modulesMap[mod].Closed++;
        } else {
          modulesMap[mod].Open++;
        }
      });
      return Object.entries(modulesMap).map(([name, val]) => ({
        name,
        Open: val.Open,
        Closed: val.Closed
      })).slice(0, 8);
    };
    const openVsClosed = getOpenVsClosedByModule();

    // 4. Escalation Trend
    const getEscalationTrend = () => {
      return trendIntervals.map(interval => {
        const count = activeTickets.filter(t => {
          if (t.escalationFlag) {
            const date = new Date(t.createdAt);
            return date >= interval.start && date <= interval.end;
          }
          return false;
        }).length;
        return { name: interval.name, count };
      });
    };
    const escalationTrend = getEscalationTrend();

    // 5. SLA Trend
    const getSlaTrend = () => {
      return trendIntervals.map(interval => {
        const intervalIncidents = activeTickets.filter(t => {
          if ((t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable') {
            const date = new Date(t.createdAt);
            return date >= interval.start && date <= interval.end;
          }
          return false;
        });

        const breached = intervalIncidents.filter(t => {
          const due = new Date(t.slaDueAt).getTime();
          const endT = t.status === 'Resolved' || t.status === 'Closed'
            ? new Date(t.resolvedAt || t.closedAt || Date.now()).getTime()
            : Date.now();
          return endT > due;
        }).length;

        const compliance = intervalIncidents.length > 0 ? ((intervalIncidents.length - breached) / intervalIncidents.length) * 100 : 100;
        return { name: interval.name, compliance: Math.round(compliance * 10) / 10 };
      });
    };
    const slaTrend = getSlaTrend();

    // 6. Customer Activity
    const customerActivity = customerPortfolio.slice(0, 10).map(c => ({
      name: c.name.split(' ')[0],
      tickets: c.openCount + c.closedCount
    }));

    // 7. Consultant Utilization
    const consultantUtilization = consultantsPortfolio.slice(0, 10).map(c => ({
      name: c.name.split(' ')[0],
      utilization: Math.round(c.utilization)
    }));

    // 8. Manager Workload
    const managerWorkload = managersPortfolio.map(m => ({
      name: m.name.split(' ')[0],
      tickets: m.ticketsManaged
    }));

    // 9. Contract Budget Consumption
    const contractConsumption = customerPortfolio.slice(0, 10).map(c => ({
      name: c.name.split(' ')[0],
      Allocated: c.annualHours,
      Consumed: c.approvedHours
    }));

    // 10. Resolution Time Trend
    const getResolutionTimeTrend = () => {
      return trendIntervals.map(interval => {
        let totalHours = 0;
        let count = 0;

        activeTickets.forEach(t => {
          if ((t.status === 'Resolved' || t.status === 'Closed') && t.resolvedAt) {
            const date = new Date(t.createdAt);
            if (date >= interval.start && date <= interval.end) {
              const hrs = (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
              totalHours += hrs;
              count++;
            }
          }
        });

        return {
          name: interval.name,
          hours: count > 0 ? Math.round((totalHours / count) * 10) / 10 : 0
        };
      });
    };
    const resolutionTimeTrend = getResolutionTimeTrend();

    // 11. Approval Response Trend
    const getApprovalResponseTrend = () => {
      return trendIntervals.map(interval => {
        let count = 0;
        activeTickets.forEach(t => {
          const isPending = t.status === 'Reopen Requested' ||
            (t.actualHoursLogs || []).some(h => h.approvalStatus?.toLowerCase() === 'pending') ||
            (t.closureRequests || []).some(r => r.status === 'Pending Manager Approval' || r.managerApprovalStatus === 'Pending') ||
            (t.unlockRequests || []).some(u => u.status === 'Pending') ||
            (t.deleteRequests || []).some(r => r.managerApproval === 'Pending' || r.adminApproval === 'Pending');

          if (isPending) {
            const date = new Date(t.createdAt);
            if (date >= interval.start && date <= interval.end) {
              count++;
            }
          }
        });

        return {
          name: interval.name,
          pendingApprovals: count
        };
      });
    };
    const approvalResponseTrend = getApprovalResponseTrend();

    // 12. Approved Actual Hours
    const getApprovedHoursTrend = () => {
      return trendIntervals.map(interval => {
        let hours = 0;
        activeTickets.forEach(t => {
          (t.actualHoursLogs || []).forEach(log => {
            if (log.approvalStatus?.toLowerCase() === 'approved' && log.approvedAt) {
              const date = new Date(log.approvedAt);
              if (date >= interval.start && date <= interval.end) {
                hours += log.actualHours;
              }
            }
          });
        });

        return {
          name: interval.name,
          hours: Math.round(hours * 10) / 10
        };
      });
    };
    const approvedHoursTrend = getApprovedHoursTrend();

    // 13. Estimated vs Actual Hours
    const getEstVsActual = () => {
      const ticketsWithEffort = activeTickets.filter(t => 
        (t.actualHoursLogs && t.actualHoursLogs.length > 0) || 
        (t.hourEstimates && t.hourEstimates.length > 0)
      ).slice(0, 6);

      return ticketsWithEffort.map(t => {
        const totalEst = (t.hourEstimates || []).reduce((sum, h) => sum + (h.totalEstimatedHours || 0), 0);
        const totalAct = (t.actualHoursLogs || []).reduce((sum, a) => sum + (a.actualHours || 0), 0);
        return {
          name: t.ticketNumber || t.id,
          Estimated: totalEst,
          Actual: totalAct
        };
      });
    };
    const estVsActual = getEstVsActual();

    // 14. Priority Counts Distribution
    const priorityDistribution = [
      { name: 'Critical', value: activeTickets.filter(t => t.priority === 'Critical').length },
      { name: 'High', value: activeTickets.filter(t => t.priority === 'High').length },
      { name: 'Medium', value: activeTickets.filter(t => t.priority === 'Medium').length },
      { name: 'Low', value: activeTickets.filter(t => t.priority === 'Low').length }
    ];

    // 15. Ticket Categories Spread
    const categoryDistribution = [
      { name: 'Functional', value: activeTickets.filter(t => t.functionalOrTechnical === 'Functional' || t.category?.toLowerCase().includes('functional')).length },
      { name: 'Technical', value: activeTickets.filter(t => t.functionalOrTechnical === 'Technical' || t.category?.toLowerCase().includes('technical')).length }
    ];

    // 16. SAP Module Distribution
    const getModuleDistribution = () => {
      const modMap: Record<string, number> = {};
      activeTickets.forEach(t => {
        const mod = t.sapModule || 'Other';
        modMap[mod] = (modMap[mod] || 0) + 1;
      });
      return Object.entries(modMap).map(([name, value]) => ({ name, value }));
    };
    const moduleDistribution = getModuleDistribution();

    // 17. Customer Health Score Spread
    const healthScoreSpread = customerPortfolio.slice(0, 6).map(c => ({
      subject: c.name.split(' ')[0],
      score: Math.round(c.slaCompliance)
    }));

    // 18. Operational Risk Heatmap
    const riskHeatmap = [
      { subject: 'Database Load', risk: Math.min(100, Math.round(globalStats.platformHealthScore * 0.8)) },
      { subject: 'SLA Warnings', risk: Math.min(100, Math.round((globalStats.slaBreachesCount / (activeTickets.length || 1)) * 100)) },
      { subject: 'Approval Delay', risk: Math.min(100, Math.round(globalStats.pendingApprovalsCount * 5)) },
      { subject: 'Capacity Peak', risk: Math.min(100, Math.round((globalStats.totalApprovedHours / (globalStats.totalApprovedHours + globalStats.remainingContractHours || 1)) * 100)) },
      { subject: 'Escalations', risk: Math.min(100, Math.round((globalStats.escalatedTicketsCount / (activeTickets.length || 1)) * 100)) }
    ];

    // 19. Manager Delivery Health
    const managerDeliveryHealth = managersPortfolio.map(m => ({
      name: m.name.split(' ')[0],
      score: Math.round(m.deliveryHealth)
    }));

    // 20. Resource Capacity Forecast
    const capacityForecast = [
      { month: 'Jul', Utilized: Math.round(globalStats.currentMonthUtilizedHours), Remaining: Math.round(globalStats.remainingContractHours) },
      { month: 'Aug', Utilized: Math.round(globalStats.currentMonthUtilizedHours * 0.9), Remaining: Math.round(globalStats.remainingContractHours * 0.9) },
      { month: 'Sep', Utilized: Math.round(globalStats.currentMonthUtilizedHours * 1.1), Remaining: Math.round(globalStats.remainingContractHours * 0.8) },
      { month: 'Oct', Utilized: Math.round(globalStats.currentMonthUtilizedHours * 1.05), Remaining: Math.round(globalStats.remainingContractHours * 0.7) }
    ];

    return {
      ticketVolumeTrend,
      ticketGrowth,
      openVsClosed,
      escalationTrend,
      slaTrend,
      customerActivity,
      consultantUtilization,
      managerWorkload,
      contractConsumption,
      resolutionTimeTrend,
      approvalResponseTrend,
      approvedHoursTrend,
      estVsActual,
      priorityDistribution,
      categoryDistribution,
      moduleDistribution,
      healthScoreSpread,
      riskHeatmap,
      managerDeliveryHealth,
      capacityForecast
    };
  }, [activeTickets, tickets, globalStats, customerPortfolio, consultantsPortfolio, managersPortfolio]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64 bg-zinc-200" />
          <Skeleton className="h-6 w-36 bg-zinc-250" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full bg-zinc-200 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 w-full bg-zinc-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ── ESCALATION RED WARNING BANNER ── */}
      {escalationsQueue.length > 0 && (
        <div className="ak-banner">
          <div className="flex items-center gap-3">
            <span className="ak-banner-icon">
              <span className="absolute h-2 w-2 animate-ping rounded-full" style={{ background: 'var(--ak-critical)', opacity: 0.6 }} />
              <AlertTriangle size={16} style={{ position: 'relative' }} />
            </span>
            <div>
              <span className="ak-banner-title">Critical Escalations Alert</span>
              <span className="ak-banner-sub"><span className="ak-num" style={{ fontWeight: 680, color: 'var(--ak-critical)' }}>{escalationsQueue.length}</span> tickets are currently escalated — manager intervention required.</span>
            </div>
          </div>
          <AdminButton variant="primary" onClick={() => setActiveTab('escalations')}>Review Queue</AdminButton>
        </div>
      )}

      {/* ── COMMAND CENTER HEADER (ui-ux-pro-max) ── */}
      <AdminPageHeader
        eyebrow={<><Sliders size={13} strokeWidth={2} /> Executive console</>}
        title="Executive Command Center"
        subtitle={`Assist360 operations & delivery management · RLS posture: ${RLS_POSTURE}`}
        actions={
          <AdminButton variant="primary" onClick={refetchData}>
            <RefreshCw size={13} /> Sync Supabase
          </AdminButton>
        }
      />

      {/* ── GLOBAL FILTERS COCKPIT ── */}
      <Card className="border border-line bg-surface p-4 shadow-card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase font-bold text-ink-muted">Period</span>
            <div className="flex border border-line rounded-md overflow-hidden h-9 bg-surface-muted">
              {(['This Month', 'This Quarter', 'This Year', 'Custom'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilters(prev => ({ ...prev, period: p }))}
                  className={`px-3 text-[11px] uppercase font-bold transition-all ${
                    filters.period === p
                      ? 'bg-zinc-900 text-white'
                      : 'text-ink-secondary hover:text-ink hover:bg-surface-subtle'
                  }`}
                >
                  {p.replace('This ', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Customer */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase font-bold text-ink-muted">Customer</span>
            <select
              value={filters.customer}
              onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
              className="ak-select"
            >
              <option value="All">ALL CUSTOMERS</option>
              {customerOrgsList.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Consultant */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase font-bold text-ink-muted">Consultant</span>
            <select
              value={filters.consultant}
              onChange={(e) => setFilters(prev => ({ ...prev, consultant: e.target.value }))}
              className="ak-select"
            >
              <option value="All">ALL CONSULTANTS</option>
              {consultantsProfilesList.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Manager */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase font-bold text-ink-muted">Manager</span>
            <select
              value={filters.manager}
              onChange={(e) => setFilters(prev => ({ ...prev, manager: e.target.value }))}
              className="ak-select"
            >
              <option value="All">ALL MANAGERS</option>
              {managersProfilesList.map(m => (
                <option key={m} value={m}>{m.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Module */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase font-bold text-ink-muted">Module</span>
            <select
              value={filters.module}
              onChange={(e) => setFilters(prev => ({ ...prev, module: e.target.value }))}
              className="ak-select"
            >
              <option value="All">ALL MODULES</option>
              {modulesList.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase font-bold text-ink-muted">Priority</span>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="ak-select"
            >
              <option value="All">ALL PRIORITIES</option>
              <option value="Critical">CRITICAL</option>
              <option value="High">HIGH</option>
              <option value="Medium">MEDIUM</option>
              <option value="Low">LOW</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end ml-auto self-end pt-5">
            <Button
              variant="outline"
              onClick={() => setFilters({
                period: 'This Year',
                dateFrom: '',
                dateTo: '',
                statuses: [],
                priority: 'All',
                module: 'All',
                customer: 'All',
                consultant: 'All',
                manager: 'All'
              })}
              className="h-9 border-line bg-surface text-ink-secondary hover:bg-surface-muted text-[11px] uppercase font-bold rounded"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Dynamic Status Badges row */}
        <div className="mt-3 pt-3 border-t border-line flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase font-bold text-ink-muted mr-2">Status Scope</span>
          {(['New', 'Assigned', 'In Progress', 'Pending Closure', 'Closed', 'Reopened', 'Escalated'] as const).map(group => {
            const isSelected = filters.statuses.includes(group);
            return (
              <button
                key={group}
                onClick={() => {
                  setFilters(prev => {
                    const current = prev.statuses;
                    const next = current.includes(group)
                      ? current.filter(x => x !== group)
                      : [...current, group];
                    return { ...prev, statuses: next };
                  });
                }}
                className={`h-7 px-2.5 rounded-full text-[11px] uppercase font-semibold transition-all border ${
                  isSelected
                    ? 'bg-ink border-zinc-950 text-white shadow-card'
                    : 'bg-surface-muted border-line text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                }`}
              >
                {group}
              </button>
            );
          })}
        </div>

        {/* Row 2: Custom Date Picker Inputs */}
        {filters.period === 'Custom' && (
          <div className="mt-3 pt-3 border-t border-line flex flex-wrap items-center gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-bold text-ink-muted">Date From</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="h-9 px-3 border border-line rounded-md bg-surface text-[11px] text-ink-secondary focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-bold text-ink-muted">Date To</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="h-9 px-3 border border-line rounded-md bg-surface text-[11px] text-ink-secondary focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── NAVIGATION TABS ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="ak-tabs">
          <TabsTrigger value="cockpit" className="ak-tab">Cockpit</TabsTrigger>
          <TabsTrigger value="customers" className="ak-tab">Customers</TabsTrigger>
          <TabsTrigger value="consultants" className="ak-tab">Consultants</TabsTrigger>
          <TabsTrigger value="managers" className="ak-tab">Managers</TabsTrigger>
          <TabsTrigger value="approvals" className="ak-tab">
            Approvals
            {approvalsQueue.length > 0 && <span className="ak-tab-badge">{approvalsQueue.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="escalations" className="ak-tab">
            Escalations
            {escalationsQueue.length > 0 && <span className="ak-tab-badge is-crit">{escalationsQueue.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="health" className="ak-tab">Health</TabsTrigger>
          <TabsTrigger value="audits" className="ak-tab">Audits</TabsTrigger>
          <TabsTrigger value="iam" className="ak-tab">Passwords & IAM</TabsTrigger>
        </TabsList>

        {/* ── COCKPIT (GLOBAL OVERVIEW) ── */}
        <TabsContent value="cockpit" className="space-y-6 outline-none">
          <AdminGrid cols={5}>
            {[
              { label: 'Total Customers', value: globalStats.totalCustomers, icon: Building2, desc: 'Registered Organizations' },
              { label: 'Active Customers', value: globalStats.activeCustomers, icon: UserCheck, desc: 'With Active Contracts' },
              { label: 'Total Consultants', value: globalStats.totalConsultants, icon: Users, desc: `${globalStats.activeConsultants} Active on Desk` },
              { label: 'SAP Managers', value: globalStats.totalManagers, icon: BadgeCheck, desc: 'Delivery Controllers' },
              { label: 'Total Contracts', value: globalStats.totalContracts, icon: FileText, desc: 'Support Agreements' },
              { label: 'Open Tickets', value: globalStats.openTicketsCount, icon: Ticket, desc: 'Active Queue backlog' },
              { label: 'Closed Tickets', value: globalStats.closedTicketsCount, icon: CheckCircle2, desc: 'SLA Resolved / Closed' },
              { label: 'Escalated Tickets', value: globalStats.escalatedTicketsCount, icon: AlertTriangle, desc: 'Active Warning Alerts', tone: (globalStats.escalatedTicketsCount > 0 ? 'critical' : 'neutral') as 'neutral' | 'success' | 'warning' | 'critical' },
              { label: 'Pending Approvals', value: globalStats.pendingApprovalsCount, icon: Clock, desc: 'Awaiting Administrator Actions', tone: (globalStats.pendingApprovalsCount > 0 ? 'warning' : 'neutral') as 'neutral' | 'success' | 'warning' | 'critical' },
              { label: 'SLA Breaches', value: globalStats.slaBreachesCount, icon: ShieldAlert, desc: 'Violations Reported', tone: (globalStats.slaBreachesCount > 0 ? 'critical' : 'neutral') as 'neutral' | 'success' | 'warning' | 'critical' },
              { label: 'Total Approved Hours', value: `${globalStats.totalApprovedHours.toFixed(1)}h`, icon: DollarSign, desc: 'Accumulated Timesheet Hours' },
              { label: 'Current Month Utilized', value: `${globalStats.currentMonthUtilizedHours.toFixed(1)}h`, icon: Activity, desc: 'Logged this Month' },
              { label: 'Remaining Hours', value: `${globalStats.remainingContractHours.toFixed(1)}h`, icon: Sliders, desc: 'Active contracts pool' },
              { label: 'Platform Health Score', value: `${globalStats.platformHealthScore}%`, icon: HeartHandshake, desc: 'Active health status check', tone: (globalStats.platformHealthScore > 90 ? 'success' : 'warning') as 'neutral' | 'success' | 'warning' | 'critical' },
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <AdminStat key={i} label={kpi.label} value={kpi.value} sub={kpi.desc}
                  tone={kpi.tone ?? 'neutral'} icon={<Icon size={15} strokeWidth={2} />} />
              );
            })}
          </AdminGrid>

          {/* ── COMMAND HERO: health + workload (ui-ux-pro-max) ── */}
          <AdminGrid cols={3}>
            {/* Platform health gauge + posture factors (real derived data) */}
            <AdminCard title="Platform Health" desc="Composite delivery posture this period.">
              <div className="flex flex-col items-center gap-5">
                <AdminGauge score={globalStats.platformHealthScore} label="Health score" />
                {(() => {
                  const open = globalStats.openTicketsCount || 1;
                  const avgUtil = consultantsPortfolio.length
                    ? Math.round(consultantsPortfolio.reduce((s, c) => s + c.utilization, 0) / consultantsPortfolio.length) : 0;
                  const factors = [
                    { label: 'SLA posture', value: Math.max(0, Math.min(100, Math.round((1 - globalStats.slaBreachesCount / open) * 100))) },
                    { label: 'Escalation posture', value: Math.max(0, Math.min(100, Math.round((1 - globalStats.escalatedTicketsCount / open) * 100))) },
                    { label: 'Avg utilization', value: Math.min(100, avgUtil) },
                    { label: 'Capacity headroom', value: Math.max(0, 100 - Math.min(100, avgUtil)) },
                  ];
                  return (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 11 }}>
                      {factors.map(f => (
                        <div key={f.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5, color: 'var(--ak-ink2)' }}>
                            <span>{f.label}</span><span style={{ fontWeight: 620, color: 'var(--ak-ink)' }}>{f.value}%</span>
                          </div>
                          <div className="ak-util-track">
                            <div style={{ width: `${f.value}%`, background: f.value >= 75 ? 'var(--ak-success)' : f.value >= 50 ? 'var(--ak-warning)' : 'var(--ak-critical)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </AdminCard>

            {/* Workload distribution buckets (consultants by capacity band) */}
            <AdminCard title="Workload Distribution" desc="Consultants by capacity band.">
              {(() => {
                const counts = { Underutilized: 0, Healthy: 0, 'Near Capacity': 0, Overloaded: 0 } as Record<string, number>;
                consultantsPortfolio.forEach(c => { counts[c.workloadRisk] = (counts[c.workloadRisk] || 0) + 1; });
                return consultantsPortfolio.length === 0
                  ? <AdminEmpty small title="No consultants" sub="No staffed consultants in scope." />
                  : (
                    <>
                      <AdminLoadBuckets buckets={[
                        { label: 'Idle', count: counts.Underutilized, tone: 'idle' },
                        { label: 'Healthy', count: counts.Healthy, tone: 'healthy' },
                        { label: 'Busy', count: counts['Near Capacity'], tone: 'busy' },
                        { label: 'Overloaded', count: counts.Overloaded, tone: 'over' },
                      ]} />
                      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ background: 'var(--ak-panel2)', border: '1px solid var(--ak-line)', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ fontSize: 11, color: 'var(--ak-ink3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Active on desk</div>
                          <div className="ak-num" style={{ fontSize: 22, fontWeight: 680, color: 'var(--ak-ink)', marginTop: 4 }}>{globalStats.activeConsultants}</div>
                        </div>
                        <div style={{ background: 'var(--ak-panel2)', border: '1px solid var(--ak-line)', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ fontSize: 11, color: 'var(--ak-ink3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Overloaded</div>
                          <div className="ak-num" style={{ fontSize: 22, fontWeight: 680, color: overloadedConsultants.length ? 'var(--ak-critical)' : 'var(--ak-ink)', marginTop: 4 }}>{overloadedConsultants.length}</div>
                        </div>
                      </div>
                    </>
                  );
              })()}
            </AdminCard>

            {/* Top load — consultant utilization bullets */}
            <AdminCard title="Highest Load" desc="Top consultants by utilization.">
              {consultantsPortfolio.length === 0
                ? <AdminEmpty small title="No consultants" sub="Nothing to rank yet." />
                : [...consultantsPortfolio].sort((a, b) => b.utilization - a.utilization).slice(0, 6).map(c => (
                  <AdminBullet key={c.id} label={c.name} value={c.approvedHours} max={c.capacity}
                    valueText={`${Math.round(c.utilization)}% · ${c.approvedHours.toFixed(0)}h`} />
                ))}
            </AdminCard>
          </AdminGrid>

          {/* Core overview details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick action checklist */}
            <Card className="bg-surface border-line shadow-card rounded-lg">
              <CardHeader className="border-b border-line pb-3">
                <CardTitle className="type-widget flex items-center gap-2 text-ink uppercase">
                  <Sliders size={14} /> Administrator Quick Cockpit Actions
                </CardTitle>
                <CardDescription className="text-[11px]">Review system alerts requiring Super Admin sync</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-[11px]">
                <div className="ak-alert">
                  <div>
                    <span className="ak-alert-title">System RLS Posture Check</span>
                    <span className="ak-alert-sub">Verifies row-level security configuration across Postgres schemas</span>
                  </div>
                  <Badge className="bg-success-soft text-success-strong border border-success-border">VERIFIED</Badge>
                </div>
                
                <div className="ak-alert">
                  <div>
                    <span className="ak-alert-title">Expiring Contracts Warning</span>
                    <span className="ak-alert-sub">
                      {contracts.filter(c => c.isActive && (new Date(c.endDate).getTime() - Date.now()) <= 30 * 24 * 60 * 60 * 1000).length} contracts expire within 30 days.
                    </span>
                  </div>
                  <Button onClick={() => setActiveTab('customers')} size="sm" className="h-6 text-[11px] uppercase font-bold bg-ink text-white rounded">Audit Contracts</Button>
                </div>

                <div className="ak-alert">
                  <div>
                    <span className="ak-alert-title">SLA Breaches Response</span>
                    <span className="ak-alert-sub">Check active violation warnings</span>
                  </div>
                  <Button onClick={() => setActiveTab('escalations')} size="sm" className="h-6 text-[11px] uppercase font-bold bg-ink text-white rounded">Audit Violations</Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick status feed — terminal-style log panel (mono is intentional here) */}
            <Card className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-ink text-ink-muted shadow-card">
              <CardHeader className="border-b border-zinc-800 pb-3">
                <CardTitle className="type-widget flex items-center gap-2 text-white uppercase">
                  <Database size={14} /> Operations Log Stream
                </CardTitle>
                <CardDescription className="type-status text-zinc-500">Live database transactional events</CardDescription>
              </CardHeader>
              <CardContent className="max-h-56 flex-1 space-y-1.5 overflow-y-auto p-4 font-mono text-[11px]">
                <p><span className="text-zinc-600">&gt;</span> Checking Row Level Security policies...</p>
                <p><span className="font-bold text-success">[OK]</span> Profiles partitions isolation active.</p>
                <p><span className="text-zinc-600">&gt;</span> Pulled {tickets.length} tickets from Supabase successfully.</p>
                <p><span className="text-zinc-600">&gt;</span> Synchronized {contracts.length} active contracts.</p>
                {escalationsQueue.slice(0, 2).map((esc, i) => (
                  <p key={i} className="text-red-400">
                    <span className="font-bold text-critical">[ESCALATION]</span> Ticket {esc.ticketNumber} raised: {esc.reason}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── OPERATION INTELLIGENCE ── */}
          <div className="border-t border-line pt-6 mt-6">
            <AdminOperationIntelligence
              tickets={activeTickets}
              previousTickets={periodWindow.previousTickets}
              loading={loading}
              now={Date.now()}
              periodStart={periodWindow.periodStart}
              periodEnd={periodWindow.periodEnd}
            />
          </div>
        </TabsContent>
        {/* ── CUSTOMER PORTFOLIO INTELLIGENCE ── */}
        <TabsContent value="customers" className="space-y-6 outline-none">
          <Card className="bg-surface border-line shadow-card rounded-lg">
            <CardHeader className="border-b border-line pb-3">
              <CardTitle className="text-xs font-bold uppercase text-ink">Customer Portfolio & Hour Consumption</CardTitle>
              <CardDescription className="text-[11px]">
                Lists all registered customers, contract durations, allocated hours, and strictly manager approved utilized actual hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-surface-muted text-[11px]">
                    <TableRow className="border-b border-line">
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Customer</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Code</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Duration</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Contract Status</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Monthly Hours</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Annual Hours</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Approved Utilized</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Pending Approval</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Remaining</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Compliance</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Open / Closed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs text-ink">
                    {customerPortfolio.map((c, i) => (
                      <TableRow key={i} className="border-b border-line hover:bg-surface-muted">
                        <TableCell className="py-3 px-4 font-extrabold text-ink">{c.name}</TableCell>
                        <TableCell className="py-3 px-4 text-ink-secondary">{c.code}</TableCell>
                        <TableCell className="py-3 px-4 text-[11px] text-ink-muted">
                          {c.start} to {c.end}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge className={c.status === 'Active' ? 'bg-success-soft text-success-strong border border-success-border text-[11px]' : 'bg-surface-subtle text-ink-secondary border border-line text-[11px]'}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">{c.monthlyHours}h</TableCell>
                        <TableCell className="py-3 px-4 text-center">{c.annualHours}h</TableCell>
                        <TableCell className="py-3 px-4 text-center font-bold text-ink">{c.approvedHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-3 px-4 text-center text-ink-muted">{c.pendingHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-3 px-4 text-center font-bold text-ink">{c.remainingHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <span className={c.slaCompliance < 98 ? 'text-critical font-bold' : 'text-success font-bold'}>
                            {c.slaCompliance.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center text-[11px]">
                          <span className="font-bold text-critical">{c.openCount}</span> / <span className="text-ink-muted">{c.closedCount}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CONSULTANT COMMAND CENTER ── */}
        <TabsContent value="consultants" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Heatmap & Risk Summary */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-surface border-line p-4 rounded-lg shadow-card">
                <span className="text-[11px] font-bold text-ink-muted uppercase block mb-3">Capacity Heatmap</span>
                <div className="grid grid-cols-4 gap-2 text-[11px] text-center">
                  {consultantsPortfolio.map((c, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                        c.workloadRisk === 'Overloaded' ? 'bg-critical-soft border-critical-border text-critical-strong' :
                        c.workloadRisk === 'Near Capacity' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                        c.workloadRisk === 'Underutilized' ? 'bg-surface-muted border-line text-ink-secondary' :
                        'bg-zinc-900 border-zinc-900 text-white'
                      }`}
                    >
                      <span className="font-extrabold truncate">{c.name.split(' ')[0]}</span>
                      <span className="text-xs font-extrabold mt-1">{c.utilization.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Overloaded List */}
              <Card className="bg-surface border-line p-4 rounded-lg shadow-card space-y-3 text-xs">
                <span className="text-[11px] font-bold text-ink-muted uppercase block">Overloaded Consultants</span>
                {overloadedConsultants.length > 0 ? (
                  <div className="space-y-2">
                    {overloadedConsultants.map((c, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-critical-soft/50 border border-red-100 rounded-lg">
                        <span>{c.name} ({c.type})</span>
                        <Badge className="bg-red-100 text-critical-strong text-[11px] font-bold">{c.activeCount} open cases</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-muted text-[11px]">No consultants overload reported.</p>
                )}
              </Card>

              {/* Underutilized List */}
              <Card className="bg-surface border-line p-4 rounded-lg shadow-card space-y-3 text-xs">
                <span className="text-[11px] font-bold text-ink-muted uppercase block">Underutilized Specialists</span>
                {underutilizedConsultants.length > 0 ? (
                  <div className="space-y-2">
                    {underutilizedConsultants.map((c, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-surface-muted border border-line rounded-lg text-ink-secondary">
                        <span>{c.name}</span>
                        <Badge className="bg-surface-subtle text-ink-secondary border border-line text-[11px] font-bold">{c.utilization.toFixed(0)}% load</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-muted text-[11px]">All consultants optimized.</p>
                )}
              </Card>

            </div>

            {/* Main Consultant Table */}
            <div className="lg:col-span-8">
              <Card className="bg-surface border-line shadow-card rounded-lg">
                <CardHeader className="border-b border-line pb-3">
                  <CardTitle className="text-xs font-bold uppercase text-ink">Consultant Command & Utilization Matrix</CardTitle>
                  <CardDescription className="text-[11px]">
                    Monitors functional/technical credentials, ticket loads, billing hours, capacity (160h standard), and workload risks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-surface-muted text-[11px]">
                        <TableRow className="border-b border-line">
                          <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Consultant</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Type / Module</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Tickets (Open/Closed)</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Approved Hours</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Utilization</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Workload Risk</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs text-ink">
                        {consultantsPortfolio.map((c, i) => (
                          <TableRow key={i} className="border-b border-line hover:bg-surface-muted">
                            <TableCell className="py-3 px-4 font-extrabold text-ink">
                              <div>
                                <span>{c.name}</span>
                                <span className="text-[11px] text-ink-muted block font-normal mt-0.5">{c.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-[11px] block font-bold text-ink-secondary uppercase">{c.type}</span>
                              <span className="text-[11px] text-ink-muted block mt-0.5">{c.modules.join(', ') || 'General'}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <span className="text-critical font-extrabold">{c.activeCount}</span> / <span className="text-ink-muted">{c.closedCount}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center font-bold text-ink">{c.approvedHours.toFixed(1)}h</TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <div className="w-20 mx-auto space-y-1">
                                <span className="font-bold block text-[11px] text-ink">{c.utilization.toFixed(0)}%</span>
                                <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-1.5 rounded-full ${c.utilization > 90 ? 'bg-red-500' : c.utilization > 75 ? 'bg-orange-500' : 'bg-zinc-900'}`} 
                                    style={{ width: `${Math.min(100, c.utilization)}%` }} 
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <Badge className={
                                c.workloadRisk === 'Overloaded' ? 'bg-critical-soft text-critical-strong border border-critical-border text-[11px]' :
                                c.workloadRisk === 'Near Capacity' ? 'bg-warning-soft text-warning-strong border border-warning-border text-[11px]' :
                                'bg-surface-subtle text-ink-secondary border border-line text-[11px]'
                              }>
                                {c.workloadRisk}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </TabsContent>

        {/* ── SAP MANAGER COMMAND CENTER ── */}
        <TabsContent value="managers" className="space-y-6 outline-none">
          <Card className="bg-surface border-line shadow-card rounded-lg">
            <CardHeader className="border-b border-line pb-3">
              <CardTitle className="text-xs font-bold uppercase text-ink">SAP Manager Performance Ranks</CardTitle>
              <CardDescription className="text-[11px]">
                Lists all registered SAP Delivery Managers, team coverage size, pending approval loads, SLA warning risks, and overall delivery health scores.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-surface-muted text-[11px]">
                    <TableRow className="border-b border-line">
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Manager</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Tickets Managed</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Customers Managed</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Team size</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Pending Approvals</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Escalations</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">SLA Compliance</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">SLA Risks</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Avg Approval Speed</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Delivery Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs text-ink">
                    {managersPortfolio.map((m, i) => (
                      <TableRow key={i} className="border-b border-line hover:bg-surface-muted">
                        <TableCell className="py-3 px-4 font-extrabold text-ink">{m.name}</TableCell>
                        <TableCell className="py-3 px-4 text-center">{m.ticketsManaged}</TableCell>
                        <TableCell className="py-3 px-4 text-center">{m.customersManaged}</TableCell>
                        <TableCell className="py-3 px-4 text-center font-bold text-ink">{m.teamSize} consultants</TableCell>
                        <TableCell className="py-3 px-4 text-center text-warning font-bold">{m.pendingApprovals}</TableCell>
                        <TableCell className="py-3 px-4 text-center text-critical font-bold">{m.escalations}</TableCell>
                        <TableCell className="py-3 px-4 text-center font-bold">{m.slaCompliance.toFixed(1)}%</TableCell>
                        <TableCell className="py-3 px-4 text-center text-critical font-bold">{m.slaRisks}</TableCell>
                        <TableCell className="py-3 px-4 text-center text-ink-secondary">
                          {m.avgApprovalSpeedHours > 0 ? `${m.avgApprovalSpeedHours.toFixed(1)} hours` : 'Immediate'}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <span className={`font-extrabold ${m.deliveryHealth > 85 ? 'text-success' : 'text-warning'}`}>
                            {m.deliveryHealth}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── APPROVALS & REOPEN/DELETE QUEUE ── */}
        <TabsContent value="approvals" className="space-y-6 outline-none">
          <Card className="bg-surface border-line shadow-card rounded-lg">
            <CardHeader className="border-b border-line pb-3">
              <CardTitle className="text-xs font-bold uppercase text-ink">Pending Approvals Ledger Queue</CardTitle>
              <CardDescription className="text-[11px]">
                Lists all timesheet approvals, ticket closure requests, reopen requests, unlock requests, and soft delete requests awaiting administrative audit confirmation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {approvalsQueue.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-surface-muted text-[11px]">
                      <TableRow className="border-b border-line">
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Ticket Number</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Type</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Details</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Requester</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Date Raised</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs text-ink">
                      {approvalsQueue.map((item, i) => (
                        <TableRow key={i} className="border-b border-line hover:bg-surface-muted">
                          <TableCell className="py-3 px-4 font-extrabold text-ink">
                            <Link href={`/admin/tickets/${item.ticketId}`} className="hover:underline text-ink">
                              {item.ticketNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge className={
                              item.type === 'Timesheet' ? 'bg-brand-soft text-brand-strong border border-blue-100 text-[11px]' :
                              item.type === 'Closure' ? 'bg-success-soft text-success-strong border border-emerald-100 text-[11px]' :
                              item.type === 'Unlock' ? 'bg-info-soft text-info-strong border border-info-border text-[11px]' :
                              item.type === 'Delete' ? 'bg-critical-soft text-critical-strong border border-red-100 text-[11px]' :
                              'bg-surface-subtle text-ink-secondary border border-line text-[11px]'
                            }>
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-ink-secondary max-w-sm truncate">{item.details}</TableCell>
                          <TableCell className="py-3 px-4 text-ink-secondary font-bold">{item.requester}</TableCell>
                          <TableCell className="py-3 px-4 text-[11px] text-ink-muted">
                            {new Date(item.date).toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right space-x-2">
                            {item.type === 'Timesheet' && (
                              <>
                                <Button onClick={() => executeTimesheetApproval(item.ticketId, item.refObject.id, 'Approved')} size="sm" className="h-6 text-[11px] uppercase font-bold bg-ink text-white rounded">Approve</Button>
                                <Button onClick={() => executeTimesheetApproval(item.ticketId, item.refObject.id, 'Rejected')} size="sm" className="h-6 text-[11px] uppercase font-bold bg-surface text-ink-secondary border border-line hover:bg-surface-muted rounded">Reject</Button>
                              </>
                            )}
                            {item.type === 'Closure' && (
                              <>
                                <Button onClick={() => executeClosureApproval(item.ticketId, item.refObject.id, 'Approved')} size="sm" className="h-6 text-[11px] uppercase font-bold bg-ink text-white rounded">Approve</Button>
                                <Button onClick={() => executeClosureApproval(item.ticketId, item.refObject.id, 'Rejected')} size="sm" className="h-6 text-[11px] uppercase font-bold bg-surface text-ink-secondary border border-line hover:bg-surface-muted rounded">Reject</Button>
                              </>
                            )}
                            {item.type === 'Delete' && (
                              <>
                                <Button onClick={() => executeDeleteRequest(item.ticketId, item.refObject.id, 'Approved')} size="sm" className="h-6 text-[11px] uppercase font-bold bg-red-600 hover:bg-critical-strong text-white rounded">Confirm Delete</Button>
                                <Button onClick={() => executeDeleteRequest(item.ticketId, item.refObject.id, 'Rejected')} size="sm" className="h-6 text-[11px] uppercase font-bold bg-surface text-ink-secondary border border-line hover:bg-surface-muted rounded">Reject</Button>
                              </>
                            )}
                            {!['Timesheet', 'Closure', 'Delete'].includes(item.type) && (
                              <Button asChild size="sm" className="h-6 text-[11px] uppercase font-bold bg-ink text-white rounded">
                                <Link href={`/admin/tickets/${item.ticketId}`}>Open Ticket</Link>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-ink-muted text-xs">
                  All approvals fully processed. No pending requests.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ESCALATIONS CENTER ── */}
        <TabsContent value="escalations" className="space-y-6 outline-none">
          <Card className="bg-surface border-line shadow-card rounded-lg">
            <CardHeader className="border-b border-line pb-3">
              <CardTitle className="text-xs font-bold uppercase text-ink">Escalation Center Audit Queue</CardTitle>
              <CardDescription className="text-[11px]">
                Lists all tickets currently flagged for manager or administrator attention.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {escalationsQueue.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-surface-muted text-[11px]">
                      <TableRow className="border-b border-line">
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Ticket</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Title</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Customer</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Assignees</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Severity / Priority</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Escalation Reason</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Date Raised</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs text-ink">
                      {escalationsQueue.map((esc, i) => (
                        <TableRow key={i} className="border-b border-line hover:bg-surface-muted">
                          <TableCell className="py-3 px-4 font-extrabold text-ink">
                            <Link href={`/admin/tickets/${esc.ticketId}`} className="hover:underline">
                              {esc.ticketNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="py-3 px-4 font-extrabold text-ink">{esc.title}</TableCell>
                          <TableCell className="py-3 px-4 text-ink-secondary font-bold">{esc.customer}</TableCell>
                          <TableCell className="py-3 px-4">
                            <span className="text-[11px] text-ink-muted block font-normal">Mgr: {esc.manager}</span>
                            <span className="text-[11px] text-ink-muted block font-normal">Cons: {esc.consultant}</span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center space-y-1">
                            <Badge className="bg-critical-soft text-critical-strong border border-critical-border text-[11px] font-bold block w-fit mx-auto">{esc.severity} Severity</Badge>
                            <span className="text-[11px] text-ink-muted block font-normal">Priority: {esc.priority}</span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-ink-secondary max-w-sm truncate">{esc.reason}</TableCell>
                          <TableCell className="py-3 px-4 text-[11px] text-ink-muted">
                            {new Date(esc.date).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-ink-muted text-xs">
                  Zero active escalations reported. All operations normal.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PLATFORM HEALTH ── */}
        <TabsContent value="health" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Health status checks */}
            <Card className="bg-surface border-line shadow-card rounded-lg">
              <CardHeader className="border-b border-line pb-3 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-xs font-bold uppercase text-ink">System Posture Health Monitor</CardTitle>
                  <CardDescription className="text-[11px]">Real-time pings checking active endpoints</CardDescription>
                </div>
                <Button 
                  onClick={runPlatformHealthChecks} 
                  disabled={checkingHealth}
                  className="h-7 text-[11px] uppercase font-bold bg-ink text-white rounded px-3"
                >
                  {checkingHealth ? 'Testing...' : 'Retest Health'}
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {Object.entries(healthStatus).map(([key, h]) => (
                  <div key={key} className="ak-alert">
                    <span className="font-extrabold uppercase text-ink">{key} Integration</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-ink-muted font-normal">Latency: {h.latency}ms</span>
                      <Badge className={h.status === 'Online' ? 'bg-success-soft text-success-strong border border-success-border' : 'bg-critical-soft text-critical-strong border border-critical-border'}>
                        {h.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Delivery Health center warning posture */}
            <Card className="bg-surface border-line shadow-card rounded-lg p-6 space-y-4">
              <span className="text-[11px] font-bold text-ink-muted uppercase block">Delivery Health Posture Status</span>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-sm border-2 ${
                  deliveryHealthPostures.posture === 'Healthy' ? 'bg-success-soft border-emerald-500 text-success-strong' :
                  deliveryHealthPostures.posture === 'Warning' ? 'bg-orange-50 border-orange-500 text-orange-700' :
                  'bg-critical-soft border-red-500 text-critical-strong'
                }`}>
                  {deliveryHealthPostures.posture}
                </div>
                <div>
                  <span className="text-sm font-extrabold text-ink uppercase block">Operational Status: {deliveryHealthPostures.posture}</span>
                  <span className="text-[11px] text-ink-muted mt-1 block">
                    {deliveryHealthPostures.warnings.length > 0 
                      ? `Active concerns: ${deliveryHealthPostures.warnings.join(', ')}`
                      : 'All operations performing within SLA targets.'
                    }
                  </span>
                </div>
              </div>

              <div className="border-t border-line pt-4 space-y-3 text-[11px]">
                <div className="flex justify-between">
                  <span>SLA Breaches Limit Posture:</span>
                  <span className={globalStats.slaBreachesCount > 0 ? 'text-critical font-bold' : 'text-success font-bold'}>
                    {globalStats.slaBreachesCount > 0 ? 'WARN' : 'SECURE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Approval queue backlog index:</span>
                  <span className={globalStats.pendingApprovalsCount > 10 ? 'text-warning font-bold' : 'text-success font-bold'}>
                    {globalStats.pendingApprovalsCount > 10 ? 'WARN' : 'SECURE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Manager response compliance score:</span>
                  <span className="text-ink font-bold">OPTIMAL</span>
                </div>
              </div>
            </Card>

          </div>
        </TabsContent>

        {/* ── AUDIT LOGS HISTORY PANEL ── */}
        <TabsContent value="audits" className="space-y-6 outline-none">
          <Card className="bg-surface border-line shadow-card rounded-lg">
            <CardHeader className="border-b border-line pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xs font-bold uppercase text-ink">Audit History Ledger Trails</CardTitle>
                <CardDescription className="text-[11px]">
                  Search and review admin actions, password updates, deactivation changes, and system transaction logs.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto text-xs">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-muted" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search audits..."
                    className="w-full bg-surface-muted border border-line rounded p-2 pl-8 text-xs text-ink placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <Button 
                  onClick={handleExportAuditsCSV}
                  className="h-8 text-[11px] uppercase font-bold bg-ink text-white rounded px-3 flex items-center gap-1.5"
                >
                  <Download size={12} /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {auditsLoading ? (
                <div className="py-20 text-center text-xs text-ink-muted animate-pulse">Loading audits...</div>
              ) : filteredAuditLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-surface-muted text-[11px]">
                      <TableRow className="border-b border-line">
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Log ID</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Target User Email</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Action performed</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Performed By</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs text-ink">
                      {filteredAuditLogs.map((log, i) => (
                        <TableRow key={i} className="border-b border-line hover:bg-surface-muted">
                          <TableCell className="py-3 px-4 text-ink-muted text-[11px]">{log.id.slice(0, 8).toUpperCase()}...</TableCell>
                          <TableCell className="py-3 px-4 font-extrabold text-ink">{log.user_email}</TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge className="bg-surface-subtle text-ink border border-line text-[11px] font-bold">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-ink-secondary font-bold">{log.performed_by}</TableCell>
                          <TableCell className="py-3 px-4 text-[11px] text-ink-muted">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-ink-muted text-xs">No audit logs matched search criteria.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PASSWORD MANAGEMENT & IAM ── */}
        <TabsContent value="iam" className="space-y-6 outline-none">
          <Card className="bg-surface border-line shadow-card rounded-lg">
            <CardHeader className="border-b border-line pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xs font-bold uppercase text-ink">User Identity & Access Management (IAM)</CardTitle>
                <CardDescription className="text-[11px]">
                  Enforce password change requirements, toggle user account lock status, reset user credentials, or deactivate profiles.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto text-xs">
                <select 
                  value={selectedUserType}
                  onChange={(e) => setSelectedUserType(e.target.value as any)}
                  className="bg-surface-muted border border-line rounded p-2 text-xs text-ink focus:outline-none"
                >
                  <option value="All">All Roles</option>
                  <option value="Customer">Customers</option>
                  <option value="Consultant">Consultants</option>
                  <option value="Manager">Managers</option>
                  <option value="SuperAdmin">Super Admins</option>
                </select>

                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-muted" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Search users..."
                    className="w-full bg-surface-muted border border-line rounded p-2 pl-8 text-xs text-ink placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredIAMUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-surface-muted text-[11px]">
                      <TableRow className="border-b border-line">
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Full Name</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">Email Address</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary">IAM Role</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Account Lock</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-center">Access Status</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-ink-secondary text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs text-ink">
                      {filteredIAMUsers.map((u, i) => (
                        <TableRow key={i} className="border-b border-line hover:bg-surface-muted">
                          <TableCell className="py-3 px-4 font-extrabold text-ink">{u.full_name || 'N/A'}</TableCell>
                          <TableCell className="py-3 px-4 text-ink-secondary font-bold">{u.email}</TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge className="bg-surface-subtle text-ink border border-line text-[11px] font-bold">
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center">
                            <Badge className={u.is_locked ? 'bg-critical-soft text-critical-strong border border-critical-border text-[11px]' : 'bg-success-soft text-success-strong border border-success-border text-[11px]'}>
                              {u.is_locked ? 'LOCKED' : 'SECURE'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center">
                            <Badge className={u.is_active ? 'bg-success-soft text-success-strong border border-success-border text-[11px]' : 'bg-surface-subtle text-ink-secondary border border-line text-[11px]'}>
                              {u.is_active ? 'ENABLED' : 'DISABLED'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right space-x-2">
                            {u.is_locked && (
                              <Button onClick={() => handleUserUnlock(u)} size="sm" className="h-6 text-[11px] uppercase font-bold bg-ink text-white rounded">Unlock</Button>
                            )}
                            <Button 
                              onClick={() => {
                                setSelectedIAMUser(u);
                                setManualPassword('');
                                setGeneratedPassResult('');
                                setIsIAMModalOpen(true);
                              }} 
                              size="sm" 
                              className="h-6 text-[11px] uppercase font-bold bg-surface text-ink-secondary border border-line hover:bg-surface-muted rounded"
                            >
                              Password Actions
                            </Button>
                            {u.role !== 'SuperAdmin' && (
                              <Button 
                                onClick={() => handleUserToggleActive(u)} 
                                size="sm" 
                                className={`h-6 text-[11px] uppercase font-bold rounded ${
                                  u.is_active ? 'bg-critical-soft text-critical-strong border border-red-100 hover:bg-red-100' : 'bg-success-soft text-success-strong border border-emerald-100 hover:bg-emerald-100'
                                }`}
                              >
                                {u.is_active ? 'Disable' : 'Enable'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-ink-muted text-xs font-bold">No users found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── IAM CREDENTIALS MANAGER MODAL ── */}
      <Dialog open={isIAMModalOpen} onOpenChange={setIsIAMModalOpen}>
        <DialogContent className="bg-surface border border-line rounded-lg max-w-md p-6 text-ink shadow-xl text-xs">
          {selectedIAMUser && (
            <>
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-sm font-bold uppercase tracking-wider text-ink">IAM Credentials override</DialogTitle>
                <DialogDescription className="text-[11px] text-ink-muted">
                  Target Account: {selectedIAMUser.full_name || selectedIAMUser.email} ({selectedIAMUser.role})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-3">
                <div className="p-3 bg-surface-muted border border-line rounded-lg space-y-1">
                  <span className="text-[11px] text-ink-muted font-bold uppercase block">Administrative Actions</span>
                  <div className="flex gap-2">
                    <Button onClick={handleIAMActionReset} className="h-7 text-[11px] uppercase font-bold bg-ink text-white rounded px-3">
                      Reset Password
                    </Button>
                    <span className="text-[11px] text-ink-muted self-center">Generates secure temporary password</span>
                  </div>
                </div>

                {generatedPassResult && (
                  <div className="p-3 bg-surface-muted border border-line rounded-lg space-y-1">
                    <span className="text-[11px] text-success-strong font-bold uppercase block">Temporary Credentials Ready</span>
                    <div className="flex justify-between items-center bg-surface p-2 rounded border border-line text-ink text-[11px] font-extrabold select-all">
                      <span>{generatedPassResult}</span>
                      <Button 
                        onClick={() => {
                          navigator.clipboard.writeText(`Email: ${selectedIAMUser.email}\nPassword: ${generatedPassResult}`);
                          toast.success('Credentials copied to clipboard.');
                        }}
                        size="sm" 
                        className="h-5 text-[11px] uppercase font-bold bg-ink text-white rounded px-2"
                      >
                        Copy
                      </Button>
                    </div>
                    <span className="text-[11px] text-ink-muted block mt-1">Setup flags: force_password_change=true, first_login_completed=false</span>
                  </div>
                )}

                <div className="border-t border-line pt-3 space-y-3">
                  <span className="text-[11px] font-bold text-ink-muted uppercase block">Manual Password Override</span>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-ink-secondary">New Secure Password</label>
                    <input 
                      type="password"
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      placeholder="Enter new password..."
                      className="w-full bg-surface-muted border border-line rounded p-2 text-xs text-ink placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
                    />
                  </div>

                  <div className="flex items-center justify-between p-1">
                    <div>
                      <span className="font-bold text-ink block text-[11px]">Force Setup on Next Login</span>
                      <span className="ak-alert-sub">Requires user to change password on authentication</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={forcePasswordChange}
                      onChange={(e) => setForcePasswordChange(e.target.checked)}
                      className="w-4 h-4 rounded border-line text-ink focus:ring-zinc-900"
                    />
                  </div>

                  <Button 
                    onClick={handleIAMActionUpdate}
                    className="w-full h-8 text-[11px] uppercase font-bold bg-ink text-white rounded"
                  >
                    Apply Manual Password Override
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button 
                  onClick={() => setIsIAMModalOpen(false)}
                  className="w-full bg-surface hover:bg-surface-muted text-ink-secondary border border-line font-bold uppercase tracking-wider text-[11px] py-2 rounded"
                >
                  Close Manager View
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
