const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:fiveM1212!!.@db.rvjdokjhrtkrvaveriyx.supabase.co:5432/postgres'
  });
  
  await client.connect();
  console.log('Connected to Postgres');
  
  const schema = `
    CREATE TABLE IF NOT EXISTS user_state (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id),
      state JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ALTER TABLE user_state DISABLE ROW LEVEL SECURITY;
  `;
  
  await client.query(schema);
  console.log('Table user_state created successfully');
  
  await client.end();
}

main().catch(console.error);
