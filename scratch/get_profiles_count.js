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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, full_name, email, role');
  if (error) {
    console.error(error);
    return;
  }
  console.log("PROFILES IN DB:");
  profiles.forEach(p => {
    console.log(`- ID: ${p.id}, Name: ${p.full_name}, Email: ${p.email}, Role: ${p.role}`);
  });
  console.log(`Total Customers: ${profiles.filter(p => p.role === 'Customer').length}`);
  console.log(`Total Consultants: ${profiles.filter(p => p.role === 'Consultant').length}`);
}

run();
