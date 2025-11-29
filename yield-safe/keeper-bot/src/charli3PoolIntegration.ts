import fetch from 'node-fetch';

const CHARLI3_API_KEY = process.env.CHARLI3_API_KEY || "cta_3P8mEHvJccsoVw4r0Qw8K2iwxxyLczG1m146WJdlFFoop79E7qEDoUAjQyAsMMoV";
const BASE_URL = "https://api.charli3.io/api/v1";

export interface Charli3Token {
  symbol: string;
  name: string;
  policy: string;
}

export interface CurrentPoolData {
  current_price: number;
  current_tvl: number;
  hourly_price_change: number;
  hourly_tvl_change: number;
  hourly_volume: number;
  daily_price_change: number;
  daily_tvl_change: number;
  daily_volume: number;
}

export interface HistoricalData {
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  tvl: number[];
  s: string;
}

export interface EnhancedPoolData {
  name: string;
  symbol: string;
  policy: string;
  poolId: string;
  current: CurrentPoolData | null;
  history: HistoricalData | null;
  // Calculated metrics
  avgPrice7d?: number;
  volatility7d?: number;
  volumeAvg7d?: number;
  priceChange7d?: number;
  tvlChange7d?: number;
  riskScore?: number;
}

export class Charli3PoolIntegration {
  private apiKey: string;
  private baseUrl: string;
  
  // Cache management
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
  private poolsCache: { data: EnhancedPoolData[]; timestamp: number } | null = null;
  private readonly POOLS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for full pool list

  // Complete token list with Charli3 symbols and policies
  private readonly TOKENS: Charli3Token[] = [
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
      policy: "" // Not available in current policies
    }
  ];

  constructor(apiKey?: string) {
    this.apiKey = apiKey || CHARLI3_API_KEY;
    this.baseUrl = BASE_URL;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(cacheEntry: { data: any; timestamp: number } | null | undefined, ttl: number): boolean {
    if (!cacheEntry) return false;
    return Date.now() - cacheEntry.timestamp < ttl;
  }

  /**
   * Fetch current pool data from Charli3 with caching
   */
  async fetchCurrentData(policy: string): Promise<CurrentPoolData | null> {
    if (!policy) return null;
    
    // Check cache first
    const cacheKey = `current_${policy}`;
    const cached = this.cache.get(cacheKey);
    if (this.isCacheValid(cached, this.CACHE_TTL)) {
      return cached!.data;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/tokens/current?policy=${policy}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data as CurrentPoolData;
    } catch (error) {
      console.error(`Error fetching current data for policy ${policy}:`, error);
      return null;
    }
  }

  /**
   * Fetch historical data from Charli3 with caching
   */
  async fetchHistoricalData(symbol: string, from: number, to: number): Promise<HistoricalData | null> {
    // Check cache first
    const cacheKey = `history_${symbol}_${from}_${to}`;
    const cached = this.cache.get(cacheKey);
    if (this.isCacheValid(cached, this.CACHE_TTL)) {
      return cached!.data;
    }
    
    const url = `${this.baseUrl}/history?symbol=${symbol}&resolution=1d&from=${from}&to=${to}&include_tvl=true`;
    
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        },
        timeout: 10000 // 10 second timeout
      } as any);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data as HistoricalData;
    } catch (error) {
      // Only log if it's not a connection reset (too noisy)
      if (!(error instanceof Error && error.message.includes('ECONNRESET'))) {
        console.error(`Error fetching historical data for ${symbol.slice(0, 20)}:`, error);
      }
      return null;
    }
  }

  /**
   * Calculate advanced metrics from historical data
   */
  private calculateMetrics(history: HistoricalData): {
    avgPrice7d: number;
    volatility7d: number;
    volumeAvg7d: number;
    priceChange7d: number;
    tvlChange7d: number;
    riskScore: number;
  } {
    if (!history.c || history.c.length === 0) {
      return {
        avgPrice7d: 0,
        volatility7d: 0,
        volumeAvg7d: 0,
        priceChange7d: 0,
        tvlChange7d: 0,
        riskScore: 0
      };
    }

    // Average price
    const avgPrice7d = history.c.reduce((sum, p) => sum + Math.abs(p), 0) / history.c.length;

    // Price volatility (standard deviation)
    const prices = history.c.map(p => Math.abs(p));
    const mean = avgPrice7d;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const volatility7d = Math.sqrt(variance);

    // Average daily volume
    const volumeAvg7d = history.v.reduce((sum, v) => sum + v, 0) / history.v.length;

    // Price change
    const firstPrice = Math.abs(history.c[0]);
    const lastPrice = Math.abs(history.c[history.c.length - 1]);
    const priceChange7d = ((lastPrice - firstPrice) / firstPrice) * 100;

    // TVL change
    const firstTVL = Math.abs(history.tvl[0]);
    const lastTVL = Math.abs(history.tvl[history.tvl.length - 1]);
    const tvlChange7d = lastTVL - firstTVL;

    // Risk score (0-100, higher = riskier)
    // Based on volatility, price change magnitude, and volume consistency
    const volatilityScore = (volatility7d / avgPrice7d) * 100 * 50; // 0-50 points
    const priceChangeScore = Math.min(Math.abs(priceChange7d), 50); // 0-50 points
    const volumeVariance = history.v.map(v => Math.abs(v - volumeAvg7d)).reduce((a, b) => a + b, 0) / history.v.length;
    const volumeScore = Math.min((volumeVariance / volumeAvg7d) * 100, 30); // 0-30 points
    
    const riskScore = Math.min(volatilityScore + priceChangeScore * 0.5 + volumeScore, 100);

    return {
      avgPrice7d,
      volatility7d,
      volumeAvg7d,
      priceChange7d,
      tvlChange7d,
      riskScore
    };
  }

  /**
   * Get all available pools with enhanced data (with caching)
   */
  async getAllEnhancedPools(): Promise<EnhancedPoolData[]> {
    // Return cached data if still valid
    if (this.isCacheValid(this.poolsCache, this.POOLS_CACHE_TTL)) {
      console.log(`✅ Returning cached pool data (${this.poolsCache!.data.length} pools)`);
      return this.poolsCache!.data;
    }

    console.log(`🔄 Fetching fresh pool data from Charli3...`);
    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - 7 * 86400;

    // Fetch with delay to avoid rate limiting
    const poolDataPromises = this.TOKENS.map(async (token, index): Promise<EnhancedPoolData> => {
      // Add staggered delay to prevent hammering the API
      await new Promise(resolve => setTimeout(resolve, index * 200)); // 200ms between each request

      const [current, history] = await Promise.all([
        token.policy ? this.fetchCurrentData(token.policy) : Promise.resolve(null),
        this.fetchHistoricalData(token.symbol, oneWeekAgo, now)
      ]);

      const metrics = history ? this.calculateMetrics(history) : undefined;

      return {
        name: token.name,
        symbol: token.symbol,
        policy: token.policy,
        poolId: token.symbol, // Use symbol as poolId for Charli3
        current,
        history,
        ...metrics
      };
    });

    const results = await Promise.all(poolDataPromises);
    
    // Cache the results
    this.poolsCache = { data: results, timestamp: Date.now() };
    console.log(`✅ Cached ${results.length} pools (valid for ${this.POOLS_CACHE_TTL / 60000} minutes)`);
    
    return results;
  }

  /**
   * Get specific pool by name
   */
  async getPoolByName(name: string): Promise<EnhancedPoolData | null> {
    const token = this.TOKENS.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (!token) return null;

    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - 7 * 86400;

    const [current, history] = await Promise.all([
      token.policy ? this.fetchCurrentData(token.policy) : Promise.resolve(null),
      this.fetchHistoricalData(token.symbol, oneWeekAgo, now)
    ]);

    const metrics = history ? this.calculateMetrics(history) : undefined;

    return {
      name: token.name,
      symbol: token.symbol,
      policy: token.policy,
      poolId: token.symbol,
      current,
      history,
      ...metrics
    };
  }

  /**
   * Get pools sorted by risk score
   */
  async getPoolsByRisk(ascending: boolean = true): Promise<EnhancedPoolData[]> {
    const pools = await this.getAllEnhancedPools();
    return pools
      .filter(p => p.riskScore !== undefined)
      .sort((a, b) => {
        const scoreA = a.riskScore || 0;
        const scoreB = b.riskScore || 0;
        return ascending ? scoreA - scoreB : scoreB - scoreA;
      });
  }

  /**
   * Get pools with highest volume
   */
  async getHighVolumePools(limit: number = 5): Promise<EnhancedPoolData[]> {
    const pools = await this.getAllEnhancedPools();
    return pools
      .filter(p => p.current?.daily_volume)
      .sort((a, b) => (b.current!.daily_volume || 0) - (a.current!.daily_volume || 0))
      .slice(0, limit);
  }

  /**
   * Get available token list
   */
  getAvailableTokens(): Charli3Token[] {
    return [...this.TOKENS];
  }

  /**
   * Find token by name
   */
  findToken(name: string): Charli3Token | undefined {
    return this.TOKENS.find(t => t.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Get pool data formatted for IL calculator
   */
  async getPoolDataForILCalculator(tokenName: string): Promise<{
    pair: string;
    price: number;
    liquidity_a: number;
    liquidity_b: number;
    timestamp: number;
    volume_24h?: number;
    tvl?: number;
  } | null> {
    const pool = await this.getPoolByName(tokenName);
    if (!pool || !pool.current) return null;

    return {
      pair: `ADA/${tokenName}`,
      price: pool.current.current_price,
      liquidity_a: pool.current.current_tvl * 0.5, // Approximate split
      liquidity_b: pool.current.current_tvl * 0.5,
      timestamp: Date.now(),
      volume_24h: pool.current.daily_volume,
      tvl: pool.current.current_tvl
    };
  }
}

export default Charli3PoolIntegration;
