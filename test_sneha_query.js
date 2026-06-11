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
  const email = 'csneha@isupportz.com';
  const password = 'Sneha@12345';
  
  console.log(`Logging in as ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    process.exit(1);
  }

  console.log("Login successful! User ID:", authData.user.id);

  // Use the session token to query the profile
  const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });

  console.log("Querying profile with exact select fields...");
  console.time("query_profile");
  const { data: profile, error: profileError } = await authenticatedClient
    .from('profiles')
    .select('full_name, role, is_active, is_locked, consultant_type, sap_modules, phone_number, first_login_completed, force_password_change, organizations(name)')
    .eq('id', authData.user.id)
    .single();
  console.timeEnd("query_profile");

  if (profileError) {
    console.error("Profile query failed:", profileError);
  } else {
    console.log("Profile query succeeded:", profile);
  }

  process.exit(0);
}

run();
