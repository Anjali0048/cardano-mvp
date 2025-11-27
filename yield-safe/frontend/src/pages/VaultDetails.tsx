import React from 'react'
import { useParams } from 'react-router-dom'

export function VaultDetails() {
  const { vaultId } = useParams<{ vaultId: string }>()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Vault Details</h1>
        <p className="text-gray-400">Detailed view of vault {vaultId}</p>
      </div>
      
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8">
        <p className="text-gray-300 text-center">
          Vault details page coming soon...
        </p>
      </div>
    </div>
  )
}