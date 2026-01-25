/**
 * Raydium CPMM Namespace
 *
 * Transaction builder namespace for Raydium CPMM (Constant Product Market Maker) operations.
 *
 * @module raydium/cpmm/namespace
 */

import type { Connection } from '@solana/web3.js';
import { PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import type { TransactionBuilder } from '../../builder';
import type { LysFlash } from '../../client';
import type {
  RaydiumCPMMSwapParams,
  RaydiumCPMMSwapExactOutParams,
  RaydiumCPMMBuyParams,
  RaydiumCPMMSellParams,
  RaydiumCPMMBuyExactOutParams,
  RaydiumCPMMSellExactOutParams,
} from './types';
import { SOL_MINT } from './types';

/**
 * Raydium CPMM Namespace
 *
 * Provides methods for building CPMM swap transactions.
 *
 * @example
 * ```typescript
 * const builder = await new TransactionBuilder(client)
 *   .raydium.cpmm.buy({
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
export class RaydiumCPMMNamespace {
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
   * Execute a CPMM swap operation (ExactIn)
   *
   * @param params - Swap parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.cpmm.swap({
   *     pool: poolAddress,
   *     user: userWallet,
   *     inputMint: SOL_MINT,
   *     outputMint: tokenMint,
   *     amountIn: 1_000_000_000,
   *     minimumAmountOut: 1000000,
   *   });
   * ```
   */
  async swap(params: RaydiumCPMMSwapParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();

    const { Raydium, TxVersion } = await import('@raydium-io/raydium-sdk-v2');

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

    // Get pool info
    const data = await raydium.cpmm.getPoolInfoFromRpc(poolAddress.toBase58());
    if (!data) {
      throw new Error(`CPMM pool not found: ${poolAddress.toBase58()}`);
    }

    const { poolInfo, poolKeys } = data;

    // Determine swap direction
    const baseIn = inputMint.toBase58() === poolInfo.mintA.address;

    // Build swap transaction
    const result = await raydium.cpmm.swap({
      poolInfo,
      poolKeys,
      inputAmount: amountIn,
      swapResult: {
        inputAmount: amountIn,
        outputAmount: minimumAmountOut,
      },
      slippage: 0, // We already applied slippage in minimumAmountOut
      baseIn,
      txVersion: TxVersion.LEGACY,
    });

    return this.builder.rawTransaction({
      transaction: result.transaction as Transaction,
      additionalSigners: [],
    });
  }

  /**
   * Execute a CPMM swap operation (ExactOut)
   *
   * @param params - Swap parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.cpmm.swapExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     inputMint: SOL_MINT,
   *     outputMint: tokenMint,
   *     amountOut: 1000000,
   *     maximumAmountIn: 1_000_000_000,
   *   });
   * ```
   */
  async swapExactOut(params: RaydiumCPMMSwapExactOutParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();

    const { Raydium, TxVersion } = await import('@raydium-io/raydium-sdk-v2');

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

    // Get pool info
    const data = await raydium.cpmm.getPoolInfoFromRpc(poolAddress.toBase58());
    if (!data) {
      throw new Error(`CPMM pool not found: ${poolAddress.toBase58()}`);
    }

    const { poolInfo, poolKeys } = data;

    // Determine swap direction (baseIn = false means we're outputting base token)
    const baseIn = outputMint.toBase58() !== poolInfo.mintA.address;

    // Build swap transaction with baseOut mode
    const result = await raydium.cpmm.swap({
      poolInfo,
      poolKeys,
      inputAmount: maximumAmountIn,
      swapResult: {
        inputAmount: maximumAmountIn,
        outputAmount: amountOut,
      },
      slippage: 0,
      baseIn,
      fixedOut: true,
      txVersion: TxVersion.LEGACY,
    });

    return this.builder.rawTransaction({
      transaction: result.transaction as Transaction,
      additionalSigners: [],
    });
  }

  /**
   * Buy tokens with SOL on CPMM
   *
   * @param params - Buy parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.cpmm.buy({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     solAmountIn: 1_000_000_000, // 1 SOL
   *     minTokensOut: 1000000,
   *   });
   * ```
   */
  async buy(params: RaydiumCPMMBuyParams): Promise<TransactionBuilder> {
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
   * Sell tokens for SOL on CPMM
   *
   * @param params - Sell parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.cpmm.sell({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     tokenAmountIn: 1_000_000,
   *     minSolOut: 900_000_000,
   *   });
   * ```
   */
  async sell(params: RaydiumCPMMSellParams): Promise<TransactionBuilder> {
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
   * Buy exact amount of tokens with SOL on CPMM
   *
   * @param params - Buy exact out parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.cpmm.buyExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     amountOut: 1_000_000, // Exact tokens to receive
   *     maximumAmountIn: 1_100_000_000, // Max SOL to spend
   *   });
   * ```
   */
  async buyExactOut(params: RaydiumCPMMBuyExactOutParams): Promise<TransactionBuilder> {
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
   * Sell tokens for exact amount of SOL on CPMM
   *
   * @param params - Sell exact out parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.cpmm.sellExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     amountOut: 1_000_000_000, // Exact SOL to receive
   *     maximumAmountIn: 1_100_000, // Max tokens to spend
   *   });
   * ```
   */
  async sellExactOut(params: RaydiumCPMMSellExactOutParams): Promise<TransactionBuilder> {
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
