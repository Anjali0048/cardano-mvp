# Real IL Detection - API Requirements

## 🔗 **Required APIs for Real IL Detection:**

### 1. **Cardano DEX APIs** (Pool State Data)

#### Minswap API:
- **Mainnet:** `https://api.minswap.org/`
- **Preview/Testnet:** Limited API availability
- **Pool Data:** `/pools` endpoint for reserves, LP tokens, fees
- **Pool History:** `/pools/{pool_id}/history` for price changes

#### SundaeSwap API:
- **Mainnet:** `https://stats.sundaeswap.finance/api/`
- **Testnet:** Limited availability
- **Pool Data:** Pool reserves and statistics

#### WingRiders API:
- **Endpoint:** `https://aggregator.wingriders.com/`
- **Pool Data:** DEX aggregator data

### 2. **Cardano Price Oracles**

#### CoinGecko API (Free):
- **Endpoint:** `https://api.coingecko.com/api/v3/`
- **ADA Price:** `/simple/price?ids=cardano&vs_currencies=usd`
- **Token Prices:** `/simple/price?ids={token}&vs_currencies=usd`

#### Chainlink Price Feeds (On-Chain):
- **Cardano Integration:** Limited but growing
- **Real-time prices:** More reliable for production

#### DexHunter API:
- **Endpoint:** `https://api.dexhunter.io/`
- **Cardano Token Prices:** Live DEX price aggregation

### 3. **Blockfrost Extended APIs** (We already have this)

#### Pool UTxO Queries:
- **Current:** Already using for wallet/contract queries
- **Extended Use:** Query specific pool contract addresses
- **Pool Reserves:** Direct blockchain pool state

### 4. **Cardano DEX Aggregators**

#### TapTools API:
- **Endpoint:** `https://api.taptools.io/`
- **Pool Analytics:** Comprehensive pool data
- **Price History:** Token price movements

#### Cardano Analytics APIs:
- **Pool Performance:** APY calculations
- **Volume Data:** 24h trading volumes

### 5. **Real-Time WebSocket Feeds**

#### DEX Live Updates:
- **Pool State Changes:** Real-time reserve updates
- **Price Movements:** Live price feeds
- **IL Threshold Monitoring:** Instant notifications

## 🔧 **Implementation Priority:**

### Phase 1 (Immediate):
1. **CoinGecko API** - Free, reliable token prices
2. **Blockfrost Pool Queries** - Direct blockchain data
3. **Minswap API** - Major Cardano DEX

### Phase 2 (Advanced):
1. **TapTools API** - Professional analytics
2. **WebSocket Feeds** - Real-time monitoring
3. **Multiple DEX APIs** - Cross-DEX arbitrage detection

## 📋 **API Keys Needed:**

```env
# Free APIs (No key needed)
COINGECKO_API_URL=https://api.coingecko.com/api/v3/

# Paid APIs (Keys needed)
TAPTOOLS_API_KEY=your_taptools_key
DEXHUNTER_API_KEY=your_dexhunter_key

# Existing (We have this)
BLOCKFROST_API_KEY=previewbJdo19gLSsDoPQCpwoAY469vXcPNvtPM
```

## 🎯 **Which APIs do you want to start with?**

1. **Free Option:** CoinGecko + Blockfrost (basic IL detection)
2. **Professional:** TapTools + DEX APIs (advanced IL monitoring)
3. **Comprehensive:** All APIs (production-ready system)