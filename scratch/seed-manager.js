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
  console.log('Seeding manager account...');
  try {
    // 1. Create auth user
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: 'manager@supportstudio.com',
      password: 'Manager@12345',
      email_confirm: true,
      user_metadata: { role: 'Manager', full_name: 'SAP Manager' }
    });

    let userId = '';
    if (authErr) {
      if (authErr.message.includes('already registered') || authErr.message.includes('already exists')) {
        console.log('Manager auth account already exists in Supabase Auth. Fetching ID...');
        const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
        if (listErr) throw listErr;
        const existing = users.find(u => u.email === 'manager@supportstudio.com');
        if (existing) {
          userId = existing.id;
        }
      } else {
        throw authErr;
      }
    } else {
      console.log('Manager auth account created in auth.users successfully.');
      userId = authUser.user.id;
    }

    if (!userId) {
      throw new Error('Failed to find or create Manager auth user ID.');
    }

    // 2. Insert into profiles table
    console.log('Inserting manager profile row into public.profiles...');
    const { error: profErr } = await supabase.from('profiles').upsert({
      id: userId,
      email: 'manager@supportstudio.com',
      full_name: 'SAP Manager',
      role: 'Manager',
      is_active: true
    });

    if (profErr) {
      throw profErr;
    }

    console.log('Manager profile seeded successfully! Manager ID:', userId);
  } catch (err) {
    console.error('Seeding failed:', err.message || err);
  }
}

run();
