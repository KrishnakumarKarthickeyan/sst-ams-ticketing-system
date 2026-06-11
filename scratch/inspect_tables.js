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
  console.log("=== PROFILES ===");
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) console.error("Profiles error:", pErr);
  else console.log(profiles.map(p => ({ id: p.id, email: p.email, full_name: p.full_name, role: p.role, consultant_type: p.consultant_type })));

  console.log("=== TICKETS ===");
  const { data: tickets, error: tErr } = await supabase.from('tickets').select('*');
  if (tErr) console.error("Tickets error:", tErr);
  else console.log(tickets.map(t => ({ id: t.id, requested_by: t.requested_by, assigned_consultant_id: t.assigned_consultant_id, status: t.status })));

  console.log("=== EFFORTS ===");
  const { data: efforts, error: eErr } = await supabase.from('ticket_consultant_efforts').select('*');
  if (eErr) console.error("Efforts error:", eErr);
  else console.log(efforts);

  console.log("=== ESTIMATES ===");
  const { data: estimates, error: estErr } = await supabase.from('ticket_hour_estimates').select('*');
  if (estErr) console.error("Estimates error:", estErr);
  else console.log(estimates);
}

run();
