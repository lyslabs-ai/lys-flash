# Pump.fun Bonding Curve Integration

Integration guide for trading on Pump.fun bonding curve using LYS Flash.

## Overview

Pump.fun uses a bonding curve mechanism for token launches. Tokens start on the bonding curve and graduate to AMM after reaching a market cap threshold. This guide covers bonding curve operations only - for post-graduation trading, see [Pump.fun AMM](./PUMPFUN_AMM.md).

## Quick Start

```typescript
import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';

// 1. Create client
const client = new LysFlash();

// 2. Buy tokens on bonding curve
const result = await new TransactionBuilder(client)
  .pumpFunBuy({
    pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    poolAccounts: {
      coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
    },
    user: 'YOUR_WALLET',
    solAmountIn: 1_000_000_000, // 1 SOL
    tokenAmountOut: 34_000_000_000, // Min tokens expected
    mayhemModeEnabled: false,
  })
  .setFeePayer('YOUR_WALLET')
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport('FLASH')
  .send();

console.log('Signature:', result.signature);
client.close();
```

## API Reference

### pumpFunBuy

Buy tokens on the bonding curve.

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunBuy({
    pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    poolAccounts: {
      coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
    },
    user: 'YOUR_WALLET',
    solAmountIn: 1_000_000_000, // 1 SOL
    tokenAmountOut: 34_000_000_000, // Min tokens expected
    mayhemModeEnabled: false,
  })
  .setFeePayer('YOUR_WALLET')
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport('FLASH')
  .send();
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pool` | string | Yes | Token mint address |
| `tokenProgram` | string | Yes | Token program address (usually `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`) |
| `poolAccounts.coinCreator` | string | Yes | Token creator wallet address |
| `user` | string | Yes | Buyer wallet address |
| `solAmountIn` | number | Yes | SOL amount to spend (in lamports) |
| `tokenAmountOut` | number | Yes | Minimum tokens expected (slippage protection) |
| `mayhemModeEnabled` | boolean | Yes | Enable Mayhem mode |

### pumpFunSell

Sell tokens on the bonding curve.

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunSell({
    pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    poolAccounts: {
      coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
    },
    user: 'YOUR_WALLET',
    tokenAmountIn: 34_000_000_000, // Tokens to sell
    minSolAmountOut: 900_000_000, // Min 0.9 SOL expected
    mayhemModeEnabled: false,
    closeAssociatedTokenAccount: false, // Reclaim rent
  })
  .setFeePayer('YOUR_WALLET')
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport('FLASH')
  .send();
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pool` | string | Yes | Token mint address |
| `tokenProgram` | string | Yes | Token program address |
| `poolAccounts.coinCreator` | string | Yes | Token creator wallet address |
| `user` | string | Yes | Seller wallet address |
| `tokenAmountIn` | number | Yes | Amount of tokens to sell |
| `minSolAmountOut` | number | Yes | Minimum SOL expected (slippage protection, in lamports) |
| `mayhemModeEnabled` | boolean | Yes | Enable Mayhem mode |
| `closeAssociatedTokenAccount` | boolean | No | Close ATA to reclaim ~0.002 SOL rent |

### pumpFunCreate

Create a new token on Pump.fun.

```typescript
import { Keypair } from '@solana/web3.js';

const mintKeypair = Keypair.generate();

const result = await new TransactionBuilder(client)
  .pumpFunCreate({
    user: 'YOUR_WALLET',
    pool: mintKeypair.publicKey.toBase58(),
    mintSecretKey: Buffer.from(mintKeypair.secretKey).toString('base64'),
    meta: {
      name: 'My Token',
      symbol: 'MTK',
      uri: 'https://arweave.net/metadata.json',
    },
  })
  .setFeePayer('YOUR_WALLET')
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport('FLASH')
  .send();

console.log('Token created:', mintKeypair.publicKey.toBase58());
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user` | string | Yes | Creator wallet address |
| `pool` | string | Yes | New mint public key (base58) |
| `mintSecretKey` | string | Yes | Mint secret key (base64 encoded) |
| `meta.name` | string | Yes | Token name |
| `meta.symbol` | string | Yes | Token symbol (3-5 characters) |
| `meta.uri` | string | Yes | Metadata URI (JSON with name, symbol, description, image) |

### pumpFunMigrate

Migrate a graduated token to AMM (Raydium).

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunMigrate({
    pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
    user: 'YOUR_WALLET',
  })
  .setFeePayer('YOUR_WALLET')
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport('FLASH')
  .send();
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pool` | string | Yes | Token mint address to migrate |
| `user` | string | Yes | User wallet address |

**Note:** Migration is only available after the token graduates (bonding curve completes).

## Batched Operations

### Create + Buy (Atomic)

Create a token and immediately buy in the same transaction:

```typescript
import { Keypair } from '@solana/web3.js';

const mintKeypair = Keypair.generate();

const result = await new TransactionBuilder(client)
  .pumpFunCreate({
    user: 'YOUR_WALLET',
    pool: mintKeypair.publicKey.toBase58(),
    mintSecretKey: Buffer.from(mintKeypair.secretKey).toString('base64'),
    meta: {
      name: 'My Token',
      symbol: 'MTK',
      uri: 'https://arweave.net/metadata.json',
    },
  })
  .pumpFunBuy({
    pool: mintKeypair.publicKey.toBase58(),
    tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    poolAccounts: {
      coinCreator: 'YOUR_WALLET', // Creator is the user
    },
    user: 'YOUR_WALLET',
    solAmountIn: 10_000_000_000, // 10 SOL
    tokenAmountOut: 340_000_000_000, // Min tokens
    mayhemModeEnabled: false,
  })
  .setFeePayer('YOUR_WALLET')
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport('FLASH')
  .send();
```

## Types

```typescript
interface PumpFunBuyParams {
  pool: string;
  tokenProgram: string;
  poolAccounts: {
    coinCreator: string;
  };
  user: string;
  solAmountIn: number;
  tokenAmountOut: number;
  mayhemModeEnabled: boolean;
}

interface PumpFunSellParams {
  pool: string;
  tokenProgram: string;
  poolAccounts: {
    coinCreator: string;
  };
  user: string;
  tokenAmountIn: number;
  minSolAmountOut: number;
  mayhemModeEnabled: boolean;
  closeAssociatedTokenAccount?: boolean;
}

interface PumpFunCreateParams {
  user: string;
  pool: string;
  mintSecretKey: string;
  meta: {
    name: string;
    symbol: string;
    uri: string;
  };
}

interface PumpFunMigrateParams {
  pool: string;
  user: string;
}
```

## Error Handling

```typescript
import { ExecutionError, ErrorCode } from '@lyslabs.ai/lys-flash';

try {
  const result = await new TransactionBuilder(client)
    .pumpFunBuy({ /* ... */ })
    .setFeePayer('YOUR_WALLET')
    .setBribe(1_000_000)
    .setTransport('FLASH')
    .send();

  if (result.success) {
    console.log('Success:', result.signature);
  } else {
    console.error('Transaction failed:', result.error);
  }
} catch (error) {
  if (error instanceof ExecutionError) {
    console.error('Code:', error.code);
    console.error('Message:', error.message);

    if (error.isRetryable()) {
      console.log('Can retry this error');
    }
  }
}
```

## Best Practices

1. **Always simulate first** - Test transactions before executing on mainnet
2. **Use FLASH transport** - For fastest execution with MEV protection
3. **Set appropriate slippage** - `tokenAmountOut` and `minSolAmountOut` protect against price changes
4. **Provide coinCreator** - Speeds up transaction building by avoiding RPC lookups
5. **Use bribe for MEV protection** - Required for FLASH transport (minimum 1_000_000 lamports)
6. **Consider closing ATAs** - Reclaim ~0.002 SOL rent when selling all tokens

## See Also

- [Pump.fun AMM](./PUMPFUN_AMM.md) - Post-graduation AMM trading
- [Transaction Builder](./TRANSACTION_BUILDER.md) - Complete API reference
- [Raw API](./RAW_API.md) - Low-level API documentation
