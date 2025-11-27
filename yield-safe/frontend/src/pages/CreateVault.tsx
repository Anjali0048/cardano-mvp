import React, { useState, useEffect } from 'react'
import { useWallet } from '../providers/WalletProvider'
import { VaultTransactionBuilder } from '../lib/vaultTransactions'
import { WalletConnectionGuide } from '../components/WalletConnectionGuide'
import { WalletBalance } from '../components/WalletBalance'
import { RealPoolDataProvider, PoolInfo } from '../lib/realPoolData'
import toast from 'react-hot-toast'

export function CreateVault() {
  const { isConnected, lucid, walletName } = useWallet()
  const [isCreating, setIsCreating] = useState(false)
  const [availablePools, setAvailablePools] = useState<PoolInfo[]>([])
  const [loadingPools, setLoadingPools] = useState(false)
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null)
  const [formData, setFormData] = useState({
    poolId: '',
    depositAmount: '',
    ilThreshold: '5.0',
    tokenA: 'ADA',
    tokenB: ''
  })

  // Real vault address from your deployed contract
  const VAULT_ADDRESS = 'addr_test1wpm50as7ukmxnl2wpm50as7ukmxnl2wpm50as7ukmxnl2wpmhrjtgf09get6v03j88cxf5nauxrvq2clnt3'

  useEffect(() => {
    if (isConnected && lucid) {
      fetchRealPools()
    }
  }, [isConnected, lucid])

  const fetchRealPools = async () => {
    if (!lucid) return
    
    setLoadingPools(true)
    try {
      const poolProvider = new RealPoolDataProvider(lucid)
      const pools = await poolProvider.getAvailablePools()
      setAvailablePools(pools)
      console.log('✅ Loaded real DEX pools:', pools)
    } catch (error) {
      console.error('Failed to load pools:', error)
      toast.error('Failed to load pool data')
    } finally {
      setLoadingPools(false)
    }
  }

  const handlePoolChange = (poolId: string) => {
    const pool = availablePools.find(p => p.poolId === poolId)
    setSelectedPool(pool || null)
    setFormData(prev => ({
      ...prev,
      poolId,
      tokenA: pool?.tokenA.symbol || 'ADA',
      tokenB: pool?.tokenB.symbol || ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !lucid) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!formData.poolId || !formData.depositAmount || !selectedPool) {
      toast.error('Please fill in all required fields')
      return
    }

    // Additional wallet validation
    try {
      const address = await lucid.wallet?.address()
      if (!address) {
        toast.error('Wallet address not available. Please reconnect your wallet.')
        return
      }
    } catch (error) {
      toast.error('Failed to get wallet address. Please reconnect your wallet.')
      return
    }

    setIsCreating(true)
    
    try {
      toast.loading('Building vault creation transaction...', { id: 'vault-creation' })
      
      // Create transaction builder
      const vaultBuilder = new VaultTransactionBuilder(lucid, VAULT_ADDRESS)
      
      // Build vault creation parameters
      const vaultParams = {
        poolId: formData.poolId,
        depositAmount: parseFloat(formData.depositAmount),
        ilThreshold: parseFloat(formData.ilThreshold),
        tokenA: {
          policyId: selectedPool?.tokenA.policyId || '',
          tokenName: selectedPool?.tokenA.symbol || 'ADA'
        },
        tokenB: {
          policyId: selectedPool?.tokenB.policyId || '',
          tokenName: selectedPool?.tokenB.symbol || formData.tokenB
        }
      }
      
      // Create the vault on-chain
      const txHash = await vaultBuilder.createVault(vaultParams)
      
      toast.success(`✅ Vault created! Transaction: ${txHash}`, { 
        id: 'vault-creation',
        duration: 10000
      })
      
      // Reset form
      setFormData({
        poolId: '',
        depositAmount: '',
        ilThreshold: '5.0',
        tokenA: 'ADA',
        tokenB: ''
      })
      
    } catch (error: any) {
      console.error('Vault creation failed:', error)
      toast.error(`❌ Vault creation failed: ${error.message || 'Unknown error'}`, {
        id: 'vault-creation',
        duration: 10000
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (!isConnected) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Protection Vault</h1>
          <p className="text-gray-400">Set up impermanent loss protection for your liquidity position</p>
        </div>
        
        <WalletConnectionGuide />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Create Protection Vault</h1>
        <p className="text-gray-400">Set up impermanent loss protection for your liquidity position</p>
      </div>

      {/* Wallet Balance Display */}
      <WalletBalance />

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 space-y-6">
          
          {/* Pool Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Liquidity Pool {loadingPools && <span className="text-blue-400">(Loading real pools...)</span>}
            </label>
            <select
              name="poolId"
              value={formData.poolId}
              onChange={(e) => handlePoolChange(e.target.value)}
              required
              disabled={loadingPools}
              className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            >
              <option value="">Select a pool</option>
              {availablePools.map((pool) => (
                <option key={pool.poolId} value={pool.poolId}>
                  {pool.tokenA.symbol}/{pool.tokenB.symbol} - {pool.dex} 
                  {pool.apy && ` (${pool.apy} APY)`}
                </option>
              ))}
            </select>
            
            {selectedPool && (
              <div className="mt-2 p-3 bg-gray-700/50 rounded-lg text-xs">
                <div className="grid grid-cols-2 gap-2 text-gray-300">
                  <div>Pool: <span className="text-blue-400">{selectedPool.dex}</span></div>
                  <div>Fee: <span className="text-blue-400">{selectedPool.fee}%</span></div>
                  <div>Reserve A: <span className="text-blue-400">{new RealPoolDataProvider(lucid!).formatTokenAmount(selectedPool.reserveA, selectedPool.tokenA.decimals)} {selectedPool.tokenA.symbol}</span></div>
                  <div>Reserve B: <span className="text-blue-400">{new RealPoolDataProvider(lucid!).formatTokenAmount(selectedPool.reserveB, selectedPool.tokenB.decimals)} {selectedPool.tokenB.symbol}</span></div>
                  {selectedPool.volume24h && <div>24h Volume: <span className="text-blue-400">{selectedPool.volume24h}</span></div>}
                  {selectedPool.apy && <div>APY: <span className="text-green-400">{selectedPool.apy}</span></div>}
                </div>
              </div>
            )}
          </div>

          {/* Token Pair */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token A
              </label>
              <input
                type="text"
                name="tokenA"
                value={formData.tokenA}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token B
              </label>
              <input
                type="text"
                name="tokenB"
                value={formData.tokenB}
                className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Select a pool first"
                readOnly
              />
            </div>
          </div>

          {/* Deposit Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Deposit Amount (ADA)
            </label>
            <input
              type="number"
              name="depositAmount"
              value={formData.depositAmount}
              onChange={handleInputChange}
              min="100"
              step="1"
              required
              className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="1000"
            />
            <p className="mt-1 text-sm text-gray-400">Minimum 100 ADA required</p>
          </div>

          {/* IL Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              IL Protection Threshold (%)
            </label>
            <input
              type="number"
              name="ilThreshold"
              value={formData.ilThreshold}
              onChange={handleInputChange}
              min="1"
              max="20"
              step="0.1"
              required
              className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="5.0"
            />
            <p className="mt-1 text-sm text-gray-400">
              Protection will activate when impermanent loss exceeds this threshold
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isCreating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            {isCreating ? 'Creating Vault...' : 'Create Protection Vault'}
          </button>

          {/* Info Box */}
          <div className={`${walletName?.includes('Demo') ? 'bg-orange-500/10 border-orange-500/20' : 'bg-green-500/10 border-green-500/20'} border rounded-lg p-4`}>
            <div className="flex">
              <svg className={`h-5 w-5 ${walletName?.includes('Demo') ? 'text-orange-400' : 'text-green-400'} mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <p className={`text-sm ${walletName?.includes('Demo') ? 'text-orange-300' : 'text-green-300'}`}>
                  {walletName?.includes('Demo') ? (
                    <>
                      🟡 <strong>Demo Mode Active</strong> - This will simulate vault creation without real blockchain transactions. 
                      <a href="https://eternl.io/app/extension" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-200 ml-1">
                        Install Eternl wallet
                      </a> for real functionality.
                    </>
                  ) : (
                    <>
                      🚀 <strong>Real Blockchain Integration!</strong> This will create an actual smart contract vault on Cardano Preview testnet 
                      using your connected {walletName} wallet. Contract Address: <code className="text-xs bg-gray-800/50 px-1 py-0.5 rounded">{VAULT_ADDRESS.slice(0, 20)}...</code>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}