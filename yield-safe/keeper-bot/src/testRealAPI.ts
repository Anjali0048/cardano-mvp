// Real Charli3 API integration test following the correct API pattern

const API_KEY = 'cta_XwETKtC3MeGDZL2CYbZ9Ju6Ac9P2UcPf6iVGGQlf6A7nR0hz7vXVR6UWBujmnZKE'
const BASE_URL = 'https://api.charli3.io/api/v1'

async function testRealAPI() {
  console.log('🧪 Testing REAL Charli3 Trading Pair API')
  console.log('═══════════════════════════════════════')
  
  try {
    // Step 1: Get a list of available groups (following your example)
    console.log('\n1️⃣ Getting Available Groups...')
    const groupsResponse = await fetch(`${BASE_URL}/groups`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    })
    const groupsData = await groupsResponse.json() as any
    
    // Extract groups array from the response structure
    const groups = groupsData?.d?.groups || groupsData?.groups || groupsData || []
    console.log(`✅ Found ${groups.length} Groups:`)
    
    const groupNames = groups.map((group: any) => group.id || group.name || group)
    groupNames.forEach((name: string) => {
      console.log(`   📊 ${name}`)
    })

    // Step 2: For each group get the list of available pairs (following your pattern)
    console.log('\n2️⃣ Getting Trading Pairs by Group...')
    const symbols: Record<string, any> = {}
    
    // Focus on the main DEX groups
    const targetGroups = ['MinswapV2', 'Minswap', 'SundaeSwap']
      .filter(groupName => groupNames.includes(groupName))
    
    for (const groupName of targetGroups.slice(0, 2)) { // Test first 2 groups
      console.log(`\n📈 Fetching ${groupName} pairs...`)
      
      const url = new URL(`${BASE_URL}/symbol_info`)
      url.searchParams.append('group', groupName)
      
      const pairsResponse = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      })
      
      const pairsData = await pairsResponse.json() as any
      symbols[groupName] = pairsData
      
      // Extract pairs from response (could be in 'd' property or direct)
      const pairs = pairsData?.d || pairsData || {}
      console.log(`   ✅ ${groupName}: ${Object.keys(pairs).length} pairs`)
      
      // Show structure of first few pairs
      const samplePairs = Object.entries(pairs).slice(0, 3)
      console.log(`   📊 Sample pairs:`)
      samplePairs.forEach(([symbol, info]) => {
        const infoStr = typeof info === 'object' ? JSON.stringify(info).slice(0, 100) : String(info)
        console.log(`      "${symbol}": ${infoStr}...`)
      })
      
      // Look for ADA-related pairs in this group
      const adaPairs = Object.entries(pairs).filter(([symbol, info]: [string, any]) => {
        const symbolHasAda = symbol.toLowerCase().includes('ada')
        const descHasAda = info && typeof info === 'object' && 
          info.description && info.description.toLowerCase().includes('ada')
        return symbolHasAda || descHasAda
      })
      
      if (adaPairs.length > 0) {
        console.log(`   🚀 Found ${adaPairs.length} ADA pairs in ${groupName}:`)
        adaPairs.slice(0, 3).forEach(([symbol, info]: [string, any]) => {
          const desc = info?.description || 'ADA pair'
          console.log(`      ${symbol}: ${desc}`)
        })
      }
    }

    // Step 3: Test getting current price using real trading pair symbols
    console.log('\n3️⃣ Testing Current Price Endpoint with Real Symbols...')
    
    // Use actual symbols found from the trading pairs
    let testSymbolsFound: string[] = []
    
    // Collect real symbols from all groups
    Object.entries(symbols).forEach(([groupName, groupData]) => {
      const pairs = groupData?.d || groupData || {}
      const groupSymbols = Object.keys(pairs).slice(0, 2) // Get first 2 from each group
      testSymbolsFound.push(...groupSymbols)
    })
    
    console.log(`🔍 Testing prices for ${testSymbolsFound.length} real trading pairs...`)
    
    let pricesFound = 0
    for (const realSymbol of testSymbolsFound.slice(0, 5)) { // Test first 5
      try {
        const priceResponse = await fetch(`${BASE_URL}/current?symbol=${realSymbol}`, {
          headers: { 'Authorization': `Bearer ${API_KEY}` }
        })
        
        if (priceResponse.ok) {
          const priceData = await priceResponse.json() as any
          const price = priceData?.d?.price || priceData?.price || priceData?.c?.[0]
          
          if (price && typeof price === 'number') {
            console.log(`💰 REAL PRICE: ${realSymbol} = ${price}`)
            pricesFound++
          } else {
            console.log(`📊 ${realSymbol}: No price data structure`)
          }
        } else {
          console.log(`⚠️  ${realSymbol}: HTTP ${priceResponse.status}`)
        }
      } catch (error) {
        console.log(`❌ ${realSymbol}: ${error instanceof Error ? error.message : error}`)
      }
    }
    
    console.log(`✅ Found ${pricesFound} real prices out of ${testSymbolsFound.slice(0, 5).length} tested`)

    // Step 4: Test real token price fetching using policy IDs
    console.log('\n4️⃣ Testing Real Token Prices via Policy IDs...')
    
    const testTokens = {
      'SNEK': '279c909f348e533da5808898f87f9a14bb2c3dfbbacccd631d927a3f534e454b',
      'DJED': '8db269c3ec630e06ae29f74bc39edd1f87c819f1056206e879a1cd61446a65644d6963726f555344',
      'AGIX': 'f43a62fdc3965df486de8a0d32fe800963589c41b38946602a0dc53541474958'
    }
    
    let realPricesFound = 0
    for (const [tokenName, policyId] of Object.entries(testTokens)) {
      try {
        const url = new URL(`${BASE_URL}/tokens/current`)
        url.searchParams.append('policy', policyId)
        
        const response = await fetch(url.toString(), {
          headers: { 'Authorization': `Bearer ${API_KEY}` }
        })
        
        if (response.ok) {
          const data = await response.json() as any
          const price = data.c?.[0] || data.price || data.current_price
          
          if (price && typeof price === 'number') {
            console.log(`💰 ${tokenName}: $${price} (REAL PRICE!)`)
            realPricesFound++
          } else {
            console.log(`⚠️  ${tokenName}: No price in response`)
          }
        } else {
          console.log(`❌ ${tokenName}: HTTP ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ ${tokenName}: ${error instanceof Error ? error.message : error}`)
      }
    }
    
    console.log(`✅ Real token prices found: ${realPricesFound}/${Object.keys(testTokens).length}`)

    // Summary of real data collected
    console.log('\n🎯 Charli3 REAL API Integration Complete!')
    console.log('📊 Summary:')
    console.log(`   • ${groupNames.length} DEX groups connected`)
    console.log(`   • ${Object.keys(symbols).length} exchanges with trading pairs`)
    console.log(`   • ${Object.values(symbols).reduce((total, groupData) => total + Object.keys(groupData?.d || groupData || {}).length, 0)} total trading pairs`)
    console.log('   • Real trading pair price testing completed')
    console.log('   • Real token price fetching via policy IDs tested')
    console.log('   • Ready for authentic IL calculations!')

  } catch (error) {
    console.error('❌ API test failed:', error)
  }

  console.log('═══════════════════════════════════════')
}

testRealAPI().catch(console.error)