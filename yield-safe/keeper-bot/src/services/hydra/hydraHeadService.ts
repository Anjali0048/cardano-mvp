/**
 * Hydra Head Service
 * Manages Hydra Head lifecycle: initialization, participant management, and commits
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import {
  HydraHead,
  HydraHeadInitParams,
  HydraMessage,
  HydraParticipant,
  HydraHeadStatus,
  HydraUTxO,
} from '../../types/hydra';
import { getHydraConfig, getParticipantConfig, HYDRA_MONITORING_THRESHOLDS } from '../../config/hydraConfig';

/**
 * Service for managing Hydra Head lifecycle and operations
 */
export class HydraHeadService extends EventEmitter {
  private hydraHeads: Map<string, HydraHead> = new Map();
  private activeHeadId: string | null = null;
  private messageQueue: HydraMessage[] = [];
  private participantConnections: Map<string, boolean> = new Map();

  constructor() {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.on('head-opened', (headId: string) => {
      logger.info(`[Hydra] Head opened: ${headId}`);
      this.activeHeadId = headId;
    });

    this.on('head-closed', (headId: string) => {
      logger.info(`[Hydra] Head closed: ${headId}`);
      if (this.activeHeadId === headId) {
        this.activeHeadId = null;
      }
    });

    this.on('participant-connected', (participantId: string) => {
      logger.info(`[Hydra] Participant connected: ${participantId}`);
      this.participantConnections.set(participantId, true);
    });

    this.on('participant-disconnected', (participantId: string) => {
      logger.warn(`[Hydra] Participant disconnected: ${participantId}`);
      this.participantConnections.set(participantId, false);
    });
  }

  /**
   * Initialize a new Hydra Head with specified parameters
   * @param params Initialization parameters
   * @returns Initialized HydraHead instance
   */
  async initializeHead(params: HydraHeadInitParams): Promise<HydraHead> {
    try {
      logger.info(`[Hydra] Initializing head: ${params.headName}`);

      const headId = this.generateHeadId();
      const hydraConfig = getHydraConfig();

      // Create head instance
      const head: HydraHead = {
        headId,
        contractId: `contract-${headId}`,
        status: 'initializing',
        participants: [
          this.participantConfigToParticipant(params.operator, 'operator'),
          ...params.witnesses.map((w) => this.participantConfigToParticipant(w, 'witness')),
          ...params.participants.map((p) => this.participantConfigToParticipant(p, 'participant')),
        ],
        commitDeadline: new Date(Date.now() + 3600000), // 1 hour
        initialUTxO: [],
        createdAt: new Date(),
      };

      // Simulate participant initialization
      await this.initializeParticipants(head);

      // Wait for all participants to connect
      await this.waitForParticipantConnections(head.participants);

      head.status = 'open';
      this.hydraHeads.set(headId, head);

      logger.info(`[Hydra] Head initialized successfully: ${headId}`);
      this.emit('head-opened', headId);

      return head;
    } catch (error) {
      logger.error(`[Hydra] Failed to initialize head: ${error}`);
      throw error;
    }
  }

  /**
   * Commit UTxOs to a Hydra Head
   * @param headId Hydra Head ID
   * @param participant Participant committing
   * @param utxos UTxOs to commit
   * @returns Commitment confirmation
   */
  async commitUTxOs(headId: string, participant: string, utxos: HydraUTxO[]): Promise<boolean> {
    try {
      const head = this.hydraHeads.get(headId);
      if (!head) {
        throw new Error(`Head not found: ${headId}`);
      }

      if (head.status !== 'initializing' && head.status !== 'open') {
        throw new Error(`Cannot commit to head in status: ${head.status}`);
      }

      // Calculate total committed amount
      const totalAmount = utxos.reduce((sum, utxo) => sum + utxo.amount, 0n);

      // Find participant and update
      const part = head.participants.find((p) => p.id === participant);
      if (!part) {
        throw new Error(`Participant not found: ${participant}`);
      }

      part.committedAmount = totalAmount;

      // Add to initial UTxOs
      head.initialUTxO.push(...utxos);

      const message: HydraMessage = {
        messageId: this.generateMessageId(),
        headId,
        type: 'committed',
        sender: participant,
        timestamp: new Date(),
        payload: {
          utxos: utxos.length,
          amount: totalAmount.toString(),
        },
      };

      this.messageQueue.push(message);
      logger.info(`[Hydra] Committed ${utxos.length} UTxOs to head ${headId}`);

      return true;
    } catch (error) {
      logger.error(`[Hydra] Failed to commit UTxOs: ${error}`);
      return false;
    }
  }

  /**
   * Get status of a Hydra Head
   * @param headId Hydra Head ID
   * @returns Current head status
   */
  getHeadStatus(headId: string): HydraHeadStatus | null {
    const head = this.hydraHeads.get(headId);
    if (!head) return null;

    const connectedParticipants = head.participants.filter((p) => p.isConnected).length;
    const totalCommitted = head.participants.reduce((sum, p) => sum + p.committedAmount, 0n);

    return {
      headId,
      status: head.status,
      participantCount: head.participants.length,
      connectedParticipants,
      totalCommittedAmount: totalCommitted,
      pendingTransactions: 0, // Will be populated during execution
      processedTransactions: 0,
      totalOperations: 0,
      lastUpdate: new Date(),
    };
  }

  /**
   * Get all Hydra Heads
   * @returns List of all heads
   */
  getAllHeads(): HydraHead[] {
    return Array.from(this.hydraHeads.values());
  }

  /**
   * Get active Hydra Head
   * @returns Currently active head or null
   */
  getActiveHead(): HydraHead | null {
    if (!this.activeHeadId) return null;
    return this.hydraHeads.get(this.activeHeadId) || null;
  }

  /**
   * Close a Hydra Head (initiate settlement)
   * @param headId Hydra Head ID
   * @returns Closure confirmation
   */
  async closeHead(headId: string): Promise<boolean> {
    try {
      const head = this.hydraHeads.get(headId);
      if (!head) {
        throw new Error(`Head not found: ${headId}`);
      }

      head.status = 'closing';
      head.contestDeadline = new Date(Date.now() + HYDRA_MONITORING_THRESHOLDS.settlementTimeout);

      logger.info(`[Hydra] Initiating close for head ${headId}`);
      this.emit('head-closing', headId);

      // Simulate closure delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      head.status = 'closed';
      head.closedAt = new Date();

      logger.info(`[Hydra] Head closed: ${headId}`);
      this.emit('head-closed', headId);

      return true;
    } catch (error) {
      logger.error(`[Hydra] Failed to close head: ${error}`);
      return false;
    }
  }

  /**
   * Get pending messages for a head
   * @param headId Hydra Head ID
   * @returns Pending messages
   */
  getPendingMessages(headId: string): HydraMessage[] {
    return this.messageQueue.filter((m) => m.headId === headId);
  }

  /**
   * Acknowledge a message (remove from queue)
   * @param messageId Message ID
   * @returns Acknowledgement success
   */
  acknowledgeMessage(messageId: string): boolean {
    const index = this.messageQueue.findIndex((m) => m.messageId === messageId);
    if (index !== -1) {
      this.messageQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get participant information
   * @param headId Hydra Head ID
   * @param participantId Participant ID
   * @returns Participant details
   */
  getParticipant(headId: string, participantId: string): HydraParticipant | null {
    const head = this.hydraHeads.get(headId);
    if (!head) return null;
    return head.participants.find((p) => p.id === participantId) || null;
  }

  /**
   * Get all participants in a head
   * @param headId Hydra Head ID
   * @returns List of participants
   */
  getParticipants(headId: string): HydraParticipant[] {
    const head = this.hydraHeads.get(headId);
    return head ? head.participants : [];
  }

  /**
   * Check participant connectivity
   * @param participantId Participant ID
   * @returns Connection status
   */
  isParticipantConnected(participantId: string): boolean {
    return this.participantConnections.get(participantId) ?? false;
  }

  /**
   * Get head participation summary
   * @param headId Hydra Head ID
   * @returns Participation statistics
   */
  getParticipationSummary(headId: string): {
    totalParticipants: number;
    connectedParticipants: number;
    totalCommitted: bigint;
    connectionPercentage: number;
  } {
    const head = this.hydraHeads.get(headId);
    if (!head) {
      return {
        totalParticipants: 0,
        connectedParticipants: 0,
        totalCommitted: 0n,
        connectionPercentage: 0,
      };
    }

    const connectedCount = head.participants.filter((p) => p.isConnected).length;
    const totalCommitted = head.participants.reduce((sum, p) => sum + p.committedAmount, 0n);

    return {
      totalParticipants: head.participants.length,
      connectedParticipants: connectedCount,
      totalCommitted,
      connectionPercentage: (connectedCount / head.participants.length) * 100,
    };
  }

  // ===== Private Helpers =====

  private async initializeParticipants(head: HydraHead): Promise<void> {
    for (const participant of head.participants) {
      // Simulate participant initialization
      participant.isConnected = true;
      this.participantConnections.set(participant.id, true);
      this.emit('participant-connected', participant.id);

      logger.debug(`[Hydra] Initialized participant: ${participant.name} (${participant.role})`);
    }
  }

  private async waitForParticipantConnections(participants: HydraParticipant[]): Promise<void> {
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds

    while (Date.now() - startTime < timeout) {
      const allConnected = participants.every((p) => p.isConnected);
      if (allConnected) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error('Timeout waiting for participant connections');
  }

  private participantConfigToParticipant(
    config: any,
    role: 'operator' | 'witness' | 'participant',
  ): HydraParticipant {
    return {
      id: `participant-${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      role,
      hydraVerificationKey: this.generateVerificationKey(),
      cardanoVerificationKey: this.generateVerificationKey(),
      isConnected: false,
      committedAmount: 0n,
    };
  }

  private generateHeadId(): string {
    return `head-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVerificationKey(): string {
    return `vk-${Math.random().toString(36).substr(2, 16)}`;
  }
}

// Singleton instance
export const hydraHeadService = new HydraHeadService();

export default hydraHeadService;
