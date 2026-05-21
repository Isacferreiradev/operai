import pkg from 'pg';
const { Client } = pkg;

const nodes = [0, 1, 2, 3];

async function checkHost(node) {
  const host = `aws-${node}-us-east-2.pooler.supabase.com`;
  const client = new Client({
    connectionString: `postgresql://postgres.rvjdokjhrtkrvaveriyx:fiveM1212!!.@${host}:6543/postgres`,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000
  });
  
  try {
    await client.connect();
    console.log(`Host ${host} succeeded!`);
    await client.end();
  } catch (e) {
    console.log(`Host ${host} failed: ${e.message} (code: ${e.code})`);
  }
}

async function main() {
  console.log('Testing us-east-2 pooler hosts...');
  for (const node of nodes) {
    await checkHost(node);
  }
}

main().catch(console.error);
