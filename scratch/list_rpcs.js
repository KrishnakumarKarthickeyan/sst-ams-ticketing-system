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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function checkRPCs() {
  // Let's query information_schema or run a test SQL call via supabase.rpc
  // Normally information_schema is not directly queryable via select unless exposed,
  // but let's see if we can query pg_proc via RPC if a generic sql execution helper exists.
  const { data: testData, error: testErr } = await supabase.rpc('exec_sql', { 
    sql: 'SELECT 1' 
  });
  
  if (testErr) {
    console.log('exec_sql RPC check failed:', testErr.message);
  } else {
    console.log('exec_sql RPC exists! Returned:', testData);
    return;
  }

  // Let's try executing the migration query via a direct SQL endpoint if it is exposed.
  // Wait, if no SQL RPC exists, we'll inform the user that the migration SQL should be run in Supabase SQL editor.
  // Let's also check if there's any other common RPC name like 'run_sql' or 'execute_sql'.
  const { data: testData2, error: testErr2 } = await supabase.rpc('run_sql', { 
    sql: 'SELECT 1' 
  });
  if (testErr2) {
    console.log('run_sql RPC check failed:', testErr2.message);
  } else {
    console.log('run_sql RPC exists! Returned:', testData2);
  }
}

checkRPCs();
