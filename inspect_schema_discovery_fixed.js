const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['\"]|['\"]$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  const checkTable = async (name) => {
    const { data, error } = await supabase.from(name).select('*').limit(1);
    if (error) {
      console.error(`Error table ${name}:`, error.message);
    } else {
      console.log(`Table public.${name} columns:`, data[0] ? Object.keys(data[0]) : '(Empty Table)');
      if (data[0]) {
        console.log(`Sample Row public.${name}:`, JSON.stringify(data[0], null, 2));
      }
    }
  };

  console.log("=== Discovered Tables & Columns ===");
  await checkTable('organizations');
  await checkTable('profiles');
  await checkTable('customer_contracts');
  await checkTable('tickets');
  await checkTable('ticket_escalations');
  await checkTable('audit_logs');
  await checkTable('ticket_closure_requests');
  await checkTable('ticket_efforts');
  await checkTable('ticket_consultant_efforts');
}

check();
