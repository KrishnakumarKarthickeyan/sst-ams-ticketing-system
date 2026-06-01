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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const managerId = '7d1be7f4-01b8-4b66-a842-d28a2b63c4f3';
  const email = 'manager@supportstudio.com';
  const password = 'Password@12345';

  console.log(`Resetting password for ${email}...`);
  const { error: resetError } = await adminClient.auth.admin.updateUserById(managerId, {
    password
  });

  if (resetError) {
    console.error("Password reset failed:", resetError);
    return;
  }
  console.log("Password reset successful.");

  console.log(`Logging in as ${email}...`);
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.error("Login failed:", authError);
    return;
  }
  console.log("Login successful. Access token length:", authData.session.access_token.length);

  // Set the session on a client to simulate the logged in user
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
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

  console.log("Querying profile with user's access token...");
  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('full_name, role, is_active, consultant_type, sap_modules, phone_number, first_login_completed, organizations(name)')
    .eq('id', managerId)
    .single();

  if (profileError) {
    console.error("Profile query failed:", profileError);
  } else {
    console.log("Profile successfully retrieved:", profile);
  }
}

run();
