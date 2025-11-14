# Raw API Documentation

Complete guide to using the raw `client.execute()` API for direct transaction execution.

## Overview

The raw API provides low-level access to the Solana Execution Engine through the `client.execute()` method. This API gives you maximum control over transaction parameters and is ideal when you need fine-grained control or are building custom abstractions.

For a higher-level, more convenient API, see the [Transaction Builder API](./TRANSACTION_BUILDER.md).

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Transport Modes](#transport-modes)
- [Operation Types](#operation-types)
  - [Pump.fun Operations](#pumpfun-operations)
  - [Pump.fun AMM Operations](#pumpfun-amm-operations)
  - [System Transfer](#system-transfer)
  - [SPL Token Operations](#spl-token-operations)
- [Batched Operations](#batched-operations)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Installation

```bash
npm install @lyslabs.ai/lys-flash @solana/web3.js
```

## Quick Start

```typescript
import { SolanaExecutionClient } from '@lyslabs.ai/lys-flash';

// Create client
const client = new SolanaExecutionClient({
  zmqAddress: 'ipc:///tmp/tx-executor.ipc',
  timeout: 30000,
  verbose: true
});

// Execute a Pump.fun buy
const result = await client.execute({
  data: {
    executionType: "PUMP_FUN",
    eventType: "BUY",
    pool: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    poolAccounts: {
      coinCreator: "4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3"
    },
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    solAmountIn: 1_000_000,
    tokenAmountOut: 3_400_000_000
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  bribeLamports: 1_000_000,        // Required for MEV protection (all transports except VANILLA/SIMULATE)
  transport: "NONCE"
});

console.log("Transaction signature:", result.signature);

// Clean up
client.close();
```

## API Reference

### `client.execute(request: TransactionRequest): Promise<TransactionResponse>`

Executes a transaction on the Solana Execution Engine.

**Parameters:**

```typescript
interface TransactionRequest {
  data: OperationData | OperationData[];  // Single or batched operations
  feePayer: string;                        // Fee payer wallet address (base58)
  priorityFeeLamports?: number;            // Priority fee (default: 1_000_000)
  bribeLamports?: number;                  // MEV protection bribe (mandatory for all transports except VANILLA and SIMULATE)
  transport?: TransportMode;               // Transport mode (default: "NONCE")
}
```

**Returns:**

```typescript
interface TransactionResponse {
  success: boolean;
  signature?: string;      // Transaction signature
  error?: string;          // Error message if failed
  logs?: string[];         // Transaction logs
  slot?: number;           // Slot number
  latency?: number;        // Execution latency in ms
  transport?: string;      // Transport mode used
}
```

## Transport Modes

| Mode | Description | MEV Protection | Bribe Required |
|------|-------------|----------------|----------------|
| **NONCE** ⭐ | Multi-broadcast to 5 endpoints (recommended) | Yes | **YES** (min 1_000_000) |
| ZERO_SLOT | Ultra-fast specialized endpoint | Yes | **YES** (min 1_000_000) |
| NOZOMI | Low-latency Temporal endpoint | Yes | **YES** (min 1_000_000) |
| HELIUS_SENDER | Premium reliability | Yes | **YES** (min 1_000_000) |
| JITO | MEV-protected via Jito | Yes | **YES** (min 1_000_000) |
| VANILLA | Standard RPC | No | No |
| SIMULATE | Test without broadcasting (free) | No | No |

**Important:** All transport modes except VANILLA and SIMULATE **require** a minimum bribe of 1_000_000 lamports (0.001 SOL) for MEV protection.

## Operation Types

### Pump.fun Operations

#### BUY - Buy tokens on bonding curve

```typescript
const result = await client.execute({
  data: {
    executionType: "PUMP_FUN",
    eventType: "BUY",
    pool: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",  // Mint address
    poolAccounts: {
      coinCreator: "4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3"  // Optional but recommended
    },
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    solAmountIn: 1_000_000,           // 0.001 SOL
    tokenAmountOut: 3_400_000_000     // Minimum tokens expected
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  bribeLamports: 1_000_000,           // Required for MEV protection
  transport: "NONCE"
});
```

**Note:** `coinCreator` in `poolAccounts` is **optional but recommended**. Providing it speeds up transaction building by avoiding additional RPC requests.

#### SELL - Sell tokens on bonding curve

```typescript
const result = await client.execute({
  data: {
    executionType: "PUMP_FUN",
    eventType: "SELL",
    pool: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    poolAccounts: {
      coinCreator: "4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3"  // Optional but recommended
    },
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    tokenAmountIn: 3_400_000_000,        // Tokens to sell
    minSolAmountOut: 0,                   // Minimum SOL expected
    closeAssociatedTokenAccount: false    // Reclaim rent (optional)
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  bribeLamports: 1_000_000,               // Required for MEV protection
  transport: "NONCE"
});
```

#### CREATE - Create new token

```typescript
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const newMint = Keypair.generate();

const result = await client.execute({
  data: {
    executionType: "PUMP_FUN",
    eventType: "CREATE",
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    pool: newMint.publicKey.toBase58(),
    mintSecretKey: bs58.encode(newMint.secretKey),  // Base58 encoded secret key
    meta: {
      name: "Test Coin",
      symbol: "TEST",
      uri: "https://test.com/metadata.json"
    }
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  bribeLamports: 1_000_000,               // Required for MEV protection
  transport: "NONCE"
});
```

#### MIGRATE - Migrate to AMM

```typescript
const result = await client.execute({
  data: {
    executionType: "PUMP_FUN",
    eventType: "MIGRATE",
    pool: "s4WB81LEUw3mh3qMjQgAJzumYqdNTgr6DYPWaLbpump",
    user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89"
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  bribeLamports: 1_000_000,               // Required for MEV protection
  transport: "NONCE"
});
```

### Pump.fun AMM Operations

After migration to AMM, use these operations:

#### AMM BUY - Buy on AMM

```typescript
const result = await client.execute({
  data: {
    executionType: "PUMP_FUN_AMM",
    eventType: "BUY",
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
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  bribeLamports: 1_000_000,               // Required for MEV protection
  transport: "NONCE"
});
```

**Note:** `coinCreator` and `poolCreator` in `poolAccounts` are **optional but recommended**. Providing them speeds up transaction building by avoiding additional RPC requests.

#### AMM SELL - Sell on AMM

```typescript
const result = await client.execute({
  data: {
    executionType: "PUMP_FUN_AMM",
    eventType: "SELL",
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
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  bribeLamports: 1_000_000,               // Required for MEV protection
  transport: "NONCE"
});
```

### System Transfer

Transfer native SOL between wallets:

```typescript
const result = await client.execute({
  data: {
    executionType: "SYSTEM_TRANSFER",
    eventType: "TRANSFER",
    sender: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    recipient: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
    lamports: 10_000_000  // 0.01 SOL
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  transport: "SIMULATE"
});
```

### SPL Token Operations

#### TRANSFER - Transfer SPL tokens

```typescript
const result = await client.execute({
  data: {
    executionType: "SPL_TOKEN",
    eventType: "TRANSFER",
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    sourceOwner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    destinationOwner: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
    amount: 1_000_000  // 1 token (6 decimals)
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  transport: "SIMULATE"
});
```

#### TRANSFER_CHECKED - Transfer with validation

```typescript
const result = await client.execute({
  data: {
    executionType: "SPL_TOKEN",
    eventType: "TRANSFER_CHECKED",
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    sourceOwner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    destinationOwner: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
    amount: 1_000_000,
    decimals: 6
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  transport: "SIMULATE"
});
```

#### CREATE_ATA - Create Associated Token Account

```typescript
const result = await client.execute({
  data: {
    executionType: "SPL_TOKEN",
    eventType: "CREATE_ATA",
    payer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    owner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump"
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  transport: "SIMULATE"
});
```

#### CLOSE_ACCOUNT - Close token account

```typescript
const result = await client.execute({
  data: {
    executionType: "SPL_TOKEN",
    eventType: "CLOSE_ACCOUNT",
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    owner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89"
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  transport: "SIMULATE"
});
```

#### APPROVE - Approve delegate

```typescript
const result = await client.execute({
  data: {
    executionType: "SPL_TOKEN",
    eventType: "APPROVE",
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    delegate: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
    owner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    amount: 5_000_000
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  transport: "SIMULATE"
});
```

#### REVOKE - Revoke delegate

```typescript
const result = await client.execute({
  data: {
    executionType: "SPL_TOKEN",
    eventType: "REVOKE",
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    owner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89"
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  transport: "SIMULATE"
});
```

#### MINT_TO - Mint tokens

```typescript
const result = await client.execute({
  data: {
    executionType: "SPL_TOKEN",
    eventType: "MINT_TO",
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    destinationOwner: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
    authority: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    amount: 10_000_000
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  transport: "SIMULATE"
});
```

#### BURN - Burn tokens

```typescript
const result = await client.execute({
  data: {
    executionType: "SPL_TOKEN",
    eventType: "BURN",
    mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    owner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
    amount: 2_000_000
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  transport: "SIMULATE"
});
```

#### SYNC_NATIVE - Sync wrapped SOL

```typescript
const result = await client.execute({
  data: {
    executionType: "SPL_TOKEN",
    eventType: "SYNC_NATIVE",
    owner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89"
  },
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  transport: "SIMULATE"
});
```

## Batched Operations

Execute multiple operations atomically in a single transaction:

### Create + Buy (Batched)

```typescript
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const newMint = Keypair.generate();

const result = await client.execute({
  data: [
    // First: Create the token
    {
      executionType: "PUMP_FUN",
      eventType: "CREATE",
      user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
      pool: newMint.publicKey.toBase58(),
      mintSecretKey: bs58.encode(newMint.secretKey),
      meta: {
        name: "Test Coin",
        symbol: "TEST",
        uri: "https://test.com/metadata.json"
      }
    },
    // Second: Buy immediately
    {
      executionType: "PUMP_FUN",
      eventType: "BUY",
      pool: newMint.publicKey.toBase58(),
      poolAccounts: {
        coinCreator: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89"
      },
      user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
      solAmountIn: 10_000_000,
      tokenAmountOut: 34_000_000_000
    }
  ],
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  bribeLamports: 1_000_000,               // Required for MEV protection
  transport: "NONCE"
});
```

### Mixed Operations

Combine different operation types:

```typescript
const result = await client.execute({
  data: [
    // System transfer
    {
      executionType: "SYSTEM_TRANSFER",
      eventType: "TRANSFER",
      sender: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
      recipient: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
      lamports: 10_000_000
    },
    // SPL token transfer
    {
      executionType: "SPL_TOKEN",
      eventType: "TRANSFER",
      mint: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
      sourceOwner: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
      destinationOwner: "4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz",
      amount: 1_000_000
    },
    // Pump.fun buy
    {
      executionType: "PUMP_FUN",
      eventType: "BUY",
      pool: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
      poolAccounts: {
        coinCreator: "4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3"
      },
      user: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
      solAmountIn: 1_000_000,
      tokenAmountOut: 3_400_000_000
    }
  ],
  feePayer: "5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89",
  priorityFeeLamports: 1_000_000,
  bribeLamports: 1_000_000,               // Required for MEV protection
  transport: "NONCE"
});
```

## Error Handling

```typescript
import { ExecutionError, ErrorCode } from '@lyslabs.ai/lys-flash';

try {
  const result = await client.execute({
    data: { /* ... */ },
    feePayer: "wallet",
    priorityFeeLamports: 1_000_000,
    bribeLamports: 1_000_000,
    transport: "NONCE"
  });

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
    console.error("Execution error:", error.code);
    console.error("Message:", error.message);
    console.error("Transport:", error.transport);

    // Handle specific errors
    switch (error.code) {
      case ErrorCode.NONCE_POOL_EXHAUSTED:
        console.log("Nonce pool exhausted, wait and retry");
        break;
      case ErrorCode.TIMEOUT:
        console.log("Request timeout");
        break;
      case ErrorCode.NETWORK_ERROR:
        console.log("Network error, check connection");
        break;
      default:
        console.log("Unexpected error:", error.getUserMessage());
    }

    // Check if retryable
    if (error.isRetryable()) {
      console.log("This error can be retried");
    }
  } else {
    console.error("Unknown error:", error);
  }
}
```

## Best Practices

### 1. Always Use NONCE for Production

NONCE transport provides the fastest and most reliable execution:

```typescript
const result = await client.execute({
  data: { /* ... */ },
  feePayer: "wallet",
  priorityFeeLamports: 5_000_000,      // Higher priority for production
  bribeLamports: 1_000_000,            // Required for MEV protection
  transport: "NONCE"
});
```

### 2. Simulate Before Production Execution

Always simulate transactions before executing on mainnet:

```typescript
// First: Simulate
const simulation = await client.execute({
  data: { /* ... */ },
  feePayer: "wallet",
  priorityFeeLamports: 1_000_000,
  transport: "SIMULATE"  // No bribe needed for simulation
});

if (!simulation.success) {
  console.error("Simulation failed:", simulation.error);
  console.log("Logs:", simulation.logs);
  return;
}

// Then: Execute with NONCE
const result = await client.execute({
  data: { /* same data */ },
  feePayer: "wallet",
  priorityFeeLamports: 5_000_000,
  bribeLamports: 1_000_000,            // Required for MEV protection
  transport: "NONCE"
});
```

### 3. Provide Optional Pool Accounts

For Pump.fun and Pump.fun AMM operations, always provide `coinCreator` and `poolCreator` when available:

```typescript
const result = await client.execute({
  data: {
    executionType: "PUMP_FUN",
    eventType: "BUY",
    pool: "5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump",
    poolAccounts: {
      coinCreator: "4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3"  // Speeds up transaction
    },
    // ...
  },
  // ...
});
```

**Why?** Providing these accounts avoids additional RPC requests during transaction building, resulting in faster execution.

### 4. Reuse Client Instance

Don't create a new client for each transaction:

```typescript
// ❌ BAD
async function trade() {
  const client = new SolanaExecutionClient();
  await client.execute({ /* ... */ });
  client.close();
}

// ✅ GOOD
const client = new SolanaExecutionClient();

async function trade() {
  await client.execute({ /* ... */ });
}

// Close when done
process.on('exit', () => client.close());
```

### 5. Set Appropriate Priority Fees

Higher priority fees = faster landing:

```typescript
const result = await client.execute({
  data: { /* ... */ },
  feePayer: "wallet",
  priorityFeeLamports: 5_000_000,      // 0.005 SOL for important trades
  bribeLamports: 1_000_000,            // Required for MEV protection
  transport: "NONCE"
});
```

### 6. Monitor Statistics

Track client performance:

```typescript
const stats = client.getStats();
console.log(`Success rate: ${(stats.requestsSuccessful / stats.requestsSent * 100).toFixed(2)}%`);
console.log(`Average latency: ${stats.averageLatency.toFixed(2)}ms`);
console.log(`Connected: ${stats.connected}`);
```

## See Also

- [Transaction Builder API](./TRANSACTION_BUILDER.md) - Higher-level fluent API
- [Examples](./examples/raw-api-usage.ts) - Complete working examples
- [README](./README.md) - Main documentation
- [Wallet Management](./WALLET_MANAGEMENT.md) - Wallet creation guide

## Support

- [GitHub Issues](https://github.com/lyslabs-ai/lys-flash/issues)
- Email: hello@lyslabs.ai

## License

MIT © LYS Labs
