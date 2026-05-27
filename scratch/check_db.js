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
  // Let's query one record of ticket_consultant_efforts to see its columns
  const { data, error } = await supabase.from('ticket_consultant_efforts').select('*').limit(1);
  if (error) {
    console.error("Error fetching ticket_consultant_efforts:", error);
  } else {
    console.log("Success! Columns on ticket_consultant_efforts:", data.length > 0 ? Object.keys(data[0]) : "No data, but table exists.");
    
    // Attempt to insert a dummy/test to see if we can do raw sql or if we need to run it via supabase.rpc
    // Let's query pg_attribute to get columns
    const { data: cols, error: colsErr } = await supabase.rpc('get_table_columns', { table_name: 'ticket_consultant_efforts' });
    if (colsErr) {
      console.log("RPC get_table_columns not found, checking schema another way or trying to fetch column names...");
      // Let's try to query information_schema or perform an insert/update with the new columns to see if they fail or succeed
      const testObj = {
        closure_status: 'Pending',
        work_summary: 'Test',
        resolution_notes: 'Test'
      };
      // Let's run a dry run update/select or check with a select of those fields
      const { data: testData, error: testError } = await supabase
        .from('ticket_consultant_efforts')
        .select('closure_status, work_summary, resolution_notes')
        .limit(1);
      if (testError) {
        console.error("New columns DO NOT exist or error selecting them:", testError);
      } else {
        console.log("New columns EXIST! Data:", testData);
      }
    } else {
      console.log("Columns from RPC:", cols);
    }
  }
}

run();
