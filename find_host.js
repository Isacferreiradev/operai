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

const nodes = [0, 1, 2, 3];

async function checkHost(node, region) {
  const host = `aws-${node}-${region}.pooler.supabase.com`;
  const client = new Client({
    connectionString: `postgresql://postgres.rvjdokjhrtkrvaveriyx:fiveM1212!!.@${host}:6543/postgres`,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 2000
  });
  
  try {
    await client.connect();
    console.log(`Host ${host} succeeded!`);
    await client.end();
    return true;
  } catch (e) {
    if (e.message && (e.message.includes('not found') || e.message.includes('ENOTFOUND') || e.message.includes('ETIMEDOUT') || e.message.includes('ENETUNREACH'))) {
      // Wrong host or region
    } else {
      console.log(`Host ${host} found but failed with error: ${e.message}`);
      return true;
    }
  }
  return false;
}

async function main() {
  console.log('Scanning hosts...');
  for (const node of nodes) {
    for (const region of regions) {
      const found = await checkHost(node, region);
      if (found) {
        console.log(`Found correct host: aws-${node}-${region}.pooler.supabase.com`);
        return;
      }
    }
  }
  console.log('Scan complete.');
}

main().catch(console.error);
