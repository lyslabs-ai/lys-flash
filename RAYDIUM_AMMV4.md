# Raydium AMMv4 Integration

Integration guide for trading on Raydium AMMv4 (V4 AMM with OpenBook integration) pools using LYS Flash.

## Installation

The Raydium SDK is an optional peer dependency:

```bash
npm install @raydium-io/raydium-sdk-v2 bn.js
```

## Quick Start

```typescript
import { Connection } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, RaydiumAMMv4Utils } from '@lyslabs.ai/lys-flash';

// 1. Create client with Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = new LysFlash({
  address: 'ipc:///tmp/tx-executor.ipc',
  connection,
});

// 2. Get swap quote
const quote = await RaydiumAMMv4Utils.getQuote(
  connection,
  'POOL_ADDRESS',
  'So11111111111111111111111111111111111111112', // SOL mint
  1_000_000_000, // 1 SOL
  100 // 1% slippage
);

// 3. Build and send transaction
const builder = await new TransactionBuilder(client)
  .raydium.ammv4.buy({
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

### Static Utilities (RaydiumAMMv4Utils)

Static utilities that don't require a TransactionBuilder instance.

#### getPool

Fetch pool state from the blockchain.

```typescript
const pool = await RaydiumAMMv4Utils.getPool(connection, 'POOL_ADDRESS');

// Returns:
{
  address: PublicKey;       // Pool address
  baseMint: PublicKey;      // Base token mint
  quoteMint: PublicKey;     // Quote token mint
  baseVault: PublicKey;     // Base token vault
  quoteVault: PublicKey;    // Quote token vault
  lpMint: PublicKey;        // LP token mint
  marketId: PublicKey;      // OpenBook market ID
  marketProgramId: PublicKey; // OpenBook program ID
  openOrders: PublicKey;    // Open orders account
  baseReserve: BN;          // Base token reserve
  quoteReserve: BN;         // Quote token reserve
  lpSupply: BN;             // LP token supply
  baseDecimals: number;     // Base token decimals
  quoteDecimals: number;    // Quote token decimals
  raw: unknown;             // Raw SDK pool state
}
```

#### getQuote

Calculate expected output for an ExactIn swap.

```typescript
const quote = await RaydiumAMMv4Utils.getQuote(
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
  fee: BN;                // Trading fee (0.25%)
  priceImpact: number;    // Price impact %
}
```

#### getQuoteExactOut

Calculate required input for an ExactOut swap.

```typescript
const quote = await RaydiumAMMv4Utils.getQuoteExactOut(
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
  .raydium.ammv4.swap({
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
  .raydium.ammv4.swapExactOut({
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
  .raydium.ammv4.buy({
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
  .raydium.ammv4.sell({
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
  .raydium.ammv4.buyExactOut({
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
  .raydium.ammv4.sellExactOut({
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
type RaydiumAMMv4SwapDirection = 'buy' | 'sell';
type RaydiumAMMv4SwapMode = 'ExactIn' | 'ExactOut';

// swap() parameters
interface RaydiumAMMv4SwapParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  inputMint: string | PublicKey;
  outputMint: string | PublicKey;
  amountIn: number | BN;
  minimumAmountOut: number | BN;
}

// swapExactOut() parameters
interface RaydiumAMMv4SwapExactOutParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  inputMint: string | PublicKey;
  outputMint: string | PublicKey;
  amountOut: number | BN;
  maximumAmountIn: number | BN;
}

// buy() parameters
interface RaydiumAMMv4BuyParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenMint: string | PublicKey;
  solAmountIn: number | BN;
  minTokensOut: number | BN;
}

// sell() parameters
interface RaydiumAMMv4SellParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenMint: string | PublicKey;
  tokenAmountIn: number | BN;
  minSolOut: number | BN;
}
```

## Constants

```typescript
// Wrapped SOL
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// AMMv4 trading fee in basis points (0.25%)
const AMMV4_FEE_BPS = 25;
```

## Fee Structure

Raydium AMMv4 has a fixed 0.25% trading fee (25 basis points). The fee is calculated as:

```typescript
fee = amountIn * 25 / 10000
```

## OpenBook Integration

AMMv4 pools are integrated with OpenBook (formerly Serum) order books. This means:

- Pools have associated market IDs and open order accounts
- Orders can be placed on the order book
- Swaps can be routed through the order book for better pricing

## Error Handling

```typescript
try {
  const builder = await new TransactionBuilder(client)
    .raydium.ammv4.buy({ ... });

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

1. **Always get a quote first** - Use `RaydiumAMMv4Utils.getQuote()` or `getQuoteExactOut()` to calculate amounts before executing
2. **Set appropriate slippage** - 100 bps (1%) is typical, increase for volatile markets
3. **Use FLASH transport** - For fastest execution with MEV protection
4. **Set bribe** - Required for FLASH transport (minimum 1_000_000 lamports)
5. **Account for 0.25% fee** - AMMv4 has a fixed trading fee
6. **Check reserves** - Ensure pool has sufficient liquidity for your trade
7. **Verify market availability** - Some pools may have inactive OpenBook markets
