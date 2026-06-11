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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log("=== Columns of ticket_comments ===");
  const { data: cols, error: colErr } = await supabase.rpc('run_sql', {
    sql_query: `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'ticket_comments'
    `
  });
  if (colErr) {
    // If run_sql is not available, try standard query or print error
    console.error("run_sql failed (might not have permissions/RPC):", colErr);
  } else {
    console.log(cols);
  }

  console.log("=== RLS Policies of ticket_comments ===");
  const { data: policies, error: polErr } = await supabase.rpc('run_sql', {
    sql_query: `
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'ticket_comments'
    `
  });
  if (polErr) {
    console.error(polErr);
  } else {
    console.log(policies);
  }

  console.log("=== Recent comments ===");
  const { data: comments, error: commErr } = await supabase
    .from('ticket_comments')
    .select('*')
    .limit(5);
  if (commErr) {
    console.error(commErr);
  } else {
    console.log(comments);
  }
}

run();
