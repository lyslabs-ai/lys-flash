/**
 * Meteora DAMM v2 Static Utilities
 *
 * Static utility functions for Meteora DAMM v2 operations that don't require
 * a TransactionBuilder instance. These can be used independently for
 * pool queries and quote calculations.
 *
 * @module meteora/damm-v2/utils
 */

import type { Connection, Commitment } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import type {
  DAMMv2PoolState,
  DAMMv2SwapQuote,
  DAMMv2SwapQuote2,
  DAMMv2SwapMode,
} from './types';

/**
 * Static utility functions for Meteora DAMM v2
 *
 * @example
 * ```typescript
 * import { Connection } from '@solana/web3.js';
 * import { DAMMv2Utils } from '@lyslabs.ai/lys-flash';
 *
 * const connection = new Connection('https://api.mainnet-beta.solana.com');
 *
 * // Get pool state
 * const pool = await DAMMv2Utils.getPool(connection, 'PoolAddress...');
 *
 * console.log('Token A mint:', pool.tokenAMint.toBase58());
 * console.log('Token B mint:', pool.tokenBMint.toBase58());
 *
 * // Get swap quote
 * const quote = await DAMMv2Utils.getQuote(
 *   connection,
 *   'PoolAddress...',
 *   pool.tokenAMint, // input token
 *   1_000_000_000,   // 1 token (in smallest unit)
 *   100              // 1% slippage
 * );
 *
 * console.log('Expected output:', quote.amountOut.toString());
 * console.log('Minimum output:', quote.minimumAmountOut.toString());
 * ```
 */
export class DAMMv2Utils {
  /**
   * Get pool state from Meteora DAMM v2
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool public key or string
   * @param _commitment - Commitment level (not used in current SDK version)
   * @returns Pool state information
   *
   * @example
   * ```typescript
   * const pool = await DAMMv2Utils.getPool(connection, 'PoolAddress...');
   *
   * console.log('Token A mint:', pool.tokenAMint.toBase58());
   * console.log('Token B mint:', pool.tokenBMint.toBase58());
   * console.log('Fee rate:', pool.feeRate);
   * ```
   */
  static async getPool(
    connection: Connection,
    poolAddress: string | PublicKey,
    _commitment: Commitment = 'confirmed'
  ): Promise<DAMMv2PoolState> {
    // Dynamic import to support optional peer dependency
    const { CpAmm } = await import('@meteora-ag/cp-amm-sdk');

    const cpAmm = new CpAmm(connection);

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;

    const poolState = await cpAmm.fetchPoolState(address);

    if (!poolState) {
      throw new Error(`Pool not found: ${address.toBase58()}`);
    }

    // Extract fee info from poolFees
    const feeRate = poolState.poolFees?.protocolFeePercent || 0;
    const protocolFeeRate = poolState.poolFees?.protocolFeePercent || 0;

    return {
      address,
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      sqrtPrice: poolState.sqrtPrice,
      liquidity: poolState.liquidity,
      feeRate,
      protocolFeeRate,
      raw: poolState,
    };
  }

  /**
   * Get swap quote from Meteora DAMM v2
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool public key or string
   * @param inputMint - Input token mint address
   * @param amountIn - Input amount in smallest units
   * @param slippageBps - Slippage tolerance in basis points (e.g., 100 = 1%)
   * @param hasReferral - Whether referral fee applies
   * @param commitment - Commitment level
   * @returns Swap quote with expected output and fees
   *
   * @example
   * ```typescript
   * const quote = await DAMMv2Utils.getQuote(
   *   connection,
   *   'PoolAddress...',
   *   inputMint,
   *   1_000_000_000, // 1 token
   *   100 // 1% slippage
   * );
   *
   * console.log('Expected output:', quote.amountOut.toString());
   * console.log('Minimum output:', quote.minimumAmountOut.toString());
   * console.log('Fee:', quote.tradingFee.toString());
   * console.log('Price impact:', quote.priceImpact);
   * ```
   */
  static async getQuote(
    connection: Connection,
    poolAddress: string | PublicKey,
    inputMint: string | PublicKey,
    amountIn: number | BN,
    slippageBps: number = 100,
    hasReferral: boolean = false,
    commitment: Commitment = 'confirmed'
  ): Promise<DAMMv2SwapQuote> {
    const { CpAmm } = await import('@meteora-ag/cp-amm-sdk');
    const { getMint } = await import('@solana/spl-token');

    const cpAmm = new CpAmm(connection);

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;
    const inputTokenMint =
      typeof inputMint === 'string' ? new PublicKey(inputMint) : inputMint;
    const amount = BN.isBN(amountIn) ? amountIn : new BN(amountIn);

    // Fetch pool state
    const poolState = await cpAmm.fetchPoolState(address);
    if (!poolState) {
      throw new Error(`Pool not found: ${address.toBase58()}`);
    }

    // Get token decimals
    const tokenAMintInfo = await getMint(connection, poolState.tokenAMint, commitment);
    const tokenBMintInfo = await getMint(connection, poolState.tokenBMint, commitment);

    // Get current time and slot for the quote
    const slot = await connection.getSlot(commitment);
    const blockTime = await connection.getBlockTime(slot);
    const currentTime = blockTime ?? Math.floor(Date.now() / 1000);

    // Calculate slippage (SDK uses decimal 0-100 for percentage)
    const slippagePercent = slippageBps / 100;

    const quoteResult = cpAmm.getQuote({
      inAmount: amount,
      inputTokenMint,
      slippage: slippagePercent,
      poolState,
      currentTime,
      currentSlot: slot,
      tokenADecimal: tokenAMintInfo.decimals,
      tokenBDecimal: tokenBMintInfo.decimals,
      hasReferral,
    });

    return {
      amountIn: quoteResult.swapInAmount,
      amountOut: quoteResult.swapOutAmount,
      minimumAmountOut: quoteResult.minSwapOutAmount,
      tradingFee: quoteResult.totalFee,
      protocolFee: new BN(0), // Not returned separately in getQuote
      referralFee: new BN(0), // Not returned separately in getQuote
      priceImpact: quoteResult.priceImpact.toNumber(),
    };
  }

  /**
   * Get swap quote from Meteora DAMM v2 using getQuote2 (enhanced version)
   *
   * Supports ExactIn, ExactOut, and PartialFill swap modes with detailed fee breakdown.
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool public key or string
   * @param inputMint - Input token mint address
   * @param amount - Amount in smallest units (amountIn for ExactIn/PartialFill, amountOut for ExactOut)
   * @param slippageBps - Slippage tolerance in basis points (e.g., 100 = 1%)
   * @param mode - Swap mode ('ExactIn', 'PartialFill', or 'ExactOut')
   * @param hasReferral - Whether referral fee applies
   * @param commitment - Commitment level
   * @returns Swap quote with expected output, fees, and price impact
   *
   * @example
   * ```typescript
   * // ExactIn mode (default)
   * const quote = await DAMMv2Utils.getQuote2(
   *   connection,
   *   'PoolAddress...',
   *   inputMint,
   *   1_000_000_000, // 1 token in
   *   100, // 1% slippage
   *   'ExactIn'
   * );
   *
   * // ExactOut mode
   * const quote = await DAMMv2Utils.getQuote2(
   *   connection,
   *   'PoolAddress...',
   *   inputMint,
   *   1_000_000_000, // 1 token out
   *   100,
   *   'ExactOut'
   * );
   * console.log('Maximum input:', quote.maximumAmountIn?.toString());
   * ```
   */
  static async getQuote2(
    connection: Connection,
    poolAddress: string | PublicKey,
    inputMint: string | PublicKey,
    amount: number | BN,
    slippageBps: number = 100,
    mode: DAMMv2SwapMode = 'ExactIn',
    hasReferral: boolean = false,
    commitment: Commitment = 'confirmed'
  ): Promise<DAMMv2SwapQuote2> {
    const { CpAmm, SwapMode, getCurrentPoint, ActivationType } = await import(
      '@meteora-ag/cp-amm-sdk'
    );
    const { getMint } = await import('@solana/spl-token');

    const cpAmm = new CpAmm(connection);

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;
    const inputTokenMint =
      typeof inputMint === 'string' ? new PublicKey(inputMint) : inputMint;
    const amountBN = BN.isBN(amount) ? amount : new BN(amount);

    // Fetch pool state
    const poolState = await cpAmm.fetchPoolState(address);
    if (!poolState) {
      throw new Error(`Pool not found: ${address.toBase58()}`);
    }

    // Get token decimals
    const tokenAMintInfo = await getMint(connection, poolState.tokenAMint, commitment);
    const tokenBMintInfo = await getMint(connection, poolState.tokenBMint, commitment);

    // Get current point based on pool's activation type
    const activationType =
      poolState.activationType === 0 ? ActivationType.Slot : ActivationType.Timestamp;
    const currentPoint = await getCurrentPoint(connection, activationType);

    // Calculate slippage (SDK uses decimal 0-100 for percentage)
    const slippagePercent = slippageBps / 100;

    // Build params based on mode
    const baseParams = {
      inputTokenMint,
      slippage: slippagePercent,
      currentPoint,
      poolState,
      tokenADecimal: tokenAMintInfo.decimals,
      tokenBDecimal: tokenBMintInfo.decimals,
      hasReferral,
    };

    type Quote2Params =
      | (typeof baseParams & { swapMode: typeof SwapMode.ExactIn; amountIn: BN })
      | (typeof baseParams & { swapMode: typeof SwapMode.PartialFill; amountIn: BN })
      | (typeof baseParams & { swapMode: typeof SwapMode.ExactOut; amountOut: BN });

    let quoteParams: Quote2Params;
    if (mode === 'ExactOut') {
      quoteParams = { ...baseParams, swapMode: SwapMode.ExactOut, amountOut: amountBN };
    } else if (mode === 'PartialFill') {
      quoteParams = { ...baseParams, swapMode: SwapMode.PartialFill, amountIn: amountBN };
    } else {
      quoteParams = { ...baseParams, swapMode: SwapMode.ExactIn, amountIn: amountBN };
    }

    const quoteResult = cpAmm.getQuote2(quoteParams);

    // Calculate amountIn based on mode
    const amountIn =
      mode === 'ExactOut'
        ? quoteResult.maximumAmountIn || new BN(0)
        : amountBN;

    return {
      amountIn,
      amountOut: quoteResult.outputAmount,
      minimumAmountOut: quoteResult.minimumAmountOut || new BN(0),
      tradingFee: quoteResult.tradingFee,
      protocolFee: quoteResult.protocolFee,
      referralFee: quoteResult.referralFee,
      partnerFee: quoteResult.partnerFee,
      priceImpact: quoteResult.priceImpact.toNumber(),
      maximumAmountIn: quoteResult.maximumAmountIn,
    };
  }
}
