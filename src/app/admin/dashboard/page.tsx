'use client';

import React, { useState, useMemo } from 'react';
import { useTickets } from '../../../context/TicketContext';
import Link from 'next/link';
import { BrandedLogo } from '../../../components/ui/BrandedLogo';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Users, Building2, Ticket, AlertTriangle, Clock, HeartHandshake,
  Layers, Calendar, BarChart3, TrendingUp, ShieldAlert, BadgeCheck,
  FileText, CheckCircle2, UserCheck, DollarSign, Activity, FileCheck,
  HelpCircle, UserX, AlertCircle, RefreshCw, ChevronRight, Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Skeleton } from '../../../components/ui/skeleton';
import { Progress } from '../../../components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';

export default function AdminDashboardPage() {
  const { tickets, contracts, profiles, loading } = useTickets();

  // Active Main Tab panel
  const [activeTab, setActiveTab] = useState<string>('cockpit');

  // Interactive filtering states
  const [selectedManager, setSelectedManager] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState('All');
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');

  // Unified list of unique values for dropdown filters based on database
  const managersList = useMemo(() => {
    return Array.from(new Set(profiles.filter(p => p.role === 'Manager').map(p => p.full_name || p.email))).sort();
  }, [profiles]);

  const customersList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.organization))).filter(Boolean).sort();
  }, [tickets]);

  const modulesList = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.sapModule))).filter(Boolean).sort();
  }, [tickets]);

  const resetFilters = () => {
    setSelectedManager('All');
    setSelectedCustomer('All');
    setSelectedModule('All');
    setSelectedPriority('All');
  };

  // Base filtered tickets array for interactive graphs/kpis
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (selectedManager !== 'All' && t.assignedManager !== selectedManager) return false;
      if (selectedCustomer !== 'All' && t.organization !== selectedCustomer) return false;
      if (selectedModule !== 'All' && t.sapModule !== selectedModule) return false;
      if (selectedPriority !== 'All' && t.priority !== selectedPriority) return false;
      return true;
    });
  }, [tickets, selectedManager, selectedCustomer, selectedModule, selectedPriority]);

  // Color harmony tokens for charts
  const COLORS = ['#1e1b4b', '#312e81', '#3730a3', '#4338ca', '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];
  const PRIORITY_COLORS: Record<string, string> = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#eab308',
    Low: '#71717a'
  };

  // --- 1. GLOBAL DELIVERY HEALTH CALCULATION ---
  const globalStats = useMemo(() => {
    const totalCustomers = profiles.filter(p => p.role === 'Customer').length;
    const activeCustomers = profiles.filter(p => p.role === 'Customer' && p.is_active).length;
    const totalManagers = profiles.filter(p => p.role === 'Manager').length;
    const activeManagers = profiles.filter(p => p.role === 'Manager' && p.is_active).length;
    const totalConsultants = profiles.filter(p => p.role === 'Consultant').length;
    const functionalConsultants = profiles.filter(p => p.role === 'Consultant' && p.consultant_type === 'Functional').length;
    const technicalConsultants = profiles.filter(p => p.role === 'Consultant' && p.consultant_type === 'Technical').length;

    const totalTickets = filteredTickets.length;
    const openTickets = filteredTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
    const closedTickets = filteredTickets.filter(t => t.status === 'Closed').length;
    const reopenedTickets = filteredTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length;
    const escalatedTickets = filteredTickets.filter(t => t.escalationFlag).length;

    const slaBreachedTickets = filteredTickets.filter(t => {
      if (!t.slaDueAt || t.slaDueAt === 'SLA Not Applicable') return false;
      const due = new Date(t.slaDueAt).getTime();
      const end = t.status === 'Resolved' || t.status === 'Closed'
        ? new Date(t.resolvedAt || t.closedAt || Date.now()).getTime()
        : Date.now();
      return end > due;
    }).length;

    // Summing approvals of different kinds
    const pendingHoursApprovals = tickets.reduce((sum, t) => sum + (t.actualHoursLogs || []).filter(h => h.approvalStatus?.toLowerCase() === 'pending').length, 0);
    const pendingClosureApprovals = tickets.filter(t => t.closureRequests?.some(r => r.status === 'Pending Manager Approval' || r.managerApprovalStatus === 'Pending')).length;
    const pendingReopenRequests = tickets.filter(t => t.status === 'Reopen Requested').length;
    const pendingUnlockRequests = tickets.reduce((sum, t) => sum + (t.unlockRequests || []).filter(u => u.status === 'Pending').length, 0);
    const pendingDeleteRequests = tickets.reduce((sum, t) => sum + (t.deleteRequests || []).filter(r => r.managerApproval === 'Pending' || r.adminApproval === 'Pending').length, 0);
    
    const pendingApprovalsCount = pendingHoursApprovals + pendingClosureApprovals + pendingReopenRequests + pendingUnlockRequests + pendingDeleteRequests;
    const pendingClosureRequestsCount = pendingClosureApprovals;

    // Approved Actual Hours: Sum actual hours logged where approvalStatus === 'Approved'
    const totalApprovedActualHours = filteredTickets.reduce((sum, t) => {
      const approved = (t.actualHoursLogs || []).filter(ah => ah.approvalStatus?.toLowerCase() === 'approved');
      return sum + approved.reduce((acc, curr) => acc + curr.actualHours, 0);
    }, 0);

    return {
      totalCustomers,
      activeCustomers,
      totalManagers,
      activeManagers,
      totalConsultants,
      functionalConsultants,
      technicalConsultants,
      totalTickets,
      openTickets,
      closedTickets,
      reopenedTickets,
      escalatedTickets,
      slaBreachedTickets,
      pendingApprovalsCount,
      pendingClosureRequestsCount,
      totalApprovedActualHours
    };
  }, [filteredTickets, tickets, profiles]);

  // --- 2. CUSTOMER HEALTH & 3. CONTRACT GOVERNANCE CALCULATION ---
  const customerHealthList = useMemo(() => {
    const orgNames = Array.from(new Set([
      ...contracts.map(c => c.organizationName),
      ...tickets.map(t => t.organization)
    ])).filter(Boolean);

    return orgNames.map(org => {
      const orgTickets = tickets.filter(t => t.organization === org);
      const activeContract = contracts.find(c => c.organizationName === org && c.isActive);

      const openTickets = orgTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      const closedTickets = orgTickets.filter(t => t.status === 'Closed').length;
      const reopenedTickets = orgTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length;
      const escalatedTickets = orgTickets.filter(t => t.escalationFlag).length;

      // SLA breaches
      const incidents = orgTickets.filter(t => (t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable');
      const slaBreaches = incidents.filter(t => {
        const due = new Date(t.slaDueAt).getTime();
        const end = t.status === 'Resolved' || t.status === 'Closed'
          ? new Date(t.resolvedAt || t.closedAt || Date.now()).getTime()
          : Date.now();
        return end > due;
      }).length;

      // Approved hours sum
      let approvedHours = 0;
      orgTickets.forEach(t => {
        const approved = (t.actualHoursLogs || []).filter(ah => ah.approvalStatus?.toLowerCase() === 'approved');
        approvedHours += approved.reduce((acc, curr) => acc + curr.actualHours, 0);
      });

      const contractedHours = activeContract ? activeContract.totalHours : 0;
      const monthlyAllocated = activeContract ? activeContract.monthlyBudgetHours : 0;
      const remainingHours = Math.max(0, contractedHours - approvedHours);
      const utilizationPct = contractedHours > 0 ? (approvedHours / contractedHours) * 100 : 0;

      // CSAT Average
      const ratings = orgTickets.filter(t => t.rating && typeof t.rating.score === 'number');
      const avgCsat = ratings.length > 0 ? ratings.reduce((sum, t) => sum + t.rating!.score, 0) / ratings.length : 0;

      // Health status logic
      let healthStatus: 'Healthy' | 'Watchlist' | 'At Risk' | 'Critical' = 'Healthy';
      const isExpired = activeContract ? new Date(activeContract.endDate).getTime() < Date.now() : false;
      const daysToExpiry = activeContract ? Math.ceil((new Date(activeContract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999;
      
      if ((avgCsat > 0 && avgCsat < 3.0) || escalatedTickets > 1 || slaBreaches > 2 || approvedHours > contractedHours) {
        healthStatus = 'Critical';
      } else if ((avgCsat > 0 && avgCsat < 4.0) || escalatedTickets === 1 || slaBreaches === 1 || utilizationPct > 95) {
        healthStatus = 'At Risk';
      } else if (daysToExpiry <= 30 || utilizationPct > 80 || isExpired) {
        healthStatus = 'Watchlist';
      }

      return {
        name: org,
        contractStart: activeContract?.startDate || 'N/A',
        contractEnd: activeContract?.endDate || 'N/A',
        contractStatus: activeContract ? (isExpired ? 'Expired' : (activeContract.isActive ? 'Active' : 'Inactive')) : 'No Contract',
        contractedHours,
        monthlyAllocated,
        approvedHours,
        remainingHours,
        utilizationPct,
        openTickets,
        closedTickets,
        reopenedTickets,
        escalatedTickets,
        slaBreaches,
        csat: avgCsat > 0 ? avgCsat.toFixed(1) : 'N/A',
        healthStatus
      };
    });
  }, [tickets, contracts]);

  const contractGovernance = useMemo(() => {
    const totalActiveContracts = contracts.filter(c => c.isActive && new Date(c.endDate).getTime() >= Date.now()).length;
    const expiringContracts = contracts.filter(c => c.isActive && new Date(c.endDate).getTime() >= Date.now() && (new Date(c.endDate).getTime() - Date.now()) <= 30 * 24 * 60 * 60 * 1000).length;
    const expiredContracts = contracts.filter(c => new Date(c.endDate).getTime() < Date.now()).length;

    const totalContractHours = contracts.reduce((sum, c) => sum + (c.isActive ? c.totalHours : 0), 0);
    
    let totalApprovedHours = 0;
    tickets.forEach(t => {
      const orgContract = contracts.find(c => c.organizationName === t.organization && c.isActive);
      if (orgContract) {
        const approved = (t.actualHoursLogs || []).filter(ah => ah.approvalStatus?.toLowerCase() === 'approved');
        totalApprovedHours += approved.reduce((acc, curr) => acc + curr.actualHours, 0);
      }
    });

    const totalRemainingHours = Math.max(0, totalContractHours - totalApprovedHours);
    const overutilizedCustomers = customerHealthList.filter(c => c.utilizationPct > 100).length;
    const underutilizedCustomers = customerHealthList.filter(c => c.utilizationPct > 0 && c.utilizationPct < 50).length;

    return {
      totalActiveContracts,
      expiringContracts,
      expiredContracts,
      totalContractHours,
      totalApprovedHours,
      totalRemainingHours,
      overutilizedCustomers,
      underutilizedCustomers
    };
  }, [contracts, tickets, customerHealthList]);

  // --- 4. CONSULTANT & 5. SAP MANAGER PERFORMANCE ---
  const consultantsPerformance = useMemo(() => {
    return profiles.filter(p => p.role === 'Consultant').map(cons => {
      const name = cons.full_name || cons.email;
      const id = cons.id;

      const consTickets = tickets.filter(t => 
        t.assignedConsultant === name || 
        t.assignments?.some(a => a.consultantId === id && a.active)
      );

      const activeTickets = consTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      const closedTickets = consTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;
      const reopenedTickets = consTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length;
      const escalatedTickets = consTickets.filter(t => t.escalationFlag).length;

      let approvedHours = 0;
      let billableHours = 0;
      let nonBillableHours = 0;

      tickets.forEach(t => {
        (t.actualHoursLogs || []).forEach(log => {
          if (log.consultantId === id && log.approvalStatus?.toLowerCase() === 'approved') {
            approvedHours += log.actualHours;
            if (log.billable) {
              billableHours += log.actualHours;
            } else {
              nonBillableHours += log.actualHours;
            }
          }
        });
      });

      let estimatedHours = 0;
      tickets.forEach(t => {
        (t.estimates || []).forEach(est => {
          if (est.consultantId === id) {
            estimatedHours += est.estimatedHours;
          }
        });
      });

      const assignedCustomers = Array.from(new Set(consTickets.map(t => t.organization).filter(Boolean)));

      const consIncidents = consTickets.filter(t => (t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable');
      const consBreached = consIncidents.filter(t => {
        const due = new Date(t.slaDueAt).getTime();
        const end = t.status === 'Resolved' || t.status === 'Closed'
          ? new Date(t.resolvedAt || t.closedAt || Date.now()).getTime()
          : Date.now();
        return end > due;
      }).length;
      const slaCompliance = consIncidents.length > 0 ? ((consIncidents.length - consBreached) / consIncidents.length) * 100 : 100;

      const resolvedT = consTickets.filter(t => (t.status === 'Resolved' || t.status === 'Closed') && t.resolvedAt);
      const avgResolutionTime = resolvedT.length > 0
        ? resolvedT.reduce((sum, t) => sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60), 0) / resolvedT.length
        : 0;

      const closedT = consTickets.filter(t => t.status === 'Closed' && t.closedAt);
      const avgClosureTime = closedT.length > 0
        ? closedT.reduce((sum, t) => sum + (new Date(t.closedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60), 0) / closedT.length
        : 0;

      let workloadStatus: 'Available' | 'Healthy' | 'Near Capacity' | 'Overloaded' = 'Available';
      if (activeTickets > 5 || approvedHours > 160) {
        workloadStatus = 'Overloaded';
      } else if (activeTickets >= 4 || approvedHours >= 120) {
        workloadStatus = 'Near Capacity';
      } else if (activeTickets >= 1 || approvedHours >= 40) {
        workloadStatus = 'Healthy';
      }

      const utilization = (approvedHours / 160) * 100;

      return {
        name,
        type: cons.consultant_type || 'Technical',
        sapModules: cons.sap_modules || [],
        assignedCustomers,
        activeTickets,
        closedTickets,
        reopenedTickets,
        escalatedTickets,
        estimatedHours,
        approvedHours,
        billableHours,
        nonBillableHours,
        utilization,
        slaCompliance,
        avgResolutionTime,
        avgClosureTime,
        workloadStatus
      };
    });
  }, [profiles, tickets]);

  const managersPerformance = useMemo(() => {
    return profiles.filter(p => p.role === 'Manager').map(mgr => {
      const name = mgr.full_name || mgr.email;
      const id = mgr.id;

      const mgrTickets = tickets.filter(t => t.assignedManager === name);
      const openTickets = mgrTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      const closedTickets = mgrTickets.filter(t => t.status === 'Closed').length;
      const escalatedTickets = mgrTickets.filter(t => t.escalationFlag).length;

      const customersManaged = Array.from(new Set(mgrTickets.map(t => t.organization).filter(Boolean)));
      const consultantsManaged = Array.from(new Set(mgrTickets.map(t => t.assignedConsultant).filter(Boolean)));

      const pendingHours = mgrTickets.reduce((sum, t) => sum + (t.actualHoursLogs || []).filter(h => h.approvalStatus?.toLowerCase() === 'pending').length, 0);
      const pendingClosures = mgrTickets.filter(t => t.closureRequests?.some(r => r.status === 'Pending Manager Approval' || r.managerApprovalStatus === 'Pending')).length;
      const pendingUnlocks = mgrTickets.reduce((sum, t) => sum + (t.unlockRequests || []).filter(u => u.status === 'Pending').length, 0);
      const pendingApprovals = pendingHours + pendingClosures + pendingUnlocks;

      const mgrIncidents = mgrTickets.filter(t => (t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable');
      const mgrBreached = mgrIncidents.filter(t => {
        const due = new Date(t.slaDueAt).getTime();
        const end = t.status === 'Resolved' || t.status === 'Closed'
          ? new Date(t.resolvedAt || t.closedAt || Date.now()).getTime()
          : Date.now();
        return end > due;
      }).length;
      const slaCompliance = mgrIncidents.length > 0 ? ((mgrIncidents.length - mgrBreached) / mgrIncidents.length) * 100 : 100;

      const ratedTickets = mgrTickets.filter(t => t.rating && typeof t.rating.score === 'number');
      const csat = ratedTickets.length > 0 ? ratedTickets.reduce((sum, t) => sum + t.rating!.score, 0) / ratedTickets.length : 0;

      const resolvedT = mgrTickets.filter(t => (t.status === 'Resolved' || t.status === 'Closed') && t.resolvedAt);
      const avgResolutionTime = resolvedT.length > 0
        ? resolvedT.reduce((sum, t) => sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60), 0) / resolvedT.length
        : 0;

      const csatWeight = csat > 0 ? (csat / 5) * 100 * 0.4 : 32;
      const slaWeight = slaCompliance * 0.4;
      const escWeight = mgrTickets.length > 0 ? (1 - (escalatedTickets / mgrTickets.length)) * 100 * 0.2 : 20;
      const deliveryHealthScore = Math.min(100, Math.round(csatWeight + slaWeight + escWeight));

      return {
        name,
        customersManaged: customersManaged.length,
        consultantsManaged: consultantsManaged.length,
        ticketsManaged: mgrTickets.length,
        openTickets,
        closedTickets,
        escalatedTickets,
        pendingApprovals,
        slaCompliance,
        csat,
        avgResolutionTime,
        deliveryHealthScore
      };
    });
  }, [profiles, tickets]);

  // --- 6. TICKET OPERATIONS DETAILS ---
  const ticketStatusSplit = useMemo(() => {
    const statuses = [
      'New', 'Unassigned', 'Requirement Gathering', 'In Progress Functional',
      'In Progress Technical', 'Customer Action', 'On Hold', 'Raised to SAP',
      'Request for Closure', 'Closed', 'Reopened', 'Escalated', 'SLA Breached'
    ];

    const counts: Record<string, number> = {};
    statuses.forEach(s => { counts[s] = 0; });

    filteredTickets.forEach(t => {
      // Map statuses
      let matchedStatus = t.status as string;
      if (matchedStatus === 'In Progress - Functional' || matchedStatus === 'Awaiting Functional Submission') matchedStatus = 'In Progress Functional';
      if (matchedStatus === 'In Progress - Technical' || matchedStatus === 'Awaiting Technical Submission') matchedStatus = 'In Progress Technical';
      if (matchedStatus === 'Waiting for Customer') matchedStatus = 'Customer Action';
      if (matchedStatus === 'Awaiting Manager Approval') matchedStatus = 'Request for Closure';

      if (t.escalationFlag) {
        counts['Escalated']++;
      }

      // Check SLA breach
      if (t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable') {
        const due = new Date(t.slaDueAt).getTime();
        const end = t.status === 'Resolved' || t.status === 'Closed'
          ? new Date(t.resolvedAt || t.closedAt || Date.now()).getTime()
          : Date.now();
        if (end > due) {
          counts['SLA Breached']++;
        }
      }

      if (matchedStatus in counts) {
        counts[matchedStatus]++;
      } else if (matchedStatus === 'Resolved') {
        counts['Closed']++;
      } else {
        // Fallback or unassigned check
        if (!t.assignedConsultant && (t.status !== 'Closed' && t.status !== 'Resolved')) {
          counts['Unassigned']++;
        } else {
          counts['New']++;
        }
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTickets]);

  const ticketTypeSplit = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      const type = t.ticketType || 'Incident';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTickets]);

  const priorityDistribution = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    filteredTickets.forEach(t => {
      if (t.priority in counts) {
        counts[t.priority as keyof typeof counts]++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTickets]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTickets]);

  // --- 7. ESCALATION CONTROL CENTER ---
  const escalationControl = useMemo(() => {
    const escalatedTicketsList = tickets.filter(t => t.escalationFlag);
    const totalEscalations = escalatedTicketsList.length;
    const criticalEscalations = escalatedTicketsList.filter(t => t.priority === 'Critical').length;
    
    // Created today / this month
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthStr = new Date().toISOString().slice(0, 7);
    
    const escalatedToday = escalatedTicketsList.filter(t => 
      t.escalations?.some(esc => esc.createdAt?.startsWith(todayStr))
    ).length;

    const escalatedThisMonth = escalatedTicketsList.filter(t => 
      t.escalations?.some(esc => esc.createdAt?.startsWith(thisMonthStr))
    ).length;

    // Grouping
    const escByCustomer: Record<string, number> = {};
    const escByConsultant: Record<string, number> = {};
    const escByManager: Record<string, number> = {};

    escalatedTicketsList.forEach(t => {
      escByCustomer[t.organization] = (escByCustomer[t.organization] || 0) + 1;
      if (t.assignedConsultant) escByConsultant[t.assignedConsultant] = (escByConsultant[t.assignedConsultant] || 0) + 1;
      if (t.assignedManager) escByManager[t.assignedManager] = (escByManager[t.assignedManager] || 0) + 1;
    });

    let totalEscDays = 0;
    let escCountWithDates = 0;
    escalatedTicketsList.forEach(t => {
      const activeEsc = t.escalations?.find(esc => esc.status !== 'Resolved');
      if (activeEsc) {
        const days = (Date.now() - new Date(activeEsc.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        totalEscDays += days;
        escCountWithDates++;
      }
    });
    const avgEscAgingDays = escCountWithDates > 0 ? (totalEscDays / escCountWithDates).toFixed(1) : '0';

    return {
      totalEscalations,
      criticalEscalations,
      escalatedToday,
      escalatedThisMonth,
      byCustomer: Object.entries(escByCustomer).map(([name, value]) => ({ name, value })),
      byConsultant: Object.entries(escByConsultant).map(([name, value]) => ({ name, value })),
      byManager: Object.entries(escByManager).map(([name, value]) => ({ name, value })),
      avgEscAgingDays,
      list: escalatedTicketsList
    };
  }, [tickets]);

  // --- 8. APPROVAL CONTROL CENTER ---
  const approvalsControl = useMemo(() => {
    const list: Array<{
      id: string;
      ticketId: string;
      ticketNumber?: string;
      type: 'Actual Hours' | 'Closure' | 'Reopen' | 'Unlock' | 'Delete';
      details: string;
      requester: string;
      date: string;
      refObject: any;
    }> = [];

    let approvedThisMonth = 0;
    let rejectedThisMonth = 0;
    const thisMonthStr = new Date().toISOString().slice(0, 7);

    tickets.forEach(t => {
      // Pending actual hours
      (t.actualHoursLogs || []).forEach(ah => {
        if (ah.approvalStatus?.toLowerCase() === 'pending') {
          const consultantProfile = profiles.find(p => p.id === ah.consultantId);
          list.push({
            id: `ah-${ah.id}`,
            ticketId: t.id,
            ticketNumber: t.ticketNumber || t.id,
            type: 'Actual Hours',
            details: `${ah.actualHours} Hours (${ah.consultantType}) - Billable: ${ah.billable ? 'Yes' : 'No'}`,
            requester: consultantProfile?.full_name || 'Consultant',
            date: t.updatedAt || t.createdAt,
            refObject: ah
          });
        }
        if (ah.approvalStatus?.toLowerCase() === 'approved' && ah.approvedAt?.startsWith(thisMonthStr)) {
          approvedThisMonth++;
        }
        if (ah.approvalStatus?.toLowerCase() === 'rejected' && t.updatedAt?.startsWith(thisMonthStr)) {
          rejectedThisMonth++;
        }
      });

      // Pending closure approval
      (t.closureRequests || []).forEach(cr => {
        if (cr.status === 'Pending Manager Approval' || cr.managerApprovalStatus === 'Pending') {
          list.push({
            id: `closure-${cr.id}`,
            ticketId: t.id,
            ticketNumber: t.ticketNumber || t.id,
            type: 'Closure',
            details: `Actual Hours: ${cr.totalActualHours}h. Root Cause: ${cr.rootCause || 'N/A'}`,
            requester: cr.requestedBy || 'Consultant',
            date: cr.createdAt,
            refObject: cr
          });
        }
        if (cr.status === 'Approved' && cr.managerApprovedAt?.startsWith(thisMonthStr)) {
          approvedThisMonth++;
        }
        if (cr.status === 'Rejected' && cr.managerRejectedAt?.startsWith(thisMonthStr)) {
          rejectedThisMonth++;
        }
      });

      // Pending unlock
      (t.unlockRequests || []).forEach(ur => {
        if (ur.status === 'Pending') {
          list.push({
            id: `unlock-${ur.id}`,
            ticketId: t.id,
            ticketNumber: t.ticketNumber || t.id,
            type: 'Unlock',
            details: `Change: ${ur.requestedChange}. Reason: ${ur.reason}`,
            requester: ur.requestedBy,
            date: ur.createdAt,
            refObject: ur
          });
        }
      });

      // Pending delete
      (t.deleteRequests || []).forEach(dr => {
        if (dr.finalStatus === 'Pending') {
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

      // Reopen Requested Status
      if (t.status === 'Reopen Requested') {
        list.push({
          id: `reopen-${t.id}`,
          ticketId: t.id,
          ticketNumber: t.ticketNumber || t.id,
          type: 'Reopen',
          details: 'Awaiting Reopen request validation',
          requester: t.requestedBy || 'Customer',
          date: t.updatedAt || t.createdAt,
          refObject: t
        });
      }
    });

    let totalAgingDays = 0;
    list.forEach(item => {
      const days = (Date.now() - new Date(item.date).getTime()) / (1000 * 60 * 60 * 24);
      totalAgingDays += days;
    });
    const avgApprovalAgingDays = list.length > 0 ? (totalAgingDays / list.length).toFixed(1) : '0';

    return {
      pendingList: list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      approvedThisMonth,
      rejectedThisMonth,
      avgApprovalAgingDays
    };
  }, [tickets, profiles]);

  // --- 9. SLA COMMAND CENTER DETAILS ---
  const slaCommandCenter = useMemo(() => {
    const incidents = filteredTickets.filter(t => (t.ticketType === 'Incident' || !t.ticketType) && t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable');
    const total = incidents.length;
    
    const breachedList = incidents.filter(t => {
      const due = new Date(t.slaDueAt).getTime();
      const end = t.status === 'Resolved' || t.status === 'Closed'
        ? new Date(t.resolvedAt || t.closedAt || Date.now()).getTime()
        : Date.now();
      return end > due;
    });
    const breached = breachedList.length;
    const met = total - breached;
    const compliance = total > 0 ? (met / total) * 100 : 100;

    const warningList = incidents.filter(t => {
      if (t.status === 'Resolved' || t.status === 'Closed') return false;
      const start = new Date(t.createdAt).getTime();
      const due = new Date(t.slaDueAt).getTime();
      const now = Date.now();
      if (now >= due) return false;
      const totalSla = due - start;
      const remaining = due - now;
      return totalSla > 0 && (remaining / totalSla) <= 0.3;
    });

    // Grouping SLA
    const slaByCustomer: Record<string, { total: number; breached: number }> = {};
    const slaByConsultant: Record<string, { total: number; breached: number }> = {};
    const slaByManager: Record<string, { total: number; breached: number }> = {};
    const slaByModule: Record<string, { total: number; breached: number }> = {};

    incidents.forEach(t => {
      const isBreached = breachedList.some(b => b.id === t.id);

      if (!slaByCustomer[t.organization]) slaByCustomer[t.organization] = { total: 0, breached: 0 };
      slaByCustomer[t.organization].total++;
      if (isBreached) slaByCustomer[t.organization].breached++;

      if (t.assignedConsultant) {
        if (!slaByConsultant[t.assignedConsultant]) slaByConsultant[t.assignedConsultant] = { total: 0, breached: 0 };
        slaByConsultant[t.assignedConsultant].total++;
        if (isBreached) slaByConsultant[t.assignedConsultant].breached++;
      }

      if (t.assignedManager) {
        if (!slaByManager[t.assignedManager]) slaByManager[t.assignedManager] = { total: 0, breached: 0 };
        slaByManager[t.assignedManager].total++;
        if (isBreached) slaByManager[t.assignedManager].breached++;
      }

      if (t.sapModule) {
        if (!slaByModule[t.sapModule]) slaByModule[t.sapModule] = { total: 0, breached: 0 };
        slaByModule[t.sapModule].total++;
        if (isBreached) slaByModule[t.sapModule].breached++;
      }
    });

    const slaByPriorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    breachedList.forEach(t => {
      if (t.priority in slaByPriorityCounts) {
        slaByPriorityCounts[t.priority as keyof typeof slaByPriorityCounts]++;
      }
    });

    return {
      compliance,
      met,
      warning: warningList.length,
      breached,
      byCustomer: Object.entries(slaByCustomer).map(([name, val]) => ({ name, compliance: ((val.total - val.breached) / val.total) * 100, breached: val.breached })),
      byConsultant: Object.entries(slaByConsultant).map(([name, val]) => ({ name, compliance: ((val.total - val.breached) / val.total) * 100, breached: val.breached })),
      byManager: Object.entries(slaByManager).map(([name, val]) => ({ name, compliance: ((val.total - val.breached) / val.total) * 100, breached: val.breached })),
      byModule: Object.entries(slaByModule).map(([name, val]) => ({ name, compliance: ((val.total - val.breached) / val.total) * 100, breached: val.breached })),
      warningList,
      breachedList,
      byPriority: Object.entries(slaByPriorityCounts).map(([name, value]) => ({ name, value }))
    };
  }, [filteredTickets]);

  // --- 10. SAP MODULE INSIGHTS ---
  const modulesData = useMemo(() => {
    const sapModules = [
      'FICO', 'SD', 'MM', 'PP', 'PM', 'QM', 'HCM',
      'SF EC', 'SF ECP', 'SF PMGM', 'SF RCM', 'SAC',
      'ABAP', 'BASIS', 'CPI'
    ];

    return sapModules.map(mod => {
      const modTickets = filteredTickets.filter(t => t.sapModule === mod || t.sapModules?.includes(mod as any));
      const ticketCount = modTickets.length;

      let approvedHours = 0;
      modTickets.forEach(t => {
        const approved = (t.actualHoursLogs || []).filter(ah => ah.approvalStatus?.toLowerCase() === 'approved');
        approvedHours += approved.reduce((acc, curr) => acc + curr.actualHours, 0);
      });

      const escalations = modTickets.filter(t => t.escalationFlag).length;

      const slaBreaches = modTickets.filter(t => {
        if (!t.slaDueAt || t.slaDueAt === 'SLA Not Applicable') return false;
        const due = new Date(t.slaDueAt).getTime();
        const end = t.status === 'Resolved' || t.status === 'Closed'
          ? new Date(t.resolvedAt || t.closedAt || Date.now()).getTime()
          : Date.now();
        return end > due;
      }).length;

      const reopened = modTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length;
      
      const riskScore = (escalations * 35) + (slaBreaches * 40) + (reopened * 20) + (ticketCount * 5);

      return {
        module: mod,
        tickets: ticketCount,
        approvedHours,
        escalations,
        slaBreaches,
        reopened,
        riskScore
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }, [filteredTickets]);

  // --- 12. ALERTS & RISKS LEDGER ---
  const alertsList = useMemo(() => {
    const alerts: Array<{
      id: string;
      severity: 'Critical' | 'High' | 'Warning' | 'Low';
      category: string;
      reason: string;
      owner: string;
      action: string;
    }> = [];

    // Customer risks
    customerHealthList.forEach(cust => {
      if (cust.healthStatus === 'Critical') {
        alerts.push({
          id: `cust-crit-${cust.name}`,
          severity: 'Critical',
          category: 'Customer Health',
          reason: `Customer ${cust.name} delivery health is Critical (CSAT: ${cust.csat}, Escalations: ${cust.escalatedTickets}, SLA Breaches: ${cust.slaBreaches}).`,
          owner: 'Assigned Managers',
          action: 'Immediately contact client sponsor and perform alignment check.'
        });
      } else if (cust.healthStatus === 'At Risk') {
        alerts.push({
          id: `cust-risk-${cust.name}`,
          severity: 'High',
          category: 'Customer Health',
          reason: `Customer ${cust.name} is At Risk (SLA Breaches: ${cust.slaBreaches}, Escalations: ${cust.escalatedTickets}).`,
          owner: 'Delivery Manager',
          action: 'Review ticket backlogs and dispatch resources.'
        });
      }

      if (cust.utilizationPct > 100) {
        alerts.push({
          id: `cust-over-${cust.name}`,
          severity: 'High',
          category: 'Contract Burn',
          reason: `Customer ${cust.name} contract is overutilized (${cust.utilizationPct.toFixed(1)}% burned).`,
          owner: 'Account Executive',
          action: 'Schedule contract scope expansion review.'
        });
      }
    });

    // Expiring contracts
    contracts.forEach(c => {
      if (c.isActive) {
        const days = Math.ceil((new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days > 0 && days <= 30) {
          alerts.push({
            id: `contr-exp-${c.id}`,
            severity: 'High',
            category: 'Contract Expiry',
            reason: `Active contract for ${c.organizationName} is expiring in ${days} days.`,
            owner: 'Delivery Head',
            action: 'Submit renewal proposal immediately.'
          });
        }
      }
    });

    // Consultant overload
    consultantsPerformance.forEach(cons => {
      if (cons.workloadStatus === 'Overloaded') {
        alerts.push({
          id: `cons-over-${cons.name}`,
          severity: 'High',
          category: 'Resource Workload',
          reason: `Consultant ${cons.name} is overloaded (${cons.activeTickets} active tickets, ${cons.approvedHours.toFixed(1)}h logged).`,
          owner: 'Delivery Manager',
          action: 'Reassign non-critical tasks to underutilized consultants.'
        });
      } else if (cons.workloadStatus === 'Available' && cons.approvedHours < 20) {
        alerts.push({
          id: `cons-under-${cons.name}`,
          severity: 'Warning',
          category: 'Resource Workload',
          reason: `Consultant ${cons.name} is underutilized (${cons.activeTickets} active tickets, ${cons.approvedHours.toFixed(1)}h logged).`,
          owner: 'Delivery Manager',
          action: 'Load balance incoming support cases into this consultant queue.'
        });
      }
    });

    // Reopened ticket check
    filteredTickets.forEach(t => {
      if (t.reopenedCount && t.reopenedCount > 1) {
        alerts.push({
          id: `t-reopen-${t.id}`,
          severity: 'High',
          category: 'Rework Risk',
          reason: `Ticket ${t.ticketNumber || t.id} has been reopened ${t.reopenedCount} times.`,
          owner: t.assignedConsultant || 'Unassigned',
          action: 'Request technical lead audit on ticket solution.'
        });
      }
      if (t.escalationFlag) {
        alerts.push({
          id: `t-esc-${t.id}`,
          severity: t.priority === 'Critical' ? 'Critical' : 'High',
          category: 'Active Escalation',
          reason: `Ticket ${t.ticketNumber || t.id} is escalated (Priority: ${t.priority}).`,
          owner: t.assignedManager || 'Assigned Manager',
          action: 'Acknowledge escalation and review details.'
        });
      }
    });

    // SLA warnings
    slaCommandCenter.warningList.forEach(t => {
      alerts.push({
        id: `t-slawarn-${t.id}`,
        severity: 'Warning',
        category: 'SLA Breach Risk',
        reason: `Incident ${t.ticketNumber || t.id} is approaching its SLA threshold (slaDueAt: ${new Date(t.slaDueAt).toLocaleTimeString()}).`,
        owner: t.assignedConsultant || 'Unassigned',
        action: 'Notify consultant to prioritize this incident.'
      });
    });

    return alerts.sort((a, b) => {
      const order = { Critical: 0, High: 1, Warning: 2, Low: 3 };
      return order[a.severity] - order[b.severity];
    });
  }, [customerHealthList, contracts, consultantsPerformance, filteredTickets, slaCommandCenter]);

  // --- 13. TRENDS DATA AGGREGATION ---
  const last6Months = useMemo(() => {
    const list: Array<{ key: string; label: string; year: number; month: number }> = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const target = new Date(d.getFullYear(), d.getMonth() - i, 1);
      list.push({
        key: `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`,
        label: `${months[target.getMonth()]} ${String(target.getFullYear()).slice(-2)}`,
        year: target.getFullYear(),
        month: target.getMonth()
      });
    }
    return list;
  }, []);

  const monthlyTrends = useMemo(() => {
    return last6Months.map(m => {
      const prefix = m.key;

      const created = tickets.filter(t => t.createdAt?.startsWith(prefix)).length;
      const closed = tickets.filter(t => t.closedAt?.startsWith(prefix)).length;
      const reopened = tickets.filter(t => (t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)) && t.updatedAt?.startsWith(prefix)).length;
      const escalations = tickets.filter(t => t.escalations?.some(esc => esc.createdAt?.startsWith(prefix))).length;

      let approvedHours = 0;
      tickets.forEach(t => {
        (t.actualHoursLogs || []).forEach(ah => {
          if (ah.approvalStatus?.toLowerCase() === 'approved' && ah.approvedAt?.startsWith(prefix)) {
            approvedHours += ah.actualHours;
          }
        });
      });

      const incidentsInMonth = tickets.filter(t => 
        (t.ticketType === 'Incident' || !t.ticketType) &&
        t.slaDueAt && t.slaDueAt !== 'SLA Not Applicable' &&
        (t.resolvedAt?.startsWith(prefix) || t.closedAt?.startsWith(prefix))
      );
      const breachedInMonth = incidentsInMonth.filter(t => {
        const due = new Date(t.slaDueAt).getTime();
        const end = new Date(t.resolvedAt || t.closedAt || 0).getTime();
        return end > due;
      }).length;
      const slaCompliance = incidentsInMonth.length > 0 ? ((incidentsInMonth.length - breachedInMonth) / incidentsInMonth.length) * 100 : 100;

      return {
        month: m.label,
        Created: created,
        Closed: closed,
        Reopened: reopened,
        Escalations: escalations,
        Hours: approvedHours,
        Sla: slaCompliance
      };
    });
  }, [tickets, last6Months]);

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse p-6 bg-zinc-950/5 min-h-screen">
        <div className="flex justify-between items-center pb-5 border-b border-zinc-200">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-zinc-200" />
            <Skeleton className="h-4 w-96 bg-zinc-150" />
          </div>
          <Skeleton className="h-10 w-28 bg-zinc-200" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="border border-zinc-250 rounded-xl p-5 bg-white space-y-3 shadow-sm">
              <Skeleton className="h-4 w-24 bg-zinc-150" />
              <Skeleton className="h-8 w-16 bg-zinc-250" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 p-6 bg-zinc-50 min-h-screen font-sans">
      
      {/* 16. Header Component */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black font-mono text-zinc-950 uppercase tracking-tight flex items-center gap-2">
            <span>SAP DELIVERY HEALTH TOWER</span>
            <Badge variant="outline" className="text-[9px] font-bold border-zinc-300 font-mono tracking-wider text-zinc-600 bg-zinc-100 py-0.5 rounded">
              PLATFORM TELEMETRY
            </Badge>
          </h1>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Real-time delivery operations compliance, resource capacity backlogs, and SLA controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/tickets" className="h-9 px-4 inline-flex items-center justify-center bg-zinc-950 hover:bg-zinc-900 text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm">
            Global Ticket Desk
          </Link>
          <button onClick={() => window.location.reload()} className="h-9 w-9 border border-zinc-200 hover:border-zinc-950 rounded-lg bg-white transition-all flex items-center justify-center text-zinc-600 cursor-pointer">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 16. Global Interactive Filters */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <h3 className="font-bold text-[10px] uppercase text-zinc-500 tracking-wider font-mono">Global Filter Matrices</h3>
          <button onClick={resetFilters} className="text-[9px] font-bold text-zinc-500 hover:text-zinc-950 uppercase underline cursor-pointer font-mono">
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px] font-mono">Manager Queue</label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Managers</option>
              {managersList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px] font-mono">Customer Account</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Customers</option>
              {customersList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px] font-mono">SAP Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Modules</option>
              {modulesList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-500 uppercase text-[8px] font-mono">Ticket Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-1.5 text-[10px] text-zinc-900 focus:outline-none focus:border-zinc-950 font-mono"
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs navigation for the operational screens */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex bg-zinc-150 p-1 rounded-xl border border-zinc-200 flex-wrap gap-1 w-full justify-start h-auto">
          <TabsTrigger value="cockpit" className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-mono">
            <Activity size={13} /> Cockpit Overview
          </TabsTrigger>
          <TabsTrigger value="customers" className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-mono">
            <HeartHandshake size={13} /> Customer Delivery Health
          </TabsTrigger>
          <TabsTrigger value="resources" className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-mono">
            <Users size={13} /> Resources & Performance
          </TabsTrigger>
          <TabsTrigger value="operations" className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-mono">
            <Layers size={13} /> Operations & SLAs
          </TabsTrigger>
          <TabsTrigger value="escalations-approvals" className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-mono">
            <ShieldAlert size={13} /> Escalations & Approvals
          </TabsTrigger>
          <TabsTrigger value="modules" className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-mono">
            <BarChart3 size={13} /> SAP Module Insights
          </TabsTrigger>
          <TabsTrigger value="user-control" className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-mono">
            <Users size={13} /> User Control Center
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: COCKPIT OVERVIEW */}
        <TabsContent value="cockpit" className="space-y-6">
          
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
              <CardContent className="p-5 space-y-1">
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider font-mono block">Total Customers</span>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold font-mono text-zinc-950">{globalStats.totalCustomers}</span>
                  <Building2 size={16} className="text-zinc-400" />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">{globalStats.activeCustomers} Active Profiles</span>
              </CardContent>
            </Card>

            <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
              <CardContent className="p-5 space-y-1">
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider font-mono block">Delivery Managers</span>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold font-mono text-zinc-950">{globalStats.totalManagers}</span>
                  <UserCheck size={16} className="text-zinc-400" />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">{globalStats.activeManagers} Active Managers</span>
              </CardContent>
            </Card>

            <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
              <CardContent className="p-5 space-y-1">
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider font-mono block">Total Consultants</span>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold font-mono text-zinc-950">{globalStats.totalConsultants}</span>
                  <Users size={16} className="text-zinc-400" />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">{globalStats.functionalConsultants} Functional / {globalStats.technicalConsultants} Technical</span>
              </CardContent>
            </Card>

            <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
              <CardContent className="p-5 space-y-1">
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider font-mono block">Total Ticket Volume</span>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold font-mono text-zinc-950">{globalStats.totalTickets}</span>
                  <Ticket size={16} className="text-zinc-400" />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">{globalStats.openTickets} Open / {globalStats.closedTickets} Closed</span>
              </CardContent>
            </Card>

            <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
              <CardContent className="p-5 space-y-1">
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider font-mono block">Escalations Pending</span>
                <div className="flex justify-between items-center">
                  <span className={`text-2xl font-bold font-mono ${globalStats.escalatedTickets > 0 ? 'text-red-650' : 'text-zinc-950'}`}>{globalStats.escalatedTickets}</span>
                  <AlertTriangle size={16} className={globalStats.escalatedTickets > 0 ? 'text-red-500' : 'text-zinc-400'} />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">{globalStats.reopenedTickets} Reopened Tickets</span>
              </CardContent>
            </Card>

            <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
              <CardContent className="p-5 space-y-1">
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider font-mono block">SLA Breaches</span>
                <div className="flex justify-between items-center">
                  <span className={`text-2xl font-bold font-mono ${globalStats.slaBreachedTickets > 0 ? 'text-red-650 animate-pulse font-black' : 'text-zinc-950'}`}>{globalStats.slaBreachedTickets}</span>
                  <Clock size={16} className={globalStats.slaBreachedTickets > 0 ? 'text-red-500' : 'text-zinc-400'} />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">SLA Compliance: {slaCommandCenter.compliance.toFixed(1)}%</span>
              </CardContent>
            </Card>

            <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
              <CardContent className="p-5 space-y-1">
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider font-mono block">Pending Approvals</span>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold font-mono text-zinc-950">{globalStats.pendingApprovalsCount}</span>
                  <FileCheck size={16} className="text-zinc-400" />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">{globalStats.pendingClosureRequestsCount} Pending Closures</span>
              </CardContent>
            </Card>

            <Card className="bg-white border border-zinc-200 shadow-sm rounded-xl">
              <CardContent className="p-5 space-y-1">
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider font-mono block">Approved Team Effort</span>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold font-mono text-zinc-950">{globalStats.totalApprovedActualHours.toFixed(1)}h</span>
                  <DollarSign size={16} className="text-zinc-400" />
                </div>
                <span className="text-[9px] text-zinc-500 font-mono block">Actual approved log entries</span>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Alerts Ledger feed */}
            <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl lg:col-span-2">
              <CardHeader className="border-b border-zinc-100 pb-3">
                <CardTitle className="text-xs uppercase font-bold text-zinc-700 tracking-wider font-mono flex items-center gap-2">
                  <ShieldAlert size={14} className="text-red-500" /> Active Platform Risks & Alerts Ledger
                </CardTitle>
                <CardDescription className="text-[10px] text-zinc-500 font-mono">
                  Calculated dynamically from live ticketing records.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-100 max-h-[480px] overflow-y-auto">
                  {alertsList.map(alert => (
                    <div key={alert.id} className="p-4 flex gap-3 text-xs">
                      <div className="shrink-0 pt-0.5">
                        {alert.severity === 'Critical' && <AlertCircle className="text-red-500" size={16} />}
                        {alert.severity === 'High' && <AlertTriangle className="text-orange-500" size={16} />}
                        {alert.severity === 'Warning' && <AlertTriangle className="text-amber-500" size={16} />}
                        {alert.severity === 'Low' && <HelpCircle className="text-blue-500" size={16} />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-950 font-mono uppercase text-[10px]">{alert.category}</span>
                          <Badge variant="outline" className={`text-[8px] font-mono uppercase ${
                            alert.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                            alert.severity === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            alert.severity === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-250' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-zinc-700">{alert.reason}</p>
                        <div className="pt-1 flex flex-col md:flex-row md:justify-between text-[9px] text-zinc-500 font-mono gap-1">
                          <span>Owner: {alert.owner}</span>
                          <span className="text-zinc-800 font-bold uppercase">Action: {alert.action}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {alertsList.length === 0 && (
                    <div className="p-8 text-center text-zinc-400 italic font-mono">
                      No active alerts or delivery breaches detected.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Summary Burn Widget */}
            <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl">
              <CardHeader className="border-b border-zinc-100 pb-3">
                <CardTitle className="text-xs uppercase font-bold text-zinc-700 tracking-wider font-mono">
                  Global Capacity burn
                </CardTitle>
                <CardDescription className="text-[10px] text-zinc-500 font-mono">
                  Percentage burned of total contracts portfolio.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-500">Contract hours portfolio:</span>
                    <span className="font-bold text-zinc-950">{contractGovernance.totalContractHours.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-500">Approved hours burnt:</span>
                    <span className="font-bold text-zinc-950">{contractGovernance.totalApprovedHours.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-zinc-500">Remaining capacity:</span>
                    <span className="font-bold text-emerald-700">{contractGovernance.totalRemainingHours.toFixed(1)}h</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] uppercase font-bold text-zinc-500 font-mono">
                    <span>Aggregate burn-down</span>
                    <span>{contractGovernance.totalContractHours > 0 ? ((contractGovernance.totalApprovedHours / contractGovernance.totalContractHours) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <Progress value={contractGovernance.totalContractHours > 0 ? (contractGovernance.totalApprovedHours / contractGovernance.totalContractHours) * 100 : 0} className="h-2 rounded bg-zinc-100 [&>div]:bg-zinc-950" />
                </div>

                <div className="pt-4 border-t border-zinc-100 space-y-3 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Active contracts:</span>
                    <span className="font-bold">{contractGovernance.totalActiveContracts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Expiring soon:</span>
                    <span className="font-bold text-amber-700">{contractGovernance.expiringContracts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Overburned customers:</span>
                    <span className="font-bold text-red-600">{contractGovernance.overutilizedCustomers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: CUSTOMER DELIVERY HEALTH */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Customer Contract Utilization */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">1. Customer Contract Utilization</span>
              <div className="h-60">
                {customerHealthList.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={customerHealthList} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={8} className="font-mono" />
                      <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                      <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Bar dataKey="contractedHours" name="Contract Limit" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="approvedHours" name="Burnt Effort" fill="#1e1b4b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400 italic font-mono">No customer metrics available</div>
                )}
              </div>
            </Card>

            {/* Chart 2: Customer-wise Hours Usage */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">2. Customer-wise Hours Usage Share</span>
              <div className="h-60 flex items-center justify-center">
                {customerHealthList.some(c => c.approvedHours > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={customerHealthList.filter(c => c.approvedHours > 0)}
                        dataKey="approvedHours"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={({ name, percent }) => `${(name || '').slice(0, 8)}... ${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {customerHealthList.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-zinc-400 italic font-mono">No burn hours logged yet</div>
                )}
              </div>
            </Card>
          </div>

          {/* Customer Health Matrix Table */}
          <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl overflow-hidden">
            <div className="p-3 bg-zinc-100 border-b border-zinc-200">
              <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">Customer Delivery health matrix</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50 border-b border-zinc-200 text-[9px] font-mono">
                  <TableRow>
                    <TableHead className="py-2.5 px-4 font-bold">Organization</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Health</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold">Contract Start</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold">Contract End</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Status</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-right">Contracted</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-right">Approved Used</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-right">Remaining</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Burn %</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Open</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Closed</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Reopened</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Escalated</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">SLA Breaches</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">CSAT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-[11px]">
                  {customerHealthList.map(cust => (
                    <TableRow key={cust.name} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="py-2.5 px-4 font-bold text-zinc-950">{cust.name}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center">
                        <Badge variant="outline" className={`text-[8px] font-mono font-bold uppercase rounded ${
                          cust.healthStatus === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                          cust.healthStatus === 'At Risk' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          cust.healthStatus === 'Watchlist' ? 'bg-amber-50 text-amber-700 border-amber-250' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {cust.healthStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 px-4 font-mono text-[10px]">
                        {cust.contractStart !== 'N/A' ? new Date(cust.contractStart).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 font-mono text-[10px]">
                        {cust.contractEnd !== 'N/A' ? new Date(cust.contractEnd).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-semibold">
                        <Badge variant="secondary" className="text-[8px] rounded uppercase font-mono">{cust.contractStatus}</Badge>
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono font-semibold">{cust.contractedHours.toFixed(1)}h</TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-zinc-900">{cust.approvedHours.toFixed(1)}h</TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">{cust.remainingHours.toFixed(1)}h</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-mono font-bold text-zinc-800">{cust.utilizationPct.toFixed(0)}%</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-bold">{cust.openTickets}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center text-zinc-500">{cust.closedTickets}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-bold text-zinc-700">{cust.reopenedTickets}</TableCell>
                      <TableCell className={`py-2.5 px-4 text-center font-bold ${cust.escalatedTickets > 0 ? 'text-red-650' : 'text-zinc-400'}`}>{cust.escalatedTickets}</TableCell>
                      <TableCell className={`py-2.5 px-4 text-center font-bold ${cust.slaBreaches > 0 ? 'text-red-650' : 'text-zinc-400'}`}>{cust.slaBreaches}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-bold text-emerald-700">{cust.csat}</TableCell>
                    </TableRow>
                  ))}
                  {customerHealthList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={15} className="py-10 text-center text-zinc-400 font-mono italic">
                        No customer logs provisioned in the database.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: RESOURCES & CAPACITY */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 3: Consultant Workload Distribution */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">3. Consultant Workload Distribution</span>
              <div className="h-60">
                {consultantsPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultantsPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={8} className="font-mono" />
                      <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                      <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Bar dataKey="activeTickets" name="Active Tickets" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="approvedHours" name="Approved Actual Hours" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400 italic font-mono">No consultants data available</div>
                )}
              </div>
            </Card>

            {/* Chart 4: Manager Delivery Performance */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">4. Manager Delivery Performance</span>
              <div className="h-60">
                {managersPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={managersPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={8} className="font-mono" />
                      <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                      <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Bar dataKey="openTickets" name="Open" fill="#eab308" stackId="mgr" />
                      <Bar dataKey="closedTickets" name="Closed" fill="#10b981" stackId="mgr" />
                      <Bar dataKey="escalatedTickets" name="Escalated" fill="#ef4444" stackId="mgr" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400 italic font-mono">No managers logs found</div>
                )}
              </div>
            </Card>
          </div>

          {/* Consultant capacity table */}
          <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl overflow-hidden">
            <div className="p-3 bg-zinc-100 border-b border-zinc-200">
              <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">Consultant performance dashboard</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50 border-b border-zinc-200 text-[9px] font-mono">
                  <TableRow>
                    <TableHead className="py-2.5 px-4 font-bold">Consultant Name</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold">Type</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold">SAP Modules</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold">Clients</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Active</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Closed</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Reopened</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Escalated</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-right">Estimated</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-right">Approved Hours</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-right">Billable</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-right">Non-Billable</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Utilization %</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">SLA Compliance</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Workload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-[11px]">
                  {consultantsPerformance.map(cons => (
                    <TableRow key={cons.name} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="py-2.5 px-4 font-bold text-zinc-950">{cons.name}</TableCell>
                      <TableCell className="py-2.5 px-4 font-mono font-medium">{cons.type}</TableCell>
                      <TableCell className="py-2.5 px-4 max-w-[150px] truncate" title={cons.sapModules.join(', ')}>
                        {cons.sapModules.join(', ')}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 max-w-[120px] truncate" title={cons.assignedCustomers.join(', ')}>
                        {cons.assignedCustomers.join(', ')}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-bold">{cons.activeTickets}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center text-zinc-500">{cons.closedTickets}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center text-zinc-700">{cons.reopenedTickets}</TableCell>
                      <TableCell className={`py-2.5 px-4 text-center font-bold ${cons.escalatedTickets > 0 ? 'text-red-650' : 'text-zinc-400'}`}>{cons.escalatedTickets}</TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono">{cons.estimatedHours.toFixed(1)}h</TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-zinc-900">{cons.approvedHours.toFixed(1)}h</TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700">{cons.billableHours.toFixed(1)}h</TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono text-zinc-500">{cons.nonBillableHours.toFixed(1)}h</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-mono font-bold">{cons.utilization.toFixed(0)}%</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-mono font-bold text-zinc-800">{cons.slaCompliance.toFixed(1)}%</TableCell>
                      <TableCell className="py-2.5 px-4 text-center">
                        <Badge variant="outline" className={`text-[8px] font-mono font-bold uppercase rounded ${
                          cons.workloadStatus === 'Overloaded' ? 'bg-red-50 text-red-700 border-red-200' :
                          cons.workloadStatus === 'Near Capacity' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          cons.workloadStatus === 'Healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}>
                          {cons.workloadStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {consultantsPerformance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={15} className="py-10 text-center text-zinc-400 font-mono italic">
                        No support consultants registered in system.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Manager performance table */}
          <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl overflow-hidden">
            <div className="p-3 bg-zinc-100 border-b border-zinc-200">
              <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">Manager delivery health metrics</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50 border-b border-zinc-200 text-[9px] font-mono">
                  <TableRow>
                    <TableHead className="py-2.5 px-4 font-bold">Manager Name</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Customers Managed</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Consultants Managed</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Tickets</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Open</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Closed</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Escalated</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Pending Approvals</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">SLA Compliance</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Mean CSAT</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-right">Avg Resolution Time</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Delivery Health Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-[11px]">
                  {managersPerformance.map(mgr => (
                    <TableRow key={mgr.name} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="py-2.5 px-4 font-bold text-zinc-950">{mgr.name}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-semibold">{mgr.customersManaged}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-semibold">{mgr.consultantsManaged}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-bold text-zinc-800">{mgr.ticketsManaged}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center">{mgr.openTickets}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center text-zinc-500">{mgr.closedTickets}</TableCell>
                      <TableCell className={`py-2.5 px-4 text-center font-bold ${mgr.escalatedTickets > 0 ? 'text-red-650' : 'text-zinc-400'}`}>{mgr.escalatedTickets}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-bold text-amber-700">{mgr.pendingApprovals}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-mono font-bold">{mgr.slaCompliance.toFixed(1)}%</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-bold text-emerald-700">
                        {mgr.csat > 0 ? `${mgr.csat.toFixed(1)} / 5.0` : 'N/A'}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono">{mgr.avgResolutionTime.toFixed(1)}h</TableCell>
                      <TableCell className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={mgr.deliveryHealthScore} className="h-1.5 w-12 bg-zinc-150 [&>div]:bg-zinc-900" />
                          <span className="font-mono font-bold text-[10px]">{mgr.deliveryHealthScore}/100</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {managersPerformance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="py-10 text-center text-zinc-400 font-mono italic">
                        No SAP managers registered in the database.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: OPERATIONS & SLAS */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Chart 5: Ticket Status Distribution */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">5. Ticket Status Distribution</span>
              <div className="h-56 flex items-center justify-center">
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={2}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-zinc-400 italic font-mono">No operational logs</div>
                )}
              </div>
            </Card>

            {/* Chart 6: Ticket Priority Distribution */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">6. Ticket Priority Split</span>
              <div className="h-56">
                {priorityDistribution.some(p => p.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={9} className="font-mono" />
                      <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                      <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                        {priorityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#6366f1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400 italic font-mono">No priorities to plot</div>
                )}
              </div>
            </Card>

            {/* Chart 8: SLA Compliance Trend */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">8. SLA Compliance Trend %</span>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="slaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} className="font-mono" />
                    <YAxis stroke="#71717a" fontSize={9} domain={[0, 100]} className="font-mono" />
                    <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Area type="monotone" dataKey="Sla" name="SLA Compliance %" stroke="#4f46e5" fill="url(#slaGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Chart 9: Approved Hours burn trend */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">9. Approved Actual Hours Burn Trend</span>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} className="font-mono" />
                    <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                    <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Area type="monotone" dataKey="Hours" name="Hours Consumed" stroke="#10b981" fill="url(#hoursGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 10: Open vs Closed Trend */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">10. Open vs Closed Trend (Monthly)</span>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} className="font-mono" />
                    <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                    <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Line type="monotone" dataKey="Created" stroke="#f59e0b" strokeWidth={2} name="Tickets Raised" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Closed" stroke="#10b981" strokeWidth={2} name="Tickets Closed" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 12: Closure Trend */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">12. Closure Trend (Closed Volume)</span>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} className="font-mono" />
                    <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                    <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="Closed" stroke="#18181b" strokeWidth={2} name="Closed Count" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 13: Reopen Trend */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">13. Reopened Ticket Trend</span>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={8} className="font-mono" />
                    <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                    <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="Reopened" stroke="#f43f5e" strokeWidth={2} name="Reopenings" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Ticket Pipeline Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Status counts layout */}
            <Card className="border border-zinc-200 bg-white p-5 rounded-xl shadow-sm col-span-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">Operations Status Breakdown</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {ticketStatusSplit.map(stat => (
                  <div key={stat.name} className="p-3 bg-zinc-50 border border-zinc-150 rounded-lg flex flex-col justify-between">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase font-mono">{stat.name}</span>
                    <span className="text-xl font-bold font-mono text-zinc-950 mt-1">{stat.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Ticket types split layout */}
            <Card className="border border-zinc-200 bg-white p-5 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">Ticket Type Split</span>
              <div className="space-y-3">
                {ticketTypeSplit.map(type => (
                  <div key={type.name} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span>{type.name}</span>
                      <span className="font-bold">{type.value}</span>
                    </div>
                    <Progress value={filteredTickets.length > 0 ? (type.value / filteredTickets.length) * 100 : 0} className="h-1.5 bg-zinc-100 [&>div]:bg-zinc-800" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 5: ESCALATIONS & APPROVALS CONTROL */}
        <TabsContent value="escalations-approvals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Escalation stats dashboard */}
            <Card className="border border-zinc-200 bg-white p-5 rounded-xl shadow-sm lg:col-span-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">Escalation Control Tower Metrics</span>
              <div className="space-y-4 font-mono">
                <div className="flex justify-between text-xs border-b border-zinc-100 pb-2">
                  <span className="text-zinc-500">Total Escalated:</span>
                  <span className="font-bold text-red-600">{escalationControl.totalEscalations}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-zinc-100 pb-2">
                  <span className="text-zinc-500">Critical Escalations:</span>
                  <span className="font-bold text-red-700">{escalationControl.criticalEscalations}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-zinc-100 pb-2">
                  <span className="text-zinc-500">Escalated Today:</span>
                  <span className="font-bold text-zinc-950">{escalationControl.escalatedToday}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-zinc-100 pb-2">
                  <span className="text-zinc-500">Escalated This Month:</span>
                  <span className="font-bold text-zinc-950">{escalationControl.escalatedThisMonth}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-zinc-100 pb-2">
                  <span className="text-zinc-500">Avg Escalation Aging:</span>
                  <span className="font-bold text-zinc-950">{escalationControl.avgEscAgingDays} Days</span>
                </div>
              </div>
            </Card>

            {/* Chart 7: Escalation Trend */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm lg:col-span-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">7. Escalation Burn Trend (Monthly)</span>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={9} className="font-mono" />
                    <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                    <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="Escalations" stroke="#ef4444" strokeWidth={2} name="Escalation Count" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Escalations lists breakdown */}
            <Card className="border border-zinc-200 bg-white p-5 rounded-xl shadow-sm lg:col-span-1 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-2 font-mono">Escalations by customer</span>
                <div className="space-y-2 text-xs font-mono">
                  {escalationControl.byCustomer.map(item => (
                    <div key={item.name} className="flex justify-between">
                      <span className="text-zinc-650">{item.name}</span>
                      <span className="font-bold text-red-650">{item.value}</span>
                    </div>
                  ))}
                  {escalationControl.byCustomer.length === 0 && <div className="text-zinc-400 italic text-[10px]">No customer escalations.</div>}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-2 font-mono">Escalations by Consultant</span>
                <div className="space-y-2 text-xs font-mono">
                  {escalationControl.byConsultant.map(item => (
                    <div key={item.name} className="flex justify-between">
                      <span className="text-zinc-650">{item.name}</span>
                      <span className="font-bold text-red-650">{item.value}</span>
                    </div>
                  ))}
                  {escalationControl.byConsultant.length === 0 && <div className="text-zinc-400 italic text-[10px]">No consultant escalations.</div>}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-2 font-mono">Escalations by Manager</span>
                <div className="space-y-2 text-xs font-mono">
                  {escalationControl.byManager.map(item => (
                    <div key={item.name} className="flex justify-between">
                      <span className="text-zinc-650">{item.name}</span>
                      <span className="font-bold text-red-650">{item.value}</span>
                    </div>
                  ))}
                  {escalationControl.byManager.length === 0 && <div className="text-zinc-400 italic text-[10px]">No manager escalations.</div>}
                </div>
              </div>
            </Card>

            {/* Escalated tickets detail grid */}
            <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl overflow-hidden lg:col-span-2">
              <div className="p-3 bg-red-50 border-b border-red-100 flex justify-between items-center">
                <span className="font-bold text-red-800 uppercase text-[9px] tracking-wider font-mono">Live escalated tickets</span>
                <Badge className="bg-red-100 text-red-850 border border-red-200 text-[8px] font-bold rounded uppercase font-mono">
                  {escalationControl.totalEscalations} Tickets
                </Badge>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 border-b border-zinc-200 text-[9px] font-mono">
                    <TableRow>
                      <TableHead className="py-2.5 px-4 font-bold">Ticket ID</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">Customer</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">Priority</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">Assigned Manager</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">Assigned Consultant</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">Escalation Reason</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-[11px] font-mono">
                    {escalationControl.list.map(t => (
                      <TableRow key={t.id} className="hover:bg-red-50/20 bg-red-50/5 transition-colors">
                        <TableCell className="py-2.5 px-4 font-bold text-red-750">
                          <Link href={`/admin/tickets/${t.id}`} className="hover:underline">{t.ticketNumber || t.id}</Link>
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-zinc-950 font-bold">{t.organization}</TableCell>
                        <TableCell className="py-2.5 px-4">
                          <Badge className="text-[8px] py-0 font-bold uppercase rounded" style={{ backgroundColor: PRIORITY_COLORS[t.priority] || '#cbd5e1', color: '#fff' }}>
                            {t.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-zinc-650">{t.assignedManager || '-'}</TableCell>
                        <TableCell className="py-2.5 px-4 text-zinc-650">{t.assignedConsultant || '-'}</TableCell>
                        <TableCell className="py-2.5 px-4 text-zinc-800 italic max-w-[150px] truncate" title={t.escalations?.[t.escalations.length - 1]?.reason}>
                          {t.escalations?.[t.escalations.length - 1]?.reason || 'Awaiting response'}
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-right">
                          <Link href={`/admin/tickets/${t.id}`} className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-900 text-white rounded text-[8px] font-bold uppercase tracking-wider font-mono">
                            Audit
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {escalationControl.totalEscalations === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-zinc-400 font-mono italic">
                          No active escalations recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>

          {/* 8. APPROVAL CONTROL CENTER LEDGER */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="border border-zinc-200 bg-white p-5 rounded-xl shadow-sm font-mono">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-3">Approval Burn Performance</span>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Approved (Month):</span>
                  <span className="font-bold text-emerald-700">{approvalsControl.approvedThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Rejected (Month):</span>
                  <span className="font-bold text-red-600">{approvalsControl.rejectedThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Avg Pending Aging:</span>
                  <span className="font-bold text-zinc-950">{approvalsControl.avgApprovalAgingDays} Days</span>
                </div>
              </div>
            </Card>

            <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl overflow-hidden lg:col-span-3">
              <div className="p-3 bg-zinc-100 border-b border-zinc-200">
                <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">Global workflow pending approvals ledger</span>
              </div>
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 border-b border-zinc-200 text-[9px] font-mono">
                    <TableRow>
                      <TableHead className="py-2.5 px-4 font-bold">Ticket ID</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">Workflow Type</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">Details</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">Requester</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold">Request Date</TableHead>
                      <TableHead className="py-2.5 px-4 font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-[11px] font-mono">
                    {approvalsControl.pendingList.map(item => (
                      <TableRow key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="py-2.5 px-4 font-bold text-zinc-950">
                          <Link href={`/admin/tickets/${item.ticketId}`} className="hover:underline">{item.ticketNumber || item.ticketId}</Link>
                        </TableCell>
                        <TableCell className="py-2.5 px-4">
                          <Badge variant="secondary" className="text-[8px] font-bold rounded uppercase font-mono">{item.type}</Badge>
                        </TableCell>
                        <TableCell className="py-2.5 px-4 font-medium text-zinc-800 max-w-[200px] truncate" title={item.details}>
                          {item.details}
                        </TableCell>
                        <TableCell className="py-2.5 px-4 font-semibold text-zinc-650">{item.requester}</TableCell>
                        <TableCell className="py-2.5 px-4 text-[10px] text-zinc-500">
                          {new Date(item.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-right">
                          <Link href={`/admin/tickets/${item.ticketId}`} className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-[8px] font-bold uppercase tracking-wider font-mono">
                            Review
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {approvalsControl.pendingList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-zinc-400 font-mono italic">
                          No pending actual hours, closure, or unlock approvals globally.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 6: SAP MODULE INSIGHTS */}
        <TabsContent value="modules" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 11: Module-wise Ticket Volume */}
            <Card className="border border-zinc-200 bg-white p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-4 font-mono">11. Module-wise Ticket Volume</span>
              <div className="h-64">
                {modulesData.some(m => m.tickets > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modulesData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis dataKey="module" stroke="#71717a" fontSize={8} className="font-mono" />
                      <YAxis stroke="#71717a" fontSize={9} className="font-mono" />
                      <Tooltip contentStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                      <Bar dataKey="tickets" name="Ticket Count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-400 italic font-mono">No module volume recorded yet</div>
                )}
              </div>
            </Card>

            {/* Module Risk Stack */}
            <Card className="border border-zinc-200 bg-white p-5 rounded-xl shadow-sm space-y-4">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 pb-2 mb-2 font-mono">Top Problem SAP Modules</span>
                <span className="text-[9px] text-zinc-400 font-mono block mb-2">Sorted by calculated operational risk index (escalations, breaches, rework).</span>
                <div className="space-y-3 font-mono">
                  {modulesData.slice(0, 5).map((mod, index) => (
                    <div key={mod.module} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-500">{index + 1}.</span>
                        <span className="font-bold text-zinc-900">{mod.module}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-[10px] text-zinc-500">{mod.tickets} Tickets</span>
                        <span className="font-black text-red-650">{mod.riskScore} Risk Pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Detailed Module telemetry */}
          <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl overflow-hidden">
            <div className="p-3 bg-zinc-100 border-b border-zinc-200">
              <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">SAP Module telemetry logs</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50 border-b border-zinc-200 text-[9px] font-mono">
                  <TableRow>
                    <TableHead className="py-2.5 px-4 font-bold">SAP Module</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Ticket Count</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-right">Approved Hours</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Escalations</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">SLA Breaches</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Reopened Tickets</TableHead>
                    <TableHead className="py-2.5 px-4 font-bold text-center">Risk Score Index</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-[11px] font-mono">
                  {modulesData.map(mod => (
                    <TableRow key={mod.module} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="py-2.5 px-4 font-bold text-zinc-950">{mod.module}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-bold">{mod.tickets}</TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono">{mod.approvedHours.toFixed(1)}h</TableCell>
                      <TableCell className={`py-2.5 px-4 text-center font-bold ${mod.escalations > 0 ? 'text-red-650' : 'text-zinc-400'}`}>{mod.escalations}</TableCell>
                      <TableCell className={`py-2.5 px-4 text-center font-bold ${mod.slaBreaches > 0 ? 'text-red-650' : 'text-zinc-400'}`}>{mod.slaBreaches}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center text-zinc-700 font-semibold">{mod.reopened}</TableCell>
                      <TableCell className="py-2.5 px-4 text-center">
                        <Badge variant="outline" className={`text-[9px] font-mono font-bold rounded ${
                          mod.riskScore > 100 ? 'bg-red-50 text-red-750 border-red-200 animate-pulse' :
                          mod.riskScore > 30 ? 'bg-orange-50 text-orange-750 border-orange-200' :
                          mod.riskScore > 0 ? 'bg-zinc-50 text-zinc-700 border-zinc-200' :
                          'bg-zinc-100 text-zinc-400 border-zinc-150'
                        }`}>
                          {mod.riskScore}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="user-control" className="space-y-6">
          <Tabs defaultValue="control-customers" className="space-y-4">
            <TabsList className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200 w-fit gap-1">
              <TabsTrigger value="control-customers" className="text-[10px] font-bold uppercase tracking-wider font-mono">
                Customers
              </TabsTrigger>
              <TabsTrigger value="control-managers" className="text-[10px] font-bold uppercase tracking-wider font-mono">
                SAP Managers
              </TabsTrigger>
              <TabsTrigger value="control-consultants" className="text-[10px] font-bold uppercase tracking-wider font-mono">
                Consultants
              </TabsTrigger>
            </TabsList>

            <TabsContent value="control-customers">
              <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl overflow-hidden">
                <div className="p-3 bg-zinc-100 border-b border-zinc-200">
                  <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">Customers Directory Ledger</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 border-b border-zinc-200 text-[9px] font-mono">
                      <TableRow>
                        <TableHead className="py-2.5 px-4 font-bold">Customer Name</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-center">Contract Status</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-center">Open Tickets</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-right">Approved Hours Used</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-right">Remaining Hours</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-center">Health Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-[11px] font-mono">
                      {customerHealthList.map(cust => (
                        <TableRow key={cust.name} className="hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="py-2.5 px-4 font-bold text-zinc-950">{cust.name}</TableCell>
                          <TableCell className="py-2.5 px-4 text-center font-semibold uppercase">{cust.contractStatus}</TableCell>
                          <TableCell className="py-2.5 px-4 text-center font-bold text-zinc-800">{cust.openTickets}</TableCell>
                          <TableCell className="py-2.5 px-4 text-right font-bold text-zinc-900">{cust.approvedHours.toFixed(1)}h</TableCell>
                          <TableCell className="py-2.5 px-4 text-right font-bold text-emerald-700">{cust.remainingHours.toFixed(1)}h</TableCell>
                          <TableCell className="py-2.5 px-4 text-center">
                            <Badge variant="outline" className={`text-[8px] font-mono font-bold uppercase rounded ${
                              cust.healthStatus === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                              cust.healthStatus === 'At Risk' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              cust.healthStatus === 'Watchlist' ? 'bg-amber-50 text-amber-700 border-amber-250' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {cust.healthStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {customerHealthList.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-zinc-400 font-mono italic">
                            No customers found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="control-managers">
              <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl overflow-hidden">
                <div className="p-3 bg-zinc-100 border-b border-zinc-200">
                  <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">SAP Managers Directory Ledger</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 border-b border-zinc-200 text-[9px] font-mono">
                      <TableRow>
                        <TableHead className="py-2.5 px-4 font-bold">Manager Name</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-center">Customers Managed</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-center">Consultants Managed</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-center">Open Tickets</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-center">Pending Approvals</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-center">Delivery Health</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-[11px] font-mono">
                      {managersPerformance.map(mgr => (
                        <TableRow key={mgr.name} className="hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="py-2.5 px-4 font-bold text-zinc-950">{mgr.name}</TableCell>
                          <TableCell className="py-2.5 px-4 text-center">{mgr.customersManaged}</TableCell>
                          <TableCell className="py-2.5 px-4 text-center">{mgr.consultantsManaged}</TableCell>
                          <TableCell className="py-2.5 px-4 text-center font-bold text-zinc-800">{mgr.openTickets}</TableCell>
                          <TableCell className="py-2.5 px-4 text-center font-bold text-amber-700">{mgr.pendingApprovals}</TableCell>
                          <TableCell className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Progress value={mgr.deliveryHealthScore} className="h-1.5 w-16 bg-zinc-100 [&>div]:bg-zinc-900 animate-pulse" />
                              <span>{mgr.deliveryHealthScore}/100</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {managersPerformance.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-zinc-400 font-mono italic">
                            No managers found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="control-consultants">
              <Card className="border border-zinc-200 bg-white shadow-sm rounded-xl overflow-hidden">
                <div className="p-3 bg-zinc-100 border-b border-zinc-200">
                  <span className="font-bold text-zinc-900 uppercase text-[9px] tracking-wider font-mono">Consultants Directory Ledger</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 border-b border-zinc-200 text-[9px] font-mono">
                      <TableRow>
                        <TableHead className="py-2.5 px-4 font-bold">Consultant Name</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold">Type</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold">SAP Modules</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-center">Active Tickets</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-right">Approved Hours</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-center">Utilization</TableHead>
                        <TableHead className="py-2.5 px-4 font-bold text-center">Workload Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-[11px] font-mono">
                      {consultantsPerformance.map(cons => (
                        <TableRow key={cons.name} className="hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="py-2.5 px-4 font-bold text-zinc-950">{cons.name}</TableCell>
                          <TableCell className="py-2.5 px-4 font-semibold text-zinc-650">{cons.type}</TableCell>
                          <TableCell className="py-2.5 px-4 max-w-[150px] truncate" title={cons.sapModules.join(', ')}>
                            {cons.sapModules.join(', ')}
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-center font-bold">{cons.activeTickets}</TableCell>
                          <TableCell className="py-2.5 px-4 text-right font-bold text-zinc-900">{cons.approvedHours.toFixed(1)}h</TableCell>
                          <TableCell className="py-2.5 px-4 text-center font-bold text-emerald-700">{cons.utilization.toFixed(0)}%</TableCell>
                          <TableCell className="py-2.5 px-4 text-center">
                            <Badge variant="outline" className={`text-[8px] font-mono font-bold uppercase rounded ${
                              cons.workloadStatus === 'Overloaded' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
                              cons.workloadStatus === 'Near Capacity' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              cons.workloadStatus === 'Healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              'bg-zinc-100 text-zinc-600 border-zinc-200'
                            }`}>
                              {cons.workloadStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {consultantsPerformance.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-zinc-400 font-mono italic">
                            No consultants found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
