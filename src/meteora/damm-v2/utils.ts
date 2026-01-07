/**
 * Meteora DAMM v2 Static Utilities
 *
 * Static utility functions for Meteora DAMM v2 operations that don't require
 * a TransactionBuilder instance. These can be used independently for
 * pool queries.
 *
 * Note: Quote calculations require complex setup with the SDK's Program instance.
 * For quotes, it's recommended to use the Meteora SDK directly or use the
 * TransactionBuilder swap methods which handle the complexity internally.
 *
 * @module meteora/damm-v2/utils
 */

import type { Connection, Commitment } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import type { DAMMv2PoolState } from './types';

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
}
