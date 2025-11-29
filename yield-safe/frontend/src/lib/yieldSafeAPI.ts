// API Service to connect frontend with our IL calculator backend
import { config } from "./apiConfig";

export class YieldSafeAPI {
    private baseUrl: string;

    constructor() {
        // This will connect to our keeper bot service
        this.baseUrl = config.api.baseUrl;
    }

    // Get real IL data for a vault
    async getVaultILData(
        tokenA: string,
        tokenB: string,
        entryPrice: number,
        ilThreshold?: number,
        depositAmount?: number,
        tokenBAmount?: number,
        lpTokens?: number
    ): Promise<{
        currentPrice: number;
        ilPercentage: number;
        ilAmount: number;
        shouldTriggerProtection: boolean;
        dataSource: string;
    }> {
        try {
            const response = await fetch(config.api.endpoints.ilStatus, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tokenA,
                    tokenB,
                    entryPrice,
                    ilThreshold,
                    depositAmount,
                    tokenBAmount,
                    lpTokens,
                    dex: "MinswapV2",
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to fetch IL data:", error);
            throw error;
        }
    }

    // Get real-time pool data
    async getPoolData(
        tokenA: string,
        tokenB: string
    ): Promise<{
        pair: string;
        price: number;
        tvl: number;
        volume24h: number;
        timestamp: number;
    }> {
        try {
            const response = await fetch(`${this.baseUrl}/api/pool/data`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tokenA, tokenB, dex: "MinswapV2" }),
            });

            return await response.json();
        } catch (error) {
            console.error("Failed to fetch pool data:", error);
            throw error;
        }
    }

    // Monitor vault IL in real-time
    async startVaultMonitoring(
        vaultId: string,
        monitorConfig: {
            tokenA: string;
            tokenB: string;
            entryPrice: number;
            ilThreshold: number;
        }
    ): Promise<{ success: boolean }> {
        try {
            const response = await fetch(`${this.baseUrl}/api/vault/monitor`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vaultId, ...monitorConfig }),
            });

            return await response.json();
        } catch (error) {
            console.error("Failed to start monitoring:", error);
            throw error;
        }
    }
}

