const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Logging in as customer alsuhaimi@sst.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'alsuhaimi@sst.com',
    password: 'Alsuhaimi@12345'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }
  console.log("Logged in! User ID:", authData.user.id);

  // Fetch profiles first
  const { data: profiles, error: profError } = await supabase.from('profiles').select('*');
  console.log("Profiles count visible:", profiles ? profiles.length : 0);

  // Fetch tickets for this customer
  const { data: tickets, error: ticketError } = await supabase
    .from('tickets')
    .select('id, ticket_number, title, organization_id');

  if (ticketError || !tickets || tickets.length === 0) {
    console.error("Could not fetch customer tickets:", ticketError);
    return;
  }

  const ticket = tickets[0];
  console.log(`Using customer ticket: ID=${ticket.id}, Number=${ticket.ticket_number}, Title=${ticket.title}, OrgID=${ticket.organization_id}`);

  // Test SELECT comments
  console.log("Fetching comments for ticket...");
  const { data: comments, error: commError } = await supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', ticket.id);

  if (commError) {
    console.error("Fetch comments failed:", commError);
  } else {
    console.log(`Fetched ${comments.length} comments:`, comments);
  }

  // Test INSERT comment
  console.log("Inserting a test comment...");
  const { data: newComm, error: insertError } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticket.id,
      author_id: authData.user.id,
      content: `Test comment from Customer at ${new Date().toISOString()}`,
      is_internal: false
    })
    .select('*')
    .single();

  if (insertError) {
    console.error("Insert comment failed:", insertError);
  } else {
    console.log("Insert comment succeeded:", newComm);
  }
}

run();
