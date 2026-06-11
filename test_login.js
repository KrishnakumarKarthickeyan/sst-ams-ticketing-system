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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const email = 'manager@supportstudio.com';
  const password = 'Password@12345';
  
  console.log(`Attempting to sign in as ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.error("Sign in failed:", authError);
    return;
  }

  console.log("Sign in successful. User ID:", authData.user.id);
  console.log("Querying profile...");
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role, is_active, consultant_type, sap_modules, phone_number, first_login_completed, organizations(name)')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    console.error("Profile query failed:", profileError);
  } else {
    console.log("Profile successfully retrieved:", profile);
  }
}

test();
