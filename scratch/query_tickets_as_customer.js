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
  console.log("Logging in as Yousuf...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'yousuf@bit.com',
    password: 'Yousuf@12345'
  });
  if (authError) {
    console.error("Login failed:", authError);
    return;
  }
  
  console.log("Fetching Yousuf's tickets via anonymous client...");
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('*, organizations(name)');
  
  if (ticketsError) {
    console.error("Error fetching tickets:", ticketsError);
  } else {
    console.log("Yousuf's tickets found:", tickets.length);
    tickets.forEach(t => {
      console.log(`Ticket ID: ${t.id}, Org: ${t.organizations ? t.organizations.name : 'null'}, OrgID: ${t.organization_id}`);
    });
  }
}

run();
