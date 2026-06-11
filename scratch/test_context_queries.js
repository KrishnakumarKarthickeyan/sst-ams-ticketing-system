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
  console.log("Login Succeeded! User ID:", authData.user.id);

  const query = `
    *, 
    organizations(name), 
    ticket_comments(id, created_at, author_id, is_internal), 
    ticket_efforts(*), 
    satisfaction_ratings(*), 
    ticket_modules(*), 
    ticket_delete_requests(*), 
    ticket_hour_estimates(*), 
    ticket_closure_requests(*), 
    ticket_assignments(*), 
    ticket_estimates(*), 
    ticket_actual_hours(*), 
    ticket_unlock_requests(*), 
    ticket_comment_attachments(id, comment_id, file_name, file_size, created_at), 
    ticket_attachments(id, ticket_id, file_name, file_size, created_at), 
    ticket_history(id, ticket_id, changed_by, field_changed, old_value, new_value, created_at), 
    requested_by_profile:requested_by(id, full_name, email, phone_number), 
    created_by_profile:created_by_user(id, full_name, email, phone_number)
  `.replace(/\s+/g, ' ');

  console.log("Running Ticket Context tickets query...");
  const start = Date.now();
  const { data, error } = await supabase.from('tickets').select(query);
  const duration = Date.now() - start;

  if (error) {
    console.error(`❌ Tickets query failed in ${duration}ms:`, error);
  } else {
    console.log(`✅ Tickets query succeeded in ${duration}ms. Rows: ${data ? data.length : 0}`);
    if (data && data.length > 0) {
      console.log("Sample ticket fields:", Object.keys(data[0]));
      console.log("requested_by_profile of first row:", data[0].requested_by_profile);
      console.log("created_by_profile of first row:", data[0].created_by_profile);
    }
  }
}

run();
