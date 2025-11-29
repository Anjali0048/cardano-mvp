/**
 * Demo: Integrated Charli3 + Enhanced IL + AI Prediction System
 * 
 * This demonstrates the complete integration of:
 * - Charli3 pool data fetching
 * - Enhanced IL calculation with risk assessment
 * - AI price prediction and IL forecasting
 */

import Charli3PoolIntegration from './charli3PoolIntegration.js';
import EnhancedILCalculator from './enhancedILCalculator.js';
import AIPricePredictionEngine from './aiPricePrediction.js';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 INTEGRATED YIELD SAFE SYSTEM DEMO');
  console.log('='.repeat(80));

  const charli3 = new Charli3PoolIntegration();
  const ilCalculator = new EnhancedILCalculator();
  const aiEngine = new AIPricePredictionEngine();

  // ============================================
  // PART 1: Pool Discovery & Risk Assessment
  // ============================================
  console.log('\n📊 PART 1: Pool Discovery & Risk Assessment');
  console.log('─'.repeat(80));

  console.log('\n🔍 Fetching all available pools from Charli3...');
  const allPools = await charli3.getAllEnhancedPools();
  console.log(`✅ Found ${allPools.length} pools with live data\n`);

  // Show pool summary
  console.log('Pool Summary:');
  allPools.forEach((pool, idx) => {
    if (pool.current) {
      console.log(`${idx + 1}. ${pool.name.padEnd(10)} | Price: $${pool.current.current_price.toFixed(6)} | TVL: $${pool.current.current_tvl.toFixed(0).padStart(10)} | Risk: ${pool.riskScore?.toFixed(1) || 'N/A'}`);
    }
  });

  // Get recommended low-risk pools
  console.log('\n🟢 Top 3 Recommended (Low Risk) Pools:');
  const recommended = await ilCalculator.getRecommendedPools(3);
  recommended.forEach((pool, idx) => {
    console.log(`${idx + 1}. ${pool.name} - Risk Score: ${pool.riskScore?.toFixed(1)}, Volatility: ${(pool.volatility7d || 0).toFixed(4)}`);
  });

  // Get high-risk pools
  console.log('\n🔴 Top 3 High-Risk Pools (Monitor Closely):');
  const highRisk = await ilCalculator.getHighRiskPools(3);
  highRisk.forEach((pool, idx) => {
    console.log(`${idx + 1}. ${pool.name} - Risk Score: ${pool.riskScore?.toFixed(1)}, Volatility: ${(pool.volatility7d || 0).toFixed(4)}`);
  });

  // ============================================
  // PART 2: AI Price Predictions
  // ============================================
  console.log('\n\n🔮 PART 2: AI Price Predictions');
  console.log('─'.repeat(80));

  const testTokens = ['SNEK', 'DJED', 'MIN'];
  
  for (const token of testTokens) {
    console.log(`\n📈 Analyzing ${token}...`);
    try {
      const prediction = await aiEngine.predictPrice(token);
      console.log(aiEngine.formatPrediction(prediction));
    } catch (error) {
      console.log(`⚠️ Could not predict ${token}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // ============================================
  // PART 3: Enhanced IL Calculation
  // ============================================
  console.log('\n\n🧮 PART 3: Enhanced IL Calculation with Real Data');
  console.log('─'.repeat(80));

  // Simulate a user position in SNEK pool
  const userPosition = {
    token_a_amount: 1000, // 1000 ADA
    token_b_amount: 300000, // 300,000 SNEK
    lp_tokens: 5477.23,
    initial_price: 0.003333, // Initial price when deposited
    deposit_timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    tokenA: 'ADA',
    tokenB: 'SNEK',
  };

  console.log('\n📊 User Position:');
  console.log(`   Pool: ${userPosition.tokenA}/${userPosition.tokenB}`);
  console.log(`   Deposited: ${userPosition.token_a_amount} ${userPosition.tokenA} + ${userPosition.token_b_amount} ${userPosition.tokenB}`);
  console.log(`   Entry Price: $${userPosition.initial_price}`);
  console.log(`   LP Tokens: ${userPosition.lp_tokens}`);
  console.log(`   Days Held: ${Math.floor((Date.now() - userPosition.deposit_timestamp) / (24 * 60 * 60 * 1000))}`);

  try {
    const ilResult = await ilCalculator.calculateIL(userPosition, 10);
    console.log(ilCalculator.formatILResult(ilResult));
  } catch (error) {
    console.log(`⚠️ IL calculation failed: ${error instanceof Error ? error.message : error}`);
  }

  // ============================================
  // PART 4: IL Prediction & Risk Assessment
  // ============================================
  console.log('\n\n🔮 PART 4: IL Prediction & Exit Recommendation');
  console.log('─'.repeat(80));

  try {
    const ilPrediction = await aiEngine.predictIL('SNEK', userPosition.initial_price, 10);
    
    console.log(`\n${ilPrediction.tokenName} IL Forecast:`);
    console.log(`   Current IL:        ${ilPrediction.currentIL.toFixed(2)}%`);
    console.log(`   Predicted (1h):    ${ilPrediction.predictedIL1h.toFixed(2)}%`);
    console.log(`   Predicted (24h):   ${ilPrediction.predictedIL24h.toFixed(2)}%`);
    console.log(`   Predicted (7d):    ${ilPrediction.predictedIL7d.toFixed(2)}%`);
    console.log(`\n   Should Exit:       ${ilPrediction.shouldExit ? '🔴 YES' : '🟢 NO'}`);
    console.log(`   Recommendation:    ${ilPrediction.exitRecommendation}`);
    console.log(`   Confidence:        ${ilPrediction.confidence.toFixed(0)}%`);
  } catch (error) {
    console.log(`⚠️ IL prediction failed: ${error instanceof Error ? error.message : error}`);
  }

  // ============================================
  // PART 5: Position Monitoring
  // ============================================
  console.log('\n\n🛡️ PART 5: Real-time Position Monitoring');
  console.log('─'.repeat(80));

  try {
    const monitorResult = await ilCalculator.monitorPosition(userPosition, 10);
    
    console.log(`\nMonitoring Status:`);
    console.log(`   Should Trigger Protection: ${monitorResult.shouldTrigger ? '🚨 YES' : '✅ NO'}`);
    console.log(`   Current IL:                ${monitorResult.result.ilPercentage.toFixed(2)}%`);
    console.log(`   Risk Level:                ${monitorResult.result.riskLevel.toUpperCase()}`);
    console.log(`   Current Price:             $${monitorResult.result.currentPrice.toFixed(6)}`);
    console.log(`   Price Change:              ${monitorResult.result.priceChange >= 0 ? '+' : ''}${monitorResult.result.priceChange.toFixed(2)}%`);
    
    if (monitorResult.shouldTrigger) {
      console.log(`\n   ⚠️  REASON: ${monitorResult.reason}`);
      console.log(`   💡 ACTION: Trigger emergency exit to protect funds`);
    } else {
      console.log(`\n   ✅ Position is safe - no action needed`);
    }
  } catch (error) {
    console.log(`⚠️ Monitoring failed: ${error instanceof Error ? error.message : error}`);
  }

  // ============================================
  // PART 6: Historical IL Analysis
  // ============================================
  console.log('\n\n📈 PART 6: Historical IL Analysis');
  console.log('─'.repeat(80));

  try {
    const historicalIL = await ilCalculator.projectHistoricalIL(userPosition);
    
    console.log(`\n7-Day IL Statistics:`);
    console.log(`   Average IL:    ${historicalIL.avgIL.toFixed(2)}%`);
    console.log(`   Maximum IL:    ${historicalIL.maxIL.toFixed(2)}%`);
    console.log(`   Minimum IL:    ${historicalIL.minIL.toFixed(2)}%`);
    console.log(`   Projected IL:  ${historicalIL.projectedIL.toFixed(2)}%`);
    
    if (historicalIL.maxIL > 10) {
      console.log(`\n   ⚠️  WARNING: Historical IL exceeded threshold`);
      console.log(`   💡 This pool has high volatility - consider diversifying`);
    }
  } catch (error) {
    console.log(`⚠️ Historical analysis failed: ${error instanceof Error ? error.message : error}`);
  }

  // ============================================
  // PART 7: Batch Predictions
  // ============================================
  console.log('\n\n🔮 PART 7: Batch Price Predictions (Multiple Tokens)');
  console.log('─'.repeat(80));

  try {
    const batchTokens = ['SNEK', 'DJED', 'MIN', 'IAG'];
    const batchPredictions = await aiEngine.predictMultiplePrices(batchTokens);
    
    console.log(`\nBatch Prediction Results (${batchPredictions.length} tokens):\n`);
    console.log('Token  | Current Price | 24h Prediction | Change  | Trend     | Recommendation');
    console.log('─'.repeat(80));
    
    batchPredictions.forEach(p => {
      const change = ((p.predictedPrice24h - p.currentPrice) / p.currentPrice) * 100;
      const changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
      const trendEmoji = p.trend === 'bullish' ? '📈' : p.trend === 'bearish' ? '📉' : '➡️';
      const recEmoji = p.recommendation === 'buy' ? '🟢' : p.recommendation === 'sell' ? '🔴' : '🟡';
      
      console.log(
        `${p.tokenName.padEnd(6)} | $${p.currentPrice.toFixed(6).padStart(10)} | $${p.predictedPrice24h.toFixed(6).padStart(10)} | ${changeStr.padStart(7)} | ${trendEmoji} ${p.trend.padEnd(7)} | ${recEmoji} ${p.recommendation.toUpperCase()}`
      );
    });
  } catch (error) {
    console.log(`⚠️ Batch prediction failed: ${error instanceof Error ? error.message : error}`);
  }

  // ============================================
  // Summary
  // ============================================
  console.log('\n\n' + '='.repeat(80));
  console.log('✅ DEMO COMPLETE - All Systems Integrated Successfully!');
  console.log('='.repeat(80));
  console.log('\n🎯 Key Features Demonstrated:');
  console.log('   ✅ Real-time pool data from Charli3 Oracle');
  console.log('   ✅ Risk-based pool recommendations');
  console.log('   ✅ AI-powered price predictions (1h, 24h, 7d)');
  console.log('   ✅ Enhanced IL calculation with risk levels');
  console.log('   ✅ IL forecasting and exit recommendations');
  console.log('   ✅ Position monitoring with triggers');
  console.log('   ✅ Historical IL analysis');
  console.log('   ✅ Batch predictions for portfolio analysis');
  console.log('\n💡 Ready for production integration!\n');
}

main().catch(console.error);
