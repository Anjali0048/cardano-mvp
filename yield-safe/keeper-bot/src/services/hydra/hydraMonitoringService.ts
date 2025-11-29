/**
 * Hydra Monitoring & Metrics Service
 * Tracks performance metrics, throughput, and cost comparisons
 */

import { logger } from '../../utils/logger';
import { HydraMetrics, BatchRebalancingResult, HydraHead, SettlementTx } from '../../types/hydra';
import { HYDRA_PERFORMANCE_TARGETS } from '../../config/hydraConfig';

/**
 * Comprehensive monitoring for Hydra Head performance and scaling benefits
 */
export class HydraMonitoringService {
  private metrics: Map<string, HydraMetrics> = new Map();
  private metricsHistory: Map<string, HydraMetrics[]> = new Map(); // For historical tracking
  private startTime: Date = new Date();

  /**
   * Record metrics for a batch execution in Hydra
   * @param headId Hydra Head ID
   * @param batchResult Batch execution result
   * @param mainchainExecutionTime Time if done on mainchain
   * @returns Updated metrics
   */
  recordBatchMetrics(
    headId: string,
    batchResult: BatchRebalancingResult,
    mainchainExecutionTime?: number,
  ): HydraMetrics {
    try {
      logger.debug(`[Hydra Monitor] Recording metrics for batch ${batchResult.batchId}`);

      // Calculate mainchain metrics (for comparison)
      const mainchainTotalTime =
        mainchainExecutionTime || batchResult.operationsExecuted * HYDRA_PERFORMANCE_TARGETS.mainchainAvgTxTime;

      // Get or create metrics for this head
      let headMetrics = this.metrics.get(headId);
      if (!headMetrics) {
        headMetrics = this.initializeMetrics(headId);
      }

      // Update transaction counts
      headMetrics.totalTransactions += 1;
      headMetrics.totalOperations += batchResult.operationsExecuted + batchResult.operationsFailed;
      headMetrics.successfulOperations += batchResult.operationsExecuted;
      headMetrics.failedOperations += batchResult.operationsFailed;

      // Update timing metrics
      headMetrics.totalExecutionTime += batchResult.executionTimeMs;
      headMetrics.averageTxTime =
        headMetrics.totalExecutionTime / (headMetrics.successfulOperations + headMetrics.failedOperations);

      // Calculate Hydra parallelization benefits
      headMetrics.hydraParallelTxs = Math.max(headMetrics.hydraParallelTxs, batchResult.operationsExecuted);
      headMetrics.mainchainTxsNeeded = Math.ceil((mainchainTotalTime / batchResult.executionTimeMs) * batchResult.operationsExecuted);

      // Calculate speedup factor
      const hydraTimePerTx = batchResult.executionTimeMs / (batchResult.operationsExecuted || 1);
      headMetrics.speedupFactor = Math.round((mainchainTotalTime / batchResult.executionTimeMs) * 10) / 10;

      // Calculate cost metrics
      headMetrics.costPerTransaction = HYDRA_PERFORMANCE_TARGETS.hydraGasPerTx;
      headMetrics.mainchainCostPerTransaction = HYDRA_PERFORMANCE_TARGETS.mainchainGasPerTx;
      headMetrics.costSavings =
        ((headMetrics.mainchainCostPerTransaction - headMetrics.costPerTransaction) /
          headMetrics.mainchainCostPerTransaction) *
        100;

      // Calculate throughput (TPS)
      headMetrics.throughputTPS = Math.round((batchResult.operationsExecuted / (batchResult.executionTimeMs / 1000)) * 100) / 100;
      headMetrics.peakThroughputTPS = Math.max(headMetrics.peakThroughputTPS, headMetrics.throughputTPS);

      this.metrics.set(headId, headMetrics);

      // Store in history
      if (!this.metricsHistory.has(headId)) {
        this.metricsHistory.set(headId, []);
      }
      this.metricsHistory.get(headId)!.push({ ...headMetrics });

      logger.info(`[Hydra Monitor] Metrics updated for head ${headId}`);
      logger.info(
        `[Hydra Monitor] Speedup: ${headMetrics.speedupFactor}x, Cost savings: ${headMetrics.costSavings.toFixed(2)}%, Throughput: ${headMetrics.throughputTPS} TPS`,
      );

      return headMetrics;
    } catch (error) {
      logger.error(`[Hydra Monitor] Failed to record metrics: ${error}`);
      throw error;
    }
  }

  /**
   * Get current metrics for a head
   * @param headId Hydra Head ID
   * @returns Current metrics or null
   */
  getMetrics(headId: string): HydraMetrics | null {
    return this.metrics.get(headId) || null;
  }

  /**
   * Get all metrics
   * @returns All metrics
   */
  getAllMetrics(): HydraMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics history for a head
   * @param headId Hydra Head ID
   * @returns Metrics history
   */
  getMetricsHistory(headId: string): HydraMetrics[] {
    return this.metricsHistory.get(headId) || [];
  }

  /**
   * Calculate aggregated metrics across all heads
   * @returns Aggregated metrics
   */
  getAggregatedMetrics(): {
    totalHeads: number;
    totalTransactions: number;
    totalOperations: number;
    averageSpeedup: number;
    averageCostSavings: number;
    totalThroughputTPS: number;
    peakThroughputTPS: number;
  } {
    const allMetrics = Array.from(this.metrics.values());

    if (allMetrics.length === 0) {
      return {
        totalHeads: 0,
        totalTransactions: 0,
        totalOperations: 0,
        averageSpeedup: 0,
        averageCostSavings: 0,
        totalThroughputTPS: 0,
        peakThroughputTPS: 0,
      };
    }

    const totalTransactions = allMetrics.reduce((sum, m) => sum + m.totalTransactions, 0);
    const totalOperations = allMetrics.reduce((sum, m) => sum + m.totalOperations, 0);
    const averageSpeedup = allMetrics.reduce((sum, m) => sum + m.speedupFactor, 0) / allMetrics.length;
    const averageCostSavings = allMetrics.reduce((sum, m) => sum + m.costSavings, 0) / allMetrics.length;
    const totalThroughputTPS = allMetrics.reduce((sum, m) => sum + m.throughputTPS, 0);
    const peakThroughputTPS = Math.max(...allMetrics.map((m) => m.peakThroughputTPS));

    return {
      totalHeads: allMetrics.length,
      totalTransactions,
      totalOperations,
      averageSpeedup: Math.round(averageSpeedup * 10) / 10,
      averageCostSavings: Math.round(averageCostSavings * 100) / 100,
      totalThroughputTPS: Math.round(totalThroughputTPS * 100) / 100,
      peakThroughputTPS: Math.round(peakThroughputTPS * 100) / 100,
    };
  }

  /**
   * Generate comparison report: Mainchain vs Hydra
   * @param headId Hydra Head ID
   * @returns Comparison metrics
   */
  generateComparisonReport(headId: string): {
    headId: string;
    mainchainEstimate: {
      totalTime: number;
      totalCost: number;
      txsInMempool: number;
    };
    hydraActual: {
      totalTime: number;
      totalCost: number;
      parallelTxs: number;
      throughputTPS: number;
    };
    benefits: {
      speedupFactor: string;
      costReduction: string;
      parallelizationGain: string;
    };
  } | null {
    const metrics = this.metrics.get(headId);
    if (!metrics) return null;

    const mainchainTotalTime = metrics.mainchainTxsNeeded * HYDRA_PERFORMANCE_TARGETS.mainchainAvgTxTime;
    const mainchainTotalCost = metrics.mainchainTxsNeeded * metrics.mainchainCostPerTransaction;

    const hydraTotalTime = metrics.totalExecutionTime;
    const hydraTotalCost = metrics.successfulOperations * metrics.costPerTransaction;

    const speedupFactor = mainchainTotalTime / hydraTotalTime;
    const costReduction = ((mainchainTotalCost - hydraTotalCost) / mainchainTotalCost) * 100;
    const parallelizationGain = metrics.hydraParallelTxs / metrics.mainchainTxsNeeded;

    return {
      headId,
      mainchainEstimate: {
        totalTime: Math.round(mainchainTotalTime),
        totalCost: Math.round(mainchainTotalCost),
        txsInMempool: HYDRA_PERFORMANCE_TARGETS.mainchainMempoolSize,
      },
      hydraActual: {
        totalTime: Math.round(hydraTotalTime),
        totalCost: Math.round(hydraTotalCost),
        parallelTxs: metrics.hydraParallelTxs,
        throughputTPS: metrics.throughputTPS,
      },
      benefits: {
        speedupFactor: `${speedupFactor.toFixed(1)}x faster`,
        costReduction: `${costReduction.toFixed(2)}% cheaper`,
        parallelizationGain: `${parallelizationGain.toFixed(1)}x parallel improvement`,
      },
    };
  }

  /**
   * Check if performance targets are met
   * @param headId Hydra Head ID
   * @returns Target achievement status
   */
  checkPerformanceTargets(headId: string): {
    meetsSpeedupTarget: boolean;
    meetsCostTarget: boolean;
    meetsThroughputTarget: boolean;
    summary: string;
  } | null {
    const metrics = this.metrics.get(headId);
    if (!metrics) return null;

    const meetsSpeedupTarget = metrics.speedupFactor >= HYDRA_PERFORMANCE_TARGETS.expectedSpeedup;
    const meetsCostTarget = metrics.costSavings >= HYDRA_PERFORMANCE_TARGETS.expectedCostReduction * 100;
    const meetsThroughputTarget = metrics.throughputTPS > 0;

    const allMet = meetsSpeedupTarget && meetsCostTarget && meetsThroughputTarget;

    return {
      meetsSpeedupTarget,
      meetsCostTarget,
      meetsThroughputTarget,
      summary: allMet
        ? `✅ All targets met! (${metrics.speedupFactor}x speedup, ${metrics.costSavings.toFixed(2)}% cost reduction)`
        : `⚠️ Some targets not met. Speedup: ${metrics.speedupFactor}x (target: ${HYDRA_PERFORMANCE_TARGETS.expectedSpeedup}x), Cost: ${metrics.costSavings.toFixed(2)}%`,
    };
  }

  /**
   * Get performance summary report
   * @returns Human-readable summary
   */
  getPerformanceSummary(): string {
    const aggregated = this.getAggregatedMetrics();

    if (aggregated.totalHeads === 0) {
      return 'No metrics collected yet.';
    }

    return `
╔════════════════════════════════════════════════════════════════╗
║          HYDRA SCALING PERFORMANCE SUMMARY                     ║
╠════════════════════════════════════════════════════════════════╣
║ Total Hydra Heads:            ${aggregated.totalHeads}
║ Total Transactions Processed:  ${aggregated.totalTransactions}
║ Total Operations Executed:     ${aggregated.totalOperations}
║                                                                ║
║ PERFORMANCE METRICS:                                           ║
║ • Average Speedup Factor:      ${aggregated.averageSpeedup}x faster
║ • Average Cost Savings:        ${aggregated.averageCostSavings}%
║ • Total Throughput:            ${aggregated.totalThroughputTPS} TPS
║ • Peak Throughput:             ${aggregated.peakThroughputTPS} TPS
╚════════════════════════════════════════════════════════════════╝
    `;
  }

  /**
   * Clear metrics (for testing)
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.metricsHistory.clear();
    this.startTime = new Date();
  }

  private initializeMetrics(headId: string): HydraMetrics {
    return {
      headId,
      totalTransactions: 0,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageTxTime: 0,
      totalExecutionTime: 0,
      mainchainTxsNeeded: 0,
      hydraParallelTxs: 0,
      speedupFactor: 0,
      costPerTransaction: 0,
      mainchainCostPerTransaction: 0,
      costSavings: 0,
      throughputTPS: 0,
      peakThroughputTPS: 0,
    };
  }
}

export default HydraMonitoringService;
