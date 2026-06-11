const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
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
  console.log("Querying notifications table columns...");
  
  // Use RPC or direct select from information_schema if possible, or just insert a mock row and rollback/delete.
  // Actually, we can run SQL via Supabase REST API or just inspect fields by reading schema of an error if we select a non-existent column,
  // or we can select columns via postgres information_schema.
  // Let's run a query to inspect schema via supabase postgrest RPC or a query on pg_catalog/information_schema.
  // Note: the REST API doesn't allow direct SELECT from information_schema.columns unless exposed by an RPC or view.
  // But wait! We can fetch the OpenAPI spec of Postgrest which contains all table and column details!
  // Yes, fetch `${supabaseUrl}/rest/v1/?apikey=${serviceRoleKey}` or inspect it.
  // Or we can just insert a row and see if it fails or succeeds, or read what columns are returned.
  // Let's see if we can query an RPC or view, or try to insert a test record.
  
  const testNotif = {
    user_id: '7d1be7f4-01b8-4b66-a842-d28a2b63c4f3', // Manager user id
    title: 'Test Title',
    message: 'Test Message',
    is_read: false
  };
  
  const { data, error } = await supabase.from('notifications').insert(testNotif).select();
  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Insert success! Created record:", data);
    // Cleanup
    await supabase.from('notifications').delete().eq('id', data[0].id);
  }
}

inspect();
