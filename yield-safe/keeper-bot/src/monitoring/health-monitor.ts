import { logger } from "../utils/logger.js";
import { DatabaseService } from "../database/database.js";
import { BlockchainService } from "../blockchain/blockchain.js";

export interface HealthStatus {
  service: string;
  status: "healthy" | "warning" | "critical";
  message: string;
  lastCheck: number;
  uptime?: number;
  details?: any;
}

export class HealthMonitor {
  private database: DatabaseService;
  private blockchain: BlockchainService;
  private startTime: number = Date.now();
  private lastHealthCheck: number = 0;
  private healthStatuses: Map<string, HealthStatus> = new Map();

  constructor(database: DatabaseService, blockchain: BlockchainService) {
    this.database = database;
    this.blockchain = blockchain;
  }

  async checkHealth(): Promise<HealthStatus[]> {
    logger.debug("🏥 Running health checks...");
    this.lastHealthCheck = Date.now();

    const checks = [
      this.checkDatabaseHealth(),
      this.checkBlockchainHealth(),
      this.checkSystemHealth()
    ];

    const results = await Promise.all(checks);
    
    // Update internal status map
    results.forEach(status => {
      this.healthStatuses.set(status.service, status);
    });

    const criticalCount = results.filter(r => r.status === "critical").length;
    const warningCount = results.filter(r => r.status === "warning").length;
    
    if (criticalCount > 0) {
      logger.error(`❌ Health check: ${criticalCount} critical issues found`);
    } else if (warningCount > 0) {
      logger.warn(`⚠️  Health check: ${warningCount} warnings found`);
    } else {
      logger.info("✅ All health checks passed");
    }

    return results;
  }

  private async checkDatabaseHealth(): Promise<HealthStatus> {
    try {
      // Test database connectivity
      await this.database.getVaultData("health_check_test");
      
      return {
        service: "database",
        status: "healthy",
        message: "Database connection is working",
        lastCheck: Date.now(),
        uptime: Date.now() - this.startTime
      };
    } catch (error) {
      return {
        service: "database",
        status: "critical",
        message: `Database connection failed: ${error}`,
        lastCheck: Date.now(),
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async checkBlockchainHealth(): Promise<HealthStatus> {
    try {
      // Test blockchain connectivity
      const currentSlot = await this.blockchain.getCurrentSlot();
      
      return {
        service: "blockchain",
        status: "healthy",
        message: "Blockchain connection is working",
        lastCheck: Date.now(),
        uptime: Date.now() - this.startTime,
        details: { currentSlot }
      };
    } catch (error) {
      return {
        service: "blockchain",
        status: "critical",
        message: `Blockchain connection failed: ${error}`,
        lastCheck: Date.now(),
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async checkSystemHealth(): Promise<HealthStatus> {
    try {
      const memUsage = process.memoryUsage();
      const uptime = Date.now() - this.startTime;
      
      // Convert bytes to MB
      const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      
      let status: "healthy" | "warning" | "critical" = "healthy";
      let message = "System is running normally";
      
      if (memUsedMB > 500) {
        status = "warning";
        message = "High memory usage detected";
      }
      
      if (memUsedMB > 1000) {
        status = "critical";
        message = "Critical memory usage - restart recommended";
      }

      return {
        service: "system",
        status,
        message,
        lastCheck: Date.now(),
        uptime,
        details: {
          memoryUsedMB: memUsedMB,
          memoryTotalMB: memTotalMB,
          uptimeMs: uptime,
          nodeVersion: process.version
        }
      };
    } catch (error) {
      return {
        service: "system",
        status: "critical",
        message: `System health check failed: ${error}`,
        lastCheck: Date.now(),
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  getLastHealthCheck(): number {
    return this.lastHealthCheck;
  }

  getServiceStatus(serviceName: string): HealthStatus | undefined {
    return this.healthStatuses.get(serviceName);
  }

  getAllStatuses(): HealthStatus[] {
    return Array.from(this.healthStatuses.values());
  }

  getOverallStatus(): "healthy" | "warning" | "critical" {
    const statuses = this.getAllStatuses();
    
    if (statuses.some(s => s.status === "critical")) {
      return "critical";
    }
    
    if (statuses.some(s => s.status === "warning")) {
      return "warning";
    }
    
    return "healthy";
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }
}