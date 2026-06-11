const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['\"]|['\"]$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

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

    history: t.ticket_history ? t.ticket_history.map((h) => {
      const historyActor = getProfile(h.changed_by);
      return {
        id: h.id,
        ticketId: h.ticket_id,
        changedBy: historyActor?.full_name || h.changed_by,
        fieldChanged: h.field_changed,
        oldValue: h.old_value || '',
        newValue: h.new_value || '',
        createdAt: h.created_at
      };
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [],

    rating: t.satisfaction_ratings && t.satisfaction_ratings.length > 0 ? {
      id: t.satisfaction_ratings[0].id,
      ticketId: t.satisfaction_ratings[0].ticket_id,
      score: t.satisfaction_ratings[0].score,
      feedback: t.satisfaction_ratings[0].feedback,
      createdAt: t.satisfaction_ratings[0].created_at
    } : undefined,

    ticketType: t.ticket_type,
    functionalOrTechnical: t.functional_or_technical,
    classification: t.classification || t.functional_or_technical,
    businessImpact: t.business_impact,
    businessImpactLevel: t.business_impact_level || t.business_impact,
    businessJustification: t.business_justification,
    expectedResolutionDate: t.expected_resolution_date,
    quotedHours: t.quoted_hours ? Number(t.quoted_hours) : undefined,
    raisedToSap: t.raised_to_sap,
    reopenedCount: t.reopened_count || 0,
    customerActionRequired: t.customer_action_required,
    currentOwner: t.current_owner,
    nextActionOwner: t.next_action_owner,
    escalations: t.ticket_escalations ? t.ticket_escalations.map((esc) => {
      const escActor = getProfile(esc.escalated_by);
      return {
        id: esc.id,
        ticketId: esc.ticket_id,
        escalatedBy: escActor?.full_name || esc.escalated_by,
        reason: esc.reason,
        severity: esc.severity,
        status: esc.status,
        createdAt: esc.created_at
      };
    }) : [],

    createdByName: t.created_by_name || customer?.full_name || t.requested_by,
    createdByUser: t.created_by_user,
    softDeleteStatus: t.soft_delete_status || 'Active',
    sapModules: t.ticket_modules && t.ticket_modules.length > 0
      ? t.ticket_modules.map((m) => m.module_id)
      : (t.sap_module ? [t.sap_module] : []),
      
    deleteRequests: t.ticket_delete_requests ? t.ticket_delete_requests.map((r) => {
      const reqActor = getProfile(r.requested_by);
      return {
        id: r.id,
        ticketId: r.ticket_id,
        requestedBy: reqActor?.full_name || r.requested_by,
        requestedAt: r.requested_at,
        reason: r.reason,
        managerApproval: r.manager_approval,
        managerApprovedBy: r.manager_approved_by,
        managerApprovedAt: r.manager_approved_at,
        adminApproval: r.admin_approval,
        adminApprovedBy: r.admin_approved_by,
        adminApprovedAt: r.admin_approved_at,
        finalStatus: r.final_status,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    }) : [],

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

    consultantEfforts: (() => {
      const efforts = t.ticket_consultant_efforts ? t.ticket_consultant_efforts
        .filter((e) => !e.is_deleted)
        .map((e) => {
          const effortConsultant = getProfile(e.consultant_id);
          return {
            id: e.id,
            ticketId: e.ticket_id,
            consultantId: e.consultant_id,
            consultantName: effortConsultant?.full_name || e.consultant_name || e.consultant_id,
            consultantType: e.consultant_type,
            estimatedHours: Number(e.estimated_hours),
            actualHours: Number(e.actual_hours),
            remarks: e.remarks,
            createdAt: e.created_at,
            updatedAt: e.updated_at,
            isDeleted: e.is_deleted,
            deletedAt: e.deleted_at,
            deletedBy: e.deleted_by,
            closureStatus: e.closure_status || 'Pending',
            workSummary: e.work_summary || '',
            resolutionNotes: e.resolution_notes || ''
          };
        }) : [];

      if (t.assigned_consultant_id) {
        const isAssignedPresent = efforts.some((e) => e.consultantId === t.assigned_consultant_id);
        if (!isAssignedPresent) {
          const primaryProfile = getProfile(t.assigned_consultant_id);
          if (primaryProfile) {
            efforts.push({
              id: `synthesized-${t.assigned_consultant_id}-${t.id}`,
              ticketId: t.id,
              consultantId: t.assigned_consultant_id,
              consultantName: primaryProfile.full_name || 'Consultant',
              consultantType: (primaryProfile.consultant_type === 'Technical' || t.functional_or_technical === 'Technical') ? 'Technical' : 'Functional',
              estimatedHours: 0,
              actualHours: 0,
              remarks: 'Primary assignment',
              createdAt: t.created_at,
              updatedAt: t.updated_at,
              isDeleted: false,
              closureStatus: 'Pending',
              workSummary: '',
              resolutionNotes: ''
            });
          }
        }
      }
      return efforts;
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

async function run() {
  const query = '*, organizations(name), ticket_comments(*), ticket_efforts(*), satisfaction_ratings(*), ticket_modules(*), ticket_delete_requests(*), ticket_hour_estimates(*), ticket_closure_requests(*), ticket_consultant_efforts(*), ticket_unlock_requests(*), ticket_comment_attachments(*), ticket_attachments(*), ticket_history(*)';
  const { data: dbTickets, error: tErr } = await supabase.from('tickets').select(query);
  const { data: dbProfiles, error: pErr } = await supabase.from('profiles').select('*');
  const { data: dbContacts, error: cErr } = await supabase.from('customer_contacts').select('*');

  if (tErr || pErr || cErr) {
    console.error("Fetch error:", { tErr, pErr, cErr });
    return;
  }

  console.log("Mapping database tickets...");
  try {
    const mapped = dbTickets.map(t => mapDbTicket(t, dbProfiles, dbContacts || []));
    console.log("SUCCESS! Mapped tickets count:", mapped.length);
    console.log("Mapped ticket IDs:", mapped.map(x => x.id));
  } catch (err) {
    console.error("Mapping failed with error:", err);
  }
}

run();
