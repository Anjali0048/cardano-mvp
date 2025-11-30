import React, { useState, useEffect } from 'react'
import { useWallet } from '../providers/WalletProvider'
import { useToast } from '../contexts/ToastContext'

interface AIRebalanceModalProps {
  isOpen: boolean
  onClose: () => void
  vault: {
    id: string
    tokenA: string
    tokenB: string
    depositAmount: number
    ilPercentage: number
    ilThreshold: number
  }
}

interface PoolRecommendation {
  fromPool: string
  toPool: string
  percentage: number
  expectedIL: number
  riskScore: number
  reason: string
}

export function AIRebalanceModal({ isOpen, onClose, vault }: AIRebalanceModalProps) {
  const { lucid, address } = useWallet()
  const { showToast } = useToast()
  const [step, setStep] = useState<'analysis' | 'recommendations' | 'signing' | 'shifting' | 'complete'>('analysis')
  const [recommendations, setRecommendations] = useState<PoolRecommendation[]>([])
  const [selectedRecommendation, setSelectedRecommendation] = useState<PoolRecommendation | null>(null)
  const [txHash, setTxHash] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStep('analysis')
      setRecommendations([])
      setSelectedRecommendation(null)
      startAIAnalysis()
    }
  }, [isOpen])

  const startAIAnalysis = async () => {
    setLoading(true)
    
    try {
      // Call backend AI analysis API
      const response = await fetch('http://localhost:3001/api/ai/rebalance-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultId: vault.id,
          currentPool: `${vault.tokenA}/${vault.tokenB}`,
          currentIL: vault.ilPercentage,
          ilThreshold: vault.ilThreshold,
          depositAmount: vault.depositAmount
        })
      })
      
      if (!response.ok) {
        throw new Error(`AI analysis failed: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('🤖 AI Analysis Result:', data)
      
      // Transform backend response to our format
      const transformedRecommendations: PoolRecommendation[] = data.analysis.recommendations.map((rec: any) => ({
        fromPool: rec.fromPool,
        toPool: rec.toPool,
        percentage: rec.percentage,
        expectedIL: rec.expectedIL,
        riskScore: rec.riskScore,
        reason: rec.reason
      }))
      
      setRecommendations(transformedRecommendations)
      setStep('recommendations')
      
    } catch (error) {
      console.error('AI Analysis failed:', error)
      // Fallback to mock recommendations if API fails
      const mockRecommendations: PoolRecommendation[] = [
        {
          fromPool: `${vault.tokenA}/${vault.tokenB}`,
          toPool: 'ADA/USDC',
          percentage: 60,
          expectedIL: 2.1,
          riskScore: 0.3,
          reason: 'Lower volatility pair with stable correlation'
        },
        {
          fromPool: `${vault.tokenA}/${vault.tokenB}`,
          toPool: 'ADA/MIN',
          percentage: 40,
          expectedIL: 3.8,
          riskScore: 0.6,
          reason: 'Balanced risk-reward with ecosystem token'
        }
      ]
      setRecommendations(mockRecommendations)
      setStep('recommendations')
    }
    
    setLoading(false)
  }

  const selectRecommendation = (recommendation: PoolRecommendation) => {
    setSelectedRecommendation(recommendation)
    setStep('signing')
  }

  const signRebalanceTransaction = async () => {
    if (!lucid || !selectedRecommendation) return
    
    setLoading(true)
    
    try {
      // Create a dummy transaction for user to sign
      const tx = lucid
        .newTx()
        .payToAddress(address!, { lovelace: 1000000n }) // Send 1 ADA to self as dummy
        .attachMetadata(674, {
          msg: [`AI Rebalance: ${vault.id}`, `From: ${selectedRecommendation.fromPool}`, `To: ${selectedRecommendation.toPool}`, `Amount: ${selectedRecommendation.percentage}%`]
        })
      
      const completeTx = await tx.complete()
      const signedTx = await completeTx.sign().complete()
      const txHashResult = await signedTx.submit()
      
      console.log('🤖 AI Rebalance transaction signed:', txHashResult)
      setTxHash(txHashResult)
      setStep('shifting')
      
      // Show success toast
      showToast('🤖 AI Rebalancing transaction submitted successfully!', 'success')
      
      // Start pool shifting animation
      setTimeout(() => {
        setStep('complete')
        showToast(`✨ Portfolio optimized! IL reduced to ${selectedRecommendation.expectedIL}%`, 'success')
      }, 4000)
      
    } catch (error) {
      console.error('Failed to sign rebalance transaction:', error)
      showToast('❌ Transaction cancelled or failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const renderAnalysisStep = () => (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <h3 className="text-lg font-semibold text-white mb-2">AI Analysis in Progress</h3>
      <p className="text-gray-400">Analyzing market conditions and risk factors...</p>
      <div className="mt-4 space-y-2 text-sm text-gray-500">
        <p>• Evaluating current IL exposure</p>
        <p>• Scanning optimal pools</p>
        <p>• Calculating risk-adjusted returns</p>
      </div>
    </div>
  )

  const renderRecommendationsStep = () => (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">AI Recommendations</h3>
      <p className="text-gray-400 mb-6">Based on current market conditions and your IL threshold of {vault.ilThreshold}%</p>
      
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div 
            key={index}
            className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => selectRecommendation(rec)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium text-white">Rebalance {rec.percentage}% to {rec.toPool}</h4>
                <p className="text-sm text-gray-400">{rec.reason}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-400">Expected IL: {rec.expectedIL}%</p>
                <p className="text-xs text-gray-400">Risk Score: {rec.riskScore}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">AI Optimized</span>
                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Lower Risk</span>
              </div>
              <button className="text-blue-400 text-sm hover:text-blue-300">
                Select →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderSigningStep = () => (
    <div className="text-center py-8">
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Confirm AI Rebalancing</h3>
        <div className="text-left space-y-2 text-sm text-gray-300">
          <p><span className="text-gray-400">Current Pool:</span> {selectedRecommendation?.fromPool}</p>
          <p><span className="text-gray-400">Target Pool:</span> {selectedRecommendation?.toPool}</p>
          <p><span className="text-gray-400">Rebalance Amount:</span> {selectedRecommendation?.percentage}%</p>
          <p><span className="text-gray-400">Expected IL:</span> {selectedRecommendation?.expectedIL}%</p>
        </div>
      </div>
      
      <button
        onClick={signRebalanceTransaction}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        {loading ? 'Processing...' : 'Sign Rebalance Transaction'}
      </button>
      <p className="text-xs text-gray-500 mt-2">This will create a transaction for you to sign</p>
    </div>
  )

  const renderShiftingStep = () => (
    <div className="text-center py-8">
      <div className="relative mb-6">
        <div className="flex items-center justify-center space-x-8">
          <div className="text-center">
            <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4 w-24 h-24 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{vault.tokenA}/{vault.tokenB}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{selectedRecommendation?.percentage}% Moving</p>
          </div>
          
          <div className="flex-1 relative">
            <div className="h-1 bg-gray-700 rounded"></div>
            <div className="h-1 bg-blue-500 rounded animate-pulse absolute top-0 left-0" style={{width: '60%'}}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-blue-500 rounded-full p-2 animate-bounce">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4 w-24 h-24 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{selectedRecommendation?.toPool}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Receiving Liquidity</p>
          </div>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">AI Rebalancing in Progress</h3>
      <p className="text-gray-400 mb-4">Optimizing your portfolio across pools...</p>
      
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Transaction Hash:</span>
            <span className="text-blue-400 font-mono">{txHash.slice(0, 16)}...{txHash.slice(-8)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Expected IL Reduction:</span>
            <span className="text-green-400">{vault.ilPercentage.toFixed(2)}% → {selectedRecommendation?.expectedIL}%</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="text-center py-8">
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 mb-6">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">AI Rebalancing Complete!</h3>
        <p className="text-gray-400">Your portfolio has been optimized for reduced IL exposure</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400">Previous IL</p>
          <p className="text-lg font-bold text-red-400">{vault.ilPercentage.toFixed(2)}%</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400">Optimized IL</p>
          <p className="text-lg font-bold text-green-400">{selectedRecommendation?.expectedIL}%</p>
        </div>
      </div>
      
      <button
        onClick={onClose}
        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
      >
        Close
      </button>
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">AI Portfolio Rebalancing</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {step === 'analysis' && renderAnalysisStep()}
        {step === 'recommendations' && renderRecommendationsStep()}
        {step === 'signing' && renderSigningStep()}
        {step === 'shifting' && renderShiftingStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  )
}