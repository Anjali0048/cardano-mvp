/**
 * Hydra Services Index
 * Central export point for all Hydra-related services and types
 */

// Type definitions
export * from '../types/hydra';

// Configuration
export {
  DEFAULT_HYDRA_CONFIG,
  YIELD_SAFE_HYDRA_HEAD,
  HYDRA_PERFORMANCE_TARGETS,
  HYDRA_REBALANCING_CONFIG,
  HYDRA_MONITORING_THRESHOLDS,
  HYDRA_NETWORK_TOPOLOGY,
  getHydraConfig,
  getParticipantConfig,
  validateHydraConfig,
} from '../config/hydraConfig';

// Services
export { HydraHeadService, hydraHeadService } from './hydraHeadService';
export { default as HydraRebalancingBatcher } from './hydraRebalancingBatcher';
export { default as HydraSettlementService } from './hydraSettlementService';
export { default as HydraMonitoringService } from './hydraMonitoringService';

// Unified Hydra Service
import { HydraHeadService } from './hydraHeadService';
import HydraRebalancingBatcher from './hydraRebalancingBatcher';
import HydraSettlementService from './hydraSettlementService';
import HydraMonitoringService from './hydraMonitoringService';
import { logger } from '../../utils/logger';

/**
 * Unified Hydra Service Factory
 * Provides convenient access to all Hydra functionality
 */
export class HydraService {
  private head: HydraHeadService;
  private batcher: HydraRebalancingBatcher;
  private settlement: HydraSettlementService;
  private monitoring: HydraMonitoringService;

  constructor() {
    this.head = new HydraHeadService();
    this.batcher = new HydraRebalancingBatcher();
    this.settlement = new HydraSettlementService();
    this.monitoring = new HydraMonitoringService();

    logger.info('[Hydra] Services initialized');
  }

  /**
   * Get Head Service
   */
  getHeadService(): HydraHeadService {
    return this.head;
  }

  /**
   * Get Batcher Service
   */
  getBatcher(): HydraRebalancingBatcher {
    return this.batcher;
  }

  /**
   * Get Settlement Service
   */
  getSettlementService(): HydraSettlementService {
    return this.settlement;
  }

  /**
   * Get Monitoring Service
   */
  getMonitoringService(): HydraMonitoringService {
    return this.monitoring;
  }

  /**
   * Get all services together
   */
  getAllServices() {
    return {
      head: this.head,
      batcher: this.batcher,
      settlement: this.settlement,
      monitoring: this.monitoring,
    };
  }
}

// Singleton instance
export const hydraService = new HydraService();

export default hydraService;
