/**
 * Raydium CPMM Utils
 *
 * Static utility functions for Raydium CPMM operations.
 * Provides pool data fetching and quote calculations.
 *
 * @module raydium/cpmm/utils
 */

import type { Connection, Commitment } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import type {
  RaydiumCPMMPoolState,
  RaydiumCPMMSwapQuote,
  RaydiumCPMMSwapQuoteExactOut,
} from './types';

/**
 * Static utility class for Raydium CPMM operations
 *
 * @example
 * ```typescript
 * import { Connection } from '@solana/web3.js';
 * import { RaydiumCPMMUtils } from '@lyslabs.ai/lys-flash';
 *
 * const connection = new Connection('https://api.mainnet-beta.solana.com');
 *
 * // Get pool state
 * const pool = await RaydiumCPMMUtils.getPool(connection, poolAddress);
 * console.log('Reserve A:', pool.mintAAmount.toString());
 *
 * // Get swap quote
 * const quote = await RaydiumCPMMUtils.getQuote(
 *   connection,
 *   poolAddress,
 *   SOL_MINT,
 *   1_000_000_000, // 1 SOL
 *   100 // 1% slippage
 * );
 * console.log('Expected output:', quote.amountOut.toString());
 * ```
 */
export class RaydiumCPMMUtils {
  /**
   * Get CPMM pool state
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool address
   * @param commitment - Commitment level (default: 'confirmed')
   * @returns Pool state information
   * @throws Error if pool not found
   *
   * @example
   * ```typescript
   * const pool = await RaydiumCPMMUtils.getPool(
   *   connection,
   *   'PoolAddressHere...'
   * );
   * console.log('Mint A:', pool.mintA.toBase58());
   * console.log('Reserve A:', pool.mintAAmount.toString());
   * ```
   */
  static async getPool(
    connection: Connection,
    poolAddress: string | PublicKey,
    _commitment: Commitment = 'confirmed'
  ): Promise<RaydiumCPMMPoolState> {
    const { Raydium } = await import('@raydium-io/raydium-sdk-v2');

    const raydium = await Raydium.load({
      connection,
      cluster: 'mainnet',
      disableFeatureCheck: true,
    });

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;

    const data = await raydium.cpmm.getPoolInfoFromRpc(address.toBase58());

    if (!data) {
      throw new Error(`CPMM pool not found: ${address.toBase58()}`);
    }

    const { poolInfo, rpcData } = data;

    return {
      address,
      mintA: new PublicKey(poolInfo.mintA.address),
      mintB: new PublicKey(poolInfo.mintB.address),
      vaultA: rpcData.vaultA,
      vaultB: rpcData.vaultB,
      mintAAmount: rpcData.baseReserve,
      mintBAmount: rpcData.quoteReserve,
      lpMint: new PublicKey(poolInfo.lpMint.address),
      lpSupply: rpcData.lpAmount,
      configId: rpcData.configId,
      feeRate: poolInfo.config.tradeFeeRate,
      decimalsA: poolInfo.mintA.decimals,
      decimalsB: poolInfo.mintB.decimals,
      raw: data,
    };
  }

  /**
   * Get CPMM swap quote (ExactIn)
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
   * const quote = await RaydiumCPMMUtils.getQuote(
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
  ): Promise<RaydiumCPMMSwapQuote> {
    const { Raydium, CurveCalculator } = await import('@raydium-io/raydium-sdk-v2');

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

    const data = await raydium.cpmm.getPoolInfoFromRpc(address.toBase58());
    if (!data) {
      throw new Error(`CPMM pool not found: ${address.toBase58()}`);
    }

    const { poolInfo, rpcData } = data;

    // Get config info for fee rates
    const configInfo = rpcData.configInfo;
    const tradeFeeRate = configInfo?.tradeFeeRate || new BN(poolInfo.config.tradeFeeRate);
    const protocolFeeRate = configInfo?.protocolFeeRate || new BN(0);
    const fundFeeRate = configInfo?.fundFeeRate || new BN(0);
    const creatorFeeRate = configInfo?.creatorFeeRate || new BN(0);

    // Determine if input is token A or B
    const baseIn = inputMintPk.toBase58() === poolInfo.mintA.address;

    // Use CurveCalculator for constant product swap
    const swapResult = CurveCalculator.swapBaseInput(
      amount,
      baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
      baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
      tradeFeeRate,
      creatorFeeRate,
      protocolFeeRate,
      fundFeeRate,
      false // isCreatorFeeOnInput
    );

    const amountOut = swapResult.outputAmount;
    const fee = swapResult.tradeFee;

    // Apply slippage
    const slippageMultiplier = new BN(10000 - slippageBps);
    const minimumAmountOut = amountOut.mul(slippageMultiplier).div(new BN(10000));

    // Calculate price impact
    const priceImpact = this.calculatePriceImpact(
      amount,
      amountOut,
      baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
      baseIn ? rpcData.quoteReserve : rpcData.baseReserve
    );

    return {
      amountIn: amount,
      amountOut,
      minimumAmountOut,
      fee,
      priceImpact,
    };
  }

  /**
   * Get CPMM swap quote (ExactOut)
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
   * const quote = await RaydiumCPMMUtils.getQuoteExactOut(
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
  ): Promise<RaydiumCPMMSwapQuoteExactOut> {
    const { Raydium, CurveCalculator } = await import('@raydium-io/raydium-sdk-v2');

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

    const data = await raydium.cpmm.getPoolInfoFromRpc(address.toBase58());
    if (!data) {
      throw new Error(`CPMM pool not found: ${address.toBase58()}`);
    }

    const { poolInfo, rpcData } = data;

    // Determine if output is token A or B
    const baseOut = outputMintPk.toBase58() === poolInfo.mintA.address;

    // Get config info for fee rates
    const configInfo = rpcData.configInfo;
    const tradeFeeRate = configInfo?.tradeFeeRate || new BN(poolInfo.config.tradeFeeRate);

    // Use CurveCalculator for reverse calculation
    const swapResult = CurveCalculator.swapBaseOutput(
      amount,
      baseOut ? rpcData.quoteReserve : rpcData.baseReserve, // inputVaultAmount
      baseOut ? rpcData.baseReserve : rpcData.quoteReserve, // outputVaultAmount
      tradeFeeRate,
      configInfo?.creatorFeeRate || new BN(0),
      configInfo?.protocolFeeRate || new BN(0),
      configInfo?.fundFeeRate || new BN(0),
      false // isCreatorFeeOnInput
    );

    const amountIn = swapResult.inputAmount;
    const fee = swapResult.tradeFee || new BN(0);

    // Apply slippage
    const slippageMultiplier = new BN(10000 + slippageBps);
    const maximumAmountIn = amountIn.mul(slippageMultiplier).div(new BN(10000));

    // Calculate price impact
    const priceImpact = this.calculatePriceImpact(
      amountIn,
      amount,
      baseOut ? rpcData.quoteReserve : rpcData.baseReserve,
      baseOut ? rpcData.baseReserve : rpcData.quoteReserve
    );

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
