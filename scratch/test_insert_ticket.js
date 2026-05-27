const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['\"]|['\"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const ticketId = 'SST-TEST-' + Date.now();
  console.log('Testing insert with ticket ID:', ticketId);
  const { data, error } = await supabase.from('tickets').insert({
    id: ticketId,
    organization_id: 'c8ca90bb-ad9d-4469-8013-9f3276145a82', // Bitumat
    requested_by: '7d1be7f4-01b8-4b66-a842-d28a2b63c4f3', // existing manager profile ID
    sap_module: 'FICO',
    category: 'Functional Issue',
    priority: 'Medium',
    status: 'New',
    title: 'Test Ticket',
    description: 'Test description',
    sla_due_at: new Date().toISOString(),
    created_by_user: '7d1be7f4-01b8-4b66-a842-d28a2b63c4f3'
  });
  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Insert Succeeded:', data);
    // Delete it
    await supabase.from('tickets').delete().eq('id', ticketId);
  }
}

test();
