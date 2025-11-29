/**
 * Hydra Rebalancing Batcher Service
 * Processes 50-100 rebalancing transactions in parallel inside a Hydra Head
 */

import { logger } from '../../utils/logger';
import {
  HydraTransaction,
  RebalancingOperation,
  BatchRebalancingRequest,
  BatchRebalancingResult,
  HydraHead,
} from '../../types/hydra';
import { HYDRA_REBALANCING_CONFIG } from '../../config/hydraConfig';

/**
 * Manages batch processing of rebalancing operations in Hydra Head
 */
export class HydraRebalancingBatcher {
  private activeHeadId: string | null = null;
  private currentBatchId: string | null = null;
  private batchHistory: Map<string, BatchRebalancingResult> = new Map();
  private pendingOperations: RebalancingOperation[] = [];

  constructor(headId?: string) {
    this.activeHeadId = headId || null;
  }

  /**
   * Submit a batch of rebalancing operations for execution in Hydra
   * @param request Batch rebalancing request
   * @returns Result of batch execution
   */
  async processBatch(request: BatchRebalancingRequest): Promise<BatchRebalancingResult> {
    try {
      this.activeHeadId = request.headId;
      this.currentBatchId = this.generateBatchId();

      logger.info(`[Hydra Batcher] Starting batch ${this.currentBatchId} with ${request.operations.length} operations`);

      const startTime = Date.now();

      // Validate batch
      this.validateBatch(request.operations);

      // Split into sub-batches if necessary
      const batches = this.createSubBatches(request.operations);

      const allResults: {
        operation: RebalancingOperation;
        result: 'success' | 'failed';
        output?: bigint;
        error?: string;
        executionTimeMs: number;
      }[] = [];

      // Execute batches in parallel
      for (const batch of batches) {
        const batchResults = await this.executeParallelOperations(request.headId, batch);
        allResults.push(...batchResults);
      }

      const executionTimeMs = Date.now() - startTime;

      // Count results
      const successCount = allResults.filter((r) => r.result === 'success').length;
      const failureCount = allResults.filter((r) => r.result === 'failed').length;

      const result: BatchRebalancingResult = {
        batchId: this.currentBatchId,
        headId: request.headId,
        operationsExecuted: successCount,
        operationsFailed: failureCount,
        executionTimeMs,
        snapshotNumber: 1, // Would be tracked from Hydra
        settlementNeeded: successCount > 0,
        details: allResults,
      };

      this.batchHistory.set(this.currentBatchId, result);

      logger.info(
        `[Hydra Batcher] Batch ${this.currentBatchId} completed: ${successCount} successful, ${failureCount} failed in ${executionTimeMs}ms`,
      );

      return result;
    } catch (error) {
      logger.error(`[Hydra Batcher] Batch processing failed: ${error}`);
      throw error;
    }
  }

  /**
   * Execute operations in parallel within Hydra Head
   * @param headId Hydra Head ID
   * @param operations Operations to execute
   * @returns Execution results
   */
  private async executeParallelOperations(
    headId: string,
    operations: RebalancingOperation[],
  ): Promise<
    {
      operation: RebalancingOperation;
      result: 'success' | 'failed';
      output?: bigint;
      error?: string;
      executionTimeMs: number;
    }[]
  > {
    const results = [];

    // Create promises for parallel execution
    const executionPromises = operations.map((op) => this.executeOperation(headId, op));

    // Execute all operations in parallel
    const executionResults = await Promise.allSettled(executionPromises);

    for (let i = 0; i < executionResults.length; i++) {
      const settledResult = executionResults[i];
      const operation = operations[i];

      if (settledResult.status === 'fulfilled') {
        results.push(settledResult.value);
      } else {
        results.push({
          operation,
          result: 'failed',
          error: settledResult.reason?.message || 'Unknown error',
          executionTimeMs: 0,
        });
      }
    }

    return results;
  }

  /**
   * Execute a single rebalancing operation
   * @param headId Hydra Head ID
   * @param operation Operation to execute
   * @returns Execution result
   */
  private async executeOperation(
    headId: string,
    operation: RebalancingOperation,
  ): Promise<{
    operation: RebalancingOperation;
    result: 'success' | 'failed';
    output?: bigint;
    error?: string;
    executionTimeMs: number;
  }> {
    const startTime = Date.now();

    try {
      // Validate operation
      if (operation.inputAmount < HYDRA_REBALANCING_CONFIG.minOperationAmount) {
        throw new Error('Operation amount below minimum');
      }

      if (operation.inputAmount > HYDRA_REBALANCING_CONFIG.maxOperationAmount) {
        throw new Error('Operation amount above maximum');
      }

      // Execute operation based on type
      let output: bigint;

      switch (operation.type) {
        case 'withdraw':
          output = await this.executeWithdraw(operation);
          break;
        case 'swap':
          output = await this.executeSwap(operation);
          break;
        case 'reinvest':
          output = await this.executeReinvest(operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      operation.status = 'executed';
      operation.outputAmount = output;

      const executionTimeMs = Date.now() - startTime;

      logger.debug(`[Hydra Batcher] Operation ${operation.operationId} executed in ${executionTimeMs}ms`);

      return {
        operation,
        result: 'success',
        output,
        executionTimeMs,
      };
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : 'Unknown error';

      const executionTimeMs = Date.now() - startTime;

      logger.warn(`[Hydra Batcher] Operation ${operation.operationId} failed: ${operation.error}`);

      return {
        operation,
        result: 'failed',
        error: operation.error,
        executionTimeMs,
      };
    }
  }

  /**
   * Execute withdraw operation
   * @param operation Withdraw operation
   * @returns Output amount
   */
  private async executeWithdraw(operation: RebalancingOperation): Promise<bigint> {
    // Simulate withdrawal with realistic outcome
    // In real implementation, would call smart contract
    const slippageAmount = (operation.inputAmount * BigInt(Math.floor(operation.slippageTolerance * 100))) / 10000n;
    return operation.inputAmount - slippageAmount;
  }

  /**
   * Execute swap operation
   * @param operation Swap operation
   * @returns Output amount
   */
  private async executeSwap(operation: RebalancingOperation): Promise<bigint> {
    // Simulate swap with realistic output
    // In real implementation, would call AMM formula
    const expectedOutput = operation.expectedOutput || operation.inputAmount;
    const slippageAmount = (expectedOutput * BigInt(Math.floor(operation.slippageTolerance * 100))) / 10000n;
    return expectedOutput - slippageAmount;
  }

  /**
   * Execute reinvest operation
   * @param operation Reinvest operation
   * @returns Output amount
   */
  private async executeReinvest(operation: RebalancingOperation): Promise<bigint> {
    // Simulate reinvestment
    // In real implementation, would provide LP tokens
    const expectedOutput = operation.expectedOutput || operation.inputAmount;
    const slippageAmount = (expectedOutput * BigInt(Math.floor(operation.slippageTolerance * 100))) / 10000n;
    return expectedOutput - slippageAmount;
  }

  /**
   * Validate batch operations
   * @param operations Operations to validate
   * @throws If validation fails
   */
  private validateBatch(operations: RebalancingOperation[]): void {
    if (operations.length === 0) {
      throw new Error('Batch must contain at least one operation');
    }

    if (operations.length > HYDRA_REBALANCING_CONFIG.batchSize * HYDRA_REBALANCING_CONFIG.maxBatchesPerHead) {
      throw new Error(
        `Batch size ${operations.length} exceeds maximum ${HYDRA_REBALANCING_CONFIG.batchSize * HYDRA_REBALANCING_CONFIG.maxBatchesPerHead}`,
      );
    }

    for (const op of operations) {
      if (!op.vaultId || !op.type) {
        throw new Error('Invalid operation: missing vaultId or type');
      }

      if (op.slippageTolerance < 0 || op.slippageTolerance > 0.5) {
        throw new Error('Invalid slippage tolerance');
      }
    }
  }

  /**
   * Create sub-batches for parallel processing
   * @param operations All operations
   * @returns Array of operation batches
   */
  private createSubBatches(operations: RebalancingOperation[]): RebalancingOperation[][] {
    const batches: RebalancingOperation[][] = [];
    const batchSize = HYDRA_REBALANCING_CONFIG.batchSize;

    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Get batch history
   * @param batchId Optional batch ID to filter
   * @returns Batch results
   */
  getBatchHistory(batchId?: string): BatchRebalancingResult[] {
    if (batchId) {
      const result = this.batchHistory.get(batchId);
      return result ? [result] : [];
    }
    return Array.from(this.batchHistory.values());
  }

  /**
   * Get latest batch result
   * @returns Latest batch result or null
   */
  getLatestBatchResult(): BatchRebalancingResult | null {
    if (!this.currentBatchId) return null;
    return this.batchHistory.get(this.currentBatchId) || null;
  }

  /**
   * Get batch statistics
   * @returns Batch statistics
   */
  getBatchStatistics(): {
    totalBatches: number;
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageExecutionTime: number;
  } {
    const results = Array.from(this.batchHistory.values());

    if (results.length === 0) {
      return {
        totalBatches: 0,
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageExecutionTime: 0,
      };
    }

    const totalOperations = results.reduce((sum, r) => sum + r.operationsExecuted + r.operationsFailed, 0);
    const successfulOperations = results.reduce((sum, r) => sum + r.operationsExecuted, 0);
    const failedOperations = results.reduce((sum, r) => sum + r.operationsFailed, 0);
    const averageExecutionTime =
      results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length;

    return {
      totalBatches: results.length,
      totalOperations,
      successfulOperations,
      failedOperations,
      averageExecutionTime,
    };
  }

  /**
   * Clear pending operations
   */
  clearPending(): void {
    this.pendingOperations = [];
  }

  /**
   * Get pending operations
   * @returns List of pending operations
   */
  getPendingOperations(): RebalancingOperation[] {
    return [...this.pendingOperations];
  }

  private generateBatchId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default HydraRebalancingBatcher;
