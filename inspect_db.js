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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function inspect() {
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('*, organizations(name), profiles:requested_by(full_name, email, phone_number)');

  if (error) {
    console.error("Error fetching tickets:", error);
    return;
  }
  console.log("Found tickets:", JSON.stringify(tickets, null, 2));

  const { data: orgs } = await supabase.from('organizations').select('*');
  console.log("Organizations in DB:", orgs);

  const { data: profs } = await supabase.from('profiles').select('id, full_name, role');
  console.log("Profiles in DB:", profs);
}

inspect();
