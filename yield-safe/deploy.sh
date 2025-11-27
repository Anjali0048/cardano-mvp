#!/bin/bash

# Yield Safe Contract Deployment Script
# Deploys vault validator to Cardano Preview Testnet

set -e

echo "🚀 Starting Yield Safe Contract Deployment..."

# Configuration
NETWORK="--testnet-magic 2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_DIR="/home/sriranjini/cardano-mvp/yield-safe/contracts"
BUILD_DIR="${CONTRACT_DIR}/build"
DEPLOYMENT_DIR="${SCRIPT_DIR}/deployment"

# Create deployment directory
mkdir -p "$DEPLOYMENT_DIR"

echo "📁 Setup completed. Build dir: $BUILD_DIR"

# Check if plutus.json exists
if [ ! -f "${CONTRACT_DIR}/plutus.json" ]; then
    echo "❌ plutus.json not found. Building contracts first..."
    cd "$CONTRACT_DIR"
    aiken build
fi

echo "✅ Plutus scripts found"

# Change to contracts directory
cd "$CONTRACT_DIR"

# Extract validator information from plutus.json
echo "🔍 Generating validator address..."
VALIDATOR_ADDRESS=$(aiken blueprint address --validator vault.vault_validator 2>/dev/null | head -1)
echo "🏠 Vault Validator Address: $VALIDATOR_ADDRESS"

# Save the address for later use
echo "$VALIDATOR_ADDRESS" > "$DEPLOYMENT_DIR/vault_address.txt"

# Generate script hash
echo "🔍 Generating script hash..."
SCRIPT_HASH=$(aiken blueprint hash --validator vault.vault_validator 2>/dev/null | head -1)
echo "🔑 Script Hash: $SCRIPT_HASH"
echo "$SCRIPT_HASH" > "$DEPLOYMENT_DIR/script_hash.txt"

# Save deployment info
cat > "$DEPLOYMENT_DIR/deployment_info.json" << EOF
{
  "network": "preview",
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contracts": {
    "vault_validator": {
      "address": "$VALIDATOR_ADDRESS",
      "script_hash": "$SCRIPT_HASH"
    }
  }
}
EOF

echo "✅ Contract information generated successfully!"
echo "📋 Deployment Summary:"
echo "   Network: Preview Testnet"
echo "   Vault Address: $VALIDATOR_ADDRESS"
echo "   Script Hash: $SCRIPT_HASH"
echo ""
echo "💾 Files created:"
echo "   - $DEPLOYMENT_DIR/vault_address.txt"
echo "   - $DEPLOYMENT_DIR/script_hash.txt" 
echo "   - $DEPLOYMENT_DIR/deployment_info.json"
echo ""
echo "🎯 Next Steps:"
echo "1. Update your .env files with the real vault address"
echo "2. Test contract interactions with real testnet"
echo "3. Fund the script address for testing"

# Update the keeper bot config with real address
if [ -f "/home/sriranjini/cardano-mvp/yield-safe/keeper-bot/.env" ]; then
    echo "🔧 Updating keeper bot configuration..."
    sed -i "s/VAULT_VALIDATOR_ADDRESS=.*/VAULT_VALIDATOR_ADDRESS=$VALIDATOR_ADDRESS/" /home/sriranjini/cardano-mvp/yield-safe/keeper-bot/.env
    echo "✅ Keeper bot .env updated with real contract address"
fi

echo "🎉 Deployment preparation complete!"