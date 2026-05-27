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

async function cleanDb() {
  console.log('Cleaning database (live Supabase)...');
  
  // 1. Clear child ticket tables
  await supabase.from('satisfaction_ratings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_comment_attachments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_attachments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_mentions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_consultant_efforts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_closure_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_hour_estimates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_escalations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_delete_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_modules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_unlock_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('ticket_efforts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // 2. Clear tickets
  await supabase.from('tickets').delete().neq('id', 'NONE');
  console.log('Cleared tickets.');

  // 3. Clear customer contacts & contracts
  await supabase.from('customer_contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('customer_contracts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // 4. Fetch profiles to delete from auth
  const { data: profiles } = await supabase.from('profiles').select('id, email, role');
  if (profiles) {
    for (const p of profiles) {
      if (p.role !== 'Manager' && p.role !== 'SuperAdmin' && p.email !== 'manager@supportstudio.com') {
        console.log(`Deleting auth user: ${p.email} (${p.id})`);
        await supabase.from('profiles').delete().eq('id', p.id);
        const { error } = await supabase.auth.admin.deleteUser(p.id);
        if (error) {
          console.warn(`Auth delete warning for ${p.email}:`, error.message);
        }
      }
    }
  }

  // 5. Clear organizations
  await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared organizations.');
  
  console.log('Database cleanup completed!');
}

cleanDb();
