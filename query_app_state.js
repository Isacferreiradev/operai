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
  
  const res = await client.query('SELECT * FROM user_app_state');
  console.log('Total rows:', res.rows.length);
  for (const row of res.rows) {
    console.log('User ID:', row.user_id);
    console.log('Updated At:', row.updated_at);
    console.log('App State keys:', Object.keys(row.app_state || {}));
    console.log('Offers count:', (row.app_state?.offers || []).length);
    console.log('Daily Data count:', (row.app_state?.dailyData || []).length);
    console.log('Tasks count:', (row.app_state?.tasks || []).length);
    console.log('Ideas count:', (row.app_state?.ideas || []).length);
    console.log('Diary count:', (row.app_state?.diary || []).length);
    console.log('Theme:', row.app_state?.theme);
  }

  await client.end();
}

check().catch(console.error);
