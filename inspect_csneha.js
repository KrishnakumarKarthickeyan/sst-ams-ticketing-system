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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const email = 'csneha@isupportz.com';
  
  console.log(`Inspecting profiles table for ${email}...`);
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (profErr) {
    console.error("Profiles fetch error:", profErr);
  } else {
    console.log("Profile details:", profile);
  }

  console.log(`\nInspecting Auth users for ${email}...`);
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error("Auth users list error:", authError);
  } else {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      console.log("Auth user found:", {
        id: user.id,
        email: user.email,
        banned_until: user.banned_until,
        user_metadata: user.user_metadata,
        aud: user.aud,
        role: user.role
      });
    } else {
      console.log("No auth user found with email:", email);
    }
  }
  process.exit(0);
}

run();
