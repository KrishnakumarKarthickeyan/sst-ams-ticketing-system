const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing URL or service role key');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Failed to list auth users:', error.message);
    return;
  }
  
  for (const user of users) {
    if (user.email !== 'manager@supportstudio.com') {
      console.log(`Resetting password for user ${user.email} to Password@12345...`);
      const { data, error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
        password: 'Password@12345'
      });
      if (updateErr) {
        console.error(`Failed to reset password for ${user.email}:`, updateErr.message);
      } else {
        console.log(`Successfully reset password for ${user.email}!`);
      }
    }
  }
}

run();
