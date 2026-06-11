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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Measuring query times against remote Supabase database...");

  // Sign in first
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'manager@supportstudio.com',
    password: 'Manager@12345'
  });

  const queries = [
    {
      name: "profiles",
      run: () => supabase.from('profiles').select('*')
    },
    {
      name: "tickets (with 18 joins)",
      run: () => supabase.from('tickets').select('*, organizations(name), ticket_comments(*), ticket_efforts(*), satisfaction_ratings(*), ticket_modules(*), ticket_delete_requests(*), ticket_hour_estimates(*), ticket_closure_requests(*), ticket_assignments(*), ticket_estimates(*), ticket_actual_hours(*), ticket_unlock_requests(*), ticket_comment_attachments(*), ticket_attachments(*), ticket_history(*), requested_by_profile:requested_by(id, full_name, email, phone_number), created_by_profile:created_by_user(id, full_name, email, phone_number)')
    },
    {
      name: "customer_contracts",
      run: () => supabase.from('customer_contracts').select('*, organizations(name)')
    },
    {
      name: "customer_contacts",
      run: () => supabase.from('customer_contacts').select('*')
    },
    {
      name: "knowledgebase_articles",
      run: () => supabase.from('knowledgebase_articles').select('*')
    },
    {
      name: "knowledgebase_categories",
      run: () => supabase.from('knowledgebase_categories').select('*')
    },
    {
      name: "notifications",
      run: () => supabase.from('notifications').select('*').order('created_at', { ascending: false })
    }
  ];

  for (const q of queries) {
    const t0 = Date.now();
    const { error } = await q.run();
    const t1 = Date.now();
    console.log(`Query "${q.name}" took: ${(t1 - t0) / 1000}s`);
    if (error) {
      console.error(`  Error in ${q.name}:`, error.message);
    }
  }
}

run();
