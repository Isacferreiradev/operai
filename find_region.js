import pkg from 'pg';
const { Client } = pkg;

const regions = [
  'sa-east-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'ca-central-1'
];

async function checkRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new Client({
    connectionString: `postgresql://postgres.rvjdokjhrtkrvaveriyx:fiveM1212!!.@${host}:6543/postgres`,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 3000
  });
  
  try {
    await client.connect();
    console.log(`Region ${region} succeeded!`);
    await client.end();
    return true;
  } catch (e) {
    console.log(`Region ${region} failed: ${e.message} (code: ${e.code})`);
  }
  return false;
}

async function main() {
  console.log('Scanning regions with full output...');
  for (const region of regions) {
    await checkRegion(region);
  }
  console.log('Scan complete.');
}

main().catch(console.error);
