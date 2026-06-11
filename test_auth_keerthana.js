const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['\"]|['\"]$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function tryLogin() {
  const passwords = ['Consultant@12345', 'Manager@12345', 'Customer@12345', 'Keerthana@12345', 'password123'];
  for (const pw of passwords) {
    console.log(`Trying password: ${pw}...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'keerthana@sst.com',
      password: pw
    });
    if (!error) {
      console.log(`✅ Success! Password is: ${pw}`);
      console.log("Logged in user ID:", data.user.id);
      return;
    } else {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
}

tryLogin();
