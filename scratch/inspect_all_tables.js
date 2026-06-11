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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log("Checking tables existence and row counts in Supabase...");
  
  const tables = [
    'tickets',
    'profiles',
    'organizations',
    'customer_contracts',
    'ticket_comments',
    'ticket_closure_requests',
    'ticket_actual_hours',
    'ticket_assignments',
    'ticket_estimates',
    'notifications',
    'ticket_history'
  ];

  for (const table of tables) {
    const { count, data, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`❌ Table '${table}' check error:`, error.message);
    } else {
      console.log(`✅ Table '${table}' exists. Count: ${count}`);
    }
  }

  console.log("\nInspecting structure of ticket_closure_requests...");
  const { data: cols, error: colErr } = await supabase.from('ticket_closure_requests').select('*').limit(1);
  if (colErr) {
    console.error("Error selecting from ticket_closure_requests:", colErr.message);
  } else {
    console.log("ticket_closure_requests columns:", cols.length > 0 ? Object.keys(cols[0]) : "Empty table");
  }

  console.log("\nInspecting structure of ticket_actual_hours...");
  const { data: cols2, error: colErr2 } = await supabase.from('ticket_actual_hours').select('*').limit(1);
  if (colErr2) {
    console.error("Error selecting from ticket_actual_hours:", colErr2.message);
  } else {
    console.log("ticket_actual_hours columns:", cols2.length > 0 ? Object.keys(cols2[0]) : "Empty table");
  }
}

run();
