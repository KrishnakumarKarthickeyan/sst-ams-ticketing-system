const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  const { data: policies, error } = await supabase.rpc('get_policies_for_table', { table_name: 'profiles' });
  if (error) {
    // If rpc doesn't exist, we can run a direct query if possible, or try standard sql
    console.error("RPC error (might not exist):", error);
    
    // Let's try executing SQL if possible, but since we don't have SQL API directly, let's just fetch all policies using postgres system tables.
    // Wait, let's see if we can do a query on pg_policies using service_role via postgrest.
    // Wait, Postgrest does not expose arbitrary tables unless they are in public schema. But sometimes pg_catalog is exposed or we can run SQL via pg_policies if it's exposed.
    // Let's try querying pg_policies via supabase.from('pg_policies')? No, it usually won't be exposed.
    // Let's see if we can check it by trying to fetch a profile using the anon key vs service role key.
  }
  
  // Let's do a simple check: try to fetch profile using anon key with a custom auth header or simulated session.
  console.log("Simulating anon access...");
  const anonSupabase = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: anonData, error: anonError } = await anonSupabase.from('profiles').select('*').limit(5);
  console.log("Anon select result (no auth):", { hasData: !!anonData, count: anonData?.length, error: anonError });
}

check();
