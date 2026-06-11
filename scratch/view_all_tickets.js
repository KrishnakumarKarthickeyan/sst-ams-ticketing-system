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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runView() {
  const { data: dbTickets, error: tError } = await supabase
    .from('tickets')
    .select('id, ticket_number, title, status, priority, created_at, resolved_at, closed_at, escalation_flag');
  
  if (tError) {
    console.error(tError);
    return;
  }
  
  console.log("ALL TICKETS IN DB:");
  dbTickets.forEach(t => {
    console.log(`- ID: ${t.id}, Num: ${t.ticket_number}, Title: "${t.title}", Status: "${t.status}", Priority: "${t.priority}", CreatedAt: ${t.created_at}`);
  });
}

runView();
