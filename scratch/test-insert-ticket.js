const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  console.log("1. Testing insert via service role key...");
  const serviceClient = createClient(url, serviceKey);

  // Get a customer profile and organization to link
  const { data: profiles } = await serviceClient.from('profiles').select('*').eq('role', 'Customer').limit(1);
  if (!profiles || profiles.length === 0) {
    console.error("No Customer profiles found to run the test. Run seed-manager.js first.");
    return;
  }
  const profile = profiles[0];
  const orgId = profile.organization_id;

  const ticketId = `SST-FICO-TEST-${Date.now()}`;
  console.log(`Inserting ticket ${ticketId} using customer ID ${profile.id} and org ID ${orgId}...`);

  const { data, error } = await serviceClient.from('tickets').insert({
    id: ticketId,
    organization_id: orgId,
    requested_by: profile.id,
    sap_module: 'FICO',
    category: 'Functional Issue',
    priority: 'Medium',
    status: 'New',
    sla_due_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    description: 'Test ticket description',
    title: 'Test Ticket ' + Date.now(),
    billable: true,
    escalation_flag: false,
    approval_required: false,
    ticket_type: 'Incident',
    functional_or_technical: 'Functional',
    current_owner: 'Support Desk',
    next_action_owner: 'Support Desk',
    created_by_name: 'Test Customer',
    created_by_user: profile.id,
    soft_delete_status: 'Active'
  }).select('*');

  if (error) {
    console.error("❌ Service Role Insert Failed:", error);
  } else {
    console.log("✅ Service Role Insert Succeeded! Inserted data:", data);
    
    // Clean up
    await serviceClient.from('tickets').delete().eq('id', ticketId);
    console.log("Cleaned up test ticket.");
  }
}

run();
