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
  console.log("Starting diagnostics...");
  
  const t0 = Date.now();
  console.log("1. Authenticating...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'manager@supportstudio.com',
    password: 'Manager@12345'
  });
  const t1 = Date.now();
  console.log(`Auth took: ${(t1 - t0) / 1000}s`);

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  console.log("2. Fetching profile...");
  const { data: profile, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();
  const t2 = Date.now();
  console.log(`Profile fetch took: ${(t2 - t1) / 1000}s`);

  if (profError) {
    console.error("Profile Fetch Error:", profError.message);
  }

  console.log("3. Fetching tickets...");
  const { data: tickets, error: ticketError } = await supabase
    .from('tickets')
    .select('*, organizations(name)');
  const t3 = Date.now();
  console.log(`Tickets fetch took: ${(t3 - t2) / 1000}s`);

  if (ticketError) {
    console.error("Tickets Fetch Error:", ticketError.message);
  }

  console.log(`Total diagnostic time: ${(t3 - t0) / 1000}s`);
}

run();
