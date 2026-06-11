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

async function check() {
  const serviceClient = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY);
  const anonClient = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  console.log("Fetching organizations via SERVICE ROLE...");
  const { data: sOrgs, error: sErr } = await serviceClient.from('organizations').select('*');
  console.log("Service Role Result:", { count: sOrgs?.length, error: sErr, data: sOrgs });

  console.log("\nFetching organizations via ANON...");
  const { data: aOrgs, error: aErr } = await anonClient.from('organizations').select('*');
  console.log("Anon Result:", { count: aOrgs?.length, error: aErr, data: aOrgs });
}

check();
