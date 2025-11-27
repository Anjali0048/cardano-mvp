// EMERGENCY IL CALCULATION DEBUG AND FIX
// Finding out why we're getting 99.99% IL nonsense

import { RealILCalculator } from './realILCalculator.js'

async function debugILCalculation() {
  console.log('🚨 EMERGENCY IL DEBUG SESSION')
  console.log('═════════════════════════════════════════')
  
  try {
    const calculator = new RealILCalculator()
    
    // Step 1: Get REAL current prices
    console.log('\n📊 Step 1: Get Current Real Prices')
    const poolData = await calculator.getPoolDataFromCharli3('SNEK', 'DJED', 'MinswapV2')
    const currentPrice = poolData.price
    console.log(`✅ Current SNEK/DJED price: ${currentPrice}`)
    
    // Step 2: Create REALISTIC entry price (not from 1 year ago!)
    console.log('\n📊 Step 2: Create Realistic Entry Price')
    
    // Simulate user deposited 1 day ago when price was slightly different
    const realistic_price_change = 0.95 // 5% price decrease since entry
    const entryPrice = currentPrice / realistic_price_change
    
    console.log(`Entry Price (simulated 1 day ago): ${entryPrice.toFixed(8)}`)
    console.log(`Current Price (now): ${currentPrice.toFixed(8)}`)
    console.log(`Price Change: ${((currentPrice - entryPrice) / entryPrice * 100).toFixed(2)}%`)
    
    // Step 3: Manual IL Calculation with PROPER formula
    console.log('\n🧮 Step 3: Manual IL Calculation')
    
    // For AMM constant product: x * y = k
    // IL = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
    
    const priceRatio = currentPrice / entryPrice
    console.log(`Price Ratio: ${priceRatio.toFixed(6)}`)
    
    // Manual IL calculation
    const sqrtRatio = Math.sqrt(priceRatio)
    const il_formula1 = (2 * sqrtRatio) / (1 + priceRatio) - 1
    
    console.log(`\n🔢 IL Calculation Steps:`)
    console.log(`  Price Ratio: ${priceRatio}`)
    console.log(`  Sqrt(ratio): ${sqrtRatio}`)
    console.log(`  IL Formula: 2 * sqrt(${priceRatio}) / (1 + ${priceRatio}) - 1`)
    console.log(`  IL Result: ${il_formula1.toFixed(6)} (${(il_formula1 * 100).toFixed(2)}%)`)
    
    // Step 4: Alternative IL calculation method
    console.log('\n🔄 Step 4: Alternative Method')
    
    // Hodl value: what user would have by holding tokens
    const token_a_amount = 100000 // SNEK
    const token_b_amount = 150    // DJED
    
    // Entry values
    const entryValueA = token_a_amount * entryPrice
    const entryValueB = token_b_amount * 1.0 // DJED = $1
    const totalEntryValue = entryValueA + entryValueB
    
    // Current hodl values
    const currentValueA = token_a_amount * currentPrice  
    const currentValueB = token_b_amount * 1.0
    const currentHodlValue = currentValueA + currentValueB
    
    // LP value (simplified constant product)
    const k = token_a_amount * token_b_amount // constant product
    const newAmountA = Math.sqrt(k / priceRatio)
    const newAmountB = Math.sqrt(k * priceRatio)
    const lpValue = (newAmountA * currentPrice) + (newAmountB * 1.0)
    
    const il_method2 = (lpValue - currentHodlValue) / currentHodlValue
    
    console.log(`\n💰 Value Comparison:`)
    console.log(`  Entry Total Value: $${totalEntryValue.toFixed(2)}`)
    console.log(`  Current Hodl Value: $${currentHodlValue.toFixed(2)}`)
    console.log(`  Current LP Value: $${lpValue.toFixed(2)}`)
    console.log(`  IL (Method 2): ${(il_method2 * 100).toFixed(2)}%`)
    
    // Step 5: Test with extreme price changes
    console.log('\n⚠️  Step 5: Testing Extreme Scenarios')
    
    const extremeScenarios = [
      { name: "2x price increase", ratio: 2.0 },
      { name: "50% price decrease", ratio: 0.5 },
      { name: "10x price pump", ratio: 10.0 },
      { name: "90% crash", ratio: 0.1 }
    ]
    
    for (const scenario of extremeScenarios) {
      const ratio = scenario.ratio
      const il = (2 * Math.sqrt(ratio)) / (1 + ratio) - 1
      console.log(`  ${scenario.name}: ${(il * 100).toFixed(1)}% IL`)
      
      if (Math.abs(il) > 0.5) {
        console.log(`    🚨 This would trigger 99.99% IL - FOUND THE BUG!`)
      }
    }
    
    // Step 6: Compare with what our current system returns
    console.log('\n🔍 Step 6: Current System IL Calculation')
    
    const userPosition = {
      token_a_amount: 100000,
      token_b_amount: 150,
      lp_tokens: 100,
      initial_price: entryPrice,
      deposit_timestamp: Date.now() - 86400000
    }
    
    const systemResult = await calculator.calculateRealIL(userPosition, poolData)
    
    console.log(`\n📊 System vs Manual Comparison:`)
    console.log(`  Manual IL: ${(il_formula1 * 100).toFixed(2)}%`)
    console.log(`  System IL: ${systemResult.ilPercentage.toFixed(2)}%`)
    console.log(`  Difference: ${Math.abs(il_formula1 * 100 - systemResult.ilPercentage).toFixed(2)}%`)
    
    if (Math.abs(systemResult.ilPercentage) > 50) {
      console.log(`\n🚨 FOUND THE BUG: System IL is ${systemResult.ilPercentage}%`)
      console.log(`🔧 This means there's a bug in calculateRealIL() method`)
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugILCalculation().catch(console.error)