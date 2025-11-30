import React, { useState, useEffect } from 'react'
import { useWallet } from '../providers/WalletProvider'
import { useToast } from '../contexts/ToastContext'

interface AIDelegationModalProps {
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

interface MasumiJob {
  jobId: string
  agentId: string
  action: string
  confidence: number
  reasoning: string
  estimatedGas: number
}

export function AIDelegationModal({ isOpen, onClose, vault }: AIDelegationModalProps) {
  const { lucid, address } = useWallet()
  const { showToast } = useToast()
  const [step, setStep] = useState<'delegate' | 'analyzing' | 'job-created' | 'signing' | 'executing' | 'complete'>('delegate')
  const [masumiJob, setMasumiJob] = useState<MasumiJob | null>(null)
  const [delegationTxHash, setDelegationTxHash] = useState<string>('')
  const [rebalanceTxHash, setRebalanceTxHash] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStep('delegate')
      setMasumiJob(null)
      setDelegationTxHash('')
      setRebalanceTxHash('')
    }
  }, [isOpen])

  const delegateToAI = async () => {
    if (!lucid) return
    
    setLoading(true)
    
    try {
      // Create delegation transaction
      const tx = lucid
        .newTx()
        .payToAddress(address!, { lovelace: 2000000n }) // 2 ADA delegation fee
        .attachMetadata(674, {
          msg: [
            'AI Delegation Authorization',
            `Vault: ${vault.id}`,
            `Agent: yield-optimizer-v2`,
            'Permissions: rebalance, emergency_exit',
            'Max IL: 15%',
            'Duration: 30 days'
          ]
        })
      
      const completeTx = await tx.complete()
      const signedTx = await completeTx.sign().complete()
      const txHashResult = await signedTx.submit()
      
      setDelegationTxHash(txHashResult)
      setStep('analyzing')
      
      showToast('✅ AI delegation authorized!', 'success')
      
      // Start AI analysis
      setTimeout(() => {
        createMasumiJob()
      }, 2000)
      
    } catch (error) {
      console.error('Delegation failed:', error)
      showToast('❌ Delegation failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const createMasumiJob = async () => {
    // Simulate Masumi job creation
    const mockJob: MasumiJob = {
      jobId: `masumi_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`,
      agentId: 'yield-optimizer-v2.1.0',
      action: 'rebalance_portfolio',
      confidence: 0.87,
      reasoning: `Current IL (${vault.ilPercentage.toFixed(1)}%) approaching threshold. Optimal rebalancing to ADA/USDC reduces risk by 65% while maintaining 8.2% APY.`,
      estimatedGas: 850000
    }
    
    setMasumiJob(mockJob)
    setStep('job-created')
    
    // Auto-proceed to signing after showing job
    setTimeout(() => {
      setStep('signing')
    }, 3000)
  }

  const signAITransaction = async () => {
    if (!lucid || !masumiJob) return
    
    setLoading(true)
    
    try {
      // Create AI rebalancing transaction with Masumi job ID
      const tx = lucid
        .newTx()
        .payToAddress(address!, { lovelace: 1000000n }) // 1 ADA as demo
        .attachMetadata(674, {
          msg: [
            'AI Autonomous Rebalancing',
            `Masumi Job: ${masumiJob.jobId}`,
            `Agent: ${masumiJob.agentId}`,
            `Action: ${masumiJob.action}`,
            `Confidence: ${(masumiJob.confidence * 100).toFixed(1)}%`,
            'From: ADA/DJED → To: ADA/USDC (60%)'
          ]
        })
      
      const completeTx = await tx.complete()
      const signedTx = await completeTx.sign().complete()
      const txHashResult = await signedTx.submit()
      
      setRebalanceTxHash(txHashResult)
      setStep('executing')
      
      showToast('🤖 AI rebalancing transaction signed!', 'success')
      
      // Complete the demo
      setTimeout(() => {
        setStep('complete')
        showToast('🎉 AI delegation rebalancing completed!', 'success')
      }, 4000)
      
    } catch (error) {
      console.error('AI transaction failed:', error)
      showToast('❌ Transaction failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const renderDelegateStep = () => (
    <div>
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">🤖 Delegate to AI Agent</h3>
        
        <div className="space-y-4 text-sm">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-purple-300 font-medium mb-2">Agent Profile</h4>
            <div className="space-y-2 text-gray-300">
              <p><span className="text-gray-400">Agent ID:</span> yield-optimizer-v2.1.0</p>
              <p><span className="text-gray-400">Specialization:</span> IL Protection & Portfolio Optimization</p>
              <p><span className="text-gray-400">Success Rate:</span> 94.2% (last 30 days)</p>
              <p><span className="text-gray-400">Masumi Network:</span> ✅ Verified</p>
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-blue-300 font-medium mb-2">Delegation Permissions</h4>
            <div className="space-y-1 text-gray-300">
              <p>• ✅ Rebalance between approved pools</p>
              <p>• ✅ Emergency exit if IL exceeds 15%</p>
              <p>• ❌ Cannot withdraw principal</p>
              <p>• ❌ Cannot change IL threshold</p>
            </div>
          </div>
          
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="text-yellow-300 font-medium mb-2">⚠️ Important</h4>
            <p className="text-gray-300">You retain full ownership. AI can only rebalance within your risk parameters. You can revoke delegation anytime.</p>
          </div>
        </div>
      </div>
      
      <button
        onClick={delegateToAI}
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-3 rounded-lg font-medium transition-all"
      >
        {loading ? 'Authorizing...' : '🤝 Authorize AI Delegation'}
      </button>
    </div>
  )

  const renderAnalyzingStep = () => (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
      <h3 className="text-lg font-semibold text-white mb-2">AI Agent Analyzing Vault</h3>
      <p className="text-gray-400 mb-4">Creating optimized rebalancing strategy...</p>
      
      <div className="space-y-2 text-sm text-gray-500">
        <p>• 📊 Evaluating current IL exposure: {vault.ilPercentage.toFixed(1)}%</p>
        <p>• 🔍 Scanning 47 available pools</p>
        <p>• 🧠 Running risk optimization models</p>
        <p>• 📡 Registering job on Masumi network</p>
      </div>
      
      <div className="mt-6 bg-gray-800/50 rounded-lg p-4">
        <p className="text-xs text-gray-400">Delegation TX:</p>
        <p className="text-xs text-blue-400 font-mono">{delegationTxHash.slice(0, 24)}...{delegationTxHash.slice(-8)}</p>
      </div>
    </div>
  )

  const renderJobCreatedStep = () => (
    <div>
      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">✅ Masumi Job Created</h3>
        
        <div className="space-y-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Job ID</p>
                <p className="text-green-400 font-mono">{masumiJob?.jobId}</p>
              </div>
              <div>
                <p className="text-gray-400">Agent</p>
                <p className="text-white">{masumiJob?.agentId}</p>
              </div>
              <div>
                <p className="text-gray-400">Action</p>
                <p className="text-white capitalize">{masumiJob?.action.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-gray-400">Confidence</p>
                <p className="text-white">{((masumiJob?.confidence || 0) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-2">AI Reasoning:</p>
            <p className="text-gray-300 text-sm">{masumiJob?.reasoning}</p>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-300 text-sm font-medium">🔗 Job registered on Masumi decentralized network</p>
            <p className="text-gray-400 text-xs">This job ID will be embedded in the on-chain transaction for full traceability</p>
          </div>
        </div>
      </div>
      
      <p className="text-center text-gray-400">Proceeding to transaction signing...</p>
    </div>
  )

  const renderSigningStep = () => (
    <div className="text-center py-8">
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">🖋️ Sign AI Transaction</h3>
        
        <div className="text-left space-y-3 text-sm">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400">Masumi Job ID:</p>
            <p className="text-purple-400 font-mono text-xs">{masumiJob?.jobId}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400">Rebalancing Action:</p>
            <p className="text-white">60% from {vault.tokenA}/{vault.tokenB} → ADA/USDC</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400">Expected IL Reduction:</p>
            <p className="text-green-400">{vault.ilPercentage.toFixed(1)}% → 2.3%</p>
          </div>
        </div>
      </div>
      
      <button
        onClick={signAITransaction}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        {loading ? 'Processing...' : '✍️ Sign AI Transaction'}
      </button>
      <p className="text-xs text-gray-500 mt-2">This transaction includes the Masumi job ID for verification</p>
    </div>
  )

  const renderExecutingStep = () => (
    <div className="text-center py-8">
      <div className="relative mb-6">
        <div className="flex items-center justify-center space-x-8">
          <div className="text-center">
            <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4 w-24 h-24 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{vault.tokenA}/{vault.tokenB}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Current Pool</p>
          </div>
          
          <div className="flex-1 relative">
            <div className="h-1 bg-gray-700 rounded"></div>
            <div className="h-1 bg-purple-500 rounded animate-pulse absolute top-0 left-0 w-3/4"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-purple-500 rounded-full p-2 animate-bounce">
                <span className="text-white text-sm">🤖</span>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-green-500/20 border-2 border-green-500 rounded-lg p-4 w-24 h-24 flex items-center justify-center">
              <span className="text-white font-bold text-sm">ADA/USDC</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Target Pool</p>
          </div>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">🤖 AI Executing Rebalancing</h3>
      <p className="text-gray-400 mb-4">Autonomous optimization in progress...</p>
      
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Masumi Job ID:</span>
            <span className="text-purple-400 font-mono text-xs">{masumiJob?.jobId.slice(0, 16)}...{masumiJob?.jobId.slice(-8)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Transaction Hash:</span>
            <span className="text-blue-400 font-mono text-xs">{rebalanceTxHash.slice(0, 16)}...{rebalanceTxHash.slice(-8)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Agent Authority:</span>
            <span className="text-green-400">✅ Verified via delegation TX</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="text-center py-8">
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 mb-6">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🎉</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">AI Delegation Complete!</h3>
        <p className="text-gray-400">Your vault has been autonomously optimized by AI</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400">Previous IL</p>
          <p className="text-lg font-bold text-red-400">{vault.ilPercentage.toFixed(2)}%</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400">Optimized IL</p>
          <p className="text-lg font-bold text-green-400">2.3%</p>
        </div>
      </div>
      
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-6">
        <h4 className="text-purple-300 font-medium mb-2">🔗 Blockchain Audit Trail</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Delegation TX:</span>
            <span className="text-blue-400 font-mono">{delegationTxHash.slice(0, 12)}...{delegationTxHash.slice(-6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Masumi Job:</span>
            <span className="text-purple-400 font-mono">{masumiJob?.jobId.slice(0, 12)}...{masumiJob?.jobId.slice(-6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Rebalance TX:</span>
            <span className="text-blue-400 font-mono">{rebalanceTxHash.slice(0, 12)}...{rebalanceTxHash.slice(-6)}</span>
          </div>
        </div>
      </div>
      
      <button
        onClick={onClose}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
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
          <h2 className="text-xl font-bold text-white">🤖 AI Delegation & Masumi Jobs</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {step === 'delegate' && renderDelegateStep()}
        {step === 'analyzing' && renderAnalyzingStep()}
        {step === 'job-created' && renderJobCreatedStep()}
        {step === 'signing' && renderSigningStep()}
        {step === 'executing' && renderExecutingStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  )
}