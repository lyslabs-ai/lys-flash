# Transaction Builder API Documentation

Complete guide to using the fluent `TransactionBuilder` API for easy transaction composition.

## Overview

The Transaction Builder provides a high-level, fluent API for composing and executing transactions. It's the **recommended** way to interact with the Solana Execution Engine, offering:

- **Fluent API**: Method chaining for readable code
- **Type Safety**: Full TypeScript support with auto-completion
- **Simplified Syntax**: Less boilerplate than raw API
- **Operation Batching**: Easily combine multiple operations

For low-level control, see the [Raw API Documentation](./RAW_API.md).

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Operation Methods](#operation-methods)
  - [Pump.fun Operations](#pumpfun-operations)
  - [Pump.fun AMM Operations](#pumpfun-amm-operations)
  - [System Transfer](#system-transfer)
  - [SPL Token Operations](#spl-token-operations)
- [Configuration Methods](#configuration-methods)
- [Batched Operations](#batched-operations)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Installation

```bash
npm install @lyslabs.ai/lys-flash @solana/web3.js
```

## Quick Start

```typescript
import { SolanaExecutionClient, TransactionBuilder } from '@lyslabs.ai/lys-flash';

// Create client
const client = new SolanaExecutionClient();

// Build and execute a transaction
const result = await new TransactionBuilder(client)
  .pumpFunBuy({
    pool: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    poolAccounts: {
      coinCreator: "4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3"
    },
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    solAmountIn: 1_000_000,
    tokenAmountOut: 3_400_000_000
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)             // Required for MEV protection
  .setTransport("NONCE")
  .send();

console.log("Transaction signature:", result.signature);

// Clean up
client.close();
```

## API Reference

### Constructor

```typescript
const builder = new TransactionBuilder(client: SolanaExecutionClient);
```

### Execution Methods

#### `send(): Promise<TransactionResponse>`

Execute the transaction and return the result.

```typescript
const result = await builder
  .pumpFunBuy({ /* ... */ })
  .setFeePayer("wallet")
  .setTransport("NONCE")
  .send();
```

#### `simulate(): Promise<TransactionResponse>`

Simulate the transaction without broadcasting (overrides transport to "SIMULATE").

```typescript
const simulation = await builder
  .pumpFunBuy({ /* ... */ })
  .setFeePayer("wallet")
  .simulate();

if (simulation.success) {
  console.log("Simulation passed!");
}
```

## Operation Methods

### Pump.fun Operations

#### `pumpFunBuy()` - Buy tokens on bonding curve

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunBuy({
    pool: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",  // Mint address
    poolAccounts: {
      coinCreator: "4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3"  // Optional
    },
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    solAmountIn: 1_000_000,           // 0.001 SOL
    tokenAmountOut: 3_400_000_000     // Minimum tokens expected
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)                // Required for MEV protection
  .setTransport("NONCE")
  .send();
```

**Note:** `coinCreator` in `poolAccounts` is **optional but recommended**. Providing it speeds up transaction building by avoiding additional RPC requests.

**Parameters:**
- `pool` (string): Token mint address
- `poolAccounts.coinCreator` (string, optional): Creator wallet address - speeds up execution
- `user` (string): Buyer wallet address
- `solAmountIn` (number): SOL amount in lamports (1 SOL = 1_000_000_000)
- `tokenAmountOut` (number): Minimum tokens expected (with decimals)

#### `pumpFunSell()` - Sell tokens on bonding curve

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunSell({
    pool: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    poolAccounts: {
      coinCreator: "4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3"  // Optional
    },
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    tokenAmountIn: 3_400_000_000,        // Tokens to sell
    minSolAmountOut: 0,                   // Minimum SOL expected
    closeAssociatedTokenAccount: false    // Reclaim rent (optional)
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)                    // Required for MEV protection
  .setTransport("NONCE")
  .send();
```

**Parameters:**
- `pool` (string): Token mint address
- `poolAccounts.coinCreator` (string, optional): Creator wallet - speeds up execution
- `user` (string): Seller wallet address
- `tokenAmountIn` (number): Tokens to sell (with decimals)
- `minSolAmountOut` (number): Minimum SOL expected in lamports
- `closeAssociatedTokenAccount` (boolean, optional): Reclaim rent by closing ATA

#### `pumpFunCreate()` - Create new token

```typescript
import { Keypair } from '@solana/web3.js';

const mintKeypair = Keypair.generate();

const result = await new TransactionBuilder(client)
  .pumpFunCreate({
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    pool: mintKeypair.publicKey.toBase58(),
    mintSecretKey: Buffer.from(mintKeypair.secretKey).toString('base64'),
    meta: {
      name: "Test Coin",
      symbol: "TEST",
      uri: "https://test.com/metadata.json"
    }
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)                    // Required for MEV protection
  .setTransport("NONCE")
  .send();
```

**Parameters:**
- `user` (string): Creator wallet address
- `pool` (string): Mint public key (base58)
- `mintSecretKey` (string): Mint secret key (base64 or base58)
- `meta.name` (string): Token name
- `meta.symbol` (string): Token symbol
- `meta.uri` (string): Metadata URI

#### `pumpFunMigrate()` - Migrate to AMM

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunMigrate({
    pool: "s4WB81LEUw3mh3qMjQgAJzumYqdNTgr6DYPWaLbpump",
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89"
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)                    // Required for MEV protection
  .setTransport("NONCE")
  .send();
```

**Parameters:**
- `pool` (string): Token mint address
- `user` (string): User wallet address

### Pump.fun AMM Operations

After migration to AMM, use these operations:

#### `pumpFunAmmBuy()` - Buy on AMM

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunAmmBuy({
    pool: "9kSKBD8G7Qio51XsLm5yhWWZ72YDJuUeJ6PqDc2mWZe1",
    poolAccounts: {
      baseMint: "EZtWGQLW2ihjvJXiBRNVz7gUVgnyn9aRQUcQkCeepump",
      quoteMint: "So11111111111111111111111111111111111111112",
      coinCreator: "5VuTMuSbGbtuWsZuixbZxhD1DCuYv6ikzeM59a1XzjRN",   // Optional
      poolCreator: "EXapcg7mPND38PKsSgB8iicv2CD1Gfy9VcC9HtdBrXsD"   // Optional
    },
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    solAmountIn: 10_000_000,
    tokenAmountOut: 1_000_000
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)                    // Required for MEV protection
  .setTransport("NONCE")
  .send();
```

**Note:** `coinCreator` and `poolCreator` in `poolAccounts` are **optional but recommended**. Providing them speeds up transaction building by avoiding additional RPC requests.

**Parameters:**
- `pool` (string): AMM pool address
- `poolAccounts.baseMint` (string): Base token mint
- `poolAccounts.quoteMint` (string): Quote token mint (usually SOL)
- `poolAccounts.coinCreator` (string, optional): Coin creator - speeds up execution
- `poolAccounts.poolCreator` (string, optional): Pool creator - speeds up execution
- `user` (string): Buyer wallet address
- `solAmountIn` (number): SOL amount in lamports
- `tokenAmountOut` (number): Minimum tokens expected

#### `pumpFunAmmSell()` - Sell on AMM

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunAmmSell({
    pool: "9kSKBD8G7Qio51XsLm5yhWWZ72YDJuUeJ6PqDc2mWZe1",
    poolAccounts: {
      baseMint: "EZtWGQLW2ihjvJXiBRNVz7gUVgnyn9aRQUcQkCeepump",
      quoteMint: "So11111111111111111111111111111111111111112",
      coinCreator: "5VuTMuSbGbtuWsZuixbZxhD1DCuYv6ikzeM59a1XzjRN",   // Optional
      poolCreator: "EXapcg7mPND38PKsSgB8iicv2CD1Gfy9VcC9HtdBrXsD"   // Optional
    },
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    tokenAmountIn: 1_000_000,
    minSolAmountOut: 0,
    closeAssociatedTokenAccount: false
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)                    // Required for MEV protection
  .setTransport("NONCE")
  .send();
```

**Parameters:**
- `pool` (string): AMM pool address
- `poolAccounts.baseMint` (string): Base token mint
- `poolAccounts.quoteMint` (string): Quote token mint
- `poolAccounts.coinCreator` (string, optional): Coin creator - speeds up execution
- `poolAccounts.poolCreator` (string, optional): Pool creator - speeds up execution
- `user` (string): Seller wallet address
- `tokenAmountIn` (number): Tokens to sell
- `minSolAmountOut` (number): Minimum SOL expected
- `closeAssociatedTokenAccount` (boolean, optional): Reclaim rent

### System Transfer

#### `systemTransfer()` - Transfer native SOL

```typescript
const result = await new TransactionBuilder(client)
  .systemTransfer({
    sender: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    recipient: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
    lamports: 10_000_000  // 0.01 SOL
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setTransport("SIMULATE")
  .send();
```

**Parameters:**
- `sender` (string): Sender wallet address
- `recipient` (string): Recipient wallet address
- `lamports` (number): Amount to transfer in lamports

### SPL Token Operations

#### `splTokenTransfer()` - Transfer SPL tokens

```typescript
const result = await new TransactionBuilder(client)
  .splTokenTransfer({
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    sourceOwner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    destinationOwner: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
    amount: 1_000_000
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setTransport("SIMULATE")
  .send();
```

#### `splTokenTransferChecked()` - Transfer with validation

```typescript
const result = await new TransactionBuilder(client)
  .splTokenTransferChecked({
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    sourceOwner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    destinationOwner: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
    amount: 1_000_000,
    decimals: 6
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setTransport("SIMULATE")
  .send();
```

#### `splTokenCreateATA()` - Create Associated Token Account

```typescript
const result = await new TransactionBuilder(client)
  .splTokenCreateATA({
    payer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    owner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump"
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setTransport("SIMULATE")
  .send();
```

#### `splTokenCloseAccount()` - Close token account

```typescript
const result = await new TransactionBuilder(client)
  .splTokenCloseAccount({
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    owner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89"
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setTransport("SIMULATE")
  .send();
```

#### `splTokenApprove()` - Approve delegate

```typescript
const result = await new TransactionBuilder(client)
  .splTokenApprove({
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    delegate: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
    owner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    amount: 5_000_000
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setTransport("SIMULATE")
  .send();
```

#### `splTokenRevoke()` - Revoke delegate

```typescript
const result = await new TransactionBuilder(client)
  .splTokenRevoke({
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    owner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89"
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setTransport("SIMULATE")
  .send();
```

#### `splTokenMintTo()` - Mint tokens

```typescript
const result = await new TransactionBuilder(client)
  .splTokenMintTo({
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    destinationOwner: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
    authority: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    amount: 10_000_000
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setTransport("SIMULATE")
  .send();
```

#### `splTokenBurn()` - Burn tokens

```typescript
const result = await new TransactionBuilder(client)
  .splTokenBurn({
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    owner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    amount: 2_000_000
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setTransport("SIMULATE")
  .send();
```

#### `splTokenSyncNative()` - Sync wrapped SOL

```typescript
const result = await new TransactionBuilder(client)
  .splTokenSyncNative({
    owner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89"
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setTransport("SIMULATE")
  .send();
```

## Configuration Methods

### `setFeePayer(address: string)`

Set the transaction fee payer (required).

```typescript
builder.setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
```

### `setPriorityFee(lamports: number)`

Set priority fee in lamports (default: 1_000_000).

```typescript
builder.setPriorityFee(5_000_000)  // 0.005 SOL for high priority
```

### `setBribe(lamports: number)`

Set MEV protection bribe in lamports. **Required for all transports except VANILLA and SIMULATE** (minimum: 1_000_000).

```typescript
builder.setBribe(1_000_000)  // 0.001 SOL (required for MEV protection)
```

### `setTransport(mode: TransportMode)`

Set the transport mode (default: "NONCE").

```typescript
builder.setTransport("NONCE")       // Multi-broadcast (fastest)
builder.setTransport("ZERO_SLOT")   // Ultra-fast single RPC
builder.setTransport("NOZOMI")      // Low-latency
builder.setTransport("VANILLA")     // Standard RPC
builder.setTransport("SIMULATE")    // Test without broadcasting
```

**Available modes:**
- `NONCE` - Multi-broadcast with MEV protection (requires bribe)
- `ZERO_SLOT` - Ultra-fast with MEV protection (requires bribe)
- `NOZOMI` - Low-latency with MEV protection (requires bribe)
- `HELIUS_SENDER` - Premium reliability with MEV protection (requires bribe)
- `JITO` - MEV-protected via Jito (requires bribe)
- `VANILLA` - Standard RPC (no MEV protection, no bribe)
- `SIMULATE` - Testing only (no broadcast, no bribe)

## Batched Operations

Chain multiple operations in a single transaction:

### Create + Buy (Batched)

```typescript
import { Keypair } from '@solana/web3.js';

const mintKeypair = Keypair.generate();

const result = await new TransactionBuilder(client)
  .pumpFunCreate({
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    pool: mintKeypair.publicKey.toBase58(),
    mintSecretKey: Buffer.from(mintKeypair.secretKey).toString('base64'),
    meta: {
      name: "Test Coin",
      symbol: "TEST",
      uri: "https://test.com/metadata.json"
    }
  })
  .pumpFunBuy({
    pool: mintKeypair.publicKey.toBase58(),
    poolAccounts: {
      coinCreator: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89"
    },
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    solAmountIn: 10_000_000,
    tokenAmountOut: 34_000_000_000
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)                    // Required for MEV protection
  .setTransport("NONCE")
  .send();
```

### Mixed Operations

Combine different operation types:

```typescript
const result = await new TransactionBuilder(client)
  .systemTransfer({
    sender: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    recipient: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
    lamports: 10_000_000
  })
  .splTokenTransfer({
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    sourceOwner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    destinationOwner: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
    amount: 1_000_000
  })
  .pumpFunBuy({
    pool: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    poolAccounts: {
      coinCreator: "4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3"
    },
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    solAmountIn: 1_000_000,
    tokenAmountOut: 3_400_000_000
  })
  .setFeePayer("5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)                    // Required for MEV protection
  .setTransport("NONCE")
  .send();
```

All operations execute atomically - either all succeed or all fail.

## Error Handling

```typescript
import { ExecutionError, ErrorCode } from '@lyslabs.ai/lys-flash';

try {
  const result = await new TransactionBuilder(client)
    .pumpFunBuy({ /* ... */ })
    .setFeePayer("wallet")
    .setBribe(1_000_000)
    .setTransport("NONCE")
    .send();

  if (result.success) {
    console.log("Success:", result.signature);
    console.log("Slot:", result.slot);
    console.log("Latency:", result.latency, "ms");
  } else {
    console.error("Transaction failed:", result.error);
    console.log("Logs:", result.logs);
  }
} catch (error) {
  if (error instanceof ExecutionError) {
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("Transport:", error.transport);

    switch (error.code) {
      case ErrorCode.NONCE_POOL_EXHAUSTED:
        console.log("Nonce pool exhausted, wait and retry");
        break;
      case ErrorCode.TIMEOUT:
        console.log("Request timeout");
        break;
      case ErrorCode.NETWORK_ERROR:
        console.log("Network error");
        break;
    }

    if (error.isRetryable()) {
      console.log("Can retry this error");
    }
  }
}
```

## Best Practices

### 1. Always Simulate First

Test transactions before executing on mainnet:

```typescript
// Simulate
const simulation = await new TransactionBuilder(client)
  .pumpFunBuy({ /* ... */ })
  .setFeePayer("wallet")
  .simulate();  // Uses SIMULATE transport automatically

if (!simulation.success) {
  console.error("Simulation failed:", simulation.error);
  return;
}

// Execute
const result = await new TransactionBuilder(client)
  .pumpFunBuy({ /* same params */ })
  .setFeePayer("wallet")
  .setBribe(1_000_000)
  .setTransport("NONCE")
  .send();
```

### 2. Use MEV-Protected Transports for Production

Use NONCE (recommended), ZERO_SLOT, NOZOMI, HELIUS_SENDER, or JITO for MEV protection:

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunBuy({ /* ... */ })
  .setFeePayer("wallet")
  .setPriorityFee(5_000_000)      // Higher for important trades
  .setBribe(1_000_000)            // Required for MEV protection
  .setTransport("NONCE")
  .send();
```

### 3. Provide Optional Pool Accounts

Always provide `coinCreator` and `poolCreator` when available:

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunBuy({
    pool: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    poolAccounts: {
      coinCreator: "4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3"  // Faster execution
    },
    // ...
  })
  // ...
```

**Why?** Providing these accounts avoids additional RPC requests, speeding up transaction building.

### 4. Batch Related Operations

Combine operations that should execute atomically:

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunCreate({ /* ... */ })    // Create token
  .pumpFunBuy({ /* ... */ })        // Buy immediately
  .setFeePayer("wallet")
  .setBribe(1_000_000)
  .setTransport("NONCE")
  .send();
```

### 5. Set Appropriate Fees

Higher fees = faster landing:

```typescript
builder
  .setPriorityFee(5_000_000)      // 0.005 SOL for high priority
  .setBribe(1_000_000)            // 0.001 SOL (minimum for NONCE)
```

### 6. Reuse Client Instance

```typescript
// ✅ GOOD
const client = new SolanaExecutionClient();

async function trade1() {
  await new TransactionBuilder(client)
    .pumpFunBuy({ /* ... */ })
    .setFeePayer("wallet")
    .send();
}

async function trade2() {
  await new TransactionBuilder(client)
    .pumpFunSell({ /* ... */ })
    .setFeePayer("wallet")
    .send();
}

// Clean up once
process.on('exit', () => client.close());
```

## See Also

- [Raw API Documentation](./RAW_API.md) - Low-level API for advanced use cases
- [Examples](./examples/transaction-builder-usage.ts) - Complete working examples
- [README](./README.md) - Main documentation
- [Wallet Management](./WALLET_MANAGEMENT.md) - Wallet creation guide

## Support

- [GitHub Issues](https://github.com/lyslabs-ai/lys-flash/issues)
- Email: hello@lyslabs.ai

## License

MIT © LYS Labs
