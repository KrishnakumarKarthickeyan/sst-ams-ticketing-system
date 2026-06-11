const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
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

// Mimic TicketContext.tsx mapDbTicket
function mapDbTicket(t, dbProfiles, dbContacts = [], currentOrgMap = {}) {
  const getProfile = (id) => dbProfiles.find(p => p.id === id || p.full_name === id || p.email === id);
  const reqProfile = t.requested_by_profile || getProfile(t.requested_by);
  const createdProfile = t.created_by_profile || getProfile(t.created_by_user);
  const consultant = getProfile(t.assigned_consultant_id);
  const manager = getProfile(t.assigned_manager_id);

  let requestedByPhone = reqProfile?.phone_number || undefined;
  if (!requestedByPhone && dbContacts) {
    const contact = dbContacts.find((c) => 
      (c.name && reqProfile?.full_name && c.name.toLowerCase() === reqProfile.full_name.toLowerCase()) || 
      (c.email && reqProfile?.email && c.email.toLowerCase() === reqProfile.email.toLowerCase()) ||
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
    organization: (t.organization_id ? currentOrgMap[t.organization_id] : null) || (t.organizations)?.name || t.organization_id, // Organization Name
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

    attachments: [
      ...(t.ticket_attachments ? t.ticket_attachments.map((a) => ({
        id: a.id,
        ticketId: a.ticket_id,
        commentId: a.comment_id || undefined,
        closureRequestId: a.closure_request_id || undefined,
        escalationId: a.escalation_id || undefined,
        fileName: a.file_name,
        filePath: a.file_path,
        fileUrl: a.file_path,
        fileType: a.mime_type || '',
        fileSize: a.file_size || 0,
        uploadedBy: getProfile(a.uploaded_by)?.full_name || a.uploaded_by,
        visibility: 'public',
        createdAt: a.created_at
      })) : []),
      ...(t.ticket_comment_attachments ? t.ticket_comment_attachments.map((a) => {
        const comment = (t.ticket_comments || t.comments || []).find((c) => c.id === a.comment_id);
        return {
          id: a.id,
          ticketId: a.ticket_id,
          commentId: a.comment_id,
          fileName: a.file_name,
          filePath: a.file_url,
          fileUrl: a.file_url,
          fileType: a.file_type || '',
          fileSize: a.file_size || 0,
          uploadedBy: getProfile(a.uploaded_by)?.full_name || a.uploaded_by,
          visibility: comment?.is_internal ? 'internal' : 'public',
          createdAt: a.created_at
        };
      }) : [])
    ],

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

    createdByName: t.created_by_name || createdProfile?.full_name || reqProfile?.full_name || t.requested_by,
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
    }) : []
  };
}

async function run() {
  const ticketId = 'SST-QM-1008';
  
  // Get org map
  const { data: orgs } = await supabase.from('organizations').select('*');
  const orgMap = {};
  orgs.forEach(o => {
    orgMap[o.id] = o.name;
  });

  const { data: dbProfiles } = await supabase.from('profiles').select('*');
  const { data: dbContacts } = await supabase.from('customer_contacts').select('*');

  const { data: ticketRow, error } = await supabase
    .from('tickets')
    .select('*, organizations(name), ticket_comments(*), ticket_efforts(*), satisfaction_ratings(*), ticket_modules(*), ticket_delete_requests(*), ticket_hour_estimates(*), ticket_closure_requests(*), ticket_assignments(*), ticket_estimates(*), ticket_actual_hours(*), ticket_unlock_requests(*), ticket_comment_attachments(*), ticket_attachments(*), ticket_history(*), requested_by_profile:requested_by(id, full_name, email, phone_number), created_by_profile:created_by_user(id, full_name, email, phone_number)')
    .eq('id', ticketId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching ticket:", error);
    return;
  }
  
  if (!ticketRow) {
    console.log("Ticket not found!");
    return;
  }

  const mapped = mapDbTicket(ticketRow, dbProfiles, dbContacts, orgMap);
  fs.writeFileSync('scratch/mapped_ticket.json', JSON.stringify(mapped, null, 2));
  console.log("Mapped ticket saved to scratch/mapped_ticket.json");
}

run();
