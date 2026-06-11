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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log("Testing profiles join organizations select query...");
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, consultant_type, sap_modules, phone_number, organizations(name)')
    .limit(5);

  if (error) {
    console.error("❌ Profile query failed:", error);
  } else {
    console.log("✅ Profile query succeeded! Rows fetched:", data.length);
    console.log("Sample profile output:", JSON.stringify(data[0], null, 2));
  }
}

run();
