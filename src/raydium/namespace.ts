/**
 * Raydium Parent Namespace
 *
 * Parent namespace that exposes sub-namespaces for each Raydium product:
 * - LaunchPad (Bonding Curve)
 * - CLMM (Concentrated Liquidity Market Maker)
 * - CPMM (Constant Product Market Maker)
 * - AMMv4 (V4 AMM with OpenBook integration)
 *
 * @module raydium/namespace
 */

import type { TransactionBuilder } from '../builder';
import { RaydiumLaunchPadNamespace } from './launchpad';
import { RaydiumCLMMNamespace } from './clmm';
import { RaydiumCPMMNamespace } from './cpmm';
import { RaydiumAMMv4Namespace } from './ammv4';

/**
 * Raydium Namespace for TransactionBuilder
 *
 * Parent namespace that provides access to all Raydium products:
 * - `launchpad` - LaunchPad bonding curve operations
 * - `clmm` - CLMM (Concentrated Liquidity Market Maker) operations
 * - `cpmm` - CPMM (Constant Product Market Maker) operations
 * - `ammv4` - AMMv4 (V4 AMM with OpenBook) operations
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
 * // Access CLMM via nested namespace
 * const builder = await new TransactionBuilder(client)
 *   .raydium.clmm.buy({
 *     pool: poolAddress,
 *     user: userWallet,
 *     tokenMint: tokenAddress,
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
export class RaydiumNamespace {
  private builder: TransactionBuilder;
  private _launchpad?: RaydiumLaunchPadNamespace;
  private _clmm?: RaydiumCLMMNamespace;
  private _cpmm?: RaydiumCPMMNamespace;
  private _ammv4?: RaydiumAMMv4Namespace;

  /**
   * Create RaydiumNamespace instance
   * @param builder - Parent TransactionBuilder instance
   */
  constructor(builder: TransactionBuilder) {
    this.builder = builder;
  }

  /**
   * Access LaunchPad (Bonding Curve) operations
   *
   * @returns RaydiumLaunchPadNamespace instance
   *
   * @example
   * ```typescript
   * // Buy tokens on LaunchPad pool
   * const builder = await new TransactionBuilder(client)
   *   .raydium.launchpad.buy({
   *     pool: poolAddress,
   *     user: userWallet,
   *     solAmountIn: 1_000_000_000,
   *     minTokensOut: 1000000,
   *   });
   * ```
   */
  get launchpad(): RaydiumLaunchPadNamespace {
    if (!this._launchpad) {
      this._launchpad = new RaydiumLaunchPadNamespace(this.builder);
    }
    return this._launchpad;
  }

  /**
   * Access CLMM (Concentrated Liquidity Market Maker) operations
   *
   * @returns RaydiumCLMMNamespace instance
   *
   * @example
   * ```typescript
   * // Buy tokens on CLMM pool
   * const builder = await new TransactionBuilder(client)
   *   .raydium.clmm.buy({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     solAmountIn: 1_000_000_000,
   *     minTokensOut: 1000000,
   *   });
   * ```
   */
  get clmm(): RaydiumCLMMNamespace {
    if (!this._clmm) {
      this._clmm = new RaydiumCLMMNamespace(this.builder);
    }
    return this._clmm;
  }

  /**
   * Access CPMM (Constant Product Market Maker) operations
   *
   * @returns RaydiumCPMMNamespace instance
   *
   * @example
   * ```typescript
   * // Buy tokens on CPMM pool
   * const builder = await new TransactionBuilder(client)
   *   .raydium.cpmm.buy({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     solAmountIn: 1_000_000_000,
   *     minTokensOut: 1000000,
   *   });
   * ```
   */
  get cpmm(): RaydiumCPMMNamespace {
    if (!this._cpmm) {
      this._cpmm = new RaydiumCPMMNamespace(this.builder);
    }
    return this._cpmm;
  }

  /**
   * Access AMMv4 (V4 AMM with OpenBook) operations
   *
   * @returns RaydiumAMMv4Namespace instance
   *
   * @example
   * ```typescript
   * // Buy tokens on AMMv4 pool
   * const builder = await new TransactionBuilder(client)
   *   .raydium.ammv4.buy({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     solAmountIn: 1_000_000_000,
   *     minTokensOut: 1000000,
   *   });
   * ```
   */
  get ammv4(): RaydiumAMMv4Namespace {
    if (!this._ammv4) {
      this._ammv4 = new RaydiumAMMv4Namespace(this.builder);
    }
    return this._ammv4;
  }
}
