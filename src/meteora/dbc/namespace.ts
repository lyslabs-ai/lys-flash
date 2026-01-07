/**
 * Meteora DBC Namespace
 *
 * Provides methods for interacting with Meteora Dynamic Bonding Curve pools.
 * Transactions are built using the Meteora SDK and sent via rawTransaction().
 *
 * @module meteora/dbc/namespace
 */

import type { Connection, Commitment } from '@solana/web3.js';
import { PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import type { TransactionBuilder } from '../../builder';
import type { LysFlash } from '../../client';
import type {
  DBCSwapParams,
  DBCBuyParams,
  DBCSellParams,
  DBCSwap2Params,
  DBCBuy2Params,
  DBCSell2Params,
  DBCBuyExactOutParams,
  DBCSellExactOutParams,
} from './types';

/**
 * DBC (Dynamic Bonding Curve) Namespace for TransactionBuilder
 *
 * Provides methods for interacting with Meteora Dynamic Bonding Curve pools.
 * All methods build transactions using the Meteora SDK and wrap them with
 * rawTransaction() for execution through the LYS Flash backend.
 *
 * @example
 * ```typescript
 * import { Connection } from '@solana/web3.js';
 * import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';
 *
 * const connection = new Connection('https://api.mainnet-beta.solana.com');
 * const client = new LysFlash({
 *   address: 'ipc:///tmp/tx-executor.ipc',
 *   connection,
 * });
 *
 * // Execute buy via nested namespace: builder.meteora.dbc.buy()
 * const builder = await new TransactionBuilder(client)
 *   .meteora.dbc.buy({
 *     pool: poolAddress,
 *     user: userWallet,
 *     solAmountIn: 1_000_000_000,
 *     minTokensOut: 1000000,
 *   });
 *
 * const result = await builder
 *   .setFeePayer(userWallet)
 *   .setTransport('FLASH')
 *   .setBribe(1_000_000)
 *   .send();
 * ```
 */
export class DBCNamespace {
  private builder: TransactionBuilder;

  /**
   * Create DBCNamespace instance
   * @param builder - Parent TransactionBuilder instance
   */
  constructor(builder: TransactionBuilder) {
    this.builder = builder;
  }

  /**
   * Get the client from the builder
   * @private
   */
  private getClient(): LysFlash {
    return this.builder.getClient();
  }

  /**
   * Get connection from client (pre-configured)
   * @private
   */
  private getConnection(): Connection {
    return this.getClient().requireConnection();
  }

  /**
   * Get commitment from client
   * @private
   */
  private getCommitment(): Commitment {
    return this.getClient().getCommitment();
  }

  // ============================================================================
  // swap() methods (Simple ExactIn only)
  // ============================================================================

  /**
   * Execute a swap on Meteora DBC pool using swap()
   *
   * @param params - Swap parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example Buy tokens (SOL -> Token)
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dbc.swap({
   *     pool: 'PoolAddress...',
   *     user: 'UserWallet...',
   *     amountIn: 1_000_000_000,     // 1 SOL
   *     minimumAmountOut: 1000000,   // Min tokens
   *     direction: 'buy'
   *   });
   * ```
   *
   * @example Sell tokens (Token -> SOL)
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dbc.swap({
   *     pool: 'PoolAddress...',
   *     user: 'UserWallet...',
   *     amountIn: 1000000,           // Token amount
   *     minimumAmountOut: 500000000, // Min 0.5 SOL
   *     direction: 'sell'
   *   });
   * ```
   */
  async swap(params: DBCSwapParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();
    const commitment = this.getCommitment();

    // Dynamic import for optional peer dependency
    const { DynamicBondingCurveClient } = await import(
      '@meteora-ag/dynamic-bonding-curve-sdk'
    );

    const meteoraClient = new DynamicBondingCurveClient(connection, commitment);

    const poolAddress =
      typeof params.pool === 'string' ? new PublicKey(params.pool) : params.pool;

    const userAddress =
      typeof params.user === 'string' ? new PublicKey(params.user) : params.user;

    const amountIn = BN.isBN(params.amountIn)
      ? params.amountIn
      : new BN(params.amountIn);

    const minimumAmountOut = BN.isBN(params.minimumAmountOut)
      ? params.minimumAmountOut
      : new BN(params.minimumAmountOut);

    // swapBaseForQuote: true = sell (Token -> SOL), false = buy (SOL -> Token)
    const swapBaseForQuote = params.direction === 'sell';

    const referralTokenAccount = params.referralTokenAccount
      ? typeof params.referralTokenAccount === 'string'
        ? new PublicKey(params.referralTokenAccount)
        : params.referralTokenAccount
      : null;

    // Build swap transaction using Meteora SDK
    const swapTx: Transaction = await meteoraClient.pool.swap({
      amountIn,
      minimumAmountOut,
      swapBaseForQuote,
      owner: userAddress,
      pool: poolAddress,
      referralTokenAccount,
    });

    // Add as raw transaction
    return this.builder.rawTransaction({
      transaction: swapTx,
      additionalSigners: [],
    });
  }

  /**
   * Buy tokens on Meteora DBC pool (convenience method using swap)
   *
   * @param params - Buy parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dbc.buy({
   *     pool: poolAddress,
   *     user: userWallet,
   *     solAmountIn: 1_000_000_000,  // 1 SOL
   *     minTokensOut: 1000000        // Min tokens
   *   });
   *
   * const result = await builder
   *   .setFeePayer(userWallet)
   *   .setTransport('FLASH')
   *   .setBribe(1_000_000)
   *   .send();
   * ```
   */
  async buy(params: DBCBuyParams): Promise<TransactionBuilder> {
    return this.swap({
      pool: params.pool,
      user: params.user,
      amountIn: params.solAmountIn,
      minimumAmountOut: params.minTokensOut,
      direction: 'buy',
      referralTokenAccount: params.referralTokenAccount,
    });
  }

  /**
   * Sell tokens on Meteora DBC pool (convenience method using swap)
   *
   * @param params - Sell parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dbc.sell({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenAmountIn: 1000000,       // Tokens to sell
   *     minSolOut: 500_000_000        // Min 0.5 SOL
   *   });
   *
   * const result = await builder
   *   .setFeePayer(userWallet)
   *   .setTransport('FLASH')
   *   .setBribe(1_000_000)
   *   .send();
   * ```
   */
  async sell(params: DBCSellParams): Promise<TransactionBuilder> {
    return this.swap({
      pool: params.pool,
      user: params.user,
      amountIn: params.tokenAmountIn,
      minimumAmountOut: params.minSolOut,
      direction: 'sell',
      referralTokenAccount: params.referralTokenAccount,
    });
  }

  // ============================================================================
  // swap2() methods (Supports ExactIn, PartialFill, ExactOut)
  // ============================================================================

  /**
   * Execute a swap on Meteora DBC pool using swap2 (advanced with mode selection)
   *
   * Supports three modes:
   * - ExactIn: Swap exact input amount, receive at least minimumAmountOut
   * - PartialFill: Allow partial fills of the order
   * - ExactOut: Swap for exact output amount, pay at most maximumAmountIn
   *
   * @param params - Swap2 parameters (discriminated union based on mode)
   * @returns TransactionBuilder (for method chaining)
   *
   * @example ExactIn mode
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dbc.swap2({
   *     pool: poolAddress,
   *     user: userWallet,
   *     direction: 'buy',
   *     mode: 'ExactIn',
   *     amountIn: 1_000_000_000,
   *     minimumAmountOut: 1000000,
   *   });
   * ```
   *
   * @example ExactOut mode
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dbc.swap2({
   *     pool: poolAddress,
   *     user: userWallet,
   *     direction: 'buy',
   *     mode: 'ExactOut',
   *     amountOut: 1000000,        // Exact tokens desired
   *     maximumAmountIn: 2_000_000_000,  // Max SOL to pay
   *   });
   * ```
   */
  async swap2(params: DBCSwap2Params): Promise<TransactionBuilder> {
    const connection = this.getConnection();
    const commitment = this.getCommitment();

    const { DynamicBondingCurveClient, SwapMode } = await import(
      '@meteora-ag/dynamic-bonding-curve-sdk'
    );

    const meteoraClient = new DynamicBondingCurveClient(connection, commitment);

    const poolAddress =
      typeof params.pool === 'string' ? new PublicKey(params.pool) : params.pool;

    const userAddress =
      typeof params.user === 'string' ? new PublicKey(params.user) : params.user;

    // swapBaseForQuote: true = sell (Token -> SOL), false = buy (SOL -> Token)
    const swapBaseForQuote = params.direction === 'sell';

    const referralTokenAccount = params.referralTokenAccount
      ? typeof params.referralTokenAccount === 'string'
        ? new PublicKey(params.referralTokenAccount)
        : params.referralTokenAccount
      : null;

    // Build swap2 parameters based on mode
    let swap2Params: Record<string, unknown>;

    switch (params.mode) {
      case 'ExactIn': {
        const amountIn = BN.isBN(params.amountIn)
          ? params.amountIn
          : new BN(params.amountIn);
        const minimumAmountOut = BN.isBN(params.minimumAmountOut)
          ? params.minimumAmountOut
          : new BN(params.minimumAmountOut);

        swap2Params = {
          owner: userAddress,
          pool: poolAddress,
          swapBaseForQuote,
          referralTokenAccount,
          swapMode: SwapMode.ExactIn,
          amountIn,
          minimumAmountOut,
        };
        break;
      }

      case 'PartialFill': {
        const amountIn = BN.isBN(params.amountIn)
          ? params.amountIn
          : new BN(params.amountIn);
        const minimumAmountOut = BN.isBN(params.minimumAmountOut)
          ? params.minimumAmountOut
          : new BN(params.minimumAmountOut);

        swap2Params = {
          owner: userAddress,
          pool: poolAddress,
          swapBaseForQuote,
          referralTokenAccount,
          swapMode: SwapMode.PartialFill,
          amountIn,
          minimumAmountOut,
        };
        break;
      }

      case 'ExactOut': {
        const amountOut = BN.isBN(params.amountOut)
          ? params.amountOut
          : new BN(params.amountOut);
        const maximumAmountIn = BN.isBN(params.maximumAmountIn)
          ? params.maximumAmountIn
          : new BN(params.maximumAmountIn);

        swap2Params = {
          owner: userAddress,
          pool: poolAddress,
          swapBaseForQuote,
          referralTokenAccount,
          swapMode: SwapMode.ExactOut,
          amountOut,
          maximumAmountIn,
        };
        break;
      }
    }

    // Build swap2 transaction using Meteora SDK
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const swapTx: Transaction = await meteoraClient.pool.swap2(swap2Params as any);

    // Add as raw transaction
    return this.builder.rawTransaction({
      transaction: swapTx,
      additionalSigners: [],
    });
  }

  /**
   * Buy tokens with ExactIn mode using swap2 (convenience method)
   *
   * @param params - Buy2 parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dbc.buy2({
   *     pool: poolAddress,
   *     user: userWallet,
   *     amountIn: 1_000_000_000,
   *     minimumAmountOut: 1000000,
   *   });
   * ```
   */
  async buy2(params: DBCBuy2Params): Promise<TransactionBuilder> {
    return this.swap2({
      ...params,
      direction: 'buy',
      mode: 'ExactIn',
    });
  }

  /**
   * Sell tokens with ExactIn mode using swap2 (convenience method)
   *
   * @param params - Sell2 parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dbc.sell2({
   *     pool: poolAddress,
   *     user: userWallet,
   *     amountIn: 1000000,
   *     minimumAmountOut: 500_000_000,
   *   });
   * ```
   */
  async sell2(params: DBCSell2Params): Promise<TransactionBuilder> {
    return this.swap2({
      ...params,
      direction: 'sell',
      mode: 'ExactIn',
    });
  }

  /**
   * Buy tokens with ExactOut mode (I want exactly X tokens, pay up to Y SOL)
   *
   * @param params - BuyExactOut parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dbc.buyExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     amountOut: 1000000,         // Exact tokens desired
   *     maximumAmountIn: 2_000_000_000,  // Max SOL to pay
   *   });
   * ```
   */
  async buyExactOut(params: DBCBuyExactOutParams): Promise<TransactionBuilder> {
    return this.swap2({
      ...params,
      direction: 'buy',
      mode: 'ExactOut',
    });
  }

  /**
   * Sell tokens for exact SOL output (I want exactly X SOL, sell up to Y tokens)
   *
   * @param params - SellExactOut parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dbc.sellExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     amountOut: 1_000_000_000,   // Exact SOL desired (1 SOL)
   *     maximumAmountIn: 2000000,   // Max tokens to sell
   *   });
   * ```
   */
  async sellExactOut(params: DBCSellExactOutParams): Promise<TransactionBuilder> {
    return this.swap2({
      ...params,
      direction: 'sell',
      mode: 'ExactOut',
    });
  }
}
