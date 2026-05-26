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
  console.error('Missing URL or service role key in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log('1. Checking Profiles table for manager@supportstudio.com...');
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'manager@supportstudio.com');

  if (profErr) {
    console.error('Error fetching profile:', profErr);
  } else {
    console.log('Profiles matching manager@supportstudio.com:', profiles);
  }

  console.log('\n2. Checking Auth users list for manager@supportstudio.com...');
  try {
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
      console.error('Error listing auth users:', authErr);
    } else {
      const manager = users.find(u => u.email === 'manager@supportstudio.com');
      if (manager) {
        console.log('Manager auth record found:', {
          id: manager.id,
          email: manager.email,
          email_confirmed: manager.email_confirmed_at,
          user_metadata: manager.user_metadata
        });
      } else {
        console.log('Manager auth record NOT found in auth.users.');
      }
    }
  } catch (err) {
    console.error('Exception caught listing users:', err);
  }
}

run();
