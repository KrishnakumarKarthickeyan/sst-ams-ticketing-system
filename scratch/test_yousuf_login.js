const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || '').trim().replace(/^['\"]|['\"]$/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const pws = ['Customer@12345', 'Yousuf@12345', 'Manager@12345', 'password123', 'yousuf123', 'yousuf@12345'];
  for (const password of pws) {
    console.log(`Trying password "${password}" for yousuf@bit.com...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'yousuf@bit.com',
      password
    });
    if (!error) {
      console.log(`✅ SUCCESS! The password is: ${password}`);
      return;
    } else {
      console.log(`❌ Failed: ${error.message}`);
    }
  }
  console.log("None of the common passwords worked.");
}

run();
