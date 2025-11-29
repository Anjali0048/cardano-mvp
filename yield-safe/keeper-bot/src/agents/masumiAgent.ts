/**
 * Masumi AI Agent - MIP-003 Compliant Agentic Service
 * 
 * This wraps our YieldSafe Risk Engine as a Masumi-compatible agent
 * that can be discovered and used by other agents on the Masumi Network.
 * 
 * Implements MIP-003: Agentic Service API Standard
 * - /start_job - Initiate risk analysis job
 * - /status - Check job status
 * - /availability - Check service availability
 * - /input_schema - Return expected input format
 * 
 * AI Models: GARCH(1,1) + LSTM for volatility prediction
 * OpenAI is OPTIONAL - only for enhanced explanations
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import YieldSafeRiskEngine, { RiskAnalysis } from '../riskEngine';
import MasumiPaymentService from './masumiPayment';

// Optional OpenAI - only loaded if configured
let OpenAIService: any = null;
try {
  if (process.env.OPENAI_API_KEY) {
    OpenAIService = require('./openaiService').default;
  }
} catch (e) {
  // OpenAI not available, that's fine
}

// Job status types per MIP-003
export type JobStatus = 'awaiting_payment' | 'awaiting_input' | 'running' | 'completed' | 'failed';

export interface MasumiJob {
  id: string;
  job_id: string;
  status: JobStatus;
  input_data: any;
  input_hash: string;
  result?: RiskAnalysis;
  aiExplanation?: string;
  error?: string;
  created_at: number;
  updated_at: number;
  blockchainIdentifier: string;
  payByTime: number;
  submitResultTime: number;
  unlockTime: number;
  externalDisputeUnlockTime: number;
  agentIdentifier: string;
  sellerVKey: string;
  identifierFromPurchaser: string;
}

export interface StartJobRequest {
  identifier_from_purchaser: string;
  input_data: {
    tokenA: string;
    tokenB: string;
    ilThreshold: number;
    vaultId?: string;
  };
}

export interface StartJobResponse {
  id: string;
  status: 'success' | 'error';
  job_id: string;
  blockchainIdentifier: string;
  payByTime: number;
  submitResultTime: number;
  unlockTime: number;
  externalDisputeUnlockTime: number;
  agentIdentifier: string;
  sellerVKey: string;
  identifierFromPurchaser: string;
  input_hash: string;
}

export interface JobStatusResponse {
  id: string;
  job_id: string;
  status: JobStatus;
  result?: string;
  input_schema?: any;
}

export interface AvailabilityResponse {
  status: 'available' | 'unavailable';
  type: string;
  message: string;
}

export interface InputSchemaResponse {
  input_data: Array<{
    id: string;
    type: string;
    name: string;
    data?: any;
    validations?: any[];
  }>;
}

export class MasumiAgentService {
  private riskEngine: YieldSafeRiskEngine;
  private openaiService: any | null = null;
  private paymentService: MasumiPaymentService;
  private jobs: Map<string, MasumiJob> = new Map();
  private paymentCheckInterval: NodeJS.Timeout | null = null;
  
  // Agent metadata
  readonly agentIdentifier = 'yieldsafe-risk-analyzer-v1';
  readonly agentName = 'YieldSafe IL Risk Analyzer';
  readonly agentDescription = 'AI-powered IL risk analysis using GARCH(1,1) + LSTM volatility models';
  readonly agentVersion = '1.0.0';
  
  // Seller wallet (would be configured from env in production)
  readonly sellerVKey = process.env.MASUMI_SELLER_VKEY || 'addr_test1qz...placeholder';
  readonly sellerAddress = process.env.MASUMI_SELLER_ADDRESS || '';
  
  // Payment mode
  readonly requirePayment = process.env.MASUMI_REQUIRE_PAYMENT === 'true';
  
  // OpenAI is optional
  readonly useOpenAI = !!process.env.OPENAI_API_KEY;
  
  constructor() {
    this.riskEngine = new YieldSafeRiskEngine();
    this.paymentService = new MasumiPaymentService(this.sellerAddress);
    
    // Only load OpenAI if configured
    if (this.useOpenAI && OpenAIService) {
      this.openaiService = new OpenAIService();
      console.log(`   OpenAI: ✅ Enabled (enhanced explanations)`);
    } else {
      console.log(`   OpenAI: ⏭️ Disabled (using pure GARCH/LSTM)`);
    }
    
    console.log(`🤖 Masumi Agent initialized: ${this.agentIdentifier}`);
    console.log(`   AI Models: GARCH(1,1) + LSTM Neural Network`);
    console.log(`   Payments: ${this.requirePayment ? '💰 Required' : '🆓 Demo mode (free)'}`);
    
    // Start payment checking if payments are required
    if (this.requirePayment) {
      this.startPaymentChecker();
    }
  }

  /**
   * Start periodic payment checking
   */
  private startPaymentChecker() {
    this.paymentCheckInterval = setInterval(async () => {
      const updatedJobs = await this.paymentService.checkPendingPayments(this.jobs);
      for (const jobId of updatedJobs) {
        // Process jobs that just received payment
        this.processJob(jobId);
      }
    }, 10000); // Check every 10 seconds
    console.log(`💰 Payment checker started (10s interval)`);
  }

  /**
   * Stop payment checker
   */
  stopPaymentChecker() {
    if (this.paymentCheckInterval) {
      clearInterval(this.paymentCheckInterval);
      this.paymentCheckInterval = null;
    }
  }

  /**
   * Hash input data for integrity verification (MIP-004)
   */
  private hashInputData(data: any): string {
    const jsonStr = JSON.stringify(data);
    return crypto.createHash('sha256').update(jsonStr).digest('hex');
  }

  /**
   * Generate blockchain identifier for payment tracking
   */
  private generateBlockchainIdentifier(): string {
    return `masumi_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
  }

  /**
   * MIP-003: /start_job endpoint
   * Initiates a risk analysis job
   */
  async startJob(request: StartJobRequest): Promise<StartJobResponse & { paymentInstructions?: any }> {
    const jobId = uuidv4();
    const statusId = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    
    // Validate input
    if (!request.input_data?.tokenA || !request.input_data?.tokenB) {
      throw new Error('Missing required fields: tokenA and tokenB');
    }
    
    if (typeof request.input_data.ilThreshold !== 'number') {
      throw new Error('ilThreshold must be a number');
    }

    const inputHash = this.hashInputData(request.input_data);
    const blockchainIdentifier = this.generateBlockchainIdentifier();

    // Determine initial status based on payment mode
    const initialStatus: JobStatus = this.requirePayment ? 'awaiting_payment' : 'running';

    // Create job record
    const job: MasumiJob = {
      id: statusId,
      job_id: jobId,
      status: initialStatus,
      input_data: request.input_data,
      input_hash: inputHash,
      created_at: now,
      updated_at: now,
      blockchainIdentifier,
      payByTime: now + 3600, // 1 hour to pay
      submitResultTime: now + 7200, // 2 hours to complete
      unlockTime: now + 86400, // 24 hours to unlock
      externalDisputeUnlockTime: now + 172800, // 48 hours for disputes
      agentIdentifier: this.agentIdentifier,
      sellerVKey: this.sellerVKey,
      identifierFromPurchaser: request.identifier_from_purchaser
    };

    this.jobs.set(jobId, job);

    // If not requiring payment, start processing immediately
    if (!this.requirePayment) {
      this.processJob(jobId);
      console.log(`📋 Job started (FREE): ${jobId} for ${request.input_data.tokenA}/${request.input_data.tokenB}`);
    } else {
      console.log(`📋 Job created (AWAITING PAYMENT): ${jobId} for ${request.input_data.tokenA}/${request.input_data.tokenB}`);
    }

    const response: StartJobResponse & { paymentInstructions?: any } = {
      id: statusId,
      status: 'success',
      job_id: jobId,
      blockchainIdentifier,
      payByTime: job.payByTime,
      submitResultTime: job.submitResultTime,
      unlockTime: job.unlockTime,
      externalDisputeUnlockTime: job.externalDisputeUnlockTime,
      agentIdentifier: this.agentIdentifier,
      sellerVKey: this.sellerVKey,
      identifierFromPurchaser: request.identifier_from_purchaser,
      input_hash: inputHash
    };

    // Add payment instructions if payment is required
    if (this.requirePayment) {
      response.paymentInstructions = this.paymentService.generatePaymentInstructions(jobId, blockchainIdentifier);
    }

    return response;
  }

  /**
   * Process job asynchronously using GARCH + LSTM AI models
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Update status to running
      job.status = 'running';
      job.updated_at = Math.floor(Date.now() / 1000);
      this.jobs.set(jobId, job);

      // Run GARCH + LSTM risk analysis (THE REAL AI)
      const analysis = await this.riskEngine.analyzeRisk(
        job.input_data.tokenA,
        job.input_data.tokenB,
        job.input_data.ilThreshold
      );

      // Generate explanation (with or without OpenAI)
      let explanation = this.generateExplanation(analysis, job.input_data);

      // Optionally enhance with OpenAI if available
      if (this.openaiService && this.useOpenAI) {
        try {
          const aiResult = await this.openaiService.analyzePosition(
            {
              tokenA: job.input_data.tokenA,
              tokenB: job.input_data.tokenB,
              volatility: (analysis.garchVolatility + analysis.lstmVolatility) / 2,
              garchVolatility: analysis.garchVolatility,
              lstmVolatility: analysis.lstmVolatility
            },
            {
              ilThreshold: job.input_data.ilThreshold,
              currentIL: 0
            }
          );
          explanation = aiResult.reasoning || explanation;
          console.log(`🧠 OpenAI enhanced: ${aiResult.action}`);
        } catch (aiError) {
          // OpenAI failed, use basic explanation - that's fine!
        }
      }

      // Update job with result
      job.status = 'completed';
      job.result = analysis;
      job.aiExplanation = explanation;
      job.updated_at = Math.floor(Date.now() / 1000);
      this.jobs.set(jobId, job);

      console.log(`✅ Job completed: ${jobId} - ${analysis.action}`);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.updated_at = Math.floor(Date.now() / 1000);
      this.jobs.set(jobId, job);

      console.error(`❌ Job failed: ${jobId}`, error);
    }
  }

  /**
   * Generate human-readable explanation from GARCH/LSTM results
   */
  private generateExplanation(analysis: RiskAnalysis, inputData: any): string {
    const avgVol = ((analysis.garchVolatility + analysis.lstmVolatility) / 2).toFixed(2);
    const threshold = inputData.ilThreshold;
    
    if (analysis.action === 'EMERGENCY_EXIT') {
      return `⚠️ High volatility detected (${avgVol}%) exceeds safe threshold (${threshold/2}%). ` +
             `GARCH model predicts ${analysis.garchVolatility.toFixed(2)}% volatility, ` +
             `LSTM neural network predicts ${analysis.lstmVolatility.toFixed(2)}%. ` +
             `Recommend emergency exit to protect against impermanent loss.`;
    } else {
      return `✅ Market conditions stable. Volatility (${avgVol}%) is within safe range. ` +
             `GARCH: ${analysis.garchVolatility.toFixed(2)}%, LSTM: ${analysis.lstmVolatility.toFixed(2)}%. ` +
             `Safe to continue providing liquidity.`;
    }
  }

  /**
   * MIP-003: /status endpoint
   * Get the status of a job
   */
  getJobStatus(jobId: string): JobStatusResponse {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const response: JobStatusResponse = {
      id: job.id,
      job_id: job.job_id,
      status: job.status
    };

    if (job.status === 'completed' && job.result) {
      const resultObj: any = {
        action: job.result.action,
        garchVolatility: job.result.garchVolatility.toFixed(4),
        lstmVolatility: job.result.lstmVolatility.toFixed(4),
        confidence: job.result.confidence.toFixed(2),
        reason: job.result.reason,
        recommendation: job.result.action === 'EMERGENCY_EXIT' 
          ? '🚨 HIGH RISK - Consider emergency exit'
          : '✅ Market stable - Safe to farm',
        explanation: job.aiExplanation || job.result.reason
      };

      response.result = JSON.stringify(resultObj);
    }

    if (job.status === 'failed') {
      response.result = `Error: ${job.error}`;
    }

    return response;
  }

  /**
   * MIP-003: /availability endpoint
   * Check if the agent service is available
   */
  checkAvailability(): AvailabilityResponse {
    return {
      status: 'available',
      type: 'masumi-agent',
      message: `${this.agentName} is ready to analyze DeFi positions for IL risk`
    };
  }

  /**
   * MIP-003: /input_schema endpoint
   * Return the expected input format
   */
  getInputSchema(): InputSchemaResponse {
    return {
      input_data: [
        {
          id: 'tokenA',
          type: 'string',
          name: 'Token A Symbol',
          data: {
            description: 'The first token in the liquidity pair (e.g., ADA)',
            example: 'ADA',
            default: 'ADA'
          },
          validations: [
            { type: 'required', message: 'Token A is required' }
          ]
        },
        {
          id: 'tokenB',
          type: 'string',
          name: 'Token B Symbol',
          data: {
            description: 'The second token in the liquidity pair (e.g., SNEK, DJED, MIN)',
            example: 'SNEK',
            options: ['SNEK', 'DJED', 'MIN', 'USDC', 'AGIX', 'HOSKY']
          },
          validations: [
            { type: 'required', message: 'Token B is required' }
          ]
        },
        {
          id: 'ilThreshold',
          type: 'number',
          name: 'IL Threshold (%)',
          data: {
            description: 'Maximum impermanent loss percentage before triggering protection',
            example: 5,
            min: 0.1,
            max: 50,
            default: 5
          },
          validations: [
            { type: 'required', message: 'IL threshold is required' },
            { type: 'min', value: 0.1, message: 'Minimum threshold is 0.1%' },
            { type: 'max', value: 50, message: 'Maximum threshold is 50%' }
          ]
        },
        {
          id: 'vaultId',
          type: 'string',
          name: 'Vault ID (Optional)',
          data: {
            description: 'Optional vault UTxO identifier for tracking',
            example: 'txhash#0'
          }
        }
      ]
    };
  }

  /**
   * Get agent metadata for Masumi registry
   */
  getAgentMetadata() {
    const paymentStats = this.paymentService.getPaymentStats();
    
    return {
      identifier: this.agentIdentifier,
      name: this.agentName,
      description: this.agentDescription,
      version: this.agentVersion,
      capabilities: [
        'il_risk_analysis',
        'volatility_prediction',
        'garch_analysis',
        'lstm_prediction',
        'emergency_exit_recommendation'
      ],
      ai_models: {
        primary: ['GARCH(1,1)', 'LSTM Neural Network'],
        optional: this.useOpenAI ? 'GPT-4 (enhanced explanations)' : 'None'
      },
      pricing: {
        currency: 'ADA',
        amount: 1, // 1 ADA per analysis
        model: 'per_job',
        paymentRequired: this.requirePayment
      },
      payment: {
        enabled: this.requirePayment,
        sellerAddress: this.sellerAddress || 'Not configured',
        totalJobsCompleted: paymentStats.totalVerified,
        totalEarnings: `${Number(paymentStats.totalAmount) / 1_000_000} ADA`
      },
      endpoints: {
        start_job: '/api/masumi/start_job',
        status: '/api/masumi/status',
        availability: '/api/masumi/availability',
        input_schema: '/api/masumi/input_schema'
      }
    };
  }

  /**
   * List all jobs (for debugging)
   */
  listJobs(): MasumiJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get payment statistics
   */
  getPaymentStats() {
    return this.paymentService.getPaymentStats();
  }
}

export default MasumiAgentService;
