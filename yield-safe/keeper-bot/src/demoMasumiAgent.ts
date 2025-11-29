/**
 * Masumi Agent Demo
 * 
 * Demonstrates the full MIP-003 compliant flow:
 * 1. Check availability
 * 2. Get input schema
 * 3. Start jobs
 * 4. Poll for results
 */

const API_BASE = 'http://localhost:3001';

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return response.json();
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runMasumiDemo() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║    🤖 Masumi MIP-003 Agentic Service Demo                     ║');
  console.log('║       YieldSafe IL Risk Analyzer                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  try {
    // Step 1: Check Availability
    console.log('📡 Step 1: Checking agent availability...');
    const availability = await fetchJson(`${API_BASE}/api/masumi/availability`);
    console.log('   Status:', availability.status);
    console.log('   Type:', availability.type);
    console.log('   Message:', availability.message);
    console.log();

    if (availability.status !== 'available') {
      throw new Error('Agent is not available');
    }

    // Step 2: Get Agent Metadata
    console.log('📋 Step 2: Fetching agent metadata...');
    const metadata = await fetchJson(`${API_BASE}/api/masumi/metadata`);
    console.log('   Agent ID:', metadata.identifier);
    console.log('   Name:', metadata.name);
    console.log('   Version:', metadata.version);
    console.log('   Capabilities:', metadata.capabilities.join(', '));
    console.log('   Pricing:', `${metadata.pricing.amount} ${metadata.pricing.currency} per ${metadata.pricing.model}`);
    console.log();

    // Step 3: Get Input Schema
    console.log('📝 Step 3: Fetching input schema...');
    const schema = await fetchJson(`${API_BASE}/api/masumi/input_schema`);
    console.log('   Required inputs:');
    schema.input_data.forEach((field: any) => {
      const required = field.validations?.some((v: any) => v.type === 'required') ? '(required)' : '(optional)';
      console.log(`     - ${field.name} [${field.type}] ${required}`);
      if (field.data?.description) {
        console.log(`       ${field.data.description}`);
      }
    });
    console.log();

    // Step 4: Run multiple analysis jobs
    const testCases = [
      { tokenA: 'ADA', tokenB: 'SNEK', ilThreshold: 5, description: 'Normal threshold (5%)' },
      { tokenA: 'ADA', tokenB: 'DJED', ilThreshold: 0.5, description: 'Low threshold (0.5%) - Should trigger exit' },
      { tokenA: 'ADA', tokenB: 'MIN', ilThreshold: 10, description: 'High threshold (10%)' },
    ];

    console.log('🔬 Step 4: Running risk analysis jobs...');
    console.log();

    for (const testCase of testCases) {
      console.log(`   📊 Test: ${testCase.description}`);
      console.log(`      Pair: ${testCase.tokenA}/${testCase.tokenB}, Threshold: ${testCase.ilThreshold}%`);

      // Start job
      const startResponse = await fetchJson(`${API_BASE}/api/masumi/start_job`, {
        method: 'POST',
        body: JSON.stringify({
          identifier_from_purchaser: 'demo-user-' + Date.now(),
          input_data: {
            tokenA: testCase.tokenA,
            tokenB: testCase.tokenB,
            ilThreshold: testCase.ilThreshold,
          },
        }),
      });

      console.log(`      Job ID: ${startResponse.job_id}`);
      console.log(`      Blockchain ID: ${startResponse.blockchainIdentifier}`);
      console.log(`      Input Hash: ${startResponse.input_hash.slice(0, 16)}...`);

      // Poll for result
      let attempts = 0;
      const maxAttempts = 10;
      let result = null;

      while (attempts < maxAttempts) {
        await sleep(500);
        const status = await fetchJson(`${API_BASE}/api/masumi/status?job_id=${startResponse.job_id}`);
        
        if (status.status === 'completed') {
          result = JSON.parse(status.result);
          break;
        } else if (status.status === 'failed') {
          throw new Error(`Job failed: ${status.result}`);
        }
        attempts++;
      }

      if (result) {
        const icon = result.action === 'EMERGENCY_EXIT' ? '🚨' : '✅';
        const actionText = result.action === 'EMERGENCY_EXIT' ? 'EMERGENCY EXIT' : 'STAY (Safe)';
        console.log(`      Result: ${icon} ${actionText}`);
        console.log(`      GARCH Volatility: ${result.garchVolatility}%`);
        console.log(`      LSTM Volatility: ${result.lstmVolatility}%`);
        console.log(`      Confidence: ${result.confidence}%`);
        console.log(`      Reason: ${result.reason}`);
      }
      console.log();
    }

    // Step 5: List all jobs
    console.log('📋 Step 5: Listing all completed jobs...');
    const jobs = await fetchJson(`${API_BASE}/api/masumi/jobs`);
    console.log(`   Total jobs: ${jobs.count}`);
    console.log();
    console.log('   ┌─────────────────┬──────────┬─────────────┬──────────┐');
    console.log('   │ Token Pair      │ Threshold│ Status      │ Action   │');
    console.log('   ├─────────────────┼──────────┼─────────────┼──────────┤');
    jobs.jobs.slice(-5).forEach((job: any) => {
      const pair = job.tokenPair.padEnd(15);
      const threshold = `${job.ilThreshold}%`.padEnd(8);
      const status = job.status.padEnd(11);
      const action = job.result || 'pending';
      const icon = job.result === 'EMERGENCY_EXIT' ? '🚨' : job.result === 'STAY' ? '✅' : '⏳';
      console.log(`   │ ${pair} │ ${threshold} │ ${status} │ ${icon}${action.slice(0,6).padEnd(6)}│`);
    });
    console.log('   └─────────────────┴──────────┴─────────────┴──────────┘');
    console.log();

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║    ✅ Masumi MIP-003 Demo Complete!                          ║');
    console.log('║                                                              ║');
    console.log('║    The YieldSafe Risk Analyzer is now a Masumi-compatible    ║');
    console.log('║    agentic service that can:                                 ║');
    console.log('║                                                              ║');
    console.log('║    • Be discovered by other AI agents on Masumi Network      ║');
    console.log('║    • Receive jobs with standardized input format             ║');
    console.log('║    • Return results with integrity verification (input_hash) ║');
    console.log('║    • Support blockchain-based payment verification           ║');
    console.log('║                                                              ║');
    console.log('║    Frontend: http://localhost:5173/ai-agent                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the demo
runMasumiDemo();
