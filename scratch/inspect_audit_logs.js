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
  console.log("Checking columns of public.profiles...");
  const { data: profileCols, error: pErr } = await supabase.from('profiles').select('full_name, is_locked, is_active, first_login_completed').limit(1);
  if (pErr) {
    console.error("Profiles error:", pErr);
  } else {
    console.log("Profiles columns sample data:", profileCols);
  }

  console.log("Checking public.audit_logs...");
  const { data: auditCols, error: aErr } = await supabase.from('audit_logs').select('*').limit(1);
  if (aErr) {
    console.error("Audit logs error:", aErr);
  } else {
    console.log("Audit logs sample data:", auditCols);
  }
}

inspect();
