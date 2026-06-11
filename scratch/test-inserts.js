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
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing URL or anon key in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log('Logging in as manager@supportstudio.com...');
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'manager@supportstudio.com',
    password: 'Manager@12345'
  });

  if (loginErr) {
    console.error('Login failed:', loginErr.message);
    return;
  }

  const userId = loginData.user.id;
  console.log('Logged in successfully. User ID:', userId);

  // 1. Try to insert an organization
  console.log('\n--- 1. Testing Organization Insert ---');
  const orgName = 'Test Org ' + Date.now();
  const { data: orgData, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: orgName })
    .select('id')
    .single();

  if (orgErr) {
    console.error('Organization Insert Failed:', orgErr.message);
  } else {
    console.log('Organization Insert Succeeded! Org ID:', orgData.id);
  }

  // 2. Try to insert a profile
  console.log('\n--- 2. Testing Profile Insert ---');
  const dummyProfileId = '00000000-0000-0000-0000-000000000001'; // Mock UUID
  const { data: profData, error: profErr } = await supabase
    .from('profiles')
    .insert({
      id: dummyProfileId,
      email: 'dummy@test.com',
      full_name: 'Dummy Test',
      role: 'Customer',
      is_active: true
    });

  if (profErr) {
    console.error('Profile Insert Failed:', profErr.message);
  } else {
    console.log('Profile Insert Succeeded!');
  }

  // 3. Try to insert a customer contract
  console.log('\n--- 3. Testing Customer Contract Insert ---');
  const testOrgId = orgData ? orgData.id : '00000000-0000-0000-0000-000000000000';
  const { data: contractData, error: contractErr } = await supabase
    .from('customer_contracts')
    .insert({
      organization_id: testOrgId,
      contract_type: 'AMS',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_hours: 160.00,
      used_hours: 0.00,
      monthly_budget_hours: 15.00,
      is_active: true
    });

  if (contractErr) {
    console.error('Customer Contract Insert Failed:', contractErr.message);
  } else {
    console.log('Customer Contract Insert Succeeded!');
  }

  // 4. Test Server-side Provisioning action (should bypass RLS completely)
  console.log('\n--- 4. Testing Server-side provisionUser Action ---');
  try {
    const { provisionUser } = require('../src/app/actions/auth');
    
    // Set environment variables for Server Action execution scope
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

    const email = `prov-test-${Date.now()}@supportstudio.com`;
    console.log(`Calling provisionUser for Customer with email ${email}...`);
    const provRes = await provisionUser({
      email,
      fullName: 'Provisioned Test Customer',
      role: 'Customer',
      companyName: 'Apex Global Industries',
      contractType: 'AMS',
      contractHours: 160.00
    });

    if (provRes.success) {
      console.log('Server Action Provisioning Succeeded! User ID:', provRes.userId);
      // Clean up the created auth user
      const adminClient = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      console.log('Cleaning up provisioned user...');
      await adminClient.auth.admin.deleteUser(provRes.userId);
      console.log('Cleaned up successfully.');
    } else {
      console.error('Server Action Provisioning Failed:', provRes.error);
    }
  } catch (err) {
    console.error('Server Action execution error:', err.message);
  }
}

run();
