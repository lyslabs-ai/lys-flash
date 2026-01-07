/**
 * Meteora DLMM Static Utilities
 *
 * Static utility functions for Meteora DLMM operations that don't require
 * a TransactionBuilder instance. These can be used independently for
 * pool queries and quote calculations.
 *
 * @module meteora/dlmm/utils
 */

import type { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import type {
  DLMMPoolState,
  DLMMActiveBin,
  DLMMSwapQuote,
  DLMMSwapQuoteExactOut,
} from './types';
import { SOL_MINT } from './types';

/**
 * Static utility functions for Meteora DLMM
 *
 * @example
 * ```typescript
 * import { Connection } from '@solana/web3.js';
 * import { DLMMUtils, SOL_MINT } from '@lyslabs.ai/lys-flash';
 *
 * const connection = new Connection('https://api.mainnet-beta.solana.com');
 *
 * // Get pool state
 * const pool = await DLMMUtils.getPool(connection, 'PoolAddress...');
 *
 * console.log('Token X mint:', pool.tokenXMint.toBase58());
 * console.log('Token Y mint:', pool.tokenYMint.toBase58());
 * console.log('Active bin:', pool.activeBinId);
 *
 * // Get swap quote
 * const quote = await DLMMUtils.getSwapQuote(
 *   connection,
 *   'PoolAddress...',
 *   SOL_MINT,
 *   1_000_000_000, // 1 SOL
 *   100 // 1% slippage in bps
 * );
 *
 * console.log('Expected output:', quote.outAmount.toString());
 * console.log('Min output:', quote.minOutAmount.toString());
 * ```
 */
export class DLMMUtils {
  /**
   * Get pool state from Meteora DLMM
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool public key or string
   * @returns Pool state information including raw DLMM instance
   *
   * @example
   * ```typescript
   * const pool = await DLMMUtils.getPool(connection, 'PoolAddress...');
   *
   * console.log('Token X mint:', pool.tokenXMint.toBase58());
   * console.log('Token Y mint:', pool.tokenYMint.toBase58());
   * console.log('Active bin ID:', pool.activeBinId);
   * console.log('Bin step:', pool.binStep);
   * ```
   */
  static async getPool(
    connection: Connection,
    poolAddress: string | PublicKey
  ): Promise<DLMMPoolState> {
    // Dynamic import to support optional peer dependency
    const DLMM = (await import('@meteora-ag/dlmm')).default;

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;

    // Type assertion needed due to SDK bundling its own @solana/web3.js version
    const pool = await DLMM.create(
      connection as unknown as Parameters<typeof DLMM.create>[0],
      address
    );

    // Access token properties through type assertion due to SDK types
    const tokenX = pool.tokenX as unknown as { publicKey: string; decimals: number };
    const tokenY = pool.tokenY as unknown as { publicKey: string; decimals: number };

    return {
      address,
      tokenXMint: new PublicKey(tokenX.publicKey),
      tokenYMint: new PublicKey(tokenY.publicKey),
      tokenXDecimals: tokenX.decimals,
      tokenYDecimals: tokenY.decimals,
      activeBinId: pool.lbPair.activeId,
      binStep: pool.lbPair.binStep,
      baseFee: new BN(pool.lbPair.parameters.baseFactor),
      raw: pool,
    };
  }

  /**
   * Get active bin information from Meteora DLMM
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool public key or string
   * @returns Active bin information
   *
   * @example
   * ```typescript
   * const activeBin = await DLMMUtils.getActiveBin(connection, 'PoolAddress...');
   *
   * console.log('Bin ID:', activeBin.binId);
   * console.log('Price:', activeBin.price);
   * ```
   */
  static async getActiveBin(
    connection: Connection,
    poolAddress: string | PublicKey
  ): Promise<DLMMActiveBin> {
    // Dynamic import to support optional peer dependency
    const DLMM = (await import('@meteora-ag/dlmm')).default;

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;

    // Type assertion needed due to SDK bundling its own @solana/web3.js version
    const pool = await DLMM.create(
      connection as unknown as Parameters<typeof DLMM.create>[0],
      address
    );

    const activeBin = await pool.getActiveBin();

    return {
      binId: activeBin.binId,
      price: activeBin.price,
      pricePerToken: activeBin.pricePerToken,
      xAmount: activeBin.xAmount,
      yAmount: activeBin.yAmount,
    };
  }

  /**
   * Get swap quote from Meteora DLMM
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool public key or string
   * @param inputMint - Input token mint address
   * @param amountIn - Input amount in smallest units
   * @param slippageBps - Slippage tolerance in basis points (100 = 1%)
   * @returns Swap quote with expected output and fees
   *
   * @example
   * ```typescript
   * const quote = await DLMMUtils.getSwapQuote(
   *   connection,
   *   'PoolAddress...',
   *   SOL_MINT,
   *   1_000_000_000, // 1 SOL
   *   100 // 1% slippage
   * );
   *
   * console.log('Expected output:', quote.outAmount.toString());
   * console.log('Min output:', quote.minOutAmount.toString());
   * console.log('Fee:', quote.fee.toString());
   * console.log('Price impact:', quote.priceImpact);
   * ```
   */
  static async getSwapQuote(
    connection: Connection,
    poolAddress: string | PublicKey,
    inputMint: string | PublicKey,
    amountIn: number | BN,
    slippageBps: number
  ): Promise<DLMMSwapQuote> {
    // Dynamic import to support optional peer dependency
    const DLMM = (await import('@meteora-ag/dlmm')).default;

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;
    const inMint =
      typeof inputMint === 'string' ? new PublicKey(inputMint) : inputMint;
    const amount = typeof amountIn === 'number' ? new BN(amountIn) : amountIn;

    // Type assertion needed due to SDK bundling its own @solana/web3.js version
    const pool = await DLMM.create(
      connection as unknown as Parameters<typeof DLMM.create>[0],
      address
    );

    // Determine swap direction (swapForY = true means X -> Y)
    const swapForY = inMint.equals(new PublicKey(pool.tokenX.publicKey));

    // Get bin arrays needed for swap
    const binArrays = await pool.getBinArrayForSwap(swapForY);

    // Get quote
    const quote = pool.swapQuote(amount, swapForY, new BN(slippageBps), binArrays);

    // Calculate min output with slippage
    const minOutAmount = quote.minOutAmount;

    // Calculate price impact (approximate)
    const priceImpact = quote.priceImpact ? quote.priceImpact.toNumber() : 0;

    return {
      consumedInAmount: quote.consumedInAmount,
      outAmount: quote.outAmount,
      fee: quote.fee,
      protocolFee: quote.protocolFee,
      minOutAmount,
      priceImpact,
    };
  }

  /**
   * Get swap quote for exact output from Meteora DLMM
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool public key or string
   * @param outputMint - Output token mint address
   * @param amountOut - Desired output amount in smallest units
   * @param slippageBps - Slippage tolerance in basis points (100 = 1%)
   * @returns Swap quote with maximum input needed
   *
   * @example
   * ```typescript
   * const quote = await DLMMUtils.getSwapQuoteExactOut(
   *   connection,
   *   'PoolAddress...',
   *   tokenMint, // Output token
   *   1000000, // Exact tokens wanted
   *   100 // 1% slippage
   * );
   *
   * console.log('Max input needed:', quote.maxInAmount.toString());
   * console.log('Exact output:', quote.outAmount.toString());
   * ```
   */
  static async getSwapQuoteExactOut(
    connection: Connection,
    poolAddress: string | PublicKey,
    outputMint: string | PublicKey,
    amountOut: number | BN,
    slippageBps: number
  ): Promise<DLMMSwapQuoteExactOut> {
    // Dynamic import to support optional peer dependency
    const DLMM = (await import('@meteora-ag/dlmm')).default;

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;
    const outMint =
      typeof outputMint === 'string' ? new PublicKey(outputMint) : outputMint;
    const amount = typeof amountOut === 'number' ? new BN(amountOut) : amountOut;

    // Type assertion needed due to SDK bundling its own @solana/web3.js version
    const pool = await DLMM.create(
      connection as unknown as Parameters<typeof DLMM.create>[0],
      address
    );

    // Determine swap direction (swapForY = true means X -> Y, so output is Y)
    const swapForY = outMint.equals(new PublicKey(pool.tokenY.publicKey));

    // Get bin arrays needed for swap
    const binArrays = await pool.getBinArrayForSwap(swapForY);

    // Get quote for exact out
    const quote = pool.swapQuoteExactOut(
      amount,
      swapForY,
      new BN(slippageBps),
      binArrays
    );

    // Calculate price impact (approximate)
    const priceImpact = quote.priceImpact ? quote.priceImpact.toNumber() : 0;

    return {
      maxInAmount: quote.maxInAmount,
      outAmount: amount,
      fee: quote.fee,
      protocolFee: quote.protocolFee,
      priceImpact,
    };
  }

  /**
   * Helper to determine if a mint is SOL (native wrapped SOL)
   */
  static isSOL(mint: string | PublicKey): boolean {
    const mintStr = typeof mint === 'string' ? mint : mint.toBase58();
    return mintStr === SOL_MINT;
  }
}
