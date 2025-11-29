/**
 * Frontend Environment Configuration
 * Centralizes all API URLs and configuration
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000')

export const config = {
  api: {
    baseUrl: API_URL,
    timeout: API_TIMEOUT,
    endpoints: {
      network: `${API_URL}/api/network`,
      vaultAddress: `${API_URL}/api/vault/address`,
      vaultValidator: `${API_URL}/api/vault/validator`,
      vaultList: `${API_URL}/api/vault/list`,
      poolsList: `${API_URL}/api/pools/list`,
      withdrawOrder: `${API_URL}/api/minswap/withdraw-order`,
      ilStatus: `${API_URL}/api/vault/il-status`,
    }
  },
  network: {
    name: import.meta.env.VITE_CARDANO_NETWORK || 'preview',
    displayName: 'Cardano Preprod Testnet',
  }
}

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.api.timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Verify API is reachable and get network info
 */
export async function verifyApiConnection(): Promise<{ network: string; displayName: string } | null> {
  try {
    const response = await fetchWithTimeout(config.api.endpoints.network)
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Connected to ${data.displayName}`)
      return data
    }
  } catch (error) {
    console.error('❌ API connection failed:', error)
  }
  return null
}
