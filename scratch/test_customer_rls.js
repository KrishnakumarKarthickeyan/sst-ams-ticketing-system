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
  console.log("Logging in as Yousuf (Customer)...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'yousuf@bit.com',
    password: 'Manager@12345'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  console.log("Yousuf logged in! User ID:", authData.user.id);

  console.log("Fetching tickets as Yousuf...");
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, title, organization_id, sap_module, status');

  if (ticketsError) {
    console.error("Error fetching tickets:", ticketsError);
  } else {
    console.log("Yousuf's tickets count:", tickets.length);
    console.log("Tickets:", tickets);
  }
}

run();
