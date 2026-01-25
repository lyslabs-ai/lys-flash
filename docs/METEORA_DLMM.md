# Meteora DLMM Integration

Integration guide for trading on Meteora DLMM (Dynamic Liquidity Market Maker) pools using LYS Flash.

## Installation

The Meteora DLMM SDK is an optional peer dependency:

```bash
npm install @meteora-ag/dlmm bn.js
```

## Quick Start

```typescript
import { Connection } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, DLMMUtils, SOL_MINT } from '@lyslabs.ai/lys-flash';

// 1. Create client with Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = new LysFlash({
  address: 'ipc:///tmp/tx-executor.ipc',
  connection,
});

// 2. Get swap quote
const quote = await DLMMUtils.getSwapQuote(
  connection,
  'POOL_ADDRESS',
  SOL_MINT, // Input: SOL
  1_000_000_000, // 1 SOL
  true, // swapForY: SOL -> Token
  0.01 // 1% slippage
);

// 3. Build and send transaction
const builder = await new TransactionBuilder(client)
  .meteora.dlmm.buy({
    pool: 'POOL_ADDRESS',
    user: 'YOUR_WALLET',
    tokenMint: 'TOKEN_MINT',
    solAmountIn: 1_000_000_000,
    minTokensOut: quote.minOutAmount,
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

### Static Utilities (DLMMUtils)

Static utilities that don't require a TransactionBuilder instance.

#### getPool

Fetch pool state from the blockchain.

```typescript
const pool = await DLMMUtils.getPool(connection, 'POOL_ADDRESS');

// Returns:
{
  address: PublicKey;        // Pool address
  tokenXMint: PublicKey;     // Token X mint
  tokenYMint: PublicKey;     // Token Y mint
  tokenXDecimals: number;    // Token X decimals
  tokenYDecimals: number;    // Token Y decimals
  activeBinId: number;       // Current active bin ID
  binStep: number;           // Price increment between bins (basis points)
  baseFee: BN;               // Base trading fee
  raw: unknown;              // Raw DLMM instance
}
```

#### getActiveBin

Get the current active bin (trading price).

```typescript
const activeBin = await DLMMUtils.getActiveBin(connection, 'POOL_ADDRESS');

// Returns:
{
  binId: number;             // Bin ID
  price: string;             // Price as string
  pricePerToken: string;     // Human-readable price per token
  xAmount: BN;               // Token X amount in bin
  yAmount: BN;               // Token Y amount in bin
}
```

#### getSwapQuote

Calculate expected output for a swap (exact input).

```typescript
const quote = await DLMMUtils.getSwapQuote(
  connection,
  'POOL_ADDRESS',
  SOL_MINT,       // Input mint
  1_000_000_000,  // Amount in (lamports or tokens)
  true,           // swapForY: true = X -> Y, false = Y -> X
  0.01            // Slippage as decimal (0.01 = 1%)
);

// Returns:
{
  consumedInAmount: BN;  // Input amount consumed
  outAmount: BN;         // Expected output
  minOutAmount: BN;      // Min output with slippage
  fee: BN;               // Trading fee
  priceImpact: number;   // Price impact as decimal
}
```

#### getSwapQuoteExactOut

Calculate required input for exact output.

```typescript
const quote = await DLMMUtils.getSwapQuoteExactOut(
  connection,
  'POOL_ADDRESS',
  'TOKEN_MINT',   // Output mint
  1000000,        // Exact amount out
  false,          // swapForY: direction flag
  0.01            // Slippage as decimal
);

// Returns:
{
  inAmount: BN;        // Required input amount
  maxInAmount: BN;     // Max input with slippage
  outAmount: BN;       // Exact output amount
  fee: BN;             // Trading fee
  priceImpact: number; // Price impact as decimal
}
```

### TransactionBuilder Methods

All methods return `Promise<TransactionBuilder>` for chaining.

#### swap

Generic swap with input/output mint specification.

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dlmm.swap({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    inputMint: SOL_MINT,
    outputMint: 'TOKEN_MINT',
    amountIn: 1_000_000_000,
    minimumAmountOut: 1000000,
  });
```

#### swapExactOut

Swap for exact output amount.

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dlmm.swapExactOut({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    inputMint: SOL_MINT,
    outputMint: 'TOKEN_MINT',
    amountOut: 1000000,
    maximumAmountIn: 1_500_000_000,
  });
```

#### buy

Convenience method for buying tokens (SOL -> Token).

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dlmm.buy({
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
  .meteora.dlmm.sell({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    tokenAmountIn: 1000000,
    minSolOut: 500_000_000,
  });
```

#### buyExactOut

Buy exact amount of tokens.

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dlmm.buyExactOut({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    tokenAmountOut: 1000000,
    maxSolIn: 1_500_000_000,
  });
```

#### sellExactOut

Sell tokens for exact SOL output.

```typescript
const builder = await new TransactionBuilder(client)
  .meteora.dlmm.sellExactOut({
    pool: 'POOL_ADDRESS',
    user: 'WALLET',
    tokenMint: 'TOKEN_MINT',
    solAmountOut: 1_000_000_000,
    maxTokensIn: 2000000,
  });
```

## Understanding DLMM Concepts

DLMM uses concentrated liquidity organized into discrete price bins.

### Key Concepts

- **Active Bin**: Current price bin where trades execute
- **Bin Step**: Price increment between bins (in basis points)
- **swapForY**: Direction flag - `true` means X -> Y token swap
- **Token X/Y**: Pool tokens; typically SOL is token X

### Checking Pool Price

```typescript
const activeBin = await DLMMUtils.getActiveBin(connection, poolAddress);
console.log('Current price:', activeBin.pricePerToken);
```

### Bin Arrays

Swaps require bin arrays to be fetched. The namespace handles this automatically, but be aware that:
- Bin arrays are fetched based on swap direction
- This adds a small latency to swap operations
- Use static utilities if you need more control

## Using Meteora SDK Directly

For operations not covered by the namespace (e.g., liquidity management), use the Meteora SDK with `rawTransaction()`:

```typescript
import DLMM from '@meteora-ag/dlmm';

const pool = await DLMM.create(connection, poolAddress);
const addLiquidityTx = await pool.addLiquidityByStrategy({
  user: userWallet,
  totalXAmount: xAmount,
  totalYAmount: yAmount,
  strategy: { ... },
});

const result = await new TransactionBuilder(client)
  .rawTransaction({ transaction: addLiquidityTx })
  .setFeePayer('WALLET')
  .setTransport('FLASH')
  .setBribe(1_000_000)
  .send();
```

## Types

```typescript
// swap() parameters
interface DLMMSwapParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  inputMint: string | PublicKey;
  outputMint: string | PublicKey;
  amountIn: number | BN;
  minimumAmountOut: number | BN;
}

// swapExactOut() parameters
interface DLMMSwapExactOutParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  inputMint: string | PublicKey;
  outputMint: string | PublicKey;
  amountOut: number | BN;
  maximumAmountIn: number | BN;
}

// buy() parameters
interface DLMMBuyParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenMint: string | PublicKey;
  solAmountIn: number | BN;
  minTokensOut: number | BN;
}

// sell() parameters
interface DLMMSellParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenMint: string | PublicKey;
  tokenAmountIn: number | BN;
  minSolOut: number | BN;
}

// buyExactOut() parameters
interface DLMMBuyExactOutParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenMint: string | PublicKey;
  tokenAmountOut: number | BN;
  maxSolIn: number | BN;
}

// sellExactOut() parameters
interface DLMMSellExactOutParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  tokenMint: string | PublicKey;
  solAmountOut: number | BN;
  maxTokensIn: number | BN;
}

// Pool state
interface DLMMPoolState {
  address: PublicKey;
  tokenXMint: PublicKey;
  tokenYMint: PublicKey;
  tokenXDecimals: number;
  tokenYDecimals: number;
  activeBinId: number;
  binStep: number;
  baseFee: BN;
  raw: unknown;
}

// Active bin info
interface DLMMActiveBin {
  binId: number;
  price: string;
  pricePerToken: string;
  xAmount: BN;
  yAmount: BN;
}

// Swap quote (exact in)
interface DLMMSwapQuote {
  consumedInAmount: BN;
  outAmount: BN;
  minOutAmount: BN;
  fee: BN;
  priceImpact: number;
}

// Swap quote (exact out)
interface DLMMSwapQuoteExactOut {
  inAmount: BN;
  maxInAmount: BN;
  outAmount: BN;
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
    .meteora.dlmm.buy({ ... });

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

1. **Always get a quote first** - Use `DLMMUtils.getSwapQuote()` or `getSwapQuoteExactOut()` to calculate amounts
2. **Check active bin** - Use `DLMMUtils.getActiveBin()` to verify current trading price
3. **Set appropriate slippage** - 0.01 (1%) is typical, increase for volatile markets
4. **Use FLASH transport** - For fastest execution with MEV protection
5. **Set bribe** - Required for FLASH transport (minimum 1_000_000 lamports)
6. **Use SOL_MINT constant** - For native SOL address consistency
7. **Use exact out methods** - When you need precise output amounts

## Key Differences from Other Meteora Products

| Feature | DLMM | DAMM v1 | DAMM v2 |
|---------|------|---------|---------|
| SDK Package | `@meteora-ag/dlmm` | `@meteora-ag/dynamic-amm-sdk` | `@meteora-ag/cp-amm-sdk` |
| Main Class | `DLMM` | `AmmImpl` | `CpAmm` |
| Liquidity Model | Concentrated (bins) | Constant product | Constant product |
| Exact Out Support | Yes | No | Yes |
| Bin Arrays Required | Yes | No | No |
| Active Bin Query | Yes | No | No |
