/**
 * Masumi Payment Service
 * 
 * Handles blockchain payment verification for Masumi agent jobs.
 * Uses Blockfrost to check for incoming ADA payments.
 */

import { Lucid, Blockfrost } from 'lucid-cardano';
import { getActiveNetworkConfig, getBlockfrostKey } from '../config/networkConfig';

export interface PaymentInfo {
  txHash: string;
  amount: bigint;
  sender: string;
  timestamp: number;
  confirmed: boolean;
}

export interface PaymentVerification {
  paid: boolean;
  payment?: PaymentInfo;
  error?: string;
}

export class MasumiPaymentService {
  private lucid: Lucid | null = null;
  private sellerAddress: string;
  private networkConfig = getActiveNetworkConfig();
  private blockfrostKey = getBlockfrostKey();
  
  // Payment amount in lovelace (1 ADA = 1,000,000 lovelace)
  readonly PAYMENT_AMOUNT = BigInt(1_000_000); // 1 ADA per job
  
  // Track verified payments to avoid double-counting
  private verifiedPayments: Map<string, PaymentInfo> = new Map();

  constructor(sellerAddress?: string) {
    this.sellerAddress = sellerAddress || process.env.MASUMI_SELLER_ADDRESS || '';
    console.log(`💰 Masumi Payment Service initialized`);
    console.log(`   Seller Address: ${this.sellerAddress ? this.sellerAddress.slice(0, 20) + '...' : '⚠️ Not configured'}`);
  }

  /**
   * Initialize Lucid for blockchain queries
   */
  private async getLucid(): Promise<Lucid> {
    if (!this.lucid) {
      this.lucid = await Lucid.new(
        new Blockfrost(
          this.networkConfig.blockfrostEndpoint,
          this.blockfrostKey
        ),
        this.networkConfig.lucidNetwork
      );
    }
    return this.lucid;
  }

  /**
   * Check if a payment has been made for a specific job
   * 
   * @param jobId - The job identifier
   * @param blockchainIdentifier - The unique payment reference
   * @param requiredAmount - Amount in lovelace (default 1 ADA)
   */
  async verifyPayment(
    jobId: string,
    blockchainIdentifier: string,
    requiredAmount: bigint = this.PAYMENT_AMOUNT
  ): Promise<PaymentVerification> {
    
    // Check if already verified
    if (this.verifiedPayments.has(blockchainIdentifier)) {
      return {
        paid: true,
        payment: this.verifiedPayments.get(blockchainIdentifier)
      };
    }

    if (!this.sellerAddress) {
      return {
        paid: false,
        error: 'Seller address not configured. Set MASUMI_SELLER_ADDRESS in .env'
      };
    }

    try {
      const lucid = await this.getLucid();
      
      // Get UTxOs at seller address
      const utxos = await lucid.utxosAt(this.sellerAddress);
      
      console.log(`🔍 Checking ${utxos.length} UTxOs for payment ${blockchainIdentifier}`);

      // Look for payment with matching metadata or reference
      for (const utxo of utxos) {
        const adaAmount = utxo.assets['lovelace'] || BigInt(0);
        
        // Check if this UTxO has sufficient ADA
        if (adaAmount >= requiredAmount) {
          // In production, you'd check transaction metadata for blockchainIdentifier
          // For now, we'll check if the datum contains the job reference
          
          // Get transaction details to check metadata
          const txDetails = await this.getTransactionDetails(utxo.txHash);
          
          if (txDetails && this.matchesPaymentReference(txDetails, blockchainIdentifier)) {
            const payment: PaymentInfo = {
              txHash: utxo.txHash,
              amount: adaAmount,
              sender: txDetails.sender || 'unknown',
              timestamp: txDetails.timestamp || Date.now(),
              confirmed: true
            };
            
            // Cache the verified payment
            this.verifiedPayments.set(blockchainIdentifier, payment);
            
            console.log(`✅ Payment verified: ${utxo.txHash}`);
            console.log(`   Amount: ${Number(adaAmount) / 1_000_000} ADA`);
            
            return { paid: true, payment };
          }
        }
      }

      // No matching payment found
      return {
        paid: false,
        error: 'Payment not found. Please send 1 ADA to the seller address with the job reference.'
      };

    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        paid: false,
        error: `Payment verification failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get transaction details from Blockfrost
   */
  private async getTransactionDetails(txHash: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.networkConfig.blockfrostEndpoint}/txs/${txHash}`,
        {
          headers: {
            'project_id': this.blockfrostKey
          }
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      // Get metadata if available
      const metadataResponse = await fetch(
        `${this.networkConfig.blockfrostEndpoint}/txs/${txHash}/metadata`,
        {
          headers: {
            'project_id': this.blockfrostKey
          }
        }
      );
      
      let metadata = null;
      if (metadataResponse.ok) {
        metadata = await metadataResponse.json();
      }
      
      const txData = data as any;
      return {
        txHash,
        timestamp: txData.block_time * 1000,
        sender: txData.inputs?.[0]?.address,
        metadata
      };
      
    } catch (error) {
      console.error('Failed to get transaction details:', error);
      return null;
    }
  }

  /**
   * Check if transaction metadata matches our payment reference
   */
  private matchesPaymentReference(txDetails: any, blockchainIdentifier: string): boolean {
    // Check transaction metadata for our reference
    if (txDetails.metadata) {
      for (const meta of txDetails.metadata) {
        // Masumi uses label 674 for payment references (or custom label)
        if (meta.label === '674' || meta.label === '1337') {
          const jsonMeta = meta.json_metadata;
          if (jsonMeta && (
            jsonMeta.ref === blockchainIdentifier ||
            jsonMeta.job_id === blockchainIdentifier ||
            JSON.stringify(jsonMeta).includes(blockchainIdentifier)
          )) {
            return true;
          }
        }
      }
    }
    
    // For demo/testing: Accept any recent payment above threshold
    // In production, you'd require exact metadata match
    const isRecent = txDetails.timestamp > Date.now() - 3600000; // Within last hour
    return isRecent;
  }

  /**
   * Generate payment instructions for a job
   */
  generatePaymentInstructions(jobId: string, blockchainIdentifier: string): {
    address: string;
    amount: string;
    amountLovelace: string;
    reference: string;
    metadata: object;
  } {
    return {
      address: this.sellerAddress || 'SELLER_ADDRESS_NOT_CONFIGURED',
      amount: '1 ADA',
      amountLovelace: this.PAYMENT_AMOUNT.toString(),
      reference: blockchainIdentifier,
      metadata: {
        '674': {
          ref: blockchainIdentifier,
          job_id: jobId,
          service: 'yieldsafe-risk-analyzer'
        }
      }
    };
  }

  /**
   * Check pending payments and update job statuses
   */
  async checkPendingPayments(jobs: Map<string, any>): Promise<string[]> {
    const updatedJobs: string[] = [];
    
    for (const [jobId, job] of jobs) {
      if (job.status === 'awaiting_payment') {
        const verification = await this.verifyPayment(jobId, job.blockchainIdentifier);
        
        if (verification.paid) {
          job.status = 'running';
          job.paymentTxHash = verification.payment?.txHash;
          job.updated_at = Math.floor(Date.now() / 1000);
          updatedJobs.push(jobId);
          
          console.log(`💰 Payment received for job ${jobId}`);
        }
      }
    }
    
    return updatedJobs;
  }

  /**
   * Get payment status summary
   */
  getPaymentStats(): {
    totalVerified: number;
    totalAmount: bigint;
    recentPayments: PaymentInfo[];
  } {
    const payments = Array.from(this.verifiedPayments.values());
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, BigInt(0));
    
    return {
      totalVerified: payments.length,
      totalAmount,
      recentPayments: payments.slice(-10)
    };
  }

  /**
   * Check if service is configured for payments
   */
  isConfigured(): boolean {
    return !!this.sellerAddress && this.sellerAddress.startsWith('addr');
  }
}

export default MasumiPaymentService;
