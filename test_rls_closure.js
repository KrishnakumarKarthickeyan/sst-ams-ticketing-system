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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Logging in as keerthana@sst.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'keerthana@sst.com',
    password: 'Keerthana@12345'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }
  const user = authData.user;
  console.log("Login Succeeded! User ID:", user.id);

  const ticketId = 'SST-ABAP-1001';
  
  // Verify ticket first
  const { data: ticket, error: ticketFetchErr } = await supabase
    .from('tickets')
    .select('status, assigned_consultant_id, primary_consultant_id')
    .eq('id', ticketId)
    .single();

  if (ticketFetchErr) {
    console.error("❌ Failed to fetch ticket:", ticketFetchErr);
    return;
  }
  console.log("Current ticket status:", ticket.status, "assigned:", ticket.assigned_consultant_id, "primary:", ticket.primary_consultant_id);

  // 1. Insert closure request
  console.log("Step 1: Inserting closure request...");
  const { data: insertedReq, error: reqErr } = await supabase.from('ticket_closure_requests').insert({
    ticket_id: ticketId,
    requested_by: user.id,
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
    console.error("❌ Step 1 Failed:", reqErr);
    return;
  }
  const dbClosureReqId = insertedReq.id;
  console.log("✅ Step 1 Succeeded! Request ID:", dbClosureReqId);

  // 2. Insert actual hours
  console.log("Step 2: Inserting actual hours...");
  const { error: actErr } = await supabase.from('ticket_actual_hours').insert({
    closure_request_id: dbClosureReqId,
    ticket_id: ticketId,
    consultant_id: user.id,
    consultant_type: 'Functional',
    actual_hours: 6.0
  });

  if (actErr) {
    console.error("❌ Step 2 Failed:", actErr);
    // Cleanup
    await supabase.from('ticket_closure_requests').delete().eq('id', dbClosureReqId);
    return;
  }
  console.log("✅ Step 2 Succeeded!");

  // 3. Update consultant efforts
  console.log("Step 3: Updating consultant efforts...");
  const { data: existingEff, error: effFetchErr } = await supabase.from('ticket_consultant_efforts')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('consultant_id', user.id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (effFetchErr) {
    console.error("❌ Step 3 Fetch Failed:", effFetchErr);
    // Cleanup
    await supabase.from('ticket_actual_hours').delete().eq('closure_request_id', dbClosureReqId);
    await supabase.from('ticket_closure_requests').delete().eq('id', dbClosureReqId);
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
      console.error("❌ Step 3 Update Failed:", effUpdErr);
      // Cleanup
      await supabase.from('ticket_actual_hours').delete().eq('closure_request_id', dbClosureReqId);
      await supabase.from('ticket_closure_requests').delete().eq('id', dbClosureReqId);
      return;
    }
  } else {
    console.log("Inserting new effort...");
    const { error: effInsErr } = await supabase.from('ticket_consultant_efforts').insert({
      ticket_id: ticketId,
      consultant_id: user.id,
      consultant_type: 'Functional',
      estimated_hours: 0,
      actual_hours: 6.0,
      closure_status: 'Submitted',
      work_summary: 'Test work completed summary',
      resolution_notes: 'Test resolution summary'
    });
    if (effInsErr) {
      console.error("❌ Step 3 Insert Failed:", effInsErr);
      // Cleanup
      await supabase.from('ticket_actual_hours').delete().eq('closure_request_id', dbClosureReqId);
      await supabase.from('ticket_closure_requests').delete().eq('id', dbClosureReqId);
      return;
    }
  }
  console.log("✅ Step 3 Succeeded!");

  // 4. Update ticket
  console.log("Step 4: Updating ticket status...");
  const { error: ticketUpdErr } = await supabase.from('tickets').update({
    status: 'Request for Closure',
    closure_status: 'Awaiting Manager Approval',
    root_cause: 'SAP Configuration/Process Alignment',
    resolution_summary: 'Test resolution summary',
    updated_at: new Date().toISOString()
  }).eq('id', ticketId);

  if (ticketUpdErr) {
    console.error("❌ Step 4 Failed:", ticketUpdErr);
    // Cleanup
    await supabase.from('ticket_actual_hours').delete().eq('closure_request_id', dbClosureReqId);
    await supabase.from('ticket_closure_requests').delete().eq('id', dbClosureReqId);
    return;
  }
  console.log("✅ Step 4 Succeeded!");

  // 5. Insert history logs
  console.log("Step 5: Inserting history logs...");
  const { error: histErr1 } = await supabase.from('ticket_history').insert({
    ticket_id: ticketId,
    changed_by: user.id,
    field_changed: 'Status',
    old_value: ticket.status,
    new_value: 'Request for Closure'
  });
  if (histErr1) {
    console.error("❌ Step 5 Hist 1 Failed:", histErr1);
  }
  
  const { error: histErr2 } = await supabase.from('ticket_history').insert({
    ticket_id: ticketId,
    changed_by: user.id,
    field_changed: 'Actual Hours Submitted',
    old_value: '0',
    new_value: '6.0 (Func: 4.0, Tech: 2.0)'
  });
  if (histErr2) {
    console.error("❌ Step 5 Hist 2 Failed:", histErr2);
  }
  console.log("✅ Step 5 Succeeded!");

  // Cleanup
  console.log("Cleaning up test data...");
  await supabase.from('ticket_actual_hours').delete().eq('closure_request_id', dbClosureReqId);
  await supabase.from('ticket_closure_requests').delete().eq('id', dbClosureReqId);
  await supabase.from('tickets').update({
    status: ticket.status,
    closure_status: ticket.closure_status || 'Pending',
    root_cause: ticket.root_cause || null,
    resolution_summary: ticket.resolution_summary || null
  }).eq('id', ticketId);
  console.log("✅ Cleanup complete.");
}

run();
