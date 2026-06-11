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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Logging in as keerthana@sst.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'keerthana@sst.com',
    password: 'Keerthana@12345'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }
  console.log("Login Succeeded! User ID:", authData.user.id);

  const runQuery = async (name, promise) => {
    console.log(`Running ${name}...`);
    const start = Date.now();
    try {
      const { data, error } = await promise;
      const duration = Date.now() - start;
      if (error) {
        console.log(`❌ ${name} returned error in ${duration}ms:`, error.message);
      } else {
        console.log(`✅ ${name} succeeded in ${duration}ms. Rows: ${data ? data.length : 0}`);
      }
    } catch (e) {
      console.log(`💥 ${name} threw exception in ${Date.now() - start}ms:`, e.message);
    }
  };

  await runQuery("1. Profiles Query", supabase.from('profiles').select('*'));
  
  const ticketQuery = '*, organizations(name), ticket_comments(*), ticket_efforts(*), satisfaction_ratings(*), ticket_modules(*), ticket_delete_requests(*), ticket_hour_estimates(*), ticket_closure_requests(*), ticket_assignments(*), ticket_estimates(*), ticket_actual_hours(*), ticket_unlock_requests(*), ticket_comment_attachments(*), ticket_attachments(*), ticket_history(*)';
  await runQuery("2. Tickets Query", supabase.from('tickets').select(ticketQuery));
  
  await runQuery("3. Contracts Query", supabase.from('customer_contracts').select('*, organizations(name)'));
  await runQuery("4. Contacts Query", supabase.from('customer_contacts').select('*'));
  await runQuery("5. KB Articles Query", supabase.from('knowledgebase_articles').select('*'));
  await runQuery("6. KB Categories Query", supabase.from('knowledgebase_categories').select('*'));
  await runQuery("7. Notifications Query", supabase.from('notifications').select('*').order('created_at', { ascending: false }));

  console.log("All queries executed.");
}

run();
