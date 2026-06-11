const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
const supabase = createClient(url, key);

async function run() {
  console.log('Checking customer_contracts...');
  const { data: contracts, error: err1 } = await supabase
    .from('customer_contracts')
    .select('customer_id, contract_start_date, contract_end_date, total_contract_hours, monthly_allocated_hours, status')
    .limit(1);

  if (err1) {
    console.log('customer_contracts new columns error:', err1.message);
  } else {
    console.log('customer_contracts has new columns! Sample row:', contracts);
  }

  console.log('\nChecking ticket_actual_hours...');
  const { data: actuals, error: err2 } = await supabase
    .from('ticket_actual_hours')
    .select('billable, approval_status, approved_by, approved_at')
    .limit(1);

  if (err2) {
    console.log('ticket_actual_hours new columns error:', err2.message);
  } else {
    console.log('ticket_actual_hours has new columns! Sample row:', actuals);
  }
}

run();
