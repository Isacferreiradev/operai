import dns from 'dns';

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

async function main() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    try {
      const ips = await dns.promises.resolve4(host);
      console.log(`FOUND! ${host} -> ${ips.join(', ')}`);
    } catch (e) {
      // Not this region
    }
  }
}

main().catch(console.error);
