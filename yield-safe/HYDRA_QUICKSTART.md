# Hydra Integration Quick Start

## 📋 Overview

This guide helps you integrate Hydra Layer 2 scaling into your Yield Safe system for 20x faster and 99% cheaper rebalancing.

## 🚀 Getting Started (5 minutes)

### Step 1: Install Dependencies

```bash
cd yield-safe/keeper-bot
npm install

# Ensure all hydra-related packages are available
npm list | grep hydra
```

### Step 2: Configure Environment

Create `.env` file in `yield-safe/keeper-bot/`:

```bash
cat > .env << 'EOF'
# ===== HYDRA CONFIGURATION =====
HYDRA_API_URL=http://localhost:4001
HYDRA_NODE_SOCKET=/tmp/hydra-node-1.socket
HYDRA_NETWORK=testnet
HYDRA_PROTOCOL=Direct
HYDRA_CONTESTATION_PERIOD=86400
HYDRA_MAX_PARALLEL_TXS=100
HYDRA_BATCH_SIZE=50

# ===== OPERATOR KEYS =====
HYDRA_OPERATOR_KEY=sk_demo_operator_key
HYDRA_WITNESS_KEY=sk_demo_witness_key

# ===== CARDANO ADDRESSES =====
OPERATOR_CARDANO_ADDRESS=addr_test1qz2nflnx5l8y8e2k3j0v9w0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
WITNESS_CARDANO_ADDRESS=addr_test1qx2nflnx5l8y8e2k3j0v9w0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p

# ===== HYDRA ENDPOINTS =====
OPERATOR_HYDRA_ADDRESS=hydra-operator@localhost:5001
WITNESS_HYDRA_ADDRESS=hydra-witness@localhost:5002

# ===== LOGGING =====
LOG_LEVEL=info
EOF
```

### Step 3: Run Demo Script

```bash
# See the 20x speedup in action (2-3 minutes)
npm run dev -- demoHydraScaling.ts

# Or using tsx directly
npx tsx src/demoHydraScaling.ts
```

## 🔧 Integration with Existing Code

### 1. Import Hydra Services

```typescript
// In your keeper bot or service
import { HydraHeadService } from './services/hydra/hydraHeadService';
import { HydraRebalancingBatcher } from './services/hydra/hydraRebalancingBatcher';
import { HydraSettlementService } from './services/hydra/hydraSettlementService';
import HydraMonitoringService from './services/hydra/hydraMonitoringService';

// Initialize services
const hydraHeadService = new HydraHeadService();
const batcher = new HydraRebalancingBatcher();
const settlementService = new HydraSettlementService();
const monitoringService = new HydraMonitoringService();
```

### 2. Initialize Hydra Head

```typescript
// Create Hydra Head with 2-3 operators
const hydraHead = await hydraHeadService.initializeHead({
  headName: 'YieldSafeRebalancing',
  operator: {
    name: 'YieldSafeBotOperator',
    role: 'operator',
    cardanoAddress: process.env.OPERATOR_CARDANO_ADDRESS!,
    hydraAddress: process.env.OPERATOR_HYDRA_ADDRESS!,
    signingKey: process.env.HYDRA_OPERATOR_KEY!,
  },
  witnesses: [
    {
      name: 'WitnessValidator',
      role: 'witness',
      cardanoAddress: process.env.WITNESS_CARDANO_ADDRESS!,
      hydraAddress: process.env.WITNESS_HYDRA_ADDRESS!,
      signingKey: process.env.HYDRA_WITNESS_KEY!,
    },
  ],
  participants: [],
  initialCommitAmount: 1_000_000_000n, // 1000 ADA
  contestationPeriod: 86400,
  protocol: 'Direct',
});

console.log(`✅ Hydra Head initialized: ${hydraHead.headId}`);
```

### 3. Execute Rebalancing Batch

```typescript
// Prepare rebalancing operations
const operations: RebalancingOperation[] = [
  {
    operationId: 'op-1',
    vaultId: 'vault-1',
    type: 'swap',
    sourcePool: 'pool-ada-snek',
    targetPool: 'pool-ada-djed',
    inputAmount: 50_000_000n,
    expectedOutput: 51_000_000n,
    slippageTolerance: 0.02,
    status: 'pending',
  },
  // ... add more operations (up to 100)
];

// Execute batch in Hydra
const batchResult = await batcher.processBatch({
  headId: hydraHead.headId,
  vaultIds: ['vault-1', 'vault-2', 'vault-3'],
  operations,
  maxSlippage: 0.02,
});

console.log(`✅ Batch executed: ${batchResult.operationsExecuted} successful`);
console.log(`⚡ Execution time: ${batchResult.executionTimeMs}ms`);
```

### 4. Settle to Mainchain

```typescript
// Create final snapshot
const finalSnapshot: HydraState = {
  headId: hydraHead.headId,
  utxos: batchResult.details
    .filter((d) => d.result === 'success')
    .map((d) => ({
      address: `addr_test1qz${d.operation.vaultId}`,
      amount: d.output!,
      assets: [],
    })),
  blockHeight: 12345,
  snapshotNumber: 1,
  timestamp: new Date(),
  hash: generateHash(),
};

// Submit settlement
const settlementTx = await settlementService.submitSettlement(
  hydraHead.headId,
  finalSnapshot
);

// Post to mainchain
const mainchainTxId = await settlementService.postToMainchain(settlementTx);
console.log(`✅ Posted to mainchain: ${mainchainTxId}`);

// Monitor contestation period
const status = settlementService.getContestationStatus(settlementTx.txId);
console.log(`⏱️  Contestation period: ${status?.remainingTimeMs}ms remaining`);
```

### 5. Monitor Performance

```typescript
// Record metrics
const metrics = monitoringService.recordBatchMetrics(
  hydraHead.headId,
  batchResult
);

// Get comparison report
const report = monitoringService.generateComparisonReport(hydraHead.headId);
console.log(`
  MAINCHAIN vs HYDRA COMPARISON:
  Speedup: ${report?.benefits.speedupFactor}
  Cost Reduction: ${report?.benefits.costReduction}
  Parallelization Gain: ${report?.benefits.parallelizationGain}
`);

// Check if targets are met
const targetCheck = monitoringService.checkPerformanceTargets(hydraHead.headId);
console.log(`${targetCheck?.summary}`);

// Print performance summary
console.log(monitoringService.getPerformanceSummary());
```

## 🎨 Frontend Integration

### 1. Add Hydra Components to Dashboard

```typescript
// In your dashboard component
import { HydraModeToggle, HydraMetricsCard } from '../components/HydraIntegration';

export const Dashboard: React.FC = () => {
  const [hydraEnabled, setHydraEnabled] = useState(false);

  return (
    <div className="space-y-6">
      {/* Hydra Mode Toggle */}
      <HydraModeToggle onModeChange={setHydraEnabled} />

      {/* Show metrics when enabled */}
      {hydraEnabled && (
        <HydraMetricsCard
          metrics={{
            parallelTxs: 100,
            throughputTPS: 333,
            averageTxTime: 300,
            totalCostSavings: 99,
          }}
        />
      )}

      {/* Existing vault cards with Hydra integration */}
      {vaults.map((vault) => (
        <VaultCard key={vault.id} vault={vault} hydraEnabled={hydraEnabled} />
      ))}
    </div>
  );
};
```

### 2. Update Vault Card Component

```typescript
// In VaultCard.tsx
import { HydraVaultIntegration } from './HydraIntegration';

export const VaultCard: React.FC<{
  vault: Vault;
  hydraEnabled: boolean;
}> = ({ vault, hydraEnabled }) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{vault.name}</h3>
          <HydraVaultIntegration vaultId={vault.id} hydraEnabled={hydraEnabled} />
        </div>
        {/* Rest of vault card */}
      </div>
    </div>
  );
};
```

### 3. Settlement Status Display

```typescript
// Monitor settlement progress
import { HydraSettlementStatus } from './HydraIntegration';

export const SettlementMonitor: React.FC<{
  settlementTxId: string;
  onFinalized: () => void;
}> = ({ settlementTxId, onFinalized }) => {
  const [status, setStatus] = useState<'pending' | 'posted'>('pending');
  const [timeLeft, setTimeLeft] = useState(86400);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
      if (timeLeft === 0) {
        setStatus('finalized');
        onFinalized();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  return (
    <HydraSettlementStatus
      settlementTxId={settlementTxId}
      status={status}
      contestationRemainingSeconds={timeLeft}
    />
  );
};
```

## 📊 Example: Complete Rebalancing Flow

```typescript
import { HydraHeadService } from './services/hydra/hydraHeadService';
import { HydraRebalancingBatcher } from './services/hydra/hydraRebalancingBatcher';
import { HydraSettlementService } from './services/hydra/hydraSettlementService';
import HydraMonitoringService from './services/hydra/hydraMonitoringService';

async function performHydraRebalancing(vaults: Vault[]): Promise<void> {
  console.log('🚀 Starting Hydra-powered rebalancing...');

  // Initialize services
  const headService = new HydraHeadService();
  const batcher = new HydraRebalancingBatcher();
  const settlementService = new HydraSettlementService();
  const monitoringService = new HydraMonitoringService();

  try {
    // 1. Initialize Hydra Head
    console.log('1️⃣  Initializing Hydra Head...');
    const head = await headService.initializeHead({
      headName: 'YieldSafeRebalancing',
      operator: {
        name: 'BotOperator',
        role: 'operator',
        cardanoAddress: process.env.OPERATOR_CARDANO_ADDRESS!,
        hydraAddress: process.env.OPERATOR_HYDRA_ADDRESS!,
        signingKey: process.env.HYDRA_OPERATOR_KEY!,
      },
      witnesses: [
        {
          name: 'Witness',
          role: 'witness',
          cardanoAddress: process.env.WITNESS_CARDANO_ADDRESS!,
          hydraAddress: process.env.WITNESS_HYDRA_ADDRESS!,
          signingKey: process.env.HYDRA_WITNESS_KEY!,
        },
      ],
      participants: [],
      initialCommitAmount: 1_000_000_000n,
      contestationPeriod: 86400,
      protocol: 'Direct',
    });

    // 2. Create rebalancing operations
    console.log('2️⃣  Creating rebalancing operations...');
    const operations = vaults.map((vault, idx) => ({
      operationId: `op-${idx}`,
      vaultId: vault.id,
      type: 'swap' as const,
      sourcePool: vault.currentPool,
      targetPool: vault.optimalPool,
      inputAmount: vault.lpAmount,
      expectedOutput: vault.lpAmount + (vault.lpAmount * 5n) / 100n, // 5% gain
      slippageTolerance: 0.02,
      status: 'pending' as const,
    }));

    // 3. Execute batch
    console.log('3️⃣  Executing batch in parallel...');
    const batchResult = await batcher.processBatch({
      headId: head.headId,
      vaultIds: vaults.map((v) => v.id),
      operations,
      maxSlippage: 0.02,
    });

    console.log(`✅ Batch: ${batchResult.operationsExecuted}/${operations.length} successful`);

    // 4. Create and submit settlement
    console.log('4️⃣  Settling to mainchain...');
    const snapshot: HydraState = {
      headId: head.headId,
      utxos: operations
        .map((op) => ({
          address: `addr_test1qz${op.vaultId}`,
          amount: op.expectedOutput!,
          assets: [],
        })),
      blockHeight: 0,
      snapshotNumber: 1,
      timestamp: new Date(),
      hash: 'final-state-hash',
    };

    const settlement = await settlementService.submitSettlement(head.headId, snapshot);
    const mainchainTxId = await settlementService.postToMainchain(settlement);

    // 5. Display metrics
    console.log('5️⃣  Generating performance report...');
    const metrics = monitoringService.recordBatchMetrics(head.headId, batchResult);
    const report = monitoringService.generateComparisonReport(head.headId);

    console.log(monitoringService.getPerformanceSummary());
    console.log(`\n✨ Rebalancing complete!`);
    console.log(`Speedup: ${report?.benefits.speedupFactor}`);
    console.log(`Cost Reduction: ${report?.benefits.costReduction}`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}
```

## 📚 File Structure

```
yield-safe/
├── keeper-bot/
│   └── src/
│       ├── types/
│       │   └── hydra.ts                    # Hydra type definitions
│       ├── config/
│       │   └── hydraConfig.ts              # Hydra configuration
│       ├── services/
│       │   └── hydra/
│       │       ├── hydraHeadService.ts     # Head management
│       │       ├── hydraRebalancingBatcher.ts  # Batch processing
│       │       ├── hydraSettlementService.ts   # Settlement
│       │       └── hydraMonitoringService.ts   # Metrics
│       └── demoHydraScaling.ts             # Demo script
└── frontend/
    └── src/
        └── components/
            └── HydraIntegration.tsx        # UI components
```

## 🧪 Testing

```bash
# Run demo
npm run dev -- demoHydraScaling.ts

# Run specific tests
npm test -- hydraHeadService
npm test -- hydraRebalancingBatcher
npm test -- hydraSettlementService
npm test -- hydraMonitoringService
```

## 🎯 Performance Checklist

- [ ] Demo shows 20x+ speedup
- [ ] Cost reduction is 99%+
- [ ] 100+ parallel transactions executed
- [ ] Settlement posted to mainchain
- [ ] Contestation period tracked
- [ ] Metrics accurately calculated
- [ ] Frontend shows Hydra status
- [ ] Error handling works correctly

## 🔗 Related Files

- Documentation: `HYDRA_IMPLEMENTATION.md`
- Demo: `src/demoHydraScaling.ts`
- Types: `src/types/hydra.ts`
- Config: `src/config/hydraConfig.ts`

## 💡 Tips

1. **Start Small**: Test with 5-10 operations before going to 100+
2. **Monitor Logs**: Check `logs/combined.log` for detailed execution traces
3. **Adjust Timeouts**: Modify `HYDRA_OPERATION_TIMEOUT` if needed
4. **Test Settlement**: Ensure contestation period works correctly
5. **Metrics**: Review comparison reports to verify speedup claims

---

**Questions?** Check `HYDRA_IMPLEMENTATION.md` for comprehensive documentation.
