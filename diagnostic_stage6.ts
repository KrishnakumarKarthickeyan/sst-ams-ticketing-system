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
  console.log('--- QUERY (1): Consultants profiles ---');
  const { data: consultants, error: err1 } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, consultant_type')
    .eq('role', 'Consultant');
  
  if (err1) console.error('Error 1:', err1);
  else console.log(JSON.stringify(consultants, null, 2));

  console.log('\n--- QUERY (2): ticket_actual_hours ---');
  // First, check the column names of ticket_actual_hours table by fetching 1 row
  const { data: testRow, error: testErr } = await supabase
    .from('ticket_actual_hours')
    .select('*')
    .limit(1);
  
  if (testErr) {
    console.error('Error fetching test row:', testErr);
  } else {
    console.log('Sample row from ticket_actual_hours:', testRow);
    const columns = testRow && testRow.length > 0 ? Object.keys(testRow[0]) : [];
    console.log('Columns in ticket_actual_hours:', columns);
    
    // Check if created_at or logged_at exists, select appropriately
    const selectCols = ['id', 'ticket_id', 'consultant_id', 'actual_hours', 'approval_status'];
    if (columns.includes('logged_at')) selectCols.push('logged_at');
    else if (columns.includes('created_at')) selectCols.push('created_at');
    
    const { data: hours, error: err2 } = await supabase
      .from('ticket_actual_hours')
      .select(selectCols.join(','))
      .order(columns.includes('logged_at') ? 'logged_at' : (columns.includes('created_at') ? 'created_at' : 'id'), { ascending: false });

    if (err2) console.error('Error 2:', err2);
    else console.log(JSON.stringify(hours, null, 2));
  }

  console.log('\n--- QUERY (3): Hours sum per consultant ---');
  // Since we cannot run raw group-by queries easily via simple Supabase client builder without RPC,
  // we can query all profiles where role = 'Consultant' and all ticket_actual_hours, then group and sum them in JS.
  const { data: allConsultants, error: err3a } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'Consultant');

  const { data: allHours, error: err3b } = await supabase
    .from('ticket_actual_hours')
    .select('id, consultant_id, actual_hours, approval_status');

  if (err3a || err3b) {
    console.error('Error in 3:', err3a || err3b);
  } else {
    const summary = allConsultants?.map(c => {
      const logs = allHours?.filter(h => h.consultant_id === c.id) || [];
      const totalHours = logs.reduce((sum, h) => sum + (Number(h.actual_hours) || 0), 0);
      const approvedHours = logs
        .filter(h => h.approval_status === 'approved')
        .reduce((sum, h) => sum + (Number(h.actual_hours) || 0), 0);
      return {
        full_name: c.full_name,
        profile_id: c.id,
        log_count: logs.length,
        total_hours: totalHours,
        approved_hours: approvedHours
      };
    });
    console.log(JSON.stringify(summary, null, 2));
  }
}

runDiagnostics();
