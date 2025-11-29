import Charli3PoolIntegration, { EnhancedPoolData } from './charli3PoolIntegration.js';

export interface UserPosition {
  token_a_amount: number;
  token_b_amount: number;
  lp_tokens: number;
  initial_price: number;
  deposit_timestamp: number;
  tokenA: string;
  tokenB: string;
}

export interface ILCalculationResult {
  ilPercentage: number;
  ilAmount: number;
  lpValue: number;
  holdValue: number;
  currentPrice: number;
  priceChange: number;
  timestamp: number;
  poolData: EnhancedPoolData;
  shouldExit: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class EnhancedILCalculator {
  private charli3Integration: Charli3PoolIntegration;
  
  // IL thresholds
  private readonly IL_WARNING_THRESHOLD = 5; // 5% IL
  private readonly IL_DANGER_THRESHOLD = 10; // 10% IL
  private readonly IL_CRITICAL_THRESHOLD = 15; // 15% IL

  constructor() {
    this.charli3Integration = new Charli3PoolIntegration();
  }

  /**
   * Calculate IL for a user position using real Charli3 data
   */
  async calculateIL(position: UserPosition, ilThreshold?: number): Promise<ILCalculationResult> {
    // Fetch current pool data
    const poolData = await this.charli3Integration.getPoolByName(position.tokenB);
    
    if (!poolData || !poolData.current) {
      throw new Error(`Unable to fetch pool data for ${position.tokenB}`);
    }

    const currentPrice = poolData.current.current_price;
    const priceRatio = currentPrice / position.initial_price;
    const priceChange = ((currentPrice - position.initial_price) / position.initial_price) * 100;

    // Calculate LP value with current prices
    const k = position.token_a_amount * position.token_b_amount; // Constant product
    const newTokenAAmount = Math.sqrt(k / priceRatio);
    const newTokenBAmount = Math.sqrt(k * priceRatio);
    
    // Current value if held in LP
    const lpValue = newTokenAAmount + (newTokenBAmount * currentPrice);

    // Value if held outside LP (HODL)
    const holdValue = position.token_a_amount + (position.token_b_amount * currentPrice);

    // IL calculation
    const ilAmount = holdValue - lpValue;
    const ilPercentage = (ilAmount / holdValue) * 100;

    // Determine risk level
    const riskLevel = this.determineRiskLevel(ilPercentage, poolData.riskScore || 0);

    // Should exit based on threshold or critical risk
    const threshold = ilThreshold || this.IL_DANGER_THRESHOLD;
    const shouldExit = ilPercentage >= threshold || riskLevel === 'critical';

    return {
      ilPercentage,
      ilAmount,
      lpValue,
      holdValue,
      currentPrice,
      priceChange,
      timestamp: Date.now(),
      poolData,
      shouldExit,
      riskLevel
    };
  }

  /**
   * Batch calculate IL for multiple positions
   */
  async calculateBatchIL(positions: UserPosition[], ilThreshold?: number): Promise<ILCalculationResult[]> {
    const results = await Promise.all(
      positions.map(position => this.calculateIL(position, ilThreshold))
    );
    return results;
  }

  /**
   * Determine risk level based on IL and pool volatility
   */
  private determineRiskLevel(ilPercentage: number, poolRiskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    // Combine IL percentage and pool risk score
    const combinedRisk = ilPercentage + (poolRiskScore * 0.3);

    if (combinedRisk >= this.IL_CRITICAL_THRESHOLD || ilPercentage >= 20) {
      return 'critical';
    } else if (combinedRisk >= this.IL_DANGER_THRESHOLD || ilPercentage >= 10) {
      return 'high';
    } else if (combinedRisk >= this.IL_WARNING_THRESHOLD || ilPercentage >= 5) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Monitor position and check if protection should trigger
   */
  async monitorPosition(position: UserPosition, ilThreshold: number): Promise<{
    shouldTrigger: boolean;
    result: ILCalculationResult;
    reason: string;
  }> {
    const result = await this.calculateIL(position, ilThreshold);

    let shouldTrigger = false;
    let reason = '';

    if (result.ilPercentage >= ilThreshold) {
      shouldTrigger = true;
      reason = `IL threshold exceeded: ${result.ilPercentage.toFixed(2)}% >= ${ilThreshold}%`;
    } else if (result.riskLevel === 'critical') {
      shouldTrigger = true;
      reason = `Critical risk level detected (IL: ${result.ilPercentage.toFixed(2)}%, Risk Score: ${result.poolData.riskScore?.toFixed(1)})`;
    } else if (result.poolData.current && Math.abs(result.poolData.current.hourly_price_change) > 20) {
      shouldTrigger = true;
      reason = `Extreme price volatility: ${result.poolData.current.hourly_price_change.toFixed(2)}% in 1 hour`;
    }

    return {
      shouldTrigger,
      result,
      reason
    };
  }

  /**
   * Get historical IL projection based on past data
   */
  async projectHistoricalIL(position: UserPosition): Promise<{
    avgIL: number;
    maxIL: number;
    minIL: number;
    projectedIL: number;
  }> {
    const poolData = await this.charli3Integration.getPoolByName(position.tokenB);
    
    if (!poolData || !poolData.history || !poolData.history.c) {
      throw new Error('Insufficient historical data for projection');
    }

    const historicalILs: number[] = [];
    const initialPrice = position.initial_price;

    // Calculate IL for each historical price point
    for (const price of poolData.history.c) {
      const absPrice = Math.abs(price);
      const priceRatio = absPrice / initialPrice;
      
      // Simplified IL formula
      const il = (2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1) * 100;
      historicalILs.push(Math.abs(il));
    }

    const avgIL = historicalILs.reduce((a, b) => a + b, 0) / historicalILs.length;
    const maxIL = Math.max(...historicalILs);
    const minIL = Math.min(...historicalILs);

    // Project next IL based on trend
    const recentILs = historicalILs.slice(-3);
    const projectedIL = recentILs.reduce((a, b) => a + b, 0) / recentILs.length;

    return {
      avgIL,
      maxIL,
      minIL,
      projectedIL
    };
  }

  /**
   * Get recommended pools based on low risk scores
   */
  async getRecommendedPools(limit: number = 5): Promise<EnhancedPoolData[]> {
    return await this.charli3Integration.getPoolsByRisk(true).then(pools => pools.slice(0, limit));
  }

  /**
   * Get high-risk pools that should be monitored closely
   */
  async getHighRiskPools(limit: number = 5): Promise<EnhancedPoolData[]> {
    return await this.charli3Integration.getPoolsByRisk(false).then(pools => pools.slice(0, limit));
  }

  /**
   * Get all available pools for selection
   */
  async getAllAvailablePools(): Promise<EnhancedPoolData[]> {
    return await this.charli3Integration.getAllEnhancedPools();
  }

  /**
   * Format IL result for display
   */
  formatILResult(result: ILCalculationResult): string {
    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    return `
${riskEmoji[result.riskLevel]} ${result.poolData.name} Pool Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Financial Metrics:
   Current Price:    $${result.currentPrice.toFixed(6)}
   Price Change:     ${result.priceChange >= 0 ? '+' : ''}${result.priceChange.toFixed(2)}%
   LP Value:         $${result.lpValue.toFixed(2)}
   Hold Value:       $${result.holdValue.toFixed(2)}
   
📊 Impermanent Loss:
   IL Percentage:    ${result.ilPercentage.toFixed(2)}%
   IL Amount:        $${result.ilAmount.toFixed(2)}
   Risk Level:       ${result.riskLevel.toUpperCase()}
   
🎯 Pool Metrics:
   TVL:              $${result.poolData.current?.current_tvl.toFixed(2) || 'N/A'}
   24h Volume:       $${result.poolData.current?.daily_volume.toFixed(2) || 'N/A'}
   Risk Score:       ${result.poolData.riskScore?.toFixed(1) || 'N/A'}/100
   Volatility (7d):  ${result.poolData.volatility7d?.toFixed(6) || 'N/A'}

⚠️  Should Exit:     ${result.shouldExit ? 'YES ⚠️' : 'NO ✅'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }
}

export default EnhancedILCalculator;
