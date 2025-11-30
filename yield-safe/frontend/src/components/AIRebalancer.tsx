import { useState, useEffect } from 'react'
import { useWallet } from '../providers/WalletProvider'

interface VaultData {
  id: string
  tokenA: string
  tokenB: string
  depositAmount: number
  currentIL: number
  ilThreshold: number
  status: 'healthy' | 'warning' | 'protected'
}

interface RebalancerConfig {
  enabled: boolean
  maxILThreshold: number
  targetILThreshold: number
  rebalanceFrequency: 'hourly' | 'daily' | 'weekly'
  emergencyExitThreshold: number
  minVaultSize: number
}

export function AIRebalancer() {
  const { isConnected } = useWallet()
  const [vaults, setVaults] = useState<VaultData[]>([])
  const [config, setConfig] = useState<RebalancerConfig>({
    enabled: false,
    maxILThreshold: 5.0,
    targetILThreshold: 2.5,
    rebalanceFrequency: 'daily',
    emergencyExitThreshold: 8.0,
    minVaultSize: 100
  })
  const [paymentAmount, setPaymentAmount] = useState<number>(50)
  const [subscriptionStatus, setSubscriptionStatus] = useState<'inactive' | 'pending' | 'active'>('inactive')
  const rebalanceHistory = [
    {
      timestamp: Date.now() - 86400000,
      action: 'Rebalanced ADA/SNEK vault',
      fromVault: 'ADA/SNEK (4.2% IL)',
      toVault: 'ADA/DJED (1.1% IL)',
      amount: '250 ADA',
      reason: 'IL threshold exceeded'
    },
    {
      timestamp: Date.now() - 172800000,
      action: 'Emergency exit triggered',
      fromVault: 'ADA/MIN (7.8% IL)',
      toVault: 'Cash position',
      amount: '420 ADA',
      reason: 'High volatility detected'
    }
  ]

  useEffect(() => {
    if (isConnected) {
      // Simulate fetching user vaults
      setVaults([
        {
          id: 'vault1',
          tokenA: 'ADA',
          tokenB: 'SNEK',
          depositAmount: 500,
          currentIL: 4.2,
          ilThreshold: 3.0,
          status: 'protected'
        },
        {
          id: 'vault2',
          tokenA: 'ADA',
          tokenB: 'DJED',
          depositAmount: 300,
          currentIL: 1.1,
          ilThreshold: 5.0,
          status: 'healthy'
        },
        {
          id: 'vault3',
          tokenA: 'ADA',
          tokenB: 'MIN',
          depositAmount: 200,
          currentIL: 6.8,
          ilThreshold: 6.0,
          status: 'warning'
        }
      ])
    }
  }, [isConnected])

  const handleSubscribe = async () => {
    setSubscriptionStatus('pending')
    
    // Simulate payment processing
    setTimeout(() => {
      setSubscriptionStatus('active')
      setConfig(prev => ({ ...prev, enabled: true }))
    }, 2000)
  }

  const handleCancelSubscription = () => {
    setSubscriptionStatus('inactive')
    setConfig(prev => ({ ...prev, enabled: false }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'protected': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const hours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60))
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  if (!isConnected) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 max-w-md mx-auto">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-white">Connect Your Wallet</h2>
            <p className="mt-2 text-gray-400">Please connect your Cardano wallet to access AI Rebalancer.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">🤖 AI Rebalancer</h1>
        <p className="text-gray-400">
          Delegate your IL protection management to our AI that automatically shifts funds between vaults based on market conditions
        </p>
      </div>

      {/* Subscription Status */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Subscription Status</h2>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            subscriptionStatus === 'active' ? 'bg-green-500/20 text-green-400' :
            subscriptionStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {subscriptionStatus === 'active' ? '✅ Active' :
             subscriptionStatus === 'pending' ? '⏳ Pending' :
             '❌ Inactive'}
          </div>
        </div>

        {subscriptionStatus === 'inactive' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-300 mb-2">🚀 AI Rebalancer Features</h3>
              <ul className="space-y-1 text-sm text-blue-100">
                <li>• Automatic IL monitoring across all your vaults</li>
                <li>• Smart fund rebalancing based on risk thresholds</li>
                <li>• Emergency exit during high volatility periods</li>
                <li>• 24/7 market monitoring and protection</li>
                <li>• Optimal vault allocation suggestions</li>
              </ul>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Subscription Fee
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-32 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    min="10"
                    max="500"
                  />
                  <span className="text-gray-400">₳ per month</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 50-100 ₳ for optimal performance
                </p>
              </div>
              <button
                onClick={handleSubscribe}
                disabled={subscriptionStatus === 'pending'}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
              >
                {subscriptionStatus === 'pending' ? 'Processing...' : 'Subscribe Now'}
              </button>
            </div>
          </div>
        )}

        {subscriptionStatus === 'active' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 font-medium">AI Rebalancer is managing your vaults</p>
                <p className="text-sm text-gray-400">Monthly fee: {paymentAmount} ₳ • Next payment: {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p>
              </div>
              <button
                onClick={handleCancelSubscription}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Configuration */}
      {subscriptionStatus === 'active' && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">AI Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max IL Threshold (%)
              </label>
              <input
                type="number"
                value={config.maxILThreshold}
                onChange={(e) => setConfig(prev => ({ ...prev, maxILThreshold: Number(e.target.value) }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                step="0.1"
                min="1"
                max="10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Rebalance when IL exceeds this threshold
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target IL Threshold (%)
              </label>
              <input
                type="number"
                value={config.targetILThreshold}
                onChange={(e) => setConfig(prev => ({ ...prev, targetILThreshold: Number(e.target.value) }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                step="0.1"
                min="0.5"
                max="5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Target IL level after rebalancing
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rebalance Frequency
              </label>
              <select
                value={config.rebalanceFrequency}
                onChange={(e) => setConfig(prev => ({ ...prev, rebalanceFrequency: e.target.value as any }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Emergency Exit Threshold (%)
              </label>
              <input
                type="number"
                value={config.emergencyExitThreshold}
                onChange={(e) => setConfig(prev => ({ ...prev, emergencyExitThreshold: Number(e.target.value) }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                step="0.1"
                min="5"
                max="15"
              />
              <p className="text-xs text-gray-500 mt-1">
                Exit all positions when IL exceeds this level
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vault Overview */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Your Vaults Under AI Management</h2>
        
        {vaults.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No vaults found. Create some vaults to begin AI management.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vaults.map((vault) => (
              <div key={vault.id} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-white">
                    {vault.tokenA}/{vault.tokenB}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(vault.status)}`}>
                    {vault.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Deposit:</span>
                    <span className="text-white ml-2">{vault.depositAmount} ₳</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Current IL:</span>
                    <span className={`ml-2 ${vault.currentIL > vault.ilThreshold ? 'text-red-400' : 'text-green-400'}`}>
                      {vault.currentIL.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Threshold:</span>
                    <span className="text-white ml-2">{vault.ilThreshold}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">AI Action:</span>
                    <span className="text-blue-400 ml-2">
                      {vault.currentIL > config.emergencyExitThreshold ? 'Exit' :
                       vault.currentIL > config.maxILThreshold ? 'Rebalance' :
                       'Monitor'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent AI Actions */}
      {subscriptionStatus === 'active' && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent AI Actions</h2>
          
          <div className="space-y-4">
            {rebalanceHistory.map((action, index) => (
              <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-medium">{action.action}</h3>
                  <span className="text-gray-400 text-sm">{formatTimeAgo(action.timestamp)}</span>
                </div>
                
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">From:</span>
                    <span className="text-red-400">{action.fromVault}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">To:</span>
                    <span className="text-green-400">{action.toVault}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white">{action.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reason:</span>
                    <span className="text-yellow-400">{action.reason}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Stats */}
      {subscriptionStatus === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">2.8%</div>
            <div className="text-gray-400">Average IL Saved</div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">7</div>
            <div className="text-gray-400">Successful Rebalances</div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">156 ₳</div>
            <div className="text-gray-400">Total Losses Prevented</div>
          </div>
        </div>
      )}
    </div>
  )
}