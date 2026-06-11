const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env.local in project root
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
  const { count: effortsCount, error: err1 } = await supabase
    .from('ticket_efforts')
    .select('*', { count: 'exact', head: true });

  const { count: actualHoursCount, error: err2 } = await supabase
    .from('ticket_actual_hours')
    .select('*', { count: 'exact', head: true });

  console.log('--- Database Audit ---');
  console.log('ticket_efforts row count:', effortsCount, err1 || '');
  console.log('ticket_actual_hours row count:', actualHoursCount, err2 || '');

  const { data: firstEfforts } = await supabase.from('ticket_efforts').select('*').limit(3);
  console.log('Sample ticket_efforts:', firstEfforts);
  
  const { data: firstActual } = await supabase.from('ticket_actual_hours').select('*').limit(3);
  console.log('Sample ticket_actual_hours:', firstActual);
}

inspect();
