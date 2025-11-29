/**
 * Centralized Network Configuration
 * This file manages all network-specific settings to ensure consistency
 * across backend and frontend, and make switching between preprod/mainnet easy.
 */

export enum NetworkName {
  PREPROD = 'preprod',
  PREVIEW = 'preview',
  MAINNET = 'mainnet',
}

export interface NetworkConfig {
  name: NetworkName
  displayName: string
  blockfrostEndpoint: string
  lucidNetwork: 'Preview' | 'Mainnet'
  addressPrefix: string
  isTestnet: boolean
}

// Preprod testnet configuration
export const PREPROD_CONFIG: NetworkConfig = {
  name: NetworkName.PREPROD,
  displayName: 'Cardano Preprod Testnet',
  blockfrostEndpoint: 'https://cardano-preview.blockfrost.io/api/v0',
  lucidNetwork: 'Preview',
  addressPrefix: 'addr_test',
  isTestnet: true,
}

// Mainnet configuration (ready when needed)
export const MAINNET_CONFIG: NetworkConfig = {
  name: NetworkName.MAINNET,
  displayName: 'Cardano Mainnet',
  blockfrostEndpoint: 'https://cardano-mainnet.blockfrost.io/api/v0',
  lucidNetwork: 'Mainnet',
  addressPrefix: 'addr',
  isTestnet: false,
}

/**
 * Get active network configuration based on environment
 */
export function getActiveNetworkConfig(): NetworkConfig {
  const networkEnv = process.env.NETWORK || process.env.VITE_CARDANO_NETWORK || 'preprod'
  
  switch (networkEnv.toLowerCase()) {
    case 'mainnet':
      return MAINNET_CONFIG
    case 'preprod':
    case 'preview':
    default:
      return PREPROD_CONFIG
  }
}

/**
 * Get Blockfrost API key from environment
 * IMPORTANT: Never hardcode or expose in frontend!
 */
export function getBlockfrostKey(useDefault: boolean = true): string {
  if (typeof process !== 'undefined' && process.env) {
    const key = process.env.BLOCKFROST_API_KEY
    if (key) return key
  }
  
  if (useDefault) {
    // Fallback for development only
    console.warn('⚠️ Using fallback Blockfrost key. Set BLOCKFROST_API_KEY environment variable for production.')
    return 'previewbJdo19gLSsDoPQCpwoAY469vXcPNvtPM'
  }
  
  throw new Error('BLOCKFROST_API_KEY environment variable not set')
}

/**
 * Validate network configuration on startup
 */
export function validateNetworkConfig(): void {
  const config = getActiveNetworkConfig()
  
  console.log(`✅ Network Configuration Loaded:`)
  console.log(`   Network: ${config.displayName}`)
  console.log(`   Blockfrost: ${config.blockfrostEndpoint}`)
  console.log(`   Lucid Network: ${config.lucidNetwork}`)
  
  if (config.isTestnet) {
    console.log(`   ⚠️  TESTNET MODE - Use with test funds only!`)
  }
}

/**
 * Get contract addresses based on network
 * These are loaded from deployed/* directories
 */
export async function getContractAddresses(network: NetworkName) {
  // This would normally load from deployed/{network}/script.json
  // For now, return the values from minswapWithdraw.ts
  
  if (network === NetworkName.MAINNET) {
    return {
      orderAddress: 'addr_...', // TODO: Add mainnet address
      poolAddress: 'addr_...',
      lpPolicyId: '...',
    }
  }
  
  // Preprod addresses from deployed/preprod/script.json
  return {
    orderAddress: 'addr_test1wrdf2f2x8pq3wwk3yv936ksmt59rz94mm66yzge8zj9pk7s0kjph3',
    poolAddress: 'addr_test1wrtt4xm4p84vse3g3l6swtf2rqs943t0w39ustwdszxt3lsyrt40u',
    lpPolicyId: 'd6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b',
  }
}
