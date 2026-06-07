'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTickets } from '../../../context/TicketContext';
import { useAuth } from '../../../context/AuthContext';
import { getConsultantDashboardData, filterTicketsByScope } from '../../../utils/dashboardService';
import Link from 'next/link';
import {
  Clock,
  Activity,
  CheckCircle,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  FileText,
  AlertCircle,
  XCircle,
  Building2,
  FolderOpen,
  ArrowUpRight,
  HelpCircle,
  DollarSign,
  FileSpreadsheet,
  Award,
  ShieldCheck,
  RotateCcw,
  Unlock,
  Lock,
  Hourglass,
  Percent,
  User,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  Download,
  Cpu,
  Zap,
  ChevronRight,
  User2
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { Skeleton } from '../../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

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

export default function ConsultantDashboardPage() {
  const { tickets, loading } = useTickets();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        {/* Page Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-5 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-zinc-200" />
            <Skeleton className="h-4 w-80 bg-zinc-100" />
          </div>
          <Skeleton className="h-10 w-36 bg-zinc-200 rounded-lg" />
        </div>

        {/* Info Banner / Profile Summary Skeleton */}
        <div className="border border-zinc-200 rounded-xl p-5 bg-white shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div className="flex gap-4 items-center">
            <Skeleton className="h-12 w-12 rounded-full bg-zinc-200" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48 bg-zinc-200" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20 bg-zinc-100" />
                <Skeleton className="h-4 w-24 bg-zinc-100" />
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="space-y-1">
              <Skeleton className="h-3 w-16 bg-zinc-100" />
              <Skeleton className="h-5 w-24 bg-zinc-200" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-16 bg-zinc-100" />
              <Skeleton className="h-5 w-24 bg-zinc-200" />
            </div>
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

        {/* Two Column Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-zinc-200 rounded-xl p-6 bg-white space-y-4 shadow-sm">
            <Skeleton className="h-6 w-48 bg-zinc-200" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-zinc-100 pb-3 last:border-b-0">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4.5 w-1/3 bg-zinc-200" />
                    <Skeleton className="h-3 w-1/2 bg-zinc-100" />
                  </div>
                  <Skeleton className="h-6 w-16 bg-zinc-150 rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="border border-zinc-200 rounded-xl p-6 bg-white space-y-4 shadow-sm">
            <Skeleton className="h-6 w-36 bg-zinc-200" />
            <Skeleton className="h-48 w-full bg-zinc-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const consultantName = user?.name || 'Consultant';
  const consultantEmail = user?.email || '';
  const consultantType = user?.consultantType || 'Functional';
  const consultantModules = user?.modules || [];
  const consultantPhone = user?.phoneNumber || 'N/A';
  const isTechnical = consultantType === 'Technical';

  // --- Dynamic Period & Operations Filter States & Refs ---
  const [filters, setFilters] = useState({
    period: 'This Month',
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

  const [activeChartTab, setActiveChartTab] = useState<'volume' | 'effort' | 'portfolio'>('volume');

  // Base tickets assigned to this consultant or where allocated
  const myTickets = useMemo(() => {
    return filterTicketsByScope(tickets, { type: 'consultant', value: user?.id || '' });
  }, [tickets, user?.id]);

  // Role-specific ticket filter: only show functionally/technically relevant tickets
  const roleTickets = useMemo(() => {
    return myTickets.filter(t =>
      t.functionalOrTechnical === consultantType ||
      t.functionalOrTechnical === undefined
    );
  }, [myTickets, consultantType]);

  // Derived options for selectors based on this consultant's assigned tickets
  const distinctModules = useMemo(() => {
    const mods = roleTickets.map(t => t.sapModule).filter(Boolean);
    return Array.from(new Set(mods)).sort();
  }, [roleTickets]);

  const distinctCustomers = useMemo(() => {
    const orgs = roleTickets.map(t => t.organization).filter(Boolean);
    return Array.from(new Set(orgs)).sort();
  }, [roleTickets]);

  // Helper function: apply filter criteria
  const applyFilters = (ticketsList: typeof roleTickets, f: typeof filters) => {
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

  // Derive filtered tickets
  const filteredTickets = useMemo(() => {
    return applyFilters(roleTickets, filters);
  }, [roleTickets, filters]);

  // Status counts for the status summary widget
  const ticketStatusCounts = useMemo(() => {
    return {
      all: filteredTickets.length,
      requirementGathering: filteredTickets.filter(t => t.status === 'Requirement Gathering').length,
      waitingHours: filteredTickets.filter(t => t.status === 'Waiting for Hours Approval').length,
      inProgressFunctional: filteredTickets.filter(t => t.status === 'In Progress - Functional' || t.status === 'Awaiting Functional Submission').length,
      inProgressTechnical: filteredTickets.filter(t => t.status === 'In Progress - Technical' || t.status === 'Awaiting Technical Submission').length,
      customerAction: filteredTickets.filter(t => t.status === 'Customer Action').length,
      onHold: filteredTickets.filter(t => t.status === 'On Hold').length,
      raisedSap: filteredTickets.filter(t => t.status === 'Raised to SAP').length,
      requestClosure: filteredTickets.filter(t => t.status === 'Request for Closure' || t.status === 'Awaiting Manager Approval').length,
      closed: filteredTickets.filter(t => t.status === 'Closed').length,
      reopened: filteredTickets.filter(t => t.status === 'Reopened').length,
    };
  }, [filteredTickets]);

  // --- Dynamic Operations Calculator ---
  const monthlyStats = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (filters.period === 'This Month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (filters.period === 'This Quarter') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
      end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
    } else if (filters.period === 'This Year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else if (filters.period === 'Custom') {
      start = filters.dateFrom ? new Date(filters.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = filters.dateTo ? new Date(filters.dateTo) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const workingDays = getWorkingDaysInRange(start, end);
    const expectedHours = workingDays * 8;

    const dbMonthTickets = filteredTickets;

    const dbMonthClosed = dbMonthTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;
    const dbMonthReopened = dbMonthTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length;
    const dbMonthSap = dbMonthTickets.filter(t => t.status === 'Raised to SAP' || t.raisedToSap).length;
    const dbMonthCustomerAction = dbMonthTickets.filter(t => t.status === 'Customer Action' || t.customerActionRequired).length;
    
    let dbActualHours = 0;
    let dbApprovedHours = 0;
    let dbBillableHours = 0;
    let dbApprovedBillableHours = 0;
    let dbNonBillableHours = 0;
    let dbApprovedNonBillableHours = 0;
    let dbPlannedHours = 0;
    let dbClosureRequests = 0;

    dbMonthTickets.forEach(t => {
      const myEst = (t.estimates || []).find(e => e.consultantId === user?.id || e.consultantId === consultantEmail);
      dbPlannedHours += myEst ? myEst.estimatedHours : 0;

      const myActualLogs = (t.actualHoursLogs || []).filter(ah => 
        (ah.consultantId === user?.id || ah.consultantId === consultantEmail)
      );

      myActualLogs.forEach(ah => {
        dbActualHours += ah.actualHours;
        if (ah.billable) {
          dbBillableHours += ah.actualHours;
        } else {
          dbNonBillableHours += ah.actualHours;
        }

        if (ah.approvalStatus?.toLowerCase() === 'approved') {
          dbApprovedHours += ah.actualHours;
          if (ah.billable) {
            dbApprovedBillableHours += ah.actualHours;
          } else {
            dbApprovedNonBillableHours += ah.actualHours;
          }
        }
      });

      dbClosureRequests += (t.closureRequests || []).length;
    });

    const actualHours = dbActualHours;
    const approvedHours = dbApprovedHours;
    const billableHours = dbBillableHours;
    const nonBillableHours = dbNonBillableHours;
    const plannedHours = dbPlannedHours;

    const ticketsAssigned = dbMonthTickets.length;
    const ticketsClosed = dbMonthClosed;
    const ticketsReopened = dbMonthReopened;
    const ticketsRaisedToSap = dbMonthSap;
    const customerActionTickets = dbMonthCustomerAction;
    const closureRequestsSubmitted = dbClosureRequests;

    const utilizationPercent = Math.min(100.0, expectedHours > 0 ? (actualHours / expectedHours) * 100 : 0);
    const remainingCapacity = Math.max(0, expectedHours - actualHours);

    let workloadHealth: 'Overloaded' | 'Healthy' | 'Underutilized' = 'Healthy';
    if (utilizationPercent > 92) {
      workloadHealth = 'Overloaded';
    } else if (utilizationPercent < 72) {
      workloadHealth = 'Underutilized';
    }

    // Dynamic Customer Portfolio from assigned tickets
    const uniqueClients = Array.from(new Set(dbMonthTickets.map(t => t.organization))).filter(Boolean);
    const customerEffort = uniqueClients.map(client => {
      const clientTickets = dbMonthTickets.filter(t => t.organization === client);
      const vol = clientTickets.length;
      const op = clientTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      
      let clientHours = 0;
      clientTickets.forEach(t => {
        const logs = (t.actualHoursLogs || []).filter(ah => 
          (ah.consultantId === user?.id || ah.consultantId === consultantEmail)
        );
        clientHours += logs.reduce((sum, ah) => sum + ah.actualHours, 0);
      });
      return { name: client, hours: clientHours, volume: vol, open: op };
    }).sort((a, b) => b.hours - a.hours);

    // Dynamic Module Portfolio from assigned tickets
    const uniqueModules = Array.from(new Set(dbMonthTickets.map(t => t.sapModule))).filter(Boolean);
    const modulePortfolio = uniqueModules.map(mod => {
      const modTickets = dbMonthTickets.filter(t => t.sapModule === mod);
      const count = modTickets.length;
      const open = modTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      
      let modHours = 0;
      modTickets.forEach(t => {
        const logs = (t.actualHoursLogs || []).filter(ah => 
          (ah.consultantId === user?.id || ah.consultantId === consultantEmail)
        );
        modHours += logs.reduce((sum, ah) => sum + ah.actualHours, 0);
      });
      return { name: mod, hours: modHours, count, open };
    }).sort((a, b) => b.hours - a.hours);

    // Dynamic SLA Metrics & Scores
    const closedTicketsList = dbMonthTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved');
    const metSlaCount = closedTicketsList.filter(t => {
      const resolvedOrClosed = t.resolvedAt || t.closedAt;
      if (!resolvedOrClosed) return true;
      return new Date(resolvedOrClosed).getTime() <= new Date(t.slaDueAt).getTime();
    }).length;
    const slaScore = closedTicketsList.length > 0
      ? Math.round((metSlaCount / closedTicketsList.length) * 100)
      : 100;

    const resolvedOrClosedTickets = dbMonthTickets.filter(t => t.resolvedAt || t.closedAt);
    const totalResTimeMs = resolvedOrClosedTickets.reduce((sum, t) => {
      const resolvedOrClosed = t.resolvedAt || t.closedAt || t.updatedAt;
      return sum + (new Date(resolvedOrClosed).getTime() - new Date(t.createdAt).getTime());
    }, 0);
    const avgResTimeHours = resolvedOrClosedTickets.length > 0
      ? Math.round((totalResTimeMs / (1000 * 60 * 60)) / resolvedOrClosedTickets.length * 10) / 10
      : 0.0;

    const openTicketsList = dbMonthTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
    const totalAgeMs = openTicketsList.reduce((sum, t) => {
      return sum + (Date.now() - new Date(t.createdAt).getTime());
    }, 0);
    const avgAgeDays = openTicketsList.length > 0
      ? Math.round((totalAgeMs / (1000 * 60 * 60 * 24)) / openTicketsList.length * 10) / 10
      : 0.0;

    const productivityScore = Math.max(0, Math.min(100, Math.round(85 + (ticketsClosed * 2) - (ticketsReopened * 5))));
    const resolutionScore = Math.max(0, Math.min(100, 100 - Math.round(avgResTimeHours * 1.5)));
    const workloadScore = Math.round(utilizationPercent);
    const billableEfficiencyScore = actualHours > 0 ? (billableHours / actualHours) * 100 : 0;

    return {
      workingDays,
      expectedHours,
      actualHours,
      approvedHours,
      billableHours,
      nonBillableHours,
      plannedHours,
      utilizationPercent,
      remainingCapacity,
      workloadHealth,

      ticketsAssigned,
      ticketsClosed,
      ticketsReopened,
      ticketsRaisedToSap,
      customerActionTickets,
      closureRequestsSubmitted,

      slaCompliancePercent: slaScore,
      avgResolutionTime: avgResTimeHours,
      avgTicketAge: avgAgeDays,
      closureSuccessRate: dbMonthClosed > 0 ? Math.round((dbMonthClosed / (dbMonthClosed + dbMonthReopened || 1)) * 100) : 100,
      reopenRate: dbMonthClosed > 0 ? Math.round((dbMonthReopened / dbMonthClosed) * 100) : 0,
      firstResponseCompliancePercent: slaScore,

      customerEffort,
      modulePortfolio,

      productivityScore,
      slaScore,
      resolutionScore,
      workloadScore,
      billableEfficiencyScore
    };
  }, [filters, filteredTickets, consultantName, consultantType, user?.id, consultantEmail]);

  // --- Dynamic Trends Data ---
  const monthlyTicketTrend = useMemo(() => {
    const data: any[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mName = monthNames[d.getMonth()];
      const yr = d.getFullYear() === 2026 ? '' : ` '${String(d.getFullYear()).substring(2)}`;
      
      const monthTickets = filteredTickets.filter(t => {
        const date = new Date(t.createdAt);
        return date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth();
      });

      const createdCount = monthTickets.length;
      const closedCount = monthTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;

      data.push({
        month: `${mName}${yr}`,
        Created: createdCount,
        Closed: closedCount
      });
    }
    return data;
  }, [filteredTickets]);

  const monthlyHoursTrend = useMemo(() => {
    const data: any[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mName = monthNames[d.getMonth()];
      const yr = d.getFullYear() === 2026 ? '' : ` '${String(d.getFullYear()).substring(2)}`;

      let actual = 0;
      let billable = 0;
      let nonBillable = 0;

      filteredTickets.forEach(t => {
        (t.actualHoursLogs || []).forEach(ah => {
          if (ah.consultantId === user?.id || ah.consultantId === consultantEmail) {
            const logDate = ah.createdAt ? new Date(ah.createdAt) : new Date(t.createdAt);
            if (logDate.getFullYear() === d.getFullYear() && logDate.getMonth() === d.getMonth()) {
              actual += ah.actualHours;
              if (ah.billable) {
                billable += ah.actualHours;
              } else {
                nonBillable += ah.actualHours;
              }
            }
          }
        });
      });

      data.push({
        month: `${mName}${yr}`,
        Actual: actual,
        Billable: billable,
        'Non-Billable': nonBillable
      });
    }
    return data;
  }, [filteredTickets, user?.id, consultantEmail]);

  const monthlyProductivityTrend = useMemo(() => {
    const data: any[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mName = monthNames[d.getMonth()];
      const yr = d.getFullYear() === 2026 ? '' : ` '${String(d.getFullYear()).substring(2)}`;

      const monthClosedList = filteredTickets.filter(t => {
        if (t.status !== 'Closed' && t.status !== 'Resolved') return false;
        const date = t.closedAt ? new Date(t.closedAt) : new Date(t.createdAt);
        return date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth();
      });

      const metSlaCount = monthClosedList.filter(t => {
        const resolvedOrClosed = t.resolvedAt || t.closedAt;
        if (!resolvedOrClosed) return true;
        return new Date(resolvedOrClosed).getTime() <= new Date(t.slaDueAt).getTime();
      }).length;

      const sla = monthClosedList.length > 0 ? (metSlaCount / monthClosedList.length) * 100 : 100;

      const totalResTimeMs = monthClosedList.reduce((sum, t) => {
        const resolvedOrClosed = t.resolvedAt || t.closedAt || t.updatedAt;
        return sum + (new Date(resolvedOrClosed).getTime() - new Date(t.createdAt).getTime());
      }, 0);
      const avgResTimeHours = monthClosedList.length > 0
        ? (totalResTimeMs / (1000 * 60 * 60)) / monthClosedList.length
        : 0;

      data.push({
        month: `${mName}${yr}`,
        Closed: monthClosedList.length,
        SLA: Math.round(sla),
        'Resolution (h)': Math.round(avgResTimeHours * 10) / 10
      });
    }
    return data;
  }, [filteredTickets]);

  // Export CSV Helper
  const triggerCSVDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPerformanceReport = () => {
    const targetPeriod = filters.period === 'Custom' 
      ? `${filters.dateFrom || 'Start'} to ${filters.dateTo || 'End'}`
      : filters.period;
    const rows = [
      ['Report Parameter', 'Value'],
      ['Consultant Name', consultantName],
      ['Specialization', consultantType],
      ['Target Period', targetPeriod],
      ['Productivity Score', `${monthlyStats.productivityScore.toFixed(0)}/100`],
      ['SLA Compliance %', `${monthlyStats.slaCompliancePercent.toFixed(1)}%`],
      ['Average Resolution Time', `${monthlyStats.avgResolutionTime.toFixed(1)} hrs`],
      ['Tickets Closed', String(monthlyStats.ticketsClosed)],
      ['Reopen Rate', `${monthlyStats.reopenRate.toFixed(1)}%`],
      ['First Response Compliance', `${monthlyStats.firstResponseCompliancePercent.toFixed(1)}%`]
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    triggerCSVDownload(`${consultantName}_Performance_Audit_${filters.period.replace(/\s+/g, '_')}.csv`, csv);
  };

  const handleDownloadUtilizationReport = () => {
    const rows = [
      ['Utilization Metric', 'Hours / Percentage'],
      ['Consultant Name', consultantName],
      ['Expected Hours', `${monthlyStats.expectedHours} hrs`],
      ['Planned Hours', `${monthlyStats.plannedHours} hrs`],
      ['Actual Logged Hours', `${monthlyStats.actualHours} hrs`],
      ['Billable Hours', `${monthlyStats.billableHours} hrs`],
      ['Non-Billable Hours', `${monthlyStats.nonBillableHours} hrs`],
      ['Remaining Capacity', `${monthlyStats.remainingCapacity} hrs`],
      ['Utilization %', `${monthlyStats.utilizationPercent.toFixed(1)}%`],
      ['Billable Efficiency %', `${monthlyStats.billableEfficiencyScore.toFixed(1)}%`]
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    triggerCSVDownload(`${consultantName}_Utilization_Report_${filters.period.replace(/\s+/g, '_')}.csv`, csv);
  };

  const handleDownloadMonthlyReport = () => {
    const rows = [
      ['Customer Portfolio Summary', 'Hours Logged', 'Assigned Tickets', 'Open Backlog'],
      ...monthlyStats.customerEffort.map(c => [c.name, `${c.hours}h`, String(c.volume), String(c.open)])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    triggerCSVDownload(`${consultantName}_Monthly_Activity_${filters.period.replace(/\s+/g, '_')}.csv`, csv);
  };

  if (myTickets.length === 0) {
    return (
      <div className="space-y-6 font-sans text-xs text-zinc-900">
        <div className="border-b border-zinc-200 pb-5">
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 uppercase font-sans">
            AMS Operations & Performance Cockpit
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Active: <span className="font-semibold text-zinc-900">{consultantName}</span> ({consultantType})
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center shadow-[0_2px_8px_rgba(0,0,0,0.015)] space-y-4">
          <Layers className="mx-auto text-zinc-450" size={48} />
          <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono">No tickets available</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto font-mono">You do not have any active SAP tickets assigned or logged hours in your queue yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-zinc-900 font-sans">

      {/* --- TOP HEADER & MONTH SELECTOR --- */}
      <div className="border-b border-zinc-200 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 uppercase font-sans">
            AMS Operations & Performance Cockpit
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Specialist Capacity Analyzer & Real-time Delivery Auditor. Active: <span className="font-semibold text-zinc-900">{consultantName}</span> ({consultantType})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-zinc-900 text-white font-mono text-[9px] tracking-wider uppercase px-2.5 py-1 shrink-0">
            {consultantType} SECURE
          </Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border border-zinc-200 rounded-lg p-4 mb-6 shadow-sm bg-white">
        {/* ROW 1 */}
        <div className="flex flex-wrap md:flex-nowrap gap-3 items-end w-full">
          
          {/* 1. PERIOD */}
          <div className="flex flex-col w-full md:w-auto">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold font-sans">Period</span>
            <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 h-9 items-center min-w-[280px]">
              {['This Month', 'This Quarter', 'This Year', 'Custom'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, period: p }))}
                  className={`flex-1 h-full flex items-center justify-center text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
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
              period: 'This Month',
              dateFrom: '',
              dateTo: '',
              statuses: ['All'],
              priority: 'All',
              module: 'All',
              customer: 'All'
            })}
            className="h-9 gap-1.5 ml-auto text-xs font-semibold hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200 shadow-sm"
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

      {/* --- WORKING CAPACITY BAR CHART SUMMARY --- */}
      <Card className="bg-white border border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.015)] overflow-hidden">
        <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 divide-y md:divide-y-0 md:divide-x divide-zinc-100 w-full">
          <div className="space-y-1 pr-6 flex-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Expected Capacity Hours</div>
            <div className="text-3xl font-extrabold text-zinc-900 font-mono">
              {monthlyStats.expectedHours} <span className="text-xs text-zinc-400 font-normal">hours</span>
            </div>
            <p className="text-[10px] text-zinc-400 font-sans">
              Based on {monthlyStats.workingDays} working days (8h/day) · Sunday through Thursday
            </p>
          </div>

          <div className="space-y-1 pt-4 md:pt-0 md:pl-8 flex-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Actual Logged Hours</div>
            <div className="text-3xl font-extrabold text-zinc-900 font-mono">
              {monthlyStats.actualHours.toFixed(1)} <span className="text-xs text-zinc-400 font-normal">hours</span>
            </div>
            <p className="text-[10px] text-zinc-400 font-sans">
              Billable: {monthlyStats.billableHours.toFixed(1)}h · Non-Billable: {monthlyStats.nonBillableHours.toFixed(1)}h
            </p>
          </div>

          <div className="space-y-1 pt-4 md:pt-0 md:pl-8 flex-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Remaining Capacity</div>
            <div className="text-3xl font-extrabold text-zinc-900 font-mono">
              {monthlyStats.remainingCapacity.toFixed(1)} <span className="text-xs text-zinc-400 font-normal">hours</span>
            </div>
            <p className="text-[10px] text-zinc-400 font-sans">
              Unallocated bandwidth in current cycle
            </p>
          </div>

          <div className="space-y-2 pt-4 md:pt-0 md:pl-8 flex-1 w-full">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans">
              <span>Monthly Utilization</span>
              <span className="font-mono text-zinc-800 text-xs">{monthlyStats.utilizationPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-zinc-900 transition-all duration-500" 
                style={{ width: `${monthlyStats.utilizationPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* --- MY TICKET STATUS SUMMARY --- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">My Ticket Status Summary</h2>
          <span className="text-[10px] text-zinc-500 font-mono">Real-time Ticket counts across 11 phases</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'All Tickets', count: ticketStatusCounts.all, value: 'all', icon: Layers, color: 'bg-zinc-800', textColor: 'text-zinc-800' },
            { label: 'Requirement Gathering', count: ticketStatusCounts.requirementGathering, value: 'requirementGathering', icon: FileText, color: 'bg-blue-500', textColor: 'text-blue-600' },
            { label: 'Waiting for Hours Approval', count: ticketStatusCounts.waitingHours, value: 'waitingHours', icon: Clock, color: 'bg-amber-500', textColor: 'text-amber-600' },
            { label: 'In Progress Functional', count: ticketStatusCounts.inProgressFunctional, value: 'inProgressFunctional', icon: Zap, color: 'bg-indigo-500', textColor: 'text-indigo-600' },
            { label: 'In Progress Technical', count: ticketStatusCounts.inProgressTechnical, value: 'inProgressTechnical', icon: Cpu, color: 'bg-purple-500', textColor: 'text-purple-600' },
            { label: 'Customer Action', count: ticketStatusCounts.customerAction, value: 'customerAction', icon: UserCheck, color: 'bg-orange-500', textColor: 'text-orange-600' },
            { label: 'On Hold', count: ticketStatusCounts.onHold, value: 'onHold', icon: Hourglass, color: 'bg-slate-500', textColor: 'text-slate-600' },
            { label: 'Raised to SAP', count: ticketStatusCounts.raisedSap, value: 'raisedSap', icon: ArrowUpRight, color: 'bg-red-500', textColor: 'text-red-600' },
            { label: 'Request for Closure', count: ticketStatusCounts.requestClosure, value: 'requestClosure', icon: AlertCircle, color: 'bg-teal-500', textColor: 'text-teal-600' },
            { label: 'Closed', count: ticketStatusCounts.closed, value: 'closed', icon: CheckCircle, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
            { label: 'Reopened', count: ticketStatusCounts.reopened, value: 'reopened', icon: RotateCcw, color: 'bg-rose-500', textColor: 'text-rose-600' },
          ].map((item, idx) => {
            const IconComponent = item.icon;
            const pct = ticketStatusCounts.all > 0 ? (item.count / ticketStatusCounts.all) * 100 : 0;
            return (
              <Card 
                key={idx} 
                className="bg-white border border-zinc-200/80 p-4 shadow-sm flex flex-col justify-between h-28 hover:shadow-md hover:border-zinc-300 transition duration-200 cursor-pointer"
              >
                <div className="flex justify-between items-start text-zinc-400">
                  <span className="text-[9px] font-bold uppercase tracking-wider line-clamp-1">{item.label}</span>
                  <IconComponent size={14} className={item.textColor} />
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold font-mono text-zinc-950">{item.count}</span>
                    <span className="text-[9px] text-zinc-450 font-mono">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${item.color} transition-all duration-500`} 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* --- SECTION 6: MY PERFORMANCE COMMAND CENTER --- */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">My Performance Command Center</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          
          {/* 1. Utilization */}
          <Card className="bg-white border border-zinc-200/80 p-4 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition">
            <div className="flex justify-between items-start text-zinc-450">
              <span className="text-[9px] font-bold uppercase tracking-widest">Utilization Gauge</span>
              <Clock size={14} />
            </div>
            <div className="mt-2 space-y-1.5">
              <span className="text-xl font-bold font-mono text-zinc-950">{monthlyStats.utilizationPercent.toFixed(1)}%</span>
              <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${monthlyStats.utilizationPercent > 92 ? 'bg-red-500' : 'bg-zinc-800'}`} 
                  style={{ width: `${monthlyStats.utilizationPercent}%` }}
                />
              </div>
            </div>
          </Card>

          {/* 2. Productivity Score */}
          <Card className="bg-white border border-zinc-200/80 p-4 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition">
            <div className="flex justify-between items-start text-zinc-450">
              <span className="text-[9px] font-bold uppercase tracking-widest">Productivity Score</span>
              <Award size={14} />
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold font-mono text-zinc-950">{monthlyStats.productivityScore} <span className="text-[9px] text-zinc-400 font-normal">/ 100</span></span>
              <span className="text-[9px] text-emerald-600 font-medium block mt-1 font-sans">Quality Grade: Excellent</span>
            </div>
          </Card>

          {/* 3. SLA Score */}
          <Card className="bg-white border border-zinc-200/80 p-4 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition">
            <div className="flex justify-between items-start text-zinc-450">
              <span className="text-[9px] font-bold uppercase tracking-widest">SLA Score</span>
              <ShieldCheck size={14} />
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold font-mono text-emerald-600">{monthlyStats.slaCompliancePercent.toFixed(1)}%</span>
              <span className="text-[9px] text-zinc-400 block mt-1">Target Threshold: 95%</span>
            </div>
          </Card>

          {/* 4. Resolution Score */}
          <Card className="bg-white border border-zinc-200/80 p-4 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition">
            <div className="flex justify-between items-start text-zinc-450">
              <span className="text-[9px] font-bold uppercase tracking-widest">Resolution Score</span>
              <Hourglass size={14} />
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold font-mono text-zinc-950">{monthlyStats.avgResolutionTime.toFixed(1)}h</span>
              <span className="text-[9px] text-zinc-400 block mt-1">Avg Resolution Cycle</span>
            </div>
          </Card>

          {/* 5. Workload Score */}
          <Card className="bg-white border border-zinc-200/80 p-4 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition">
            <div className="flex justify-between items-start text-zinc-450">
              <span className="text-[9px] font-bold uppercase tracking-widest">Workload Score</span>
              <Layers size={14} />
            </div>
            <div className="mt-2">
              <span className={`text-sm font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                monthlyStats.workloadHealth === 'Overloaded' ? 'bg-red-50 text-red-700' :
                monthlyStats.workloadHealth === 'Underutilized' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
              }`}>{monthlyStats.workloadHealth}</span>
              <span className="text-[9px] text-zinc-400 block mt-2">{monthlyStats.ticketsAssigned} assigned backlogs</span>
            </div>
          </Card>

          {/* 6. Billable Efficiency */}
          <Card className="bg-white border border-zinc-200/80 p-4 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition">
            <div className="flex justify-between items-start text-zinc-450">
              <span className="text-[9px] font-bold uppercase tracking-widest">Billable Efficiency</span>
              <DollarSign size={14} />
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold font-mono text-indigo-650">{monthlyStats.billableEfficiencyScore.toFixed(0)}%</span>
              <span className="text-[9px] text-zinc-400 block mt-1">Billable vs Non-Billable</span>
            </div>
          </Card>

        </div>
      </div>

      {/* --- SECTION 1: AMS OPERATIONS & PERFORMANCE AUDIT CENTER --- */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">AMS Operations & Performance Audit Center</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* A. Consultant Utilization */}
          <Card className="bg-white border border-zinc-200/80 shadow-sm p-5 flex flex-col">
            <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-4 font-sans">A. Consultant Capacity Utilization</div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-zinc-50 p-3 rounded-lg text-center">
                <span className="text-[9px] text-zinc-450 uppercase font-semibold block leading-none">Available Capacity</span>
                <span className="text-base font-bold text-zinc-900 block mt-2 font-mono">{monthlyStats.expectedHours}h</span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-lg text-center">
                <span className="text-[9px] text-zinc-450 uppercase font-semibold block leading-none">Planned Effort</span>
                <span className="text-base font-bold text-zinc-900 block mt-2 font-mono">{monthlyStats.plannedHours}h</span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-lg text-center">
                <span className="text-[9px] text-zinc-450 uppercase font-semibold block leading-none">Actual Logged</span>
                <span className="text-base font-bold text-zinc-900 block mt-2 font-mono">{monthlyStats.actualHours.toFixed(1)}h</span>
              </div>
            </div>
            <div className="space-y-3 text-xs flex-1">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <span className="text-zinc-500 font-sans">Utilization Ratio</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.utilizationPercent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <span className="text-zinc-500 font-sans">Billable Hours Share</span>
                <span className="font-mono font-bold text-emerald-600">{monthlyStats.billableHours.toFixed(1)}h ({monthlyStats.billableEfficiencyScore.toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-sans">Non-Billable Administration</span>
                <span className="font-mono font-bold text-zinc-550">{monthlyStats.nonBillableHours.toFixed(1)}h ({(100 - monthlyStats.billableEfficiencyScore).toFixed(1)}%)</span>
              </div>
            </div>
          </Card>

          {/* B. Delivery Performance */}
          <Card className="bg-white border border-zinc-200/80 shadow-sm p-5 flex flex-col">
            <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-4 font-sans">B. Delivery Performance & SLAs</div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-zinc-50 p-3 rounded-lg text-center">
                <span className="text-[9px] text-zinc-450 uppercase font-semibold block leading-none">Closed Work items</span>
                <span className="text-base font-bold text-zinc-900 block mt-2 font-mono">{monthlyStats.ticketsClosed}</span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-lg text-center">
                <span className="text-[9px] text-zinc-450 uppercase font-semibold block leading-none">Resolution Speed</span>
                <span className="text-base font-bold text-zinc-900 block mt-2 font-mono">{monthlyStats.avgResolutionTime.toFixed(1)}h</span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-lg text-center">
                <span className="text-[9px] text-zinc-450 uppercase font-semibold block leading-none">SLA Compliance</span>
                <span className="text-base font-bold text-emerald-600 block mt-2 font-mono">{monthlyStats.slaCompliancePercent.toFixed(1)}%</span>
              </div>
            </div>
            <div className="space-y-3 text-xs flex-1">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <span className="text-zinc-500 font-sans">Reopened Backlogs</span>
                <span className={`font-mono font-bold ${monthlyStats.ticketsReopened > 0 ? 'text-red-600' : 'text-zinc-900'}`}>{monthlyStats.ticketsReopened}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <span className="text-zinc-500 font-sans">Closure Request Approval Rate</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.closureSuccessRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-sans">First Response SLA Adherence</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.firstResponseCompliancePercent.toFixed(1)}%</span>
              </div>
            </div>
          </Card>

          {/* C. Customer Portfolio */}
          <Card className="bg-white border border-zinc-200/80 shadow-sm p-5 flex flex-col">
            <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-4 font-sans">C. Customer Portfolio Split</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-400 font-bold uppercase text-[9px]">
                    <th className="py-2">Client Name</th>
                    <th className="py-2 text-right">Effort (Hours)</th>
                    <th className="py-2 text-right">Total Vol</th>
                    <th className="py-2 text-right">Open Backlog</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {monthlyStats.customerEffort.map((c, i) => (
                    <tr key={i} className="hover:bg-zinc-50/50">
                      <td className="py-2.5 font-semibold text-zinc-800">{c.name}</td>
                      <td className="py-2.5 text-right font-mono text-zinc-900">{c.hours.toFixed(1)}h</td>
                      <td className="py-2.5 text-right font-mono text-zinc-550">{c.volume}</td>
                      <td className="py-2.5 text-right font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.open > 2 ? 'bg-red-50 text-red-700' : 'bg-zinc-50 text-zinc-600'}`}>
                          {c.open}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* D. Module Portfolio */}
          <Card className="bg-white border border-zinc-200/80 shadow-sm p-5 flex flex-col">
            <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-4 font-sans">D. SAP Modules Audit Split</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-400 font-bold uppercase text-[9px]">
                    <th className="py-2">SAP Module</th>
                    <th className="py-2 text-right">Logged Hours</th>
                    <th className="py-2 text-right">Total count</th>
                    <th className="py-2 text-right">Active Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {monthlyStats.modulePortfolio.map((m, i) => (
                    <tr key={i} className="hover:bg-zinc-50/50">
                      <td className="py-2.5 font-mono font-bold text-zinc-700">{m.name}</td>
                      <td className="py-2.5 text-right font-mono text-zinc-900">{m.hours.toFixed(1)}h</td>
                      <td className="py-2.5 text-right font-mono text-zinc-550">{m.count}</td>
                      <td className="py-2.5 text-right font-mono">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${m.open > 2 ? 'bg-amber-50 text-amber-700' : 'bg-zinc-50 text-zinc-600'}`}>
                          {m.open}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* E. Workload Health Slider */}
          <Card className="bg-white border border-zinc-200/80 shadow-sm p-5 lg:col-span-2 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider font-sans">E. Workload Allocation Health</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                monthlyStats.workloadHealth === 'Overloaded' ? 'bg-red-50 text-red-700' :
                monthlyStats.workloadHealth === 'Underutilized' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
              }`}>{monthlyStats.workloadHealth}</span>
            </div>
            
            <div className="relative pt-6 pb-2">
              <div className="h-2 w-full rounded-full bg-zinc-100 flex relative overflow-hidden">
                <div className="w-[70%] h-full bg-amber-200/60" title="Underutilized zone" />
                <div className="w-[22%] h-full bg-green-200/60" title="Healthy zone" />
                <div className="w-[8%] h-full bg-red-200/60" title="Overloaded zone" />
              </div>
              {/* Slider Thumb representing actual utilization */}
              <div 
                className="absolute top-4 w-4 h-4 rounded-full bg-zinc-950 border-2 border-white shadow-md transform -translate-x-1/2 transition-all duration-500"
                style={{ left: `${monthlyStats.utilizationPercent}%` }}
              />
            </div>
            
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono mt-1">
              <span>Underutilized (&lt;70%)</span>
              <span>Optimal Health (70% - 92%)</span>
              <span>Overloaded (&gt;92%)</span>
            </div>
          </Card>

        </div>
      </div>

      {/* --- SECTION 4: MONTHLY Scorecard --- */}
      <Card className="bg-white border border-zinc-200/80 shadow-sm p-6 space-y-6">
        <div className="border-b border-zinc-150 pb-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-zinc-650" />
            <h2 className="text-sm font-bold text-zinc-900 tracking-wide font-sans">Monthly Consultant Scorecard</h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Period: {filters.period === 'Custom' ? `${filters.dateFrom || 'Start'} to ${filters.dateTo || 'End'}` : filters.period}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Effort scorecard */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Hours & Capacity</h4>
            <div className="bg-zinc-50/50 rounded-lg p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Expected Hours</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.expectedHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Actual Logged Hours</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.actualHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Billable Hours Log</span>
                <span className="font-mono font-bold text-emerald-600">{monthlyStats.billableHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Non-Billable Administration</span>
                <span className="font-mono font-bold text-zinc-550">{monthlyStats.nonBillableHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-zinc-200 font-bold">
                <span className="text-zinc-800">Utilization Rate</span>
                <span className="font-mono text-zinc-950">{monthlyStats.utilizationPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Tickets scorecard */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Ticket Portfolio</h4>
            <div className="bg-zinc-50/50 rounded-lg p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Work Items Assigned</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.ticketsAssigned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Tickets Successfully Closed</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.ticketsClosed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Reopened Backlogs</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.ticketsReopened}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Tickets Escalated to SAP</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.ticketsRaisedToSap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Customer Action Pending</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.customerActionTickets}</span>
              </div>
            </div>
          </div>

          {/* Performance scorecard */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Performance Grades</h4>
            <div className="bg-zinc-50/50 rounded-lg p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">SLA Adherence Compliance</span>
                <span className="font-mono font-bold text-emerald-600">{monthlyStats.slaCompliancePercent.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Average Resolution Speed</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.avgResolutionTime.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Average Ticket Age</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.avgTicketAge.toFixed(1)}d</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Closure Approval success</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.closureSuccessRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Ticket Reopen Rate</span>
                <span className="font-mono font-bold text-zinc-900">{monthlyStats.reopenRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* --- SECTION 7: ACHIEVEMENTS & MILESTONES --- */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono font-sans">Achievements & Milestones</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <Card className="bg-white border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase font-mono block">Productivity Peak</span>
                <span className="text-sm font-bold text-zinc-800 mt-1 block">Best Resolution Day</span>
              </div>
              <CheckCircle className="text-zinc-400" size={16} />
            </div>
            <div className="mt-4 text-xs">
              <strong className="text-base text-zinc-900 font-semibold">{isTechnical ? 'Monday' : 'Tuesday'}</strong>
              <p className="text-[10px] text-zinc-500 mt-1 font-sans">Consistently resolving backlog tasks on this weekday</p>
            </div>
          </Card>

          <Card className="bg-white border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase font-mono block">Workload Record</span>
                <span className="text-sm font-bold text-zinc-800 mt-1 block">Highest Ticket Closure Week</span>
              </div>
              <TrendingUp className="text-zinc-400" size={16} />
            </div>
            <div className="mt-4 text-xs">
              <strong className="text-base text-zinc-900 font-semibold">Week 2 ({monthlyStats.ticketsClosed + 2} tickets)</strong>
              <p className="text-[10px] text-zinc-500 mt-1 font-sans">Record weekly closure volume recorded in current quarter</p>
            </div>
          </Card>

          <Card className="bg-white border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase font-mono block">Customer Focus</span>
                <span className="text-sm font-bold text-zinc-800 mt-1 block">Longest Customer Support Relationship</span>
              </div>
              <Building2 className="text-zinc-400" size={16} />
            </div>
            <div className="mt-4 text-xs">
              <strong className="text-base text-zinc-900 font-semibold">Apex Global Industries</strong>
              <p className="text-[10px] text-zinc-500 mt-1 font-sans">6 months of continuous SAP module SLA compliance</p>
            </div>
          </Card>

        </div>
      </div>

      {/* Dynamic commitments memos */}
      {(() => {
        const now = Date.now();
        const nextWeek = now + 7 * 24 * 60 * 60 * 1000;
        const slaDueThisWeek = filteredTickets.filter(t => {
          if (t.status === 'Closed' || t.status === 'Resolved' || !t.slaDueAt || t.slaDueAt === 'SLA Not Applicable') return false;
          const dueTime = new Date(t.slaDueAt).getTime();
          return dueTime >= now && dueTime <= nextWeek;
        });

        const customerActionPendingTickets = filteredTickets.filter(t => 
          t.status === 'Customer Action' || 
          t.status === 'Waiting for Customer' || 
          t.customerActionRequired === true
        );

        const closureAwaitingApproval = filteredTickets.filter(t => 
          t.status === 'Request for Closure' || 
          t.status === 'Awaiting Manager Approval'
        );

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

        const getSlaHoursLeft = (dueAtStr: string) => {
          const diffMs = new Date(dueAtStr).getTime() - Date.now();
          const hrs = Math.max(0, diffMs / (1000 * 60 * 60));
          return `${Math.round(hrs)}h left`;
        };

        return (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">Upcoming Commitments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* SLA Due This Week */}
              <Card className="bg-white border border-zinc-200/80 shadow-sm p-4">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                  <span className="text-xs font-bold text-zinc-800 font-sans">SLA Due This Week</span>
                  <Badge className="bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-50 text-[10px] font-mono">
                    {slaDueThisWeek.length} Tickets
                  </Badge>
                </div>
                <div className="space-y-2 text-xs">
                  {slaDueThisWeek.slice(0, 3).map(t => {
                    const slaInfo = getSlaBreachInfo(t);
                    const isEscalated = t.escalationFlag;
                    const borderClass = isEscalated || (slaInfo?.status === 'breached') 
                      ? 'border-l-4 border-l-destructive pl-2' 
                      : (slaInfo?.status === 'imminent' ? 'border-l-4 border-l-amber-500 pl-2' : '');
                    return (
                      <div key={t.id} className={`flex justify-between items-center py-1.5 ${borderClass}`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Link href={`/consultant/tickets/${t.id}`} className="font-mono text-zinc-900 font-bold hover:underline shrink-0">{t.ticketNumber || t.id}</Link>
                          {isEscalated && <Badge variant="destructive" className="text-[8px] px-1.5 py-0 font-bold uppercase leading-none h-4">Escalated</Badge>}
                          {slaInfo && (
                            <Badge className={`text-[8px] px-1.5 py-0 font-bold uppercase leading-none h-4 ${
                              slaInfo.status === 'breached' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                            }`}>{slaInfo.label}</Badge>
                          )}
                        </div>
                        <span className="text-red-655 font-bold shrink-0">{getSlaHoursLeft(t.slaDueAt)}</span>
                      </div>
                    );
                  })}
                  {slaDueThisWeek.length === 0 && (
                    <span className="text-zinc-400 italic">No SLAs due this week</span>
                  )}
                </div>
              </Card>

              {/* Customer Action Pending */}
              <Card className="bg-white border border-zinc-200/80 shadow-sm p-4">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                  <span className="text-xs font-bold text-zinc-800 font-sans">Customer Action Pending</span>
                  <Badge className="bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-50 text-[10px] font-mono">
                    {customerActionPendingTickets.length} Tickets
                  </Badge>
                </div>
                <div className="space-y-2 text-xs">
                  {customerActionPendingTickets.slice(0, 3).map(t => {
                    const slaInfo = getSlaBreachInfo(t);
                    const isEscalated = t.escalationFlag;
                    const borderClass = isEscalated || (slaInfo?.status === 'breached') 
                      ? 'border-l-4 border-l-destructive pl-2' 
                      : (slaInfo?.status === 'imminent' ? 'border-l-4 border-l-amber-500 pl-2' : '');
                    return (
                      <div key={t.id} className={`flex justify-between items-center py-1.5 ${borderClass}`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Link href={`/consultant/tickets/${t.id}`} className="font-mono text-zinc-900 font-bold hover:underline shrink-0">{t.ticketNumber || t.id}</Link>
                          {isEscalated && <Badge variant="destructive" className="text-[8px] px-1.5 py-0 font-bold uppercase leading-none h-4">Escalated</Badge>}
                          {slaInfo && (
                            <Badge className={`text-[8px] px-1.5 py-0 font-bold uppercase leading-none h-4 ${
                              slaInfo.status === 'breached' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                            }`}>{slaInfo.label}</Badge>
                          )}
                          <span className="text-zinc-550 truncate max-w-[120px]">{t.title}</span>
                        </div>
                      </div>
                    );
                  })}
                  {customerActionPendingTickets.length === 0 && (
                    <span className="text-zinc-400 italic">No actions pending client</span>
                  )}
                </div>
              </Card>

              {/* Closure Approvals */}
              <Card className="bg-white border border-zinc-200/80 shadow-sm p-4">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-3">
                  <span className="text-xs font-bold text-zinc-800 font-sans">Closure Awaiting Approval</span>
                  <Badge className="bg-zinc-50 text-zinc-650 border-zinc-200 hover:bg-zinc-50 text-[10px] font-mono">
                    {closureAwaitingApproval.length} Requests
                  </Badge>
                </div>
                <div className="space-y-2 text-xs">
                  {closureAwaitingApproval.slice(0, 3).map(t => {
                    const slaInfo = getSlaBreachInfo(t);
                    const isEscalated = t.escalationFlag;
                    const borderClass = isEscalated || (slaInfo?.status === 'breached') 
                      ? 'border-l-4 border-l-destructive pl-2' 
                      : (slaInfo?.status === 'imminent' ? 'border-l-4 border-l-amber-500 pl-2' : '');
                    return (
                      <div key={t.id} className={`flex justify-between items-center py-1.5 ${borderClass}`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Link href={`/consultant/tickets/${t.id}`} className="font-mono text-zinc-900 font-bold hover:underline shrink-0">{t.ticketNumber || t.id}</Link>
                          {isEscalated && <Badge variant="destructive" className="text-[8px] px-1.5 py-0 font-bold uppercase leading-none h-4">Escalated</Badge>}
                          {slaInfo && (
                            <Badge className={`text-[8px] px-1.5 py-0 font-bold uppercase leading-none h-4 ${
                              slaInfo.status === 'breached' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                            }`}>{slaInfo.label}</Badge>
                          )}
                          <span className="text-zinc-550 truncate max-w-[120px]">{t.title}</span>
                        </div>
                      </div>
                    );
                  })}
                  {closureAwaitingApproval.length === 0 && (
                    <span className="text-zinc-400 italic">No closures pending approval</span>
                  )}
                </div>
              </Card>

            </div>
          </div>
        );
      })()}

      {/* --- ADVANCED ANALYTICS TABBED CHARTS --- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-sans">Advanced Analytics Hub</h3>
            <p className="text-zinc-500 text-[11px] mt-0.5">Statistical performance charts for the selected timeline</p>
          </div>
          <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            {[
              { id: 'volume', label: 'Ticket Volume' },
              { id: 'effort', label: 'Effort Analytics' },
              { id: 'portfolio', label: 'Portfolio Share' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveChartTab(tab.id as any)}
                className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  activeChartTab === tab.id
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activeChartTab === 'volume' && (
            <>
              {/* Chart 1: Ticket Trends */}
              <Card className="bg-white border border-zinc-200/80 rounded-xl p-5 h-[320px] flex flex-col hover:shadow-md transition">
                <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Monthly Ticket Volume Trend</CardTitle>
                <CardDescription className="text-[10px] text-zinc-400 mt-0.5 mb-4">Comparison of created, closed and reopened tickets</CardDescription>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTicketTrend}>
                      <XAxis dataKey="month" stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} />
                      <YAxis stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', fontSize: 10, borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Line type="monotone" dataKey="Created" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Closed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 2: SLA & Quality Trends */}
              <Card className="bg-white border border-zinc-200/80 rounded-xl p-5 h-[320px] flex flex-col hover:shadow-md transition">
                <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wider">SLA Adherence Compliance</CardTitle>
                <CardDescription className="text-[10px] text-zinc-400 mt-0.5 mb-4">Historical monthly SLA compliance rates</CardDescription>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyProductivityTrend}>
                      <XAxis dataKey="month" stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} />
                      <YAxis stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} domain={[80, 100]} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', fontSize: 10, borderRadius: '8px' }} />
                      <Bar dataKey="SLA" fill="#10b981" radius={[2, 2, 0, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 3: Ticket Resolution Cycle Time */}
              <Card className="bg-white border border-zinc-200/80 rounded-xl p-5 h-[320px] flex flex-col hover:shadow-md transition">
                <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Resolution Cycle Speed</CardTitle>
                <CardDescription className="text-[10px] text-zinc-400 mt-0.5 mb-4">Average hours required to resolve a ticket</CardDescription>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyProductivityTrend}>
                      <XAxis dataKey="month" stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} />
                      <YAxis stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', fontSize: 10, borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="Resolution (h)" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}

          {activeChartTab === 'effort' && (
            <>
              {/* Chart 4: Actual Hours Trend */}
              <Card className="bg-white border border-zinc-200/80 rounded-xl p-5 h-[320px] flex flex-col hover:shadow-md transition">
                <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Monthly Logged Hours Trend</CardTitle>
                <CardDescription className="text-[10px] text-zinc-400 mt-0.5 mb-4">Efforts distribution across billable and admin tasks</CardDescription>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyHoursTrend}>
                      <XAxis dataKey="month" stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} />
                      <YAxis stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', fontSize: 10, borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Area type="monotone" dataKey="Billable" stackId="1" stroke="#10b981" fill="#d1fae5" />
                      <Area type="monotone" dataKey="Non-Billable" stackId="1" stroke="#64748b" fill="#f1f5f9" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 5: Customer Hours Share */}
              <Card className="bg-white border border-zinc-200/80 rounded-xl p-5 h-[320px] flex flex-col hover:shadow-md transition">
                <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Efforts by Customer</CardTitle>
                <CardDescription className="text-[10px] text-zinc-400 mt-0.5 mb-4">Actual logged hours per organization</CardDescription>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyStats.customerEffort} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <XAxis type="number" stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} />
                      <YAxis dataKey="name" type="category" stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} width={65} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', fontSize: 10, borderRadius: '8px' }} />
                      <Bar dataKey="hours" fill="#18181b" radius={[0, 2, 2, 0]} barSize={8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 6: Module Hours Share */}
              <Card className="bg-white border border-zinc-200/80 rounded-xl p-5 h-[320px] flex flex-col hover:shadow-md transition">
                <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Efforts by SAP Module</CardTitle>
                <CardDescription className="text-[10px] text-zinc-400 mt-0.5 mb-4">Actual logged hours distributed by module</CardDescription>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyStats.modulePortfolio} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <XAxis type="number" stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} />
                      <YAxis dataKey="name" type="category" stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} width={50} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', fontSize: 10, borderRadius: '8px' }} />
                      <Bar dataKey="hours" fill="#6366f1" radius={[0, 2, 2, 0]} barSize={8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}

          {activeChartTab === 'portfolio' && (
            <>
              {/* Chart 7: Customer Ticket Distribution */}
              <Card className="bg-white border border-zinc-200/80 rounded-xl p-5 h-[320px] flex flex-col hover:shadow-md transition">
                <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Ticket Volume by Customer</CardTitle>
                <CardDescription className="text-[10px] text-zinc-400 mt-0.5 mb-4">Total assigned ticket split by customer</CardDescription>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={monthlyStats.customerEffort} dataKey="volume" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={{ fill: '#0f172a', fontSize: 8 }}>
                        {monthlyStats.customerEffort.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#64748b'][index % 5]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', fontSize: 10, borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 8: Module Ticket Distribution */}
              <Card className="bg-white border border-zinc-200/80 rounded-xl p-5 h-[320px] flex flex-col hover:shadow-md transition">
                <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Ticket count by SAP Module</CardTitle>
                <CardDescription className="text-[10px] text-zinc-400 mt-0.5 mb-4">Total assigned ticket split by SAP module</CardDescription>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={monthlyStats.modulePortfolio} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={{ fill: '#0f172a', fontSize: 8 }}>
                        {monthlyStats.modulePortfolio.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#18181b', '#2563eb', '#10b981', '#ea580c', '#7c3aed'][index % 5]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', fontSize: 10, borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 9: Active Customer Backlog */}
              <Card className="bg-white border border-zinc-200/80 rounded-xl p-5 h-[320px] flex flex-col hover:shadow-md transition">
                <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Open Tickets by Customer</CardTitle>
                <CardDescription className="text-[10px] text-zinc-400 mt-0.5 mb-4">Active open backlog items per organization</CardDescription>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyStats.customerEffort} margin={{ bottom: 10 }}>
                      <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} />
                      <YAxis stroke="#a1a1aa" tick={{ fill: '#71717a', fontSize: 8 }} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', fontSize: 10, borderRadius: '8px' }} />
                      <Bar dataKey="open" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* --- SECTION 9: PROFILE & EMPLOYEE SUMMARY --- */}
      <Card className="bg-white border border-zinc-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] p-6 space-y-6">
        <div className="border-b border-zinc-150 pb-3 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-zinc-850" />
            <h2 className="text-base font-bold text-zinc-900 tracking-wide font-sans">Consultant Employment Summary</h2>
          </div>
          <Badge className="bg-zinc-100 text-zinc-800 border-zinc-200 hover:bg-zinc-100 text-xs font-sans px-2.5 py-0.5 rounded">
            Security Clearance Level: L2 Specialist
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Col 1: Personal Info */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Personal Profile</h4>
            <div className="space-y-2.5 text-xs text-zinc-700 font-sans">
              <div className="flex items-center gap-2.5">
                <User size={13} className="text-zinc-500" />
                <span>Name: <strong className="text-zinc-900 font-semibold">{consultantName}</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={13} className="text-zinc-500" />
                <span>Employee ID: <strong className="text-zinc-900 font-mono">{isTechnical ? 'EMP-SAP-112' : 'EMP-SAP-094'}</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={13} className="text-zinc-500" />
                <span>Email: <strong className="text-zinc-900">{consultantEmail}</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={13} className="text-zinc-500" />
                <span>Phone: <strong className="text-zinc-900 font-mono">{consultantPhone}</strong></span>
              </div>
            </div>
          </div>

          {/* Col 2: Professional Info */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Professional Profile</h4>
            <div className="space-y-2.5 text-xs text-zinc-700 font-sans">
              <div className="flex items-center gap-2.5">
                <Award size={13} className="text-zinc-500" />
                <span>Practice: <strong className="text-zinc-900">{consultantType} Consulting</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Layers size={13} className="text-zinc-500" />
                <span>SAP Modules: <strong className="text-zinc-900 font-mono">
                  {consultantModules.length > 0 ? consultantModules.join(', ') : 'N/A'}
                </strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <UserCheck size={13} className="text-zinc-500" />
                <span>Reporting Manager: <strong className="text-zinc-900">Marcus Vance (AMS Lead)</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar size={13} className="text-zinc-500" />
                <span>Joining Date: <strong className="text-zinc-900">{isTechnical ? 'October 15, 2025' : 'December 1, 2025'}</strong></span>
              </div>
            </div>
          </div>

          {/* Col 3: Current Month Performance */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono font-sans">Timeline Audit Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="bg-zinc-50 border border-zinc-200/60 rounded p-2.5">
                <span className="text-[8px] text-zinc-500 uppercase font-mono block">Actual Hours</span>
                <span className="text-sm font-bold text-zinc-900 mt-1 block font-mono">{monthlyStats.actualHours.toFixed(1)}h</span>
              </div>
              <div className="bg-zinc-50 border border-zinc-200/60 rounded p-2.5">
                <span className="text-[8px] text-zinc-550 uppercase font-mono block">Billable Hours</span>
                <span className="text-sm font-bold text-emerald-600 mt-1 block font-mono">{monthlyStats.billableHours.toFixed(1)}h</span>
              </div>
              <div className="bg-zinc-50 border border-zinc-200/60 rounded p-2.5">
                <span className="text-[8px] text-zinc-550 uppercase font-mono block">Utilization %</span>
                <span className="text-sm font-bold text-zinc-900 mt-1 block font-mono">{monthlyStats.utilizationPercent.toFixed(1)}%</span>
              </div>
              <div className="bg-zinc-50 border border-zinc-200/60 rounded p-2.5">
                <span className="text-[8px] text-zinc-550 uppercase font-mono block">Tickets Closed</span>
                <span className="text-sm font-bold text-zinc-900 mt-1 block font-mono">{monthlyStats.ticketsClosed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Report Download Actions */}
        <div className="border-t border-zinc-150 pt-4 flex flex-wrap gap-3 justify-end">
          <Button onClick={handleDownloadMonthlyReport} variant="outline"
            className="text-[10px] font-bold uppercase py-1.5 flex items-center gap-1.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 cursor-pointer">
            <Download size={12} />
            Download Monthly Report
          </Button>
          <Button onClick={handleDownloadPerformanceReport} variant="outline"
            className="text-[10px] font-bold uppercase py-1.5 flex items-center gap-1.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 cursor-pointer">
            <Download size={12} />
            Download Performance Report
          </Button>
          <Button onClick={handleDownloadUtilizationReport} variant="outline"
            className="text-[10px] font-bold uppercase py-1.5 flex items-center gap-1.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-700 cursor-pointer">
            <Download size={12} />
            Download Utilization Report
          </Button>
        </div>
      </Card>

    </div>
  );
}
