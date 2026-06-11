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

async function check() {
  console.log("Checking Supabase Storage buckets...");
  const { data: buckets, error: storageErr } = await supabase.storage.listBuckets();
  if (storageErr) {
    console.error("Storage Buckets Error:", storageErr);
  } else {
    console.log("Active Buckets:", buckets.map(b => ({ id: b.id, name: b.name, public: b.public })));
  }

  console.log("\nChecking columns of public.tickets table...");
  const { data: cols, error: dbErr } = await supabase.rpc('inspect_schema_columns', { t_name: 'tickets' });
  if (dbErr) {
    // If RPC fails, try to select one row
    const { data: tickets, error: ticketErr } = await supabase.from('tickets').select('*').limit(1);
    if (ticketErr) {
      console.error("Tickets query failed:", ticketErr);
    } else if (tickets && tickets.length > 0) {
      console.log("Sample ticket properties:", Object.keys(tickets[0]));
    } else {
      console.log("No tickets found in table.");
    }
  } else {
    console.log("Tickets columns from RPC:", cols.map(c => c.column_name));
  }
}

check();
