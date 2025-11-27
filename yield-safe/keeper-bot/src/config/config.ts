export const CONFIG = {
  // Blockchain Network Configuration
  NETWORK: {
    name: "Preview Testnet",
    url: "https://cardano-preview.blockfrost.io/api/v0",
    apiKey: process.env.BLOCKFROST_API_KEY || "preview_test_api_key_here"
  },

  // Database Configuration
  DATABASE: {
    path: "./data/vaults.db",
    cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Monitoring Configuration
  MONITORING: {
    interval: 30000, // 30 seconds
    ilThreshold: 0.05, // 5% default threshold
    retryAttempts: 3,
    retryDelay: 5000 // 5 seconds
  },

  // Contract Configuration
  CONTRACTS: {
    vaultValidator: {
      address: "addr_test1wpm50as7ukmxnl2wpm50as7ukmxnl2wpm50as7ukmxnl2wpmhrjtgf09get6v03j88cxf5nauxrvq2clnt3",
      scriptHash: "your_script_hash_here"
    }
  },

  // Health Check Configuration
  HEALTH: {
    checkInterval: 60000, // 1 minute
    endpoints: [
      "blockchain",
      "database",
      "monitoring"
    ]
  },

  // Demo Configuration
  DEMO: {
    enabled: true,
    mockVaults: 3,
    simulateTraffic: true,
    logLevel: "debug"
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === "production") {
  CONFIG.MONITORING.interval = 10000; // 10 seconds in production
  CONFIG.HEALTH.checkInterval = 30000; // 30 seconds in production
  CONFIG.DEMO.enabled = false;
}

if (process.env.NODE_ENV === "development") {
  CONFIG.DEMO.enabled = true;
  CONFIG.MONITORING.interval = 60000; // 1 minute in development
}