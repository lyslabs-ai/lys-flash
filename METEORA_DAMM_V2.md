# Meteora DAMM v2 Integration

Integration guide for trading on Meteora Dynamic AMM v2 (CP-AMM) pools using LYS Flash.

## Installation

The Meteora CP-AMM SDK is an optional peer dependency:

```bash
npm install @meteora-ag/cp-amm-sdk bn.js
```

## Quick Start

```typescript
import { Connection } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, DAMMv2Utils, SOL_MINT } from '@lyslabs.ai/lys-flash';

// 1. Create client with Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = new LysFlash({
  address: 'ipc:///tmp/tx-executor.ipc',
  connection,
});

// 2. Get swap quote
const quote = await DAMMv2Utils.getQuote(
  connection,
  'POOL_ADDRESS',
  SOL_MINT, // Input: SOL
  1_000_000_000, // 1 SOL
  100 // 1% slippage
);

// 3. Build and send transaction
const builder = await new TransactionBuilder(client)
  .meteora.dammV2.buy({
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

### Static Utilities (DAMMv2Utils)

Static utilities that don't require a TransactionBuilder instance.

#### getPool

Fetch pool state from the blockchain.

```typescript
const pool = await DAMMv2Utils.getPool(connection, 'POOL_ADDRESS');

// Returns:
{
  address: PublicKey;      // Pool address
  tokenAMint: PublicKey;   // Token A mint
  tokenBMint: PublicKey;   // Token B mint
  tokenAVault: PublicKey;  // Token A vault
  tokenBVault: PublicKey;  // Token B vault
  sqrtPrice: BN;           // Current sqrt price
  liquidity: BN;           // Current liquidity
  feeRate: number;         // Trading fee rate
  protocolFeeRate: number; // Protocol fee rate
  raw: unknown;            // Raw SDK pool state
}
```

#### getQuote

Calculate expected output for a swap.

```typescript
const quote = await DAMMv2Utils.getQuote(
  connection,
  'POOL_ADDRESS',
  'So11111111111111111111111111111111111111112', // Input mint (SOL)
  1_000_000_000,  // Amount in (lamports or tokens)
  100,            // Slippage in bps (100 = 1%)
  'confirmed'     // Commitment
);

// Returns:
{
  amountIn: BN;            // Input amount
  amountOut: BN;           // Expected output
  minimumAmountOut: BN;    // Min output with slippage
  tradingFee: BN;          // Trading fee
  protocolFee: BN;         // Protocol fee
  referralFee: BN;         // Referral fee
  priceImpact: number;     // Price impact %
}
```

#### getQuote2

Calculate expected output using swap2 modes (ExactIn, ExactOut, PartialFill).

```typescript
const quote = await DAMMv2Utils.getQuote2(
  connection,
  'POOL_ADDRESS',
  'So11111111111111111111111111111111111111112',
  1_000_000_000,
  'ExactIn', // or 'ExactOut', 'PartialFill'
  100
);

// Returns:
{
  amountIn: BN;            // Input amount
  amountOut: BN;           // Expected output amount
  minimumAmountOut: BN;    // Min output with slippage
  tradingFee: BN;          // Trading fee amount
  protocolFee: BN;         // Protocol fee amount
  referralFee: BN;         // Referral fee amount
  partnerFee: BN;          // Partner fee amount
  priceImpact: number;     // Price impact %
  maximumAmountIn?: BN;    // Max input (ExactOut mode only)
}
```

### TransactionBuilder Methods

All methods return `Promise<TransactionBuilder>` for chaining.

#### swap

Generic swap with input/output mint specification.

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dammV2.swap({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    inputMint: 'So11111111111111111111111111111111111111112', // SOL
    outputMint: 'TOKEN_MINT',
    amountIn: 1_000_000_000,
    minimumAmountOut: 1000000,
    referralAccount: null,  // Optional
  });
```

#### buy

Convenience method for buying tokens (SOL -> Token).

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dammV2.buy({
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
  .meteora.dammV2.sell({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    tokenAmountIn: 1000000,
    minSolOut: 500_000_000,
  });
```

#### swap2

Advanced swap with mode selection.

**ExactIn Mode:**
```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dammV2.swap2({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'TOKEN_MINT',
    mode: 'ExactIn',
    amountIn: 1_000_000_000,
    minimumAmountOut: 1000000,
  });
```

**PartialFill Mode:**
```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dammV2.swap2({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'TOKEN_MINT',
    mode: 'PartialFill',
    amountIn: 1_000_000_000,
    minimumAmountOut: 500000,
  });
```

**ExactOut Mode:**
```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dammV2.swap2({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'TOKEN_MINT',
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
  .meteora.dammV2.buy2({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    amountIn: 1_000_000_000,
    minimumAmountOut: 1000000,
  });

// Sell with ExactIn
const sellBuilder = await new TransactionBuilder(client)
  .meteora.dammV2.sell2({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    amountIn: 1000000,
    minimumAmountOut: 500_000_000,
  });
```

#### buyExactOut / sellExactOut

Convenience methods for swap2 with ExactOut mode.

```typescript
// Buy exact tokens
const buyBuilder = await new TransactionBuilder(client)
  .meteora.dammV2.buyExactOut({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    amountOut: 1000000,        // Exact tokens wanted
    maximumAmountIn: 2_000_000_000,  // Max SOL to pay
  });

// Sell for exact SOL
const sellBuilder = await new TransactionBuilder(client)
  .meteora.dammV2.sellExactOut({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    amountOut: 1_000_000_000,  // Exact SOL wanted (1 SOL)
    maximumAmountIn: 2000000,  // Max tokens to sell
  });
```

## Using Meteora SDK Directly

For operations not covered by the namespace (e.g., pool creation, liquidity management), use the Meteora SDK with `rawTransaction()`:

```typescript
import { CpAmm } from '@meteora-ag/cp-amm-sdk';

const cpAmm = new CpAmm(connection, { commitment: 'confirmed' });
const txBuilder = await cpAmm.createPool({
  // ... params
});

const result = await new TransactionBuilder(client)
  .rawTransaction({ transaction: txBuilder.transaction })
  .setFeePayer('WALLET')
  .setTransport('FLASH')
  .setBribe(1_000_000)
  .send();
```

## Types

```typescript
// Direction for convenience methods
type DAMMv2SwapDirection = 'buy' | 'sell';

// Swap modes for swap2
type DAMMv2SwapMode = 'ExactIn' | 'PartialFill' | 'ExactOut';

// swap() parameters
interface DAMMv2SwapParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  inputMint: string | PublicKey;
  outputMint: string | PublicKey;
  amountIn: number | BN;
  minimumAmountOut: number | BN;
  referralAccount?: string | PublicKey | null;
}

// buy() parameters
interface DAMMv2BuyParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenMint: string | PublicKey;
  solAmountIn: number | BN;
  minTokensOut: number | BN;
  referralAccount?: string | PublicKey | null;
}

// sell() parameters
interface DAMMv2SellParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenMint: string | PublicKey;
  tokenAmountIn: number | BN;
  minSolOut: number | BN;
  referralAccount?: string | PublicKey | null;
}

// Pool state
interface DAMMv2PoolState {
  address: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  sqrtPrice: BN;
  liquidity: BN;
  feeRate: number;
  protocolFeeRate: number;
  raw: unknown;
}

// Swap quote result
interface DAMMv2SwapQuote {
  amountIn: BN;
  amountOut: BN;
  minimumAmountOut: BN;
  tradingFee: BN;
  protocolFee: BN;
  referralFee: BN;
  priceImpact: number;
}

// Extended swap quote result (getQuote2)
interface DAMMv2SwapQuote2 extends DAMMv2SwapQuote {
  partnerFee: BN;          // Partner fee amount
  maximumAmountIn?: BN;    // Max input (for ExactOut mode)
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
    .meteora.dammV2.buy({ ... });

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

1. **Always get a quote first** - Use `DAMMv2Utils.getQuote()` to calculate expected output before executing
2. **Set appropriate slippage** - 100 bps (1%) is typical, increase for volatile markets
3. **Use FLASH transport** - For fastest execution with MEV protection
4. **Set bribe** - Required for FLASH transport (minimum 1_000_000 lamports)
5. **Use SOL_MINT constant** - For native SOL address consistency
6. **Use ExactOut mode** - When you need a specific token amount
7. **Use PartialFill mode** - For large orders that may partially fill

## Key Differences from DBC

| Feature | DAMM v2 | DBC |
|---------|---------|-----|
| SDK Package | `@meteora-ag/cp-amm-sdk` | `@meteora-ag/dynamic-bonding-curve-sdk` |
| Main Class | `CpAmm` | `DynamicBondingCurveClient` |
| Token Handling | `inputMint`/`outputMint` | `direction` (buy/sell) |
| Pool Type | Any token pair | Base/Quote pair |
| SOL Reference | Explicit `SOL_MINT` | Implicit (quote token) |
