const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
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

async function run() {
  const userId = 'd4994d2c-e1b7-4fd4-a9c5-a3cd8102fa1e';
  const email = 'csneha@isupportz.com';
  const newPassword = 'Sneha_2026!@#';

  console.log(`Checking profile for ${email}...`);
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (profErr) {
    console.error("Profile check failed:", profErr);
    return;
  }
  console.log("Current profile status:", profile);

  console.log(`Updating password in Supabase Auth to "${newPassword}"...`);
  const { data: authUser, error: updateErr } = await supabase.auth.admin.updateUserById(profile.id, {
    password: newPassword,
    user_metadata: { first_login_completed: true } // Keep it true so she isn't forced to reset it
  });

  if (updateErr) {
    console.error("Auth password update failed:", updateErr);
    return;
  }
  console.log("Auth user updated successfully:", authUser.user.id);

  console.log("Updating password_changed_at and first_login_completed in public.profiles table...");
  const { error: dbErr } = await supabase
    .from('profiles')
    .update({
      first_login_completed: true,
      password_changed_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (dbErr) {
    console.error("Database profiles update failed:", dbErr);
    return;
  }
  console.log("Database profile record updated successfully.");

  console.log("Recording IAM audit log...");
  const { error: auditErr } = await supabase.from('audit_logs').insert({
    user_email: email,
    action: 'Password Update',
    performed_by: 'SuperAdmin (via script)'
  });

  if (auditErr) {
    console.error("Audit log insertion failed:", auditErr);
  } else {
    console.log("IAM password update audit log registered successfully.");
  }
  
  console.log(`Password reset for ${email} is completed successfully!`);
}

run();
