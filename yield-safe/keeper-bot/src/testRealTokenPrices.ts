// Test real token price fetching directly
import { RealILCalculator } from './realILCalculator.js'

async function testRealTokenPrices() {
  console.log('🧪 Testing REAL Token Price Fetching')
  console.log('═══════════════════════════════════════')
  
  try {
    const calculator = new RealILCalculator()
    
    // Test individual token prices
    console.log('\n1️⃣ Testing Individual Token Prices...')
    
    const testTokens = ['SNEK', 'DJED', 'AGIX', 'ADA', 'C3']
    
    for (const token of testTokens) {
      try {
        console.log(`\n🔍 Fetching ${token} price...`)
        const priceData = await calculator['fetchTokenPrice'](token)
        
        if (priceData) {
          console.log(`✅ ${token}: $${priceData.price} (timestamp: ${new Date(priceData.timestamp).toISOString()})`)
        } else {
          console.log(`❌ ${token}: No real price available`)
        }
      } catch (error) {
        console.log(`❌ ${token}: Error - ${error}`)
      }
    }
    
    // Test pool data with real prices
    console.log('\n2️⃣ Testing Pool Data with Real Token Prices...')
    
    const poolData = await calculator.getPoolDataFromCharli3('ADA', 'SNEK', 'MinswapV2')
    
    console.log('📊 Pool Data Result:')
    console.log('   Pair:', poolData.pair)
    console.log('   Price:', poolData.price)
    console.log('   Source:', poolData.price === 300 ? 'Estimated' : 'Real API')
    console.log('   TVL:', poolData.tvl)
    console.log('   Timestamp:', new Date(poolData.timestamp).toISOString())
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
  
  console.log('\n🎯 Real Token Price Test Complete!')
  console.log('═══════════════════════════════════════')
}

// Run the test
testRealTokenPrices().catch(console.error)