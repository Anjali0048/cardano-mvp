import React from 'react'
import { useWallet } from '../providers/WalletProvider'

export function WalletConnectionGuide() {
  const { isConnected, connectWallet, isLoading, walletName } = useWallet()
  
  const isEternlAvailable = typeof window !== 'undefined' && window.cardano?.eternl
  
  if (isConnected) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-green-300">
              ✅ {walletName} Connected
            </h3>
            <p className="text-sm text-green-200">
              You can now create real protection vaults on Cardano Preview testnet!
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <div className="flex">
          <svg className="h-6 w-6 text-blue-400 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">
              Connect Your Cardano Wallet
            </h3>
            
            {!isEternlAvailable ? (
              <div className="space-y-4">
                <p className="text-blue-200">
                  To use real blockchain features, you'll need to install Eternl wallet:
                </p>
                
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">1</span>
                    <span className="text-gray-300">Install Eternl browser extension</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">2</span>
                    <span className="text-gray-300">Create or import a Cardano wallet</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">3</span>
                    <span className="text-gray-300">Switch to Preview testnet in wallet settings</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">4</span>
                    <span className="text-gray-300">Get test ADA from the Cardano faucet</span>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <a
                    href="https://eternl.io/app/extension"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Install Eternl Wallet
                  </a>
                  <a
                    href="https://docs.cardano.org/cardano-testnet/tools/faucet/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Get Test ADA
                  </a>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={connectWallet}
                    disabled={isLoading}
                    className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Connecting...
                      </div>
                    ) : (
                      'Use Demo Mode (Limited Features)'
                    )}
                  </button>
                  <p className="text-xs text-gray-400 mt-2">
                    Demo mode will simulate transactions without real blockchain interaction
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-blue-200">
                  Eternl wallet detected! Connect to start creating protection vaults.
                </p>
                
                <button
                  onClick={connectWallet}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Connecting...
                    </div>
                  ) : (
                    'Connect Eternl Wallet'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}