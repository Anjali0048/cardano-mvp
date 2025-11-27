import React from 'react'

const mockActivities = [
  {
    id: 1,
    type: 'protection_executed',
    message: 'IL protection activated for ADA/USDC vault',
    timestamp: Date.now() - 180000, // 3 minutes ago
    status: 'success'
  },
  {
    id: 2,
    type: 'vault_created',
    message: 'New vault created for ADA/DJED pool',
    timestamp: Date.now() - 3600000, // 1 hour ago
    status: 'info'
  },
  {
    id: 3,
    type: 'threshold_warning',
    message: 'IL threshold approaching for ADA/DJED vault (4.8%)',
    timestamp: Date.now() - 7200000, // 2 hours ago
    status: 'warning'
  },
  {
    id: 4,
    type: 'monitoring_started',
    message: 'Keeper bot monitoring activated',
    timestamp: Date.now() - 10800000, // 3 hours ago
    status: 'info'
  }
]

export function ActivityFeed() {
  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getActivityIcon = (type: string, status: string) => {
    const baseClasses = "h-8 w-8 rounded-full p-2"
    
    switch (status) {
      case 'success':
        return (
          <div className={`${baseClasses} bg-green-500/20 text-green-400`}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'warning':
        return (
          <div className={`${baseClasses} bg-yellow-500/20 text-yellow-400`}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className={`${baseClasses} bg-blue-500/20 text-blue-400`}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
      <div className="flow-root">
        <ul className="-mb-8">
          {mockActivities.map((activity, index) => (
            <li key={activity.id}>
              <div className="relative pb-8">
                {index !== mockActivities.length - 1 && (
                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-600" aria-hidden="true" />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    {getActivityIcon(activity.type, activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-300">
                      <span className="font-medium text-white">{activity.message}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-400">
                      <time>{formatTimeAgo(activity.timestamp)}</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mt-6 text-center">
        <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
          View all activity →
        </button>
      </div>
    </div>
  )
}