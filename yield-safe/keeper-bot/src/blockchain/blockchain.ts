import { logger } from "../utils/logger.js";
import { Blockfrost, Lucid } from "lucid-cardano";

export interface BlockchainNetwork {
  name: string;
  url: string;
  apiKey: string;
}

export class BlockchainService {
  private lucid: Lucid | null = null;
  private network: BlockchainNetwork;

  constructor(network: BlockchainNetwork) {
    this.network = network;
  }

  async initialize() {
    logger.info(`🌐 Connecting to ${this.network.name} network...`);
    
    try {
      const provider = new Blockfrost(
        this.network.url,
        this.network.apiKey
      );
      
      this.lucid = await Lucid.new(provider, "Preview");
      
      logger.info(`✅ Connected to ${this.network.name} successfully`);
    } catch (error) {
      logger.error(`❌ Failed to connect to blockchain: ${error}`);
      throw error;
    }
  }

  async getUtxos(address: string) {
    if (!this.lucid) {
      throw new Error("Blockchain service not initialized");
    }

    try {
      logger.debug(`📖 Fetching UTXOs for address: ${address.substring(0, 20)}...`);
      const utxos = await this.lucid.utxosAt(address);
      logger.debug(`📦 Found ${utxos.length} UTXOs`);
      return utxos;
    } catch (error) {
      logger.error(`❌ Error fetching UTXOs: ${error}`);
      throw error;
    }
  }

  async getCurrentSlot(): Promise<number> {
    if (!this.lucid) {
      throw new Error("Blockchain service not initialized");
    }

    try {
      const slot = await this.lucid.currentSlot();
      return slot;
    } catch (error) {
      logger.error(`❌ Error fetching current slot: ${error}`);
      throw error;
    }
  }

  async submitTx(txHex: string): Promise<string> {
    if (!this.lucid) {
      throw new Error("Blockchain service not initialized");
    }

    logger.info(`📤 Submitting transaction...`);
    
    try {
      const txHash = await this.lucid.provider.submitTx(txHex);
      await this.lucid.awaitTx(txHash);
      logger.info(`✅ Transaction submitted: ${txHash}`);
      return txHash;
    } catch (error) {
      logger.error(`❌ Transaction failed: ${error}`);
      throw error;
    }
  }

  async buildTx(txBuilder: any) {
    if (!this.lucid) {
      throw new Error("Blockchain service not initialized");
    }

    logger.debug(`🔨 Building transaction...`);
    
    try {
      const tx = await txBuilder.complete();
      const signedTx = await tx.sign().complete();
      return signedTx.toString();
    } catch (error) {
      logger.error(`❌ Transaction building failed: ${error}`);
      throw error;
    }
  }

  getLucid(): Lucid {
    if (!this.lucid) {
      throw new Error("Blockchain service not initialized");
    }
    return this.lucid;
  }
}