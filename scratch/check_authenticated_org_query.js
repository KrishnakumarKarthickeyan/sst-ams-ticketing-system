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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Logging in as keerthana@sst.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'keerthana@sst.com',
    password: 'Keerthana@12345'
  });

  if (authError) {
    console.error("Login failed:", authError);
    return;
  }

  console.log("Login Succeeded! User ID:", authData.user.id);

  console.log("Fetching tickets with joined organizations...");
  const { data: tickets, error: ticketError } = await supabase
    .from('tickets')
    .select('id, organization_id, organizations(name)')
    .limit(3);

  if (ticketError) {
    console.error("❌ Tickets fetch error:", ticketError);
  } else {
    console.log("✅ Tickets result:", JSON.stringify(tickets, null, 2));
  }
}

check();
