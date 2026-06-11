const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse env file
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// EXACT mapDbTicket function from TicketContext.tsx
const mapDbTicket = (t, dbProfiles, dbContacts = []) => {
  const getProfile = (id) => dbProfiles.find(p => p.id === id || p.full_name === id || p.email === id);
  const customer = getProfile(t.requested_by);
  const consultant = getProfile(t.assigned_consultant_id);
  const manager = getProfile(t.assigned_manager_id);

  let requestedByPhone = customer?.phone_number || undefined;
  if (!requestedByPhone && dbContacts) {
    const contact = dbContacts.find((c) => 
      (c.name && customer?.full_name && c.name.toLowerCase() === customer.full_name.toLowerCase()) || 
      (c.email && customer?.email && c.email.toLowerCase() === customer.email.toLowerCase()) ||
      (c.name && t.created_by_name && c.name.toLowerCase() === t.created_by_name.toLowerCase())
    );
    if (contact) {
      requestedByPhone = contact.phone || undefined;
    }
  }

  return {
    id: t.id,
    title: t.title,
    description: t.description,
    organization: t.organizations?.name || t.organization_id,
    requestedBy: customer?.full_name || t.created_by_name || t.requested_by,
    requestedByEmail: customer?.email || '',
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
    
    comments: (t.ticket_comments || t.comments) ? (t.ticket_comments || t.comments).map((c) => {
      const commentAuthor = getProfile(c.author_id);
      return {
        id: c.id,
        ticketId: c.ticket_id,
        authorName: commentAuthor?.full_name || 'System',
        authorEmail: commentAuthor?.email || '',
        authorRole: commentAuthor?.role || 'Customer',
        content: c.content,
        isInternal: c.is_internal,
        createdAt: c.created_at,
        attachments: t.ticket_comment_attachments 
          ? t.ticket_comment_attachments
              .filter((a) => a.comment_id === c.id)
              .map((a) => ({
                id: a.id,
                ticketId: a.ticket_id,
                commentId: a.comment_id,
                fileName: a.file_name,
                filePath: a.file_url,
                fileUrl: a.file_url,
                fileType: a.file_type || '',
                fileSize: a.file_size || 0,
                uploadedBy: a.uploaded_by,
                visibility: c.is_internal ? 'internal' : 'public',
                createdAt: a.created_at
              }))
          : []
      };
    }) : [],

    attachments: t.ticket_attachments ? t.ticket_attachments.map((a) => ({
      id: a.id,
      ticketId: a.ticket_id,
      fileName: a.file_name,
      filePath: a.file_path,
      fileUrl: a.file_path,
      fileType: a.mime_type || '',
      fileSize: a.file_size || 0,
      uploadedBy: a.uploaded_by,
      visibility: 'public',
      createdAt: a.created_at
    })) : [],

    hourEstimates: t.ticket_hour_estimates ? t.ticket_hour_estimates.map((e) => {
      const estActor = getProfile(e.consultant_id);
      return {
        id: e.id,
        ticketId: e.ticket_id,
        consultantId: estActor?.full_name || e.consultant_id,
        functionalEstimatedHours: Number(e.functional_estimated_hours),
        technicalEstimatedHours: Number(e.technical_estimated_hours),
        totalEstimatedHours: Number(e.total_estimated_hours),
        remarks: e.remarks,
        status: e.status,
        submittedAt: e.submitted_at,
        approvedBy: e.approved_by,
        approvedAt: e.approved_at,
        rejectedBy: e.rejected_by,
        rejectedAt: e.rejected_at,
        rejectionReason: e.rejection_reason,
        createdAt: e.created_at,
        updatedAt: e.updated_at
      };
    }) : [],

    closureRequests: t.ticket_closure_requests ? t.ticket_closure_requests.map((r) => {
      const reqActor = getProfile(r.requested_by);
      return {
        id: r.id,
        ticketId: r.ticket_id,
        requestedBy: reqActor?.full_name || r.requested_by,
        functionalActualHours: Number(r.functional_actual_hours),
        technicalActualHours: Number(r.technical_actual_hours),
        totalActualHours: Number(r.total_actual_hours),
        workCompletedSummary: r.work_completed_summary,
        rootCause: r.root_cause,
        resolutionSummary: r.resolution_summary,
        pendingItems: r.pending_items,
        status: r.status,
        managerApprovalStatus: r.manager_approval_status,
        managerApprovedBy: r.manager_approved_by,
        managerApprovedAt: r.manager_approved_at,
        managerRejectedBy: r.manager_rejected_by,
        managerRejectedAt: r.manager_rejected_at,
        rejectionReason: r.rejection_reason,
        resubmittedFromId: r.resubmitted_from_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    }) : [],

    assignments: t.ticket_assignments ? t.ticket_assignments.map((a) => {
      const profile = getProfile(a.consultant_id);
      return {
        ticketId: a.ticket_id,
        consultantId: a.consultant_id,
        consultantName: profile?.full_name || 'Consultant',
        consultantType: a.consultant_type,
        isPrimary: a.is_primary,
        active: a.active,
        assignedBy: a.assigned_by,
        assignedAt: a.assigned_at
      };
    }) : [],

    estimates: t.ticket_estimates ? t.ticket_estimates.map((e) => ({
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
      actualHours: Number(ah.actual_hours)
    })) : [],

    consultantEfforts: (() => {
      const assignments = t.ticket_assignments || [];
      const estimates = t.ticket_estimates || [];
      const actualHoursLogs = t.ticket_actual_hours || [];
      const closureRequests = t.ticket_closure_requests || [];

      // Find the latest active closure request to read actual hours from
      const latestRequest = closureRequests.length > 0 
        ? [...closureRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;

      return assignments.map((a) => {
        const profile = getProfile(a.consultant_id);
        const est = estimates.find((e) => e.consultant_id === a.consultant_id);
        
        // Actual hours are retrieved from ticket_actual_hours table for this consultant under the latest request
        const actLog = latestRequest 
          ? actualHoursLogs.find((ah) => ah.closure_request_id === latestRequest.id && ah.consultant_id === a.consultant_id)
          : null;

        return {
          id: `synthesized-${a.consultant_id}-${t.id}`,
          ticketId: t.id,
          consultantId: a.consultant_id,
          consultantName: profile?.full_name || 'Consultant',
          consultantType: a.consultant_type,
          estimatedHours: est ? Number(est.estimated_hours) : 0,
          actualHours: actLog ? Number(actLog.actual_hours) : 0,
          remarks: est?.remarks || '',
          createdAt: a.assigned_at,
          updatedAt: a.assigned_at,
          isDeleted: !a.active,
          closureStatus: latestRequest 
            ? (latestRequest.status === 'Approved' ? 'Approved' : 'Submitted') 
            : 'Pending',
          workSummary: latestRequest?.work_completed_summary || '',
          resolutionNotes: latestRequest?.resolution_summary || ''
        };
      }).filter((eff) => !eff.isDeleted);
    })(),

    unlockRequests: t.ticket_unlock_requests ? t.ticket_unlock_requests.map((u) => {
      const unlockActor = getProfile(u.requested_by);
      return {
        id: u.id,
        ticketId: u.ticket_id,
        closureRequestId: u.closure_request_id,
        requestedBy: unlockActor?.full_name || u.requested_by,
        reason: u.reason,
        requestedChange: u.requested_change,
        remarks: u.remarks,
        attachmentUrl: u.attachment_url,
        status: u.status,
        managerApprovedBy: u.manager_approved_by,
        managerApprovedAt: u.manager_approved_at,
        managerRejectedBy: u.manager_rejected_by,
        managerRejectedAt: u.manager_rejected_at,
        rejectionReason: u.rejection_reason,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      };
    }) : [],

    commentAttachments: t.ticket_comment_attachments ? t.ticket_comment_attachments.map((a) => ({
      id: a.id,
      commentId: a.comment_id,
      ticketId: a.ticket_id,
      fileName: a.file_name,
      fileUrl: a.file_url,
      fileType: a.file_type || '',
      fileSize: a.file_size || 0,
      uploadedBy: a.uploaded_by,
      createdAt: a.created_at
    })) : []
  };
};

async function test() {
  const ticketId = 'SST-ABAP-1001';
  const consultantId = '7408c315-ab62-475d-af67-6471b926efbc'; // Keerthana

  console.log("1. Setting up DB state to 'Request for Closure'...");
  
  // Insert closure request
  const { data: insertedReq, error: reqErr } = await supabase.from('ticket_closure_requests').insert({
    ticket_id: ticketId,
    requested_by: consultantId,
    functional_actual_hours: 4.0,
    technical_actual_hours: 2.0,
    total_actual_hours: 6.0,
    work_completed_summary: 'Test work completed summary',
    root_cause: 'SAP Configuration/Process Alignment',
    resolution_summary: 'Test resolution summary',
    pending_items: null,
    status: 'Pending Manager Approval',
    manager_approval_status: 'Pending'
  }).select('id').single();

  if (reqErr) {
    console.error("❌ Setup Failed (closure request):", reqErr);
    return;
  }
  const dbClosureReqId = insertedReq.id;

  // Insert actual hours
  await supabase.from('ticket_actual_hours').insert({
    closure_request_id: dbClosureReqId,
    ticket_id: ticketId,
    consultant_id: consultantId,
    consultant_type: 'Functional',
    actual_hours: 6.0
  });

  // Update ticket
  await supabase.from('tickets').update({
    status: 'Request for Closure',
    closure_status: 'Awaiting Manager Approval',
    root_cause: 'SAP Configuration/Process Alignment',
    resolution_summary: 'Test resolution summary'
  }).eq('id', ticketId);

  console.log("2. Fetching records from DB...");
  const query = '*, organizations(name), ticket_comments(*), ticket_efforts(*), satisfaction_ratings(*), ticket_modules(*), ticket_delete_requests(*), ticket_hour_estimates(*), ticket_closure_requests(*), ticket_consultant_efforts(*), ticket_unlock_requests(*), ticket_comment_attachments(*), ticket_attachments(*), ticket_history(*), ticket_assignments(*), ticket_estimates(*), ticket_actual_hours(*)';
  const { data: dbTickets } = await supabase.from('tickets').select(query).eq('id', ticketId);
  const { data: dbProfiles } = await supabase.from('profiles').select('*');
  const { data: dbContacts } = await supabase.from('customer_contacts').select('*');

  console.log("3. Attempting to run mapDbTicket on 'Request for Closure' ticket...");
  try {
    const mapped = mapDbTicket(dbTickets[0], dbProfiles, dbContacts || []);
    console.log("✅ Success! Mapped Ticket data:", JSON.stringify(mapped, null, 2));
  } catch (err) {
    console.error("❌ FAILED during mapDbTicket:", err);
  }

  console.log("4. Cleaning up test data...");
  await supabase.from('ticket_actual_hours').delete().eq('closure_request_id', dbClosureReqId);
  await supabase.from('ticket_closure_requests').delete().eq('id', dbClosureReqId);
  await supabase.from('tickets').update({
    status: 'Assigned',
    closure_status: 'Pending',
    root_cause: null,
    resolution_summary: null
  }).eq('id', ticketId);
  console.log("✅ Cleanup complete.");
}

test();
