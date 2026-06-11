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

async function checkSchema() {
  console.log("Checking columns of tickets table...");
  const { data: ticketsData, error: ticketsError } = await supabase
    .from('tickets')
    .select('*')
    .limit(1);

  if (ticketsError) {
    console.error("Error querying tickets:", ticketsError);
  } else {
    console.log("Tickets columns returned:", Object.keys(ticketsData[0] || {}));
  }

  console.log("Checking columns of notifications table...");
  const { data: notifData, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .limit(1);

  if (notifError) {
    console.error("Error querying notifications:", notifError);
  } else {
    console.log("Notifications columns returned:", Object.keys(notifData[0] || {}));
  }
}

checkSchema();
