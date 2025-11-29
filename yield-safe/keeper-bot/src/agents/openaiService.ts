/**
 * OpenAI Service for YieldSafe AI Agent
 * 
 * Provides intelligent analysis of DeFi positions using GPT-4
 * for risk assessment, market analysis, and recommendations.
 */

import OpenAI from 'openai';

export interface MarketData {
  tokenA: string;
  tokenB: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  volatility: number;
  garchVolatility: number;
  lstmVolatility: number;
}

export interface PositionData {
  tokenA: string;
  tokenB: string;
  depositedValueADA: number;
  currentValueADA: number;
  ilThreshold: number;
  currentIL: number;
  daysActive: number;
}

export interface AIAnalysisResult {
  action: 'STAY' | 'EMERGENCY_EXIT' | 'REDUCE_POSITION' | 'INCREASE_POSITION';
  confidence: number;
  reasoning: string;
  shortTermOutlook: string;
  riskFactors: string[];
  recommendations: string[];
  marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';
}

export class OpenAIService {
  private client: OpenAI;
  private model: string = 'gpt-4o';
  
  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    
    if (!key) {
      console.warn('⚠️ OpenAI API key not found. AI analysis will use fallback mode.');
      this.client = null as any;
    } else {
      this.client = new OpenAI({ apiKey: key });
      console.log('🧠 OpenAI Service initialized with GPT-4');
    }
  }

  /**
   * Check if OpenAI is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Analyze market conditions and position risk using GPT-4
   */
  async analyzePosition(
    marketData: MarketData,
    positionData: PositionData
  ): Promise<AIAnalysisResult> {
    if (!this.client) {
      return this.fallbackAnalysis(marketData, positionData);
    }

    try {
      const prompt = this.buildAnalysisPrompt(marketData, positionData);
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert DeFi risk analyst specializing in Cardano liquidity positions.
Your job is to analyze market conditions and provide actionable recommendations for liquidity providers.
You understand impermanent loss (IL), volatility, and market dynamics.
Always provide structured JSON responses with clear reasoning.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const analysis = JSON.parse(content) as AIAnalysisResult;
      return this.validateAnalysis(analysis);

    } catch (error) {
      console.error('OpenAI analysis error:', error);
      return this.fallbackAnalysis(marketData, positionData);
    }
  }

  /**
   * Get market sentiment analysis
   */
  async getMarketSentiment(tokenPair: string): Promise<{
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';
    summary: string;
    keyFactors: string[];
  }> {
    if (!this.client) {
      return {
        sentiment: 'NEUTRAL',
        summary: 'OpenAI not configured - using neutral sentiment',
        keyFactors: ['AI analysis unavailable']
      };
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a crypto market analyst. Analyze market sentiment for the given token pair on Cardano. Return JSON with sentiment, summary, and keyFactors.'
          },
          {
            role: 'user',
            content: `Analyze current market sentiment for ${tokenPair} on Cardano DEXes. Consider:
- Overall crypto market conditions
- Cardano ecosystem health
- Token-specific news and developments
- Trading volume trends

Return JSON: { "sentiment": "BULLISH|BEARISH|NEUTRAL|VOLATILE", "summary": "...", "keyFactors": ["factor1", "factor2"] }`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content;
      return content ? JSON.parse(content) : {
        sentiment: 'NEUTRAL',
        summary: 'Unable to analyze',
        keyFactors: []
      };

    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return {
        sentiment: 'NEUTRAL',
        summary: 'Analysis failed',
        keyFactors: ['Error in API call']
      };
    }
  }

  /**
   * Generate natural language explanation of risk
   */
  async explainRisk(
    action: string,
    volatility: number,
    ilThreshold: number,
    currentIL: number
  ): Promise<string> {
    if (!this.client) {
      return this.generateFallbackExplanation(action, volatility, ilThreshold, currentIL);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a friendly DeFi advisor explaining risk to users. Keep explanations clear and actionable.'
          },
          {
            role: 'user',
            content: `Explain this situation to a liquidity provider:
- Recommended action: ${action}
- Current volatility: ${volatility.toFixed(2)}%
- IL threshold set by user: ${ilThreshold}%
- Current impermanent loss: ${currentIL.toFixed(2)}%

Explain in 2-3 sentences why this action is recommended and what they should consider.`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      return response.choices[0]?.message?.content || this.generateFallbackExplanation(action, volatility, ilThreshold, currentIL);

    } catch (error) {
      return this.generateFallbackExplanation(action, volatility, ilThreshold, currentIL);
    }
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(marketData: MarketData, positionData: PositionData): string {
    return `Analyze this DeFi liquidity position on Cardano:

MARKET DATA:
- Token Pair: ${marketData.tokenA}/${marketData.tokenB}
- Current Price: ${marketData.currentPrice} ADA
- 24h Price Change: ${marketData.priceChange24h.toFixed(2)}%
- 24h Volume: ${marketData.volume24h.toLocaleString()} ADA
- Historical Volatility: ${marketData.volatility.toFixed(2)}%
- GARCH Predicted Volatility: ${marketData.garchVolatility.toFixed(4)}%
- LSTM Predicted Volatility: ${marketData.lstmVolatility.toFixed(4)}%

POSITION DATA:
- Deposited Value: ${positionData.depositedValueADA} ADA
- Current Value: ${positionData.currentValueADA} ADA
- IL Threshold: ${positionData.ilThreshold}%
- Current IL: ${positionData.currentIL.toFixed(4)}%
- Days Active: ${positionData.daysActive}

Based on this data, provide a risk analysis in JSON format:
{
  "action": "STAY | EMERGENCY_EXIT | REDUCE_POSITION | INCREASE_POSITION",
  "confidence": 0-100,
  "reasoning": "Clear explanation of why this action",
  "shortTermOutlook": "Next 24-48 hours prediction",
  "riskFactors": ["risk1", "risk2", "risk3"],
  "recommendations": ["recommendation1", "recommendation2"],
  "marketSentiment": "BULLISH | BEARISH | NEUTRAL | VOLATILE"
}

Consider:
1. If predicted volatility > threshold/2, likely EMERGENCY_EXIT
2. If current IL approaching threshold, recommend action
3. Weigh GARCH (short-term) vs LSTM (trend) predictions
4. Consider market sentiment and volume`;
  }

  /**
   * Validate and normalize analysis result
   */
  private validateAnalysis(analysis: any): AIAnalysisResult {
    const validActions = ['STAY', 'EMERGENCY_EXIT', 'REDUCE_POSITION', 'INCREASE_POSITION'];
    const validSentiments = ['BULLISH', 'BEARISH', 'NEUTRAL', 'VOLATILE'];

    return {
      action: validActions.includes(analysis.action) ? analysis.action : 'STAY',
      confidence: Math.min(100, Math.max(0, Number(analysis.confidence) || 50)),
      reasoning: String(analysis.reasoning || 'Analysis completed'),
      shortTermOutlook: String(analysis.shortTermOutlook || 'Monitoring recommended'),
      riskFactors: Array.isArray(analysis.riskFactors) ? analysis.riskFactors : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      marketSentiment: validSentiments.includes(analysis.marketSentiment) ? analysis.marketSentiment : 'NEUTRAL'
    };
  }

  /**
   * Fallback analysis when OpenAI is unavailable
   */
  private fallbackAnalysis(marketData: MarketData, positionData: PositionData): AIAnalysisResult {
    const avgVolatility = (marketData.garchVolatility + marketData.lstmVolatility) / 2;
    const volatilityThreshold = positionData.ilThreshold / 2;
    
    let action: AIAnalysisResult['action'] = 'STAY';
    let confidence = 50;
    let reasoning = '';
    let sentiment: AIAnalysisResult['marketSentiment'] = 'NEUTRAL';

    if (avgVolatility > volatilityThreshold) {
      action = 'EMERGENCY_EXIT';
      confidence = 70 + (avgVolatility / volatilityThreshold) * 10;
      reasoning = `Predicted volatility (${avgVolatility.toFixed(2)}%) exceeds safety threshold (${volatilityThreshold.toFixed(2)}%). High risk of exceeding IL threshold.`;
      sentiment = 'VOLATILE';
    } else if (positionData.currentIL > positionData.ilThreshold * 0.8) {
      action = 'REDUCE_POSITION';
      confidence = 60;
      reasoning = `Current IL (${positionData.currentIL.toFixed(2)}%) approaching threshold (${positionData.ilThreshold}%). Consider reducing exposure.`;
      sentiment = 'BEARISH';
    } else if (avgVolatility < volatilityThreshold * 0.3) {
      action = 'STAY';
      confidence = 80;
      reasoning = `Market is stable with low volatility (${avgVolatility.toFixed(2)}%). Safe to continue farming.`;
      sentiment = marketData.priceChange24h > 0 ? 'BULLISH' : 'NEUTRAL';
    } else {
      action = 'STAY';
      confidence = 60;
      reasoning = `Moderate volatility detected. Position is within acceptable risk parameters.`;
    }

    return {
      action,
      confidence: Math.min(100, confidence),
      reasoning,
      shortTermOutlook: action === 'EMERGENCY_EXIT' 
        ? 'High volatility expected to continue. Exit recommended.'
        : 'Market conditions appear stable for continued farming.',
      riskFactors: [
        `Volatility: ${avgVolatility.toFixed(2)}%`,
        `IL Risk: ${(positionData.currentIL / positionData.ilThreshold * 100).toFixed(0)}% of threshold`,
        `Market trend: ${marketData.priceChange24h > 0 ? 'Upward' : 'Downward'}`
      ],
      recommendations: action === 'EMERGENCY_EXIT'
        ? ['Execute emergency exit to protect funds', 'Wait for volatility to decrease', 'Consider stablecoin pairs']
        : ['Continue monitoring position', 'Review IL threshold settings', 'Diversify across multiple pools'],
      marketSentiment: sentiment
    };
  }

  /**
   * Generate fallback explanation
   */
  private generateFallbackExplanation(
    action: string,
    volatility: number,
    ilThreshold: number,
    currentIL: number
  ): string {
    if (action === 'EMERGENCY_EXIT') {
      return `⚠️ High volatility alert! Current volatility (${volatility.toFixed(2)}%) suggests significant price movement risk. With your ${ilThreshold}% IL threshold, it's recommended to exit and protect your funds.`;
    } else if (action === 'REDUCE_POSITION') {
      return `📉 Your position is approaching the risk threshold. Current IL is ${currentIL.toFixed(2)}% against your ${ilThreshold}% limit. Consider reducing exposure to minimize potential losses.`;
    }
    return `✅ Market conditions are stable. Volatility (${volatility.toFixed(2)}%) is well below concerning levels. Your position is safe to continue earning yield.`;
  }
}

export default OpenAIService;
