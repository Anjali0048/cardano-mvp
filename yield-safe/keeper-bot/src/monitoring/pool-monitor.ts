import { logger } from "../utils/logger.js";
import { BlockchainService } from "../blockchain/blockchain.js";
import { DatabaseService } from "../database/database.js";
import { Lucid } from "lucid-cardano";

export interface PoolData {
  poolId: string;
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  totalShares: number;
  lastUpdate: number;
}

export interface ImpermanentLossData {
  poolId: string;
  userAddress: string;
  initialRatio: number;
  currentRatio: number;
  ilPercentage: number;
  timestamp: number;
}

export class PoolMonitor {
  private lucid: Lucid;
  private database: DatabaseService;
  private monitoredPools: Set<string> = new Set();
  private poolData: Map<string, PoolData> = new Map();
  private monitoringActive: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(lucid: Lucid, database: DatabaseService) {
    this.lucid = lucid;
    this.database = database;
  }

  async initialize() {
    logger.info("🏊 Initializing Pool Monitor...");
    
    // Add some demo pools
    this.addPool("demo_pool_ada_usdc");
    this.addPool("demo_pool_ada_djed");
    this.addPool("demo_pool_ada_token");
    
    logger.info(`✅ Pool Monitor initialized with ${this.monitoredPools.size} pools`);
  }

  addPool(poolId: string) {
    this.monitoredPools.add(poolId);
    logger.info(`📈 Added pool ${poolId} to monitoring`);
    
    // Initialize with mock data
    this.poolData.set(poolId, {
      poolId,
      tokenA: "ADA",
      tokenB: "TOKEN_" + poolId.split("_")[3]?.toUpperCase() || "UNKNOWN",
      reserveA: 1000000 + Math.random() * 500000,
      reserveB: 500000 + Math.random() * 250000,
      totalShares: 100000,
      lastUpdate: Date.now()
    });
  }

  removePool(poolId: string) {
    this.monitoredPools.delete(poolId);
    this.poolData.delete(poolId);
    logger.info(`📉 Removed pool ${poolId} from monitoring`);
  }

  async startMonitoring() {
    if (this.monitoringActive) {
      logger.warn("⚠️  Pool monitoring is already active");
      return;
    }

    logger.info("🔄 Starting pool monitoring...");
    this.monitoringActive = true;

    // Start periodic updates
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateAllPoolPrices();
      } catch (error) {
        logger.error(`❌ Error in pool monitoring cycle: ${error}`);
      }
    }, 60000); // Update every minute

    await this.updatePoolData();
  }

  async stopMonitoring() {
    if (!this.monitoringActive) {
      return;
    }

    logger.info("🛑 Stopping pool monitoring...");
    this.monitoringActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  async updatePoolData() {
    logger.debug("🔄 Updating pool data...");
    
    for (const poolId of this.monitoredPools) {
      try {
        await this.fetchPoolData(poolId);
      } catch (error) {
        logger.error(`❌ Failed to update pool ${poolId}: ${error}`);
      }
    }
  }

  async updateAllPoolPrices() {
    logger.debug("📊 Updating all pool prices...");
    await this.updatePoolData();
  }

  private async fetchPoolData(poolId: string) {
    // Simulate fetching real pool data
    const existing = this.poolData.get(poolId);
    if (!existing) return;

    // Simulate price fluctuation (±5%)
    const priceChange = (Math.random() - 0.5) * 0.1;
    const newReserveA = existing.reserveA * (1 + priceChange);
    const newReserveB = existing.reserveB * (1 - priceChange);

    const updated: PoolData = {
      ...existing,
      reserveA: newReserveA,
      reserveB: newReserveB,
      lastUpdate: Date.now()
    };

    this.poolData.set(poolId, updated);
    logger.debug(`📊 Updated pool ${poolId} data`);
  }

  getPoolData(poolId: string): PoolData | undefined {
    return this.poolData.get(poolId);
  }

  getAllPools(): PoolData[] {
    return Array.from(this.poolData.values());
  }

  calculateImpermanentLoss(
    poolId: string,
    userAddress: string,
    initialRatio: number
  ): ImpermanentLossData | null {
    const pool = this.poolData.get(poolId);
    if (!pool) {
      logger.warn(`⚠️  Pool ${poolId} not found for IL calculation`);
      return null;
    }

    const currentRatio = pool.reserveA / pool.reserveB;
    const r = currentRatio / initialRatio;
    
    // IL formula: 2√(r)/(1+r) - 1
    const sqrtR = Math.sqrt(r);
    const ilPercentage = (2 * sqrtR) / (1 + r) - 1;

    return {
      poolId,
      userAddress,
      initialRatio,
      currentRatio,
      ilPercentage: Math.abs(ilPercentage), // Return absolute value
      timestamp: Date.now()
    };
  }

  getMonitoredPools(): string[] {
    return Array.from(this.monitoredPools);
  }

  isMonitoring(): boolean {
    return this.monitoringActive;
  }
}