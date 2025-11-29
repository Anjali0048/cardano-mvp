const API_BASE = 'http://localhost:3001';

export interface RiskAnalysisResult {
  success: boolean;
  analysis?: {
    action: 'EMERGENCY_EXIT' | 'STAY';
    garchVolatility: string;
    lstmVolatility: string;
    confidence: string;
    reason: string;
    timestamp: number;
    recommendation: string;
  };
  error?: string;
}

export interface MonitoringResult {
  success: boolean;
  message?: string;
  vaults?: Array<{
    tokenA: string;
    tokenB: string;
    ilThreshold: number;
  }>;
  error?: string;
}

/**
 * Analyze risk for a specific token pair
 */
export async function analyzeVaultRisk(
  tokenA: string,
  tokenB: string,
  ilThreshold: number
): Promise<RiskAnalysisResult> {
  try {
    const response = await fetch(`${API_BASE}/api/risk/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenA, tokenB, ilThreshold })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Risk analysis failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Start continuous monitoring for multiple vaults
 */
export async function startMonitoringVaults(
  vaults: Array<{
    tokenA: string;
    tokenB: string;
    ilThreshold: number;
    vaultId?: string;
  }>
): Promise<MonitoringResult> {
  try {
    const response = await fetch(`${API_BASE}/api/risk/start-monitoring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vaults })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Start monitoring failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Stop monitoring
 */
export async function stopMonitoring(): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/risk/stop-monitoring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get current monitoring status
 */
export async function getMonitoringStatus(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/api/risk/status`);
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Format risk level for display
 */
export function formatRiskLevel(volatility: number): {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  color: string;
  emoji: string;
  bgColor: string;
} {
  if (volatility < 1) {
    return { level: 'LOW', color: 'text-green-600', bgColor: 'bg-green-100', emoji: '🟢' };
  } else if (volatility < 2) {
    return { level: 'MEDIUM', color: 'text-yellow-600', bgColor: 'bg-yellow-100', emoji: '🟡' };
  } else if (volatility < 3) {
    return { level: 'HIGH', color: 'text-orange-600', bgColor: 'bg-orange-100', emoji: '🟠' };
  } else {
    return { level: 'CRITICAL', color: 'text-red-600', bgColor: 'bg-red-100', emoji: '🔴' };
  }
}
