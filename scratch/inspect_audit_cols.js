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

async function run() {
  console.log("Fetching schema info for public.audit_logs...");
  const { data, error } = await supabase.rpc('execute_sql_query', { 
    sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs'"
  });
  
  if (error) {
    console.error("RPC Error:", error);
    // fallback to select * limit 0
    const { data: cols, error: err } = await supabase.from('audit_logs').select('*').limit(0);
    if (err) console.error("Select Error:", err);
    else console.log("Keys in audit_logs object:", Object.keys(cols?.[0] || {}));
  } else {
    console.log("Columns of audit_logs:", data);
  }
}

run();
