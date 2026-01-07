/**
 * Meteora DAMM v1 Static Utilities
 *
 * Static utility functions for Meteora DAMM v1 operations that don't require
 * a TransactionBuilder instance. These can be used independently for
 * pool queries and quote calculations.
 *
 * @module meteora/damm-v1/utils
 */

import type { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import type { DAMMv1PoolState, DAMMv1SwapQuote } from './types';

/**
 * Static utility functions for Meteora DAMM v1
 *
 * @example
 * ```typescript
 * import { Connection } from '@solana/web3.js';
 * import { DAMMv1Utils, SOL_MINT } from '@lyslabs.ai/lys-flash';
 *
 * const connection = new Connection('https://api.mainnet-beta.solana.com');
 *
 * // Get pool state
 * const pool = await DAMMv1Utils.getPool(connection, 'PoolAddress...');
 *
 * console.log('Token A mint:', pool.tokenAMint.toBase58());
 * console.log('Token B mint:', pool.tokenBMint.toBase58());
 *
 * // Get swap quote
 * const quote = await DAMMv1Utils.getSwapQuote(
 *   connection,
 *   'PoolAddress...',
 *   SOL_MINT,
 *   1_000_000_000, // 1 SOL
 *   0.01 // 1% slippage
 * );
 *
 * console.log('Expected output:', quote.swapOutAmount.toString());
 * console.log('Min output:', quote.minSwapOutAmount.toString());
 * ```
 */
export class DAMMv1Utils {
  /**
   * Get pool state from Meteora DAMM v1
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool public key or string
   * @returns Pool state information including raw AmmImpl instance
   *
   * @example
   * ```typescript
   * const pool = await DAMMv1Utils.getPool(connection, 'PoolAddress...');
   *
   * console.log('Token A mint:', pool.tokenAMint.toBase58());
   * console.log('Token B mint:', pool.tokenBMint.toBase58());
   * console.log('Token A decimals:', pool.tokenADecimals);
   * ```
   */
  static async getPool(
    connection: Connection,
    poolAddress: string | PublicKey
  ): Promise<DAMMv1PoolState> {
    // Dynamic import to support optional peer dependency
    const AmmImpl = (await import('@meteora-ag/dynamic-amm-sdk')).default;

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;

    // Type assertion needed due to SDK bundling its own @solana/web3.js version
    const pool = await AmmImpl.create(connection as unknown as Parameters<typeof AmmImpl.create>[0], address);

    return {
      address,
      tokenAMint: new PublicKey(pool.tokenAMint.address),
      tokenBMint: new PublicKey(pool.tokenBMint.address),
      tokenADecimals: pool.tokenAMint.decimals,
      tokenBDecimals: pool.tokenBMint.decimals,
      virtualPriceRaw: pool.poolInfo.virtualPriceRaw,
      raw: pool,
    };
  }

  /**
   * Get swap quote from Meteora DAMM v1
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool public key or string
   * @param inputMint - Input token mint address
   * @param amountIn - Input amount in smallest units
   * @param slippage - Slippage tolerance as decimal (0.01 = 1%)
   * @returns Swap quote with expected output and fees
   *
   * @example
   * ```typescript
   * const quote = await DAMMv1Utils.getSwapQuote(
   *   connection,
   *   'PoolAddress...',
   *   SOL_MINT,
   *   1_000_000_000, // 1 SOL
   *   0.01 // 1% slippage
   * );
   *
   * console.log('Expected output:', quote.swapOutAmount.toString());
   * console.log('Min output:', quote.minSwapOutAmount.toString());
   * console.log('Fee:', quote.fee.toString());
   * console.log('Price impact:', quote.priceImpact);
   * ```
   */
  static async getSwapQuote(
    connection: Connection,
    poolAddress: string | PublicKey,
    inputMint: string | PublicKey,
    amountIn: number | BN,
    slippage: number
  ): Promise<DAMMv1SwapQuote> {
    // Dynamic import to support optional peer dependency
    const AmmImpl = (await import('@meteora-ag/dynamic-amm-sdk')).default;

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;
    const inMint =
      typeof inputMint === 'string' ? new PublicKey(inputMint) : inputMint;
    const amount = typeof amountIn === 'number' ? new BN(amountIn) : amountIn;

    // Type assertion needed due to SDK bundling its own @solana/web3.js version
    const pool = await AmmImpl.create(connection as unknown as Parameters<typeof AmmImpl.create>[0], address);

    const quote = pool.getSwapQuote(inMint as unknown as Parameters<typeof pool.getSwapQuote>[0], amount, slippage);

    return {
      swapInAmount: quote.swapInAmount,
      swapOutAmount: quote.swapOutAmount,
      minSwapOutAmount: quote.minSwapOutAmount,
      fee: quote.fee,
      priceImpact: quote.priceImpact.toNumber(),
    };
  }
}
