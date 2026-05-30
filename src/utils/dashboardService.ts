import { Ticket, CustomerContract, TicketStatus, TicketPriority } from '../types/ticket';

export interface DashboardScope {
  type: 'global' | 'customer' | 'consultant' | 'manager';
  value: string;
}

// 1. Centralized filter utility for Scopes
export const filterTicketsByScope = (tickets: Ticket[], scope: DashboardScope): Ticket[] => {
  if (scope.type === 'global') {
    return tickets.filter(t => t.softDeleteStatus !== 'Archived');
  }
  if (scope.type === 'customer') {
    return tickets.filter(t => t.organization === scope.value && t.softDeleteStatus !== 'Archived');
  }
  if (scope.type === 'consultant') {
    return tickets.filter(t => 
      t.softDeleteStatus !== 'Archived' &&
      (
        t.primaryConsultantId === scope.value ||
        t.assignedConsultant === scope.value ||
        (t.assignments || []).some(a => a.consultantId === scope.value && a.active)
      )
    );
  }
  if (scope.type === 'manager') {
    return tickets.filter(t => t.assignedManager === scope.value && t.softDeleteStatus !== 'Archived');
  }
  return tickets.filter(t => t.softDeleteStatus !== 'Archived');
};

// 2. centralized Ticket counts by status helper
export const getTicketCountsByStatus = (tickets: Ticket[], scope: DashboardScope) => {
  const scoped = filterTicketsByScope(tickets, scope);
  const counts: Record<string, number> = {
    'New': 0,
    'Assigned': 0,
    'In Progress': 0,
    'In Progress - Functional': 0,
    'In Progress - Technical': 0,
    'Awaiting Functional Submission': 0,
    'Awaiting Technical Submission': 0,
    'Waiting for Customer': 0,
    'Waiting for Internal Team': 0,
    'Customer Action': 0,
    'Waiting for Hours Approval': 0,
    'Raised to SAP': 0,
    'Request for Closure': 0,
    'Resolved': 0,
    'Closed': 0,
    'Reopened': 0,
    'Open': 0,
    'Unassigned': 0
  };

  scoped.forEach(t => {
    const status = t.status;
    if (status in counts) {
      counts[status]++;
    }
    // General classification
    if (status !== 'Closed' && status !== 'Resolved') {
      counts['Open']++;
      if (!t.assignedConsultant) {
        counts['Unassigned']++;
      }
    }
  });

  return counts;
};

// 3. Centralized Approved Actual Hours helper
export const getApprovedActualHours = (tickets: Ticket[], scope: DashboardScope): number => {
  const scoped = filterTicketsByScope(tickets, scope);
  return scoped.reduce((sum, t) => {
    const approvedLogs = (t.actualHoursLogs || []).filter(
      ah => ah.approvalStatus?.toLowerCase() === 'approved'
    );
    return sum + approvedLogs.reduce((s, ah) => s + ah.actualHours, 0);
  }, 0);
};

// 4. Centralized Ticket Assignments Helper
export const getTicketAssignmentsCount = (tickets: Ticket[], scope: DashboardScope): number => {
  const scoped = filterTicketsByScope(tickets, scope);
  return scoped.filter(t => t.assignedConsultant || (t.assignments || []).some(a => a.active)).length;
};

// 5. Centralized Escalation Counts Helper
export const getEscalationCounts = (tickets: Ticket[], scope: DashboardScope): number => {
  const scoped = filterTicketsByScope(tickets, scope);
  return scoped.filter(t => t.escalationFlag).length;
};

// 5b. Centralized SLA Status Helper
export const getSlaStatus = (t: Ticket, now = Date.now()) => {
  const isInc = t.ticketType === 'Incident' || !t.ticketType;
  if (!isInc || t.slaDueAt === 'SLA Not Applicable' || !t.slaDueAt) return 'Not Applicable';
  const start = new Date(t.createdAt).getTime();
  const due = new Date(t.slaDueAt).getTime();
  const end = t.status === 'Resolved' || t.status === 'Closed'
    ? new Date(t.resolvedAt || t.closedAt || now).getTime()
    : now;
  if (end > due) return 'Breached';
  const totalSlaTime = due - start;
  const remainingTime = due - now;
  if (t.status !== 'Resolved' && t.status !== 'Closed' && remainingTime > 0 && (remainingTime / totalSlaTime) <= 0.3) {
    return 'Warning';
  }
  return 'Healthy';
};

// 5c. Centralized Ticket Age Helper
export const getTicketAgeDays = (t: Ticket, now = Date.now()) => {
  const start = new Date(t.createdAt).getTime();
  const end = t.status === 'Closed' || t.status === 'Resolved'
    ? new Date(t.resolvedAt || t.closedAt || now).getTime()
    : now;
  return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
};

// 6. Centralized Customer Dashboard service
export const getCustomerDashboardData = (
  organizationName: string,
  tickets: Ticket[],
  contracts: CustomerContract[]
) => {
  const scope: DashboardScope = { type: 'customer', value: organizationName };
  const companyTickets = filterTicketsByScope(tickets, scope);
  const statusCounts = getTicketCountsByStatus(tickets, scope);
  
  const now = Date.now();

  const openTicketsList = companyTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
  const avgTicketAgeDays = openTicketsList.length > 0
    ? openTicketsList.reduce((sum, t) => sum + getTicketAgeDays(t), 0) / openTicketsList.length
    : 0;

  const resolvedClosedList = companyTickets.filter(t => (t.status === 'Resolved' || t.status === 'Closed') && t.resolvedAt);
  const avgResolutionTimeHours = resolvedClosedList.length > 0
    ? resolvedClosedList.reduce((sum, t) => {
        const diffMs = new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime();
        return sum + (diffMs / (1000 * 60 * 60));
      }, 0) / resolvedClosedList.length
    : 0;

  const activeContract = contracts.find(c => c.organizationName === organizationName && c.isActive);
  const totalApprovedHours = getApprovedActualHours(tickets, scope);

  let monthlyBudgetHours = 0;
  let contractPeriod = 'No Active Contract';
  let totalContractHours = 0;
  
  if (activeContract) {
    monthlyBudgetHours = activeContract.monthlyBudgetHours;
    totalContractHours = activeContract.totalHours;
    const startStr = activeContract.startDate ? new Date(activeContract.startDate).toLocaleDateString() : '';
    const endStr = activeContract.endDate ? new Date(activeContract.endDate).toLocaleDateString() : '';
    contractPeriod = startStr && endStr ? `${startStr} - ${endStr}` : 'Active Contract';
  }

  // Calculate current month approved hours
  const currentMonthApprovedHours = companyTickets.reduce((sum, t) => {
    const approvedLogs = (t.actualHoursLogs || []).filter(ah => {
      if (ah.approvalStatus?.toLowerCase() !== 'approved') return false;
      if (!ah.approvedAt) return false;
      const approvedDate = new Date(ah.approvedAt);
      const currentDate = new Date();
      return approvedDate.getMonth() === currentDate.getMonth() &&
             approvedDate.getFullYear() === currentDate.getFullYear();
    });
    return sum + approvedLogs.reduce((s, ah) => s + ah.actualHours, 0);
  }, 0);

  const remainingHours = Math.max(0, totalContractHours - totalApprovedHours);
  const monthlyRemainingHours = Math.max(0, monthlyBudgetHours - currentMonthApprovedHours);
  const usagePercentage = totalContractHours > 0 ? (totalApprovedHours / totalContractHours) * 100 : 0;

  // Tickets by Priority
  const priorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  companyTickets.forEach(t => {
    if (t.priority in priorityCounts) {
      priorityCounts[t.priority as TicketPriority]++;
    }
  });

  // Tickets by Module
  const moduleCounts: Record<string, number> = {};
  companyTickets.forEach(t => {
    const mod = t.sapModule || 'General';
    moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
  });

  // SLA Compliance counts
  const incidentTickets = companyTickets.filter(t => t.ticketType === 'Incident' || !t.ticketType);
  const slaHealthy = incidentTickets.filter(t => getSlaStatus(t) === 'Healthy').length;
  const slaWarning = incidentTickets.filter(t => getSlaStatus(t) === 'Warning').length;
  const slaBreached = incidentTickets.filter(t => getSlaStatus(t) === 'Breached').length;

  return {
    customerName: organizationName,
    contractPeriod,
    monthlyAllocatedHours: monthlyBudgetHours,
    monthlyApprovedActualHoursUsed: currentMonthApprovedHours,
    remainingHours,
    monthlyRemainingHours,
    totalContractedHours: totalContractHours,
    totalApprovedHoursUsed: totalApprovedHours,
    usagePercentage,
    openTickets: statusCounts.Open,
    closedTickets: statusCounts.Closed,
    reopenedTickets: companyTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length,
    escalatedTickets: companyTickets.filter(t => t.escalationFlag).length,
    ticketsByStatus: statusCounts,
    ticketsByPriority: priorityCounts,
    ticketsByModule: moduleCounts,
    avgTicketAgeDays,
    avgResolutionTimeHours,
    slaHealthy,
    slaWarning,
    slaBreached,
    unassignedTickets: statusCounts.Unassigned,
    onHoldTickets: companyTickets.filter(t => t.status === 'Waiting for Customer' || t.status === 'Waiting for Internal Team').length,
    raisedToSapTickets: companyTickets.filter(t => t.raisedToSap).length,
    customerActionPendingTickets: companyTickets.filter(t => t.status === 'Waiting for Customer' || t.customerActionRequired).length,
    resolvedTickets: statusCounts.Resolved,
    criticalTickets: priorityCounts.Critical
  };
};

// 7. Centralized Consultant Dashboard service
export const getConsultantDashboardData = (consultantId: string, tickets: Ticket[]) => {
  const scope: DashboardScope = { type: 'consultant', value: consultantId };
  const myTickets = filterTicketsByScope(tickets, scope);
  const statusCounts = getTicketCountsByStatus(tickets, scope);

  const estimatedHours = myTickets.reduce((sum, t) => {
    // Sum estimated hours logged for this consultant
    const myEsts = (t.consultantEfforts || []).filter(e => e.consultantId === consultantId && !e.isDeleted);
    return sum + myEsts.reduce((s, e) => s + e.estimatedHours, 0);
  }, 0);

  const approvedActualHours = myTickets.reduce((sum, t) => {
    // Sum approved actual hours for this consultant
    const myActuals = (t.actualHoursLogs || []).filter(
      ah => ah.consultantId === consultantId && ah.approvalStatus?.toLowerCase() === 'approved'
    );
    return sum + myActuals.reduce((s, ah) => s + ah.actualHours, 0);
  }, 0);

  const pendingClosureRequests = myTickets.filter(t => 
    t.closureStatus === 'Awaiting Manager Approval' || 
    t.closureRequests?.some(r => r.status === 'Pending Manager Approval')
  ).length;

  const priorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  myTickets.forEach(t => {
    if (t.priority in priorityCounts) {
      priorityCounts[t.priority as TicketPriority]++;
    }
  });

  const moduleCounts: Record<string, number> = {};
  myTickets.forEach(t => {
    const mod = t.sapModule || 'General';
    moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
  });

  return {
    assignedTickets: myTickets.length,
    openTickets: statusCounts.Open,
    closedTickets: statusCounts.Closed,
    reopenedTickets: myTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length,
    escalatedTickets: myTickets.filter(t => t.escalationFlag).length,
    estimatedHours,
    approvedActualHours,
    pendingClosureRequests,
    ticketsByStatus: statusCounts,
    ticketsByPriority: priorityCounts,
    ticketsByModule: moduleCounts
  };
};

// 8. Centralized Manager Dashboard service
export const getManagerDashboardData = (
  tickets: Ticket[],
  contracts: CustomerContract[],
  profiles: any[]
) => {
  const scope: DashboardScope = { type: 'global', value: '' };
  const allTickets = filterTicketsByScope(tickets, scope);
  const statusCounts = getTicketCountsByStatus(tickets, scope);

  const totalClients = profiles.filter(p => p.role === 'Customer').length;
  const totalConsultants = profiles.filter(p => p.role === 'Consultant').length;
  const totalTickets = allTickets.length;

  // Calculate pending manager approvals
  const pendingClosure = allTickets.filter(t => 
    t.closureRequests?.some(r => r.status === 'Pending Manager Approval' || r.managerApprovalStatus === 'Pending')
  ).length;

  const pendingEfforts = allTickets.reduce((sum, t) => 
    sum + (t.efforts || []).filter(e => e.status?.toLowerCase() === 'pending approval' || e.status?.toLowerCase() === 'pending').length, 0);

  const pendingDeletes = allTickets.reduce((sum, t) => 
    sum + (t.deleteRequests || []).filter(r => r.managerApproval === 'Pending').length, 0);

  const pendingUnlocks = allTickets.reduce((sum, t) => 
    sum + (t.unlockRequests || []).filter(r => r.status === 'Pending').length, 0);

  const pendingApprovals = pendingClosure + pendingEfforts + pendingDeletes + pendingUnlocks;

  const escalatedCount = allTickets.filter(t => t.escalationFlag).length;

  return {
    totalClients,
    totalConsultants,
    totalTickets,
    unassignedTickets: statusCounts.Unassigned,
    inProgressFunctional: statusCounts['In Progress - Functional'] + statusCounts['Awaiting Functional Submission'],
    inProgressTechnical: statusCounts['In Progress - Technical'] + statusCounts['Awaiting Technical Submission'],
    customerAction: statusCounts['Waiting for Customer'] + statusCounts['Customer Action'],
    raisedToSap: statusCounts['Raised to SAP'],
    requestClosure: statusCounts['Request for Closure'],
    closed: statusCounts.Closed,
    reopened: statusCounts.Reopened,
    escalated: escalatedCount,
    pendingApprovals,
    pendingClosure,
    pendingEfforts,
    pendingDeletes,
    pendingUnlocks
  };
};

// 9. Centralized Super Admin Dashboard service
export const getSuperAdminDashboardData = (
  tickets: Ticket[],
  contracts: CustomerContract[],
  profiles: any[]
) => {
  const scope: DashboardScope = { type: 'global', value: '' };
  const allTickets = filterTicketsByScope(tickets, scope);
  const statusCounts = getTicketCountsByStatus(tickets, scope);

  const totalCustomers = profiles.filter(p => p.role === 'Customer').length;
  const totalManagers = profiles.filter(p => p.role === 'Manager').length;
  const totalConsultants = profiles.filter(p => p.role === 'Consultant').length;
  const totalApprovedActualHours = getApprovedActualHours(tickets, scope);

  const pendingClosure = allTickets.filter(t => 
    t.closureRequests?.some(r => r.status === 'Pending Manager Approval' || r.managerApprovalStatus === 'Pending')
  ).length;

  const pendingEfforts = allTickets.reduce((sum, t) => 
    sum + (t.efforts || []).filter(e => e.status?.toLowerCase() === 'pending approval' || e.status?.toLowerCase() === 'pending').length, 0);

  const pendingDeletes = allTickets.reduce((sum, t) => 
    sum + (t.deleteRequests || []).filter(r => r.managerApproval === 'Pending' || r.adminApproval === 'Pending').length, 0);

  const pendingUnlocks = allTickets.reduce((sum, t) => 
    sum + (t.unlockRequests || []).filter(r => r.status === 'Pending').length, 0);

  const totalPendingApprovals = pendingClosure + pendingEfforts + pendingDeletes + pendingUnlocks;

  return {
    totalCustomers,
    totalManagers,
    totalConsultants,
    totalTickets: allTickets.length,
    totalEscalations: allTickets.filter(t => t.escalationFlag).length,
    totalApprovedActualHours,
    totalClosedTickets: statusCounts.Closed,
    totalReopenedTickets: allTickets.filter(t => t.status === 'Reopened' || (t.reopenedCount && t.reopenedCount > 0)).length,
    totalPendingApprovals
  };
};
