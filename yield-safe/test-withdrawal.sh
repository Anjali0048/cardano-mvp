#!/bin/bash

# Test Minswap Withdraw Order Creation
# This script tests the new withdrawal endpoint

echo "🧪 Testing Minswap Withdrawal Integration"
echo "=========================================="
echo ""

# Check if API server is running
echo "1️⃣  Checking API server..."
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "❌ API server not running on port 3001"
    echo "   Start with: cd keeper-bot && npm start"
    exit 1
fi
echo "✅ API server is running"
echo ""

# Test withdraw order creation
echo "2️⃣  Testing withdraw order creation..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/minswap/withdraw-order \
  -H "Content-Type: application/json" \
  -d '{
    "lpAsset": {
      "policyId": "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
      "tokenName": "ADADJED"
    },
    "lpAmount": "100000000",
    "reserveA": "10000000000",
    "reserveB": "15000000000",
    "totalLiquidity": "12247448714",
    "userAddress": "addr_test1qp24252w7zl7396sy2rflzp5er9jk0atfz3gadc9vfl0dcl24252w7zl7396sy2rflzp5er9jk0atfz3gadc9vfl0dctaj8mj",
    "slippage": 0.02
  }')

# Check response
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Withdraw order created successfully"
    echo ""
    echo "📋 Response:"
    echo "$RESPONSE" | jq '.'
    echo ""
    
    # Extract key values
    MIN_A=$(echo "$RESPONSE" | jq -r '.minTokenA')
    MIN_B=$(echo "$RESPONSE" | jq -r '.minTokenB')
    ORDER_ADDR=$(echo "$RESPONSE" | jq -r '.orderAddress')
    
    echo "📊 Order Details:"
    echo "   Min Token A: $MIN_A lovelace"
    echo "   Min Token B: $MIN_B"
    echo "   Order Contract: $ORDER_ADDR"
    echo "   Batcher Fee: 2 ADA"
    echo ""
    
    echo "✅ All tests passed!"
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Test in frontend by clicking 'Emergency Exit'"
    echo "   2. Verify LP tokens transfer to wallet"
    echo "   3. Confirm withdraw order creation"
    echo "   4. Wait for Minswap batcher processing (5-30 min)"
    
else
    echo "❌ Withdraw order creation failed"
    echo "   Response: $RESPONSE"
    exit 1
fi
