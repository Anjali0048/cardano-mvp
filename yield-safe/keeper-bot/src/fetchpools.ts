import fetch from 'node-fetch';

const CHARLI3_API_KEY = process.env.CHARLI3_API_KEY || 'cta_3P8mEHvJccsoVw4r0Qw8K2iwxxyLczG1m146WJdlFFoop79E7qEDoUAjQyAsMMoV';
const BASE_URL = 'https://api.charli3.io/api/v1';

const policies = [
  '8e51398904a5d3fc129fbf4f1589701de23c7824d5c90fdb9490e15a434841524c4933',
  '8db269c3ec630e06ae29f74bc39edd1f87c819f1056206e879a1cd61446a65644d6963726f555344',
  'e52964af4fffdb54504859875b1827b60ba679074996156461143dc14f5054494d',
  '279c909f348e533da5808898f87f9a14bb2c3dfbbacccd631d927a3f534e454b',
  'f43a62fdc3965df486de8a0d32fe800963589c41b38946602a0dc53541474958',
  '95a427e384527065f2f8946f5e86320d0117839a5e98ea2c0b55fb0048554e54',
  '5d16cc1a177b5d9ba9cfa9793b07e60f1fb70fea1f8aef064415d114494147',
  'f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b6988069425443',
  'edfd7a1d77bcb8b884c474bdc92a16002d1fb720e454fa6e993444794e5458'
];

async function fetchTokenFullData(policy: string): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL}/tokens/current?policy=${policy}`, {
      headers: {
        Authorization: `Bearer ${CHARLI3_API_KEY}`,
      },
    });
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data for policy ${policy}:`, error);
    return null;
  }
}

async function main() {
  for (const policy of policies) {
    const data = await fetchTokenFullData(policy);
    console.log(`Policy: ${policy}`);
    console.dir(data, { depth: null, colors: true });
    console.log('------------------------');
  }
}

main().catch(console.error);
