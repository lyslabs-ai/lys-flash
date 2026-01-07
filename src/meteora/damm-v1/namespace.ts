/**
 * Meteora DAMM v1 Namespace
 *
 * Provides methods for interacting with Meteora Dynamic AMM v1 pools.
 * Transactions are built using the Meteora SDK and sent via rawTransaction().
 *
 * @module meteora/damm-v1/namespace
 */

import type { Connection, Transaction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import type { TransactionBuilder } from '../../builder';
import type { LysFlash } from '../../client';
import type { DAMMv1SwapParams, DAMMv1BuyParams, DAMMv1SellParams } from './types';
import { SOL_MINT } from './types';

// Type alias for SDK's bundled Connection type
type SDKConnection = Parameters<typeof import('@meteora-ag/dynamic-amm-sdk').default.create>[0];

/**
 * DAMM v1 Namespace
 *
 * Provides methods for swapping tokens on Meteora Dynamic AMM v1 pools.
 *
 * @example
 * ```typescript
 * // Buy tokens with SOL
 * const builder = await new TransactionBuilder(client)
 *   .meteora.dammV1.buy({
 *     pool: poolAddress,
 *     user: wallet,
 *     tokenMint: tokenAddress,
 *     solAmountIn: 1_000_000_000,
 *     minTokensOut: 1000000,
 *   });
 *
 * const result = await builder
 *   .setFeePayer(wallet)
 *   .setTransport('FLASH')
 *   .setBribe(1_000_000)
 *   .send();
 * ```
 */
export class DAMMv1Namespace {
  private builder: TransactionBuilder;

  constructor(builder: TransactionBuilder) {
    this.builder = builder;
  }

  /**
   * Get the LysFlash client from the builder
   */
  private getClient(): LysFlash {
    // Access private member via casting
    const client = (this.builder as unknown as { client: LysFlash }).client;
    if (!client) {
      throw new Error('Client not configured on TransactionBuilder');
    }
    return client;
  }

  /**
   * Get the connection from the client
   */
  private getConnection(): Connection {
    const client = this.getClient();
    const connection = client.getConnection();
    if (!connection) {
      throw new Error(
        'Connection not configured on LysFlash client. ' +
          'Please provide a connection when creating the client: ' +
          'new LysFlash({ address, connection })'
      );
    }
    return connection;
  }

  /**
   * Execute a swap on Meteora DAMM v1
   *
   * Generic swap with explicit input mint specification.
   *
   * @param params - Swap parameters
   * @returns TransactionBuilder for chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV1.swap({
   *     pool: poolAddress,
   *     user: wallet,
   *     inputMint: SOL_MINT,
   *     amountIn: 1_000_000_000,
   *     minimumAmountOut: 1000000,
   *   });
   * ```
   */
  async swap(params: DAMMv1SwapParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();

    // Dynamic import to support optional peer dependency
    const AmmImpl = (await import('@meteora-ag/dynamic-amm-sdk')).default;

    // Convert parameters
    const poolAddress =
      typeof params.pool === 'string' ? new PublicKey(params.pool) : params.pool;
    const user =
      typeof params.user === 'string' ? new PublicKey(params.user) : params.user;
    const inputMint =
      typeof params.inputMint === 'string'
        ? new PublicKey(params.inputMint)
        : params.inputMint;
    const amountIn =
      typeof params.amountIn === 'number' ? new BN(params.amountIn) : params.amountIn;
    const minimumAmountOut =
      typeof params.minimumAmountOut === 'number'
        ? new BN(params.minimumAmountOut)
        : params.minimumAmountOut;
    const referralOwner = params.referralOwner
      ? typeof params.referralOwner === 'string'
        ? new PublicKey(params.referralOwner)
        : params.referralOwner
      : undefined;

    // Create pool instance (type assertion for SDK's bundled @solana/web3.js)
    const pool = await AmmImpl.create(
      connection as unknown as SDKConnection,
      poolAddress
    );

    // Build swap transaction (type assertion for SDK's PublicKey/BN types)
    const swapTx = await pool.swap(
      user as unknown as Parameters<typeof pool.swap>[0],
      inputMint as unknown as Parameters<typeof pool.swap>[1],
      amountIn,
      minimumAmountOut,
      referralOwner as unknown as Parameters<typeof pool.swap>[4]
    );

    // Wrap in rawTransaction (type assertion for SDK's Transaction type)
    return this.builder.rawTransaction({
      transaction: swapTx as unknown as Transaction,
    });
  }

  /**
   * Buy tokens with SOL on Meteora DAMM v1
   *
   * Convenience method that determines the correct input mint (SOL)
   * and builds a swap transaction.
   *
   * @param params - Buy parameters
   * @returns TransactionBuilder for chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV1.buy({
   *     pool: poolAddress,
   *     user: wallet,
   *     tokenMint: tokenAddress,
   *     solAmountIn: 1_000_000_000,
   *     minTokensOut: 1000000,
   *   });
   *
   * const result = await builder
   *   .setFeePayer(wallet)
   *   .setPriorityFee(1_000_000)
   *   .setBribe(1_000_000)
   *   .setTransport('FLASH')
   *   .send();
   * ```
   */
  async buy(params: DAMMv1BuyParams): Promise<TransactionBuilder> {
    // Buy = swap SOL for tokens
    return this.swap({
      pool: params.pool,
      user: params.user,
      inputMint: SOL_MINT,
      amountIn: params.solAmountIn,
      minimumAmountOut: params.minTokensOut,
      referralOwner: params.referralOwner,
    });
  }

  /**
   * Sell tokens for SOL on Meteora DAMM v1
   *
   * Convenience method that determines the correct input mint (token)
   * and builds a swap transaction.
   *
   * @param params - Sell parameters
   * @returns TransactionBuilder for chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV1.sell({
   *     pool: poolAddress,
   *     user: wallet,
   *     tokenMint: tokenAddress,
   *     tokenAmountIn: 1000000,
   *     minSolOut: 500_000_000,
   *   });
   *
   * const result = await builder
   *   .setFeePayer(wallet)
   *   .setPriorityFee(1_000_000)
   *   .setBribe(1_000_000)
   *   .setTransport('FLASH')
   *   .send();
   * ```
   */
  async sell(params: DAMMv1SellParams): Promise<TransactionBuilder> {
    // Sell = swap tokens for SOL
    return this.swap({
      pool: params.pool,
      user: params.user,
      inputMint: params.tokenMint,
      amountIn: params.tokenAmountIn,
      minimumAmountOut: params.minSolOut,
      referralOwner: params.referralOwner,
    });
  }
}
