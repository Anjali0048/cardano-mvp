import React, { useState, useEffect } from 'react'
import { useWallet } from '../providers/WalletProvider'
import { VaultCard } from '../components/VaultCard'
import { MetricsCard } from '../components/MetricsCard'
import { ActivityFeed } from '../components/ActivityFeed'
import { WalletBalance } from '../components/WalletBalance'
import { RealVaultService, RealVaultData } from '../lib/realVaultService'

export function Dashboard() {
  const { isConnected, lucid, address } = useWallet()
  const [realVaults, setRealVaults] = useState<RealVaultData[]>([])
  const [realMetrics, setRealMetrics] = useState({
    totalVaults: 0,
    totalValue: 0,
    averageIL: 0,
    protectedValue: 0
  })
  const [loading, setLoading] = useState(false)

  // Real vault contract address
  const VAULT_ADDRESS = 'addr_test1wpm50as7ukmxnl2wpm50as7ukmxnl2wpm50as7ukmxnl2wpmhrjtgf09get6v03j88cxf5nauxrvq2clnt3'

  useEffect(() => {
    if (isConnected && lucid && address) {
      fetchRealData()
      // Refresh every 30 seconds
      const interval = setInterval(fetchRealData, 30000)
      return () => clearInterval(interval)
    }
  }, [isConnected, lucid, address])

  const fetchRealData = async () => {
    if (!lucid || !address) return
    
    setLoading(true)
    try {
      const vaultService = new RealVaultService(lucid, VAULT_ADDRESS)
      
      // Fetch real vault data
      const vaults = await vaultService.getUserVaults(address)
      setRealVaults(vaults)
      
      // Calculate real metrics
      const metrics = await vaultService.getRealMetrics(vaults)
      setRealMetrics(metrics)
      
      console.log('✅ Dashboard updated with real data')
      
    } catch (error) {
      console.error('Failed to fetch real data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Monitor your impermanent loss protection vaults</p>
        </div>
        
        <div className="text-center py-12">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 max-w-md mx-auto">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-white">Connect Your Wallet</h2>
            <p className="mt-2 text-gray-400">Please connect your Cardano wallet to view your protection vaults.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">🚀 Real Dashboard</h1>
          <p className="text-gray-400">Live data from Cardano Preview testnet • Contract: {VAULT_ADDRESS.slice(0, 20)}...</p>
        </div>
        
        {loading && (
          <div className="flex items-center space-x-2 text-blue-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            <span className="text-sm">Fetching blockchain data...</span>
          </div>
        )}
      </div>

      {/* Wallet Balance */}
      <WalletBalance />

      {/* Real Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Real Vaults"
          value={realMetrics.totalVaults}
          icon="🏛️"
          status="healthy"
        />
        
        <MetricsCard
          title="Real Value"
          value={`${realMetrics.totalValue.toLocaleString()} ₳`}
          icon="💰"
          status="healthy"
        />
        
        <MetricsCard
          title="Blockchain IL"
          value={`${realMetrics.averageIL.toFixed(1)}%`}
          status={realMetrics.averageIL > 4 ? 'warning' : 'healthy'}
          icon="📊"
        />
        
        <MetricsCard
          title="Protected"
          value={`${realMetrics.protectedValue} ₳`}
          icon="🛡️"
          status="healthy"
        />
      </div>

      {/* Real Vaults */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Your Real Protection Vaults</h2>
          <button
            onClick={fetchRealData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            {loading ? 'Scanning Blockchain...' : '🔄 Refresh from Chain'}
          </button>
        </div>
        
        {realVaults.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">No Real Vaults Found</h3>
            <p className="text-gray-400 mb-4">
              {loading ? 'Searching blockchain for your vaults...' : 'No vault UTxOs found at the smart contract address.'}
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <p>Contract: {VAULT_ADDRESS}</p>
              <p>Network: Cardano Preview Testnet</p>
            </div>
            <a
              href="/create"
              className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Create Your First Real Vault
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {realVaults.map((vault) => (
              <div key={vault.vaultId} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Real Vault</h3>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">LIVE</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">UTxO:</span>
                    <span className="text-blue-400 font-mono">{vault.vaultId.slice(0, 20)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pool:</span>
                    <span className="text-white">{vault.tokenA}/{vault.tokenB}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Deposit:</span>
                    <span className="text-white">{vault.depositAmount.toLocaleString()} ₳</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">IL Threshold:</span>
                    <span className="text-yellow-400">{vault.ilThreshold}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={vault.status === 'healthy' ? 'text-green-400' : 'text-orange-400'}>
                      {vault.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Real Transaction History</h2>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center text-gray-400">
          <p>Real transaction history would appear here</p>
          <p className="text-sm mt-2">Connect to Cardano transaction indexer for live updates</p>
        </div>
      </div>
    </div>
  )
}