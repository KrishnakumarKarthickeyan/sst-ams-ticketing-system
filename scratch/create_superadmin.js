const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
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
  const email = 'admin@supportstudio.com';
  const password = 'Admin@12345';
  const fullName = 'SST Super Admin';
  
  console.log(`Creating auth user: ${email}...`);
  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'SuperAdmin'
    }
  });

  if (error) {
    if (error.message.includes('already exists') || error.message.includes('already registered')) {
      console.log("User already exists in auth. Fetching user ID...");
      // Fetch user ID
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error("Error listing users to find existing ID:", listError);
        return;
      }
      const existingUser = listData.users.find(u => u.email === email);
      if (!existingUser) {
        console.error("Could not find existing user in listed users.");
        return;
      }
      console.log(`Found user: ID is ${existingUser.id}`);
      await createProfile(existingUser.id, email, fullName);
    } else {
      console.error("Error creating auth user:", error);
    }
  } else if (data && data.user) {
    console.log(`Auth user created successfully! ID: ${data.user.id}`);
    await createProfile(data.user.id, email, fullName);
  }
}

async function createProfile(id, email, fullName) {
  console.log(`Creating profile for user ID: ${id}...`);
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: id,
      email: email,
      full_name: fullName,
      role: 'SuperAdmin',
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    console.error("Error creating profile:", error);
  } else {
    console.log("Profile created/updated successfully!");
  }
}

run();
