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

async function run() {
  const ticketId = 'SST-QM-1008';
  console.log("Querying ticket:", ticketId);
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

  console.log("Ticket exists! Row:", JSON.stringify(ticketRow, null, 2));
}

run();
