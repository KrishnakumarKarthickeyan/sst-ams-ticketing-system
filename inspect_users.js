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

async function inspect() {
  console.log("Fetching profiles from database...");
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role');
  
  if (profError) {
    console.error("Profiles fetch error:", profError);
  } else {
    console.log("Profiles count in database:", profiles.length);
    console.log("Profiles in DB:", profiles);
  }

  console.log("\nFetching users from Supabase Auth...");
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error("Auth users fetch error:", authError);
  } else {
    console.log("Auth users count:", users.length);
    console.log("Auth users:", users.map(u => ({ id: u.id, email: u.email, metadata: u.user_metadata })));
  }
}

inspect();
