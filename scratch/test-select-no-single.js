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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing URL or anon key in .env.local');
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log('Logging in as manager@supportstudio.com...');
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'manager@supportstudio.com',
    password: 'Manager@12345'
  });

  if (loginErr) {
    console.error('Login error:', loginErr.message);
    return;
  }

  const user = loginData.user;
  console.log('Login successful! Auth User ID:', user.id);

  console.log('Fetching profiles list...');
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', user.id);

  if (profErr) {
    console.error('Profile fetch failed:', profErr.message, profErr.details, profErr.hint);
  } else {
    console.log('Profile query returned:', profiles);
  }
}

run();
