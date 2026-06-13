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

async function clean() {
  console.log("Starting database cleanup...");

  // 1. Clear all business transactional and master data
  const tables = [
    'ticket_comment_attachments',
    'ticket_attachments',
    'ticket_comments',
    'ticket_history',
    'notifications',
    'ticket_unlock_requests',
    'ticket_actual_hours',
    'ticket_estimates',
    'ticket_assignments',
    'ticket_closure_requests',
    'ticket_hour_estimates',
    'ticket_delete_requests',
    'ticket_modules',
    'ticket_efforts',
    'ticket_consultant_efforts',
    'tickets',
    'customer_contacts',
    'customer_contracts',
    'organizations'
  ];

  for (const table of tables) {
    console.log(`Clearing table public.${table}...`);
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn(`Warning clearing table public.${table}:`, error.message);
    }
  }

  // 2. Fetch all Auth users
  console.log("Fetching users from Supabase Auth...");
  const { data: { users }, error: fetchUsersError } = await supabase.auth.admin.listUsers();
  if (fetchUsersError) {
    console.error("Fatal: failed to list users:", fetchUsersError);
    return;
  }

  const adminEmail = 'admin@supportstudio.com';
  const adminPassword = 'Admin@12345';
  let adminUser = users.find(u => u.email === adminEmail);

  // 3. Delete all other users from Auth and Profiles
  for (const user of users) {
    if (user.email !== adminEmail) {
      console.log(`Deleting user from profiles: ${user.email} (${user.id})...`);
      await supabase.from('profiles').delete().eq('id', user.id);
      
      console.log(`Deleting user from auth.users: ${user.email} (${user.id})...`);
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.error(`Failed to delete auth user ${user.email}:`, delErr.message);
      }
    }
  }

  // 4. Ensure SuperAdmin user exists and is configured correctly
  if (adminUser) {
    console.log(`SuperAdmin user found. Updating password and metadata...`);
    const { data: updatedUser, error: updateErr } = await supabase.auth.admin.updateUserById(adminUser.id, {
      password: adminPassword,
      user_metadata: {
        full_name: 'SST Super Admin',
        role: 'SuperAdmin',
        first_login_completed: true
      }
    });
    if (updateErr) {
      console.error("Failed to update SuperAdmin user:", updateErr.message);
      return;
    }
    console.log("SuperAdmin auth settings updated successfully.");
    adminUser = updatedUser.user;
  } else {
    console.log(`SuperAdmin user not found. Creating a new one...`);
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'SST Super Admin',
        role: 'SuperAdmin',
        first_login_completed: true
      }
    });
    if (createErr) {
      console.error("Fatal: failed to create SuperAdmin user:", createErr.message);
      return;
    }
    console.log("SuperAdmin user created successfully.");
    adminUser = newUser.user;
  }

  // 5. Ensure SuperAdmin profile exists in public.profiles and is active
  console.log("Ensuring SuperAdmin record in public.profiles...");
  const { error: profUpsertErr } = await supabase.from('profiles').upsert({
    id: adminUser.id,
    email: adminEmail,
    full_name: 'SST Super Admin',
    role: 'SuperAdmin',
    is_active: true,
    first_login_completed: true,
    password_changed_at: new Date().toISOString()
  });

  if (profUpsertErr) {
    console.error("Failed to upsert SuperAdmin profile:", profUpsertErr.message);
    return;
  }

  console.log("Cleanup and SuperAdmin setup complete!");
  console.log(`SuperAdmin Credentials:
  - Email: ${adminEmail}
  - Password: ${adminPassword}
  `);
}

clean();
