import React, { ReactNode } from 'react'

interface MetricsCardProps {
  title: string
  value: string | number
  icon: ReactNode
  status?: 'healthy' | 'warning' | 'danger'
}

export function MetricsCard({ title, value, icon, status = 'healthy' }: MetricsCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'danger': return 'text-red-400'
      default: return 'text-blue-400'
    }
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
      <div className="flex items-center">
        <div className={`${getStatusColor(status)}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}