const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['\"]|['\"]$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper mapper for Supabase format
const mapDbTicket = (t, dbProfiles, dbContacts = [], currentOrgMap = {}) => {
  const getProfile = (id) => dbProfiles.find(p => p.id === id || p.full_name === id || p.email === id);
  const reqProfile = t.requested_by_profile || getProfile(t.requested_by);
  const consultant = getProfile(t.assigned_consultant_id);
  const manager = getProfile(t.assigned_manager_id);

  let requestedByPhone = reqProfile?.phone_number || undefined;

  return {
    id: t.id,
    ticketNumber: t.ticket_number || t.id,
    title: t.title,
    organization: (t.organization_id ? currentOrgMap[t.organization_id] : null) || t.organization_id, // Organization Name
    organizationId: t.organization_id,
    requestedBy: reqProfile?.full_name || t.created_by_name || t.requested_by,
    requestedByEmail: reqProfile?.email || '',
    requestedByPhone: requestedByPhone,
    sapModule: t.sap_module,
    category: t.category,
    priority: t.priority,
    status: t.status,
    assignedManager: manager?.full_name || undefined,
    assignedConsultant: consultant?.full_name || undefined,
    slaDueAt: (t.sla_due_at === '9999-12-31T23:59:59.999Z' || t.sla_due_at?.startsWith('9999-12-31')) ? 'SLA Not Applicable' : (t.sla_due_at || 'SLA Not Applicable'),
    resolvedAt: t.resolved_at,
    closedAt: t.closed_at,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    rootCause: t.root_cause,
    resolutionSummary: t.resolution_summary,
    billable: t.billable,
    escalationFlag: t.escalation_flag,
    approvalRequiredFlag: t.approval_required,
    transportRequest: t.transport_request,
    source: t.source || 'Created by Client',
    primaryConsultantId: t.primary_consultant_id,
    closureStatus: t.closure_status || 'Pending',
    closedBy: t.closed_by,
    
    comments: [],
    attachments: [],

    efforts: (t.ticket_efforts || t.efforts) ? (t.ticket_efforts || t.efforts).map((e) => {
      const effortConsultant = getProfile(e.consultant_id);
      return {
        id: e.id,
        ticketId: e.ticket_id,
        consultantId: e.consultant_id,
        consultantName: effortConsultant?.full_name || 'Consultant',
        hoursWorked: Number(e.hours_logged),
        workDate: e.activity_date,
        description: e.description,
        activityType: e.activity_type || 'Analysis',
        billable: e.billable,
        status: e.status || 'Approved',
        rejectionReason: e.rejection_reason,
        createdAt: e.created_at,
        hoursLogged: Number(e.hours_logged),
        activityDate: e.activity_date
      };
    }) : [],

    hourEstimates: [],
    closureRequests: [],
    assignments: [],

    estimates: (t.ticket_estimates || t.estimates) ? (t.ticket_estimates || t.estimates).map((e) => ({
      id: e.id,
      ticketId: e.ticket_id,
      consultantId: e.consultant_id,
      consultantType: e.consultant_type,
      estimatedHours: Number(e.estimated_hours),
      remarks: e.remarks || '',
      submittedAt: e.submitted_at
    })) : [],

    actualHoursLogs: t.ticket_actual_hours ? t.ticket_actual_hours.map((ah) => ({
      id: ah.id,
      closureRequestId: ah.closure_request_id,
      ticketId: ah.ticket_id,
      consultantId: ah.consultant_id,
      consultantType: ah.consultant_type,
      actualHours: Number(ah.actual_hours),
      billable: ah.billable !== false,
      approvalStatus: ah.approval_status || 'pending',
      approvedBy: ah.approved_by,
      approvedAt: ah.approved_at,
      createdAt: ah.created_at
    })) : [],
  };
};

const getSlaStatus = (t, now = Date.now()) => {
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

async function simulate() {
  const SYSTEM_NOW = new Date('2026-06-07T08:00:00Z').getTime();

  const { data: dbProfiles } = await supabase.from('profiles').select('*');
  const { data: dbContracts } = await supabase.from('customer_contracts').select('*');
  const { data: dbOrgs } = await supabase.from('organizations').select('*');
  const organizationMap = {};
  dbOrgs.forEach(o => { organizationMap[o.id] = o.name; });

  const { data: dbTickets } = await supabase
    .from('tickets')
    .select('*, ticket_efforts(*), ticket_actual_hours(*), ticket_estimates(*)');

  const mappedTickets = dbTickets.map(t => mapDbTicket(t, dbProfiles, [], organizationMap));

  // Simulating filters under This Year
  const startYear = new Date('2026-01-01T00:00:00.000Z');
  const endYear = new Date('2026-12-31T23:59:59.999Z');

  const filteredTickets = mappedTickets.filter(t => {
    const d = new Date(t.createdAt);
    return d >= startYear && d <= endYear;
  });

  const ticketsList = filteredTickets;

  // Let's compute stats
  const totalTicketsRaised = ticketsList.length;
  const openCount = ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
  const closedCount = ticketsList.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;
  const unassignedCount = ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && !t.assignedConsultant).length;

  const pendingEffortLogs = [];
  ticketsList.forEach(t => {
    (t.efforts || []).forEach(e => {
      if (e.status === 'Pending' || e.status === 'Pending Approval') {
        pendingEffortLogs.push(e);
      }
    });
  });

  const pendingClosureRequests = []; // closure requests are not fetched in this simulation but we query it
  const pendingUnlockRequests = []; // same

  const actPendingApproval = pendingEffortLogs.length;

  const incidentTickets = ticketsList.filter(t => t.ticketType === 'Incident' || !t.ticketType);
  const slaHealthy = incidentTickets.filter(t => getSlaStatus(t, SYSTEM_NOW) === 'Healthy').length;
  const slaWarning = incidentTickets.filter(t => getSlaStatus(t, SYSTEM_NOW) === 'Warning').length;
  const slaBreached = incidentTickets.filter(t => getSlaStatus(t, SYSTEM_NOW) === 'Breached').length;
  const slaCompliance = incidentTickets.length > 0 ? Math.round(((incidentTickets.length - slaBreached) / incidentTickets.length) * 100) : 100;

  let totalEstHrs = 0;
  let totalActHrs = 0;
  let approvedActHrs = 0;

  ticketsList.forEach(t => {
    (t.estimates || []).forEach(e => {
      totalEstHrs += e.estimatedHours;
    });
    (t.actualHoursLogs || []).forEach(ah => {
      totalActHrs += ah.actualHours;
      if (ah.approvalStatus?.toLowerCase() === 'approved') {
        approvedActHrs += ah.actualHours;
      }
    });
  });

  console.log("SIMULATION RESULTS (MANAGER COCKPIT METRICS):");
  console.log("--------------------------------------------");
  console.log(`Total Tickets Raised: ${totalTicketsRaised}`);
  console.log(`Open Backlog: ${openCount}`);
  console.log(`Closed: ${closedCount}`);
  console.log(`Unassigned: ${unassignedCount}`);
  console.log(`Act. Hours Pending: ${actPendingApproval}`);
  console.log(`SLA Healthy: ${slaHealthy}`);
  console.log(`SLA Warning: ${slaWarning}`);
  console.log(`SLA Breached: ${slaBreached}`);
  console.log(`SLA Compliance: ${slaCompliance}%`);
  console.log(`Total Estimated Hours: ${totalEstHrs}`);
  console.log(`Total Actual Hours: ${totalActHrs}`);
  console.log(`Total Approved Actual Hours: ${approvedActHrs}`);
}

simulate();
