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
  console.log("Checking tickets table rows for assigned_consultant_id vs primary_consultant_id...");
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('id, title, assigned_consultant_id, primary_consultant_id');

  if (error) {
    console.error("Error fetching tickets:", error.message);
    return;
  }

  tickets.forEach(t => {
    console.log(`Ticket: ${t.id} | Title: "${t.title}"`);
    console.log(`  assigned_consultant_id: ${t.assigned_consultant_id}`);
    console.log(`  primary_consultant_id:  ${t.primary_consultant_id}`);
  });
}

run();
