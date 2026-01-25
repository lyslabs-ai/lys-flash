/**
 * Raydium AMMv4 Utils
 *
 * Static utility functions for Raydium AMMv4 operations.
 * Provides pool data fetching and quote calculations.
 *
 * @module raydium/ammv4/utils
 */

import type { Connection, Commitment } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import type {
  RaydiumAMMv4PoolState,
  RaydiumAMMv4SwapQuote,
  RaydiumAMMv4SwapQuoteExactOut,
} from './types';

/**
 * Static utility class for Raydium AMMv4 operations
 *
 * @example
 * ```typescript
 * import { Connection } from '@solana/web3.js';
 * import { RaydiumAMMv4Utils } from '@lyslabs.ai/lys-flash';
 *
 * const connection = new Connection('https://api.mainnet-beta.solana.com');
 *
 * // Get pool state
 * const pool = await RaydiumAMMv4Utils.getPool(connection, poolAddress);
 * console.log('Base reserve:', pool.baseReserve.toString());
 *
 * // Get swap quote
 * const quote = await RaydiumAMMv4Utils.getQuote(
 *   connection,
 *   poolAddress,
 *   SOL_MINT,
 *   1_000_000_000, // 1 SOL
 *   100 // 1% slippage
 * );
 * console.log('Expected output:', quote.amountOut.toString());
 * ```
 */
export class RaydiumAMMv4Utils {
  /**
   * Get AMMv4 pool state
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool address
   * @param commitment - Commitment level (default: 'confirmed')
   * @returns Pool state information
   * @throws Error if pool not found
   *
   * @example
   * ```typescript
   * const pool = await RaydiumAMMv4Utils.getPool(
   *   connection,
   *   'PoolAddressHere...'
   * );
   * console.log('Base mint:', pool.baseMint.toBase58());
   * console.log('Base reserve:', pool.baseReserve.toString());
   * ```
   */
  static async getPool(
    connection: Connection,
    poolAddress: string | PublicKey,
    _commitment: Commitment = 'confirmed'
  ): Promise<RaydiumAMMv4PoolState> {
    const { Raydium } = await import('@raydium-io/raydium-sdk-v2');

    const raydium = await Raydium.load({
      connection,
      cluster: 'mainnet',
      disableFeatureCheck: true,
    });

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;

    const data = await raydium.liquidity.getPoolInfoFromRpc({ poolId: address.toBase58() });

    if (!data) {
      throw new Error(`AMMv4 pool not found: ${address.toBase58()}`);
    }

    const { poolInfo, poolRpcData } = data;

    return {
      address,
      baseMint: new PublicKey(poolInfo.mintA.address),
      quoteMint: new PublicKey(poolInfo.mintB.address),
      baseVault: poolRpcData.baseVault,
      quoteVault: poolRpcData.quoteVault,
      lpMint: new PublicKey(poolInfo.lpMint.address),
      marketId: poolRpcData.marketId,
      marketProgramId: poolRpcData.marketProgramId,
      openOrders: poolRpcData.openOrders,
      baseReserve: poolRpcData.baseReserve,
      quoteReserve: poolRpcData.quoteReserve,
      lpSupply: poolInfo.lpAmount ? new BN(poolInfo.lpAmount) : new BN(0),
      baseDecimals: poolInfo.mintA.decimals,
      quoteDecimals: poolInfo.mintB.decimals,
      raw: data,
    };
  }

  /**
   * Get AMMv4 swap quote (ExactIn)
   *
   * Calculate expected output amount for a swap operation.
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool address
   * @param inputMint - Input token mint address
   * @param amountIn - Input amount
   * @param slippageBps - Slippage tolerance in basis points (100 = 1%)
   * @param commitment - Commitment level (default: 'confirmed')
   * @returns Swap quote with amounts and fees
   * @throws Error if pool not found
   *
   * @example
   * ```typescript
   * const quote = await RaydiumAMMv4Utils.getQuote(
   *   connection,
   *   poolAddress,
   *   SOL_MINT, // Input is SOL
   *   1_000_000_000, // 1 SOL
   *   100 // 1% slippage
   * );
   * console.log('Expected tokens:', quote.amountOut.toString());
   * console.log('Min tokens:', quote.minimumAmountOut.toString());
   * ```
   */
  static async getQuote(
    connection: Connection,
    poolAddress: string | PublicKey,
    inputMint: string | PublicKey,
    amountIn: number | BN,
    slippageBps: number = 100,
    _commitment: Commitment = 'confirmed'
  ): Promise<RaydiumAMMv4SwapQuote> {
    const { Raydium } = await import('@raydium-io/raydium-sdk-v2');

    const raydium = await Raydium.load({
      connection,
      cluster: 'mainnet',
      disableFeatureCheck: true,
    });

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;
    const inputMintPk =
      typeof inputMint === 'string' ? new PublicKey(inputMint) : inputMint;
    const amount = BN.isBN(amountIn) ? amountIn : new BN(amountIn);

    const data = await raydium.liquidity.getPoolInfoFromRpc({ poolId: address.toBase58() });
    if (!data) {
      throw new Error(`AMMv4 pool not found: ${address.toBase58()}`);
    }

    const { poolInfo, poolRpcData } = data;

    // Determine swap direction
    const baseIn = inputMintPk.toBase58() === poolInfo.mintA.address;

    // Calculate using constant product formula
    // fee rate is typically 0.25% for AMMv4
    const feeRate = new BN(25); // 0.25% = 25 basis points
    const feeMultiplier = new BN(10000).sub(feeRate);
    const amountInAfterFee = amount.mul(feeMultiplier).div(new BN(10000));
    const fee = amount.sub(amountInAfterFee);

    const reserveIn = baseIn ? poolRpcData.baseReserve : poolRpcData.quoteReserve;
    const reserveOut = baseIn ? poolRpcData.quoteReserve : poolRpcData.baseReserve;

    // Constant product: (reserveIn + amountIn) * (reserveOut - amountOut) = reserveIn * reserveOut
    // amountOut = reserveOut - (reserveIn * reserveOut) / (reserveIn + amountIn)
    const numerator = reserveIn.mul(reserveOut);
    const denominator = reserveIn.add(amountInAfterFee);
    const newReserveOut = numerator.div(denominator);
    const amountOut = reserveOut.sub(newReserveOut);

    // Apply slippage
    const slippageMultiplier = new BN(10000 - slippageBps);
    const minimumAmountOut = amountOut.mul(slippageMultiplier).div(new BN(10000));

    // Calculate price impact
    const priceImpact = this.calculatePriceImpact(amount, amountOut, reserveIn, reserveOut);

    return {
      amountIn: amount,
      amountOut,
      minimumAmountOut,
      fee,
      priceImpact,
    };
  }

  /**
   * Get AMMv4 swap quote (ExactOut)
   *
   * Calculate required input amount for a desired output.
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool address
   * @param outputMint - Output token mint address
   * @param amountOut - Desired output amount
   * @param slippageBps - Slippage tolerance in basis points (100 = 1%)
   * @param commitment - Commitment level (default: 'confirmed')
   * @returns Swap quote with amounts and fees
   * @throws Error if pool not found
   *
   * @example
   * ```typescript
   * const quote = await RaydiumAMMv4Utils.getQuoteExactOut(
   *   connection,
   *   poolAddress,
   *   tokenMint, // Output token
   *   1_000_000, // 1M tokens
   *   100 // 1% slippage
   * );
   * console.log('Required SOL:', quote.amountIn.toString());
   * console.log('Max SOL:', quote.maximumAmountIn.toString());
   * ```
   */
  static async getQuoteExactOut(
    connection: Connection,
    poolAddress: string | PublicKey,
    outputMint: string | PublicKey,
    amountOut: number | BN,
    slippageBps: number = 100,
    _commitment: Commitment = 'confirmed'
  ): Promise<RaydiumAMMv4SwapQuoteExactOut> {
    const { Raydium } = await import('@raydium-io/raydium-sdk-v2');

    const raydium = await Raydium.load({
      connection,
      cluster: 'mainnet',
      disableFeatureCheck: true,
    });

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;
    const outputMintPk =
      typeof outputMint === 'string' ? new PublicKey(outputMint) : outputMint;
    const amount = BN.isBN(amountOut) ? amountOut : new BN(amountOut);

    const data = await raydium.liquidity.getPoolInfoFromRpc({ poolId: address.toBase58() });
    if (!data) {
      throw new Error(`AMMv4 pool not found: ${address.toBase58()}`);
    }

    const { poolInfo, poolRpcData } = data;

    // Determine swap direction
    const baseOut = outputMintPk.toBase58() === poolInfo.mintA.address;

    const reserveIn = baseOut ? poolRpcData.quoteReserve : poolRpcData.baseReserve;
    const reserveOut = baseOut ? poolRpcData.baseReserve : poolRpcData.quoteReserve;

    // Calculate using constant product formula (reverse)
    // amountIn = (reserveIn * amountOut) / (reserveOut - amountOut)
    const numerator = reserveIn.mul(amount);
    const denominator = reserveOut.sub(amount);
    const amountInBeforeFee = numerator.div(denominator).add(new BN(1)); // Round up

    // Add fee (0.25%)
    const feeRate = new BN(25);
    const feeMultiplier = new BN(10000).add(feeRate);
    const amountIn = amountInBeforeFee.mul(feeMultiplier).div(new BN(10000));
    const fee = amountIn.sub(amountInBeforeFee);

    // Apply slippage
    const slippageMultiplier = new BN(10000 + slippageBps);
    const maximumAmountIn = amountIn.mul(slippageMultiplier).div(new BN(10000));

    // Calculate price impact
    const priceImpact = this.calculatePriceImpact(amountIn, amount, reserveIn, reserveOut);

    return {
      amountIn,
      amountOut: amount,
      maximumAmountIn,
      fee,
      priceImpact,
    };
  }

  /**
   * Calculate price impact for a swap
   * @private
   */
  private static calculatePriceImpact(
    amountIn: BN,
    amountOut: BN,
    reserveIn: BN,
    reserveOut: BN
  ): number {
    // Spot price = reserveOut / reserveIn
    // Execution price = amountOut / amountIn
    // Price impact = (spot - execution) / spot * 100

    const spotPrice = reserveOut.mul(new BN(1e9)).div(reserveIn);
    const executionPrice = amountOut.mul(new BN(1e9)).div(amountIn);

    if (spotPrice.isZero()) return 0;

    const impact = spotPrice.sub(executionPrice).mul(new BN(10000)).div(spotPrice);
    return impact.toNumber() / 100;
  }
}
