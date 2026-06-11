const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse env file
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
  console.log("Trying to insert with closure_status, work_summary, resolution_notes, but without consultant_name...");
  try {
    const { data: insData, error: insErr } = await supabase.from('ticket_consultant_efforts').insert({
      ticket_id: 'SST-SD-1002',
      consultant_id: 'fe03e764-f139-4739-a0f7-44a966c1840a',
      consultant_type: 'Functional',
      estimated_hours: 10,
      actual_hours: 0,
      closure_status: 'Pending',
      work_summary: 'Test work summary',
      resolution_notes: 'Test resolution notes'
    }).select('*');
    console.log("Insert result:", { insData, insErr });
  } catch (err) {
    console.error("Try/catch insert error:", err);
  }
}

run();
