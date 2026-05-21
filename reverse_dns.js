import dns from 'dns';

async function main() {
  try {
    const hostnames = await dns.promises.reverse('2600:1f16:1ce4:1c02:1e8d:4189:78ad:af59');
    console.log('Reverse DNS:', hostnames);
  } catch (e) {
    console.error('Reverse DNS failed:', e.message);
  }
}

main().catch(console.error);
