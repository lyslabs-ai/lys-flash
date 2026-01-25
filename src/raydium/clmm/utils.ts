/**
 * Raydium CLMM Utils
 *
 * Static utility functions for Raydium CLMM operations.
 * Provides pool data fetching and quote calculations.
 *
 * @module raydium/clmm/utils
 */

import type { Connection, Commitment } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import type {
  RaydiumCLMMPoolState,
  RaydiumCLMMSwapQuote,
  RaydiumCLMMSwapQuoteExactOut,
} from './types';

/**
 * Static utility class for Raydium CLMM operations
 *
 * @example
 * ```typescript
 * import { Connection } from '@solana/web3.js';
 * import { RaydiumCLMMUtils } from '@lyslabs.ai/lys-flash';
 *
 * const connection = new Connection('https://api.mainnet-beta.solana.com');
 *
 * // Get pool state
 * const pool = await RaydiumCLMMUtils.getPool(connection, poolAddress);
 * console.log('Current tick:', pool.currentTickIndex);
 *
 * // Get swap quote
 * const quote = await RaydiumCLMMUtils.getQuote(
 *   connection,
 *   poolAddress,
 *   SOL_MINT,
 *   1_000_000_000, // 1 SOL
 *   100 // 1% slippage
 * );
 * console.log('Expected output:', quote.amountOut.toString());
 * ```
 */
export class RaydiumCLMMUtils {
  /**
   * Get CLMM pool state
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool address
   * @param commitment - Commitment level (default: 'confirmed')
   * @returns Pool state information
   * @throws Error if pool not found
   *
   * @example
   * ```typescript
   * const pool = await RaydiumCLMMUtils.getPool(
   *   connection,
   *   'PoolAddressHere...'
   * );
   * console.log('Mint A:', pool.mintA.toBase58());
   * console.log('Fee rate:', pool.feeRate);
   * ```
   */
  static async getPool(
    connection: Connection,
    poolAddress: string | PublicKey,
    _commitment: Commitment = 'confirmed'
  ): Promise<RaydiumCLMMPoolState> {
    const { Raydium } = await import('@raydium-io/raydium-sdk-v2');

    const raydium = await Raydium.load({
      connection,
      cluster: 'mainnet',
      disableFeatureCheck: true,
    });

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;

    const data = await raydium.clmm.getPoolInfoFromRpc(address.toBase58());

    if (!data) {
      throw new Error(`CLMM pool not found: ${address.toBase58()}`);
    }

    const { poolInfo, poolKeys, computePoolInfo } = data;

    return {
      address,
      mintA: new PublicKey(poolInfo.mintA.address),
      mintB: new PublicKey(poolInfo.mintB.address),
      vaultA: new PublicKey(poolKeys.vault.A),
      vaultB: new PublicKey(poolKeys.vault.B),
      sqrtPriceX64: computePoolInfo.sqrtPriceX64,
      currentTickIndex: computePoolInfo.tickCurrent,
      liquidity: computePoolInfo.liquidity,
      feeRate: poolInfo.config.tradeFeeRate,
      tickSpacing: poolInfo.config.tickSpacing,
      decimalsA: poolInfo.mintA.decimals,
      decimalsB: poolInfo.mintB.decimals,
      raw: data,
    };
  }

  /**
   * Get CLMM swap quote (ExactIn)
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
   * const quote = await RaydiumCLMMUtils.getQuote(
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
  ): Promise<RaydiumCLMMSwapQuote> {
    const { Raydium, PoolUtils } = await import('@raydium-io/raydium-sdk-v2');

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

    const poolId = address.toBase58();
    const data = await raydium.clmm.getPoolInfoFromRpc(poolId);
    if (!data) {
      throw new Error(`CLMM pool not found: ${poolId}`);
    }

    const { poolInfo, computePoolInfo, tickData } = data;

    // Determine if input is token A or B
    const baseIn = inputMintPk.toBase58() === poolInfo.mintA.address;
    const outputMint = baseIn ? poolInfo.mintB : poolInfo.mintA;

    // Get epoch info for calculations
    const epochInfo = await raydium.fetchEpochInfo();
    const tickArrayCache = tickData?.[poolId] || {};

    // Compute quote using PoolUtils
    const quoteResult = await PoolUtils.computeAmountOutFormat({
      poolInfo: computePoolInfo,
      tickArrayCache,
      amountIn: amount,
      tokenOut: outputMint,
      slippage: slippageBps / 10000,
      epochInfo,
    });

    const amountOut = quoteResult.amountOut.amount.raw;
    const minAmountOut = quoteResult.minAmountOut.amount.raw;
    const fee = quoteResult.fee?.raw || new BN(0);

    return {
      amountIn: amount,
      amountOut,
      minimumAmountOut: minAmountOut,
      fee,
      priceImpact: quoteResult.priceImpact ? parseFloat(quoteResult.priceImpact.toFixed()) : 0,
      currentPrice: quoteResult.currentPrice ? parseFloat(quoteResult.currentPrice.toFixed()) : 0,
      executionPrice: quoteResult.executionPrice
        ? parseFloat(quoteResult.executionPrice.toFixed())
        : 0,
    };
  }

  /**
   * Get CLMM swap quote (ExactOut)
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
   * const quote = await RaydiumCLMMUtils.getQuoteExactOut(
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
  ): Promise<RaydiumCLMMSwapQuoteExactOut> {
    const { Raydium, PoolUtils } = await import('@raydium-io/raydium-sdk-v2');

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

    const poolId = address.toBase58();
    const data = await raydium.clmm.getPoolInfoFromRpc(poolId);
    if (!data) {
      throw new Error(`CLMM pool not found: ${poolId}`);
    }

    const { poolInfo, computePoolInfo, tickData } = data;

    // Determine input mint
    const baseOut = outputMintPk.toBase58() === poolInfo.mintA.address;
    const inputMintObj = baseOut ? poolInfo.mintB : poolInfo.mintA;

    // Get epoch info for calculations
    const epochInfo = await raydium.fetchEpochInfo();
    const tickArrayCache = tickData?.[poolId] || {};

    // Compute quote using PoolUtils.computeAmountIn
    const quoteResult = await PoolUtils.computeAmountIn({
      poolInfo: computePoolInfo,
      tickArrayCache,
      amountOut: amount,
      baseMint: new PublicKey(inputMintObj.address),
      slippage: slippageBps / 10000,
      epochInfo,
    });

    // Extract BN values - handle both BN and GetTransferAmountFee types
    // GetTransferAmountFee has { amount: BN, fee: BN | undefined, ... }
    const extractBN = (value: unknown): BN => {
      if (BN.isBN(value)) return value;
      if (value && typeof value === 'object' && 'amount' in value) {
        const amount = (value as { amount: BN }).amount;
        if (BN.isBN(amount)) return amount;
      }
      return new BN(0);
    };

    const amountIn = extractBN(quoteResult.amountIn);
    const maxAmountIn = extractBN(quoteResult.maxAmountIn);
    const fee = quoteResult.fee ? extractBN(quoteResult.fee) : new BN(0);

    return {
      amountIn,
      amountOut: amount,
      maximumAmountIn: maxAmountIn,
      fee,
      priceImpact: quoteResult.priceImpact ? parseFloat(quoteResult.priceImpact.toFixed()) : 0,
    };
  }
}
