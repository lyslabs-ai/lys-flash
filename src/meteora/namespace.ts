/**
 * Meteora Parent Namespace
 *
 * Parent namespace that exposes sub-namespaces for each Meteora product:
 * - DBC (Dynamic Bonding Curve)
 * - DAMM v2 (Dynamic AMM v2 / CP-AMM)
 * - DAMMv1 (future)
 * - DLMM (future)
 *
 * @module meteora/namespace
 */

import type { TransactionBuilder } from '../builder';
import { DBCNamespace } from './dbc';
import { DAMMv2Namespace } from './damm-v2';

/**
 * Meteora Namespace for TransactionBuilder
 *
 * Parent namespace that provides access to all Meteora products:
 * - `dbc` - Dynamic Bonding Curve operations
 * - `dammV2` - DAMM v2 (Dynamic AMM v2 / CP-AMM) operations
 *
 * Future products will be added as they are integrated:
 * - `dammV1` - DAMM v1 operations
 * - `dlmm` - DLMM operations
 *
 * @example
 * ```typescript
 * import { Connection } from '@solana/web3.js';
 * import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';
 *
 * const connection = new Connection('https://api.mainnet-beta.solana.com');
 * const client = new LysFlash({
 *   address: 'ipc:///tmp/tx-executor.ipc',
 *   connection,
 * });
 *
 * // Access DBC via nested namespace
 * const builder = await new TransactionBuilder(client)
 *   .meteora.dbc.buy({
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
export class MeteoraNamespace {
  private builder: TransactionBuilder;
  private _dbc?: DBCNamespace;
  private _dammV2?: DAMMv2Namespace;

  /**
   * Create MeteoraNamespace instance
   * @param builder - Parent TransactionBuilder instance
   */
  constructor(builder: TransactionBuilder) {
    this.builder = builder;
  }

  /**
   * Access DBC (Dynamic Bonding Curve) operations
   *
   * @returns DBCNamespace instance
   *
   * @example
   * ```typescript
   * // Buy tokens on DBC pool
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dbc.buy({
   *     pool: poolAddress,
   *     user: userWallet,
   *     solAmountIn: 1_000_000_000,
   *     minTokensOut: 1000000,
   *   });
   * ```
   */
  get dbc(): DBCNamespace {
    if (!this._dbc) {
      this._dbc = new DBCNamespace(this.builder);
    }
    return this._dbc;
  }

  // ============================================================================
  // Future Product Namespaces (placeholders for documentation)
  // ============================================================================

  // Future: DAMM v1 operations
  // get dammV1(): DAMMv1Namespace {
  //   if (!this._dammV1) {
  //     this._dammV1 = new DAMMv1Namespace(this.builder);
  //   }
  //   return this._dammV1;
  // }

  /**
   * Access DAMM v2 (Dynamic AMM v2 / CP-AMM) operations
   *
   * @returns DAMMv2Namespace instance
   *
   * @example
   * ```typescript
   * // Buy tokens on DAMM v2 pool
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV2.buy({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     solAmountIn: 1_000_000_000,
   *     minTokensOut: 1000000,
   *   });
   * ```
   */
  get dammV2(): DAMMv2Namespace {
    if (!this._dammV2) {
      this._dammV2 = new DAMMv2Namespace(this.builder);
    }
    return this._dammV2;
  }

  // Future: DLMM operations
  // get dlmm(): DLMMNamespace {
  //   if (!this._dlmm) {
  //     this._dlmm = new DLMMNamespace(this.builder);
  //   }
  //   return this._dlmm;
  // }
}
