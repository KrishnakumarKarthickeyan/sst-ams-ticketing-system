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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql_query', {
    query_text: `SELECT table_name FROM information_schema.views WHERE table_schema = 'public';`
  }).catch(() => ({ data: null, error: { message: 'execute_sql_query RPC not found' } }));
  
  if (error) {
    console.log("Error querying views or execute_sql_query function is not present:", error.message);
  } else {
    console.log("Views in public schema:", data);
  }
}

check();
