# Raydium LaunchPad Integration

Integration guide for trading on Raydium LaunchPad (Bonding Curve) pools using LYS Flash.

## Installation

The Raydium SDK is an optional peer dependency:

```bash
npm install @raydium-io/raydium-sdk-v2 bn.js
```

## Quick Start

```typescript
import { Connection } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, RaydiumLaunchPadUtils } from '@lyslabs.ai/lys-flash';

// 1. Create client with Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = new LysFlash({
  address: 'ipc:///tmp/tx-executor.ipc',
  connection,
});

// 2. Get swap quote
const quote = await RaydiumLaunchPadUtils.getQuote(
  connection,
  'POOL_ADDRESS',
  1_000_000_000, // 1 SOL
  'buy',
  100 // 1% slippage
);

// 3. Build and send transaction
const builder = await new TransactionBuilder(client)
  .raydium.launchpad.buy({
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

### Static Utilities (RaydiumLaunchPadUtils)

Static utilities that don't require a TransactionBuilder instance.

#### getPool

Fetch pool state from the blockchain.

```typescript
const pool = await RaydiumLaunchPadUtils.getPool(connection, 'POOL_ADDRESS');

// Returns:
{
  address: PublicKey;      // Pool address
  baseMint: PublicKey;     // Token mint
  quoteMint: PublicKey;    // Quote mint (usually SOL)
  baseVault: PublicKey;    // Base token vault
  quoteVault: PublicKey;   // Quote token vault
  virtualBase: BN;         // Virtual base reserve
  virtualQuote: BN;        // Virtual quote reserve
  realBase: BN;            // Real base reserve
  realQuote: BN;           // Real quote reserve
  status: number;          // Pool status
  creator: PublicKey;      // Pool creator
  platformId: PublicKey;   // Platform ID
  configId: PublicKey;     // Config ID
  raw: unknown;            // Raw SDK pool state
}
```

#### getQuote

Calculate expected output for a swap.

```typescript
const quote = await RaydiumLaunchPadUtils.getQuote(
  connection,
  'POOL_ADDRESS',
  1_000_000_000,  // Amount in (lamports or tokens)
  'buy',          // Direction: 'buy' or 'sell'
  100,            // Slippage in bps (100 = 1%)
  'confirmed'     // Commitment
);

// Returns:
{
  amountIn: BN;           // Input amount
  amountOut: BN;          // Expected output
  minimumAmountOut: BN;   // Min output with slippage
  fee: BN;                // Trading fee
  priceImpact: number;    // Price impact %
}
```

### TransactionBuilder Methods

All methods return `Promise<TransactionBuilder>` for chaining.

#### swap

Generic swap with direction parameter.

```typescript
const builder = await new TransactionBuilder(client)
  .raydium.launchpad.swap({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    amountIn: 1_000_000_000,
    minimumAmountOut: 1000000,
    direction: 'buy',  // 'buy' or 'sell'
    shareFeeReceiver: null,  // Optional
  });
```

#### buy

Convenience method for buying tokens (SOL -> Token).

```typescript
const builder = await new TransactionBuilder(client)
  .raydium.launchpad.buy({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    solAmountIn: 1_000_000_000,
    minTokensOut: 1000000,
  });
```

#### sell

Convenience method for selling tokens (Token -> SOL).

```typescript
const builder = await new TransactionBuilder(client)
  .raydium.launchpad.sell({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenAmountIn: 1000000,
    minSolOut: 500_000_000,
  });
```

## Types

```typescript
// Direction for swaps
type RaydiumLaunchPadSwapDirection = 'buy' | 'sell';

// swap() parameters
interface RaydiumLaunchPadSwapParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  amountIn: number | BN;
  minimumAmountOut: number | BN;
  direction: RaydiumLaunchPadSwapDirection;
  shareFeeReceiver?: string | PublicKey | null;
}

// buy() parameters
interface RaydiumLaunchPadBuyParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  solAmountIn: number | BN;
  minTokensOut: number | BN;
  shareFeeReceiver?: string | PublicKey | null;
}

// sell() parameters
interface RaydiumLaunchPadSellParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenAmountIn: number | BN;
  minSolOut: number | BN;
  shareFeeReceiver?: string | PublicKey | null;
}

// Pool state
interface RaydiumLaunchPadPoolState {
  address: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  baseVault: PublicKey;
  quoteVault: PublicKey;
  virtualBase: BN;
  virtualQuote: BN;
  realBase: BN;
  realQuote: BN;
  status: number;
  creator: PublicKey;
  platformId: PublicKey;
  configId: PublicKey;
  raw: unknown;
}

// Swap quote result
interface RaydiumLaunchPadSwapQuote {
  amountIn: BN;
  amountOut: BN;
  minimumAmountOut: BN;
  fee: BN;
  priceImpact: number;
}
```

## Constants

```typescript
// Program ID
const RAYDIUM_LAUNCHPAD_PROGRAM_ID = 'LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj';

// Wrapped SOL
const SOL_MINT = 'So11111111111111111111111111111111111111112';
```

## Error Handling

```typescript
try {
  const builder = await new TransactionBuilder(client)
    .raydium.launchpad.buy({ ... });

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

1. **Always get a quote first** - Use `RaydiumLaunchPadUtils.getQuote()` to calculate expected output before executing
2. **Set appropriate slippage** - 100 bps (1%) is typical, increase for volatile markets
3. **Use FLASH transport** - For fastest execution with MEV protection
4. **Set bribe** - Required for FLASH transport (minimum 1_000_000 lamports)
5. **Handle errors** - Pool might not exist or have insufficient liquidity
