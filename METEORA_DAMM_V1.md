# Meteora DAMM v1 Integration

Integration guide for trading on Meteora Dynamic AMM v1 pools using LYS Flash.

## Installation

The Meteora Dynamic AMM SDK is an optional peer dependency:

```bash
npm install @meteora-ag/dynamic-amm-sdk bn.js
```

## Quick Start

```typescript
import { Connection } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, DAMMv1Utils, SOL_MINT } from '@lyslabs.ai/lys-flash';

// 1. Create client with Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = new LysFlash({
  address: 'ipc:///tmp/tx-executor.ipc',
  connection,
});

// 2. Get swap quote
const quote = await DAMMv1Utils.getSwapQuote(
  connection,
  'POOL_ADDRESS',
  SOL_MINT, // Input: SOL
  1_000_000_000, // 1 SOL
  0.01 // 1% slippage
);

// 3. Build and send transaction
const builder = await new TransactionBuilder(client)
  .meteora.dammV1.buy({
    pool: 'POOL_ADDRESS',
    user: 'YOUR_WALLET',
    tokenMint: 'TOKEN_MINT',
    solAmountIn: 1_000_000_000,
    minTokensOut: quote.minSwapOutAmount,
  });

const result = await builder
  .setFeePayer('YOUR_WALLET')
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport('FLASH')
  .send();

console.log('Signature:', result.signature);
client.close();
```

## API Reference

### Static Utilities (DAMMv1Utils)

Static utilities that don't require a TransactionBuilder instance.

#### getPool

Fetch pool state from the blockchain.

```typescript
const pool = await DAMMv1Utils.getPool(connection, 'POOL_ADDRESS');

// Returns:
{
  address: PublicKey;      // Pool address
  tokenAMint: PublicKey;   // Token A mint
  tokenBMint: PublicKey;   // Token B mint
  tokenADecimals: number;  // Token A decimals
  tokenBDecimals: number;  // Token B decimals
  virtualPriceRaw: BN;     // Virtual price
  raw: unknown;            // Raw AmmImpl instance
}
```

#### getSwapQuote

Calculate expected output for a swap.

```typescript
const quote = await DAMMv1Utils.getSwapQuote(
  connection,
  'POOL_ADDRESS',
  'So11111111111111111111111111111111111111112', // Input mint (SOL)
  1_000_000_000,  // Amount in (lamports or tokens)
  0.01            // Slippage as decimal (0.01 = 1%)
);

// Returns:
{
  swapInAmount: BN;      // Input amount
  swapOutAmount: BN;     // Expected output
  minSwapOutAmount: BN;  // Min output with slippage
  fee: BN;               // Trading fee
  priceImpact: number;   // Price impact as decimal
}
```

### TransactionBuilder Methods

All methods return `Promise<TransactionBuilder>` for chaining.

#### swap

Generic swap with input mint specification.

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dammV1.swap({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    inputMint: 'So11111111111111111111111111111111111111112', // SOL
    amountIn: 1_000_000_000,
    minimumAmountOut: 1000000,
    referralOwner: null,  // Optional
  });
```

#### buy

Convenience method for buying tokens (SOL -> Token).

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dammV1.buy({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    solAmountIn: 1_000_000_000,
    minTokensOut: 1000000,
  });
```

#### sell

Convenience method for selling tokens (Token -> SOL).

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dammV1.sell({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    tokenAmountIn: 1000000,
    minSolOut: 500_000_000,
  });
```

## Using Meteora SDK Directly

For operations not covered by the namespace (e.g., deposits, withdrawals), use the Meteora SDK with `rawTransaction()`:

```typescript
import AmmImpl from '@meteora-ag/dynamic-amm-sdk';

const pool = await AmmImpl.create(connection, poolAddress);
const depositTx = await pool.deposit(
  userWallet,
  tokenAInAmount,
  tokenBInAmount,
  poolTokenAmount
);

const result = await new TransactionBuilder(client)
  .rawTransaction({ transaction: depositTx })
  .setFeePayer('WALLET')
  .setTransport('FLASH')
  .setBribe(1_000_000)
  .send();
```

## Types

```typescript
// swap() parameters
interface DAMMv1SwapParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  inputMint: string | PublicKey;
  amountIn: number | BN;
  minimumAmountOut: number | BN;
  referralOwner?: string | PublicKey | null;
}

// buy() parameters
interface DAMMv1BuyParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenMint: string | PublicKey;
  solAmountIn: number | BN;
  minTokensOut: number | BN;
  referralOwner?: string | PublicKey | null;
}

// sell() parameters
interface DAMMv1SellParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenMint: string | PublicKey;
  tokenAmountIn: number | BN;
  minSolOut: number | BN;
  referralOwner?: string | PublicKey | null;
}

// Pool state
interface DAMMv1PoolState {
  address: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenADecimals: number;
  tokenBDecimals: number;
  virtualPriceRaw: BN;
  raw: unknown;
}

// Swap quote result
interface DAMMv1SwapQuote {
  swapInAmount: BN;
  swapOutAmount: BN;
  minSwapOutAmount: BN;
  fee: BN;
  priceImpact: number;
}
```

## Constants

```typescript
// Native SOL mint address
import { SOL_MINT } from '@lyslabs.ai/lys-flash';
// SOL_MINT = 'So11111111111111111111111111111111111111112'
```

## Error Handling

```typescript
try {
  const builder = await new TransactionBuilder(client)
    .meteora.dammV1.buy({ ... });

  const result = await builder.send();

  if (!result.success) {
    console.error('Transaction failed:', result.error);
  }
} catch (error) {
  if (error.message.includes('Pool not found')) {
    // Handle invalid pool
  } else if (error.message.includes('Connection not configured')) {
    // Forgot to set connection on client
  }
}
```

## Best Practices

1. **Always get a quote first** - Use `DAMMv1Utils.getSwapQuote()` to calculate expected output before executing
2. **Set appropriate slippage** - 0.01 (1%) is typical, increase for volatile markets
3. **Use FLASH transport** - For fastest execution with MEV protection
4. **Set bribe** - Required for FLASH transport (minimum 1_000_000 lamports)
5. **Use SOL_MINT constant** - For native SOL address consistency

## Key Differences from DAMM v2

| Feature | DAMM v1 | DAMM v2 |
|---------|---------|---------|
| SDK Package | `@meteora-ag/dynamic-amm-sdk` | `@meteora-ag/cp-amm-sdk` |
| Main Class | `AmmImpl` | `CpAmm` |
| Instantiation | `AmmImpl.create(conn, pool)` per pool | `new CpAmm(conn)` singleton |
| Swap Modes | Single mode only | ExactIn, ExactOut, PartialFill |
| Quote | Instance method `pool.getSwapQuote()` | Complex SDK setup |
| Slippage Format | Decimal (0.01 = 1%) | Basis points (100 = 1%) |
