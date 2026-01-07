# Meteora DBC Integration

Integration guide for trading on Meteora Dynamic Bonding Curve (DBC) pools using LYS Flash.

## Installation

The Meteora SDK is an optional peer dependency:

```bash
npm install @meteora-ag/dynamic-bonding-curve-sdk bn.js
```

## Quick Start

```typescript
import { Connection } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, DBCUtils } from '@lyslabs.ai/lys-flash';

// 1. Create client with Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = new LysFlash({
  address: 'ipc:///tmp/tx-executor.ipc',
  connection,
});

// 2. Get swap quote
const quote = await DBCUtils.swapQuote(
  connection,
  'POOL_ADDRESS',
  1_000_000_000, // 1 SOL
  'buy',
  100 // 1% slippage
);

// 3. Build and send transaction
const builder = await new TransactionBuilder(client)
  .meteora.dbc.buy({
    pool: 'POOL_ADDRESS',
    user: 'YOUR_WALLET',
    solAmountIn: 1_000_000_000,
    minTokensOut: quote.minimumAmountOut,
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

### Static Utilities (DBCUtils)

Static utilities that don't require a TransactionBuilder instance.

#### getPool

Fetch pool state from the blockchain.

```typescript
const pool = await DBCUtils.getPool(connection, 'POOL_ADDRESS');

// Returns:
{
  address: PublicKey;      // Pool address
  config: PublicKey;       // Config account
  baseMint: PublicKey;     // Token mint (base)
  quoteMint: PublicKey;    // SOL or quote mint
  sqrtPrice: BN;           // Current sqrt price
  baseReserve: BN;         // Base token reserves
  quoteReserve: BN;        // Quote token reserves
  migrated: boolean;       // Migration status
  creator: PublicKey;      // Pool creator
  raw: VirtualPool;        // Raw SDK pool state
}
```

#### swapQuote

Calculate expected output for a swap using swap v1.

```typescript
const quote = await DBCUtils.swapQuote(
  connection,
  'POOL_ADDRESS',
  1_000_000_000,  // Amount in (lamports or tokens)
  'buy',          // Direction: 'buy' or 'sell'
  100,            // Slippage in bps (100 = 1%)
  false,          // Has referral
  'confirmed'     // Commitment
);

// Returns:
{
  amountOut: BN;           // Expected output
  minimumAmountOut: BN;    // Min output with slippage
  nextSqrtPrice: BN;       // Price after swap
  fee: BN;                 // Trading fee
  priceImpact: number;     // Price impact %
  effectivePrice: number;  // Effective price
}
```

#### swapQuote2

Calculate expected output using swap v2 (ExactIn mode).

```typescript
const quote = await DBCUtils.swapQuote2(
  connection,
  'POOL_ADDRESS',
  1_000_000_000,
  'buy',
  100
);
```

### TransactionBuilder Methods

All methods return `Promise<TransactionBuilder>` for chaining.

#### swap (swap v1)

Generic swap with direction parameter.

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dbc.swap({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    amountIn: 1_000_000_000,
    minimumAmountOut: 1000000,
    direction: 'buy',  // 'buy' or 'sell'
    referralTokenAccount: null,  // Optional
  });
```

#### buy (swap v1)

Convenience method for buying tokens (SOL -> Token).

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dbc.buy({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    solAmountIn: 1_000_000_000,
    minTokensOut: 1000000,
  });
```

#### sell (swap v1)

Convenience method for selling tokens (Token -> SOL).

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dbc.sell({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenAmountIn: 1000000,
    minSolOut: 500_000_000,
  });
```

#### swap2 (swap v2)

Advanced swap with mode selection.

**ExactIn Mode:**
```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dbc.swap2({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    direction: 'buy',
    mode: 'ExactIn',
    amountIn: 1_000_000_000,
    minimumAmountOut: 1000000,
  });
```

**PartialFill Mode:**
```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dbc.swap2({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    direction: 'buy',
    mode: 'PartialFill',
    amountIn: 1_000_000_000,
    minimumAmountOut: 500000,
  });
```

**ExactOut Mode:**
```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dbc.swap2({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    direction: 'buy',
    mode: 'ExactOut',
    amountOut: 1000000,
    maximumAmountIn: 2_000_000_000,
  });
```

#### buy2 / sell2

Convenience methods for swap2 with ExactIn mode.

```typescript
// Buy with ExactIn
const buyBuilder = await new TransactionBuilder(client)
  .meteora.dbc.buy2({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    amountIn: 1_000_000_000,
    minimumAmountOut: 1000000,
  });

// Sell with ExactIn
const sellBuilder = await new TransactionBuilder(client)
  .meteora.dbc.sell2({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    amountIn: 1000000,
    minimumAmountOut: 500_000_000,
  });
```

#### buyExactOut / sellExactOut

Convenience methods for swap2 with ExactOut mode.

```typescript
// Buy exact tokens
const buyBuilder = await new TransactionBuilder(client)
  .meteora.dbc.buyExactOut({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    amountOut: 1000000,        // Exact tokens wanted
    maximumAmountIn: 2_000_000_000,  // Max SOL to pay
  });

// Sell for exact SOL
const sellBuilder = await new TransactionBuilder(client)
  .meteora.dbc.sellExactOut({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    amountOut: 1_000_000_000,  // Exact SOL wanted
    maximumAmountIn: 2000000,  // Max tokens to sell
  });
```

## Using Meteora SDK Directly

For operations not covered by the namespace (e.g., pool creation), use the Meteora SDK with `rawTransaction()`:

```typescript
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const meteoraClient = new DynamicBondingCurveClient(connection, 'confirmed');
const tx = await meteoraClient.pool.createPool({
  // ... params
});

const result = await new TransactionBuilder(client)
  .rawTransaction({ transaction: tx })
  .setFeePayer('WALLET')
  .setTransport('FLASH')
  .setBribe(1_000_000)
  .send();
```

## Types

```typescript
// Direction for swaps
type DBCSwapDirection = 'buy' | 'sell';

// Swap modes for swap2
type DBCSwapMode = 'ExactIn' | 'PartialFill' | 'ExactOut';

// swap() parameters
interface DBCSwapParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  amountIn: number | BN;
  minimumAmountOut: number | BN;
  direction: DBCSwapDirection;
  referralTokenAccount?: string | PublicKey | null;
}

// buy() parameters
interface DBCBuyParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  solAmountIn: number | BN;
  minTokensOut: number | BN;
  referralTokenAccount?: string | PublicKey | null;
}

// sell() parameters
interface DBCSellParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenAmountIn: number | BN;
  minSolOut: number | BN;
  referralTokenAccount?: string | PublicKey | null;
}

// Pool state
interface DBCPoolState {
  address: PublicKey;
  config: PublicKey;
  baseMint: PublicKey;
  quoteMint?: PublicKey;
  sqrtPrice: BN;
  baseReserve: BN;
  quoteReserve: BN;
  migrated: boolean;
  creator: PublicKey;
  raw: unknown;
}

// Swap quote result
interface DBCSwapQuote {
  amountOut: BN;
  minimumAmountOut: BN;
  nextSqrtPrice: BN;
  fee: BN;
  priceImpact: number;
  effectivePrice: number;
}
```

## Error Handling

```typescript
try {
  const builder = await new TransactionBuilder(client)
    .meteora.dbc.buy({ ... });

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

1. **Always get a quote first** - Use `DBCUtils.swapQuote()` to calculate expected output before executing
2. **Set appropriate slippage** - 100 bps (1%) is typical, increase for volatile markets
3. **Check migration status** - Some pools may have migrated, check `pool.migrated`
4. **Use FLASH transport** - For fastest execution with MEV protection
5. **Set bribe** - Required for FLASH transport (minimum 1_000_000 lamports)
6. **Handle errors** - Pool might not exist, be migrated, or have insufficient liquidity
