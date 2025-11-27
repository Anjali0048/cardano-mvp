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
      <div className="text-center py-12">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 max-w-md mx-auto">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-white">Connect Your Wallet</h2>
          <p className="mt-2 text-gray-400">Please connect your Cardano wallet to view your Yield Safe dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Monitor your impermanent loss protection vaults</p>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Total Vaults"
          value={mockMetrics.totalVaults}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <MetricsCard
          title="Total Value"
          value={`${mockMetrics.totalValue.toLocaleString()} ADA`}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
        />
        <MetricsCard
          title="Avg IL"
          value={`${mockMetrics.averageIL.toFixed(1)}%`}
          status={mockMetrics.averageIL > 4 ? 'warning' : 'healthy'}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <MetricsCard
          title="Protected"
          value={`${mockMetrics.protectedValue} ADA`}
          status="healthy"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </div>

      {/* Vaults Grid */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Your Vaults</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mockVaults.map((vault) => (
            <VaultCard key={vault.id} vault={vault} />
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
        <ActivityFeed />
      </div>
    </div>
  )
}