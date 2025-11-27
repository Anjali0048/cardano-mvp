import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Lucid, Blockfrost, Wallet } from 'lucid-cardano'
import toast from 'react-hot-toast'

// Extend window object for Cardano wallets
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
      [key: string]: any
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
      const lucidInstance = await Lucid.new(
        new Blockfrost(
          'https://cardano-preview.blockfrost.io/api/v0',
          'previewbJdo19gLSsDoPQCpwoAY469vXcPNvtPM' // Your real API key
        ),
        'Preview'
      )
      setLucid(lucidInstance)
      console.log('✅ Lucid initialized with Preview network')
    } catch (error) {
      console.error('Failed to initialize Lucid:', error)
      toast.error('Failed to initialize wallet provider')
    }
  }

  const checkWalletConnection = async () => {
    // Check if Eternl is already connected
    if (typeof window !== 'undefined' && window.cardano?.eternl) {
      try {
        const isEnabled = await window.cardano.eternl.isEnabled()
        if (isEnabled) {
          console.log('🔍 Found existing Eternl connection')
          await connectToEternl()
        }
      } catch (error) {
        console.log('No previous Eternl connection')
      }
    }
  }

  const connectToEternl = async () => {
    if (!lucid) {
      toast.error('Wallet provider not initialized')
      return
    }

    if (!window.cardano?.eternl) {
      toast.error('Eternl wallet not found. Please install Eternl extension.')
      window.open('https://eternl.io/app/mainnet/welcome', '_blank')
      return
    }

    try {
      console.log('🔗 Connecting to Eternl wallet...')
      const api = await window.cardano.eternl.enable()
      lucid.selectWallet(api)
      
      const walletAddress = await lucid.wallet.address()
      
      setWallet(api)
      setAddress(walletAddress)
      setWalletName('Eternl')
      setIsConnected(true)
      
      console.log('✅ Eternl wallet connected:', walletAddress)
      toast.success(`Eternl wallet connected! ${walletAddress.slice(0, 20)}...`)
      
    } catch (error) {
      console.error('Eternl connection failed:', error)
      toast.error('Failed to connect to Eternl wallet')
      throw error
    }
  }

  const connectWallet = async () => {
    setIsLoading(true)
    try {
      await connectToEternl()
    } catch (error) {
      // Fallback to demo mode if Eternl fails
      console.log('Eternl not available, using demo wallet')
      await connectDemoWallet()
    } finally {
      setIsLoading(false)
    }
  }

  const connectDemoWallet = async () => {
    // Demo wallet for testing when Eternl is not available
    setAddress('addr_test1demo_eternl_fallback_for_yield_safe_testing')
    setWalletName('Demo Wallet')
    setIsConnected(true)
    toast.success('Demo wallet connected (Eternl not detected)')
  }

  const disconnectWallet = () => {
    setWallet(null)
    setAddress(null)
    setIsConnected(false)
    setWalletName(null)
    toast.success('Wallet disconnected')
  }

  const value: WalletContextType = {
    lucid,
    wallet,
    address,
    isConnected,
    isLoading,
    connectWallet,
    disconnectWallet,
    walletName
  }

  return (
    <WalletContext.Provider value={value}>
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