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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const userId = '7d1be7f4-01b8-4b66-a842-d28a2b63c4f3'; // Manager ID
  console.log(`Querying profile as anon for user ID: ${userId}...`);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, role, is_active, consultant_type, sap_modules, phone_number, organizations(name)')
    .eq('id', userId)
    .single();

  console.log("Anon Query Result:");
  if (error) {
    console.error("❌ Anon Query Failed:", error);
  } else {
    console.log("✅ Anon Query Succeeded:", profile);
  }
}

check();
