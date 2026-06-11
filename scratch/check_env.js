console.log("Environment variables keys:");
console.log(Object.keys(process.env).filter(k => k.toLowerCase().includes('db') || k.toLowerCase().includes('supabase') || k.toLowerCase().includes('key') || k.toLowerCase().includes('pass')));
console.log("DB_PASSWORD:", process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD);
