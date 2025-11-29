/**
 * Enhanced API Service for Charli3 Integration, AI Predictions, and Advanced IL Calculations
 */
import { config } from "./apiConfig";

const API_BASE = config.api.baseUrl;

// ==========================================
// Type Definitions
// ==========================================

export interface EnhancedPoolData {
  name: string;
  symbol: string;
  poolId: string;
  currentPrice?: number;
  tvl?: number;
  volume24h?: number;
  riskScore?: number;
  volatility7d?: number;
  priceChange7d?: number;
}

export interface UserPosition {
  token_a_amount: number;
  token_b_amount: number;
  lp_tokens: number;
  initial_price: number;
  deposit_timestamp: number;
  tokenA: string;
  tokenB: string;
}

export interface EnhancedILResult {
  ilPercentage: number;
  ilAmount: number;
  lpValue: number;
  holdValue: number;
  currentPrice: number;
  priceChange: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  shouldExit: boolean;
  poolMetrics: {
    tvl?: number;
    volume24h?: number;
    riskScore?: number;
    volatility7d?: number;
  };
}

export interface PricePrediction {
  tokenName: string;
  currentPrice: number;
  predictions: {
    oneHour: number;
    twentyFourHours: number;
    sevenDays: number;
  };
  analysis: {
    trend: 'bullish' | 'bearish' | 'neutral';
    volatility: number;
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;
  };
  recommendation: 'buy' | 'sell' | 'hold';
}

export interface ILPrediction {
  tokenName: string;
  currentIL: number;
  predictedILs: {
    oneHour: number;
    twentyFourHours: number;
    sevenDays: number;
  };
  shouldExit: boolean;
  exitRecommendation: string;
  confidence: number;
}

export interface MonitoringResult {
  shouldTrigger: boolean;
  reason: string;
  ilPercentage: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  currentPrice: number;
  priceChange: number;
}

// ==========================================
// Enhanced API Service Class
// ==========================================

export class EnhancedYieldSafeAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE;
  }

  // ==========================================
  // Pool Discovery & Risk Assessment
  // ==========================================

  /**
   * Get all available pools with real Charli3 data
   */
  async getAllPools(): Promise<{ success: boolean; pools: EnhancedPoolData[]; count: number; source: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pools/list`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch pools:", error);
      throw error;
    }
  }

  /**
   * Get recommended low-risk pools
   */
  async getRecommendedPools(limit: number = 5): Promise<{ success: boolean; pools: EnhancedPoolData[]; count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pools/recommended?limit=${limit}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch recommended pools:", error);
      throw error;
    }
  }

  /**
   * Get high-risk pools that need monitoring
   */
  async getHighRiskPools(limit: number = 5): Promise<{ success: boolean; pools: EnhancedPoolData[]; count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pools/high-risk?limit=${limit}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch high-risk pools:", error);
      throw error;
    }
  }

  // ==========================================
  // Enhanced IL Calculation
  // ==========================================

  /**
   * Calculate IL with enhanced risk assessment
   */
  async calculateEnhancedIL(
    userPosition: UserPosition,
    ilThreshold: number
  ): Promise<{ success: boolean; result: EnhancedILResult }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/il/calculate-enhanced`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPosition, ilThreshold }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to calculate enhanced IL:", error);
      throw error;
    }
  }

  // ==========================================
  // AI Price Predictions
  // ==========================================

  /**
   * Get AI-powered price prediction for a token
   */
  async predictPrice(tokenName: string): Promise<{ success: boolean; prediction: PricePrediction }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/predict-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenName }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to predict price:", error);
      throw error;
    }
  }

  /**
   * Get AI-powered IL prediction
   */
  async predictIL(
    tokenName: string,
    initialPrice: number,
    ilThreshold: number
  ): Promise<{ success: boolean; prediction: ILPrediction }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/predict-il`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenName, initialPrice, ilThreshold }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to predict IL:", error);
      throw error;
    }
  }

  /**
   * Get batch price predictions for multiple tokens
   */
  async batchPredictPrices(tokenNames: string[]): Promise<{ success: boolean; predictions: any[]; count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/batch-predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenNames }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to batch predict:", error);
      throw error;
    }
  }

  // ==========================================
  // Enhanced Monitoring
  // ==========================================

  /**
   * Monitor position with enhanced risk detection
   */
  async monitorPositionEnhanced(
    userPosition: UserPosition,
    ilThreshold: number
  ): Promise<{ success: boolean; monitoring: MonitoringResult }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/vault/monitor-enhanced`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPosition, ilThreshold }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to monitor position:", error);
      throw error;
    }
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  /**
   * Format risk level for display
   */
  formatRiskLevel(riskLevel: string): { emoji: string; color: string; label: string } {
    const riskMap = {
      low: { emoji: '🟢', color: 'text-green-500', label: 'Low Risk' },
      medium: { emoji: '🟡', color: 'text-yellow-500', label: 'Medium Risk' },
      high: { emoji: '🟠', color: 'text-orange-500', label: 'High Risk' },
      critical: { emoji: '🔴', color: 'text-red-500', label: 'Critical Risk' },
    };
    return riskMap[riskLevel as keyof typeof riskMap] || riskMap.low;
  }

  /**
   * Format trend for display
   */
  formatTrend(trend: string): { emoji: string; color: string; label: string } {
    const trendMap = {
      bullish: { emoji: '📈', color: 'text-green-500', label: 'Bullish' },
      bearish: { emoji: '📉', color: 'text-red-500', label: 'Bearish' },
      neutral: { emoji: '➡️', color: 'text-gray-500', label: 'Neutral' },
    };
    return trendMap[trend as keyof typeof trendMap] || trendMap.neutral;
  }

  /**
   * Format recommendation for display
   */
  formatRecommendation(recommendation: string): { emoji: string; color: string; label: string } {
    const recMap = {
      buy: { emoji: '🟢', color: 'text-green-500', label: 'BUY' },
      hold: { emoji: '🟡', color: 'text-yellow-500', label: 'HOLD' },
      sell: { emoji: '🔴', color: 'text-red-500', label: 'SELL' },
    };
    return recMap[recommendation as keyof typeof recMap] || recMap.hold;
  }
}

// Export singleton instance
export const enhancedAPI = new EnhancedYieldSafeAPI();
