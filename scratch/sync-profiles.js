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
  console.log('Fetching all auth users...');
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Failed to list auth users:', authErr);
    return;
  }

  console.log('Fetching all database profiles...');
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  if (profErr) {
    console.error('Failed to fetch profiles:', profErr);
    return;
  }

  const profileIds = new Set(profiles.map(p => p.id));
  console.log(`Found ${users.length} auth users and ${profiles.length} database profiles.`);

  for (const user of users) {
    if (!profileIds.has(user.id)) {
      console.log(`Profile missing for auth user: ${user.email} (ID: ${user.id})`);
      
      const fullName = user.user_metadata.full_name || user.email.split('@')[0];
      const role = user.user_metadata.role || 'Customer';
      
      console.log(`Automatically restoring profile row for ${user.email} as role ${role}...`);
      
      let orgId = null;
      if (role === 'Customer') {
        // Resolve or create default organization
        const defaultOrgName = 'Apex Global Industries';
        const { data: existingOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', defaultOrgName)
          .maybeSingle();

        if (existingOrg) {
          orgId = existingOrg.id;
        } else {
          const { data: newOrg, error: orgErr } = await supabase
            .from('organizations')
            .insert({ name: defaultOrgName })
            .select('id')
            .single();
          if (orgErr) {
            console.error('Failed to create default organization:', orgErr);
            continue;
          }
          orgId = newOrg.id;
        }
      }

      const insertData = {
        id: user.id,
        email: user.email,
        full_name: fullName,
        role: role,
        is_active: true,
        organization_id: orgId,
        phone_number: 'N/A'
      };

      if (role === 'Consultant') {
        insertData.consultant_type = 'Functional';
        insertData.role_title = 'Functional Specialist';
        insertData.skills = 'SAP Specialist';
        insertData.sap_modules = ['FICO'];
      }

      const { error: insertErr } = await supabase.from('profiles').insert(insertData);
      if (insertErr) {
        console.error(`Failed to restore profile for ${user.email}:`, insertErr.message);
      } else {
        console.log(`Successfully restored profile for ${user.email}!`);
        
        // Create contract if Customer
        if (role === 'Customer' && orgId) {
          const { error: contractErr } = await supabase.from('customer_contracts').insert({
            organization_id: orgId,
            contract_type: 'AMS',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total_hours: 160.00,
            used_hours: 0.00,
            monthly_budget_hours: 15.00,
            is_active: true
          });
          if (contractErr) console.warn('Non-blocking contract error:', contractErr.message);
        }
      }
    }
  }
  console.log('Profiles sync and recovery complete!');
}

run();
