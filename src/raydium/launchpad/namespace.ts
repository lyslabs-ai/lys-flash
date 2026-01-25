/**
 * Raydium LaunchPad Namespace
 *
 * Transaction builder namespace for Raydium LaunchPad (Bonding Curve) operations.
 *
 * @module raydium/launchpad/namespace
 */

import type { Connection } from '@solana/web3.js';
import { PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import type { TransactionBuilder } from '../../builder';
import type { LysFlash } from '../../client';
import type {
  RaydiumLaunchPadSwapParams,
  RaydiumLaunchPadBuyParams,
  RaydiumLaunchPadSellParams,
} from './types';

/**
 * Raydium LaunchPad Namespace
 *
 * Provides methods for building LaunchPad swap transactions.
 *
 * @example
 * ```typescript
 * const builder = await new TransactionBuilder(client)
 *   .raydium.launchpad.buy({
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
export class RaydiumLaunchPadNamespace {
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
   * Execute a LaunchPad swap operation
   *
   * @param params - Swap parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.launchpad.swap({
   *     pool: poolAddress,
   *     user: userWallet,
   *     amountIn: 1_000_000_000,
   *     minimumAmountOut: 1000000,
   *     direction: 'buy',
   *   });
   * ```
   */
  async swap(params: RaydiumLaunchPadSwapParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();

    const { Raydium, TxVersion, LAUNCHPAD_PROGRAM } =
      await import('@raydium-io/raydium-sdk-v2');

    // Token program IDs
    const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

    const raydium = await Raydium.load({
      connection,
      cluster: 'mainnet',
      disableFeatureCheck: true,
    });

    const poolAddress =
      typeof params.pool === 'string' ? new PublicKey(params.pool) : params.pool;
    const amountIn = BN.isBN(params.amountIn) ? params.amountIn : new BN(params.amountIn);

    const shareFeeReceiver = params.shareFeeReceiver
      ? typeof params.shareFeeReceiver === 'string'
        ? new PublicKey(params.shareFeeReceiver)
        : params.shareFeeReceiver
      : undefined;

    const isBuy = params.direction === 'buy';

    // Get pool info
    const poolInfo = await raydium.launchpad.getRpcPoolInfo({ poolId: poolAddress });

    if (!poolInfo) {
      throw new Error(`LaunchPad pool not found: ${poolAddress.toBase58()}`);
    }

    // Get mint info for token program
    const mintInfo = await connection.getAccountInfo(poolInfo.mintA);
    const mintAProgram =
      mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

    // Build swap transaction
    let result;
    if (isBuy) {
      result = await raydium.launchpad.buyToken({
        programId: LAUNCHPAD_PROGRAM,
        mintA: poolInfo.mintA,
        mintAProgram,
        poolInfo,
        configInfo: poolInfo.configInfo,
        buyAmount: amountIn,
        slippage: new BN(100), // 1% slippage in basis points
        shareFeeReceiver,
        txVersion: TxVersion.LEGACY,
      });
    } else {
      result = await raydium.launchpad.sellToken({
        programId: LAUNCHPAD_PROGRAM,
        mintA: poolInfo.mintA,
        mintAProgram,
        poolInfo,
        configInfo: poolInfo.configInfo,
        sellAmount: amountIn,
        slippage: new BN(100), // 1% slippage in basis points
        shareFeeReceiver,
        txVersion: TxVersion.LEGACY,
      });
    }

    return this.builder.rawTransaction({
      transaction: result.transaction as Transaction,
      additionalSigners: [],
    });
  }

  /**
   * Buy tokens with SOL on LaunchPad
   *
   * Convenience method for buying tokens with SOL.
   *
   * @param params - Buy parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.launchpad.buy({
   *     pool: poolAddress,
   *     user: userWallet,
   *     solAmountIn: 1_000_000_000, // 1 SOL
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
  async buy(params: RaydiumLaunchPadBuyParams): Promise<TransactionBuilder> {
    return this.swap({
      pool: params.pool,
      user: params.user,
      amountIn: params.solAmountIn,
      minimumAmountOut: params.minTokensOut,
      direction: 'buy',
      shareFeeReceiver: params.shareFeeReceiver,
    });
  }

  /**
   * Sell tokens for SOL on LaunchPad
   *
   * Convenience method for selling tokens for SOL.
   *
   * @param params - Sell parameters
   * @returns TransactionBuilder for method chaining
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .raydium.launchpad.sell({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenAmountIn: 1_000_000, // 1M tokens
   *     minSolOut: 900_000_000, // Min 0.9 SOL
   *   });
   *
   * const result = await builder
   *   .setFeePayer(userWallet)
   *   .setTransport('FLASH')
   *   .setBribe(1_000_000)
   *   .send();
   * ```
   */
  async sell(params: RaydiumLaunchPadSellParams): Promise<TransactionBuilder> {
    return this.swap({
      pool: params.pool,
      user: params.user,
      amountIn: params.tokenAmountIn,
      minimumAmountOut: params.minSolOut,
      direction: 'sell',
      shareFeeReceiver: params.shareFeeReceiver,
    });
  }
}
