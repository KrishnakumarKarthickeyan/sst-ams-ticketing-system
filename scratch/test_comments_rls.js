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
  console.log("Logging in as keerthana@sst.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'keerthana@sst.com',
    password: 'Keerthana@12345'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }
  console.log("Logged in! User ID:", authData.user.id);

  // Let's find one ticket
  const { data: tickets, error: ticketError } = await supabase
    .from('tickets')
    .select('id, ticket_number, title')
    .limit(1);

  if (ticketError || !tickets || tickets.length === 0) {
    console.error("Could not fetch a ticket:", ticketError);
    return;
  }

  const ticket = tickets[0];
  console.log(`Using ticket: ID=${ticket.id}, Number=${ticket.ticket_number}, Title=${ticket.title}`);

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
      content: `Test comment from script at ${new Date().toISOString()}`,
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
