/**
 * Masumi Agent Service Client
 * 
 * Frontend service to interact with the Masumi-compatible
 * YieldSafe Risk Analyzer agent
 */

const API_BASE = 'http://localhost:3001';

export interface MasumiJobInput {
  tokenA: string;
  tokenB: string;
  ilThreshold: number;
  vaultId?: string;
}

export interface StartJobResponse {
  id: string;
  status: 'success' | 'error';
  job_id: string;
  blockchainIdentifier: string;
  payByTime: number;
  submitResultTime: number;
  agentIdentifier: string;
  sellerVKey: string;
  input_hash: string;
  message?: string;
}

export interface JobStatusResponse {
  id: string;
  job_id: string;
  status: 'awaiting_payment' | 'awaiting_input' | 'running' | 'completed' | 'failed';
  result?: string;
}

export interface RiskResult {
  action: 'STAY' | 'EMERGENCY_EXIT';
  garchVolatility: string;
  lstmVolatility: string;
  confidence: string;
  reason: string;
  recommendation: string;
}

export interface AgentMetadata {
  identifier: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  pricing: {
    currency: string;
    amount: number;
    model: string;
  };
  endpoints: {
    start_job: string;
    status: string;
    availability: string;
    input_schema: string;
  };
}

export interface JobSummary {
  job_id: string;
  status: string;
  tokenPair: string;
  ilThreshold: number;
  created: string;
  result: string | null;
}

export class MasumiService {
  private purchaserId: string;

  constructor(walletAddress?: string) {
    // Use wallet address as purchaser ID, or generate a random one
    this.purchaserId = walletAddress || `user-${Date.now()}`;
  }

  /**
   * Set the purchaser identifier (wallet address)
   */
  setPurchaserId(walletAddress: string) {
    this.purchaserId = walletAddress;
  }

  /**
   * Check agent availability
   */
  async checkAvailability(): Promise<{ status: 'available' | 'unavailable'; message: string }> {
    const response = await fetch(`${API_BASE}/api/masumi/availability`);
    if (!response.ok) {
      throw new Error('Failed to check availability');
    }
    return response.json();
  }

  /**
   * Get agent metadata
   */
  async getAgentMetadata(): Promise<AgentMetadata> {
    const response = await fetch(`${API_BASE}/api/masumi/metadata`);
    if (!response.ok) {
      throw new Error('Failed to get agent metadata');
    }
    return response.json();
  }

  /**
   * Get input schema
   */
  async getInputSchema(): Promise<any> {
    const response = await fetch(`${API_BASE}/api/masumi/input_schema`);
    if (!response.ok) {
      throw new Error('Failed to get input schema');
    }
    return response.json();
  }

  /**
   * Start a risk analysis job
   */
  async startRiskAnalysis(input: MasumiJobInput): Promise<StartJobResponse> {
    const response = await fetch(`${API_BASE}/api/masumi/start_job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier_from_purchaser: this.purchaserId,
        input_data: input,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start job');
    }

    return response.json();
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await fetch(`${API_BASE}/api/masumi/status?job_id=${jobId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get job status');
    }
    return response.json();
  }

  /**
   * Parse the result string from a completed job
   */
  parseResult(resultString: string): RiskResult {
    return JSON.parse(resultString);
  }

  /**
   * Wait for a job to complete and return the result
   */
  async waitForResult(jobId: string, maxWaitMs: number = 30000): Promise<RiskResult> {
    const startTime = Date.now();
    const pollInterval = 1000;

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getJobStatus(jobId);

      if (status.status === 'completed' && status.result) {
        return this.parseResult(status.result);
      }

      if (status.status === 'failed') {
        throw new Error(status.result || 'Job failed');
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Job timed out');
  }

  /**
   * Start a job and wait for the result
   */
  async analyzeAndWait(input: MasumiJobInput): Promise<RiskResult> {
    const job = await this.startRiskAnalysis(input);
    
    if (job.status !== 'success') {
      throw new Error(job.message || 'Failed to start job');
    }

    return this.waitForResult(job.job_id);
  }

  /**
   * Get all jobs
   */
  async getAllJobs(): Promise<{ success: boolean; count: number; jobs: JobSummary[] }> {
    const response = await fetch(`${API_BASE}/api/masumi/jobs`);
    if (!response.ok) {
      throw new Error('Failed to get jobs');
    }
    return response.json();
  }

  /**
   * Format action for display
   */
  formatAction(action: 'STAY' | 'EMERGENCY_EXIT'): { text: string; color: string; icon: string } {
    if (action === 'EMERGENCY_EXIT') {
      return {
        text: 'Emergency Exit',
        color: 'text-red-600',
        icon: '🚨',
      };
    }
    return {
      text: 'Safe to Farm',
      color: 'text-green-600',
      icon: '✅',
    };
  }

  /**
   * Format confidence level
   */
  formatConfidence(confidence: string | number): { text: string; color: string } {
    const conf = typeof confidence === 'string' ? parseFloat(confidence) : confidence;
    
    if (conf >= 80) {
      return { text: 'Very High', color: 'text-green-600' };
    } else if (conf >= 60) {
      return { text: 'High', color: 'text-green-500' };
    } else if (conf >= 40) {
      return { text: 'Moderate', color: 'text-yellow-600' };
    } else if (conf >= 20) {
      return { text: 'Low', color: 'text-orange-500' };
    }
    return { text: 'Very Low', color: 'text-red-500' };
  }
}

// Singleton instance
export const masumiService = new MasumiService();

export default MasumiService;
