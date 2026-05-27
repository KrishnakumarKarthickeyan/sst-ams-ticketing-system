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

const supabase = createClient(url, key);

async function run() {
  console.log('Querying tickets table directly via service role...');
  const { data, error } = await supabase.from('tickets').select('*');
  if (error) {
    console.error('Error querying tickets:', error);
  } else {
    console.log(`Tickets currently in DB (count: ${data.length}):`);
    data.forEach(t => {
      console.log(`- ID: ${t.id}, Title: ${t.title}, Org ID: ${t.organization_id}, Created At: ${t.created_at}, Status: ${t.status}`);
    });
  }
}

run();
