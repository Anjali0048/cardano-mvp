/**
 * Hydra Protocol Configuration
 * Setup for 2-3 operator Hydra Head network with rebalancing capabilities
 */

import { HydraHeadConfig, HydraParticipantConfig, HydraConfig } from '../types/hydra';

/**
 * Default Hydra network configuration
 * Can be overridden via environment variables
 */
export const DEFAULT_HYDRA_CONFIG: HydraConfig = {
  apiUrl: process.env.HYDRA_API_URL || 'http://localhost:4001',
  nodeSocket: process.env.HYDRA_NODE_SOCKET || '/tmp/hydra-node-1.socket',
  network: (process.env.HYDRA_NETWORK as 'testnet' | 'mainnet' | 'private') || 'testnet',
  contestationPeriod: parseInt(process.env.HYDRA_CONTESTATION_PERIOD || '86400', 10), // 24 hours
  protocol: (process.env.HYDRA_PROTOCOL as 'Direct' | 'Optimistic') || 'Direct',
  maxParallelTransactions: parseInt(process.env.HYDRA_MAX_PARALLEL_TXS || '100', 10),
  batchSize: parseInt(process.env.HYDRA_BATCH_SIZE || '50', 10),
  operatorPrivateKey: process.env.HYDRA_OPERATOR_KEY || '',
  witnessPrivateKey: process.env.HYDRA_WITNESS_KEY,
};

/**
 * Hydra Head configuration for yield rebalancing
 * 2-3 operators: Bot (primary) + Witness (validator)
 */
export const YIELD_SAFE_HYDRA_HEAD: HydraHeadConfig = {
  headName: 'YieldSafeRebalancing',
  participants: [
    {
      name: 'YieldSafeBotOperator',
      role: 'operator',
      cardanoAddress:
        process.env.OPERATOR_CARDANO_ADDRESS || 'addr_test1qz7lrz6hx0w9pxz0y0t0u0v0w0x0y0z0a0b0c0d0e0f0g0h0i0j0k0l0m0n0o0p0',
      hydraAddress: process.env.OPERATOR_HYDRA_ADDRESS || 'hydra-operator-1@localhost:5001',
      signingKey: process.env.OPERATOR_SIGNING_KEY || '',
    },
    {
      name: 'WitnessValidator',
      role: 'witness',
      cardanoAddress:
        process.env.WITNESS_CARDANO_ADDRESS || 'addr_test1qx7lrz6hx0w9pxz0y0t0u0v0w0x0y0z0a0b0c0d0e0f0g0h0i0j0k0l0m0n0o0p0',
      hydraAddress: process.env.WITNESS_HYDRA_ADDRESS || 'hydra-witness@localhost:5002',
      signingKey: process.env.WITNESS_SIGNING_KEY || '',
    },
  ],
  utxo: process.env.HYDRA_UTXO || 'txId#0',
  contestationPeriod: parseInt(process.env.HYDRA_CONTESTATION_PERIOD || '86400', 10),
  protocol: 'Direct',
};

/**
 * Performance targets for Hydra scaling demo
 */
export const HYDRA_PERFORMANCE_TARGETS = {
  mainchainAvgTxTime: 20_000, // 20 seconds per TX on mainchain
  mainchainMempoolSize: 5, // 5 pending TXs
  hydraParallelTxs: 100, // 100 TXs in parallel
  hydraAvgTxTime: 300, // 300ms per TX in Hydra
  expectedSpeedup: 20, // 20x faster
  expectedCostReduction: 0.99, // 99% cheaper per TX
  mainchainGasPerTx: 150_000, // lovelace
  hydraGasPerTx: 1_500, // lovelace
};

/**
 * Rebalancing operation parameters for Hydra batching
 */
export const HYDRA_REBALANCING_CONFIG = {
  batchSize: 50, // Operations per batch
  maxBatchesPerHead: 2, // 2 batches = 100 operations
  operationTimeout: 5_000, // 5 seconds per operation
  slippageTolerance: 0.02, // 2% slippage
  minOperationAmount: 1_000_000n, // 1 ADA minimum
  maxOperationAmount: 1_000_000_000n, // 1000 ADA maximum
};

/**
 * Monitor thresholds for Hydra Head health
 */
export const HYDRA_MONITORING_THRESHOLDS = {
  maxPendingTransactions: 150,
  maxFailureRate: 0.05, // 5% failure rate
  minParticipantConnectivity: 0.8, // 80% connected
  snapshotTimeout: 10_000, // 10 seconds
  settlementTimeout: 60_000, // 60 seconds
};

/**
 * Demystifying Hydra architecture for YieldSafe
 * Network topology for testing
 */
export const HYDRA_NETWORK_TOPOLOGY = {
  operator: {
    hostname: 'localhost',
    port: 5001,
    role: 'primary',
  },
  witness: {
    hostname: 'localhost',
    port: 5002,
    role: 'validator',
  },
  cardanoNode: {
    hostname: 'localhost',
    port: 3001,
    role: 'mainchain',
  },
};

/**
 * Get Hydra configuration from environment or defaults
 */
export function getHydraConfig(): HydraConfig {
  return {
    ...DEFAULT_HYDRA_CONFIG,
    apiUrl: process.env.HYDRA_API_URL || DEFAULT_HYDRA_CONFIG.apiUrl,
    nodeSocket: process.env.HYDRA_NODE_SOCKET || DEFAULT_HYDRA_CONFIG.nodeSocket,
    network: (process.env.HYDRA_NETWORK as 'testnet' | 'mainnet' | 'private') || DEFAULT_HYDRA_CONFIG.network,
    contestationPeriod: parseInt(process.env.HYDRA_CONTESTATION_PERIOD || '86400', 10),
    protocol:
      (process.env.HYDRA_PROTOCOL as 'Direct' | 'Optimistic') || DEFAULT_HYDRA_CONFIG.protocol,
    maxParallelTransactions: parseInt(process.env.HYDRA_MAX_PARALLEL_TXS || '100', 10),
    batchSize: parseInt(process.env.HYDRA_BATCH_SIZE || '50', 10),
    operatorPrivateKey: process.env.HYDRA_OPERATOR_KEY || DEFAULT_HYDRA_CONFIG.operatorPrivateKey,
    witnessPrivateKey: process.env.HYDRA_WITNESS_KEY,
  };
}

/**
 * Get participant configuration for Hydra Head initialization
 */
export function getParticipantConfig(): HydraParticipantConfig[] {
  return YIELD_SAFE_HYDRA_HEAD.participants;
}

/**
 * Validate Hydra configuration
 */
export function validateHydraConfig(config: HydraConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.apiUrl) errors.push('Hydra API URL is required');
  if (!config.nodeSocket) errors.push('Cardano node socket is required');
  if (config.contestationPeriod < 0) errors.push('Contestation period must be positive');
  if (config.maxParallelTransactions < 1) errors.push('Max parallel transactions must be at least 1');
  if (!config.operatorPrivateKey) errors.push('Operator private key is required');

  return {
    valid: errors.length === 0,
    errors,
  };
}
