import fetch from 'node-fetch';

const CHARLI3_API_KEY = process.env.CHARLI3_API_KEY || "cta_3P8mEHvJccsoVw4r0Qw8K2iwxxyLczG1m146WJdlFFoop79E7qEDoUAjQyAsMMoV";
const BASE_URL = "https://api.charli3.io/api/v1";

const tokens = [
  { symbol: "2ee1bb205e388fd99b2a693325899510b496021436d4db58819514cc9745f9ab7f03a108c9d8b95d313af3735c6b4e571fd68f5fa220395fcc356048dac8f7a2", name: "C3" },
  { symbol: "fa8dee6cf0627a82a2610019596758fc36c1ebc4b7e389fdabc44857fdf5c9b0e29ac56f1a584bccd487c445ad45383c6347d03d39869f759daad68284781723", name: "SNEK" },
  { symbol: "b6d7d04e952aa6f54b5ebbcb0877858787d507af78c10d8f371f7465eaea5111bc147b0ca76b2643a6c994032a884d94af89626b210c6283432c3ffbbf634813", name: "TALOS" },
  { symbol: "fb2031dcbd97a9a666661ab325cd8d0fb4400abf444568ec2872166ab8685eeb5917612a9cf200b66debfc2934b0f8af182b390f91f5657f2ce28d2fcc52f30b", name: "IAG" },
  { symbol: "a618eb2af334b73b143a5ea88755df3f76eee5437bfd2b5bdc25b500cb658b03333c5e10fcde53e5f46a0d2b077f3c1e174cfba6f8065efeeb3945346f52a698", name: "MIN" },
  { symbol: "4cab43a35ef5d3fc8267670b547a404522e563ed399a8372888eb3d56177d5eca65949f258e75bc128c0521ff49e4e9d8207578721dc5e7310cadc1c50059f50", name: "WMTX" },
  { symbol: "b752b73a8a38773b7499a6f9d516ecd14fb68e4c14b1e9a81cc8dac15ee4af1ce83ad10ec59b89f3a9ba38e6a77946239758b370523b57e6ca590472161d048e", name: "DJED" },
  { symbol: "8cd1ffebaf14b007252b4d9ec39b90084a153ad68367ce063630490c5cc8bf2f44b974239bfc63a6ba818c83d03ef676f03d523894d497f037d91e080e9e3569", name: "USDM" },
  { symbol: "7e785da757fd529d2c090240c0f4d04cf6d43757b1ce702b2ed835057d59b118ba5534c5757a5a9fee0f1af8909ebd50a55eb2a5c9783c5637727508e48a2e47", name: "iUSD" },
  { symbol: "46bf56f580c3289fcd53be3dbc269a2a8bd9cee3c70ee230ab79b9b5d868d5fa0612dbe0ed867318c54f6d49c820a69da2d9c81ddb85618d478b505dc76976e9", name: "BODEGA" }
];

async function fetchHistoricalData(symbol: string, from: number, to: number) {
  const url = `${BASE_URL}/history?symbol=${symbol}&resolution=1d&from=${from}&to=${to}&include_tvl=true`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${CHARLI3_API_KEY}`
    }
  });

  if (!response.ok) {
    console.error(`Failed to fetch data for symbol: ${symbol}, status: ${response.status}`);
    return null;
  }

  const data = await response.json();
  return data;
}

async function main() {
  const now = Math.floor(Date.now() / 1000);
  const oneWeekAgo = now - 7 * 86400;

  for (const token of tokens) {
    console.log(`Fetching historical price data for ${token.name} (${token.symbol})`);
    const history = await fetchHistoricalData(token.symbol, oneWeekAgo, now);
    console.log(JSON.stringify(history, null, 2));
    console.log('---------------------------\n');
  }
}

main().catch(console.error);
