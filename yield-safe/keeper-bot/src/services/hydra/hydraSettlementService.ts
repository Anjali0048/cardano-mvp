/**
 * Hydra Settlement Service
 * Handles settlement of final Hydra state back to mainchain
 */

import { logger } from '../../utils/logger';
import { HydraState, SettlementTx, HydraUTxO } from '../../types/hydra';
import { HYDRA_MONITORING_THRESHOLDS } from '../../config/hydraConfig';

/**
 * Manages settlement of Hydra snapshots to mainchain
 */
export class HydraSettlementService {
  private pendingSettlements: Map<string, SettlementTx> = new Map();
  private finalizedSettlements: Map<string, SettlementTx> = new Map();

  /**
   * Submit Hydra state snapshot for settlement
   * @param headId Hydra Head ID
   * @param snapshot Final Hydra state snapshot
   * @returns Settlement transaction
   */
  async submitSettlement(headId: string, snapshot: HydraState): Promise<SettlementTx> {
    try {
      logger.info(`[Hydra Settlement] Submitting settlement for head ${headId}`);

      const settlementTx: SettlementTx = {
        txId: this.generateSettlementTxId(),
        headId,
        snapshot,
        settledUTxOs: snapshot.utxos,
        contestationDeadline: new Date(Date.now() + HYDRA_MONITORING_THRESHOLDS.settlementTimeout),
        status: 'pending',
      };

      this.pendingSettlements.set(settlementTx.txId, settlementTx);

      logger.info(`[Hydra Settlement] Settlement transaction created: ${settlementTx.txId}`);
      logger.debug(
        `[Hydra Settlement] Settling ${snapshot.utxos.length} UTxOs from snapshot ${snapshot.snapshotNumber}`,
      );

      return settlementTx;
    } catch (error) {
      logger.error(`[Hydra Settlement] Failed to submit settlement: ${error}`);
      throw error;
    }
  }

  /**
   * Post settlement transaction to mainchain
   * @param settlementTx Settlement transaction to post
   * @returns Main chain transaction ID
   */
  async postToMainchain(settlementTx: SettlementTx): Promise<string> {
    try {
      if (settlementTx.status !== 'pending') {
        throw new Error(`Cannot post settlement in status: ${settlementTx.status}`);
      }

      logger.info(`[Hydra Settlement] Posting settlement ${settlementTx.txId} to mainchain`);

      // Simulate posting to mainchain
      const mainchainTxId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      settlementTx.mainchainTxId = mainchainTxId;
      settlementTx.status = 'posted';

      logger.info(`[Hydra Settlement] Settlement posted to mainchain: ${mainchainTxId}`);

      // Simulate confirmation delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      return mainchainTxId;
    } catch (error) {
      logger.error(`[Hydra Settlement] Failed to post settlement to mainchain: ${error}`);
      settlementTx.status = 'pending'; // Reset status for retry
      throw error;
    }
  }

  /**
   * Finalize a posted settlement (after contestation period)
   * @param settlementTxId Settlement transaction ID
   * @returns Finalization confirmation
   */
  async finalizeSettlement(settlementTxId: string): Promise<boolean> {
    try {
      const settlementTx = this.pendingSettlements.get(settlementTxId);
      if (!settlementTx) {
        logger.warn(`[Hydra Settlement] Settlement not found: ${settlementTxId}`);
        return false;
      }

      if (settlementTx.status !== 'posted') {
        throw new Error(`Cannot finalize settlement in status: ${settlementTx.status}`);
      }

      // Check contestation deadline
      if (new Date() < settlementTx.contestationDeadline) {
        throw new Error('Contestation period not yet expired');
      }

      settlementTx.status = 'finalized';
      this.pendingSettlements.delete(settlementTxId);
      this.finalizedSettlements.set(settlementTxId, settlementTx);

      logger.info(`[Hydra Settlement] Settlement finalized: ${settlementTxId}`);

      return true;
    } catch (error) {
      logger.error(`[Hydra Settlement] Failed to finalize settlement: ${error}`);
      return false;
    }
  }

  /**
   * Dispute a settlement (during contestation period)
   * @param settlementTxId Settlement transaction ID
   * @param reason Dispute reason
   * @returns Dispute submission confirmation
   */
  async disputeSettlement(settlementTxId: string, reason: string): Promise<boolean> {
    try {
      const settlementTx = this.pendingSettlements.get(settlementTxId);
      if (!settlementTx) {
        logger.warn(`[Hydra Settlement] Settlement not found: ${settlementTxId}`);
        return false;
      }

      if (settlementTx.status !== 'posted') {
        throw new Error(`Cannot dispute settlement in status: ${settlementTx.status}`);
      }

      if (new Date() > settlementTx.contestationDeadline) {
        throw new Error('Contestation period has expired');
      }

      logger.warn(`[Hydra Settlement] Settlement disputed: ${settlementTxId} - Reason: ${reason}`);

      settlementTx.status = 'contested';
      settlementTx.error = reason;

      return true;
    } catch (error) {
      logger.error(`[Hydra Settlement] Failed to dispute settlement: ${error}`);
      return false;
    }
  }

  /**
   * Get settlement transaction details
   * @param settlementTxId Settlement transaction ID
   * @returns Settlement transaction details or null
   */
  getSettlement(settlementTxId: string): SettlementTx | null {
    return this.pendingSettlements.get(settlementTxId) || this.finalizedSettlements.get(settlementTxId) || null;
  }

  /**
   * Get all pending settlements
   * @param headId Optional filter by head ID
   * @returns List of pending settlements
   */
  getPendingSettlements(headId?: string): SettlementTx[] {
    return Array.from(this.pendingSettlements.values()).filter((st) => !headId || st.headId === headId);
  }

  /**
   * Get all finalized settlements
   * @param headId Optional filter by head ID
   * @returns List of finalized settlements
   */
  getFinalizedSettlements(headId?: string): SettlementTx[] {
    return Array.from(this.finalizedSettlements.values()).filter((st) => !headId || st.headId === headId);
  }

  /**
   * Get all settlements (pending + finalized)
   * @param headId Optional filter by head ID
   * @returns All settlements
   */
  getAllSettlements(headId?: string): SettlementTx[] {
    const all = [...Array.from(this.pendingSettlements.values()), ...Array.from(this.finalizedSettlements.values())];

    if (headId) {
      return all.filter((st) => st.headId === headId);
    }

    return all;
  }

  /**
   * Get settlement statistics
   * @returns Settlement statistics
   */
  getSettlementStatistics(): {
    totalSubmitted: number;
    pending: number;
    posted: number;
    finalized: number;
    contested: number;
    totalUTxOsSettled: number;
    averageSettlementTime: number;
  } {
    const pending = this.pendingSettlements.size;
    const finalized = this.finalizedSettlements.size;

    const allSettlements = [...Array.from(this.pendingSettlements.values()), ...Array.from(this.finalizedSettlements.values())];

    const posted = allSettlements.filter((s) => s.status === 'posted').length;
    const contested = allSettlements.filter((s) => s.status === 'contested').length;
    const totalUTxOsSettled = allSettlements.reduce((sum, s) => sum + s.settledUTxOs.length, 0);

    // Calculate average settlement time
    const finalizedSettlements = Array.from(this.finalizedSettlements.values());
    const averageSettlementTime =
      finalizedSettlements.length > 0
        ? finalizedSettlements.reduce((sum, s) => {
            const submissionTime = s.snapshot.timestamp.getTime();
            const settlementTime = new Date().getTime() - submissionTime;
            return sum + settlementTime;
          }, 0) / finalizedSettlements.length
        : 0;

    return {
      totalSubmitted: allSettlements.length,
      pending,
      posted,
      finalized,
      contested,
      totalUTxOsSettled,
      averageSettlementTime,
    };
  }

  /**
   * Get contested settlements
   * @returns List of contested settlements
   */
  getContestedSettlements(): SettlementTx[] {
    const contested: SettlementTx[] = [];

    for (const settlement of this.pendingSettlements.values()) {
      if (settlement.status === 'contested') {
        contested.push(settlement);
      }
    }

    return contested;
  }

  /**
   * Get contestation status for a settlement
   * @param settlementTxId Settlement transaction ID
   * @returns Contestation status and remaining time
   */
  getContestationStatus(settlementTxId: string): {
    isActive: boolean;
    remainingTimeMs: number;
    deadline: Date;
  } | null {
    const settlement = this.getSettlement(settlementTxId);
    if (!settlement) return null;

    const now = new Date();
    const remainingTimeMs = settlement.contestationDeadline.getTime() - now.getTime();
    const isActive = remainingTimeMs > 0;

    return {
      isActive,
      remainingTimeMs: Math.max(0, remainingTimeMs),
      deadline: settlement.contestationDeadline,
    };
  }

  /**
   * Clear old settlements (for testing/cleanup)
   * @param ageMs Age threshold in milliseconds
   */
  clearOldSettlements(ageMs: number = 3600000): void {
    const threshold = Date.now() - ageMs;

    for (const [txId, settlement] of this.finalizedSettlements.entries()) {
      if (settlement.snapshot.timestamp.getTime() < threshold) {
        this.finalizedSettlements.delete(txId);
      }
    }
  }

  private generateSettlementTxId(): string {
    return `settlement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default HydraSettlementService;
