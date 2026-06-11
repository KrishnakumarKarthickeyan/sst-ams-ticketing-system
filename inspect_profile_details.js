const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function test() {
  const managerId = '7d1be7f4-01b8-4b66-a842-d28a2b63c4f3';
  console.log(`Querying profile for manager ID ${managerId} using Service Role...`);
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, organizations(name)')
    .eq('id', managerId)
    .single();

  if (profileError) {
    console.error("Profile query failed:", profileError);
  } else {
    console.log("Profile successfully retrieved:", profile);
  }
}

test();
