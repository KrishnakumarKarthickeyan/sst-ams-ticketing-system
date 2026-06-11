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
  console.log('Querying profiles table directly via service role...');
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error querying profiles:', error);
  } else {
    console.log('Profiles currently in DB (count:', data.length, '):');
    data.forEach(p => {
      console.log(`- ID: ${p.id}, Email: ${p.email}, Name: ${p.full_name}, Role: ${p.role}`);
    });
  }
}

run();
