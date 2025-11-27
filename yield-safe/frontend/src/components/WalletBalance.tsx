import React, { useState, useEffect } from 'react'
import { useWallet } from '../providers/WalletProvider'

export function WalletBalance() {
  const { lucid, isConnected, address } = useWallet()
  const [balance, setBalance] = useState<string>('0')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isConnected && lucid && address) {
      fetchBalance()
      // Refresh balance every 30 seconds
      const interval = setInterval(fetchBalance, 30000)
      return () => clearInterval(interval)
    }
  }, [isConnected, lucid, address])

  const fetchBalance = async () => {
    if (!lucid || !address) return
    
    setLoading(true)
    try {
      const utxos = await lucid.utxosAt(address)
      const totalLovelace = utxos.reduce((sum, utxo) => {
        return sum + (utxo.assets.lovelace || 0n)
      }, 0n)
      
      // Convert lovelace to ADA
      const adaBalance = (Number(totalLovelace) / 1_000_000).toFixed(2)
      setBalance(adaBalance)
    } catch (error) {
      console.error('Failed to fetch balance:', error)
      setBalance('Error')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) return null

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm7-13a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm font-medium text-gray-300">Wallet Balance:</span>
        </div>
        <div className="flex items-center space-x-2">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          ) : (
            <span className="text-lg font-bold text-white">{balance} ₳</span>
          )}
          <button
            onClick={fetchBalance}
            disabled={loading}
            className="text-gray-400 hover:text-blue-400 disabled:opacity-50"
            title="Refresh balance"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      {parseFloat(balance) > 0 && parseFloat(balance) < 100 && (
        <p className="text-xs text-orange-300 mt-2">
          ⚠️ Minimum 100 ADA required to create a vault
        </p>
      )}
      {parseFloat(balance) >= 100 && (
        <p className="text-xs text-green-300 mt-2">
          ✅ Sufficient balance to create protection vaults!
        </p>
      )}
    </div>
  )
}