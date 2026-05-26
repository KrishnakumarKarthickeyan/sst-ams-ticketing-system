const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing URL or service role key in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log('Querying database policies...');
  // We can query pg_policies using supabase.rpc or a raw query, but since we don't have a raw query RPC,
  // let's try to query pg_catalog tables via REST API or run SQL if we have a way.
  // Wait, does Supabase REST API expose pg_policies? Normally not unless exposed.
  // Let's try listing profiles, customer_contracts, etc., using the anon key vs service role key to see what we can access.
  console.log('Fetching profiles using service role key...');
  const { data: profsSR, error: errSR } = await supabase.from('profiles').select('*');
  console.log('Service role profile count:', profsSR ? profsSR.length : 'error', errSR?.message);

  const anonClient = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  console.log('Logging in as manager@supportstudio.com...');
  const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
    email: 'manager@supportstudio.com',
    password: 'Manager@12345'
  });

  if (loginErr) {
    console.error('Anon client login failed:', loginErr.message);
    return;
  }

  console.log('Profiles currently in DB (count:', profsSR.length, '):');
    profsSR.forEach(p => {
      console.log(`- ID: ${p.id}, Email: ${p.email}, Name: ${p.full_name}, Role: ${p.role}`);
    });

  const { data: contractsSR } = await supabase.from('customer_contracts').select('*');
  console.log('Service role customer_contracts count:', contractsSR ? contractsSR.length : 'error');

  const { data: orgsSR } = await supabase.from('organizations').select('*');
  console.log('Service role organizations count:', orgsSR ? orgsSR.length : 'error');

  console.log('Logging in as sneha@supportstudio.com...');
  const { data: snehaLoginData, error: snehaLoginErr } = await anonClient.auth.signInWithPassword({
    email: 'sneha@supportstudio.com',
    password: 'Password@12345' // standard default password
  });

  if (snehaLoginErr) {
    console.error('Sneha login failed:', snehaLoginErr.message);
  } else {
    console.log('Sneha login successful! User ID:', snehaLoginData.user.id);
    const { data: snehaProfile, error: snehaProfileErr } = await anonClient
      .from('profiles')
      .select('full_name, role, is_active, consultant_type, sap_modules, phone_number, organizations(name)')
      .eq('id', snehaLoginData.user.id)
      .single();
    if (snehaProfileErr) {
      console.error('Sneha profile fetch failed:', snehaProfileErr.message);
    } else {
      console.log('Sneha profile fetched successfully:', snehaProfile);
    }
  }

  console.log('Fetching profiles using authenticated manager anon client...');
  const { data: profsAnon, error: errAnon } = await anonClient.from('profiles').select('*');
  console.log('Authenticated manager profile count:', profsAnon ? profsAnon.length : 'error', errAnon?.message);

  console.log('Fetching customer_contracts using authenticated manager anon client...');
  const { data: contractsAnon, error: contractErr } = await anonClient.from('customer_contracts').select('*');
  console.log('Authenticated manager customer_contracts count:', contractsAnon ? contractsAnon.length : 'error', contractErr?.message);
  
  console.log('Fetching organizations using authenticated manager anon client...');
  const { data: orgsAnon, error: orgErr } = await anonClient.from('organizations').select('*');
  console.log('Authenticated manager organizations count:', orgsAnon ? orgsAnon.length : 'error', orgErr?.message);
}

run();
