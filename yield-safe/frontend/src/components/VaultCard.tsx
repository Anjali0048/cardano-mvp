import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { enhancedAPI } from '../lib/enhancedAPI'
import toast from 'react-hot-toast'

interface Vault {
  id: string
  poolId: string
  tokenA: string
  tokenB: string
  depositAmount: number
  currentValue: number
  ilPercentage: number
  ilThreshold: number
  status: 'healthy' | 'warning' | 'danger'
  lastUpdate: number
}

interface VaultCardProps {
  vault: Vault
}

export function VaultCard({ vault }: VaultCardProps) {
  const [aiPrediction, setAiPrediction] = useState<any>(null)
  const [loadingPrediction, setLoadingPrediction] = useState(false)

  const loadAIPrediction = async () => {
    setLoadingPrediction(true)
    try {
      const prediction = await enhancedAPI.predictPrice(vault.tokenB, [24, 168])
      setAiPrediction(prediction)
      toast.success('AI prediction loaded')
    } catch (err) {
      toast.error('Failed to load prediction')
    } finally {
      setLoadingPrediction(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-400/10 border-green-400/20'
      case 'warning': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
      case 'danger': return 'text-red-400 bg-red-400/10 border-red-400/20'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const pnl = vault.currentValue - vault.depositAmount
  const pnlPercentage = (pnl / vault.depositAmount) * 100

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-2">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{vault.tokenA}/{vault.tokenB}</h3>
            <p className="text-sm text-gray-400">{vault.poolId}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(vault.status)}`}>
          {vault.status}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-400">Deposited</p>
          <p className="text-lg font-semibold text-white">{vault.depositAmount.toLocaleString()} ADA</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Current Value</p>
          <p className="text-lg font-semibold text-white">{vault.currentValue.toLocaleString()} ADA</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">P&L</p>
          <p className={`text-lg font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)} ADA ({pnlPercentage.toFixed(1)}%)
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400">IL Risk</p>
          <p className={`text-lg font-semibold ${vault.ilPercentage > vault.ilThreshold * 0.8 ? 'text-yellow-400' : 'text-green-400'}`}>
            {vault.ilPercentage.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">IL Protection</span>
          <span className="text-gray-300">{vault.ilPercentage.toFixed(1)}% / {vault.ilThreshold}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              vault.ilPercentage > vault.ilThreshold 
                ? 'bg-red-500' 
                : vault.ilPercentage > vault.ilThreshold * 0.8 
                  ? 'bg-yellow-500' 
                  : 'bg-green-500'
            }`}
            style={{ width: `${Math.min((vault.ilPercentage / vault.ilThreshold) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* AI Prediction Panel */}
      {!aiPrediction ? (
        <button
          onClick={loadAIPrediction}
          disabled={loadingPrediction}
          className="w-full mb-4 py-2 px-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-sm text-purple-300 disabled:opacity-50"
        >
          {loadingPrediction ? '⏳ Loading AI Prediction...' : '🤖 Get AI Price Prediction'}
        </button>
      ) : (
        <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded">
          <div className="text-xs text-purple-300 mb-2">🤖 AI Prediction</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {aiPrediction.predictions.slice(0, 2).map((p: any) => (
              <div key={p.timeframe} className="bg-gray-800/50 rounded p-2">
                <div className="text-gray-400">{p.timeframe}</div>
                <div className="text-white font-mono">${p.predictedPrice.toFixed(6)}</div>
                <div className={p.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {p.changePercent >= 0 ? '↗' : '↘'} {Math.abs(p.changePercent).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>Last updated {formatTimeAgo(vault.lastUpdate)}</span>
        <Link 
          to={`/vault/${vault.id}`}
          className="text-blue-400 hover:text-blue-300 font-medium"
        >
          View Details →
        </Link>
      </div>
    </div>
  )
}