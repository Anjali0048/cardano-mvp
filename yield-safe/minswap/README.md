# Minswap Withdrawal Integration - Quick Start Guide

## 🎯 What This Does

Enables users to convert LP tokens back to underlying assets (ADA + tokens) after emergency exit from Yield Safe vaults.

## 🏗️ Architecture

```
Vault Exit → User Wallet (LP) → Minswap Order → Batcher → User Wallet (ADA + Tokens)
```

## 🚀 Quick Start

### 1. Start the Backend
```bash
cd yield-safe/keeper-bot
npm start
```

### 2. Start the Frontend
```bash
cd yield-safe/frontend
npm run dev
```

### 3. Test the Integration
```bash
cd yield-safe
./test-withdrawal.sh
```

## 📖 User Flow

### Step 1: Emergency Exit
1. Navigate to **Vault Management**
2. Find your vault
3. Click **🚨 Emergency Exit**
4. Wallet prompts for signature
5. Sign transaction
6. LP tokens → your wallet ✅

### Step 2: Create Withdraw Order (Automatic)
1. System prompts: "Create withdraw order?"
2. Click "Yes"
3. Review min amounts (slippage protection)
4. Wallet prompts for signature
5. Sign transaction
6. Order created ✅

### Step 3: Wait for Batcher Processing
- Minswap batchers scan for orders (offchain)
- Processing time: 5-30 minutes
- Order converts: LP → ADA + tokens
- Assets appear in your wallet ✅

## 🔧 API Endpoints

### Create Withdraw Order
```bash
POST /api/minswap/withdraw-order

{
  "lpAsset": { "policyId": "...", "tokenName": "..." },
  "lpAmount": "100000000",
  "reserveA": "10000000000",
  "reserveB": "15000000000",
  "totalLiquidity": "12247448714",
  "userAddress": "addr_test1...",
  "slippage": 0.02
}
```

## 📊 Slippage Protection

| Mode | Slippage | Use Case |
|------|----------|----------|
| Emergency | 2% | Fast exit needed |
| Normal | 1% | Balanced approach |
| Conservative | 0.5% | Best price execution |

## 🔐 Security

- ✅ User always controls private keys
- ✅ Slippage protection on all orders
- ✅ Killable orders (fail safely)
- ✅ Emergency flag validation
- ✅ Owner signature required

## 🌐 Network Config

### Preprod (Active)
```
Order: addr_test1wrdf2f2x8pq3wwk3yv936ksmt59rz94mm66yzge8zj9pk7s0kjph3
LP Policy: d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b
Fee: 2 ADA
```

### Mainnet (Ready)
Update addresses from: `minswap-dex-v2/deployed/mainnet/script.json`

## 📁 Key Files

### New Files
- `keeper-bot/src/minswap/minswapWithdraw.ts` - Core logic
- `WITHDRAWAL_IMPLEMENTATION.md` - Full documentation
- `WITHDRAWAL_SUMMARY.md` - Implementation summary
- `test-withdrawal.sh` - Test script

### Modified Files
- `keeper-bot/src/apiServer.ts` - API endpoint
- `frontend/src/pages/VaultManagement.tsx` - UI flow
- `keeper-bot/src/keeper/keeper-bot.ts` - Keeper integration

## ✅ Testing Checklist

- [ ] API server starts without errors
- [ ] Test script passes
- [ ] Emergency exit works in frontend
- [ ] Withdraw order created successfully
- [ ] Order datum is valid PlutusV2
- [ ] Slippage calculations correct
- [ ] Error handling works

## 🐛 Troubleshooting

### "API server not running"
```bash
cd keeper-bot && npm start
```

### "No UTXOs found"
- Vault already exited
- Check network (Preprod vs Mainnet)
- Verify vault address

### "Order creation failed"
- Check LP token balance
- Increase slippage tolerance
- Verify pool reserves

### "Batcher not processing"
- Normal wait time: 5-30 minutes
- Check Minswap status
- Verify order is on-chain

## 📚 Documentation

- **Quick Start**: This file
- **Full Guide**: `WITHDRAWAL_IMPLEMENTATION.md`
- **Summary**: `WITHDRAWAL_SUMMARY.md`
- **Minswap Specs**: `../minswap-dex-v2/amm-v2-docs/`

## 🎯 Next Steps

### For Testing
1. Run test script: `./test-withdrawal.sh`
2. Test in UI: Emergency exit flow
3. Verify on-chain: Check transactions
4. Monitor batchers: Wait for processing

### For Development
1. Add unit tests
2. Implement order tracking
3. Add keeper delegation
4. Optimize for mainnet

## 🆘 Support

- Check logs: `keeper-bot` console
- Browser console: Frontend errors
- API errors: Response messages
- Blockchain: CardanoScan (Preprod)

## 📊 Status

**Implementation**: ✅ Complete
**Testing**: 🧪 Ready
**Documentation**: 📚 Complete
**Production**: 🚀 Preprod Ready

---

**Last Updated**: November 28, 2025
**Version**: 1.0.0
