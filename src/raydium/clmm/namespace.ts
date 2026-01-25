/**
 * Raydium CLMM Namespace
 *
 * Transaction builder namespace for Raydium CLMM (Concentrated Liquidity Market Maker) operations.
 *
 * @module raydium/clmm/namespace
 */

import type { Connection } from '@solana/web3.js';
import { PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import type { TransactionBuilder } from '../../builder';
import type { LysFlash } from '../../client';
import type {
  RaydiumCLMMSwapParams,
  RaydiumCLMMSwapExactOutParams,
  RaydiumCLMMBuyParams,
  RaydiumCLMMSellParams,
  RaydiumCLMMBuyExactOutParams,
  RaydiumCLMMSellExactOutParams,
} from './types';
import { SOL_MINT } from './types';

/**
 * Raydium CLMM Namespace
 *
 * Provides methods for building CLMM swap transactions.
 *
 * @example
 * ```typescript
 * const builder = await new TransactionBuilder(client)
 *   .raydium.clmm.buy({
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
export class RaydiumCLMMNamespace {
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
   * Execute a CLMM swap operation (ExactIn)
   *
   * @param params - Swap parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.clmm.swap({
   *     pool: poolAddress,
   *     user: userWallet,
   *     inputMint: SOL_MINT,
   *     outputMint: tokenMint,
   *     amountIn: 1_000_000_000,
   *     minimumAmountOut: 1000000,
   *   });
   * ```
   */
  async swap(params: RaydiumCLMMSwapParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();

    const { Raydium, TxVersion, PoolUtils } = await import('@raydium-io/raydium-sdk-v2');

    const raydium = await Raydium.load({
      connection,
      cluster: 'mainnet',
      disableFeatureCheck: true,
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

    // Get pool info with tick arrays
    const poolId = poolAddress.toBase58();
    const data = await raydium.clmm.getPoolInfoFromRpc(poolId);
    if (!data) {
      throw new Error(`CLMM pool not found: ${poolId}`);
    }

    const { poolInfo, poolKeys, computePoolInfo, tickData } = data;

    // Determine swap direction
    const baseIn = inputMint.toBase58() === poolInfo.mintA.address;

    // Compute amounts and get remaining accounts from tick data
    const epochInfo = await raydium.fetchEpochInfo();
    const tickArrayCache = tickData?.[poolId] || {};
    const { remainingAccounts } = await PoolUtils.computeAmountOutFormat({
      poolInfo: computePoolInfo,
      tickArrayCache,
      amountIn,
      tokenOut: poolInfo[baseIn ? 'mintB' : 'mintA'],
      slippage: 0, // We already applied slippage in minimumAmountOut
      epochInfo,
    });

    // Build swap transaction
    const result = await raydium.clmm.swap({
      poolInfo,
      poolKeys,
      inputMint: inputMint.toBase58(),
      amountIn,
      amountOutMin: minimumAmountOut,
      observationId: computePoolInfo.observationId,
      ownerInfo: {
        useSOLBalance: true,
      },
      remainingAccounts,
      txVersion: TxVersion.LEGACY,
    });

    return this.builder.rawTransaction({
      transaction: result.transaction as Transaction,
      additionalSigners: [],
    });
  }

  /**
   * Execute a CLMM swap operation (ExactOut)
   *
   * @param params - Swap parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.clmm.swapExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     inputMint: SOL_MINT,
   *     outputMint: tokenMint,
   *     amountOut: 1000000,
   *     maximumAmountIn: 1_000_000_000,
   *   });
   * ```
   */
  async swapExactOut(params: RaydiumCLMMSwapExactOutParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();

    const { Raydium, TxVersion, PoolUtils } = await import('@raydium-io/raydium-sdk-v2');

    const raydium = await Raydium.load({
      connection,
      cluster: 'mainnet',
      disableFeatureCheck: true,
    });

    const poolAddress =
      typeof params.pool === 'string' ? new PublicKey(params.pool) : params.pool;
    const outputMint =
      typeof params.outputMint === 'string'
        ? new PublicKey(params.outputMint)
        : params.outputMint;
    const amountOut = BN.isBN(params.amountOut) ? params.amountOut : new BN(params.amountOut);
    const maximumAmountIn = BN.isBN(params.maximumAmountIn)
      ? params.maximumAmountIn
      : new BN(params.maximumAmountIn);

    // Get pool info with tick arrays
    const poolId = poolAddress.toBase58();
    const data = await raydium.clmm.getPoolInfoFromRpc(poolId);
    if (!data) {
      throw new Error(`CLMM pool not found: ${poolId}`);
    }

    const { poolInfo, poolKeys, computePoolInfo, tickData } = data;

    // Determine swap direction (baseIn = false means we're outputting base token)
    const baseOut = outputMint.toBase58() === poolInfo.mintA.address;

    // Compute amounts and get remaining accounts from tick data
    const epochInfo = await raydium.fetchEpochInfo();
    const tickArrayCache = tickData?.[poolId] || {};
    const { remainingAccounts } = await PoolUtils.computeAmountIn({
      poolInfo: computePoolInfo,
      tickArrayCache,
      amountOut,
      baseMint: new PublicKey(poolInfo[baseOut ? 'mintA' : 'mintB'].address),
      slippage: 0, // We already applied slippage in maximumAmountIn
      epochInfo,
    });

    // Build swap transaction using swapBaseOut
    const result = await raydium.clmm.swapBaseOut({
      poolInfo,
      poolKeys,
      outputMint: outputMint.toBase58(),
      amountOut,
      amountInMax: maximumAmountIn,
      observationId: computePoolInfo.observationId,
      ownerInfo: {
        useSOLBalance: true,
      },
      remainingAccounts,
      txVersion: TxVersion.LEGACY,
    });

    return this.builder.rawTransaction({
      transaction: result.transaction as Transaction,
      additionalSigners: [],
    });
  }

  /**
   * Buy tokens with SOL on CLMM
   *
   * @param params - Buy parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.clmm.buy({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     solAmountIn: 1_000_000_000, // 1 SOL
   *     minTokensOut: 1000000,
   *   });
   * ```
   */
  async buy(params: RaydiumCLMMBuyParams): Promise<TransactionBuilder> {
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
   * Sell tokens for SOL on CLMM
   *
   * @param params - Sell parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.clmm.sell({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     tokenAmountIn: 1_000_000,
   *     minSolOut: 900_000_000,
   *   });
   * ```
   */
  async sell(params: RaydiumCLMMSellParams): Promise<TransactionBuilder> {
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
   * Buy exact amount of tokens with SOL on CLMM
   *
   * @param params - Buy exact out parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.clmm.buyExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     amountOut: 1_000_000, // Exact tokens to receive
   *     maximumAmountIn: 1_100_000_000, // Max SOL to spend
   *   });
   * ```
   */
  async buyExactOut(params: RaydiumCLMMBuyExactOutParams): Promise<TransactionBuilder> {
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
   * Sell tokens for exact amount of SOL on CLMM
   *
   * @param params - Sell exact out parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.clmm.sellExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     amountOut: 1_000_000_000, // Exact SOL to receive
   *     maximumAmountIn: 1_100_000, // Max tokens to spend
   *   });
   * ```
   */
  async sellExactOut(params: RaydiumCLMMSellExactOutParams): Promise<TransactionBuilder> {
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
