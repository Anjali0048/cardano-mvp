/**
 * Minswap DEX Withdrawal Integration
 * 
 * This module handles creating Minswap withdraw orders to convert LP tokens
 * back to underlying assets after emergency vault exit.
 */

import { Lucid, Data, Constr, Assets, UTxO } from "lucid-cardano";
import { logger } from "../utils/logger.js";

// Minswap Preprod Contract Addresses (from deployed/preprod/script.json)
export const MINSWAP_PREPROD = {
  orderAddress: "addr_test1wqag3rt979nep9kn2rvq9hr2kvxtnjj5xc47x9pyz6rz6wge5rrhq",
  poolAddress: "addr_test1wrtt4xm4p84vse3g3l6swtf2rqs943t0w39ustwdszxt3lsyrt40u",
  lpPolicyId: "d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b",
  orderScript: {
    type: "PlutusV2" as const,
    script: "590a63590a600100003332323232323232323222222533300832323232533300c3370e900118058008991919299980799b87480000084cc004dd5980a180a980a980a980a980a980a98068030060a99980799b87480080084c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc080cdc3a4000002264646600200200e44a66604c00229404c8c94ccc094cdc78010028a51133004004001302a002375c60500026eb8c094c07800854ccc080cdc3a40040022646464646600200202844a66605000229404c8c94ccc09ccdd798161812981618129816181698128010028a51133004004001302c002302a0013374a9001198131ba90014bd701bae3026001301e002153330203370e900200089980900419ba548000cc090cdd2a400466048604a603c00497ae04bd70099981019b87375a6044604a66446464a66604866e1d200200114bd6f7b63009bab302930220023022001323300100100322533302700114c103d87a800013232323253330283371e00e004266e9520003302c374c00297ae0133006006003375660520066eb8c09c008c0ac008c0a4004c8cc004004030894ccc09400452f5bded8c0264646464a66604c66e3d22100002100313302a337606ea4008dd3000998030030019bab3027003375c604a0046052004604e0026eb8c094c07800920004a0944c078004c08c004c06c060c8c8c8c8c8c8c94ccc08ccdc3a40000022646464646464646464646464646464646464a6660706076004264646464646464649319299981e99b87480000044c8c94ccc108c1140084c92632375a60840046eb4c10000458c8cdd81822000982218228009bac3043001303b0091533303d3370e90010008a999820181d8048a4c2c2c607601064a66607866e1d2000001132323232323232325333047304a002132498c09401458cdc3a400460886ea8c120004c120008dd6982300098230011822000982200119b8748008c0f8dd51821000981d0060a99981e19b87480080044c8c8c8c8c8c94ccc114c1200084c926302300316375a608c002608c0046088002608800466e1d2002303e3754608400260740182a66607866e1d2004001132323232323232325333047304a002132498c09401458dd6982400098240011bad30460013046002304400130440023370e9001181f1baa3042001303a00c1533303c3370e9003000899191919191919192999823982500109924c604a00a2c66e1d200230443754609000260900046eb4c118004c118008c110004c110008cdc3a4004607c6ea8c108004c0e803054ccc0f0cdc3a40100022646464646464a66608a60900042649319299982199b87480000044c8c8c8c94ccc128c13400852616375a609600260960046eb4c124004c10401854ccc10ccdc3a4004002264646464a666094609a0042930b1bad304b001304b002375a6092002608200c2c608200a2c66e1d200230423754608c002608c0046eb4c110004c110008c108004c0e803054ccc0f0cdc3a401400226464646464646464a66608e60940042649318130038b19b8748008c110dd5182400098240011bad30460013046002375a60880026088004608400260740182a66607866e1d200c001132323232323232325333047304a002132498c09801458cdc3a400460886ea8c120004c120008dd6982300098230011822000982200119b8748008c0f8dd51821000981d0060a99981e19b87480380044c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc134c14000852616375a609c002609c0046eb4c130004c130008dd6982500098250011bad30480013048002375a608c002608c0046eb4c110004c110008cdc3a4004607c6ea8c108004c0e803054ccc0f0cdc3a4020002264646464646464646464a66609260980042649318140048b19b8748008c118dd5182500098250011bad30480013048002375a608c002608c0046eb4c110004c110008c108004c0e803054ccc0f0cdc3a40240022646464646464a66608a60900042646493181200219198008008031129998238008a4c2646600600660960046464a66608c66e1d2000001132323232533304d3050002132498c0b400c58cdc3a400460946ea8c138004c138008c130004c11000858c110004c12400458dd698230009823001182200098220011bac3042001303a00c1533303c3370e900a0008a99981f981d0060a4c2c2c6074016603a018603001a603001c602c01e602c02064a66606c66e1d200000113232533303b303e002149858dd7181e000981a0090a99981b19b87480080044c8c94ccc0ecc0f800852616375c607800260680242a66606c66e1d200400113232533303b303e002149858dd7181e000981a0090a99981b19b87480180044c8c94ccc0ecc0f800852616375c607800260680242c60680222c607200260720046eb4c0dc004c0dc008c0d4004c0d4008c0cc004c0cc008c0c4004c0c4008c0bc004c0bc008c0b4004c0b4008c0ac004c0ac008c0a4004c08407858c0840748c94ccc08ccdc3a40000022a66604c60420042930b0a99981199b87480080044c8c94ccc0a0c0ac00852616375c605200260420042a66604666e1d2004001132325333028302b002149858dd7181480098108010b1810800919299981119b87480000044c8c8c8c94ccc0a4c0b00084c8c9263253330283370e9000000899192999816981800109924c64a66605666e1d20000011323253330303033002132498c04400458c0c4004c0a400854ccc0accdc3a40040022646464646464a666068606e0042930b1bad30350013035002375a606600260660046eb4c0c4004c0a400858c0a400458c0b8004c09800c54ccc0a0cdc3a40040022a666056604c0062930b0b181300118050018b18150009815001181400098100010b1810000919299981099b87480000044c8c94ccc098c0a400852616375a604e002603e0042a66604266e1d20020011323253330263029002149858dd69813800980f8010b180f800919299981019b87480000044c8c94ccc094c0a000852616375a604c002603c0042a66604066e1d20020011323253330253028002149858dd69813000980f0010b180f000919299980f99b87480000044c8c8c8c94ccc098c0a400852616375c604e002604e0046eb8c094004c07400858c0740048c94ccc078cdc3a400000226464a666046604c0042930b1bae3024001301c0021533301e3370e900100089919299981198130010a4c2c6eb8c090004c07000858c070004dd618100009810000980f8011bab301d001301d001301c00237566034002603400260320026030002602e0046eb0c054004c0340184cc004dd5980a180a980a980a980a980a980a980680300591191980080080191299980a8008a50132323253330153375e00c00229444cc014014008c054008c064008c05c004c03001cc94ccc034cdc3a40000022a666020601600e2930b0a99980699b874800800454ccc040c02c01c526161533300d3370e90020008a99980818058038a4c2c2c601600c2c60200026020004601c002600c00229309b2b118029baa001230033754002ae6955ceaab9e5573eae815d0aba24c126d8799fd87a9f581cfb39ea6bb975ea6de4a2c51572234dc584c89beccc09a49934389e51ffff004c0126d8799fd87a9f581cc8b0cc61374d409ff9c8512317003e7196a3e4d48553398c656cc124ffff0001"
  }
};

export interface Asset {
  policyId: string;
  tokenName: string;
}

export interface WithdrawOrderParams {
  lpAsset: Asset;
  lpAmount: bigint;
  minTokenA: bigint;
  minTokenB: bigint;
  userAddress: string;
  userPubKeyHash: string;
}

/**
 * Calculate minimum amounts for withdrawal with slippage protection
 */
export function calculateMinWithdrawAmounts(
  lpAmount: bigint,
  reserveA: bigint,
  reserveB: bigint,
  totalLiquidity: bigint,
  slippageTolerance: number = 0.01 // 1% default
): { minA: bigint; minB: bigint } {
  // Calculate expected amounts
  const amountA = (reserveA * lpAmount) / totalLiquidity;
  const amountB = (reserveB * lpAmount) / totalLiquidity;
  
  // Apply slippage tolerance
  const slippageFactor = BigInt(Math.floor((1 - slippageTolerance) * 10000));
  const minA = (amountA * slippageFactor) / 10000n;
  const minB = (amountB * slippageFactor) / 10000n;
  
  return { minA, minB };
}

/**
 * Create Minswap withdraw order datum
 */
export function createWithdrawOrderDatum(params: WithdrawOrderParams): string {
  const {
    lpAsset,
    lpAmount,
    minTokenA,
    minTokenB,
    userPubKeyHash
  } = params;

  // OrderExtraDatum: NO_DATUM variant (0)
  const noDatum = new Constr(0, []);

  // OrderStep: Withdraw variant (index 4 in Minswap V2)
  const withdrawStep = new Constr(4, [
    // withdrawal_amount_option: WAOSpecificAmount { amount }
    new Constr(0, [lpAmount]),
    // minimum_asset_a
    minTokenA,
    // minimum_asset_b  
    minTokenB,
    // killable: True
    new Constr(1, [])
  ]);

  // OrderDatum structure
  const orderDatum = new Constr(0, [
    // canceller (OAMSignature)
    new Constr(0, [userPubKeyHash]),
    // refund_receiver (user address - just payment hash for simplicity)
    userPubKeyHash,
    // refund_receiver_datum
    noDatum,
    // success_receiver
    userPubKeyHash,
    // success_receiver_datum
    noDatum,
    // lp_asset
    new Constr(0, [lpAsset.policyId, lpAsset.tokenName]),
    // batcher_fee
    2_000000n,
    // expired_setting_opt: None
    new Constr(1, []),
    // step
    withdrawStep
  ]);

  return Data.to(orderDatum);
}

/**
 * Build Minswap withdraw order transaction
 */
export async function buildWithdrawOrderTx(
  lucid: Lucid,
  params: WithdrawOrderParams
): Promise<{ txHash: string; orderUtxo: string }> {
  const { lpAsset, lpAmount, userAddress } = params;

  logger.info(`🔨 Building Minswap withdraw order...`);
  logger.info(`   LP Amount: ${lpAmount}`);
  logger.info(`   Min Token A: ${params.minTokenA}`);
  logger.info(`   Min Token B: ${params.minTokenB}`);

  // Create order datum
  const datumHex = createWithdrawOrderDatum(params);
  logger.debug(`📋 Order datum created: ${datumHex.substring(0, 50)}...`);

  // Build assets to send to order contract
  const orderAssets: Assets = {
    lovelace: 2_000000n, // Batcher fee
    [`${lpAsset.policyId}${lpAsset.tokenName}`]: lpAmount
  };

  // Build transaction
  const tx = lucid.newTx()
    .payToContract(
      MINSWAP_PREPROD.orderAddress,
      { inline: datumHex },
      orderAssets
    );

  logger.debug(`⚙️ Completing transaction...`);
  const completeTx = await tx.complete();
  
  logger.debug(`✍️ Signing transaction...`);
  const signedTx = await completeTx.sign().complete();
  
  logger.debug(`📤 Submitting transaction...`);
  const txHash = await signedTx.submit();

  // Calculate order UTxO reference (txHash#0 typically)
  const orderUtxo = `${txHash}#0`;

  logger.info(`✅ Withdraw order created: ${txHash}`);
  logger.info(`📦 Order UTxO: ${orderUtxo}`);

  return { txHash, orderUtxo };
}

/**
 * Combined emergency exit + withdraw order transaction
 * This creates both transactions in sequence
 */
export async function emergencyExitAndWithdraw(
  lucid: Lucid,
  vaultUtxo: UTxO,
  vaultScript: { type: "PlutusV2"; script: string },
  lpAsset: Asset,
  lpAmount: bigint,
  poolReserves: { reserveA: bigint; reserveB: bigint; totalLiquidity: bigint },
  userAddress: string,
  userPubKeyHash: string
): Promise<{ exitTxHash: string; withdrawOrderTxHash: string }> {
  
  logger.info(`🚨 Starting combined emergency exit + withdraw...`);
  
  // Step 1: Emergency Exit from Vault
  logger.info(`📤 Step 1: Emergency exit from vault...`);
  
  const exitRedeemer = Data.to(new Constr(3, [])); // EmergencyExit is variant 3, no fields
  
  const exitTx = lucid.newTx()
    .collectFrom([vaultUtxo], exitRedeemer)
    .attachSpendingValidator(vaultScript)
    .payToAddress(userAddress, vaultUtxo.assets);
  
  const completedExitTx = await exitTx.complete();
  const signedExitTx = await completedExitTx.sign().complete();
  const exitTxHash = await signedExitTx.submit();
  
  logger.info(`✅ Emergency exit successful: ${exitTxHash}`);
  
  // Wait for confirmation
  logger.info(`⏳ Waiting for exit confirmation...`);
  await lucid.awaitTx(exitTxHash);
  
  // Step 2: Create Minswap Withdraw Order
  logger.info(`📤 Step 2: Creating Minswap withdraw order...`);
  
  const { minA, minB } = calculateMinWithdrawAmounts(
    lpAmount,
    poolReserves.reserveA,
    poolReserves.reserveB,
    poolReserves.totalLiquidity,
    0.02 // 2% slippage for emergency situations
  );
  
  const { txHash: withdrawOrderTxHash } = await buildWithdrawOrderTx(lucid, {
    lpAsset,
    lpAmount,
    minTokenA: minA,
    minTokenB: minB,
    userAddress,
    userPubKeyHash
  });
  
  logger.info(`✅ Complete! Exit: ${exitTxHash}, Withdraw Order: ${withdrawOrderTxHash}`);
  
  return { exitTxHash, withdrawOrderTxHash };
}
