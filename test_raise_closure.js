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

async function test() {
  const ticketId = 'SST-ABAP-1001';
  const consultantId = '7408c315-ab62-475d-af67-6471b926efbc'; // Keerthana
  const consultantName = 'Keerthana';

  console.log("Starting closure request test...");

  // 1. Insert closure request
  console.log("1. Inserting closure request...");
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
    console.error("❌ Closure Request Insert Failed:", reqErr);
    return;
  }
  const dbClosureReqId = insertedReq.id;
  console.log("✅ Closure request inserted successfully, ID:", dbClosureReqId);

  // 2. Insert actual hours
  console.log("2. Inserting actual hours...");
  const { error: actErr } = await supabase.from('ticket_actual_hours').insert({
    closure_request_id: dbClosureReqId,
    ticket_id: ticketId,
    consultant_id: consultantId,
    consultant_type: 'Functional',
    actual_hours: 6.0
  });

  if (actErr) {
    console.error("❌ Actual Hours Insert Failed:", actErr);
    // Cleanup
    await supabase.from('ticket_closure_requests').delete().eq('id', dbClosureReqId);
    return;
  }
  console.log("✅ Actual hours inserted successfully.");

  // 3. Update ticket consultant efforts
  console.log("3. Updating consultant efforts...");
  const { data: existingEff, error: effFetchErr } = await supabase.from('ticket_consultant_efforts')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('consultant_id', consultantId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (effFetchErr) {
    console.error("❌ Consultant Efforts Fetch Failed:", effFetchErr);
    return;
  }

  if (existingEff) {
    console.log("Updating existing effort:", existingEff.id);
    const { error: effUpdErr } = await supabase.from('ticket_consultant_efforts').update({
      actual_hours: 6.0,
      closure_status: 'Submitted',
      work_summary: 'Test work completed summary',
      resolution_notes: 'Test resolution summary',
      updated_at: new Date().toISOString()
    }).eq('id', existingEff.id);
    if (effUpdErr) {
      console.error("❌ Effort Update Failed:", effUpdErr);
      return;
    }
  } else {
    console.log("Inserting new effort...");
    const { error: effInsErr } = await supabase.from('ticket_consultant_efforts').insert({
      ticket_id: ticketId,
      consultant_id: consultantId,
      consultant_type: 'Functional',
      estimated_hours: 0,
      actual_hours: 6.0,
      closure_status: 'Submitted',
      work_summary: 'Test work completed summary',
      resolution_notes: 'Test resolution summary'
    });
    if (effInsErr) {
      console.error("❌ Effort Insert Failed:", effInsErr);
      return;
    }
  }
  console.log("✅ Consultant efforts updated successfully.");

  // 4. Update ticket
  console.log("4. Updating ticket...");
  const { error: ticketUpdErr } = await supabase.from('tickets').update({
    status: 'Request for Closure',
    closure_status: 'Awaiting Manager Approval',
    root_cause: 'SAP Configuration/Process Alignment',
    resolution_summary: 'Test resolution summary',
    updated_at: new Date().toISOString()
  }).eq('id', ticketId);

  if (ticketUpdErr) {
    console.error("❌ Ticket Update Failed:", ticketUpdErr);
    return;
  }
  console.log("✅ Ticket updated successfully.");

  // Cleanup
  console.log("Cleaning up test data...");
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
