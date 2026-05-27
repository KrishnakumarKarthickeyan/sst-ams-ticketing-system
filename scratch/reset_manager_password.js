const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['\"]|['\"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function resetPassword() {
  const managerId = '7d1be7f4-01b8-4b66-a842-d28a2b63c4f3';
  console.log('Resetting manager password in Supabase Auth...');
  
  const { data, error } = await supabase.auth.admin.updateUserById(managerId, {
    password: 'Manager@12345'
  });
  
  if (error) {
    console.error('Failed to reset password:', error);
  } else {
    console.log('Password reset successfully for manager@supportstudio.com!');
  }
}

resetPassword();
