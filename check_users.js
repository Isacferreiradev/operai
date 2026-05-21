import pkg from 'pg';
const { Client } = pkg;

async function check() {
  const client = new Client({
    connectionString: 'postgresql://postgres.rvjdokjhrtkrvaveriyx:fiveM1212!!.@aws-1-us-east-2.pooler.supabase.com:6543/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  await client.connect();
  
  // Query users
  const res = await client.query('SELECT id, email, created_at FROM auth.users');
  console.log('Registered users:', res.rows);

  await client.end();
}

check().catch(console.error);
