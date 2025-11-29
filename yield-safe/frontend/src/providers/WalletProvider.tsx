import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Blockfrost, Lucid, Wallet } from 'lucid-cardano'

// Declare Eternl wallet interface
declare global {
  interface Window {
    cardano?: {
      eternl?: {
        enable(): Promise<Wallet>
        isEnabled(): Promise<boolean>
        apiVersion: string
        name: string
        icon: string
      }
    }
  }
}

interface WalletContextType {
  lucid: Lucid | null
  wallet: Wallet | null
  address: string | null
  isConnected: boolean
  isLoading: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  walletName: string | null
  ensureWalletSelected: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [lucid, setLucid] = useState<Lucid | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [walletName, setWalletName] = useState<string | null>(null)

  useEffect(() => {
    initializeLucid()
    checkWalletConnection()
  }, [])

  const initializeLucid = async () => {
    try {
      // Get network configuration from backend API
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      let network = 'Preview'
      
      try {
        const networkResponse = await fetch(`${apiUrl}/api/network`)
        if (networkResponse.ok) {
          const networkData = await networkResponse.json()
          network = networkData.lucidNetwork || 'Preview'
          console.log(`✅ Network from API: ${networkData.displayName}`)
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch network from API, using default:', error)
      }

      // Initialize Lucid with Blockfrost provider
      const blockfrostEndpoint = import.meta.env.VITE_BLOCKFROST_ENDPOINT || 'https://cardano-preview.blockfrost.io/api/v0'
      const blockfrostKey = import.meta.env.VITE_BLOCKFROST_KEY || 'previewbJdo19gLSsDoPQCpwoAY469vXcPNvtPM'
      
      const lucidInstance = await Lucid.new(
        new Blockfrost(blockfrostEndpoint, blockfrostKey),
        network as 'Preview' | 'Mainnet'
      )
      setLucid(lucidInstance)
      console.log(`✅ Lucid initialized with ${network} testnet`)
    } catch (error) {
      console.error('❌ Failed to initialize Lucid:', error)
    }
  }

  const checkWalletConnection = async () => {
    try {
      if (window.cardano?.eternl) {
        const isEnabled = await window.cardano.eternl.isEnabled()
        if (isEnabled) {
          await connectWallet()
        }
      }
    } catch (error) {
      console.log('No saved wallet connection found')
    }
  }

  const connectDemoWallet = async (walletName: string = 'Demo Wallet') => {
    if (!lucid) {
      console.error('❌ Lucid not initialized for demo wallet')
      return
    }

    try {
      // Use Lucid's built-in demo wallet functionality
      lucid.selectWalletFromPrivateKey('ed25519_sk1ahfetf02qwwg4dkq7mgp4a25lx5vh9920cr5wnxmpzz9906qvm8qyxn5yy')
      
      // Verify the wallet was set correctly
      if (!lucid.wallet) {
        throw new Error('Failed to set demo wallet in Lucid')
      }

      const demoAddress = await lucid.wallet.address()
      
      if (!demoAddress) {
        throw new Error('Failed to get demo wallet address')
      }

      setWallet(lucid.wallet)
      setAddress(demoAddress)
      setWalletName(walletName)
      setIsConnected(true)
      
      console.log('✅ Demo wallet connected:', demoAddress)
      
    } catch (error) {
      console.error('❌ Failed to create demo wallet:', error)
      
      // If demo wallet completely fails, don't mark as connected
      setWallet(null)
      setAddress(null)
      setWalletName(null)
      setIsConnected(false)
      
      throw new Error(`Demo wallet initialization failed: ${error}`)
    }
  }

  const connectWallet = async () => {
    if (!lucid) {
      console.error('Lucid not initialized')
      return
    }

    setIsLoading(true)
    
    try {
      // Check if Eternl is available
      if (!window.cardano?.eternl) {
        console.log('⚠️ Eternl wallet not detected, entering demo mode')
        await connectDemoWallet()
        return
      }

      // Connect to real Eternl wallet
      console.log('🔌 Connecting to Eternl wallet...')
      const eternlWallet = await window.cardano.eternl.enable()
      
      // Set wallet in Lucid
      lucid.selectWallet(eternlWallet)
      
      // Verify wallet is properly connected to Lucid
      if (!lucid.wallet) {
        throw new Error('Wallet not properly connected to Lucid instance')
      }
      
      // Get wallet address
      const walletAddress = await lucid.wallet.address()
      
      setWallet(eternlWallet)
      setAddress(walletAddress)
      setWalletName('Eternl')
      setIsConnected(true)
      
      console.log('✅ Eternl wallet connected:', walletAddress)
      console.log('✅ Lucid.wallet properly initialized')
      
    } catch (error) {
      console.error('❌ Wallet connection failed:', error)
      
      // Fallback to demo mode on error
      console.log('⚠️ Falling back to demo mode due to connection error')
      try {
        await connectDemoWallet('Eternl (Demo Mode - Connection Failed)')
      } catch (demoError) {
        console.error('❌ Demo wallet fallback also failed:', demoError)
        // Complete failure - don't mark as connected
        setWallet(null)
        setAddress(null)
        setWalletName(null)
        setIsConnected(false)
        throw new Error('Both Eternl and demo wallet connections failed')
      }
      
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    setWallet(null)
    setAddress(null)
    setIsConnected(false)
    setWalletName(null)
    
    if (lucid) {
      // Reset Lucid wallet selection
      lucid.selectWallet(null as any)
    }
    
    console.log('👋 Wallet disconnected')
  }

  const ensureWalletSelected = async () => {
    if (!lucid || !wallet || !isConnected) {
      throw new Error('Wallet not connected. Please connect your wallet first.')
    }

    // Re-select the wallet in Lucid to ensure it's properly attached
    lucid.selectWallet(wallet)
    
    if (!lucid.wallet) {
      console.warn('⚠️ Wallet was not properly reselected in Lucid, attempting to reconnect...')
      await connectWallet()
      return
    }

    console.log('✅ Wallet verified and selected in Lucid')
  }

  const contextValue: WalletContextType = {
    lucid,
    wallet,
    address,
    isConnected,
    isLoading,
    connectWallet,
    disconnectWallet,
    walletName,
    ensureWalletSelected
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}