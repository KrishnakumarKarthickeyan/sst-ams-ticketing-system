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

async function tryLogin() {
  const passwords = ['Password@12345', 'Alsuhaimi@12345', 'Customer@12345', 'password123'];
  for (const pw of passwords) {
    console.log(`Trying password: ${pw}...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'alsuhaimi@sst.com',
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
