import Charli3PoolIntegration, { EnhancedPoolData, HistoricalData } from './charli3PoolIntegration.js';

export interface PricePrediction {
  tokenName: string;
  currentPrice: number;
  predictedPrice1h: number;
  predictedPrice24h: number;
  predictedPrice7d: number;
  confidence: number; // 0-100
  trend: 'bullish' | 'bearish' | 'neutral';
  volatility: number;
  recommendation: 'buy' | 'sell' | 'hold';
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface ILPrediction {
  tokenName: string;
  currentIL: number;
  predictedIL1h: number;
  predictedIL24h: number;
  predictedIL7d: number;
  shouldExit: boolean;
  exitRecommendation: string;
  confidence: number;
}

export class AIPricePredictionEngine {
  private charli3Integration: Charli3PoolIntegration;

  constructor() {
    this.charli3Integration = new Charli3PoolIntegration();
  }

  /**
   * Predict future price using statistical analysis and ML-inspired algorithms
   */
  async predictPrice(tokenName: string): Promise<PricePrediction> {
    const pool = await this.charli3Integration.getPoolByName(tokenName);
    
    if (!pool || !pool.current || !pool.history) {
      throw new Error(`Unable to fetch data for ${tokenName}`);
    }

    const currentPrice = pool.current.current_price;
    const history = pool.history;

    // Calculate various technical indicators
    const { trend, momentum } = this.analyzeTrend(history);
    const volatility = this.calculateVolatility(history);
    const { support, resistance } = this.findSupportResistance(history);
    
    // Moving averages
    const { sma7, ema7 } = this.calculateMovingAverages(history);

    // Price predictions using weighted algorithm
    const predictedPrice1h = this.predictShortTerm(currentPrice, momentum, volatility, pool.current);
    const predictedPrice24h = this.predictMidTerm(currentPrice, trend, sma7, ema7, volatility);
    const predictedPrice7d = this.predictLongTerm(currentPrice, history, trend, support, resistance);

    // Calculate confidence based on data quality and consistency
    const confidence = this.calculateConfidence(history, volatility);

    // Determine recommendation
    const recommendation = this.determineRecommendation(
      currentPrice,
      predictedPrice24h,
      trend,
      volatility,
      pool.riskScore || 50
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(volatility, pool.riskScore || 50);

    return {
      tokenName,
      currentPrice,
      predictedPrice1h,
      predictedPrice24h,
      predictedPrice7d,
      confidence,
      trend,
      volatility,
      recommendation,
      riskLevel,
      timestamp: Date.now()
    };
  }

  /**
   * Predict IL for different time horizons
   */
  async predictIL(tokenName: string, initialPrice: number, ilThreshold: number = 10): Promise<ILPrediction> {
    const prediction = await this.predictPrice(tokenName);

    // Calculate IL for each predicted price
    const currentIL = this.calculateILFromPrice(prediction.currentPrice, initialPrice);
    const predictedIL1h = this.calculateILFromPrice(prediction.predictedPrice1h, initialPrice);
    const predictedIL24h = this.calculateILFromPrice(prediction.predictedPrice24h, initialPrice);
    const predictedIL7d = this.calculateILFromPrice(prediction.predictedPrice7d, initialPrice);

    // Determine if should exit
    const shouldExit = 
      predictedIL24h >= ilThreshold || 
      prediction.riskLevel === 'high' ||
      (prediction.trend === 'bearish' && predictedIL1h > currentIL * 1.5);

    // Generate exit recommendation
    let exitRecommendation = '';
    if (shouldExit) {
      if (predictedIL24h >= ilThreshold * 1.5) {
        exitRecommendation = `IMMEDIATE EXIT RECOMMENDED - Predicted IL (${predictedIL24h.toFixed(2)}%) significantly exceeds threshold`;
      } else if (prediction.riskLevel === 'high') {
        exitRecommendation = `EXIT ADVISED - High volatility and risk level detected`;
      } else {
        exitRecommendation = `CONSIDER EXITING - IL approaching threshold (${predictedIL24h.toFixed(2)}%)`;
      }
    } else {
      exitRecommendation = `HOLD - IL within acceptable range (predicted 24h: ${predictedIL24h.toFixed(2)}%)`;
    }

    return {
      tokenName,
      currentIL,
      predictedIL1h,
      predictedIL24h,
      predictedIL7d,
      shouldExit,
      exitRecommendation,
      confidence: prediction.confidence
    };
  }

  /**
   * Batch predict prices for multiple tokens
   */
  async predictMultiplePrices(tokenNames: string[]): Promise<PricePrediction[]> {
    const predictions = await Promise.all(
      tokenNames.map(name => this.predictPrice(name).catch(err => {
        console.error(`Failed to predict ${name}:`, err);
        return null;
      }))
    );
    return predictions.filter((p): p is PricePrediction => p !== null);
  }

  /**
   * Calculate IL from price ratio
   */
  private calculateILFromPrice(currentPrice: number, initialPrice: number): number {
    const priceRatio = currentPrice / initialPrice;
    const il = (2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1) * 100;
    return Math.abs(il);
  }

  /**
   * Analyze price trend
   */
  private analyzeTrend(history: HistoricalData): { trend: 'bullish' | 'bearish' | 'neutral'; momentum: number } {
    const prices = history.c.map(p => Math.abs(p));
    
    if (prices.length < 2) {
      return { trend: 'neutral', momentum: 0 };
    }

    // Calculate momentum (rate of change)
    const recentPrices = prices.slice(-3);
    const momentum = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];

    // Determine trend
    let trend: 'bullish' | 'bearish' | 'neutral';
    if (momentum > 0.05) {
      trend = 'bullish';
    } else if (momentum < -0.05) {
      trend = 'bearish';
    } else {
      trend = 'neutral';
    }

    return { trend, momentum };
  }

  /**
   * Calculate volatility (standard deviation)
   */
  private calculateVolatility(history: HistoricalData): number {
    const prices = history.c.map(p => Math.abs(p));
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  /**
   * Find support and resistance levels
   */
  private findSupportResistance(history: HistoricalData): { support: number; resistance: number } {
    const lows = history.l.map(l => Math.abs(l));
    const highs = history.h.map(h => Math.abs(h));

    // Support is average of lowest prices
    const sortedLows = [...lows].sort((a, b) => a - b);
    const support = sortedLows.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

    // Resistance is average of highest prices
    const sortedHighs = [...highs].sort((a, b) => b - a);
    const resistance = sortedHighs.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

    return { support, resistance };
  }

  /**
   * Calculate moving averages
   */
  private calculateMovingAverages(history: HistoricalData): { sma7: number; ema7: number } {
    const prices = history.c.map(p => Math.abs(p));
    
    // Simple Moving Average
    const sma7 = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Exponential Moving Average
    const multiplier = 2 / (prices.length + 1);
    let ema7 = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema7 = (prices[i] - ema7) * multiplier + ema7;
    }

    return { sma7, ema7 };
  }

  /**
   * Short-term prediction (1 hour)
   */
  private predictShortTerm(currentPrice: number, momentum: number, volatility: number, current: any): number {
    // Factor in hourly price change and volatility
    const hourlyChange = current.hourly_price_change / 100;
    const volatilityFactor = volatility * (Math.random() - 0.5);
    
    return currentPrice * (1 + hourlyChange * 0.7 + momentum * 0.2 + volatilityFactor * 0.1);
  }

  /**
   * Mid-term prediction (24 hours)
   */
  private predictMidTerm(currentPrice: number, trend: string, sma7: number, ema7: number, volatility: number): number {
    const trendFactor = trend === 'bullish' ? 1.02 : trend === 'bearish' ? 0.98 : 1.0;
    const maInfluence = (sma7 + ema7 * 1.5) / 2.5; // Weight EMA more
    const volatilityAdjustment = 1 + (volatility * (Math.random() - 0.5) * 0.5);
    
    return currentPrice * 0.4 + maInfluence * 0.4 * trendFactor * volatilityAdjustment + currentPrice * trendFactor * 0.2;
  }

  /**
   * Long-term prediction (7 days)
   */
  private predictLongTerm(currentPrice: number, history: HistoricalData, trend: string, support: number, resistance: number): number {
    const prices = history.c.map(p => Math.abs(p));
    
    // Calculate historical average
    const historicalAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Mean reversion tendency
    const meanReversionFactor = 0.6;
    const trendFactor = trend === 'bullish' ? 1.05 : trend === 'bearish' ? 0.95 : 1.0;
    
    // Weighted prediction
    const meanReversionPrice = currentPrice * (1 - meanReversionFactor) + historicalAvg * meanReversionFactor;
    const boundedPrice = Math.max(support * 0.95, Math.min(resistance * 1.05, meanReversionPrice));
    
    return boundedPrice * trendFactor;
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(history: HistoricalData, volatility: number): number {
    // More data = higher confidence
    const dataPoints = history.c.length;
    const dataConfidence = Math.min(dataPoints / 7 * 40, 40); // Max 40 points

    // Lower volatility = higher confidence
    const volatilityConfidence = Math.max(0, 40 - volatility * 100); // Max 40 points

    // Volume consistency
    const volumes = history.v;
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const volumeVariance = volumes.reduce((sum, v) => sum + Math.abs(v - avgVolume), 0) / volumes.length;
    const volumeConfidence = Math.max(0, 20 - (volumeVariance / avgVolume) * 100); // Max 20 points

    return Math.min(dataConfidence + volatilityConfidence + volumeConfidence, 100);
  }

  /**
   * Determine trading recommendation
   */
  private determineRecommendation(
    currentPrice: number,
    predictedPrice: number,
    trend: 'bullish' | 'bearish' | 'neutral',
    volatility: number,
    riskScore: number
  ): 'buy' | 'sell' | 'hold' {
    const priceChange = (predictedPrice - currentPrice) / currentPrice;

    // High volatility or risk = hold/sell bias
    if (volatility > 0.3 || riskScore > 70) {
      return priceChange < -0.05 ? 'sell' : 'hold';
    }

    // Normal conditions
    if (priceChange > 0.05 && trend === 'bullish') {
      return 'buy';
    } else if (priceChange < -0.05 && trend === 'bearish') {
      return 'sell';
    }
    return 'hold';
  }

  /**
   * Determine risk level
   */
  private determineRiskLevel(volatility: number, riskScore: number): 'low' | 'medium' | 'high' {
    const combinedRisk = volatility * 100 + riskScore * 0.3;
    
    if (combinedRisk > 50) return 'high';
    if (combinedRisk > 25) return 'medium';
    return 'low';
  }

  /**
   * Format prediction for display
   */
  formatPrediction(prediction: PricePrediction): string {
    const trendEmoji = {
      bullish: '📈',
      bearish: '📉',
      neutral: '➡️'
    };

    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🔴'
    };

    const recEmoji = {
      buy: '🟢 BUY',
      hold: '🟡 HOLD',
      sell: '🔴 SELL'
    };

    return `
${trendEmoji[prediction.trend]} ${prediction.tokenName} Price Prediction
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Current Price:     $${prediction.currentPrice.toFixed(6)}

🔮 Predictions:
   1 Hour:            $${prediction.predictedPrice1h.toFixed(6)} (${this.getChangePercent(prediction.currentPrice, prediction.predictedPrice1h)})
   24 Hours:          $${prediction.predictedPrice24h.toFixed(6)} (${this.getChangePercent(prediction.currentPrice, prediction.predictedPrice24h)})
   7 Days:            $${prediction.predictedPrice7d.toFixed(6)} (${this.getChangePercent(prediction.currentPrice, prediction.predictedPrice7d)})

📈 Analysis:
   Trend:             ${prediction.trend.toUpperCase()} ${trendEmoji[prediction.trend]}
   Volatility:        ${(prediction.volatility * 100).toFixed(2)}%
   Risk Level:        ${prediction.riskLevel.toUpperCase()} ${riskEmoji[prediction.riskLevel]}
   Confidence:        ${prediction.confidence.toFixed(0)}%

💡 Recommendation:    ${recEmoji[prediction.recommendation]}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  private getChangePercent(current: number, predicted: number): string {
    const change = ((predicted - current) / current) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }
}

export default AIPricePredictionEngine;
