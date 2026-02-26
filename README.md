# @lyslabs.ai/lys-flash

> High-performance TypeScript client for the LYS Solana Execution Engine — ultra-low latency transaction execution for trading bots.

[![npm version](https://img.shields.io/npm/v/@lyslabs.ai/lys-flash.svg)](https://www.npmjs.com/package/@lyslabs.ai/lys-flash)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## Features

- **🚀 Multi-Broadcast**: Multi-broadcast strategy for fast, reliable confirmations
- **📦 50+ Operations**: Pump.fun, Meteora (DBC, DAMM v1/v2, DLMM), Raydium (LaunchPad, CLMM, CPMM, AMMv4), SPL Token, System Transfer
- **🔐 Secure Wallet Creation**: Dual-encrypted wallet generation with user-side decryption
- **🔧 Type-Safe**: Full TypeScript support with comprehensive types
- **⚡ High Performance**: MessagePack over ZeroMQ for efficient communication
- **🎯 Builder Pattern**: Fluent API for easy transaction composition
- **🔄 Auto-Reconnect**: Automatic connection recovery
- **📊 Statistics**: Built-in performance tracking
- **🛡️ MEV Protection**: Jito integration for high-value transactions

## Table of Contents

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Connection Modes](#connection-modes)
- [API Keys & Authentication](#api-keys--authentication)
- [Usage](#usage)
  - [Builder API](#builder-api)
  - [Client API](#client-api)
  - [Supported Operations](#supported-operations)
  - [Raw Transactions](#raw-transactions)
  - [Transport Modes](#transport-modes)
- [Wallet Management](#wallet-management)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)
- [Detailed Documentation](#detailed-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```bash
npm install @lyslabs.ai/lys-flash @solana/web3.js
```

### RPC Connection (Required for Meteora & Raydium)

Meteora and Raydium integrations **require** a Solana RPC connection — these DEXs build transactions client-side using their SDKs, which need RPC access to fetch pool data.

| Feature | RPC Required | Reason |
|---------|--------------|--------|
| Pump.fun | No | Server-side transaction building |
| Pump.fun AMM | No | Server-side transaction building |
| SPL Token | No | Server-side transaction building |
| System Transfer | No | Server-side transaction building |
| **Meteora** | **Yes** | Client-side SDK fetches pool data |
| **Raydium** | **Yes** | Client-side SDK fetches pool data |

```typescript
import { Connection } from '@solana/web3.js';
import { LysFlash } from '@lyslabs.ai/lys-flash';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = LysFlash.external({
  address: 'http://execution.lyslabs-stage.xyz:3001',
  apiKey: process.env.LYS_API_KEY!,
  connection,  // Required for Meteora/Raydium
});
```

### Optional Peer Dependencies

Install the SDK packages for the DEX products you need:

```bash
# Meteora
npm install @meteora-ag/dynamic-bonding-curve-sdk  # DBC
npm install @meteora-ag/dynamic-amm-sdk            # DAMM v1
npm install @meteora-ag/cp-amm-sdk                 # DAMM v2
npm install @meteora-ag/dlmm                       # DLMM

# Raydium
npm install @raydium-io/raydium-sdk-v2             # All Raydium products
```

---

## Getting Started

### Step 1: Get an API Key

Generate your API key at **[https://dev.lyslabs.ai/api-keys](https://dev.lyslabs.ai/api-keys)**.

Store it as an environment variable:

```bash
export LYS_API_KEY=sk_live_your_key_here
```

### Step 2: Connect to the Execution Engine

The execution engine endpoint is `http://execution.lyslabs-stage.xyz:3001`.

API keys from the portal are **external keys** — they require Ed25519 request signing. Use `LysFlash.external()`:

```typescript
import { LysFlash, TransactionBuilder, Signer } from '@lyslabs.ai/lys-flash';
import { Keypair } from '@solana/web3.js';

const client = LysFlash.external({
  address: 'http://execution.lyslabs-stage.xyz:3001',
  apiKey: process.env.LYS_API_KEY!,
});

// Create a signer from your keypair (public key must be registered with the key on the portal)
const signer = new Signer(Keypair.fromSecretKey(yourSecretKey));
```

### Step 3: Execute a Transaction

```typescript
const result = await new TransactionBuilder(client, signer)
  .pumpFunBuy({
    pool: "TokenMintAddress",
    poolAccounts: { coinCreator: "CreatorWallet" },
    user: "YourWallet",
    solAmountIn: 10_000_000,        // 0.01 SOL
    tokenAmountOut: 50_000_000_000, // Minimum tokens expected
    mayhemModeEnabled: false,
  })
  .setFeePayer("YourWallet")
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)              // Required for FLASH transport
  .setTransport("FLASH")
  .send();

console.log("Transaction signature:", result.signature);
client.close();
```

---

## Connection Modes

The client auto-detects the transport based on the URL scheme:

| URL Scheme | Transport | API Key | Use Case |
|------------|-----------|---------|----------|
| `ipc://` | ZeroMQ IPC | Not required | Local deployment (fastest) |
| `tcp://` | ZeroMQ TCP | Not required | Local network deployment |
| `http://` or `https://` | HTTP | **Required** | Remote/cloud deployment |

```typescript
// Local deployment via ZeroMQ IPC (no API key needed)
const client = new LysFlash();
// or explicitly:
const client = new LysFlash({ address: 'ipc:///tmp/tx-executor.ipc' });

// Local network via ZeroMQ TCP
const client = new LysFlash({ address: 'tcp://127.0.0.1:5555' });

// Remote/cloud via HTTP (API key required)
const client = LysFlash.external({
  address: 'http://execution.lyslabs-stage.xyz:3001',
  apiKey: process.env.LYS_API_KEY!,
});
```

---

## API Keys & Authentication

### Portal Keys (External)

All keys generated at [https://dev.lyslabs.ai/api-keys](https://dev.lyslabs.ai/api-keys) are **external keys**. They require Ed25519 request signing on every HTTP request.

Use `LysFlash.external()` and pass a `Signer` to each `TransactionBuilder`:

```typescript
import { Keypair } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, Signer } from '@lyslabs.ai/lys-flash';

const client = LysFlash.external({
  address: 'http://execution.lyslabs-stage.xyz:3001',
  apiKey: process.env.LYS_API_KEY!,
  contentType: 'msgpack',  // optional, default: 'msgpack'
});

const signer = new Signer(Keypair.fromSecretKey(mySecretKey));

await new TransactionBuilder(client, signer)
  .pumpFunBuy({ /* ... */ })
  .setFeePayer('wallet')
  .send();

// Different builders can use different signers (multi-wallet support)
const signerB = new Signer(Keypair.fromSecretKey(otherSecretKey));
await new TransactionBuilder(client, signerB)
  .pumpFunSell({ /* ... */ })
  .setFeePayer('other_wallet')
  .send();
```

Each `Signer` wraps a `Keypair` and automatically signs every HTTP request. The keypair's public key must be registered with your API key on the developer portal. If you forget to pass a signer, `send()` will throw an error.

### Internal Keys (Backend-to-Backend)

Internal keys are for trusted server-to-server environments where request signing is not required. Use `LysFlash.internal()`:

```typescript
const client = LysFlash.internal({
  address: 'http://execution.lyslabs-stage.xyz:3001',
  apiKey: 'sk_live_internal_key',
});
```

> Internal keys are not issued from the developer portal. They are for backend deployments where the caller is trusted.

### Signature Protocol

Each signed request includes three headers:

| Header | Value |
|--------|-------|
| `X-API-Key` | Your API key string |
| `X-Timestamp` | `Date.now()` in milliseconds (string) |
| `X-Signature` | Base58-encoded Ed25519 detached signature |

The signed message is: `timestamp_as_u64_big_endian (8 bytes) + serialized_request_body`.

The server validates the timestamp is within a 60-second window and the signature matches the public key registered with the API key.

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `address` | `string` | `ipc:///tmp/tx-executor.ipc` | Server URL (`http/https/tcp/ipc`) |
| `apiKey` | `string` | — | API key for HTTP transport (required) |
| `contentType` | `'json' \| 'msgpack'` | `'msgpack'` | Request serialization format |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `autoReconnect` | `boolean` | `true` | Auto-reconnect on connection loss |
| `maxReconnectAttempts` | `number` | `5` | Max reconnection attempts |
| `reconnectDelay` | `number` | `1000` | Delay between reconnects (ms) |
| `verbose` | `boolean` | `false` | Enable debug logging |
| `connection` | `Connection` | — | Solana RPC connection (required for Meteora/Raydium) |

---

## Usage

### Builder API

The `TransactionBuilder` is the **recommended** API — fluent, type-safe, and easy to compose.

#### Basic Example (Pump.fun)

```typescript
import { LysFlash, TransactionBuilder, Signer } from '@lyslabs.ai/lys-flash';
import { Keypair } from '@solana/web3.js';

const client = LysFlash.external({
  address: 'http://execution.lyslabs-stage.xyz:3001',
  apiKey: process.env.LYS_API_KEY!,
});
const signer = new Signer(Keypair.fromSecretKey(yourSecretKey));

// Buy tokens
const result = await new TransactionBuilder(client, signer)
  .pumpFunBuy({
    pool: "TokenMintAddress",
    poolAccounts: { coinCreator: "CreatorWallet" },  // optional but speeds up execution
    user: "YourWallet",
    solAmountIn: 10_000_000,        // 0.01 SOL in lamports
    tokenAmountOut: 50_000_000_000, // minimum tokens expected
    mayhemModeEnabled: false,
  })
  .setFeePayer("YourWallet")
  .setPriorityFee(5_000_000)
  .setBribe(1_000_000)              // required for all MEV-protected transports
  .setTransport("FLASH")
  .send();

console.log("Signature:", result.signature);
```

#### Batched Operations

Chain multiple operations in a single atomic transaction:

```typescript
import { Keypair } from '@solana/web3.js';

const mintKeypair = Keypair.generate();

const result = await new TransactionBuilder(client, signer)
  .pumpFunCreate({
    user: "CreatorWallet",
    pool: mintKeypair.publicKey.toBase58(),
    mintSecretKey: Buffer.from(mintKeypair.secretKey).toString('base64'),
    meta: { name: "My Token", symbol: "MTK", uri: "https://arweave.net/metadata.json" },
  })
  .pumpFunBuy({
    pool: mintKeypair.publicKey.toBase58(),
    poolAccounts: { coinCreator: "CreatorWallet" },
    user: "CreatorWallet",
    solAmountIn: 10_000_000,
    tokenAmountOut: 100_000_000_000,
    mayhemModeEnabled: false,
  })
  .setFeePayer("CreatorWallet")
  .setPriorityFee(10_000_000)
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();
```

#### Meteora Operations

Meteora operations are accessed via the `.meteora` namespace (requires a `Connection` in the client config):

```typescript
// DBC (Dynamic Bonding Curve)
await new TransactionBuilder(client, signer).meteora.dbc.buy({ pool, user, solAmountIn, minTokensOut });

// DAMM v1 (Dynamic AMM)
await new TransactionBuilder(client, signer).meteora.dammV1.buy({ pool, user, tokenMint, solAmountIn, minTokensOut });

// DAMM v2 (CP-AMM)
await new TransactionBuilder(client, signer).meteora.dammV2.buy({ pool, user, tokenMint, solAmountIn, minTokensOut });

// DLMM (Dynamic Liquidity Market Maker)
await new TransactionBuilder(client, signer).meteora.dlmm.buy({ pool, user, tokenMint, solAmountIn, minTokensOut });
```

See [docs/METEORA_DBC.md](./docs/METEORA_DBC.md) and related guides for full parameter reference.

#### Raydium Operations

Raydium operations are accessed via the `.raydium` namespace (requires a `Connection` in the client config):

```typescript
// LaunchPad
await new TransactionBuilder(client, signer).raydium.launchpad.buy({ /* ... */ });

// CLMM (Concentrated Liquidity)
await new TransactionBuilder(client, signer).raydium.clmm.buy({ /* ... */ });

// CPMM (Constant Product)
await new TransactionBuilder(client, signer).raydium.cpmm.buy({ /* ... */ });

// AMMv4
await new TransactionBuilder(client, signer).raydium.ammv4.buy({ /* ... */ });
```

See [docs/RAYDIUM_CLMM.md](./docs/RAYDIUM_CLMM.md) and related guides for full parameter reference.

#### Simulate Before Sending

```typescript
const simulation = await new TransactionBuilder(client, signer)
  .pumpFunBuy({ /* params */ })
  .setFeePayer("wallet")
  .simulate();  // uses SIMULATE transport automatically

if (!simulation.success) {
  console.error("Simulation failed:", simulation.error);
  return;
}

// Then execute
const result = await new TransactionBuilder(client, signer)
  .pumpFunBuy({ /* same params */ })
  .setFeePayer("wallet")
  .setBribe(1_000_000)
  .setTransport("FLASH")
  .send();
```

---

### Client API

The `client.execute()` method provides direct, low-level access for maximum control:

```typescript
const result = await client.execute({
  data: {
    executionType: "PUMP_FUN",
    eventType: "BUY",
    pool: "TokenMintAddress",
    poolAccounts: { coinCreator: "CreatorWallet" },
    user: "YourWallet",
    solAmountIn: 10_000_000,
    tokenAmountOut: 50_000_000_000,
    mayhemModeEnabled: false,
  },
  feePayer: "YourWallet",
  priorityFeeLamports: 1_000_000,
  bribeLamports: 1_000_000,
  transport: "FLASH",
});
```

For full raw API documentation see [docs/RAW_API.md](./docs/RAW_API.md).

---

### Supported Operations

#### Pump.fun (4 operations)
- `pumpFunBuy()` — Buy tokens on bonding curve
- `pumpFunSell()` — Sell tokens on bonding curve
- `pumpFunCreate()` — Create new token
- `pumpFunMigrate()` — Migrate to Pump.fun AMM

#### Pump.fun AMM (3 operations)
- `pumpFunAmmBuy()` — Buy on AMM (max quote in, expected base out)
- `pumpFunAmmBuyExactQuoteIn()` — Buy with exact SOL amount
- `pumpFunAmmSell()` — Sell on AMM

#### Meteora DBC — Dynamic Bonding Curve (8 operations)
- `meteora.dbc.buy()` / `sell()` / `swap()`
- `meteora.dbc.buy2()` / `sell2()` / `swap2()` — ExactIn / PartialFill / ExactOut modes
- `meteora.dbc.buyExactOut()` / `sellExactOut()`

#### Meteora DAMM v1 — Dynamic AMM (3 operations)
- `meteora.dammV1.buy()` / `sell()` / `swap()`

#### Meteora DAMM v2 — CP-AMM (8 operations)
- `meteora.dammV2.buy()` / `sell()` / `swap()`
- `meteora.dammV2.buy2()` / `sell2()` / `swap2()`
- `meteora.dammV2.buyExactOut()` / `sellExactOut()`

#### Meteora DLMM — Dynamic Liquidity Market Maker (6 operations)
- `meteora.dlmm.buy()` / `sell()` / `swap()`
- `meteora.dlmm.swapExactOut()` / `buyExactOut()` / `sellExactOut()`

#### Raydium LaunchPad
- `raydium.launchpad.buy()` / `sell()`

#### Raydium CLMM — Concentrated Liquidity (3+ operations)
- `raydium.clmm.buy()` / `sell()` / `swap()`

#### Raydium CPMM — Constant Product (3+ operations)
- `raydium.cpmm.buy()` / `sell()` / `swap()`

#### Raydium AMMv4 (3+ operations)
- `raydium.ammv4.buy()` / `sell()` / `swap()`

#### System Transfer (1 operation)
- `systemTransfer()` — Transfer native SOL

#### SPL Token (9 operations)
- `splTokenTransfer()` / `splTokenTransferChecked()`
- `splTokenCreateATA()` / `splTokenCloseAccount()`
- `splTokenApprove()` / `splTokenRevoke()`
- `splTokenMintTo()` / `splTokenBurn()` / `splTokenSyncNative()`

#### Raw Transaction (1 operation)
- `rawTransaction()` — Execute a pre-built `@solana/web3.js` Transaction

---

### Raw Transactions

Execute pre-built `@solana/web3.js` transactions directly — useful when you need full control over transaction construction or want to integrate with other libraries.

```typescript
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: new PublicKey('SenderWallet'),
    toPubkey: new PublicKey('RecipientWallet'),
    lamports: 1_000_000,
  })
);

const result = await new TransactionBuilder(client, signer)
  .rawTransaction({ transaction })
  .setFeePayer('SenderWallet')
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport('FLASH')
  .send();
```

For multi-signer transactions:

```typescript
const result = await new TransactionBuilder(client, signer)
  .rawTransaction({
    transaction,
    additionalSigners: ['AdditionalSignerPublicKey1', 'AdditionalSignerPublicKey2'],
  })
  .setFeePayer('FeePayerPublicKey')
  .setTransport('FLASH')
  .setBribe(1_000_000)
  .send();
```

Supports both legacy `Transaction` and `VersionedTransaction` (v0 with address lookup tables). The server handles all signing — never send secret keys over the wire.

---

### Transport Modes

| Mode | Description | MEV Protection | Bribe Required |
|------|-------------|----------------|----------------|
| **FLASH** ⭐ | Multi-broadcast to 6 endpoints (recommended) | Yes | **Yes** (min 1,000,000) |
| ZERO_SLOT | Ultra-fast specialized endpoint | Yes | **Yes** (min 1,000,000) |
| LUNAR_LANDER | HelloMoon low-latency endpoint | Yes | **Yes** (min 1,000,000) |
| NOZOMI | Low-latency Temporal endpoint | Yes | **Yes** (min 1,000,000) |
| HELIUS_SENDER | Premium reliability | Yes | **Yes** (min 1,000,000) |
| JITO | MEV-protected via Jito | Yes | **Yes** (min 1,000,000) |
| VANILLA | Standard RPC | No | No |
| SIMULATE | Test without broadcasting | No | No |

All transports except `VANILLA` and `SIMULATE` require a minimum bribe of **1,000,000 lamports (0.001 SOL)**. Use `FLASH` for production trading.

---

## Wallet Management

The client provides **dual-encrypted wallet creation**:

1. **Server-side (AES-256-GCM)**: Secret key encrypted with the server's master secret
2. **Client-side (TweetNaCl box)**: Additional encryption with your Ed25519 public key — only you can decrypt

### Creating a Wallet

```typescript
import { LysFlash } from '@lyslabs.ai/lys-flash';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';

const client = new LysFlash();
const userKeypair = Keypair.generate(); // your encryption keypair

const wallet = await client.createWallet(userKeypair.publicKey.toBase58());
console.log("New wallet:", wallet.publicKey);
```

Response format:
```typescript
{
  success: true,
  publicKey: string,           // new wallet address
  encryptedSecretKey: string,  // base64, encrypted with your public key
  nonce: string,               // base64
  ephemeralPublicKey: string   // base64, needed for decryption
}
```

### Decrypting a Wallet

```typescript
import { decryptWallet } from '@lyslabs.ai/lys-flash';

// Handles Ed25519 → Curve25519 conversion internally
const walletKeypair = decryptWallet(wallet, userKeypair);
console.log("Ready:", walletKeypair.publicKey.toBase58());
```

Security guarantees: the server never stores plaintext secret keys; only you can decrypt with your private key. See [docs/WALLET_MANAGEMENT.md](./docs/WALLET_MANAGEMENT.md) for storage best practices and security checklist.

---

## Error Handling

```typescript
import { ExecutionError, ErrorCode } from '@lyslabs.ai/lys-flash';

try {
  const result = await new TransactionBuilder(client, signer)
    .pumpFunBuy({ /* ... */ })
    .setFeePayer("wallet")
    .setBribe(1_000_000)
    .setTransport("FLASH")
    .send();

  if (result.success) {
    console.log("Signature:", result.signature);
    console.log("Slot:", result.slot);
    console.log("Latency:", result.latency, "ms");
  } else {
    console.error("Failed:", result.error);
    console.log("Logs:", result.logs);
  }
} catch (error) {
  if (error instanceof ExecutionError) {
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
        console.log(error.getUserMessage());
    }
    if (error.isRetryable()) console.log("This error can be retried");
  }
}
```

---

## Advanced Usage

### Trading Bot Example

```typescript
import { LysFlash, TransactionBuilder, Signer, ExecutionError, ErrorCode } from '@lyslabs.ai/lys-flash';
import { Keypair } from '@solana/web3.js';

class TradingBot {
  private client: LysFlash;
  private signer: Signer;

  constructor() {
    this.client = LysFlash.external({
      address: 'http://execution.lyslabs-stage.xyz:3001',
      apiKey: process.env.LYS_API_KEY!,
      timeout: 30000,
      autoReconnect: true,
    });
    this.signer = new Signer(Keypair.fromSecretKey(
      Buffer.from(process.env.SIGNING_KEY!, 'base64')
    ));
  }

  async buyToken(mint: string, creator: string, wallet: string, solAmount: number, minTokens: number) {
    const params = {
      pool: mint,
      poolAccounts: { coinCreator: creator },
      user: wallet,
      solAmountIn: solAmount,
      tokenAmountOut: minTokens,
      mayhemModeEnabled: false,
    };

    // Simulate first
    const sim = await new TransactionBuilder(this.client, this.signer)
      .pumpFunBuy(params)
      .setFeePayer(wallet)
      .simulate();

    if (!sim.success) throw new Error(`Simulation failed: ${sim.error}`);

    // Execute with FLASH
    return new TransactionBuilder(this.client, this.signer)
      .pumpFunBuy(params)
      .setFeePayer(wallet)
      .setPriorityFee(5_000_000)
      .setBribe(1_000_000)
      .setTransport("FLASH")
      .send();
  }

  shutdown() {
    this.client.close();
  }
}
```

### Performance Tips

1. **Reuse the client instance** — never create a new `LysFlash` per transaction
2. **Use FLASH transport** — multi-broadcast for redundancy and speed
3. **Simulate before production** — catch failures before spending gas
4. **Batch related operations** — multiple operations in one atomic transaction
5. **Set appropriate priority fees** — higher fees land faster
6. **Provide pool accounts** — supplying `coinCreator`/`poolCreator` avoids RPC lookups
7. **Monitor statistics** — use `client.getStats()` to track success rate and latency

```typescript
const stats = client.getStats();
console.log(`Success rate: ${(stats.requestsSuccessful / stats.requestsSent * 100).toFixed(2)}%`);
console.log(`Average latency: ${stats.averageLatency.toFixed(2)}ms`);
```

---

## Detailed Documentation

### API Guides
- **[Transaction Builder Guide](./docs/TRANSACTION_BUILDER.md)** — Complete `TransactionBuilder` API reference (recommended)
- **[Raw API Guide](./docs/RAW_API.md)** — Complete `client.execute()` reference for low-level control
- **[Wallet Management](./docs/WALLET_MANAGEMENT.md)** — Wallet creation, encryption, and security best practices

### Protocol Integration Guides

#### Pump.fun
- **[Pump.fun Bonding Curve](./docs/PUMPFUN.md)** — buy, sell, create, migrate
- **[Pump.fun AMM](./docs/PUMPFUN_AMM.md)** — post-graduation AMM trading

#### Meteora
- **[Meteora DBC](./docs/METEORA_DBC.md)** — Dynamic Bonding Curve
- **[Meteora DAMM v1](./docs/METEORA_DAMM_V1.md)** — Dynamic AMM v1
- **[Meteora DAMM v2](./docs/METEORA_DAMM_V2.md)** — Dynamic AMM v2 / CP-AMM
- **[Meteora DLMM](./docs/METEORA_DLMM.md)** — Dynamic Liquidity Market Maker

#### Raydium
- **[Raydium LaunchPad](./docs/RAYDIUM_LAUNCHPAD.md)** — LaunchPad token launches
- **[Raydium CLMM](./docs/RAYDIUM_CLMM.md)** — Concentrated Liquidity Market Maker
- **[Raydium CPMM](./docs/RAYDIUM_CPMM.md)** — Constant Product Market Maker
- **[Raydium AMMv4](./docs/RAYDIUM_AMMV4.md)** — AMM v4 pools

### Examples

Working code examples in `examples/`:

| File | Description |
|------|-------------|
| `basic-usage.ts` | Simple buy/sell with error handling |
| `transaction-builder-usage.ts` | Builder API patterns |
| `raw-api-usage.ts` | Direct `client.execute()` API |
| `raw-transaction-usage.ts` | Pre-built transaction execution |
| `wallet-management.ts` | Wallet creation and decryption |
| `meteora-dbc-usage.ts` | Meteora DBC operations |
| `meteora-damm-v1-usage.ts` | Meteora DAMM v1 operations |
| `meteora-damm-v2-usage.ts` | Meteora DAMM v2 operations |
| `meteora-dlmm-usage.ts` | Meteora DLMM operations |
| `raydium-launchpad-usage.ts` | Raydium LaunchPad operations |
| `raydium-clmm-usage.ts` | Raydium CLMM operations |
| `raydium-cpmm-usage.ts` | Raydium CPMM operations |
| `raydium-ammv4-usage.ts` | Raydium AMMv4 operations |

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT © LYS Labs

See [LICENSE](./LICENSE) for more information.

## Support

- [GitHub Issues](https://github.com/lyslabs-ai/lys-flash/issues)
- Email: hello@lyslabs.ai
