# DEX Integration Guide

Guide for adding new DEX integrations to LYS Flash.

## Architecture Overview

LYS Flash uses a **client-side transaction building** architecture:

1. **Client builds transactions** using DEX SDK
2. **Sends via `rawTransaction()`** to backend
3. **Backend signs and broadcasts** the transaction

This approach is preferred because:
- DEX SDKs change frequently
- Client updates are easier than backend changes
- Users can use latest SDK features immediately

## Namespace Pattern

DEX integrations use a nested namespace pattern:

```typescript
builder.{dex}.{product}.{method}()

// Examples:
builder.meteora.dbc.buy()       // Meteora DBC
builder.meteora.dammV1.swap()   // Meteora DAMM v1 (future)
builder.raydium.amm.swap()      // Raydium AMM (future)
```

## File Structure

```
src/
├── {dex}/
│   ├── index.ts           # Module exports
│   ├── namespace.ts       # Parent namespace (e.g., MeteoraNamespace)
│   └── {product}/
│       ├── index.ts       # Product exports
│       ├── types.ts       # Type definitions
│       ├── utils.ts       # Static utilities
│       └── namespace.ts   # Product namespace (e.g., DBCNamespace)
```

## Step-by-Step Integration

### 1. Create Types (`src/{dex}/{product}/types.ts`)

Define all parameter and return types:

```typescript
import type { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

// Direction helper
export type SwapDirection = 'buy' | 'sell';

// Swap parameters
export interface SwapParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  amountIn: number | BN;
  minimumAmountOut: number | BN;
  direction: SwapDirection;
}

// Convenience method params
export interface BuyParams {
  pool: string | PublicKey;
  user: string | PublicKey;
  solAmountIn: number | BN;
  minTokensOut: number | BN;
}

// Pool state (for getPool utility)
export interface PoolState {
  address: PublicKey;
  // ... other fields
  raw: unknown;  // Raw SDK type
}

// Quote result (for swapQuote utility)
export interface SwapQuote {
  amountOut: BN;
  minimumAmountOut: BN;
  fee: BN;
  priceImpact: number;
}
```

### 2. Create Static Utilities (`src/{dex}/{product}/utils.ts`)

Static methods that don't require TransactionBuilder:

```typescript
import type { Connection, Commitment } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import type { PoolState, SwapQuote, SwapDirection } from './types';

export class Utils {
  /**
   * Fetch pool state
   */
  static async getPool(
    connection: Connection,
    poolAddress: string | PublicKey,
    commitment: Commitment = 'confirmed'
  ): Promise<PoolState> {
    // Dynamic import for optional peer dependency
    const { SomeSDKClient } = await import('some-dex-sdk');

    const client = new SomeSDKClient(connection, commitment);
    const address = typeof poolAddress === 'string'
      ? new PublicKey(poolAddress)
      : poolAddress;

    const poolState = await client.getPool(address);

    if (!poolState) {
      throw new Error(`Pool not found: ${address.toBase58()}`);
    }

    return {
      address,
      // ... map fields
      raw: poolState,
    };
  }

  /**
   * Calculate swap quote
   */
  static async swapQuote(
    connection: Connection,
    poolAddress: string | PublicKey,
    amountIn: number | BN,
    direction: SwapDirection,
    slippageBps: number = 100,
    commitment: Commitment = 'confirmed'
  ): Promise<SwapQuote> {
    const { SomeSDKClient, getQuote } = await import('some-dex-sdk');
    // ... implementation
  }
}
```

### 3. Create Product Namespace (`src/{dex}/{product}/namespace.ts`)

The namespace class with trading methods:

```typescript
import type { Connection, Commitment } from '@solana/web3.js';
import { PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import type { TransactionBuilder } from '../../builder';
import type { LysFlash } from '../../client';
import type { SwapParams, BuyParams, SellParams } from './types';

export class ProductNamespace {
  private builder: TransactionBuilder;

  constructor(builder: TransactionBuilder) {
    this.builder = builder;
  }

  private getClient(): LysFlash {
    return this.builder.getClient();
  }

  private getConnection(): Connection {
    return this.getClient().requireConnection();
  }

  private getCommitment(): Commitment {
    return this.getClient().getCommitment();
  }

  /**
   * Execute a swap
   */
  async swap(params: SwapParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();
    const commitment = this.getCommitment();

    // Dynamic import
    const { SomeSDKClient } = await import('some-dex-sdk');
    const client = new SomeSDKClient(connection, commitment);

    // Convert addresses
    const poolAddress = typeof params.pool === 'string'
      ? new PublicKey(params.pool)
      : params.pool;
    const userAddress = typeof params.user === 'string'
      ? new PublicKey(params.user)
      : params.user;

    // Convert amounts
    const amountIn = BN.isBN(params.amountIn)
      ? params.amountIn
      : new BN(params.amountIn);

    // Build transaction using SDK
    const swapTx: Transaction = await client.swap({
      pool: poolAddress,
      owner: userAddress,
      amountIn,
      // ... other params
    });

    // Return via rawTransaction
    return this.builder.rawTransaction({
      transaction: swapTx,
      additionalSigners: [],
    });
  }

  /**
   * Buy tokens (convenience method)
   */
  async buy(params: BuyParams): Promise<TransactionBuilder> {
    return this.swap({
      pool: params.pool,
      user: params.user,
      amountIn: params.solAmountIn,
      minimumAmountOut: params.minTokensOut,
      direction: 'buy',
    });
  }

  /**
   * Sell tokens (convenience method)
   */
  async sell(params: SellParams): Promise<TransactionBuilder> {
    return this.swap({
      pool: params.pool,
      user: params.user,
      amountIn: params.tokenAmountIn,
      minimumAmountOut: params.minSolOut,
      direction: 'sell',
    });
  }
}
```

### 4. Create Product Exports (`src/{dex}/{product}/index.ts`)

```typescript
export { ProductNamespace } from './namespace';
export { Utils } from './utils';
export type {
  SwapParams,
  BuyParams,
  SellParams,
  PoolState,
  SwapQuote,
} from './types';
```

### 5. Create Parent Namespace (`src/{dex}/namespace.ts`)

Parent namespace that exposes product namespaces:

```typescript
import type { TransactionBuilder } from '../builder';
import { ProductNamespace } from './product';

export class DexNamespace {
  private builder: TransactionBuilder;
  private _product?: ProductNamespace;

  constructor(builder: TransactionBuilder) {
    this.builder = builder;
  }

  get product(): ProductNamespace {
    if (!this._product) {
      this._product = new ProductNamespace(this.builder);
    }
    return this._product;
  }

  // Future products:
  // get anotherProduct(): AnotherProductNamespace { ... }
}
```

### 6. Create DEX Exports (`src/{dex}/index.ts`)

```typescript
export { DexNamespace } from './namespace';
export { ProductNamespace, Utils } from './product';
export type {
  SwapParams,
  BuyParams,
  SellParams,
  PoolState,
  SwapQuote,
} from './product';
```

### 7. Integrate with TransactionBuilder (`src/builder.ts`)

Add lazy-initialized getter:

```typescript
import { DexNamespace } from './{dex}';

export class TransactionBuilder {
  private _dexNamespace?: DexNamespace;

  get dex(): DexNamespace {
    if (!this._dexNamespace) {
      this._dexNamespace = new DexNamespace(this);
    }
    return this._dexNamespace;
  }

  reset(): this {
    // ... existing reset code
    this._dexNamespace = undefined;
    return this;
  }
}
```

### 8. Update Exports (`src/index.ts`)

```typescript
// Namespace classes
export { DexNamespace, ProductNamespace } from './{dex}';

// Static utilities
export { Utils as ProductUtils } from './{dex}';

// Types
export type {
  SwapParams,
  BuyParams,
  SellParams,
  PoolState,
  SwapQuote,
} from './{dex}';
```

### 9. Update package.json

Add optional peer dependency:

```json
{
  "peerDependencies": {
    "some-dex-sdk": "^1.0.0"
  },
  "peerDependenciesMeta": {
    "some-dex-sdk": {
      "optional": true
    }
  },
  "devDependencies": {
    "some-dex-sdk": "^1.0.0"
  }
}
```

## Best Practices

### Dynamic Imports

Always use dynamic imports for DEX SDKs:

```typescript
// Good - lazy loaded
async swap(params) {
  const { SomeSDK } = await import('some-dex-sdk');
  // ...
}

// Bad - forces dependency on load
import { SomeSDK } from 'some-dex-sdk';
```

### Type Safety

Use type assertions sparingly when SDK types don't match:

```typescript
// When SDK types are complex/dynamic
const swapTx = await client.swap(params as any);
```

### Error Messages

Provide clear error messages:

```typescript
if (!poolState) {
  throw new Error(`Pool not found: ${address.toBase58()}`);
}

if (!this._connection) {
  throw new ExecutionError(
    'Connection not configured. Set the connection option when creating LysFlash client.',
    ErrorCode.INVALID_REQUEST,
    'CLIENT'
  );
}
```

### Address Normalization

Always accept both string and PublicKey:

```typescript
const address = typeof params.pool === 'string'
  ? new PublicKey(params.pool)
  : params.pool;
```

### Amount Conversion

Support both number and BN:

```typescript
const amountIn = BN.isBN(params.amountIn)
  ? params.amountIn
  : new BN(params.amountIn);
```

## Testing

### Unit Tests

Test namespace methods with mocked SDK:

```typescript
describe('ProductNamespace', () => {
  it('should build swap transaction', async () => {
    // Mock SDK
    jest.mock('some-dex-sdk', () => ({
      SomeSDKClient: jest.fn().mockImplementation(() => ({
        swap: jest.fn().mockResolvedValue(mockTransaction),
      })),
    }));

    const builder = new TransactionBuilder(mockClient);
    const result = await builder.dex.product.buy({
      pool: 'POOL',
      user: 'USER',
      solAmountIn: 1_000_000_000,
      minTokensOut: 1000000,
    });

    expect(result.operations).toHaveLength(1);
  });
});
```

### Integration Tests

Test with real DEX SDK on devnet/mainnet:

```typescript
describe('Product Integration', () => {
  it('should fetch pool state', async () => {
    const pool = await Utils.getPool(connection, REAL_POOL_ADDRESS);
    expect(pool.address.toBase58()).toBe(REAL_POOL_ADDRESS);
  });
});
```

## Documentation

Create `{DEX}_{PRODUCT}.md` with:
1. Installation instructions
2. Quick start example
3. API reference for all methods
4. Type definitions
5. Error handling guide
6. Best practices

## Checklist

- [ ] Create `src/{dex}/{product}/types.ts`
- [ ] Create `src/{dex}/{product}/utils.ts`
- [ ] Create `src/{dex}/{product}/namespace.ts`
- [ ] Create `src/{dex}/{product}/index.ts`
- [ ] Create `src/{dex}/namespace.ts`
- [ ] Create `src/{dex}/index.ts`
- [ ] Update `src/builder.ts` with namespace getter
- [ ] Update `src/index.ts` with exports
- [ ] Update `package.json` with peer dependency
- [ ] Create `examples/{dex}-{product}-usage.ts`
- [ ] Create `{DEX}_{PRODUCT}.md` documentation
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Run `npm run build` to verify
- [ ] Run `npm run typecheck` to verify types
