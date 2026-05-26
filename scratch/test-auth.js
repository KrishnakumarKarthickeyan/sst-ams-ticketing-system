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

console.log('URL:', url);
console.log('Key length:', key ? key.length : 0);

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
  const email = `test-run-${Date.now()}@supportstudio.com`;
  console.log('Attempting to create user:', email);
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'Password@12345',
      email_confirm: true,
      user_metadata: { role: 'Consultant', full_name: 'Test Script' }
    });

    if (error) {
      console.error('Error creating user:', error);
    } else {
      console.log('Success! Created user with ID:', data.user.id);
      
      // Clean up
      console.log('Deleting test user...');
      const { error: delError } = await supabase.auth.admin.deleteUser(data.user.id);
      if (delError) {
        console.error('Error deleting user:', delError);
      } else {
        console.log('Deleted test user successfully!');
      }
    }
  } catch (err) {
    console.error('Exception caught:', err);
  }
}

run();
