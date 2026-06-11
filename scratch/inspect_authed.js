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
  try {
    console.log("Logging in as manager@supportstudio.com...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'manager@supportstudio.com',
      password: 'Manager@12345'
    });

    if (authError) {
      console.error("Login failed:", authError.message);
      return;
    }
    console.log("Login Succeeded! User ID:", authData.user.id);

    console.log("Fetching tickets with assignments...");
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*, ticket_assignments(*)');

    if (ticketsError) {
      console.error("Tickets Error:", ticketsError);
      return;
    }

    console.log("Tickets list count:", tickets ? tickets.length : 0);
    tickets.forEach(t => {
      console.log(`Ticket: ${t.id} - ${t.title}`);
      console.log(`  assigned_manager_id: ${t.assigned_manager_id}`);
      console.log(`  assigned_consultant_id: ${t.assigned_consultant_id}`);
      console.log(`  assignments:`, t.ticket_assignments);
    });
  } catch (err) {
    console.error("Fatal error:", err);
  }
}

run();
