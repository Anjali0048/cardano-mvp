import fetch from 'node-fetch';

const CHARLI3_API_KEY = process.env.CHARLI3_API_KEY || "cta_3P8mEHvJccsoVw4r0Qw8K2iwxxyLczG1m146WJdlFFoop79E7qEDoUAjQyAsMMoV";
const BASE_URL = "https://api.charli3.io/api/v1";

interface Token {
  symbol: string;
  name: string;
  policy: string;
}

const tokens: Token[] = [
  { 
    symbol: "2ee1bb205e388fd99b2a693325899510b496021436d4db58819514cc9745f9ab7f03a108c9d8b95d313af3735c6b4e571fd68f5fa220395fcc356048dac8f7a2", 
    name: "C3",
    policy: "8e51398904a5d3fc129fbf4f1589701de23c7824d5c90fdb9490e15a434841524c4933"
  },
  { 
    symbol: "fa8dee6cf0627a82a2610019596758fc36c1ebc4b7e389fdabc44857fdf5c9b0e29ac56f1a584bccd487c445ad45383c6347d03d39869f759daad68284781723", 
    name: "SNEK",
    policy: "279c909f348e533da5808898f87f9a14bb2c3dfbbacccd631d927a3f534e454b"
  },
  { 
    symbol: "b6d7d04e952aa6f54b5ebbcb0877858787d507af78c10d8f371f7465eaea5111bc147b0ca76b2643a6c994032a884d94af89626b210c6283432c3ffbbf634813", 
    name: "TALOS",
    policy: "e52964af4fffdb54504859875b1827b60ba679074996156461143dc14f5054494d"
  },
  { 
    symbol: "fb2031dcbd97a9a666661ab325cd8d0fb4400abf444568ec2872166ab8685eeb5917612a9cf200b66debfc2934b0f8af182b390f91f5657f2ce28d2fcc52f30b", 
    name: "IAG",
    policy: "5d16cc1a177b5d9ba9cfa9793b07e60f1fb70fea1f8aef064415d114494147"
  },
  { 
    symbol: "a618eb2af334b73b143a5ea88755df3f76eee5437bfd2b5bdc25b500cb658b03333c5e10fcde53e5f46a0d2b077f3c1e174cfba6f8065efeeb3945346f52a698", 
    name: "MIN",
    policy: "f43a62fdc3965df486de8a0d32fe800963589c41b38946602a0dc53541474958"
  },
  { 
    symbol: "4cab43a35ef5d3fc8267670b547a404522e563ed399a8372888eb3d56177d5eca65949f258e75bc128c0521ff49e4e9d8207578721dc5e7310cadc1c50059f50", 
    name: "WMTX",
    policy: "95a427e384527065f2f8946f5e86320d0117839a5e98ea2c0b55fb0048554e54"
  },
  { 
    symbol: "b752b73a8a38773b7499a6f9d516ecd14fb68e4c14b1e9a81cc8dac15ee4af1ce83ad10ec59b89f3a9ba38e6a77946239758b370523b57e6ca590472161d048e", 
    name: "DJED",
    policy: "f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b6988069425443"
  },
  { 
    symbol: "8cd1ffebaf14b007252b4d9ec39b90084a153ad68367ce063630490c5cc8bf2f44b974239bfc63a6ba818c83d03ef676f03d523894d497f037d91e080e9e3569", 
    name: "USDM",
    policy: "8db269c3ec630e06ae29f74bc39edd1f87c819f1056206e879a1cd61446a65644d6963726f555344"
  },
  { 
    symbol: "7e785da757fd529d2c090240c0f4d04cf6d43757b1ce702b2ed835057d59b118ba5534c5757a5a9fee0f1af8909ebd50a55eb2a5c9783c5637727508e48a2e47", 
    name: "iUSD",
    policy: "edfd7a1d77bcb8b884c474bdc92a16002d1fb720e454fa6e993444794e5458"
  },
  { 
    symbol: "46bf56f580c3289fcd53be3dbc269a2a8bd9cee3c70ee230ab79b9b5d868d5fa0612dbe0ed867318c54f6d49c820a69da2d9c81ddb85618d478b505dc76976e9", 
    name: "BODEGA",
    policy: "" // Not in the fetchpools list
  }
];

interface CurrentData {
  current_price: number;
  current_tvl: number;
  hourly_price_change: number;
  hourly_tvl_change: number;
  hourly_volume: number;
  daily_price_change: number;
  daily_tvl_change: number;
  daily_volume: number;
}

interface HistoricalData {
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  tvl: number[];
  s: string;
}

interface PoolData {
  name: string;
  symbol: string;
  policy: string;
  current: CurrentData | null;
  history: HistoricalData | null;
}

async function fetchCurrentData(policy: string): Promise<CurrentData | null> {
  try {
    const response = await fetch(`${BASE_URL}/tokens/current?policy=${policy}`, {
      headers: {
        Authorization: `Bearer ${CHARLI3_API_KEY}`
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as CurrentData;
  } catch (error) {
    console.error(`Error fetching current data for policy ${policy}:`, error);
    return null;
  }
}

async function fetchHistoricalData(symbol: string, from: number, to: number): Promise<HistoricalData | null> {
  const url = `${BASE_URL}/history?symbol=${symbol}&resolution=1d&from=${from}&to=${to}&include_tvl=true`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${CHARLI3_API_KEY}`
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as HistoricalData;
  } catch (error) {
    console.error(`Error fetching historical data for symbol ${symbol}:`, error);
    return null;
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function displayPoolData(pool: PoolData) {
  console.log('\n' + '='.repeat(80));
  console.log(`🪙  ${pool.name} (${pool.symbol.substring(0, 20)}...)`);
  console.log('='.repeat(80));
  
  if (pool.policy) {
    console.log(`📋 Policy: ${pool.policy}`);
  }

  if (pool.current) {
    console.log('\n📊 CURRENT METRICS');
    console.log('─'.repeat(80));
    console.log(`   Price:           $${formatNumber(pool.current.current_price, 6)}`);
    console.log(`   TVL:             $${formatNumber(pool.current.current_tvl)}`);
    console.log(`   24h Price Change: ${pool.current.daily_price_change >= 0 ? '+' : ''}${formatNumber(pool.current.daily_price_change, 2)}%`);
    console.log(`   24h TVL Change:   ${pool.current.daily_tvl_change >= 0 ? '+' : ''}$${formatNumber(pool.current.daily_tvl_change)}`);
    console.log(`   24h Volume:       $${formatNumber(pool.current.daily_volume)}`);
    console.log(`   1h Price Change:  ${pool.current.hourly_price_change >= 0 ? '+' : ''}${formatNumber(pool.current.hourly_price_change, 2)}%`);
    console.log(`   1h Volume:        $${formatNumber(pool.current.hourly_volume)}`);
  }

  if (pool.history && pool.history.t && pool.history.t.length > 0) {
    console.log('\n📈 7-DAY HISTORICAL DATA');
    console.log('─'.repeat(80));
    console.log('Date        | Open Price  | High Price  | Low Price   | Close Price | Volume      | TVL');
    console.log('─'.repeat(80));
    
    for (let i = 0; i < pool.history.t.length; i++) {
      const date = formatDate(pool.history.t[i]);
      const open = formatNumber(Math.abs(pool.history.o[i]), 6).padStart(11);
      const high = formatNumber(Math.abs(pool.history.h[i]), 6).padStart(11);
      const low = formatNumber(Math.abs(pool.history.l[i]), 6).padStart(11);
      const close = formatNumber(Math.abs(pool.history.c[i]), 6).padStart(11);
      const volume = formatNumber(pool.history.v[i]).padStart(11);
      const tvl = formatNumber(Math.abs(pool.history.tvl[i])).padStart(12);
      
      console.log(`${date.padEnd(11)} | $${open} | $${high} | $${low} | $${close} | $${volume} | $${tvl}`);
    }

    // Calculate 7-day trends
    if (pool.history.c.length >= 2) {
      const firstClose = Math.abs(pool.history.c[0]);
      const lastClose = Math.abs(pool.history.c[pool.history.c.length - 1]);
      const priceChange = ((lastClose - firstClose) / firstClose) * 100;
      
      const firstTVL = Math.abs(pool.history.tvl[0]);
      const lastTVL = Math.abs(pool.history.tvl[pool.history.tvl.length - 1]);
      const tvlChange = lastTVL - firstTVL;
      
      const totalVolume = pool.history.v.reduce((sum, v) => sum + v, 0);

      console.log('\n📉 7-DAY SUMMARY');
      console.log('─'.repeat(80));
      console.log(`   Price Change:     ${priceChange >= 0 ? '+' : ''}${formatNumber(priceChange, 2)}%`);
      console.log(`   TVL Change:       ${tvlChange >= 0 ? '+' : ''}$${formatNumber(tvlChange)}`);
      console.log(`   Total Volume:     $${formatNumber(totalVolume)}`);
      console.log(`   Avg Daily Volume: $${formatNumber(totalVolume / pool.history.v.length)}`);
    }
  }
}

async function main() {
  console.log('\n🚀 Fetching integrated pool data from Charli3 API...\n');
  
  const now = Math.floor(Date.now() / 1000);
  const oneWeekAgo = now - 7 * 86400;

  const poolDataPromises = tokens.map(async (token): Promise<PoolData> => {
    const [current, history] = await Promise.all([
      token.policy ? fetchCurrentData(token.policy) : Promise.resolve(null),
      fetchHistoricalData(token.symbol, oneWeekAgo, now)
    ]);

    return {
      name: token.name,
      symbol: token.symbol,
      policy: token.policy,
      current,
      history
    };
  });

  const allPoolData = await Promise.all(poolDataPromises);

  // Display all pools
  for (const pool of allPoolData) {
    displayPoolData(pool);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Data fetch complete!');
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);
