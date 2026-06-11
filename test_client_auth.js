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
  console.log("Logging in as manager@supportstudio.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'manager@supportstudio.com',
    password: 'Password@12345'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  console.log("Login Succeeded! User ID:", authData.user.id);
  
  // Verify token
  console.log("Fetching profile for logged in user...");
  const { data: profile, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profError) {
    console.error("Profile Fetch Error:", profError);
  } else {
    console.log("Logged-in Profile:", profile);
  }

  console.log("Fetching tickets with anon client (subject to RLS)...");
  const { data: tickets, error: ticketError } = await supabase
    .from('tickets')
    .select('*, organizations(name)');

  if (ticketError) {
    console.error("Tickets Fetch Error:", ticketError);
  } else {
    console.log("Found tickets count (with RLS):", tickets ? tickets.length : 0);
    if (tickets && tickets.length > 0) {
      console.log("Tickets list:", tickets.map(t => ({ id: t.id, title: t.title })));
    }
  }
}

run();
