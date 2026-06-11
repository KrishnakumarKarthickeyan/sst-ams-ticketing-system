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
  console.log("Inspecting Supabase database tables and schemas...");
  
  // Let's run a generic query or list columns of main tables
  const tables = ['tickets', 'profiles', 'organizations', 'customer_contracts', 'ticket_comments'];
  
  for (const table of tables) {
    console.log(`\n--- Structure of table: ${table} ---`);
    const { data: cols, error: colErr } = await supabase.rpc('inspect_table_cols', { tbl: table });
    if (colErr) {
      // Fallback: Query system tables directly via custom sql if rpc is not there
      // Let's execute a raw sql query via REST API using a POST to /rest/v1/rpc/... wait, we don't have custom rpc.
      // But we can check if there's any standard rpc or if we can do select limit 1 on the table
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.error(`Error querying ${table}:`, error.message);
      } else {
        console.log(`Columns available in ${table} select query:`);
        if (data && data.length > 0) {
          console.log(Object.keys(data[0]));
        } else {
          console.log(`Table ${table} is empty, but query succeeded.`);
        }
      }
    } else {
      console.log(cols);
    }
  }

  // Check if we can run a postgres query using REST API or if there is a known RPC
  // Wait, let's see if we can check if RLS is enabled or if there are any errors on other pages.
}

run();
