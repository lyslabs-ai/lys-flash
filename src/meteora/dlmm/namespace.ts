/**
 * Meteora DLMM Namespace
 *
 * Provides methods for interacting with Meteora DLMM pools.
 * Transactions are built using the Meteora SDK and sent via rawTransaction().
 *
 * @module meteora/dlmm/namespace
 */

import type { Connection, Transaction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import type { TransactionBuilder } from '../../builder';
import type { LysFlash } from '../../client';
import type {
  DLMMSwapParams,
  DLMMSwapExactOutParams,
  DLMMBuyParams,
  DLMMSellParams,
  DLMMBuyExactOutParams,
  DLMMSellExactOutParams,
} from './types';
import { SOL_MINT } from './types';

// Type alias for SDK's bundled Connection type
type SDKConnection = Parameters<typeof import('@meteora-ag/dlmm').default.create>[0];

/**
 * DLMM Namespace
 *
 * Provides methods for swapping tokens on Meteora DLMM pools.
 * DLMM pools use concentrated liquidity with discrete price bins.
 *
 * @example
 * ```typescript
 * // Buy tokens with SOL
 * const builder = await new TransactionBuilder(client)
 *   .meteora.dlmm.buy({
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
export class DLMMNamespace {
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
   * Execute a swap on Meteora DLMM
   *
   * Generic swap with explicit input/output token specification.
   * Bin arrays are fetched automatically.
   *
   * @param params - Swap parameters
   * @returns TransactionBuilder for chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dlmm.swap({
   *     pool: poolAddress,
   *     user: wallet,
   *     inputMint: SOL_MINT,
   *     outputMint: tokenMint,
   *     amountIn: 1_000_000_000,
   *     minimumAmountOut: 1000000,
   *   });
   * ```
   */
  async swap(params: DLMMSwapParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();

    // Dynamic import to support optional peer dependency
    const DLMM = (await import('@meteora-ag/dlmm')).default;

    // Convert parameters
    const poolAddress =
      typeof params.pool === 'string' ? new PublicKey(params.pool) : params.pool;
    const user =
      typeof params.user === 'string' ? new PublicKey(params.user) : params.user;
    const inputMint =
      typeof params.inputMint === 'string'
        ? new PublicKey(params.inputMint)
        : params.inputMint;
    const outputMint =
      typeof params.outputMint === 'string'
        ? new PublicKey(params.outputMint)
        : params.outputMint;
    const amountIn =
      typeof params.amountIn === 'number' ? new BN(params.amountIn) : params.amountIn;
    const minimumAmountOut =
      typeof params.minimumAmountOut === 'number'
        ? new BN(params.minimumAmountOut)
        : params.minimumAmountOut;

    // Create pool instance (type assertion for SDK's bundled @solana/web3.js)
    const pool = await DLMM.create(
      connection as unknown as SDKConnection,
      poolAddress
    );

    // Determine swap direction
    const swapForY = inputMint.equals(new PublicKey(pool.tokenX.publicKey));

    // Get bin arrays needed for swap
    const binArrays = await pool.getBinArrayForSwap(swapForY);
    const binArraysPubkey = binArrays.map(
      (bin: { publicKey: PublicKey }) => bin.publicKey
    );

    // Build swap transaction
    const swapTx = await pool.swap({
      inToken: inputMint as unknown as Parameters<typeof pool.swap>[0]['inToken'],
      outToken: outputMint as unknown as Parameters<typeof pool.swap>[0]['outToken'],
      inAmount: amountIn,
      minOutAmount: minimumAmountOut,
      lbPair: poolAddress as unknown as Parameters<typeof pool.swap>[0]['lbPair'],
      user: user as unknown as Parameters<typeof pool.swap>[0]['user'],
      binArraysPubkey: binArraysPubkey as unknown as Parameters<
        typeof pool.swap
      >[0]['binArraysPubkey'],
    });

    // Wrap in rawTransaction (type assertion for SDK's Transaction type)
    return this.builder.rawTransaction({
      transaction: swapTx as unknown as Transaction,
    });
  }

  /**
   * Execute a swap with exact output on Meteora DLMM
   *
   * Swap targeting exact output amount.
   *
   * @param params - Swap parameters
   * @returns TransactionBuilder for chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dlmm.swapExactOut({
   *     pool: poolAddress,
   *     user: wallet,
   *     inputMint: SOL_MINT,
   *     outputMint: tokenMint,
   *     amountOut: 1000000,
   *     maximumAmountIn: 2_000_000_000,
   *   });
   * ```
   */
  async swapExactOut(params: DLMMSwapExactOutParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();

    // Dynamic import to support optional peer dependency
    const DLMM = (await import('@meteora-ag/dlmm')).default;

    // Convert parameters
    const poolAddress =
      typeof params.pool === 'string' ? new PublicKey(params.pool) : params.pool;
    const user =
      typeof params.user === 'string' ? new PublicKey(params.user) : params.user;
    const inputMint =
      typeof params.inputMint === 'string'
        ? new PublicKey(params.inputMint)
        : params.inputMint;
    const outputMint =
      typeof params.outputMint === 'string'
        ? new PublicKey(params.outputMint)
        : params.outputMint;
    const amountOut =
      typeof params.amountOut === 'number' ? new BN(params.amountOut) : params.amountOut;
    const maximumAmountIn =
      typeof params.maximumAmountIn === 'number'
        ? new BN(params.maximumAmountIn)
        : params.maximumAmountIn;

    // Create pool instance (type assertion for SDK's bundled @solana/web3.js)
    const pool = await DLMM.create(
      connection as unknown as SDKConnection,
      poolAddress
    );

    // Determine swap direction
    const swapForY = inputMint.equals(new PublicKey(pool.tokenX.publicKey));

    // Get bin arrays needed for swap
    const binArrays = await pool.getBinArrayForSwap(swapForY);
    const binArraysPubkey = binArrays.map(
      (bin: { publicKey: PublicKey }) => bin.publicKey
    );

    // Build swap exact out transaction
    const swapTx = await pool.swapExactOut({
      inToken: inputMint as unknown as Parameters<typeof pool.swapExactOut>[0]['inToken'],
      outToken: outputMint as unknown as Parameters<
        typeof pool.swapExactOut
      >[0]['outToken'],
      outAmount: amountOut,
      maxInAmount: maximumAmountIn,
      lbPair: poolAddress as unknown as Parameters<typeof pool.swapExactOut>[0]['lbPair'],
      user: user as unknown as Parameters<typeof pool.swapExactOut>[0]['user'],
      binArraysPubkey: binArraysPubkey as unknown as Parameters<
        typeof pool.swapExactOut
      >[0]['binArraysPubkey'],
    });

    // Wrap in rawTransaction (type assertion for SDK's Transaction type)
    return this.builder.rawTransaction({
      transaction: swapTx as unknown as Transaction,
    });
  }

  /**
   * Buy tokens with SOL on Meteora DLMM
   *
   * Convenience method that determines the correct input/output mints
   * and builds a swap transaction.
   *
   * @param params - Buy parameters
   * @returns TransactionBuilder for chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dlmm.buy({
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
  async buy(params: DLMMBuyParams): Promise<TransactionBuilder> {
    // Buy = swap SOL for tokens
    return this.swap({
      pool: params.pool,
      user: params.user,
      inputMint: SOL_MINT,
      outputMint: params.tokenMint,
      amountIn: params.solAmountIn,
      minimumAmountOut: params.minTokensOut,
    });
  }

  /**
   * Sell tokens for SOL on Meteora DLMM
   *
   * Convenience method that determines the correct input/output mints
   * and builds a swap transaction.
   *
   * @param params - Sell parameters
   * @returns TransactionBuilder for chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dlmm.sell({
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
  async sell(params: DLMMSellParams): Promise<TransactionBuilder> {
    // Sell = swap tokens for SOL
    return this.swap({
      pool: params.pool,
      user: params.user,
      inputMint: params.tokenMint,
      outputMint: SOL_MINT,
      amountIn: params.tokenAmountIn,
      minimumAmountOut: params.minSolOut,
    });
  }

  /**
   * Buy exact amount of tokens on Meteora DLMM
   *
   * @param params - Buy exact out parameters
   * @returns TransactionBuilder for chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dlmm.buyExactOut({
   *     pool: poolAddress,
   *     user: wallet,
   *     tokenMint: tokenAddress,
   *     tokensOut: 1000000,
   *     maxSolIn: 2_000_000_000,
   *   });
   * ```
   */
  async buyExactOut(params: DLMMBuyExactOutParams): Promise<TransactionBuilder> {
    return this.swapExactOut({
      pool: params.pool,
      user: params.user,
      inputMint: SOL_MINT,
      outputMint: params.tokenMint,
      amountOut: params.tokensOut,
      maximumAmountIn: params.maxSolIn,
    });
  }

  /**
   * Sell tokens for exact amount of SOL on Meteora DLMM
   *
   * @param params - Sell exact out parameters
   * @returns TransactionBuilder for chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dlmm.sellExactOut({
   *     pool: poolAddress,
   *     user: wallet,
   *     tokenMint: tokenAddress,
   *     solOut: 1_000_000_000,
   *     maxTokensIn: 2000000,
   *   });
   * ```
   */
  async sellExactOut(params: DLMMSellExactOutParams): Promise<TransactionBuilder> {
    return this.swapExactOut({
      pool: params.pool,
      user: params.user,
      inputMint: params.tokenMint,
      outputMint: SOL_MINT,
      amountOut: params.solOut,
      maximumAmountIn: params.maxTokensIn,
    });
  }
}
