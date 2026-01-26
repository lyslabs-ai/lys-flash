/**
 * Raydium AMMv4 Namespace
 *
 * Transaction builder namespace for Raydium AMMv4 (V4 AMM with OpenBook) operations.
 *
 * @module raydium/ammv4/namespace
 */

import type { Connection } from '@solana/web3.js';
import { PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import type { TransactionBuilder } from '../../builder';
import type { LysFlash } from '../../client';
import type {
  RaydiumAMMv4SwapParams,
  RaydiumAMMv4SwapExactOutParams,
  RaydiumAMMv4BuyParams,
  RaydiumAMMv4SellParams,
  RaydiumAMMv4BuyExactOutParams,
  RaydiumAMMv4SellExactOutParams,
} from './types';
import { SOL_MINT } from './types';

/**
 * Raydium AMMv4 Namespace
 *
 * Provides methods for building AMMv4 swap transactions.
 *
 * @example
 * ```typescript
 * const builder = await new TransactionBuilder(client)
 *   .raydium.ammv4.buy({
 *     pool: poolAddress,
 *     user: userWallet,
 *     tokenMint: tokenAddress,
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
export class RaydiumAMMv4Namespace {
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

  /**
   * Execute an AMMv4 swap operation (ExactIn)
   *
   * @param params - Swap parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.ammv4.swap({
   *     pool: poolAddress,
   *     user: userWallet,
   *     inputMint: SOL_MINT,
   *     outputMint: tokenMint,
   *     amountIn: 1_000_000_000,
   *     minimumAmountOut: 1000000,
   *   });
   * ```
   */
  async swap(params: RaydiumAMMv4SwapParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();

    const { Raydium, TxVersion } = await import('@raydium-io/raydium-sdk-v2');

    const user =
      typeof params.user === 'string' ? new PublicKey(params.user) : params.user;

    const raydium = await Raydium.load({
      connection,
      cluster: 'mainnet',
      disableFeatureCheck: true,
      owner: user,
    });

    const poolAddress =
      typeof params.pool === 'string' ? new PublicKey(params.pool) : params.pool;
    const inputMint =
      typeof params.inputMint === 'string'
        ? new PublicKey(params.inputMint)
        : params.inputMint;
    const amountIn = BN.isBN(params.amountIn) ? params.amountIn : new BN(params.amountIn);
    const minimumAmountOut = BN.isBN(params.minimumAmountOut)
      ? params.minimumAmountOut
      : new BN(params.minimumAmountOut);

    // Get pool info
    const data = await raydium.liquidity.getPoolInfoFromRpc({ poolId: poolAddress.toBase58() });
    if (!data) {
      throw new Error(`AMMv4 pool not found: ${poolAddress.toBase58()}`);
    }

    const { poolInfo, poolKeys } = data;

    // Build swap transaction
    const result = await raydium.liquidity.swap({
      poolInfo,
      poolKeys,
      amountIn,
      amountOut: minimumAmountOut,
      fixedSide: 'in',
      inputMint: inputMint.toBase58(),
      txVersion: TxVersion.LEGACY,
    });

    return this.builder.rawTransaction({
      transaction: result.transaction as Transaction,
      additionalSigners: [],
    });
  }

  /**
   * Execute an AMMv4 swap operation (ExactOut)
   *
   * @param params - Swap parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.ammv4.swapExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     inputMint: SOL_MINT,
   *     outputMint: tokenMint,
   *     amountOut: 1000000,
   *     maximumAmountIn: 1_000_000_000,
   *   });
   * ```
   */
  async swapExactOut(params: RaydiumAMMv4SwapExactOutParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();

    const { Raydium, TxVersion } = await import('@raydium-io/raydium-sdk-v2');

    const user =
      typeof params.user === 'string' ? new PublicKey(params.user) : params.user;

    const raydium = await Raydium.load({
      connection,
      cluster: 'mainnet',
      disableFeatureCheck: true,
      owner: user,
    });

    const poolAddress =
      typeof params.pool === 'string' ? new PublicKey(params.pool) : params.pool;
    const inputMint =
      typeof params.inputMint === 'string'
        ? new PublicKey(params.inputMint)
        : params.inputMint;
    const amountOut = BN.isBN(params.amountOut) ? params.amountOut : new BN(params.amountOut);
    const maximumAmountIn = BN.isBN(params.maximumAmountIn)
      ? params.maximumAmountIn
      : new BN(params.maximumAmountIn);

    // Get pool info
    const data = await raydium.liquidity.getPoolInfoFromRpc({ poolId: poolAddress.toBase58() });
    if (!data) {
      throw new Error(`AMMv4 pool not found: ${poolAddress.toBase58()}`);
    }

    const { poolInfo, poolKeys } = data;

    // Build swap transaction with fixedSide: 'out'
    const result = await raydium.liquidity.swap({
      poolInfo,
      poolKeys,
      amountIn: maximumAmountIn,
      amountOut,
      fixedSide: 'out',
      inputMint: inputMint.toBase58(),
      txVersion: TxVersion.LEGACY,
    });

    return this.builder.rawTransaction({
      transaction: result.transaction as Transaction,
      additionalSigners: [],
    });
  }

  /**
   * Buy tokens with SOL on AMMv4
   *
   * @param params - Buy parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.ammv4.buy({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     solAmountIn: 1_000_000_000, // 1 SOL
   *     minTokensOut: 1000000,
   *   });
   * ```
   */
  async buy(params: RaydiumAMMv4BuyParams): Promise<TransactionBuilder> {
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
   * Sell tokens for SOL on AMMv4
   *
   * @param params - Sell parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.ammv4.sell({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     tokenAmountIn: 1_000_000,
   *     minSolOut: 900_000_000,
   *   });
   * ```
   */
  async sell(params: RaydiumAMMv4SellParams): Promise<TransactionBuilder> {
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
   * Buy exact amount of tokens with SOL on AMMv4
   *
   * @param params - Buy exact out parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.ammv4.buyExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     amountOut: 1_000_000, // Exact tokens to receive
   *     maximumAmountIn: 1_100_000_000, // Max SOL to spend
   *   });
   * ```
   */
  async buyExactOut(params: RaydiumAMMv4BuyExactOutParams): Promise<TransactionBuilder> {
    return this.swapExactOut({
      pool: params.pool,
      user: params.user,
      inputMint: SOL_MINT,
      outputMint: params.tokenMint,
      amountOut: params.amountOut,
      maximumAmountIn: params.maximumAmountIn,
    });
  }

  /**
   * Sell tokens for exact amount of SOL on AMMv4
   *
   * @param params - Sell exact out parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.ammv4.sellExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     amountOut: 1_000_000_000, // Exact SOL to receive
   *     maximumAmountIn: 1_100_000, // Max tokens to spend
   *   });
   * ```
   */
  async sellExactOut(params: RaydiumAMMv4SellExactOutParams): Promise<TransactionBuilder> {
    return this.swapExactOut({
      pool: params.pool,
      user: params.user,
      inputMint: params.tokenMint,
      outputMint: SOL_MINT,
      amountOut: params.amountOut,
      maximumAmountIn: params.maximumAmountIn,
    });
  }
}
