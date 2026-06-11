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
  console.log("Fetching RLS policies from pg_policies...");
  // We can query pg_policies catalog view
  const { data: policies, error: err } = await supabase.rpc('run_sql_query', {
    sql_query: "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public'"
  });

  if (err) {
    // If run_sql_query RPC is not defined, we can try running it via standard select if there is a helper RPC
    console.log("run_sql_query rpc failed:", err.message);
    
    // Let's see if there is another way to inspect policies, or check if we can query it using another RPC
    // Let's write an RPC test or query system tables directly. Wait! Supabase doesn't expose system catalogs over PostgREST by default.
    // But we can check if there are custom RPCs we can call, or check the SQL migration files in the repo!
  } else {
    console.log("Policies in DB:", policies);
  }
}

run();
