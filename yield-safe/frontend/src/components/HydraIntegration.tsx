import React, { useState, useEffect } from 'react';

interface HydraMode {
  enabled: boolean;
  headId: string | null;
  status: 'initializing' | 'open' | 'closing' | 'closed' | 'idle';
  parallelTxs: number;
  speedup: number;
  costSavings: number;
}

/**
 * Hydra Mode Toggle Component
 * Allows users to switch between mainchain and Hydra Head execution
 */
export const HydraModeToggle: React.FC<{
  onModeChange: (enabled: boolean) => void;
}> = ({ onModeChange }) => {
  const [hydraMode, setHydraMode] = useState<HydraMode>({
    enabled: false,
    headId: null,
    status: 'idle',
    parallelTxs: 0,
    speedup: 1,
    costSavings: 0,
  });

  const toggleHydraMode = async () => {
    if (!hydraMode.enabled) {
      // Initializing Hydra Head
      setHydraMode((prev) => ({
        ...prev,
        enabled: true,
        status: 'initializing',
      }));

      // Simulate Hydra Head initialization
      setTimeout(() => {
        setHydraMode((prev) => ({
          ...prev,
          headId: `head-${Date.now()}`,
          status: 'open',
          parallelTxs: 100,
          speedup: 20,
          costSavings: 99,
        }));
        onModeChange(true);
      }, 2000);
    } else {
      // Closing Hydra Head
      setHydraMode((prev) => ({
        ...prev,
        status: 'closing',
      }));

      setTimeout(() => {
        setHydraMode((prev) => ({
          ...prev,
          enabled: false,
          headId: null,
          status: 'closed',
          parallelTxs: 0,
          speedup: 1,
          costSavings: 0,
        }));
        onModeChange(false);
      }, 1000);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Hydra Scaling Mode</h3>
          <p className="text-sm text-gray-600 mt-1">
            Enable Layer 2 scaling for parallel rebalancing
          </p>
        </div>
        <button
          onClick={toggleHydraMode}
          className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
            hydraMode.enabled
              ? 'bg-gradient-to-r from-blue-500 to-purple-500'
              : 'bg-gray-300'
          }`}
          disabled={hydraMode.status === 'initializing' || hydraMode.status === 'closing'}
        >
          <span
            className={`inline-block h-10 w-10 transform rounded-full bg-white transition-transform ${
              hydraMode.enabled ? 'translate-x-12' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {hydraMode.enabled && (
        <div className="space-y-3 mt-4 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded border border-blue-100">
              <p className="text-xs text-gray-600">Head Status</p>
              <p className="text-sm font-semibold text-blue-600 capitalize">
                {hydraMode.status}
              </p>
            </div>
            <div className="bg-white p-3 rounded border border-green-100">
              <p className="text-xs text-gray-600">Head ID</p>
              <p className="text-xs font-mono text-green-600 truncate">
                {hydraMode.headId?.slice(-8) || 'N/A'}
              </p>
            </div>
            <div className="bg-white p-3 rounded border border-purple-100">
              <p className="text-xs text-gray-600">Speedup</p>
              <p className="text-sm font-semibold text-purple-600">
                {hydraMode.speedup}x faster
              </p>
            </div>
            <div className="bg-white p-3 rounded border border-orange-100">
              <p className="text-xs text-gray-600">Cost Savings</p>
              <p className="text-sm font-semibold text-orange-600">
                {hydraMode.costSavings}%
              </p>
            </div>
          </div>
        </div>
      )}

      {hydraMode.status === 'initializing' && (
        <div className="mt-4 flex items-center space-x-2 text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
          <span>Initializing Hydra Head...</span>
        </div>
      )}

      {hydraMode.status === 'closing' && (
        <div className="mt-4 flex items-center space-x-2 text-sm text-amber-600">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent" />
          <span>Settling to mainchain...</span>
        </div>
      )}
    </div>
  );
};

/**
 * Hydra Performance Metrics Card
 */
export const HydraMetricsCard: React.FC<{
  metrics?: {
    parallelTxs: number;
    throughputTPS: number;
    averageTxTime: number;
    totalCostSavings: number;
  };
}> = ({ metrics }) => {
  if (!metrics) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
      <h3 className="text-lg font-bold mb-4">Hydra Performance</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm opacity-90">Parallel Transactions</p>
          <p className="text-2xl font-bold">{metrics.parallelTxs}</p>
          <p className="text-xs opacity-75 mt-1">in parallel</p>
        </div>
        <div>
          <p className="text-sm opacity-90">Throughput</p>
          <p className="text-2xl font-bold">{metrics.throughputTPS}</p>
          <p className="text-xs opacity-75 mt-1">TPS</p>
        </div>
        <div>
          <p className="text-sm opacity-90">Avg TX Time</p>
          <p className="text-2xl font-bold">{metrics.averageTxTime}</p>
          <p className="text-xs opacity-75 mt-1">ms</p>
        </div>
        <div>
          <p className="text-sm opacity-90">Cost Savings</p>
          <p className="text-2xl font-bold">{metrics.totalCostSavings}%</p>
          <p className="text-xs opacity-75 mt-1">vs mainchain</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white border-opacity-20">
        <p className="text-xs opacity-90">
          ⚡ Hydra enables 20x faster, 99% cheaper rebalancing through layer 2 parallelization
        </p>
      </div>
    </div>
  );
};

/**
 * Hydra Integration for Vault Card
 */
export const HydraVaultIntegration: React.FC<{
  vaultId: string;
  hydraEnabled: boolean;
}> = ({ vaultId, hydraEnabled }) => {
  return (
    <div className="flex items-center gap-2">
      {hydraEnabled && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Hydra Enabled
        </span>
      )}
      <span className="text-xs text-gray-600">
        {hydraEnabled ? 'Using Layer 2 scaling' : 'Using mainchain'}
      </span>
    </div>
  );
};

/**
 * Hydra Settlement Status Component
 */
export const HydraSettlementStatus: React.FC<{
  settlementTxId?: string;
  status?: 'pending' | 'posted' | 'finalized' | 'contested';
  contestationRemainingSeconds?: number;
}> = ({ settlementTxId, status = 'pending', contestationRemainingSeconds }) => {
  const [timeLeft, setTimeLeft] = useState(contestationRemainingSeconds);

  useEffect(() => {
    if (!contestationRemainingSeconds || status === 'finalized') return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [contestationRemainingSeconds, status]);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    posted: 'bg-blue-100 text-blue-800',
    finalized: 'bg-green-100 text-green-800',
    contested: 'bg-red-100 text-red-800',
  };

  return (
    <div className={`p-3 rounded-lg ${statusColors[status]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold capitalize">{status} on Mainchain</p>
          <p className="text-xs opacity-75 mt-1">{settlementTxId?.slice(-8)}</p>
        </div>
        {status === 'posted' && timeLeft !== undefined && (
          <div className="text-right">
            <p className="text-xs font-semibold">{timeLeft}s</p>
            <p className="text-xs opacity-75">until final</p>
          </div>
        )}
        {status === 'finalized' && (
          <div className="text-xl">✅</div>
        )}
      </div>
    </div>
  );
};

export default HydraModeToggle;
