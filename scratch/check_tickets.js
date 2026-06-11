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
    console.log("Fetching profile for manager@supportstudio.com...");
    const { data: managerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'manager@supportstudio.com')
      .single();

    if (profileError) {
      console.error("Manager Profile Error:", profileError);
      return;
    }
    console.log("Manager Profile:", managerProfile);

    console.log("Fetching all tickets from database...");
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*');

    if (ticketsError) {
      console.error("Tickets Error:", ticketsError);
      return;
    }

    console.log("Tickets list count:", tickets ? tickets.length : 0);
    tickets.forEach(t => {
      console.log(`Ticket: ${t.id} - ${t.title}`);
      console.log(`  assigned_manager_id: ${t.assigned_manager_id}`);
      console.log(`  assigned_consultant_id: ${t.assigned_consultant_id}`);
    });
  } catch (err) {
    console.error("Fatal error:", err);
  }
}

run();
