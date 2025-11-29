/**
 * Hydra Protocol Type Definitions
 * Provides comprehensive type system for Hydra Head-based scaling of yield rebalancing
 */

export interface HydraHead {
  headId: string;
  contractId: string;
  status: 'initializing' | 'open' | 'closing' | 'closed';
  participants: HydraParticipant[];
  commitDeadline: Date;
  contestDeadline?: Date;
  initialUTxO: HydraUTxO[];
  expectedUTxO?: HydraUTxO[];
  finalUTxO?: HydraUTxO[];
  createdAt: Date;
  closedAt?: Date;
}

export interface HydraParticipant {
  id: string;
  name: string;
  role: 'operator' | 'witness' | 'participant';
  hydraVerificationKey: string;
  cardanoVerificationKey: string;
  isConnected: boolean;
  committedAmount: bigint;
}

export interface HydraUTxO {
  address: string;
  amount: bigint;
  assets: HydraAsset[];
  datum?: string;
}

export interface HydraAsset {
  policyId: string;
  tokenName: string;
  quantity: bigint;
}

export interface HydraMessage {
  messageId: string;
  headId: string;
  type:
    | 'init'
    | 'committed'
    | 'open'
    | 'transaction'
    | 'snapshot-request'
    | 'snapshot-ack'
    | 'closing'
    | 'closed';
  sender: string;
  timestamp: Date;
  payload: Record<string, unknown>;
  signature?: string;
}

export interface HydraTransaction {
  txId: string;
  headId: string;
  type: 'rebalancing' | 'settlement' | 'internal';
  vaultIds: string[];
  inputs: HydraUTxO[];
  outputs: HydraUTxO[];
  operations: RebalancingOperation[];
  timestamp: Date;
  fee: bigint;
  status: 'pending' | 'confirmed' | 'settled';
}

export interface HydraState {
  headId: string;
  utxos: HydraUTxO[];
  blockHeight: number;
  snapshotNumber: number;
  timestamp: Date;
  hash: string;
}

export interface RebalancingOperation {
  operationId: string;
  vaultId: string;
  type: 'withdraw' | 'swap' | 'reinvest';
  sourcePool: string;
  targetPool: string;
  inputAmount: bigint;
  outputAmount?: bigint;
  expectedOutput?: bigint;
  slippageTolerance: number;
  status: 'pending' | 'executed' | 'failed';
  error?: string;
}

export interface HydraHeadConfig {
  headName: string;
  participants: HydraParticipantConfig[];
  utxo: string; // UTxO address format
  contestationPeriod: number; // seconds
  protocol: 'Direct' | 'Optimistic';
}

export interface HydraParticipantConfig {
  name: string;
  role: 'operator' | 'witness' | 'participant';
  cardanoAddress: string;
  hydraAddress: string;
  signingKey: string;
}

export interface HydraMetrics {
  headId: string;
  totalTransactions: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageTxTime: number; // milliseconds
  totalExecutionTime: number;
  mainchainTxsNeeded: number; // if done on mainchain
  hydraParallelTxs: number; // actual parallel TXs in Hydra
  speedupFactor: number; // e.g., 20x
  costPerTransaction: number; // in lovelace
  mainchainCostPerTransaction: number;
  costSavings: number; // percentage
  throughputTPS: number; // transactions per second
  peakThroughputTPS: number;
}

export interface HydraHeadStatus {
  headId: string;
  status: HydraHead['status'];
  participantCount: number;
  connectedParticipants: number;
  totalCommittedAmount: bigint;
  pendingTransactions: number;
  processedTransactions: number;
  totalOperations: number;
  lastUpdate: Date;
}

export interface SettlementTx {
  txId: string;
  headId: string;
  mainchainTxId?: string;
  snapshot: HydraState;
  settledUTxOs: HydraUTxO[];
  contestationDeadline: Date;
  status: 'pending' | 'posted' | 'finalized' | 'contested';
  error?: string;
}

export interface HydraConfig {
  apiUrl: string;
  nodeSocket: string;
  network: 'testnet' | 'mainnet' | 'private';
  contestationPeriod: number;
  protocol: 'Direct' | 'Optimistic';
  maxParallelTransactions: number;
  batchSize: number;
  operatorPrivateKey: string;
  witnessPrivateKey?: string;
}

export interface HydraHeadInitParams {
  headName: string;
  operator: HydraParticipantConfig;
  witnesses: HydraParticipantConfig[];
  participants: HydraParticipantConfig[];
  initialCommitAmount: bigint;
  contestationPeriod: number;
  protocol: 'Direct' | 'Optimistic';
}

export interface BatchRebalancingRequest {
  headId: string;
  vaultIds: string[];
  operations: RebalancingOperation[];
  maxSlippage: number;
  minExecutionTime?: number;
  maxExecutionTime?: number;
}

export interface BatchRebalancingResult {
  batchId: string;
  headId: string;
  operationsExecuted: number;
  operationsFailed: number;
  executionTimeMs: number;
  snapshotNumber: number;
  settlementNeeded: boolean;
  details: {
    operation: RebalancingOperation;
    result: 'success' | 'failed';
    output?: bigint;
    error?: string;
    executionTimeMs: number;
  }[];
}

export interface HydraPoolIntegration {
  headId: string;
  poolId: string;
  poolReserves: {
    assetA: bigint;
    assetB: bigint;
  };
  lpTokenSupply: bigint;
  lastUpdate: Date;
}

export interface HydraVaultState {
  vaultId: string;
  headId: string;
  lpTokens: bigint;
  collateral: bigint;
  lastRebalance: Date;
  nextRebalanceDeadline: Date;
  ilProtectionActive: boolean;
}
