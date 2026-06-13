import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual parser for .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
  if (match) {
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env configuration!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDiagnostics() {
  const ticketIds = [
    'e2ecedb9-2dce-4a8e-83c3-ea5333340e24',
    'ba360f13-42b7-4342-894c-91a8fab13195',
    '92ac6783-b528-442e-9b0b-cd334d4269d5'
  ];

  const { data: tickets, error: tErr } = await supabase
    .from('tickets')
    .select('id, title, functional_or_technical')
    .in('id', ticketIds);

  if (tErr) {
    console.error('Error fetching tickets:', tErr);
  } else {
    console.log('TICKETS WITH FUNCTIONAL_OR_TECHNICAL:');
    console.log(JSON.stringify(tickets, null, 2));
  }
}

runDiagnostics();
