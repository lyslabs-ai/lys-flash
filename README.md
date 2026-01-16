# @lyslabs.ai/lys-flash

> High-performance TypeScript client for Solana Execution Engine
>
> Transaction execution for trading bots on Solana

[![npm version](https://img.shields.io/npm/v/@lyslabs.ai/lys-flash.svg)](https://www.npmjs.com/package/@lyslabs.ai/lys-flash)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## Features

- **🚀 Multi-Broadcast**: Multi-broadcast strategy for fast confirmations
- **📦 50+ Operations**: Pump.fun, Meteora (DBC, DAMM, DLMM), SPL Token, System Transfer
- **🔐 Secure Wallet Creation**: Dual-encrypted wallet generation with user-side decryption
- **🔧 Type-Safe**: Full TypeScript support with comprehensive types
- **⚡ High Performance**: MessagePack over ZeroMQ for efficient communication
- **🎯 Builder Pattern**: Fluent API for easy transaction composition
- **🔄 Auto-Reconnect**: Automatic connection recovery
- **📊 Statistics**: Built-in performance tracking
- **🛡️ MEV Protection**: Jito integration for high-value transactions
- **🌊 Meteora Integration**: Full support for DBC, DAMM v1/v2, and DLMM pools

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Detailed Documentation](#detailed-documentation)
- [Prerequisites](#prerequisites)
- [Wallet Management](#wallet-management)
  - [Creating Wallets](#creating-wallets)
  - [Decrypting Wallets](#decrypting-wallets)
  - [Security](#security)
- [Usage](#usage)
  - [Client API](#client-api)
  - [Builder API](#builder-api)
  - [Supported Operations](#supported-operations)
  - [Raw Transactions](#raw-transactions)
  - [Transport Modes](#transport-modes)
- [Examples](#examples)
- [Advanced Usage](#advanced-usage)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install @lyslabs.ai/lys-flash @solana/web3.js tweetnacl
```

**Note:** `tweetnacl` is required for wallet decryption on the client side.

### Optional: Meteora Integration

To use Meteora pool operations, install the corresponding SDK packages:

```bash
# For DBC (Dynamic Bonding Curve)
npm install @meteora-ag/dynamic-bonding-curve-sdk

# For DAMM v1 (Dynamic AMM)
npm install @meteora-ag/dynamic-amm-sdk

# For DAMM v2 (CP-AMM)
npm install @meteora-ag/cp-amm-sdk

# For DLMM (Dynamic Liquidity Market Maker)
npm install @meteora-ag/dlmm
```

**Note:** Meteora operations require a `Connection` object to be provided when creating the `LysFlash` client:

```typescript
import { Connection } from '@solana/web3.js';
import { LysFlash } from '@lyslabs.ai/lys-flash';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = new LysFlash({
  address: 'ipc:///tmp/tx-executor.ipc',
  connection,  // Required for Meteora operations
});
```

## Quick Start

### Step 1: Connect to the Execution Engine

```typescript
import { LysFlash } from '@lyslabs.ai/lys-flash';

// Connect via ZeroMQ IPC (default, fastest - no API key required)
const client = new LysFlash();

// Or connect via ZeroMQ TCP
const client = new LysFlash({
  address: 'tcp://127.0.0.1:5555'
});

// Or connect via HTTP (API key required)
const client = new LysFlash({
  address: 'http://localhost:3000',
  apiKey: 'sk_live_your_api_key'
});

// Or connect via HTTPS (API key required)
const client = new LysFlash({
  address: 'https://api.example.com',
  apiKey: 'sk_live_your_api_key',
  contentType: 'msgpack'  // or 'json' (default: 'msgpack')
});
```

The client automatically detects the transport mode based on the URL scheme:
- `ipc://` or `tcp://` → ZeroMQ transport (default, lowest latency, no API key)
- `http://` or `https://` → HTTP transport (requires API key, for remote/cloud deployments)

### Step 2: Create a Wallet (Optional)

```typescript
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';

// Create a new wallet with dual encryption
const userKeypair = Keypair.generate(); // Your encryption key
const wallet = await client.createWallet(userKeypair.publicKey.toBase58());

console.log("New wallet created:", wallet.publicKey);

// Decrypt to use the wallet
const secretKey = nacl.box.open(
  Buffer.from(wallet.encryptedSecretKey, 'base64'),
  Buffer.from(wallet.nonce, 'base64'),
  Buffer.from(wallet.ephemeralPublicKey, 'base64'),
  userKeypair.secretKey
);

const walletKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey!));
// Now use walletKeypair for transactions
```

### Step 3: Execute Transactions

```typescript
import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';

// Create client
const client = new LysFlash();

// Buy tokens with builder pattern (simple API)
const result = await new TransactionBuilder(client)
  .pumpFunBuy({
    pool: "mint_address_here",
    poolAccounts: { coinCreator: "creator_address" },
    user: "buyer_wallet",
    solAmountIn: 1_000_000,        // 0.001 SOL
    tokenAmountOut: 3_400_000_000   // Min 3.4B tokens
  })
  .setFeePayer("buyer_wallet")
  .setPriorityFee(1_000_000)       // 0.001 SOL priority fee
  .setBribe(1_000_000)             // 0.001 SOL bribe (mandatory for FLASH)
  .setTransport("FLASH")            // Multi-broadcast
  .send();

console.log("Transaction signature:", result.signature);

// Clean up
client.close();
```

## Detailed Documentation

For comprehensive guides and examples, see:

### API Documentation

- **[Raw API Guide](./RAW_API.md)** - Complete guide to using `client.execute()` for direct transaction execution with maximum control
- **[Transaction Builder Guide](./TRANSACTION_BUILDER.md)** - Complete guide to using the fluent `TransactionBuilder` API (recommended)

### Examples

- **[Raw API Examples](./examples/raw-api-usage.ts)** - Working examples using `client.execute()`
- **[Transaction Builder Examples](./examples/transaction-builder-usage.ts)** - Working examples using `TransactionBuilder`
- **[Raw Transaction Examples](./examples/raw-transaction-usage.ts)** - Execute pre-built `@solana/web3.js` transactions
- **[Basic Usage](./examples/basic-usage.ts)** - Simple quick-start example
- **[Wallet Management](./examples/wallet-management.ts)** - Secure wallet creation and management

### Other Guides

- **[Wallet Management](./WALLET_MANAGEMENT.md)** - Wallet creation, encryption, and security
- **[Security Policy](./SECURITY.md)** - Security best practices and policies
- **[Contributing](./CONTRIBUTING.md)** - How to contribute to the project

**Note:** For Pump.fun and Pump.fun AMM operations, providing `coinCreator` and `poolCreator` in `poolAccounts` is **optional but recommended**. These fields speed up transaction building by avoiding additional RPC requests to fetch pool metadata.

## Prerequisites

**Required:**
- Node.js 18+
- Solana Execution Engine running (see main repo)
- ZeroMQ socket accessible

**Recommended for production:**
- Multiple RPC endpoints configured
- gRPC monitoring enabled
- Nonce pool configured

## Wallet Management

The client library provides secure wallet creation with **dual encryption** for maximum security.

### Creating Wallets

Create new wallets with server-side and client-side encryption:

```typescript
import { LysFlash } from '@lyslabs.ai/lys-flash';
import { Keypair } from '@solana/web3.js';

const client = new LysFlash();

// Your keypair for encryption (user's existing wallet)
const userKeypair = Keypair.generate();

// Create new wallet
const wallet = await client.createWallet(
  userKeypair.publicKey.toBase58()
);

console.log("New wallet created!");
console.log("Public key:", wallet.publicKey);
console.log("Encrypted secret key:", wallet.encryptedSecretKey);
```

**Response format:**
```typescript
{
  success: true,
  publicKey: string,              // New wallet address
  encryptedSecretKey: string,     // User-encrypted (base64)
  nonce: string,                  // Encryption nonce (base64)
  ephemeralPublicKey: string      // For decryption (base64)
}
```

### Decrypting Wallets

Decrypt the wallet secret key on the client side:

```typescript
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';

// User's keypair (same one used for creation)
const userKeypair = Keypair.fromSecretKey(yourSecretKey);

// Decrypt the secret key
const decryptedSecretKey = nacl.box.open(
  Buffer.from(wallet.encryptedSecretKey, 'base64'),
  Buffer.from(wallet.nonce, 'base64'),
  Buffer.from(wallet.ephemeralPublicKey, 'base64'),
  userKeypair.secretKey
);

if (!decryptedSecretKey) {
  throw new Error("Failed to decrypt wallet");
}

// Create Keypair from decrypted secret
const newWalletKeypair = Keypair.fromSecretKey(
  new Uint8Array(decryptedSecretKey)
);

console.log("Decrypted wallet:", newWalletKeypair.publicKey.toBase58());

// Now you can use this wallet for transactions
const result = await new TransactionBuilder(client)
  .pumpFunBuy({
    pool: "mint_address",
    poolAccounts: { coinCreator: "creator" },
    user: newWalletKeypair.publicKey.toBase58(), // New wallet
    solAmountIn: 1_000_000,
    tokenAmountOut: 3_400_000_000
  })
  .setFeePayer(newWalletKeypair.publicKey.toBase58())
  .setBribe(1_000_000)             // 0.001 SOL bribe (mandatory for FLASH)
  .setTransport("FLASH")
  .send();
```

### Security

**Dual Encryption System:**

1. **Server-side encryption (AES-256-GCM)**
   - Wallet secret keys are encrypted with a master secret on the server
   - Stored securely in `wallets.json`
   - In-memory cache for O(1) lookup

2. **Client-side encryption (TweetNaCl box)**
   - Secret keys are encrypted with the user's Ed25519 public key
   - Only the user can decrypt with their private key
   - Ed25519 keys are converted to Curve25519 for encryption

**Security guarantees:**
- Server never stores plaintext secret keys
- Only the user can decrypt their wallets
- Perfect forward secrecy
- Secure key conversion (Ed25519 → Curve25519)

**Best practices:**
- Store encrypted wallets securely (database, encrypted storage)
- Never log or transmit plaintext secret keys
- Use environment variables for the user's keypair
- Rotate master secret regularly (server-side)

## Usage

### Client API

The `LysFlash` client provides the low-level API for direct transaction execution.

```typescript
import { LysFlash } from '@lyslabs.ai/lys-flash';

const client = new LysFlash({
  address: 'ipc:///tmp/tx-executor.ipc',  // default
  timeout: 30000,                          // 30 seconds
  autoReconnect: true,
  verbose: false
});

// Execute transaction (raw API)
const result = await client.execute({
  data: {
    executionType: "PUMP_FUN",
    eventType: "BUY",
    pool: "mint_address",
    poolAccounts: { coinCreator: "creator" },
    user: "wallet",
    solAmountIn: 1_000_000,
    tokenAmountOut: 3_400_000_000
  },
  feePayer: "wallet",
  priorityFeeLamports: 1_000_000,
  bribeLamports: 1_000_000,            // Mandatory for FLASH
  transport: "FLASH"
});

// Get statistics
const stats = client.getStats();
console.log("Success rate:",
  (stats.requestsSuccessful / stats.requestsSent * 100).toFixed(2) + "%"
);

// Clean up
client.close();
```

### Builder API

The `TransactionBuilder` provides a fluent API for easy transaction composition.

```typescript
import { TransactionBuilder } from '@lyslabs.ai/lys-flash';

const result = await new TransactionBuilder(client)
  .pumpFunBuy({
    pool: "mint",
    poolAccounts: { coinCreator: "creator" },
    user: "wallet",
    solAmountIn: 1_000_000,
    tokenAmountOut: 3_400_000_000
  })
  .setFeePayer("wallet")
  .setPriorityFee(5_000_000)      // High priority
  .setBribe(1_000_000)            // Jito tip
  .setTransport("FLASH")
  .send();
```

#### Meteora Operations

Meteora operations are accessed via the `.meteora` namespace:

```typescript
// DBC (Dynamic Bonding Curve)
await new TransactionBuilder(client).meteora.dbc.buy({ ... });

// DAMM v1 (Dynamic AMM)
await new TransactionBuilder(client).meteora.dammV1.buy({ ... });

// DAMM v2 (CP-AMM)
await new TransactionBuilder(client).meteora.dammV2.buy({ ... });

// DLMM (Dynamic Liquidity Market Maker)
await new TransactionBuilder(client).meteora.dlmm.buy({ ... });
```

### Supported Operations

#### Pump.fun (4 operations)
- `pumpFunBuy()` - Buy tokens on bonding curve
- `pumpFunSell()` - Sell tokens on bonding curve
- `pumpFunCreate()` - Create new token
- `pumpFunMigrate()` - Migrate to Pump.fun AMM

#### Pump.fun AMM (2 operations)
- `pumpFunAmmBuy()` - Buy on Pump.fun AMM
- `pumpFunAmmSell()` - Sell on Pump.fun AMM

#### Meteora DBC - Dynamic Bonding Curve (8 operations)
- `meteora.dbc.buy()` - Buy tokens with SOL
- `meteora.dbc.sell()` - Sell tokens for SOL
- `meteora.dbc.swap()` - Generic swap with direction
- `meteora.dbc.buy2()` - Buy with ExactIn mode (swap2)
- `meteora.dbc.sell2()` - Sell with ExactIn mode (swap2)
- `meteora.dbc.swap2()` - Advanced swap with mode selection (ExactIn/PartialFill/ExactOut)
- `meteora.dbc.buyExactOut()` - Buy exact token amount
- `meteora.dbc.sellExactOut()` - Sell for exact SOL amount

#### Meteora DAMM v1 - Dynamic AMM v1 (3 operations)
- `meteora.dammV1.buy()` - Buy tokens with SOL
- `meteora.dammV1.sell()` - Sell tokens for SOL
- `meteora.dammV1.swap()` - Generic swap

#### Meteora DAMM v2 - Dynamic AMM v2 / CP-AMM (8 operations)
- `meteora.dammV2.buy()` - Buy tokens with SOL
- `meteora.dammV2.sell()` - Sell tokens for SOL
- `meteora.dammV2.swap()` - Generic swap
- `meteora.dammV2.buy2()` - Buy with ExactIn mode (swap2)
- `meteora.dammV2.sell2()` - Sell with ExactIn mode (swap2)
- `meteora.dammV2.swap2()` - Advanced swap with mode selection (ExactIn/PartialFill/ExactOut)
- `meteora.dammV2.buyExactOut()` - Buy exact token amount
- `meteora.dammV2.sellExactOut()` - Sell for exact SOL amount

#### Meteora DLMM - Dynamic Liquidity Market Maker (6 operations)
- `meteora.dlmm.buy()` - Buy tokens with SOL
- `meteora.dlmm.sell()` - Sell tokens for SOL
- `meteora.dlmm.swap()` - Generic swap
- `meteora.dlmm.swapExactOut()` - Swap with exact output amount
- `meteora.dlmm.buyExactOut()` - Buy exact token amount
- `meteora.dlmm.sellExactOut()` - Sell for exact SOL amount

#### System Transfer (1 operation)
- `systemTransfer()` - Transfer native SOL

#### SPL Token (9 operations)
- `splTokenTransfer()` - Transfer tokens
- `splTokenTransferChecked()` - Transfer with validation
- `splTokenCreateATA()` - Create Associated Token Account
- `splTokenCloseAccount()` - Close token account
- `splTokenApprove()` - Approve delegate
- `splTokenRevoke()` - Revoke delegate
- `splTokenMintTo()` - Mint tokens
- `splTokenBurn()` - Burn tokens
- `splTokenSyncNative()` - Sync wrapped SOL

#### Raw Transaction (1 operation)
- `rawTransaction()` - Execute a pre-built `@solana/web3.js` Transaction

### Raw Transactions

The `rawTransaction()` method allows you to execute pre-built Solana transactions from `@solana/web3.js`. This is useful when you need full control over transaction construction or want to execute transactions from other libraries.

#### Key Features

- **Supports both legacy `Transaction` and `VersionedTransaction` (v0)**
- **Efficient binary transfer** - Transaction bytes sent directly via MessagePack (no base64 overhead)
- **Server-side signing** - Transaction is signed by the server using wallet management
- **All transport modes supported** - FLASH, ZERO_SLOT, JITO, VANILLA, SIMULATE, etc.

#### Basic Usage

```typescript
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';

const client = new LysFlash();

// Build your transaction using @solana/web3.js
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: new PublicKey('SenderWalletPublicKey'),
    toPubkey: new PublicKey('RecipientWalletPublicKey'),
    lamports: 1_000_000, // 0.001 SOL
  })
);

// Execute via LYS Flash
const result = await new TransactionBuilder(client)
  .rawTransaction({ transaction })
  .setFeePayer('SenderWalletPublicKey')  // Server signs with this wallet
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)                    // Required for FLASH
  .setTransport('FLASH')
  .send();

console.log('Transaction signature:', result.signature);
```

#### With Additional Signers

When your transaction requires signatures from multiple managed wallets (not just the fee payer), specify them as additional signers:

```typescript
import { Transaction, PublicKey } from '@solana/web3.js';

// Transaction that requires multiple signatures
const transaction = new Transaction().add(
  // ... instructions requiring multiple signers
);

const result = await new TransactionBuilder(client)
  .rawTransaction({
    transaction,
    additionalSigners: [
      'AdditionalSignerPublicKey1',
      'AdditionalSignerPublicKey2',
      // Or use PublicKey objects:
      new PublicKey('AnotherSignerPublicKey'),
    ],
  })
  .setFeePayer('FeePayerPublicKey')
  .setTransport('FLASH')
  .setBribe(1_000_000)
  .send();
```

**Note:** Only provide **public keys** for additional signers. The server's wallet management system looks up the corresponding secret keys to sign the transaction. Secret keys are never sent over the wire.

#### Using VersionedTransaction (v0)

For transactions using Address Lookup Tables (ALTs):

```typescript
import {
  VersionedTransaction,
  TransactionMessage,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';

// Create a versioned transaction with lookup tables
const message = new TransactionMessage({
  payerKey: new PublicKey('FeePayerPublicKey'),
  recentBlockhash: blockhash,
  instructions: [
    SystemProgram.transfer({
      fromPubkey: new PublicKey('Sender'),
      toPubkey: new PublicKey('Recipient'),
      lamports: 1_000_000,
    }),
  ],
}).compileToV0Message(addressLookupTableAccounts);

const versionedTx = new VersionedTransaction(message);

// Execute via LYS Flash
const result = await new TransactionBuilder(client)
  .rawTransaction({ transaction: versionedTx })
  .setFeePayer('FeePayerPublicKey')
  .setTransport('FLASH')
  .setBribe(1_000_000)
  .send();
```

#### Simulate Before Sending

Always simulate important transactions first:

```typescript
// Simulate first
const simulation = await new TransactionBuilder(client)
  .rawTransaction({ transaction })
  .setFeePayer('WalletPublicKey')
  .simulate();

if (simulation.success) {
  console.log('Simulation passed, executing...');

  // Execute with FLASH
  const result = await new TransactionBuilder(client)
    .rawTransaction({ transaction })
    .setFeePayer('WalletPublicKey')
    .setTransport('FLASH')
    .setBribe(1_000_000)
    .send();

  console.log('Executed:', result.signature);
} else {
  console.error('Simulation failed:', simulation.error);
  console.log('Logs:', simulation.logs);
}
```

#### Combining with Other Operations

Raw transactions can be batched with other operations:

```typescript
const result = await new TransactionBuilder(client)
  // First: execute raw transaction
  .rawTransaction({ transaction: myCustomTransaction })
  // Then: do a Pump.fun buy
  .pumpFunBuy({
    pool: 'TokenMint',
    poolAccounts: { coinCreator: 'Creator' },
    user: 'Wallet',
    solAmountIn: 1_000_000,
    tokenAmountOut: 1_000_000_000,
  })
  .setFeePayer('Wallet')
  .setTransport('FLASH')
  .setBribe(1_000_000)
  .send();

// Both operations execute atomically
```

#### Important Notes

1. **Transaction should NOT be signed** - The server handles all signing using its wallet management system
2. **Fee payer must be specified** - The server needs to know which managed wallet to use for signing
3. **Blockhash handling** - You can include a recent blockhash or leave it empty; the server may update it
4. **Transaction size limit** - Maximum ~1232 bytes (Solana's limit)
5. **Security** - Only public keys are sent for additional signers; secret keys never leave the server

### Transport Modes

| Mode | Description |
|------|-------------|
| **FLASH** ⭐ | **Multi-broadcast to 5 endpoints (recommended)** |
| ZERO_SLOT | Ultra-fast specialized endpoint |
| NOZOMI | Low-latency Temporal endpoint |
| HELIUS_SENDER | Premium reliability |
| JITO | MEV-protected transactions |
| VANILLA | Standard RPC |
| SIMULATE | Test without broadcasting |

**Recommendation:** Use `FLASH` for production trading (multi-broadcast with redundancy).

### HTTP Transport & API Keys

For remote or cloud deployments, use HTTP transport with API key authentication:

```typescript
const client = new LysFlash({
  address: 'https://api.example.com',
  apiKey: 'sk_live_your_api_key',  // Required for HTTP/HTTPS
  contentType: 'msgpack',          // 'msgpack' (default) or 'json'
  timeout: 30000,                  // Request timeout in ms
});
```

**Configuration options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `address` | `string` | `ipc:///tmp/tx-executor.ipc` | Server URL (http/https/tcp/ipc) |
| `apiKey` | `string` | - | API key for HTTP transport (required) |
| `contentType` | `'json' \| 'msgpack'` | `'msgpack'` | Request/response serialization format |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `autoReconnect` | `boolean` | `true` | Auto-reconnect on connection loss |
| `maxReconnectAttempts` | `number` | `5` | Max reconnection attempts |
| `reconnectDelay` | `number` | `1000` | Delay between reconnect attempts (ms) |
| `verbose` | `boolean` | `false` | Enable debug logging |

**API Key Format:**
- Production keys: `sk_live_*`
- Test keys: `sk_test_*`

**Content Types:**
- `msgpack` - Binary format, 2-3x smaller payloads, faster serialization (recommended)
- `json` - Text format, easier debugging

The API key is sent via the `X-API-Key` HTTP header with each request.

## Examples

### Create a Wallet

Create a new wallet with dual encryption:

```typescript
import { LysFlash } from '@lyslabs.ai/lys-flash';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';

const client = new LysFlash();

// Your keypair for encryption
const userKeypair = Keypair.generate();

// Create new wallet
const wallet = await client.createWallet(
  userKeypair.publicKey.toBase58()
);

console.log("New wallet created:", wallet.publicKey);

// Decrypt the secret key
const decryptedSecretKey = nacl.box.open(
  Buffer.from(wallet.encryptedSecretKey, 'base64'),
  Buffer.from(wallet.nonce, 'base64'),
  Buffer.from(wallet.ephemeralPublicKey, 'base64'),
  userKeypair.secretKey
);

if (decryptedSecretKey) {
  const newWalletKeypair = Keypair.fromSecretKey(
    new Uint8Array(decryptedSecretKey)
  );
  console.log("Wallet ready to use!");

  // Store encrypted wallet securely
  const walletData = {
    publicKey: wallet.publicKey,
    encryptedSecretKey: wallet.encryptedSecretKey,
    nonce: wallet.nonce,
    ephemeralPublicKey: wallet.ephemeralPublicKey,
  };
  // Save to database or encrypted storage
}
```

### Buy Tokens (Simple)

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunBuy({
    pool: "TokenMintAddress",
    poolAccounts: { coinCreator: "CreatorWallet" },
    user: "YourWallet",
    solAmountIn: 10_000_000,        // 0.01 SOL
    tokenAmountOut: 50_000_000_000  // Min 50B tokens
  })
  .setFeePayer("YourWallet")
  .setPriorityFee(5_000_000)
  .setBribe(1_000_000)             // 0.001 SOL bribe (mandatory for FLASH)
  .setTransport("FLASH")
  .send();

console.log("Bought tokens:", result.signature);
```

### Sell Tokens

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunSell({
    pool: "TokenMintAddress",
    poolAccounts: { coinCreator: "CreatorWallet" },
    user: "YourWallet",
    tokenAmountIn: 25_000_000_000,  // 25B tokens
    minSolAmountOut: 8_000_000,     // Min 0.008 SOL
    closeAssociatedTokenAccount: true  // Reclaim rent
  })
  .setFeePayer("YourWallet")
  .setPriorityFee(5_000_000)
  .setBribe(1_000_000)             // 0.001 SOL bribe (mandatory for FLASH)
  .setTransport("FLASH")
  .send();

console.log("Sold tokens:", result.signature);
```

### Create + Buy (Batched)

```typescript
import { Keypair } from '@solana/web3.js';

const mintKeypair = Keypair.generate();

const result = await new TransactionBuilder(client)
  .pumpFunCreate({
    user: "CreatorWallet",
    pool: mintKeypair.publicKey.toBase58(),
    mintSecretKey: Buffer.from(mintKeypair.secretKey).toString('base64'),
    meta: {
      name: "My Token",
      symbol: "MTK",
      uri: "https://arweave.net/metadata.json"
    }
  })
  .pumpFunBuy({
    pool: mintKeypair.publicKey.toBase58(),
    poolAccounts: { coinCreator: "CreatorWallet" },
    user: "BuyerWallet",
    solAmountIn: 10_000_000,
    tokenAmountOut: 100_000_000_000
  })
  .setFeePayer("CreatorWallet")
  .setPriorityFee(10_000_000)
  .setBribe(1_000_000)             // 0.001 SOL bribe (mandatory for FLASH)
  .setTransport("FLASH")
  .send();

console.log("Created and bought:", result.signature);
```

### Simulate Before Sending

```typescript
// Always simulate first for important transactions
const simulation = await new TransactionBuilder(client)
  .pumpFunBuy({ /* params */ })
  .setFeePayer("wallet")
  .simulate();

if (simulation.success) {
  console.log("Simulation passed, executing...");

  // Then execute with FLASH
  const result = await new TransactionBuilder(client)
    .pumpFunBuy({ /* same params */ })
    .setFeePayer("wallet")
    .setBribe(1_000_000)           // 0.001 SOL bribe (mandatory for FLASH)
    .setTransport("FLASH")
    .send();

  console.log("Executed:", result.signature);
} else {
  console.error("Simulation failed:", simulation.error);
  console.log("Logs:", simulation.logs);
}
```

### Meteora DBC (Dynamic Bonding Curve)

```typescript
import { Connection } from '@solana/web3.js';
import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';

// Connection is required for Meteora operations
const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = new LysFlash({
  address: 'ipc:///tmp/tx-executor.ipc',
  connection,
});

// Buy tokens on DBC pool
const result = await new TransactionBuilder(client)
  .meteora.dbc.buy({
    pool: "PoolAddress",
    user: "YourWallet",
    solAmountIn: 1_000_000_000,    // 1 SOL
    minTokensOut: 1000000,         // Min tokens
  })
  .setFeePayer("YourWallet")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();

console.log("Bought tokens:", result.signature);

// Sell tokens on DBC pool
const sellResult = await new TransactionBuilder(client)
  .meteora.dbc.sell({
    pool: "PoolAddress",
    user: "YourWallet",
    tokenAmountIn: 1000000,        // Tokens to sell
    minSolOut: 500_000_000,        // Min 0.5 SOL
  })
  .setFeePayer("YourWallet")
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();

// Buy exact amount of tokens (ExactOut mode)
const exactOutResult = await new TransactionBuilder(client)
  .meteora.dbc.buyExactOut({
    pool: "PoolAddress",
    user: "YourWallet",
    amountOut: 1000000,            // Exact tokens desired
    maximumAmountIn: 2_000_000_000, // Max SOL to pay
  })
  .setFeePayer("YourWallet")
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();
```

### Meteora DAMM v2 (CP-AMM)

```typescript
// Buy tokens on DAMM v2 pool
const result = await new TransactionBuilder(client)
  .meteora.dammV2.buy({
    pool: "PoolAddress",
    user: "YourWallet",
    tokenMint: "TokenMintAddress",
    solAmountIn: 1_000_000_000,    // 1 SOL
    minTokensOut: 1000000,         // Min tokens
  })
  .setFeePayer("YourWallet")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();

// Sell tokens on DAMM v2 pool
const sellResult = await new TransactionBuilder(client)
  .meteora.dammV2.sell({
    pool: "PoolAddress",
    user: "YourWallet",
    tokenMint: "TokenMintAddress",
    tokenAmountIn: 1000000,        // Tokens to sell
    minSolOut: 500_000_000,        // Min 0.5 SOL
  })
  .setFeePayer("YourWallet")
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();

// Advanced swap with ExactOut mode
const exactOutResult = await new TransactionBuilder(client)
  .meteora.dammV2.swap2({
    pool: "PoolAddress",
    user: "YourWallet",
    inputMint: "So11111111111111111111111111111111111111112", // SOL
    outputMint: "TokenMintAddress",
    mode: "ExactOut",
    amountOut: 1000000,            // Exact tokens desired
    maximumAmountIn: 2_000_000_000, // Max SOL to pay
  })
  .setFeePayer("YourWallet")
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();
```

### Meteora DLMM (Dynamic Liquidity Market Maker)

```typescript
// Buy tokens on DLMM pool
const result = await new TransactionBuilder(client)
  .meteora.dlmm.buy({
    pool: "PoolAddress",
    user: "YourWallet",
    tokenMint: "TokenMintAddress",
    solAmountIn: 1_000_000_000,    // 1 SOL
    minTokensOut: 1000000,         // Min tokens
  })
  .setFeePayer("YourWallet")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();

// Sell tokens on DLMM pool
const sellResult = await new TransactionBuilder(client)
  .meteora.dlmm.sell({
    pool: "PoolAddress",
    user: "YourWallet",
    tokenMint: "TokenMintAddress",
    tokenAmountIn: 1000000,        // Tokens to sell
    minSolOut: 500_000_000,        // Min 0.5 SOL
  })
  .setFeePayer("YourWallet")
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();

// Generic swap with explicit mints
const swapResult = await new TransactionBuilder(client)
  .meteora.dlmm.swap({
    pool: "PoolAddress",
    user: "YourWallet",
    inputMint: "So11111111111111111111111111111111111111112",
    outputMint: "TokenMintAddress",
    amountIn: 1_000_000_000,
    minimumAmountOut: 1000000,
  })
  .setFeePayer("YourWallet")
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();
```

### Meteora DAMM v1 (Dynamic AMM)

```typescript
// Buy tokens on DAMM v1 pool
const result = await new TransactionBuilder(client)
  .meteora.dammV1.buy({
    pool: "PoolAddress",
    user: "YourWallet",
    tokenMint: "TokenMintAddress",
    solAmountIn: 1_000_000_000,    // 1 SOL
    minTokensOut: 1000000,         // Min tokens
  })
  .setFeePayer("YourWallet")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();

// Sell tokens on DAMM v1 pool
const sellResult = await new TransactionBuilder(client)
  .meteora.dammV1.sell({
    pool: "PoolAddress",
    user: "YourWallet",
    tokenMint: "TokenMintAddress",
    tokenAmountIn: 1000000,        // Tokens to sell
    minSolOut: 500_000_000,        // Min 0.5 SOL
  })
  .setFeePayer("YourWallet")
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();
```

### Multiple Operations (Batched)

```typescript
const result = await new TransactionBuilder(client)
  .systemTransfer({
    sender: "wallet1",
    recipient: "wallet2",
    lamports: 10_000_000
  })
  .splTokenTransfer({
    mint: "TokenMint",
    sourceOwner: "wallet1",
    destinationOwner: "wallet2",
    amount: 1_000_000
  })
  .pumpFunBuy({
    pool: "AnotherMint",
    poolAccounts: { coinCreator: "creator" },
    user: "wallet1",
    solAmountIn: 5_000_000,
    tokenAmountOut: 10_000_000_000
  })
  .setFeePayer("wallet1")
  .setPriorityFee(2_000_000)
  .setTransport("VANILLA")
  .send();

console.log("Batch executed:", result.signature);
// All 3 operations executed atomically
```

### Error Handling

```typescript
import { ExecutionError, ErrorCode } from '@lyslabs.ai/lys-flash';

try {
  const result = await new TransactionBuilder(client)
    .pumpFunBuy({ /* params */ })
    .setBribe(1_000_000)           // 0.001 SOL bribe (mandatory for FLASH)
    .setTransport("FLASH")
    .send();

  console.log("Success:", result.signature);
} catch (error) {
  if (error instanceof ExecutionError) {
    switch (error.code) {
      case ErrorCode.NETWORK_ERROR:
        console.error("Network error, retrying...");
        // Implement retry logic
        break;

      case ErrorCode.TIMEOUT:
        console.error("Request timeout");
        break;

      case ErrorCode.NONCE_POOL_EXHAUSTED:
        console.error("Nonce pool exhausted, wait and retry");
        break;

      case ErrorCode.EXECUTION_FAILED:
        console.error("Transaction failed:", error.message);
        break;

      default:
        console.error("Unexpected error:", error.message);
    }

    // Get user-friendly message
    console.log(error.getUserMessage());

    // Check if retryable
    if (error.isRetryable()) {
      console.log("This error is retryable");
    }
  } else {
    console.error("Unknown error:", error);
  }
}
```

## Advanced Usage

### Custom Configuration

```typescript
// ZMQ Transport (local deployment)
const zmqClient = new LysFlash({
  address: "tcp://127.0.0.1:5555",  // TCP socket
  timeout: 60000,                    // 60 seconds
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectDelay: 2000,              // 2 seconds
  verbose: true,                     // Debug logging
  logger: customLogger               // Custom logger
});

// HTTP Transport (remote/cloud deployment)
const httpClient = new LysFlash({
  address: "https://api.lyslabs.ai",
  apiKey: process.env.LYS_API_KEY!,  // From environment variable
  contentType: "msgpack",             // Binary format (faster)
  timeout: 30000,
  autoReconnect: true,
  verbose: false,
});
```

### Trading Bot Example

```typescript
import {
  LysFlash,
  TransactionBuilder,
  ExecutionError,
  ErrorCode
} from '@lyslabs.ai/lys-flash';

class TradingBot {
  private client: LysFlash;

  constructor() {
    this.client = new LysFlash({
      timeout: 30000,
      autoReconnect: true
    });
  }

  async buyToken(
    mint: string,
    creator: string,
    wallet: string,
    solAmount: number,
    minTokens: number
  ) {
    // Simulate first
    const sim = await new TransactionBuilder(this.client)
      .pumpFunBuy({
        pool: mint,
        poolAccounts: { coinCreator: creator },
        user: wallet,
        solAmountIn: solAmount,
        tokenAmountOut: minTokens
      })
      .setFeePayer(wallet)
      .setPriorityFee(1_000_000)
      .setTransport("SIMULATE")
      .send();

    if (!sim.success) {
      throw new Error(`Simulation failed: ${sim.error}`);
    }

    // Execute with FLASH
    const result = await new TransactionBuilder(this.client)
      .pumpFunBuy({
        pool: mint,
        poolAccounts: { coinCreator: creator },
        user: wallet,
        solAmountIn: solAmount,
        tokenAmountOut: minTokens
      })
      .setFeePayer(wallet)
      .setPriorityFee(5_000_000)      // High priority
      .setBribe(1_000_000)             // MEV protection
      .setTransport("FLASH")
      .send();

    console.log(`Bought ${mint}`);
    return result;
  }

  async sellToken(
    mint: string,
    creator: string,
    wallet: string,
    tokenAmount: number,
    minSol: number
  ) {
    const result = await new TransactionBuilder(this.client)
      .pumpFunSell({
        pool: mint,
        poolAccounts: { coinCreator: creator },
        user: wallet,
        tokenAmountIn: tokenAmount,
        minSolAmountOut: minSol,
        closeAssociatedTokenAccount: true
      })
      .setFeePayer(wallet)
      .setPriorityFee(5_000_000)
      .setBribe(1_000_000)             // 0.001 SOL bribe (mandatory for FLASH)
      .setTransport("FLASH")
      .send();

    console.log(`Sold ${mint}`);
    return result;
  }

  shutdown() {
    this.client.close();
  }
}

// Usage
const bot = new TradingBot();
await bot.buyToken(
  "TokenMint",
  "CreatorWallet",
  "BuyerWallet",
  10_000_000,        // 0.01 SOL
  50_000_000_000     // Min 50B tokens
);
```

### Performance Tips

1. **Reuse client instance** - Don't create new client for each transaction
2. **Use FLASH transport** - Multi-broadcast for redundancy
3. **Simulate important transactions** - Validate before sending
4. **Batch operations** - Multiple operations in single transaction
5. **Set appropriate priority fees** - Higher fees = faster landing
6. **Monitor statistics** - Track success rate and performance

## API Documentation

For complete API documentation with all types and methods, see:
- [Wallet Management Guide](./WALLET_MANAGEMENT.md)
- [Security Policy](./SECURITY.md)
- [Contributing Guide](./CONTRIBUTING.md)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT © LYS Labs

See [LICENSE](./LICENSE) for more information.

## Support

- [GitHub Issues](https://github.com/lyslabs-ai/lys-flash/issues)
- [Discussions](https://github.com/lyslabs-ai/lys-flash/discussions)
- Email: hello@lyslabs.ai

## Acknowledgments

Built with the LYS Flash Solana Execution Engine - High-performance transaction execution system for Solana.
