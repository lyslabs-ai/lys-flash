# Pump.fun AMM Integration

Integration guide for trading on Pump.fun AMM (post-graduation) using LYS Flash.

## Overview

After a token graduates from the Pump.fun bonding curve, it migrates to an AMM pool. This guide covers AMM operations. For bonding curve trading, see [Pump.fun Bonding Curve](./PUMPFUN.md).

The AMM uses a constant product formula (x * y = k) for price calculation.

## Quick Start

```typescript
import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';

// 1. Create client
const client = new LysFlash();

// 2. Buy tokens on AMM
const result = await new TransactionBuilder(client)
  .pumpFunAmmBuy({
    pool: '9kSKBD8G7Qio51XsLm5yhWWZ72YDJuUeJ6PqDc2mWZe1',
    baseTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    quoteTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    poolAccounts: {
      baseMint: 'EZtWGQLW2ihjvJXiBRNVz7gUVgnyn9aRQUcQkCeepump',
      quoteMint: 'So11111111111111111111111111111111111111112',
      coinCreator: '5VuTMuSbGbtuWsZuixbZxhD1DCuYv6ikzeM59a1XzjRN',
      poolCreator: 'EXapcg7mPND38PKsSgB8iicv2CD1Gfy9VcC9HtdBrXsD',
    },
    user: 'YOUR_WALLET',
    maxQuoteAmountIn: 1_000_000_000, // Max 1 SOL to spend
    baseAmountOut: 34_000_000_000, // Expected tokens
  })
  .setFeePayer('YOUR_WALLET')
  .setPriorityFee(1_000_000)
  .setBribe(1_000_000)
  .setTransport('FLASH')
  .send();

console.log('Signature:', result.signature);
client.close();
```

## Understanding Pool Direction

AMM pools have two tokens: **base** and **quote**. The direction of your trade depends on which token is WSOL:

| Quote Mint | Base Mint | Buy Token | Sell Token |
|------------|-----------|-----------|------------|
| WSOL | Token | `pumpFunAmmBuy` | `pumpFunAmmSell` |
| Token | WSOL | `pumpFunAmmSell` | `pumpFunAmmBuyExactQuoteIn` |

**WSOL Address:** `So11111111111111111111111111111111111111112`

## Calculating Swap Amounts

The AMM uses the constant product formula. Here's how to calculate amounts:

### Constants

```typescript
const NATIVE_MINT = 'So11111111111111111111111111111111111111112'; // WSOL
```

### Buy Token (Spend SOL)

```typescript
function calculateBuyAmounts(
  quoteMint: string,
  baseMint: string,
  solAmountIn: number,
  poolBaseTokenReserves: number,
  poolQuoteTokenReserves: number,
  slippageBps: number = 100 // 1% = 100 bps
) {
  const slippageMultiplier = 1 + slippageBps / 10000;
  const solAmountInWithSlippage = Math.floor(solAmountIn * slippageMultiplier);

  if (quoteMint === NATIVE_MINT) {
    // Quote is WSOL - use pumpFunAmmBuy
    const baseAmountOut = Math.floor(
      (poolBaseTokenReserves * solAmountIn) / (poolQuoteTokenReserves + solAmountIn)
    );

    return {
      method: 'pumpFunAmmBuy',
      params: {
        maxQuoteAmountIn: solAmountInWithSlippage,
        baseAmountOut: baseAmountOut,
      },
    };
  } else if (baseMint === NATIVE_MINT) {
    // Base is WSOL - use pumpFunAmmSell (selling SOL for tokens)
    const minQuoteAmountOut = Math.floor(
      (poolQuoteTokenReserves * solAmountIn) / (poolBaseTokenReserves + solAmountIn)
    );

    return {
      method: 'pumpFunAmmSell',
      params: {
        baseAmountIn: solAmountInWithSlippage,
        minQuoteAmountOut: minQuoteAmountOut,
      },
    };
  } else {
    // Neither is WSOL - use pumpFunAmmBuy
    const baseAmountOut = Math.floor(
      (poolBaseTokenReserves * solAmountIn) / (poolQuoteTokenReserves + solAmountIn)
    );

    return {
      method: 'pumpFunAmmBuy',
      params: {
        maxQuoteAmountIn: solAmountInWithSlippage,
        baseAmountOut: baseAmountOut,
      },
    };
  }
}
```

### Sell Token (Receive SOL)

```typescript
function calculateSellAmounts(
  quoteMint: string,
  baseMint: string,
  tokenAmountIn: number,
  poolBaseTokenReserves: number,
  poolQuoteTokenReserves: number,
  slippageBps: number = 100 // 1% = 100 bps
) {
  const slippageMultiplier = 1 - slippageBps / 10000;

  if (quoteMint === NATIVE_MINT) {
    // Quote is WSOL - use pumpFunAmmSell
    const quoteAmountOut = Math.floor(
      (poolQuoteTokenReserves * tokenAmountIn) / (poolBaseTokenReserves + tokenAmountIn)
    );
    const minQuoteAmountOut = Math.floor(quoteAmountOut * slippageMultiplier);

    return {
      method: 'pumpFunAmmSell',
      params: {
        baseAmountIn: tokenAmountIn,
        minQuoteAmountOut: minQuoteAmountOut,
      },
    };
  } else if (baseMint === NATIVE_MINT) {
    // Base is WSOL - use pumpFunAmmBuyExactQuoteIn
    const baseAmountOut = Math.floor(
      (poolBaseTokenReserves * tokenAmountIn) / (poolQuoteTokenReserves + tokenAmountIn)
    );
    const minBaseAmountOut = Math.floor(baseAmountOut * slippageMultiplier);

    return {
      method: 'pumpFunAmmBuyExactQuoteIn',
      params: {
        spendableQuoteIn: tokenAmountIn,
        minBaseAmountOut: minBaseAmountOut,
      },
    };
  } else {
    // Neither is WSOL - use pumpFunAmmSell
    const quoteAmountOut = Math.floor(
      (poolQuoteTokenReserves * tokenAmountIn) / (poolBaseTokenReserves + tokenAmountIn)
    );
    const minQuoteAmountOut = Math.floor(quoteAmountOut * slippageMultiplier);

    return {
      method: 'pumpFunAmmSell',
      params: {
        baseAmountIn: tokenAmountIn,
        minQuoteAmountOut: minQuoteAmountOut,
      },
    };
  }
}
```

### Complete Example

```typescript
import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';

const NATIVE_MINT = 'So11111111111111111111111111111111111111112';

async function buyToken(
  client: LysFlash,
  pool: string,
  poolAccounts: {
    baseMint: string;
    quoteMint: string;
    coinCreator: string;
    poolCreator: string;
  },
  user: string,
  solAmountIn: number,
  poolBaseReserves: number,
  poolQuoteReserves: number,
  slippageBps: number = 100
) {
  const calc = calculateBuyAmounts(
    poolAccounts.quoteMint,
    poolAccounts.baseMint,
    solAmountIn,
    poolBaseReserves,
    poolQuoteReserves,
    slippageBps
  );

  const builder = new TransactionBuilder(client);

  if (calc.method === 'pumpFunAmmBuy') {
    builder.pumpFunAmmBuy({
      pool,
      baseTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      quoteTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      poolAccounts,
      user,
      maxQuoteAmountIn: calc.params.maxQuoteAmountIn,
      baseAmountOut: calc.params.baseAmountOut,
    });
  } else {
    builder.pumpFunAmmSell({
      pool,
      baseTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      quoteTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      poolAccounts,
      user,
      baseAmountIn: calc.params.baseAmountIn,
      minQuoteAmountOut: calc.params.minQuoteAmountOut,
    });
  }

  return builder
    .setFeePayer(user)
    .setPriorityFee(1_000_000)
    .setBribe(1_000_000)
    .setTransport('FLASH')
    .send();
}
```

## API Reference

### pumpFunAmmBuy

Buy base tokens by spending quote tokens.

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunAmmBuy({
    pool: '9kSKBD8G7Qio51XsLm5yhWWZ72YDJuUeJ6PqDc2mWZe1',
    baseTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    quoteTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    poolAccounts: {
      baseMint: 'EZtWGQLW2ihjvJXiBRNVz7gUVgnyn9aRQUcQkCeepump',
      quoteMint: 'So11111111111111111111111111111111111111112',
      coinCreator: '5VuTMuSbGbtuWsZuixbZxhD1DCuYv6ikzeM59a1XzjRN',
      poolCreator: 'EXapcg7mPND38PKsSgB8iicv2CD1Gfy9VcC9HtdBrXsD',
    },
    user: 'YOUR_WALLET',
    maxQuoteAmountIn: 1_000_000_000, // Max 1 SOL
    baseAmountOut: 34_000_000_000, // Expected tokens
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
| `pool` | string | Yes | AMM pool address |
| `baseTokenProgram` | string | Yes | Base token program address |
| `quoteTokenProgram` | string | Yes | Quote token program address |
| `poolAccounts.baseMint` | string | Yes | Base token mint |
| `poolAccounts.quoteMint` | string | Yes | Quote token mint (usually WSOL) |
| `poolAccounts.coinCreator` | string | Yes | Token creator address |
| `poolAccounts.poolCreator` | string | Yes | Pool creator address |
| `user` | string | Yes | Buyer wallet address |
| `maxQuoteAmountIn` | number | Yes | Maximum quote tokens to spend |
| `baseAmountOut` | number | Yes | Expected base tokens to receive |
| `closeBaseAssociatedTokenAccount` | boolean | No | Close base ATA after transaction |
| `closeQuoteAssociatedTokenAccount` | boolean | No | Close quote ATA after transaction |

### pumpFunAmmBuyExactQuoteIn

Buy base tokens by spending an exact amount of quote tokens.

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunAmmBuyExactQuoteIn({
    pool: '9kSKBD8G7Qio51XsLm5yhWWZ72YDJuUeJ6PqDc2mWZe1',
    baseTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    quoteTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    poolAccounts: {
      baseMint: 'EZtWGQLW2ihjvJXiBRNVz7gUVgnyn9aRQUcQkCeepump',
      quoteMint: 'So11111111111111111111111111111111111111112',
      coinCreator: '5VuTMuSbGbtuWsZuixbZxhD1DCuYv6ikzeM59a1XzjRN',
      poolCreator: 'EXapcg7mPND38PKsSgB8iicv2CD1Gfy9VcC9HtdBrXsD',
    },
    user: 'YOUR_WALLET',
    spendableQuoteIn: 1_000_000_000, // Exactly 1 SOL
    minBaseAmountOut: 33_000_000_000, // Min tokens (with slippage)
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
| `pool` | string | Yes | AMM pool address |
| `baseTokenProgram` | string | Yes | Base token program address |
| `quoteTokenProgram` | string | Yes | Quote token program address |
| `poolAccounts.baseMint` | string | Yes | Base token mint |
| `poolAccounts.quoteMint` | string | Yes | Quote token mint |
| `poolAccounts.coinCreator` | string | Yes | Token creator address |
| `poolAccounts.poolCreator` | string | Yes | Pool creator address |
| `user` | string | Yes | Buyer wallet address |
| `spendableQuoteIn` | number | Yes | Exact quote tokens to spend |
| `minBaseAmountOut` | number | Yes | Minimum base tokens to receive |
| `closeBaseAssociatedTokenAccount` | boolean | No | Close base ATA after transaction |
| `closeQuoteAssociatedTokenAccount` | boolean | No | Close quote ATA after transaction |

### pumpFunAmmSell

Sell base tokens for quote tokens.

```typescript
const result = await new TransactionBuilder(client)
  .pumpFunAmmSell({
    pool: '9kSKBD8G7Qio51XsLm5yhWWZ72YDJuUeJ6PqDc2mWZe1',
    baseTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    quoteTokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    poolAccounts: {
      baseMint: 'EZtWGQLW2ihjvJXiBRNVz7gUVgnyn9aRQUcQkCeepump',
      quoteMint: 'So11111111111111111111111111111111111111112',
      coinCreator: '5VuTMuSbGbtuWsZuixbZxhD1DCuYv6ikzeM59a1XzjRN',
      poolCreator: 'EXapcg7mPND38PKsSgB8iicv2CD1Gfy9VcC9HtdBrXsD',
    },
    user: 'YOUR_WALLET',
    baseAmountIn: 34_000_000_000, // Tokens to sell
    minQuoteAmountOut: 900_000_000, // Min 0.9 SOL
    closeBaseAssociatedTokenAccount: false,
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
| `pool` | string | Yes | AMM pool address |
| `baseTokenProgram` | string | Yes | Base token program address |
| `quoteTokenProgram` | string | Yes | Quote token program address |
| `poolAccounts.baseMint` | string | Yes | Base token mint |
| `poolAccounts.quoteMint` | string | Yes | Quote token mint |
| `poolAccounts.coinCreator` | string | Yes | Token creator address |
| `poolAccounts.poolCreator` | string | Yes | Pool creator address |
| `user` | string | Yes | Seller wallet address |
| `baseAmountIn` | number | Yes | Base tokens to sell |
| `minQuoteAmountOut` | number | Yes | Minimum quote tokens to receive |
| `closeBaseAssociatedTokenAccount` | boolean | No | Close base ATA after transaction |
| `closeQuoteAssociatedTokenAccount` | boolean | No | Close quote ATA after transaction |

## Types

```typescript
interface PumpFunAmmBuyParams {
  pool: string;
  baseTokenProgram: string;
  quoteTokenProgram: string;
  poolAccounts: {
    baseMint: string;
    quoteMint: string;
    coinCreator: string;
    poolCreator: string;
  };
  user: string;
  maxQuoteAmountIn: number;
  baseAmountOut: number;
  closeBaseAssociatedTokenAccount?: boolean;
  closeQuoteAssociatedTokenAccount?: boolean;
}

interface PumpFunAmmBuyExactQuoteInParams {
  pool: string;
  baseTokenProgram: string;
  quoteTokenProgram: string;
  poolAccounts: {
    baseMint: string;
    quoteMint: string;
    coinCreator: string;
    poolCreator: string;
  };
  user: string;
  spendableQuoteIn: number;
  minBaseAmountOut: number;
  closeBaseAssociatedTokenAccount?: boolean;
  closeQuoteAssociatedTokenAccount?: boolean;
}

interface PumpFunAmmSellParams {
  pool: string;
  baseTokenProgram: string;
  quoteTokenProgram: string;
  poolAccounts: {
    baseMint: string;
    quoteMint: string;
    coinCreator: string;
    poolCreator: string;
  };
  user: string;
  baseAmountIn: number;
  minQuoteAmountOut: number;
  closeBaseAssociatedTokenAccount?: boolean;
  closeQuoteAssociatedTokenAccount?: boolean;
}
```

## Error Handling

```typescript
import { ExecutionError, ErrorCode } from '@lyslabs.ai/lys-flash';

try {
  const result = await new TransactionBuilder(client)
    .pumpFunAmmBuy({ /* ... */ })
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

1. **Calculate amounts correctly** - Use the formulas above based on pool direction
2. **Check pool reserves** - Fetch current reserves before calculating swap amounts
3. **Use appropriate slippage** - 1% (100 bps) is typical, increase for volatile markets
4. **Provide all poolAccounts** - `coinCreator` and `poolCreator` speed up execution
5. **Use FLASH transport** - For fastest execution with MEV protection
6. **Set bribe for MEV protection** - Required for FLASH transport (minimum 1_000_000 lamports)
7. **Consider closing ATAs** - Reclaim ~0.002 SOL rent when selling all tokens

## See Also

- [Pump.fun Bonding Curve](./PUMPFUN.md) - Pre-graduation trading
- [Transaction Builder](./TRANSACTION_BUILDER.md) - Complete API reference
- [Raw API](./RAW_API.md) - Low-level API documentation
