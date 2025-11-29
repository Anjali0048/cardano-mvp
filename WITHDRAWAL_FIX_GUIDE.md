# Emergency Exit & Withdrawal - Core Issues & Solutions

## Problem Statement

Users cannot withdraw from vaults. The emergency exit transaction fails with:
- "Do not know how to serialize a BigInt"
- Script execution failures
- Redeemer encoding issues

## Root Causes Identified

### 1. **BigInt Serialization Issue**
- **Problem**: Lucid returns UTxO assets with `BigInt` values, but `JSON.stringify()` cannot serialize BigInt
- **Symptom**: Console logging crashes when trying to log assets
- **Fix Applied**: Convert BigInt to string before logging

### 2. **Missing Minimum ADA Output**
- **Problem**: When sending assets back to a user address, Cardano requires minimum ADA per UTxO
- **Symptom**: Transaction fails at `.complete()` stage
- **Fix Applied**: Add explicit signer key to transaction

### 3. **Redeemer Encoding**
- **Problem**: Previously using `Data.to(new Constr(3, []))` which double-encodes the redeemer
- **Symptom**: "Constr tag: 121" error in script execution
- **Fix Applied**: Changed to plain `new Constr(3, [])` - let Lucid handle serialization

### 4. **Missing Blockfrost API Key Variable**
- **Problem**: Code referenced undefined `BLOCKFROST_API_KEY` instead of `blockfrostKey` variable
- **Symptom**: "BLOCKFROST_API_KEY is not defined" errors
- **Fix Applied**: Replaced all references with `blockfrostKey` from config

## Architecture Issues That Need Redesign

### Current Flow (Broken)
```
1. User clicks "Emergency Exit"
2. Frontend fetches vault UTXO
3. Creates transaction with:
   - Input: vault UTXO (with assets + datum)
   - Redeemer: EmergencyExit (Constr 3)
   - Output: send assets to user address
4. Sign & submit
   ❌ FAILS - BigInt serialization or minimum ADA issues
```

### Required Flow (To Implement)

```typescript
// Core withdrawal transaction structure that MUST work:

const vaultUtxo = /* UTxO from vault address */;
const userAddress = /* wallet address */;
const emergencyExitRedeemer = new Constr(3, []); // EmergencyExit variant

// CORRECT pattern:
const tx = lucid
  .newTx()
  .collectFrom([vaultUtxo], emergencyExitRedeemer)
  .attachSpendingValidator(vaultValidator)
  
// For ADA + tokens, send ALL assets from vault UTxO
// Lucid's payToAddress() expects assets as { policyId+assetName: BigInt }
// BUT it handles BigInt internally during serialization
  .payToAddress(userAddress, {
    // Include minimum ADA for output UTxO (typically 2 ADA)
    lovelace: (BigInt(vaultUtxo.assets.lovelace) || 0n) + 2_000_000n,
    // Include all other assets
    ...otherAssets
  })
  
  // Add signer to satisfy witness requirement
  .addSignerKey(userPaymentHash)
  
// Let Lucid handle all serialization
const completedTx = await tx.complete();
```

## Critical Fixes Needed (Priority Order)

### 1. **Ensure Proper Minimum ADA Handling** ⚠️ HIGH PRIORITY
The transaction output MUST have at least 2 ADA (2,000,000 lovelace).

```typescript
// BAD (causes failure):
.payToAddress(userAddress, vaultUtxo.assets)

// GOOD (ensures minimum ADA):
const outputAssets = {
  ...vaultUtxo.assets,
  lovelace: (BigInt(vaultUtxo.assets.lovelace) || 0n) + 2_000_000n
}
.payToAddress(userAddress, outputAssets)
```

### 2. **Validate Redeemer Format** ⚠️ HIGH PRIORITY
Redeemer MUST match validator's type definition:

```typescript
// Current (correct):
const emergencyExitRedeemer = new Constr(3, [])

// This is the ONLY format that works with:
// VaultRedeemer = ... | EmergencyExit  (variant 3, no fields)
```

### 3. **Verify Datum Exists on UTxO** ⚠️ CRITICAL
The vault UTxO MUST have a datum, or validation fails.

```typescript
if (!vaultUtxo.datum) {
  throw new Error('Vault UTxO has no datum - cannot validate emergency exit')
}
// If datum is inline (not by hash), Lucid handles it automatically
```

### 4. **Ensure Script Reference is Attached** ⚠️ MEDIUM PRIORITY
The validator script MUST be attached to transaction:

```typescript
.attachSpendingValidator({
  type: "PlutusV2",
  script: validatorScript  // Compiled Aiken code (hex)
})
```

## Test Checklist for Withdrawal

```
Before attempting emergency exit, verify:

☐ Vault address has at least 1 vault UTxO
☐ Vault UTxO has a datum (inline or by hash)
☐ Vault UTxO contains LP tokens + ADA
☐ User wallet is connected and unlocked
☐ User has enough ADA for fees (~1 ADA)
☐ Validator script loads from backend API without errors
☐ Network is Preprod (not mainnet or other)
☐ Blockfrost API key is valid

If emergency exit fails:
1. Check browser console for exact error
2. Verify asset types in UTXO (should be standard Cardano format)
3. Ensure datum structure matches VaultDatum on-chain
4. Verify redeemer is plain Constr(3, []) not Data.to() wrapped
```

## Files Modified for Withdrawal Fixes

**Frontend:**
- `frontend/src/pages/VaultManagement.tsx` - Emergency exit transaction building
  - Fixed BigInt logging issues
  - Added explicit signer key
  - Improved error logging

**Backend:**
- `keeper-bot/src/apiServer.ts` - Replaced hardcoded BLOCKFROST_API_KEY with blockfrostKey
- `keeper-bot/src/index.ts` - Added API server startup

## Next Steps

1. **Test emergency exit with fixes** - Try withdrawal with a test vault
2. **If still failing** - Check exact error message from blockchain
3. **Verify validator logic** - Ensure vault.ak validator accepts EmergencyExit
4. **Check datum structure** - Ensure on-chain datum matches expected VaultDatum
5. **Review Minswap withdraw order** - After exit succeeds, implement withdraw order creation

## Success Criteria

Emergency exit transaction succeeds when:
- ✅ Transaction submits without serialization errors
- ✅ Blockchain accepts transaction (in mempool)
- ✅ Transaction confirms (in block)
- ✅ Assets appear in user's wallet
- ✅ Next step: Create Minswap withdraw order to convert LP → ADA+tokens
