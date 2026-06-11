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
  // Let's get a user ID first to query specifically
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  if (!profiles || profiles.length === 0) {
    console.error("No profiles found to query!");
    return;
  }
  const userId = profiles[0].id;
  console.log(`Querying profile for user ID: ${userId}...`);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, role, is_active, consultant_type, sap_modules, phone_number, organizations(name)')
    .eq('id', userId)
    .single();

  console.log("Query Result:");
  if (error) {
    console.error("❌ Query Failed:", error);
  } else {
    console.log("✅ Query Succeeded:", profile);
  }
}

check();
