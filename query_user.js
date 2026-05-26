const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse env file
const envPath = path.join(__dirname, '.env.local');
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
  const tables = [
    'profiles',
    'organizations',
    'customer_contracts',
    'customer_contacts',
    'tickets',
    'ticket_comments',
    'ticket_efforts',
    'ticket_modules',
    'ticket_delete_requests',
    'ticket_hour_estimates',
    'ticket_closure_requests',
    'ticket_consultant_efforts',
    'ticket_unlock_requests',
    'ticket_comment_attachments',
    'ticket_attachments',
    'ticket_history',
    'notifications',
    'sla_policies',
    'knowledgebase_articles',
    'knowledgebase_categories'
  ];
  
  console.log("Checking tables existence...");
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table [${table}]: ${error.code} - ${error.message}`);
    } else {
      console.log(`✅ Table [${table}]: Exists (row count: ${data.length})`);
    }
  }
}

run();
