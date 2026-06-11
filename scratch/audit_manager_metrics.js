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

async function runAudit() {
  const SYSTEM_NOW = new Date('2026-06-07T08:00:00Z').getTime();

  // Load profiles
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  if (pError) {
    console.error("Profiles error:", pError);
    return;
  }

  // Load contracts
  const { data: contracts, error: cError } = await supabase.from('customer_contracts').select('*');
  if (cError) {
    console.error("Contracts error:", cError);
    return;
  }

  // Load tickets
  const { data: dbTickets, error: tError } = await supabase
    .from('tickets')
    .select('*, ticket_actual_hours(*), ticket_hour_estimates(*), ticket_closure_requests(*), ticket_unlock_requests(*), ticket_delete_requests(*), ticket_efforts(*), satisfaction_ratings(*)');
  if (tError) {
    console.error("Tickets error:", tError);
    return;
  }

  // Find Keerthana's details
  const keerthana = profiles.find(p => p.email === 'keerthana@sst.com');
  console.log(`Manager: Keerthana (ID: ${keerthana?.id}, Name: ${keerthana?.full_name})`);

  // Map tickets (same logic as in app)
  // Let's filter tickets to "This Year" period
  // This Year starts from Jan 1, 2026 00:00:00 to Dec 31, 2026 23:59:59
  const startYear = new Date('2026-01-01T00:00:00.000Z');
  const endYear = new Date('2026-12-31T23:59:59.999Z');

  const allTicketsMapped = dbTickets.map(t => {
    // Basic mapping
    const manager = profiles.find(p => p.id === t.assigned_manager_id);
    const consultant = profiles.find(p => p.id === t.assigned_consultant_id);
    
    return {
      id: t.id,
      ticketNumber: t.ticket_number || t.id,
      title: t.title,
      organization: t.organization_id, // we can map if needed, but for counts this is fine
      sapModule: t.sap_module,
      priority: t.priority,
      status: t.status,
      assignedManager: manager?.full_name || undefined,
      assignedConsultant: consultant?.full_name || undefined,
      slaDueAt: t.sla_due_at,
      resolvedAt: t.resolved_at,
      closedAt: t.closed_at,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      escalationFlag: t.escalation_flag,
      actualHoursLogs: t.ticket_actual_hours || [],
      closureRequests: t.ticket_closure_requests || [],
      unlockRequests: t.ticket_unlock_requests || [],
      deleteRequests: t.ticket_delete_requests || [],
      efforts: t.ticket_efforts || [],
      satisfactionRating: t.satisfaction_ratings?.[0] || null
    };
  });

  const thisYearTickets = allTicketsMapped.filter(t => {
    const d = new Date(t.createdAt);
    return d >= startYear && d <= endYear;
  });

  console.log(`\nTotal Tickets in DB: ${allTicketsMapped.length}`);
  console.log(`Tickets Created in 2026 (This Year): ${thisYearTickets.length}`);

  // Let's get the metrics for "This Year" (All)
  const ticketsList = thisYearTickets; // Under "All" customer, module, priority

  const openCount = ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
  const closedCount = ticketsList.filter(t => t.status === 'Closed' || t.status === 'Resolved').length;
  const unassignedCount = ticketsList.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && !t.assignedConsultant).length;
  
  // Pending approvals
  // Let's inspect pendingEffortLogs
  const pendingEffortLogs = [];
  ticketsList.forEach(t => {
    (t.efforts || []).forEach(e => {
      if (e.status === 'Pending' || e.status === 'Pending Approval') {
        pendingEffortLogs.push(e);
      }
    });
  });

  const pendingClosureRequests = [];
  ticketsList.forEach(t => {
    (t.closureRequests || []).forEach(r => {
      if (r.status === 'Pending Manager Approval') {
        pendingClosureRequests.push(r);
      }
    });
  });

  const pendingUnlockRequests = [];
  ticketsList.forEach(t => {
    (t.unlockRequests || []).forEach(u => {
      if (u.status === 'Pending') {
        pendingUnlockRequests.push(u);
      }
    });
  });

  const pendingApprovalsCount = pendingEffortLogs.length + pendingClosureRequests.length + pendingUnlockRequests.length;

  console.log(`\n--- Metric Ground Truths (This Year) ---`);
  console.log(`Open Tickets: ${openCount}`);
  console.log(`Closed/Resolved Tickets: ${closedCount}`);
  console.log(`Unassigned Tickets: ${unassignedCount}`);
  console.log(`Pending Approvals: ${pendingApprovalsCount} (Efforts: ${pendingEffortLogs.length}, Closures: ${pendingClosureRequests.length}, Unlocks: ${pendingUnlockRequests.length})`);

  // Let's check SLA compliance
  const incidentTickets = ticketsList.filter(t => t.ticketType === 'Incident' || !t.ticketType);
  const breachedCount = incidentTickets.filter(t => {
    if (!t.slaDueAt || t.slaDueAt === 'SLA Not Applicable' || t.slaDueAt === '9999-12-31T23:59:59.999Z') return false;
    const due = new Date(t.slaDueAt).getTime();
    const endT = t.status === 'Resolved' || t.status === 'Closed'
      ? new Date(t.resolvedAt || t.closedAt || due).getTime()
      : SYSTEM_NOW;
    return endT > due;
  }).length;
  const compliance = incidentTickets.length > 0 ? Math.round(((incidentTickets.length - breachedCount) / incidentTickets.length) * 100) : 100;
  console.log(`Incident Tickets: ${incidentTickets.length}`);
  console.log(`SLA Breached: ${breachedCount}`);
  console.log(`SLA Compliance: ${compliance}%`);

  // Let's print out some detail about actual hours logs
  console.log(`\n--- Actual Hours Summary ---`);
  let totalApprovedActualHours = 0;
  ticketsList.forEach(t => {
    t.actualHoursLogs.forEach(ah => {
      if (ah.approval_status?.toLowerCase() === 'approved') {
        totalApprovedActualHours += Number(ah.actual_hours);
      }
    });
  });
  console.log(`Total Approved Actual Hours: ${totalApprovedActualHours}`);
}

runAudit();
