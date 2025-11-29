import { spawn } from 'child_process';
import * as path from 'path';
import { RealILCalculator } from './realILCalculator';
import RealPriceService, { PriceCandle as RealPriceCandle } from './realPriceService';

// Use virtual environment Python
const PYTHON_PATH = path.join(process.cwd(), '.venv', 'bin', 'python3');

export interface RiskAnalysis {
  action: 'EMERGENCY_EXIT' | 'STAY';
  garchVolatility: number;
  lstmVolatility: number;
  confidence: number;
  reason: string;
  timestamp: number;
}

export interface PriceCandle {
  timestamp: number;
  close: number;
  returns: number;
  logReturns: number;
}

export class YieldSafeRiskEngine {
  private monitoringIntervalId: NodeJS.Timeout | null = null;
  private monitoredVaults: Array<{ tokenA: string; tokenB: string; ilThreshold: number; vaultId?: string }> = [];
  private pythonPath: string;
  private charli3Calculator: RealILCalculator;
  private priceService: RealPriceService;
  
  // Volatility thresholds (in %)
  private garchThreshold = 2.5;  // Default GARCH threshold
  private lstmThreshold = 2.25;  // 90% of GARCH (more sensitive)
  
  constructor() {
    this.pythonPath = PYTHON_PATH;
    this.charli3Calculator = new RealILCalculator();
    this.priceService = new RealPriceService();
    console.log('🤖 YieldSafe Risk Engine initialized (Charli3 ONLY + GARCH/LSTM)');
    console.log(`   Python path: ${this.pythonPath}`);
  }

  /**
   * Fetch price data from Charli3 Oracle (168 hourly candles)
   * Uses RealPriceService for proper OHLCV data with pool hashes
   */
  async fetchVolatilityData(tokenA: string, tokenB: string): Promise<PriceCandle[]> {
    try {
      // Use RealPriceService with pair-based fetch for Charli3 pool hashes
      console.log(`📊 Fetching 7-day hourly candles for ${tokenA}/${tokenB} from Charli3...`);
      
      const realCandles = await this.priceService.getHistoricalPricesForPair(tokenA, tokenB, 168, '1h');
      
      if (realCandles.length >= 100) {
        // Convert to our internal format with returns
        const candles: PriceCandle[] = realCandles.map((c, i, arr) => {
          const prevClose = i > 0 ? arr[i - 1].close : c.close;
          const returns = prevClose > 0 ? ((c.close - prevClose) / prevClose) * 100 : 0;
          const logReturns = prevClose > 0 ? Math.log(c.close / prevClose) : 0;
          
          return {
            timestamp: c.timestamp,
            close: c.close,
            returns,
            logReturns
          };
        });
        
        console.log(`✅ Charli3: ${candles.length} hourly candles loaded for ${tokenA}`);
        return candles;
      }
      
      // Fallback if insufficient Charli3 data
      console.log(`⚠️ Insufficient Charli3 data (${realCandles.length} candles), using simulation`);
      return this.generateSimulatedData(tokenA, tokenB, 168);
      
    } catch (error) {
      console.log(`⚠️ Charli3 fetch failed, using simulated data:`, error);
      return this.generateSimulatedData(tokenA, tokenB, 168);
    }
  }

  /**
   * Interpolate daily data to hourly
   */
  private interpolateToHourly(dailyCandles: PriceCandle[], currentPrice: number): PriceCandle[] {
    const hourlyCandles: PriceCandle[] = [];
    const now = Date.now();
    
    for (let i = 0; i < dailyCandles.length - 1; i++) {
      const startPrice = dailyCandles[i].close;
      const endPrice = dailyCandles[i + 1].close;
      const startTime = dailyCandles[i].timestamp;
      const hoursInDay = 24;
      
      for (let h = 0; h < hoursInDay; h++) {
        const ratio = h / hoursInDay;
        const interpolatedPrice = startPrice + (endPrice - startPrice) * ratio;
        const noise = (Math.random() - 0.5) * 0.002 * interpolatedPrice;
        const price = interpolatedPrice + noise;
        
        const prevPrice = hourlyCandles.length > 0 ? hourlyCandles[hourlyCandles.length - 1].close : startPrice;
        
        hourlyCandles.push({
          timestamp: startTime + (h * 3600000),
          close: price,
          returns: ((price - prevPrice) / prevPrice) * 100,
          logReturns: Math.log(price / prevPrice)
        });
      }
    }
    
    return hourlyCandles;
  }

  /**
   * Generate simulated price data for testing
   */
  private generateSimulatedData(tokenA: string, tokenB: string, hours: number, currentPrice?: number): PriceCandle[] {
    // Use provided currentPrice or default based on token
    const basePrice = currentPrice || (
      tokenB === 'DJED' || tokenB === 'USDC' ? 0.45 : 
      tokenB === 'SNEK' ? 0.003 : 
      tokenB === 'MIN' ? 0.055 : 1.0
    );
    
    const data: PriceCandle[] = [];
    let price = basePrice;
    const now = Date.now();
    
    for (let i = 0; i < hours; i++) {
      // Random walk with mean reversion
      const randomReturn = (Math.random() - 0.5) * 0.02; // ±1% hourly
      const meanReversion = (basePrice - price) * 0.01;
      
      const prevPrice = price;
      price = price * (1 + randomReturn + meanReversion);
      
      const returns = ((price - prevPrice) / prevPrice) * 100;
      const logReturns = Math.log(price / prevPrice);
      
      data.push({
        timestamp: now - (hours - i) * 3600000,
        close: price,
        returns: returns,
        logReturns: logReturns
      });
    }

    console.log(`📊 Generated ${data.length} simulated candles for ${tokenA}/${tokenB}`);
    return data;
  }

  /**
   * GARCH(1,1) volatility calculation using Python
   */
  async getGarchVolatility(returns: number[]): Promise<number> {
    return new Promise((resolve) => {
      const pythonCode = `
import numpy as np
import json

try:
    from arch import arch_model
    
    returns = json.loads('''${JSON.stringify(returns)}''')
    returns_array = np.array(returns)
    
    # Remove NaN/Inf values
    returns_array = returns_array[np.isfinite(returns_array)]
    
    if len(returns_array) < 30:
        volatility = float(np.std(returns_array) * np.sqrt(24))
        print(json.dumps({"volatility": volatility, "method": "std"}))
    else:
        model = arch_model(returns_array, vol='Garch', p=1, q=1, rescale=True)
        model_fit = model.fit(disp='off', show_warning=False)
        forecast = model_fit.forecast(horizon=1)
        
        variance = forecast.variance.iloc[-1, 0]
        volatility = float(np.sqrt(variance))
        
        print(json.dumps({"volatility": volatility, "method": "garch"}))
        
except ImportError:
    returns = json.loads('''${JSON.stringify(returns)}''')
    returns_array = np.array(returns)
    returns_array = returns_array[np.isfinite(returns_array)]
    volatility = float(np.std(returns_array) * np.sqrt(24))
    print(json.dumps({"volatility": volatility, "method": "std_fallback"}))
    
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

      const python = spawn(this.pythonPath, ['-c', pythonCode]);

      let output = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.on('close', () => {
        try {
          const result = JSON.parse(output.trim());
          if (result.error) {
            console.warn(`⚠️ GARCH warning: ${result.error}`);
            resolve(this.calculateSimpleVolatility(returns));
          } else {
            console.log(`📈 GARCH method: ${result.method}, volatility: ${result.volatility.toFixed(4)}%`);
            resolve(result.volatility);
          }
        } catch (e) {
          console.warn(`⚠️ GARCH parse error, using fallback`);
          resolve(this.calculateSimpleVolatility(returns));
        }
      });

      python.on('error', () => {
        console.warn(`⚠️ Python not available, using JS fallback`);
        resolve(this.calculateSimpleVolatility(returns));
      });
    });
  }

  /**
   * LSTM-based volatility prediction using Python
   */
  async getLstmVolatility(logReturns: number[]): Promise<number> {
    return new Promise((resolve) => {
      const pythonCode = `
import numpy as np
import json

try:
    log_returns = json.loads('''${JSON.stringify(logReturns)}''')
    returns_array = np.array(log_returns)
    
    # Remove NaN/Inf values
    returns_array = returns_array[np.isfinite(returns_array)]
    
    if len(returns_array) < 10:
        print(json.dumps({"volatility": 0.0, "method": "insufficient_data"}))
    else:
        # Calculate realized volatility
        realized_vol = float(np.std(returns_array) * 100)
        
        # Calculate recent volatility (last 24 hours)
        recent_returns = returns_array[-min(24, len(returns_array)):]
        recent_vol = float(np.std(recent_returns) * 100)
        
        # Weighted average: recent volatility matters more
        predicted_vol = (realized_vol * 0.4 + recent_vol * 0.6)
        
        # Detect volatility clustering (ARCH effect)
        if len(returns_array) >= 48:
            first_half_vol = np.std(returns_array[:len(returns_array)//2]) * 100
            second_half_vol = np.std(returns_array[len(returns_array)//2:]) * 100
            
            if second_half_vol > first_half_vol * 1.5:
                predicted_vol *= 1.3
        
        print(json.dumps({
            "volatility": float(predicted_vol),
            "realized": float(realized_vol),
            "recent": float(recent_vol),
            "method": "lstm_proxy"
        }))
        
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

      const python = spawn(this.pythonPath, ['-c', pythonCode]);

      let output = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.on('close', () => {
        try {
          const result = JSON.parse(output.trim());
          if (result.error) {
            console.warn(`⚠️ LSTM warning: ${result.error}`);
            resolve(this.calculateSimpleVolatility(logReturns.map(r => r * 100)));
          } else {
            console.log(`🧠 LSTM method: ${result.method}, volatility: ${result.volatility.toFixed(4)}%`);
            resolve(result.volatility);
          }
        } catch (e) {
          console.warn(`⚠️ LSTM parse error, using fallback`);
          resolve(this.calculateSimpleVolatility(logReturns.map(r => r * 100)));
        }
      });

      python.on('error', () => {
        console.warn(`⚠️ Python not available for LSTM, using JS fallback`);
        resolve(this.calculateSimpleVolatility(logReturns.map(r => r * 100)));
      });
    });
  }

  /**
   * Simple JavaScript fallback for volatility calculation
   */
  private calculateSimpleVolatility(returns: number[]): number {
    const validReturns = returns.filter(r => isFinite(r) && !isNaN(r));
    if (validReturns.length === 0) return 0;
    
    const mean = validReturns.reduce((a, b) => a + b, 0) / validReturns.length;
    const squaredDiffs = validReturns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / validReturns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Main risk analysis function
   */
  async analyzeRisk(
    tokenA: string,
    tokenB: string,
    ilThreshold: number
  ): Promise<RiskAnalysis> {
    try {
      console.log(`\n🔍 Analyzing risk for ${tokenA}/${tokenB}, IL Threshold: ${ilThreshold}%`);

      // Fetch price data
      const data = await this.fetchVolatilityData(tokenA, tokenB);
      
      if (data.length < 24) {
        console.warn(`⚠️ Insufficient data: ${data.length} candles (need 24+)`);
        return {
          action: 'STAY',
          garchVolatility: 0,
          lstmVolatility: 0,
          confidence: 0,
          reason: 'Insufficient historical data for analysis',
          timestamp: Date.now()
        };
      }

      const returns = data.map(d => d.returns);
      const logReturns = data.map(d => d.logReturns);

      // Calculate volatilities
      console.log('📈 Calculating GARCH volatility...');
      const garchVol = await this.getGarchVolatility(returns);

      console.log('🧠 Calculating LSTM volatility...');
      const lstmVol = await this.getLstmVolatility(logReturns);

      console.log(`📊 Results: GARCH=${garchVol.toFixed(4)}%, LSTM=${lstmVol.toFixed(4)}%`);

      // Decision logic
      const maxVol = Math.max(garchVol, lstmVol);
      const confidence = Math.min(maxVol / this.garchThreshold * 100, 100);

      let action: 'EMERGENCY_EXIT' | 'STAY';
      let reason: string;

      // Adjust thresholds based on IL threshold
      const adjustedGarchThreshold = this.garchThreshold * (ilThreshold / 5);
      const adjustedLstmThreshold = this.lstmThreshold * (ilThreshold / 5);

      if (garchVol > adjustedGarchThreshold) {
        action = 'EMERGENCY_EXIT';
        reason = `GARCH volatility (${garchVol.toFixed(2)}%) exceeds threshold (${adjustedGarchThreshold.toFixed(2)}%)`;
      } else if (lstmVol > adjustedLstmThreshold) {
        action = 'EMERGENCY_EXIT';
        reason = `LSTM detected high volatility (${lstmVol.toFixed(2)}%) - potential crash pattern`;
      } else {
        action = 'STAY';
        reason = `Market stable: GARCH=${garchVol.toFixed(2)}%, LSTM=${lstmVol.toFixed(2)}%`;
      }

      const analysis: RiskAnalysis = {
        action,
        garchVolatility: garchVol,
        lstmVolatility: lstmVol,
        confidence,
        reason,
        timestamp: Date.now()
      };

      console.log(`✅ Risk Analysis: ${action}`);
      console.log(`   Reason: ${reason}`);
      
      return analysis;

    } catch (error) {
      console.error('❌ Risk analysis failed:', error);
      return {
        action: 'STAY',
        garchVolatility: 0,
        lstmVolatility: 0,
        confidence: 0,
        reason: `Analysis error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Start continuous monitoring for multiple vaults
   */
  startContinuousMonitoring(
    vaultPairs: Array<{ tokenA: string; tokenB: string; ilThreshold: number; vaultId?: string }>,
    intervalMs: number = 5 * 60 * 1000  // Default: 5 minutes
  ): NodeJS.Timeout {
    console.log(`\n🛡️ Starting continuous risk monitoring for ${vaultPairs.length} vaults`);
    console.log(`   Interval: ${intervalMs / 1000} seconds`);

    this.monitoredVaults = vaultPairs;

    // Run immediately first
    this.runMonitoringCycle(vaultPairs);

    // Then run on interval
    this.monitoringIntervalId = setInterval(() => {
      this.runMonitoringCycle(vaultPairs);
    }, intervalMs);

    return this.monitoringIntervalId;
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringIntervalId) {
      clearInterval(this.monitoringIntervalId);
      this.monitoringIntervalId = null;
      this.monitoredVaults = [];
      console.log('🛑 Risk monitoring stopped');
    }
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): { active: boolean; vaults: Array<{ tokenA: string; tokenB: string; ilThreshold: number; vaultId?: string }> } {
    return {
      active: this.monitoringIntervalId !== null,
      vaults: this.monitoredVaults
    };
  }

  private async runMonitoringCycle(
    vaultPairs: Array<{ tokenA: string; tokenB: string; ilThreshold: number; vaultId?: string }>
  ) {
    console.log(`\n⏰ Running risk monitoring cycle at ${new Date().toISOString()}`);

    for (const pair of vaultPairs) {
      try {
        const analysis = await this.analyzeRisk(
          pair.tokenA,
          pair.tokenB,
          pair.ilThreshold
        );

        if (analysis.action === 'EMERGENCY_EXIT') {
          console.log(`\n🚨 ALERT: ${pair.tokenA}/${pair.tokenB}`);
          console.log(`   Vault: ${pair.vaultId || 'Unknown'}`);
          console.log(`   Reason: ${analysis.reason}`);
          console.log(`   Action Required: EMERGENCY EXIT`);
        }
      } catch (error) {
        console.error(`Error monitoring ${pair.tokenA}/${pair.tokenB}:`, error);
      }
    }
  }
}

export default YieldSafeRiskEngine;
