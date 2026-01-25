# Raydium CLMM Integration

Integration guide for trading on Raydium CLMM (Concentrated Liquidity Market Maker) pools using LYS Flash.

## Installation

The Raydium SDK is an optional peer dependency:

```bash
npm install @raydium-io/raydium-sdk-v2 bn.js
```

## Quick Start

```typescript
import { Connection } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, RaydiumCLMMUtils } from '@lyslabs.ai/lys-flash';

// 1. Create client with Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = new LysFlash({
  address: 'ipc:///tmp/tx-executor.ipc',
  connection,
});

// 2. Get swap quote
const quote = await RaydiumCLMMUtils.getQuote(
  connection,
  'POOL_ADDRESS',
  'So11111111111111111111111111111111111111112', // SOL mint
  1_000_000_000, // 1 SOL
  100 // 1% slippage
);

// 3. Build and send transaction
const builder = await new TransactionBuilder(client)
  .raydium.clmm.buy({
    pool: 'POOL_ADDRESS',
    user: 'YOUR_WALLET',
    tokenMint: 'TOKEN_MINT',
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

### Static Utilities (RaydiumCLMMUtils)

Static utilities that don't require a TransactionBuilder instance.

#### getPool

Fetch pool state from the blockchain.

```typescript
const pool = await RaydiumCLMMUtils.getPool(connection, 'POOL_ADDRESS');

// Returns:
{
  address: PublicKey;        // Pool address
  mintA: PublicKey;          // Token A mint
  mintB: PublicKey;          // Token B mint
  vaultA: PublicKey;         // Token A vault
  vaultB: PublicKey;         // Token B vault
  sqrtPriceX64: BN;          // Current sqrt price (X64 fixed-point)
  currentTickIndex: number;  // Current tick
  liquidity: BN;             // Total liquidity
  feeRate: number;           // Trading fee rate (bps)
  tickSpacing: number;       // Tick spacing
  decimalsA: number;         // Token A decimals
  decimalsB: number;         // Token B decimals
  raw: unknown;              // Raw SDK pool state
}
```

#### getQuote

Calculate expected output for an ExactIn swap.

```typescript
const quote = await RaydiumCLMMUtils.getQuote(
  connection,
  'POOL_ADDRESS',
  'INPUT_MINT',   // Input token mint
  1_000_000_000,  // Amount in
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
  currentPrice: number;   // Current price
  executionPrice: number; // Execution price
}
```

#### getQuoteExactOut

Calculate required input for an ExactOut swap.

```typescript
const quote = await RaydiumCLMMUtils.getQuoteExactOut(
  connection,
  'POOL_ADDRESS',
  'OUTPUT_MINT',  // Output token mint
  1_000_000,      // Desired output amount
  100,            // Slippage in bps
  'confirmed'
);

// Returns:
{
  amountIn: BN;          // Required input
  amountOut: BN;         // Output amount
  maximumAmountIn: BN;   // Max input with slippage
  fee: BN;               // Trading fee
  priceImpact: number;   // Price impact %
}
```

### TransactionBuilder Methods

All methods return `Promise<TransactionBuilder>` for chaining.

#### swap

Generic ExactIn swap with input/output mints.

```typescript
const builder = await new TransactionBuilder(client)
  .raydium.clmm.swap({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    inputMint: 'INPUT_MINT',
    outputMint: 'OUTPUT_MINT',
    amountIn: 1_000_000_000,
    minimumAmountOut: 1000000,
  });
```

#### swapExactOut

ExactOut swap - specify desired output amount.

```typescript
const builder = await new TransactionBuilder(client)
  .raydium.clmm.swapExactOut({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    inputMint: 'INPUT_MINT',
    outputMint: 'OUTPUT_MINT',
    amountOut: 1000000,
    maximumAmountIn: 1_100_000_000,
  });
```

#### buy

Convenience method for buying tokens (SOL -> Token).

```typescript
const builder = await new TransactionBuilder(client)
  .raydium.clmm.buy({
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
  .raydium.clmm.sell({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    tokenAmountIn: 1000000,
    minSolOut: 900_000_000,
  });
```

#### buyExactOut

Buy exact amount of tokens with SOL.

```typescript
const builder = await new TransactionBuilder(client)
  .raydium.clmm.buyExactOut({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    amountOut: 1000000,        // Exact tokens to receive
    maximumAmountIn: 1_100_000_000,  // Max SOL to spend
  });
```

#### sellExactOut

Sell tokens for exact amount of SOL.

```typescript
const builder = await new TransactionBuilder(client)
  .raydium.clmm.sellExactOut({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    amountOut: 1_000_000_000,  // Exact SOL to receive
    maximumAmountIn: 1_100_000,  // Max tokens to spend
  });
```

## Types

```typescript
// Direction for swaps
type RaydiumCLMMSwapDirection = 'buy' | 'sell';
type RaydiumCLMMSwapMode = 'ExactIn' | 'ExactOut';

// swap() parameters
interface RaydiumCLMMSwapParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  inputMint: string | PublicKey;
  outputMint: string | PublicKey;
  amountIn: number | BN;
  minimumAmountOut: number | BN;
}

// swapExactOut() parameters
interface RaydiumCLMMSwapExactOutParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  inputMint: string | PublicKey;
  outputMint: string | PublicKey;
  amountOut: number | BN;
  maximumAmountIn: number | BN;
}

// buy() parameters
interface RaydiumCLMMBuyParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenMint: string | PublicKey;
  solAmountIn: number | BN;
  minTokensOut: number | BN;
}

// sell() parameters
interface RaydiumCLMMSellParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenMint: string | PublicKey;
  tokenAmountIn: number | BN;
  minSolOut: number | BN;
}
```

## Constants

```typescript
// Program ID
const RAYDIUM_CLMM_PROGRAM_ID = 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK';

// Wrapped SOL
const SOL_MINT = 'So11111111111111111111111111111111111111112';
```

## Error Handling

```typescript
try {
  const builder = await new TransactionBuilder(client)
    .raydium.clmm.buy({ ... });

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

1. **Always get a quote first** - Use `RaydiumCLMMUtils.getQuote()` or `getQuoteExactOut()` to calculate amounts before executing
2. **Set appropriate slippage** - 100 bps (1%) is typical, increase for volatile markets or low liquidity pools
3. **Use FLASH transport** - For fastest execution with MEV protection
4. **Set bribe** - Required for FLASH transport (minimum 1_000_000 lamports)
5. **Handle tick array errors** - CLMM pools require tick arrays to be loaded, which may fail for inactive price ranges
6. **Consider price impact** - Check `priceImpact` in quote results for large trades
