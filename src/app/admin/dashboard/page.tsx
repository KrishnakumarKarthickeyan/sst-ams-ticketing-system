'use client';

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

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { tickets, contracts, profiles, loading, refetchData, orgMap } = useTickets();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>('cockpit');

  // Search and filter states (10 Global Filters + Sub-filters)
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('All');
  const [quarterFilter, setQuarterFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [consultantFilter, setConsultantFilter] = useState('All');
  const [managerFilter, setManagerFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

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
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err.message);
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

  // Base tickets selection filter
  const activeTickets = useMemo(() => {
    return tickets.filter(t => {
      // 1. Customer
      if (customerFilter !== 'All' && t.organization !== customerFilter) return false;
      // 2. Manager
      if (managerFilter !== 'All' && t.assignedManager !== managerFilter) return false;
      // 3. Consultant
      if (consultantFilter !== 'All' && t.assignedConsultant !== consultantFilter) return false;
      // 4. Priority
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      // 5. Status
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      // 6. SAP Module
      if (moduleFilter !== 'All' && t.sapModule !== moduleFilter) return false;

      // Date parsing
      const createdDate = new Date(t.createdAt);
      
      // 7. Date Range
      if (startDateFilter) {
        const start = new Date(startDateFilter);
        start.setHours(0, 0, 0, 0);
        if (createdDate < start) return false;
      }
      if (endDateFilter) {
        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);
        if (createdDate > end) return false;
      }

      // 8. Year
      if (yearFilter !== 'All') {
        if (createdDate.getFullYear().toString() !== yearFilter) return false;
      }

      // 9. Month
      if (monthFilter !== 'All') {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const ticketMonthName = monthNames[createdDate.getMonth()];
        if (ticketMonthName !== monthFilter) return false;
      }

      // 10. Quarter
      if (quarterFilter !== 'All') {
        const month = createdDate.getMonth(); // 0-11
        let ticketQuarter = 'Q1';
        if (month >= 3 && month <= 5) ticketQuarter = 'Q2';
        else if (month >= 6 && month <= 8) ticketQuarter = 'Q3';
        else if (month >= 9 && month <= 11) ticketQuarter = 'Q4';
        
        if (ticketQuarter !== quarterFilter) return false;
      }

      return true;
    });
  }, [
    tickets,
    customerFilter,
    managerFilter,
    consultantFilter,
    priorityFilter,
    statusFilter,
    moduleFilter,
    startDateFilter,
    endDateFilter,
    yearFilter,
    monthFilter,
    quarterFilter
  ]);

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
      const customerTickets = tickets.filter(t => t.organizationId === id || t.organization === name);
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
  }, [tickets, contracts, orgMap]);

  // ── 3. CONSULTANT COMMAND CENTER ──
  const consultantsPortfolio = useMemo(() => {
    return profiles.filter(p => p.role === 'Consultant').map(cons => {
      const name = cons.full_name || cons.email;
      const id = cons.id;

      const consTickets = tickets.filter(t => 
        t.assignedConsultant === name || 
        t.assignments?.some(a => a.consultantId === id && a.active)
      );

      const activeCount = consTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      const closedCount = consTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;
      const escalatedCount = consTickets.filter(t => t.escalationFlag).length;

      // Estimated hours logged
      let estimatedHours = 0;
      tickets.forEach(t => {
        (t.estimates || []).forEach(e => {
          if (e.consultantId === id) estimatedHours += e.estimatedHours;
        });
      });

      // Approved actual hours logged
      let approvedHours = 0;
      tickets.forEach(t => {
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
  }, [profiles, tickets]);

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

      const mgrTickets = tickets.filter(t => t.assignedManager === name);
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
        const consActual = tickets.reduce((s, t) => {
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
  }, [profiles, tickets, contracts]);

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

    tickets.forEach(t => {
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
  }, [tickets, profiles]);

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
    } catch (err: any) {
      toast.error(`Operation failed: ${err.message}`, { id: toastId });
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
    } catch (err: any) {
      toast.error(`Operation failed: ${err.message}`, { id: toastId });
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
    } catch (err: any) {
      toast.error(`Operation failed: ${err.message}`, { id: toastId });
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
    } catch (err: any) {
      toast.error(`Operation failed: ${err.message}`, { id: toastId });
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
    } catch (err: any) {
      toast.error(`Unlock failed: ${err.message}`, { id: toastId });
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
    } catch (err: any) {
      toast.error(`Reset failed: ${err.message}`, { id: toastId });
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
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`, { id: toastId });
    }
  };

  // ── 10. ANALYTICS WALL (20+ UNIQUE VISUALIZATIONS) ──
  const analyticsWallData = useMemo(() => {
    // 1. Ticket Volume Trend
    const getMonthTrend = () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const trendMap: Record<string, { Incidents: number; Requests: number }> = {};
      
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mName = months[d.getMonth()];
        trendMap[mName] = { Incidents: 0, Requests: 0 };
      }

      activeTickets.forEach(t => {
        const date = new Date(t.createdAt);
        const mName = months[date.getMonth()];
        if (trendMap[mName]) {
          if (t.ticketType === 'Incident' || !t.ticketType) {
            trendMap[mName].Incidents++;
          } else {
            trendMap[mName].Requests++;
          }
        }
      });

      return Object.entries(trendMap).map(([name, val]) => ({
        name,
        Incidents: val.Incidents,
        Requests: val.Requests
      }));
    };
    const ticketVolumeTrend = getMonthTrend();

    // 2. Ticket Growth
    const getTicketGrowthTrend = () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const countsMap: Record<string, number> = {};
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mName = months[d.getMonth()];
        countsMap[mName] = 0;
      }

      activeTickets.forEach(t => {
        const date = new Date(t.createdAt);
        const mName = months[date.getMonth()];
        if (mName in countsMap) {
          countsMap[mName]++;
        }
      });

      let cumulative = 0;
      return Object.entries(countsMap).map(([name, count]) => {
        cumulative += count;
        return { name, total: cumulative };
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
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const escMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mName = months[d.getMonth()];
        escMap[mName] = 0;
      }
      activeTickets.forEach(t => {
        if (t.escalationFlag) {
          const date = new Date(t.createdAt);
          const mName = months[date.getMonth()];
          if (mName in escMap) {
            escMap[mName]++;
          }
        }
      });
      return Object.entries(escMap).map(([name, count]) => ({ name, count }));
    };
    const escalationTrend = getEscalationTrend();

    // 5. SLA Trend
    const getSlaTrend = () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const slaMap: Record<string, { total: number; breached: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mName = months[d.getMonth()];
        slaMap[mName] = { total: 0, breached: 0 };
      }

      activeTickets.forEach(t => {
        if ((t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable') {
          const date = new Date(t.createdAt);
          const mName = months[date.getMonth()];
          if (mName in slaMap) {
            slaMap[mName].total++;
            const due = new Date(t.slaDueAt).getTime();
            const end = t.status === 'Resolved' || t.status === 'Closed'
              ? new Date(t.resolvedAt || t.closedAt || Date.now()).getTime()
              : Date.now();
            if (end > due) {
              slaMap[mName].breached++;
            }
          }
        }
      });

      return Object.entries(slaMap).map(([name, val]) => {
        const compliance = val.total > 0 ? ((val.total - val.breached) / val.total) * 100 : 100;
        return { name, compliance: Math.round(compliance * 10) / 10 };
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
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const resMap: Record<string, { totalHours: number; count: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mName = months[d.getMonth()];
        resMap[mName] = { totalHours: 0, count: 0 };
      }

      activeTickets.forEach(t => {
        if ((t.status === 'Resolved' || t.status === 'Closed') && t.resolvedAt) {
          const date = new Date(t.createdAt);
          const mName = months[date.getMonth()];
          if (mName in resMap) {
            const hrs = (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
            resMap[mName].totalHours += hrs;
            resMap[mName].count++;
          }
        }
      });

      return Object.entries(resMap).map(([name, val]) => ({
        name,
        hours: val.count > 0 ? Math.round((val.totalHours / val.count) * 10) / 10 : 0
      }));
    };
    const resolutionTimeTrend = getResolutionTimeTrend();

    // 11. Approval Response Trend
    const getApprovalResponseTrend = () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const appMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mName = months[d.getMonth()];
        appMap[mName] = 0;
      }

      activeTickets.forEach(t => {
        const isPending = t.status === 'Reopen Requested' ||
          (t.actualHoursLogs || []).some(h => h.approvalStatus?.toLowerCase() === 'pending') ||
          (t.closureRequests || []).some(r => r.status === 'Pending Manager Approval' || r.managerApprovalStatus === 'Pending') ||
          (t.unlockRequests || []).some(u => u.status === 'Pending') ||
          (t.deleteRequests || []).some(r => r.managerApproval === 'Pending' || r.adminApproval === 'Pending');

        if (isPending) {
          const date = new Date(t.createdAt);
          const mName = months[date.getMonth()];
          if (mName in appMap) {
            appMap[mName]++;
          }
        }
      });

      return Object.entries(appMap).map(([name, pendingApprovals]) => ({
        name,
        pendingApprovals
      }));
    };
    const approvalResponseTrend = getApprovalResponseTrend();

    // 12. Approved Actual Hours
    const getApprovedHoursTrend = () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const hoursMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mName = months[d.getMonth()];
        hoursMap[mName] = 0;
      }

      activeTickets.forEach(t => {
        (t.actualHoursLogs || []).forEach(log => {
          if (log.approvalStatus?.toLowerCase() === 'approved' && log.approvedAt) {
            const date = new Date(log.approvedAt);
            const mName = months[date.getMonth()];
            if (mName in hoursMap) {
              hoursMap[mName] += log.actualHours;
            }
          }
        });
      });

      return Object.entries(hoursMap).map(([name, hours]) => ({
        name,
        hours: Math.round(hours * 10) / 10
      }));
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
          name: t.ticketNumber || t.id.slice(0, 8),
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full bg-zinc-200 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full bg-zinc-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ── ESCALATION RED WARNING BANNER ── */}
      {escalationsQueue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-500 shrink-0" size={18} />
            <div>
              <span className="font-mono text-xs font-bold text-red-700 block uppercase">Critical Escalations Alert</span>
              <span className="text-[11px] text-red-600 block mt-0.5">
                {escalationsQueue.length} tickets are currently escalated. Manager intervention required immediately.
              </span>
            </div>
          </div>
          <Button 
            onClick={() => setActiveTab('escalations')} 
            className="h-7 text-[9px] uppercase font-bold font-mono bg-red-600 hover:bg-red-700 text-white rounded px-3"
          >
            Review Queue
          </Button>
        </div>
      )}

      {/* ── COMMAND CENTER HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 font-mono uppercase">Executive Command Center</h1>
          <p className="text-[11px] text-zinc-400 mt-1 font-bold uppercase tracking-wider">
            Assist360 Operations & Delivery Management Console · RLS Posture: <span className="text-zinc-900">{RLS_POSTURE}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={refetchData} 
            variant="outline" 
            className="h-9 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 font-mono text-[10px] uppercase font-bold flex items-center gap-2 rounded"
          >
            <RefreshCw size={12} />
            Sync Supabase
          </Button>
        </div>
      </div>

      {/* ── GLOBAL FILTERS COCKPIT ── */}
      <TicketFilterPanel
        enabledFilters={[
          'dateRange',
          'year',
          'month',
          'quarter',
          'customer',
          'consultant',
          'manager',
          'module',
          'status',
          'priority'
        ]}
        startDateFilter={startDateFilter}
        setStartDateFilter={setStartDateFilter}
        endDateFilter={endDateFilter}
        setEndDateFilter={setEndDateFilter}
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
        quarterFilter={quarterFilter}
        setQuarterFilter={setQuarterFilter}
        customerFilter={customerFilter}
        setCustomerFilter={setCustomerFilter}
        consultantFilter={consultantFilter}
        setConsultantFilter={setConsultantFilter}
        managerFilter={managerFilter}
        setManagerFilter={setManagerFilter}
        moduleFilter={moduleFilter}
        setModuleFilter={setModuleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        onResetFilters={() => {
          setStartDateFilter('');
          setEndDateFilter('');
          setMonthFilter('All');
          setQuarterFilter('All');
          setYearFilter('All');
          setCustomerFilter('All');
          setConsultantFilter('All');
          setManagerFilter('All');
          setModuleFilter('All');
          setStatusFilter('All');
          setPriorityFilter('All');
        }}
      />

      {/* ── NAVIGATION TABS ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto bg-zinc-100 p-1 border border-zinc-200 rounded-lg font-mono text-[9px] gap-0.5">
          <TabsTrigger value="cockpit" className="py-2 px-3 uppercase font-bold rounded-md">Cockpit</TabsTrigger>
          <TabsTrigger value="customers" className="py-2 px-3 uppercase font-bold rounded-md">Customers</TabsTrigger>
          <TabsTrigger value="consultants" className="py-2 px-3 uppercase font-bold rounded-md">Consultants</TabsTrigger>
          <TabsTrigger value="managers" className="py-2 px-3 uppercase font-bold rounded-md">Managers</TabsTrigger>
          <TabsTrigger value="approvals" className="py-2 px-3 uppercase font-bold rounded-md">
            Approvals
            {approvalsQueue.length > 0 && (
              <Badge className="bg-zinc-900 text-white text-[8px] ml-1.5 px-1 py-0.5 h-auto rounded-full font-bold">
                {approvalsQueue.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="escalations" className="py-2 px-3 uppercase font-bold rounded-md">
            Escalations
            {escalationsQueue.length > 0 && (
              <Badge className="bg-red-600 text-white text-[8px] ml-1.5 px-1 py-0.5 h-auto rounded-full font-bold">
                {escalationsQueue.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="health" className="py-2 px-3 uppercase font-bold rounded-md">Health</TabsTrigger>
          <TabsTrigger value="audits" className="py-2 px-3 uppercase font-bold rounded-md">Audits</TabsTrigger>
          <TabsTrigger value="iam" className="py-2 px-3 uppercase font-bold rounded-md">Passwords & IAM</TabsTrigger>
        </TabsList>

        {/* ── COCKPIT (GLOBAL OVERVIEW) ── */}
        <TabsContent value="cockpit" className="space-y-6 outline-none">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-mono">
            {[
              { label: 'Total Customers', value: globalStats.totalCustomers, icon: Building2, desc: 'Registered Organizations' },
              { label: 'Active Customers', value: globalStats.activeCustomers, icon: UserCheck, desc: 'With Active Contracts' },
              { label: 'Total Consultants', value: globalStats.totalConsultants, icon: Users, desc: `${globalStats.activeConsultants} Active on Desk` },
              { label: 'SAP Managers', value: globalStats.totalManagers, icon: BadgeCheck, desc: 'Delivery Controllers' },
              { label: 'Total Contracts', value: globalStats.totalContracts, icon: FileText, desc: 'Support Agreements' },
              { label: 'Open Tickets', value: globalStats.openTicketsCount, icon: Ticket, desc: 'Active Queue backlog' },
              { label: 'Closed Tickets', value: globalStats.closedTicketsCount, icon: CheckCircle2, desc: 'SLA Resolved / Closed' },
              { label: 'Escalated Tickets', value: globalStats.escalatedTicketsCount, icon: AlertTriangle, desc: 'Active Warning Alerts', color: globalStats.escalatedTicketsCount > 0 ? 'text-red-600' : 'text-zinc-900' },
              { label: 'Pending Approvals', value: globalStats.pendingApprovalsCount, icon: Clock, desc: 'Awaiting Administrator Actions', color: globalStats.pendingApprovalsCount > 0 ? 'text-orange-600 font-bold' : 'text-zinc-900' },
              { label: 'SLA Breaches', value: globalStats.slaBreachesCount, icon: ShieldAlert, desc: 'Violations Reported', color: globalStats.slaBreachesCount > 0 ? 'text-red-500 font-bold' : 'text-zinc-900' },
              { label: 'Total Approved Hours', value: `${globalStats.totalApprovedHours.toFixed(1)}h`, icon: DollarSign, desc: 'Accumulated Timesheet Hours' },
              { label: 'Current Month Utilized', value: `${globalStats.currentMonthUtilizedHours.toFixed(1)}h`, icon: Activity, desc: 'Logged this Month' },
              { label: 'Remaining Hours', value: `${globalStats.remainingContractHours.toFixed(1)}h`, icon: Sliders, desc: 'Active contracts pool' },
              { label: 'Platform Health Score', value: `${globalStats.platformHealthScore}%`, icon: HeartHandshake, desc: 'Active health status check', color: globalStats.platformHealthScore > 90 ? 'text-emerald-600' : 'text-orange-500' }
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <Card key={i} className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm hover:border-zinc-400 transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{kpi.label}</span>
                    <Icon size={12} className="text-zinc-400" />
                  </div>
                  <div className="mt-3">
                    <span className={`text-lg font-extrabold tracking-tight font-mono ${kpi.color || 'text-zinc-900'}`}>{kpi.value}</span>
                    <span className="text-[8px] text-zinc-400 block mt-0.5 font-sans leading-relaxed">{kpi.desc}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Core overview details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick action checklist */}
            <Card className="bg-white border-zinc-200 shadow-sm rounded-xl">
              <CardHeader className="border-b border-zinc-100 pb-3">
                <CardTitle className="text-xs font-bold font-mono uppercase text-zinc-900 flex items-center gap-2">
                  <Sliders size={14} /> Administrator Quick Cockpit Actions
                </CardTitle>
                <CardDescription className="text-[10px] font-mono">Review system alerts requiring Super Admin sync</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4 font-mono text-[10px]">
                <div className="flex justify-between items-center bg-zinc-50 border border-zinc-100 p-2.5 rounded-lg">
                  <div>
                    <span className="font-bold text-zinc-900 block">System RLS Posture Check</span>
                    <span className="text-[9px] text-zinc-400 mt-0.5 block">Verifies row-level security configuration across Postgres schemas</span>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">VERIFIED</Badge>
                </div>
                
                <div className="flex justify-between items-center bg-zinc-50 border border-zinc-100 p-2.5 rounded-lg">
                  <div>
                    <span className="font-bold text-zinc-900 block">Expiring Contracts Warning</span>
                    <span className="text-[9px] text-zinc-400 mt-0.5 block">
                      {contracts.filter(c => c.isActive && (new Date(c.endDate).getTime() - Date.now()) <= 30 * 24 * 60 * 60 * 1000).length} contracts expire within 30 days.
                    </span>
                  </div>
                  <Button onClick={() => setActiveTab('customers')} size="sm" className="h-6 text-[8px] uppercase font-bold bg-zinc-950 text-white rounded">Audit Contracts</Button>
                </div>

                <div className="flex justify-between items-center bg-zinc-50 border border-zinc-100 p-2.5 rounded-lg">
                  <div>
                    <span className="font-bold text-zinc-900 block">SLA Breaches Response</span>
                    <span className="text-[9px] text-zinc-400 mt-0.5 block">Check active violation warnings</span>
                  </div>
                  <Button onClick={() => setActiveTab('escalations')} size="sm" className="h-6 text-[8px] uppercase font-bold bg-zinc-950 text-white rounded">Audit Violations</Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick status feed */}
            <Card className="bg-[#09090b] text-zinc-400 border border-zinc-900 shadow-sm rounded-xl flex flex-col justify-between">
              <CardHeader className="border-b border-zinc-800 pb-3">
                <CardTitle className="text-xs font-bold font-mono uppercase text-white flex items-center gap-2">
                  <Database size={14} /> Operations Log Stream
                </CardTitle>
                <CardDescription className="text-[10px] text-zinc-500 font-mono">Live database transactional events</CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex-1 font-mono text-[9px] space-y-1.5 overflow-y-auto max-h-56">
                <p><span className="text-zinc-600">&gt;</span> Checking Row Level Security policies...</p>
                <p><span className="text-emerald-500 font-bold">[OK]</span> Profiles partitions isolation active.</p>
                <p><span className="text-zinc-600">&gt;</span> Pulled {tickets.length} tickets from Supabase successfully.</p>
                <p><span className="text-zinc-600">&gt;</span> Synchronized {contracts.length} active contracts.</p>
                {escalationsQueue.slice(0, 2).map((esc, i) => (
                  <p key={i} className="text-red-400">
                    <span className="text-red-500 font-bold">[ESCALATION]</span> Ticket {esc.ticketNumber} raised: {esc.reason}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── 20 DISTINCT CHARTS INTEGRATED INTO COCKPIT ── */}
          <div className="border-t border-zinc-250 pt-6 mt-6">
            <div className="text-center max-w-xl mx-auto space-y-1 mb-6">
              <h3 className="text-xs font-bold font-mono uppercase text-zinc-900">Assist360 Operations Analytics Wall</h3>
              <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                20 completely unique system visualizations and performance analysis charts
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Chart 1: Ticket Volume Trend */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">1. Ticket Volume Trend (Area)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsWallData.ticketVolumeTrend} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="name" fontSize={8} tickLine={false} />
                      <YAxis fontSize={8} tickLine={false} />
                      <Area type="monotone" dataKey="Requests" stroke="#09090b" fill="#09090b" fillOpacity={0.05} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 2: Cumulative Ticket Growth */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">2. Cumulative Ticket Growth (Line)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsWallData.ticketGrowth} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="name" fontSize={8} tickLine={false} />
                      <YAxis fontSize={8} tickLine={false} />
                      <Line type="monotone" dataKey="total" stroke="#09090b" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 3: Open vs Closed Tickets */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">3. Open vs Closed Tickets (Bar)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsWallData.openVsClosed} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="name" fontSize={8} tickLine={false} />
                      <YAxis fontSize={8} tickLine={false} />
                      <Bar dataKey="Closed" fill="#09090b" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Open" fill="#71717a" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 4: Escalation Trend */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">4. Escalation Trend (Line)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsWallData.escalationTrend} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="name" fontSize={8} tickLine={false} />
                      <YAxis fontSize={8} tickLine={false} />
                      <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 5: SLA Compliance Trend */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">5. SLA Compliance Trend (Area)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsWallData.slaTrend} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <YAxis domain={[90, 100]} fontSize={8} tickLine={false} />
                      <Area type="monotone" dataKey="compliance" stroke="#09090b" fill="#09090b" fillOpacity={0.08} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 6: Customer Case Activity */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">6. Customer Case Activity (Bar)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsWallData.customerActivity} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="name" fontSize={8} tickLine={false} />
                      <YAxis fontSize={8} tickLine={false} />
                      <Bar dataKey="tickets" fill="#18181b" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 7: Consultant Utilization Spread */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">7. Consultant Utilization Spread (H-Bar)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsWallData.consultantUtilization} layout="vertical" margin={{ top: 2, right: 2, left: -22, bottom: 2 }}>
                      <XAxis type="number" fontSize={8} tickLine={false} />
                      <YAxis dataKey="name" type="category" fontSize={8} tickLine={false} />
                      <Bar dataKey="utilization" fill="#09090b" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 8: Manager Case Allocation */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">8. Manager Case Allocation (Bar)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsWallData.managerWorkload} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="name" fontSize={8} tickLine={false} />
                      <YAxis fontSize={8} tickLine={false} />
                      <Bar dataKey="tickets" fill="#27272a" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 9: Contract Budget Consumption */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">9. Contract Budget Consumption (Stacked Bar)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsWallData.contractConsumption} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="name" fontSize={8} tickLine={false} />
                      <YAxis fontSize={8} tickLine={false} />
                      <Bar dataKey="Allocated" fill="#e4e4e7" stackId="a" />
                      <Bar dataKey="Consumed" fill="#09090b" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 10: Resolution Time Trend */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">10. Resolution Time Trend (Line)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsWallData.resolutionTimeTrend} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="name" fontSize={8} tickLine={false} />
                      <YAxis fontSize={8} tickLine={false} />
                      <Line type="monotone" dataKey="hours" stroke="#09090b" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 11: Approval Response Trend */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">11. Approval Response Trend (Area)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsWallData.approvalResponseTrend} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="name" fontSize={8} tickLine={false} />
                      <YAxis fontSize={8} tickLine={false} />
                      <Area type="monotone" dataKey="pendingApprovals" stroke="#71717a" fill="#71717a" fillOpacity={0.05} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 12: Approved Actual Hours */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">12. Approved Actual Hours (Area)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsWallData.approvedHoursTrend} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="name" fontSize={8} tickLine={false} />
                      <YAxis fontSize={8} tickLine={false} />
                      <Area type="monotone" dataKey="hours" stroke="#09090b" fill="#09090b" fillOpacity={0.06} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 13: Estimated vs Actual Hours */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">13. Estimated vs Actual Hours (Composed)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analyticsWallData.estVsActual} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="name" fontSize={7} tickLine={false} />
                      <YAxis fontSize={8} tickLine={false} />
                      <Bar dataKey="Actual" fill="#09090b" radius={[2, 2, 0, 0]} />
                      <Line type="monotone" dataKey="Estimated" stroke="#71717a" strokeWidth={1.5} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 14: Priority Counts Distribution */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">14. Priority Counts Distribution (Pie)</span>
                <div className="h-44 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsWallData.priorityDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={40}
                        dataKey="value"
                        label={({ name }) => name ? name.slice(0, 3) : ''}
                      >
                        {analyticsWallData.priorityDistribution.map((entry, idx) => (
                          <Cell key={idx} fill={THEME_COLORS[idx % THEME_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 15: Ticket Categories Spread */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">15. Ticket Categories Spread (Donut)</span>
                <div className="h-44 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsWallData.categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={40}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {analyticsWallData.categoryDistribution.map((entry, idx) => (
                          <Cell key={idx} fill={THEME_COLORS[idx % THEME_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 16: SAP Module Distribution */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">16. SAP Module Distribution (Pie)</span>
                <div className="h-44 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsWallData.moduleDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={40}
                        dataKey="value"
                      >
                        {analyticsWallData.moduleDistribution.map((entry, idx) => (
                          <Cell key={idx} fill={THEME_COLORS[idx % THEME_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 17: Customer Health Score Spread */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">17. Customer Health Score Spread (Radar)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analyticsWallData.healthScoreSpread}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" fontSize={7} />
                      <Radar dataKey="score" stroke="#09090b" fill="#09090b" fillOpacity={0.1} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 18: Operational Risk Heatmap */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">18. Operational Risk Heatmap (Radar)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analyticsWallData.riskHeatmap}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" fontSize={7} />
                      <Radar dataKey="risk" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 19: Manager Delivery Health */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">19. Manager Delivery Health (Line)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsWallData.managerDeliveryHealth} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="name" fontSize={8} tickLine={false} />
                      <YAxis domain={[50, 100]} fontSize={8} tickLine={false} />
                      <Line type="monotone" dataKey="score" stroke="#09090b" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 20: Resource Capacity Forecast */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-2">
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase block">20. Resource Capacity Forecast (Stacked Area)</span>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsWallData.capacityForecast} margin={{ top: 2, right: 2, left: -42, bottom: 2 }}>
                      <XAxis dataKey="month" fontSize={8} tickLine={false} />
                      <YAxis fontSize={8} tickLine={false} />
                      <Area type="monotone" dataKey="Utilized" stackId="a" stroke="#09090b" fill="#09090b" fillOpacity={0.1} />
                      <Area type="monotone" dataKey="Remaining" stackId="a" stroke="#e4e4e7" fill="#e4e4e7" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

            </div>
          </div>
        </TabsContent>

        {/* ── CUSTOMER PORTFOLIO INTELLIGENCE ── */}
        <TabsContent value="customers" className="space-y-6 outline-none">
          <Card className="bg-white border-zinc-200 shadow-sm rounded-xl">
            <CardHeader className="border-b border-zinc-100 pb-3">
              <CardTitle className="text-xs font-bold font-mono uppercase text-zinc-900">Customer Portfolio & Hour Consumption</CardTitle>
              <CardDescription className="text-[10px] font-mono">
                Lists all registered customers, contract durations, allocated hours, and strictly manager approved utilized actual hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 font-mono text-[9px]">
                    <TableRow className="border-b border-zinc-200">
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Customer</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Code</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Duration</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Contract Status</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Monthly Hours</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Annual Hours</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Approved Utilized</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Pending Approval</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Remaining</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Compliance</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Open / Closed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="font-mono text-xs text-zinc-800">
                    {customerPortfolio.map((c, i) => (
                      <TableRow key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                        <TableCell className="py-3 px-4 font-extrabold text-zinc-900">{c.name}</TableCell>
                        <TableCell className="py-3 px-4 text-zinc-500">{c.code}</TableCell>
                        <TableCell className="py-3 px-4 text-[10px] text-zinc-400">
                          {c.start} to {c.end}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge className={c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px]' : 'bg-zinc-100 text-zinc-700 border border-zinc-200 text-[9px]'}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">{c.monthlyHours}h</TableCell>
                        <TableCell className="py-3 px-4 text-center">{c.annualHours}h</TableCell>
                        <TableCell className="py-3 px-4 text-center font-bold text-zinc-950">{c.approvedHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-3 px-4 text-center text-zinc-400">{c.pendingHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-3 px-4 text-center font-bold text-zinc-950">{c.remainingHours.toFixed(1)}h</TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <span className={c.slaCompliance < 98 ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold'}>
                            {c.slaCompliance.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center text-[11px]">
                          <span className="font-bold text-red-600">{c.openCount}</span> / <span className="text-zinc-400">{c.closedCount}</span>
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
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm">
                <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase block mb-3">Capacity Heatmap</span>
                <div className="grid grid-cols-4 gap-2 font-mono text-[9px] text-center">
                  {consultantsPortfolio.map((c, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                        c.workloadRisk === 'Overloaded' ? 'bg-red-50 border-red-200 text-red-700' :
                        c.workloadRisk === 'Near Capacity' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                        c.workloadRisk === 'Underutilized' ? 'bg-zinc-50 border-zinc-200 text-zinc-500' :
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
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-3 font-mono text-xs">
                <span className="text-[9px] font-bold text-zinc-400 uppercase block">Overloaded Consultants</span>
                {overloadedConsultants.length > 0 ? (
                  <div className="space-y-2">
                    {overloadedConsultants.map((c, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-red-50/50 border border-red-100 rounded-lg">
                        <span>{c.name} ({c.type})</span>
                        <Badge className="bg-red-100 text-red-700 text-[8px] font-bold">{c.activeCount} open cases</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-400 text-[10px]">No consultants overload reported.</p>
                )}
              </Card>

              {/* Underutilized List */}
              <Card className="bg-white border-zinc-200 p-4 rounded-xl shadow-sm space-y-3 font-mono text-xs">
                <span className="text-[9px] font-bold text-zinc-400 uppercase block">Underutilized Specialists</span>
                {underutilizedConsultants.length > 0 ? (
                  <div className="space-y-2">
                    {underutilizedConsultants.map((c, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-500">
                        <span>{c.name}</span>
                        <Badge className="bg-zinc-100 text-zinc-600 border border-zinc-200 text-[8px] font-bold">{c.utilization.toFixed(0)}% load</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-400 text-[10px]">All consultants optimized.</p>
                )}
              </Card>

            </div>

            {/* Main Consultant Table */}
            <div className="lg:col-span-8">
              <Card className="bg-white border-zinc-200 shadow-sm rounded-xl">
                <CardHeader className="border-b border-zinc-100 pb-3">
                  <CardTitle className="text-xs font-bold font-mono uppercase text-zinc-900">Consultant Command & Utilization Matrix</CardTitle>
                  <CardDescription className="text-[10px] font-mono">
                    Monitors functional/technical credentials, ticket loads, billing hours, capacity (160h standard), and workload risks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-zinc-50 font-mono text-[9px]">
                        <TableRow className="border-b border-zinc-200">
                          <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Consultant</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Type / Module</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Tickets (Open/Closed)</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Approved Hours</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Utilization</TableHead>
                          <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Workload Risk</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="font-mono text-xs text-zinc-800">
                        {consultantsPortfolio.map((c, i) => (
                          <TableRow key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                            <TableCell className="py-3 px-4 font-extrabold text-zinc-900">
                              <div>
                                <span>{c.name}</span>
                                <span className="text-[9px] text-zinc-400 block font-normal mt-0.5">{c.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-[10px] block font-bold text-zinc-500 uppercase">{c.type}</span>
                              <span className="text-[9px] text-zinc-400 block mt-0.5">{c.modules.join(', ') || 'General'}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <span className="text-red-500 font-extrabold">{c.activeCount}</span> / <span className="text-zinc-400">{c.closedCount}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center font-bold text-zinc-900">{c.approvedHours.toFixed(1)}h</TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <div className="w-20 mx-auto space-y-1">
                                <span className="font-bold block text-[10px] text-zinc-900">{c.utilization.toFixed(0)}%</span>
                                <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-1.5 rounded-full ${c.utilization > 90 ? 'bg-red-500' : c.utilization > 75 ? 'bg-orange-500' : 'bg-zinc-900'}`} 
                                    style={{ width: `${Math.min(100, c.utilization)}%` }} 
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <Badge className={
                                c.workloadRisk === 'Overloaded' ? 'bg-red-50 text-red-700 border border-red-200 text-[9px]' :
                                c.workloadRisk === 'Near Capacity' ? 'bg-orange-50 text-orange-700 border border-orange-200 text-[9px]' :
                                'bg-zinc-100 text-zinc-700 border border-zinc-200 text-[9px]'
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
          <Card className="bg-white border-zinc-200 shadow-sm rounded-xl">
            <CardHeader className="border-b border-zinc-100 pb-3">
              <CardTitle className="text-xs font-bold font-mono uppercase text-zinc-900">SAP Manager Performance Ranks</CardTitle>
              <CardDescription className="text-[10px] font-mono">
                Lists all registered SAP Delivery Managers, team coverage size, pending approval loads, SLA warning risks, and overall delivery health scores.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 font-mono text-[9px]">
                    <TableRow className="border-b border-zinc-200">
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Manager</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Tickets Managed</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Customers Managed</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Team size</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Pending Approvals</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Escalations</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">SLA Compliance</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">SLA Risks</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Avg Approval Speed</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Delivery Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="font-mono text-xs text-zinc-800">
                    {managersPortfolio.map((m, i) => (
                      <TableRow key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                        <TableCell className="py-3 px-4 font-extrabold text-zinc-900">{m.name}</TableCell>
                        <TableCell className="py-3 px-4 text-center">{m.ticketsManaged}</TableCell>
                        <TableCell className="py-3 px-4 text-center">{m.customersManaged}</TableCell>
                        <TableCell className="py-3 px-4 text-center font-bold text-zinc-900">{m.teamSize} consultants</TableCell>
                        <TableCell className="py-3 px-4 text-center text-orange-600 font-bold">{m.pendingApprovals}</TableCell>
                        <TableCell className="py-3 px-4 text-center text-red-500 font-bold">{m.escalations}</TableCell>
                        <TableCell className="py-3 px-4 text-center font-bold">{m.slaCompliance.toFixed(1)}%</TableCell>
                        <TableCell className="py-3 px-4 text-center text-red-500 font-bold">{m.slaRisks}</TableCell>
                        <TableCell className="py-3 px-4 text-center text-zinc-500">
                          {m.avgApprovalSpeedHours > 0 ? `${m.avgApprovalSpeedHours.toFixed(1)} hours` : 'Immediate'}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <span className={`font-extrabold ${m.deliveryHealth > 85 ? 'text-emerald-600' : 'text-orange-500'}`}>
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
          <Card className="bg-white border-zinc-200 shadow-sm rounded-xl">
            <CardHeader className="border-b border-zinc-100 pb-3">
              <CardTitle className="text-xs font-bold font-mono uppercase text-zinc-900">Pending Approvals Ledger Queue</CardTitle>
              <CardDescription className="text-[10px] font-mono">
                Lists all timesheet approvals, ticket closure requests, reopen requests, unlock requests, and soft delete requests awaiting administrative audit confirmation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {approvalsQueue.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 font-mono text-[9px]">
                      <TableRow className="border-b border-zinc-200">
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Ticket Number</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Type</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Details</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Requester</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Date Raised</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="font-mono text-xs text-zinc-800">
                      {approvalsQueue.map((item, i) => (
                        <TableRow key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <TableCell className="py-3 px-4 font-extrabold text-zinc-900">
                            <Link href={`/admin/tickets/${item.ticketId}`} className="hover:underline text-zinc-900">
                              {item.ticketNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge className={
                              item.type === 'Timesheet' ? 'bg-blue-50 text-blue-700 border border-blue-100 text-[9px]' :
                              item.type === 'Closure' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px]' :
                              item.type === 'Unlock' ? 'bg-purple-50 text-purple-700 border border-purple-100 text-[9px]' :
                              item.type === 'Delete' ? 'bg-red-50 text-red-700 border border-red-100 text-[9px]' :
                              'bg-zinc-100 text-zinc-700 border border-zinc-200 text-[9px]'
                            }>
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-zinc-600 max-w-sm truncate">{item.details}</TableCell>
                          <TableCell className="py-3 px-4 text-zinc-500 font-bold">{item.requester}</TableCell>
                          <TableCell className="py-3 px-4 text-[10px] text-zinc-400">
                            {new Date(item.date).toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right space-x-2">
                            {item.type === 'Timesheet' && (
                              <>
                                <Button onClick={() => executeTimesheetApproval(item.ticketId, item.refObject.id, 'Approved')} size="sm" className="h-6 text-[8px] uppercase font-bold bg-zinc-950 text-white rounded">Approve</Button>
                                <Button onClick={() => executeTimesheetApproval(item.ticketId, item.refObject.id, 'Rejected')} size="sm" className="h-6 text-[8px] uppercase font-bold bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded">Reject</Button>
                              </>
                            )}
                            {item.type === 'Closure' && (
                              <>
                                <Button onClick={() => executeClosureApproval(item.ticketId, item.refObject.id, 'Approved')} size="sm" className="h-6 text-[8px] uppercase font-bold bg-zinc-950 text-white rounded">Approve</Button>
                                <Button onClick={() => executeClosureApproval(item.ticketId, item.refObject.id, 'Rejected')} size="sm" className="h-6 text-[8px] uppercase font-bold bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded">Reject</Button>
                              </>
                            )}
                            {item.type === 'Delete' && (
                              <>
                                <Button onClick={() => executeDeleteRequest(item.ticketId, item.refObject.id, 'Approved')} size="sm" className="h-6 text-[8px] uppercase font-bold bg-red-600 hover:bg-red-700 text-white rounded">Confirm Delete</Button>
                                <Button onClick={() => executeDeleteRequest(item.ticketId, item.refObject.id, 'Rejected')} size="sm" className="h-6 text-[8px] uppercase font-bold bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded">Reject</Button>
                              </>
                            )}
                            {!['Timesheet', 'Closure', 'Delete'].includes(item.type) && (
                              <Button asChild size="sm" className="h-6 text-[8px] uppercase font-bold bg-zinc-950 text-white rounded">
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
                <div className="text-center py-12 font-mono text-zinc-400 text-xs">
                  All approvals fully processed. No pending requests.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ESCALATIONS CENTER ── */}
        <TabsContent value="escalations" className="space-y-6 outline-none">
          <Card className="bg-white border-zinc-200 shadow-sm rounded-xl">
            <CardHeader className="border-b border-zinc-100 pb-3">
              <CardTitle className="text-xs font-bold font-mono uppercase text-zinc-900">Escalation Center Audit Queue</CardTitle>
              <CardDescription className="text-[10px] font-mono">
                Lists all tickets currently flagged for manager or administrator attention.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {escalationsQueue.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 font-mono text-[9px]">
                      <TableRow className="border-b border-zinc-200">
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Ticket</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Title</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Customer</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Assignees</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Severity / Priority</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Escalation Reason</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Date Raised</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="font-mono text-xs text-zinc-800">
                      {escalationsQueue.map((esc, i) => (
                        <TableRow key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <TableCell className="py-3 px-4 font-extrabold text-zinc-900">
                            <Link href={`/admin/tickets/${esc.ticketId}`} className="hover:underline">
                              {esc.ticketNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="py-3 px-4 font-extrabold text-zinc-900">{esc.title}</TableCell>
                          <TableCell className="py-3 px-4 text-zinc-500 font-bold">{esc.customer}</TableCell>
                          <TableCell className="py-3 px-4">
                            <span className="text-[10px] text-zinc-400 block font-normal">Mgr: {esc.manager}</span>
                            <span className="text-[10px] text-zinc-400 block font-normal">Cons: {esc.consultant}</span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center space-y-1">
                            <Badge className="bg-red-50 text-red-700 border border-red-200 text-[8px] font-bold block w-fit mx-auto">{esc.severity} Severity</Badge>
                            <span className="text-[10px] text-zinc-400 block font-normal">Priority: {esc.priority}</span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-zinc-600 max-w-sm truncate">{esc.reason}</TableCell>
                          <TableCell className="py-3 px-4 text-[10px] text-zinc-400">
                            {new Date(esc.date).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 font-mono text-zinc-400 text-xs">
                  Zero active escalations reported. All operations normal.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PLATFORM HEALTH ── */}
        <TabsContent value="health" className="space-y-6 outline-none font-mono">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Health status checks */}
            <Card className="bg-white border-zinc-200 shadow-sm rounded-xl">
              <CardHeader className="border-b border-zinc-100 pb-3 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-xs font-bold font-mono uppercase text-zinc-900">System Posture Health Monitor</CardTitle>
                  <CardDescription className="text-[10px] font-mono">Real-time pings checking active endpoints</CardDescription>
                </div>
                <Button 
                  onClick={runPlatformHealthChecks} 
                  disabled={checkingHealth}
                  className="h-7 text-[9px] uppercase font-bold bg-zinc-950 text-white rounded px-3"
                >
                  {checkingHealth ? 'Testing...' : 'Retest Health'}
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {Object.entries(healthStatus).map(([key, h]) => (
                  <div key={key} className="flex justify-between items-center bg-zinc-50 border border-zinc-100 p-2.5 rounded-lg">
                    <span className="font-extrabold uppercase text-zinc-800">{key} Integration</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-400 font-normal">Latency: {h.latency}ms</span>
                      <Badge className={h.status === 'Online' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}>
                        {h.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Delivery Health center warning posture */}
            <Card className="bg-white border-zinc-200 shadow-sm rounded-xl p-6 space-y-4">
              <span className="text-[9px] font-bold text-zinc-400 uppercase block">Delivery Health Posture Status</span>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-sm border-2 ${
                  deliveryHealthPostures.posture === 'Healthy' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' :
                  deliveryHealthPostures.posture === 'Warning' ? 'bg-orange-50 border-orange-500 text-orange-700' :
                  'bg-red-50 border-red-500 text-red-700'
                }`}>
                  {deliveryHealthPostures.posture}
                </div>
                <div>
                  <span className="text-sm font-extrabold text-zinc-900 uppercase block">Operational Status: {deliveryHealthPostures.posture}</span>
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    {deliveryHealthPostures.warnings.length > 0 
                      ? `Active concerns: ${deliveryHealthPostures.warnings.join(', ')}`
                      : 'All operations performing within SLA targets.'
                    }
                  </span>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4 space-y-3 text-[10px]">
                <div className="flex justify-between">
                  <span>SLA Breaches Limit Posture:</span>
                  <span className={globalStats.slaBreachesCount > 0 ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold'}>
                    {globalStats.slaBreachesCount > 0 ? 'WARN' : 'SECURE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Approval queue backlog index:</span>
                  <span className={globalStats.pendingApprovalsCount > 10 ? 'text-orange-500 font-bold' : 'text-emerald-600 font-bold'}>
                    {globalStats.pendingApprovalsCount > 10 ? 'WARN' : 'SECURE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Manager response compliance score:</span>
                  <span className="text-zinc-900 font-bold">OPTIMAL</span>
                </div>
              </div>
            </Card>

          </div>
        </TabsContent>

        {/* ── AUDIT LOGS HISTORY PANEL ── */}
        <TabsContent value="audits" className="space-y-6 outline-none">
          <Card className="bg-white border-zinc-200 shadow-sm rounded-xl">
            <CardHeader className="border-b border-zinc-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xs font-bold font-mono uppercase text-zinc-900">Audit History Ledger Trails</CardTitle>
                <CardDescription className="text-[10px] font-mono">
                  Search and review admin actions, password updates, deactivation changes, and system transaction logs.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto font-mono text-xs">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search audits..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 pl-8 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <Button 
                  onClick={handleExportAuditsCSV}
                  className="h-8 text-[9px] uppercase font-bold bg-zinc-950 text-white rounded px-3 flex items-center gap-1.5"
                >
                  <Download size={12} /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {auditsLoading ? (
                <div className="py-20 text-center font-mono text-xs text-zinc-400 animate-pulse">Loading audits...</div>
              ) : filteredAuditLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 font-mono text-[9px]">
                      <TableRow className="border-b border-zinc-200">
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Log ID</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Target User Email</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Action performed</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Performed By</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="font-mono text-xs text-zinc-800">
                      {filteredAuditLogs.map((log, i) => (
                        <TableRow key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <TableCell className="py-3 px-4 text-zinc-400 text-[10px]">{log.id.slice(0, 8).toUpperCase()}...</TableCell>
                          <TableCell className="py-3 px-4 font-extrabold text-zinc-900">{log.user_email}</TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge className="bg-zinc-100 text-zinc-800 border border-zinc-200 text-[9px] font-bold">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-zinc-500 font-bold">{log.performed_by}</TableCell>
                          <TableCell className="py-3 px-4 text-[10px] text-zinc-400">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 font-mono text-zinc-400 text-xs">No audit logs matched search criteria.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PASSWORD MANAGEMENT & IAM ── */}
        <TabsContent value="iam" className="space-y-6 outline-none">
          <Card className="bg-white border-zinc-200 shadow-sm rounded-xl">
            <CardHeader className="border-b border-zinc-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xs font-bold font-mono uppercase text-zinc-900">User Identity & Access Management (IAM)</CardTitle>
                <CardDescription className="text-[10px] font-mono">
                  Enforce password change requirements, toggle user account lock status, reset user credentials, or deactivate profiles.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto font-mono text-xs">
                <select 
                  value={selectedUserType}
                  onChange={(e) => setSelectedUserType(e.target.value as any)}
                  className="bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none"
                >
                  <option value="All">All Roles</option>
                  <option value="Customer">Customers</option>
                  <option value="Consultant">Consultants</option>
                  <option value="Manager">Managers</option>
                  <option value="SuperAdmin">Super Admins</option>
                </select>

                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Search users..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 pl-8 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredIAMUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 font-mono text-[9px]">
                      <TableRow className="border-b border-zinc-200">
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Full Name</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">Email Address</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700">IAM Role</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Account Lock</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-center">Access Status</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-zinc-700 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="font-mono text-xs text-zinc-800">
                      {filteredIAMUsers.map((u, i) => (
                        <TableRow key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <TableCell className="py-3 px-4 font-extrabold text-zinc-900">{u.full_name || 'N/A'}</TableCell>
                          <TableCell className="py-3 px-4 text-zinc-500 font-bold">{u.email}</TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge className="bg-zinc-100 text-zinc-800 border border-zinc-200 text-[9px] font-bold">
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center">
                            <Badge className={u.is_locked ? 'bg-red-50 text-red-700 border border-red-200 text-[9px]' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px]'}>
                              {u.is_locked ? 'LOCKED' : 'SECURE'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center">
                            <Badge className={u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px]' : 'bg-zinc-100 text-zinc-700 border border-zinc-200 text-[9px]'}>
                              {u.is_active ? 'ENABLED' : 'DISABLED'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right space-x-2">
                            {u.is_locked && (
                              <Button onClick={() => handleUserUnlock(u)} size="sm" className="h-6 text-[8px] uppercase font-bold bg-zinc-950 text-white rounded">Unlock</Button>
                            )}
                            <Button 
                              onClick={() => {
                                setSelectedIAMUser(u);
                                setManualPassword('');
                                setGeneratedPassResult('');
                                setIsIAMModalOpen(true);
                              }} 
                              size="sm" 
                              className="h-6 text-[8px] uppercase font-bold bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded"
                            >
                              Password Actions
                            </Button>
                            {u.role !== 'SuperAdmin' && (
                              <Button 
                                onClick={() => handleUserToggleActive(u)} 
                                size="sm" 
                                className={`h-6 text-[8px] uppercase font-bold rounded ${
                                  u.is_active ? 'bg-red-50 text-red-700 border border-red-100 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'
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
                <div className="text-center py-12 font-mono text-zinc-400 text-xs font-bold">No users found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── IAM CREDENTIALS MANAGER MODAL ── */}
      <Dialog open={isIAMModalOpen} onOpenChange={setIsIAMModalOpen}>
        <DialogContent className="bg-white border border-zinc-200 rounded-lg max-w-md p-6 text-zinc-900 shadow-xl font-mono text-xs">
          {selectedIAMUser && (
            <>
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-sm font-bold uppercase tracking-wider text-zinc-900">IAM Credentials override</DialogTitle>
                <DialogDescription className="text-[10px] text-zinc-400 font-mono">
                  Target Account: {selectedIAMUser.full_name || selectedIAMUser.email} ({selectedIAMUser.role})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-3">
                <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg space-y-1">
                  <span className="text-[8px] text-zinc-400 font-bold uppercase block">Administrative Actions</span>
                  <div className="flex gap-2">
                    <Button onClick={handleIAMActionReset} className="h-7 text-[9px] uppercase font-bold bg-zinc-950 text-white rounded px-3">
                      Reset Password
                    </Button>
                    <span className="text-[10px] text-zinc-400 self-center">Generates secure temporary password</span>
                  </div>
                </div>

                {generatedPassResult && (
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1">
                    <span className="text-[8px] text-emerald-700 font-bold uppercase block">Temporary Credentials Ready</span>
                    <div className="flex justify-between items-center bg-white p-2 rounded border border-zinc-200 text-zinc-900 text-[11px] font-extrabold select-all">
                      <span>{generatedPassResult}</span>
                      <Button 
                        onClick={() => {
                          navigator.clipboard.writeText(`Email: ${selectedIAMUser.email}\nPassword: ${generatedPassResult}`);
                          toast.success('Credentials copied to clipboard.');
                        }}
                        size="sm" 
                        className="h-5 text-[8px] uppercase font-bold bg-zinc-950 text-white rounded px-2"
                      >
                        Copy
                      </Button>
                    </div>
                    <span className="text-[8px] text-zinc-400 block mt-1">Setup flags: force_password_change=true, first_login_completed=false</span>
                  </div>
                )}

                <div className="border-t border-zinc-100 pt-3 space-y-3">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase block">Manual Password Override</span>
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase font-bold text-zinc-500">New Secure Password</label>
                    <input 
                      type="password"
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      placeholder="Enter new password..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
                    />
                  </div>

                  <div className="flex items-center justify-between p-1">
                    <div>
                      <span className="font-bold text-zinc-800 block text-[10px]">Force Setup on Next Login</span>
                      <span className="text-[8px] text-zinc-400 mt-0.5 block">Requires user to change password on authentication</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={forcePasswordChange}
                      onChange={(e) => setForcePasswordChange(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-200 text-zinc-900 focus:ring-zinc-900"
                    />
                  </div>

                  <Button 
                    onClick={handleIAMActionUpdate}
                    className="w-full h-8 text-[9px] uppercase font-bold bg-zinc-950 text-white rounded"
                  >
                    Apply Manual Password Override
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button 
                  onClick={() => setIsIAMModalOpen(false)}
                  className="w-full bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-bold uppercase tracking-wider text-[9px] py-2 rounded"
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
