/**
 * Raydium LaunchPad Utils
 *
 * Static utility functions for Raydium LaunchPad operations.
 * Provides pool data fetching and quote calculations.
 *
 * @module raydium/launchpad/utils
 */

import type { Connection, Commitment } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import type {
  RaydiumLaunchPadPoolState,
  RaydiumLaunchPadSwapQuote,
  RaydiumLaunchPadSwapDirection,
} from './types';

/**
 * Static utility class for Raydium LaunchPad operations
 *
 * @example
 * ```typescript
 * import { Connection } from '@solana/web3.js';
 * import { RaydiumLaunchPadUtils } from '@lyslabs.ai/lys-flash';
 *
 * const connection = new Connection('https://api.mainnet-beta.solana.com');
 *
 * // Get pool state
 * const pool = await RaydiumLaunchPadUtils.getPool(connection, poolAddress);
 * console.log('Base mint:', pool.baseMint.toBase58());
 *
 * // Get buy quote
 * const quote = await RaydiumLaunchPadUtils.getQuote(
 *   connection,
 *   poolAddress,
 *   1_000_000_000, // 1 SOL
 *   'buy',
 *   100 // 1% slippage
 * );
 * console.log('Expected tokens:', quote.amountOut.toString());
 * ```
 */
export class RaydiumLaunchPadUtils {
  /**
   * Get LaunchPad pool state
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool address
   * @param commitment - Commitment level (default: 'confirmed')
   * @returns Pool state information
   * @throws Error if pool not found
   *
   * @example
   * ```typescript
   * const pool = await RaydiumLaunchPadUtils.getPool(
   *   connection,
   *   'PoolAddressHere...'
   * );
   * console.log('Creator:', pool.creator.toBase58());
   * console.log('Virtual base:', pool.virtualBase.toString());
   * ```
   */
  static async getPool(
    connection: Connection,
    poolAddress: string | PublicKey,
    _commitment: Commitment = 'confirmed'
  ): Promise<RaydiumLaunchPadPoolState> {
    const { Raydium } = await import('@raydium-io/raydium-sdk-v2');

    const raydium = await Raydium.load({
      connection,
      cluster: 'mainnet',
      disableFeatureCheck: true,
    });

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;

    const poolInfo = await raydium.launchpad.getRpcPoolInfo({ poolId: address });

    if (!poolInfo) {
      throw new Error(`LaunchPad pool not found: ${address.toBase58()}`);
    }

    return {
      address,
      baseMint: poolInfo.mintA,
      quoteMint: poolInfo.mintB,
      baseVault: poolInfo.vaultA,
      quoteVault: poolInfo.vaultB,
      virtualBase: poolInfo.virtualA,
      virtualQuote: poolInfo.virtualB,
      realBase: poolInfo.realA,
      realQuote: poolInfo.realB,
      status: poolInfo.status,
      creator: poolInfo.creator,
      platformId: poolInfo.platformId,
      configId: poolInfo.configId,
      raw: poolInfo,
    };
  }

  /**
   * Get LaunchPad swap quote
   *
   * Calculate expected output amount for a swap operation.
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool address
   * @param amountIn - Input amount (lamports for buy, token amount for sell)
   * @param direction - Swap direction ('buy' or 'sell')
   * @param slippageBps - Slippage tolerance in basis points (100 = 1%)
   * @param commitment - Commitment level (default: 'confirmed')
   * @returns Swap quote with amounts and fees
   * @throws Error if pool not found
   *
   * @example
   * ```typescript
   * // Get buy quote (SOL -> Token)
   * const buyQuote = await RaydiumLaunchPadUtils.getQuote(
   *   connection,
   *   poolAddress,
   *   1_000_000_000, // 1 SOL
   *   'buy',
   *   100 // 1% slippage
   * );
   *
   * // Get sell quote (Token -> SOL)
   * const sellQuote = await RaydiumLaunchPadUtils.getQuote(
   *   connection,
   *   poolAddress,
   *   1_000_000, // 1M tokens
   *   'sell',
   *   100 // 1% slippage
   * );
   * ```
   */
  static async getQuote(
    connection: Connection,
    poolAddress: string | PublicKey,
    amountIn: number | BN,
    direction: RaydiumLaunchPadSwapDirection,
    slippageBps: number = 100,
    _commitment: Commitment = 'confirmed'
  ): Promise<RaydiumLaunchPadSwapQuote> {
    const { Raydium } = await import('@raydium-io/raydium-sdk-v2');

    const raydium = await Raydium.load({
      connection,
      cluster: 'mainnet',
      disableFeatureCheck: true,
    });

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;
    const amount = BN.isBN(amountIn) ? amountIn : new BN(amountIn);

    const poolInfo = await raydium.launchpad.getRpcPoolInfo({ poolId: address });

    if (!poolInfo) {
      throw new Error(`LaunchPad pool not found: ${address.toBase58()}`);
    }

    const isBuy = direction === 'buy';

    // Calculate quote using bonding curve formula
    // LaunchPad uses constant product formula: (virtualA + realA) * (virtualB + realB) = k
    const virtualA = poolInfo.virtualA;
    const virtualB = poolInfo.virtualB;
    const realA = poolInfo.realA;
    const realB = poolInfo.realB;

    const totalA = virtualA.add(realA);
    const totalB = virtualB.add(realB);

    // Get trade fee rate from config (typically 1% = 10000 in basis points * 100)
    const tradeFeeRate = poolInfo.configInfo?.tradeFeeRate || new BN(100); // 1% default
    const feeMultiplier = new BN(1000000).sub(tradeFeeRate);

    let amountOut: BN;
    let fee: BN;

    if (isBuy) {
      // Buy: SOL -> Token
      // amountOut = totalA - (totalA * totalB) / (totalB + amountIn)
      const amountInAfterFee = amount.mul(feeMultiplier).div(new BN(1000000));
      fee = amount.sub(amountInAfterFee);
      const newTotalB = totalB.add(amountInAfterFee);
      const newTotalA = totalA.mul(totalB).div(newTotalB);
      amountOut = totalA.sub(newTotalA);
    } else {
      // Sell: Token -> SOL
      // amountOut = totalB - (totalA * totalB) / (totalA + amountIn)
      const newTotalA = totalA.add(amount);
      const newTotalB = totalA.mul(totalB).div(newTotalA);
      const amountOutBeforeFee = totalB.sub(newTotalB);
      fee = amountOutBeforeFee.mul(tradeFeeRate).div(new BN(1000000));
      amountOut = amountOutBeforeFee.sub(fee);
    }

    // Apply slippage
    const slippageMultiplier = new BN(10000 - slippageBps);
    const minimumAmountOut = amountOut.mul(slippageMultiplier).div(new BN(10000));

    // Estimate price impact (simplified)
    const priceImpact = 0; // LaunchPad has different price impact calculation

    return {
      amountIn: amount,
      amountOut,
      minimumAmountOut,
      fee,
      priceImpact,
    };
  }
}
