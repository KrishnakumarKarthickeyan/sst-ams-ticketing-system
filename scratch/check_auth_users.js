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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is not defined in env.local!");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  // Query auth.users via supabase.auth.admin
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error("Error listing auth users:", authErr);
    return;
  }
  
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  if (profErr) {
    console.error("Error listing profiles:", profErr);
    return;
  }
  
  console.log("Auth Users:");
  users.forEach(u => {
    const match = profiles.find(p => p.id === u.id);
    console.log(`- ID: ${u.id}, Email: ${u.email}, CreatedAt: ${u.created_at}`);
    console.log(`  Has matching Profile: ${match ? 'YES (' + match.full_name + ')' : '❌ NO'}`);
  });
}

check();
