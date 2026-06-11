const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['\"]|['\"]$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const userId = 'b95269b9-aa0e-4218-bd48-af990c98cb33'; // csneha's user ID
  
  console.log("Querying profile with anon client...");
  console.time("query_profile_anon");
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role, is_active, is_locked, consultant_type, sap_modules, phone_number, first_login_completed, force_password_change, organizations(name)')
    .eq('id', userId)
    .single();
  console.timeEnd("query_profile_anon");

  if (profileError) {
    console.error("Profile query failed:", profileError);
  } else {
    console.log("Profile query succeeded:", profile);
  }

  process.exit(0);
}

run();
