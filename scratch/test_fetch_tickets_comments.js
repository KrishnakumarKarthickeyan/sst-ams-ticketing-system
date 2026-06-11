const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Logging in as alsuhaimi@sst.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'alsuhaimi@sst.com',
    password: 'Alsuhaimi@12345'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }
  console.log("Logged in! User ID:", authData.user.id);

  const selectQuery = '*, organizations(name), ticket_comments(id, ticket_id, created_at, author_id, content, is_internal), ticket_efforts(*), satisfaction_ratings(*), ticket_modules(*), ticket_delete_requests(*), ticket_hour_estimates(*), ticket_closure_requests(*), ticket_assignments(*), ticket_estimates(*), ticket_actual_hours(*), ticket_unlock_requests(*), ticket_comment_attachments(id, comment_id, ticket_id, file_name, file_url, file_type, file_size, uploaded_by, created_at), ticket_attachments(id, ticket_id, file_name, file_path, mime_type, file_size, uploaded_by, created_at), ticket_history(id, ticket_id, changed_by, field_changed, old_value, new_value, created_at), requested_by_profile:requested_by(id, full_name, email, phone_number), created_by_profile:created_by_user(id, full_name, email, phone_number)';

  console.log("Fetching tickets with comments...");
  const { data: tickets, error: ticketError } = await supabase
    .from('tickets')
    .select(selectQuery)
    .order('created_at', { ascending: false });

  if (ticketError) {
    console.error("Fetch tickets failed:", ticketError);
    return;
  }

  console.log(`Fetched ${tickets.length} tickets.`);
  tickets.forEach(t => {
    console.log(`Ticket: ${t.ticket_number} (ID: ${t.id})`);
    console.log(`- Comments in ticket_comments:`, t.ticket_comments);
    console.log(`- Comments in comments:`, t.comments);
  });
}

run();
