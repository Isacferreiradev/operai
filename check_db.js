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
  console.log('Connected to Postgres on us-east-2 (aws-1)');
  
  // Check constraints
  const constraints = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(c.oid) 
    FROM pg_constraint c 
    JOIN pg_class r ON c.conrelid = r.oid 
    WHERE r.relname = 'user_app_state';
  `);
  console.log('Constraints on user_app_state:', constraints.rows);

  await client.end();
}

check().catch(console.error);
