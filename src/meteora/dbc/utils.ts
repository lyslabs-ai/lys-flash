/**
 * Meteora DBC Static Utilities
 *
 * Static utility functions for Meteora DBC operations that don't require
 * a TransactionBuilder instance. These can be used independently for
 * pool queries and quote calculations.
 *
 * @module meteora/dbc/utils
 */

import type { Connection, Commitment } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import type { DBCPoolState, DBCSwapQuote, DBCSwapDirection } from './types';

/**
 * Static utility functions for Meteora DBC
 *
 * @example
 * ```typescript
 * import { Connection } from '@solana/web3.js';
 * import { DBCUtils } from '@lyslabs.ai/lys-flash';
 *
 * const connection = new Connection('https://api.mainnet-beta.solana.com');
 *
 * // Get pool state
 * const pool = await DBCUtils.getPool(connection, 'PoolAddress...');
 *
 * // Get swap quote
 * const quote = await DBCUtils.swapQuote(
 *   connection,
 *   'PoolAddress...',
 *   1_000_000_000,  // 1 SOL
 *   'buy',
 *   100  // 1% slippage
 * );
 * ```
 */
export class DBCUtils {
  /**
   * Get pool state from Meteora DBC
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool public key or string
   * @param commitment - Commitment level
   * @returns Pool state information
   *
   * @example
   * ```typescript
   * const pool = await DBCUtils.getPool(connection, 'PoolAddress...');
   *
   * console.log('Base mint:', pool.baseMint.toBase58());
   * console.log('Quote mint:', pool.quoteMint.toBase58());
   * console.log('Migrated:', pool.migrated);
   * ```
   */
  static async getPool(
    connection: Connection,
    poolAddress: string | PublicKey,
    commitment: Commitment = 'confirmed'
  ): Promise<DBCPoolState> {
    // Dynamic import to support optional peer dependency
    const { DynamicBondingCurveClient } = await import(
      '@meteora-ag/dynamic-bonding-curve-sdk'
    );

    const client = new DynamicBondingCurveClient(connection, commitment);

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;

    const virtualPoolState = await client.state.getPool(address);

    if (!virtualPoolState) {
      throw new Error(`Pool not found: ${address.toBase58()}`);
    }

    // Get config to retrieve quoteMint
    const poolConfigState = await client.state.getPoolConfig(virtualPoolState.config);

    return {
      address,
      config: virtualPoolState.config,
      baseMint: virtualPoolState.baseMint,
      quoteMint: poolConfigState?.quoteMint,
      sqrtPrice: virtualPoolState.sqrtPrice,
      baseReserve: virtualPoolState.baseReserve,
      quoteReserve: virtualPoolState.quoteReserve,
      migrated: Boolean(virtualPoolState.isMigrated),
      creator: virtualPoolState.creator,
      raw: virtualPoolState,
    };
  }

  /**
   * Calculate swap quote for Meteora DBC using swapQuote
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool public key or string
   * @param amountIn - Input amount (in smallest unit)
   * @param direction - Swap direction ('buy' or 'sell')
   * @param slippageBps - Slippage tolerance in basis points (e.g., 100 = 1%)
   * @param hasReferral - Whether referral fee applies
   * @param commitment - Commitment level
   * @returns Swap quote with expected output and fees
   *
   * @example
   * ```typescript
   * // Get quote for buying tokens with 1 SOL
   * const quote = await DBCUtils.swapQuote(
   *   connection,
   *   'PoolAddress...',
   *   1_000_000_000,  // 1 SOL
   *   'buy',
   *   100  // 1% slippage
   * );
   *
   * console.log('Expected output:', quote.amountOut.toString());
   * console.log('Minimum output:', quote.minimumAmountOut.toString());
   * console.log('Price impact:', quote.priceImpact, '%');
   * ```
   */
  static async swapQuote(
    connection: Connection,
    poolAddress: string | PublicKey,
    amountIn: number | BN,
    direction: DBCSwapDirection,
    slippageBps: number = 100,
    hasReferral: boolean = false,
    commitment: Commitment = 'confirmed'
  ): Promise<DBCSwapQuote> {
    const { DynamicBondingCurveClient, swapQuote } = await import(
      '@meteora-ag/dynamic-bonding-curve-sdk'
    );

    const client = new DynamicBondingCurveClient(connection, commitment);

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;

    const amount = BN.isBN(amountIn) ? amountIn : new BN(amountIn);

    // Get pool and config state
    const virtualPoolState = await client.state.getPool(address);
    if (!virtualPoolState) {
      throw new Error(`Pool not found: ${address.toBase58()}`);
    }

    const poolConfigState = await client.state.getPoolConfig(virtualPoolState.config);
    if (!poolConfigState) {
      throw new Error(`Pool config not found: ${virtualPoolState.config.toBase58()}`);
    }

    // Validate pool state
    if (!virtualPoolState.sqrtPrice || virtualPoolState.sqrtPrice.isZero()) {
      throw new Error('Invalid pool state: sqrtPrice is zero');
    }

    // swapBaseForQuote: true = sell (Token -> SOL), false = buy (SOL -> Token)
    const swapBaseForQuote = direction === 'sell';

    const quoteResult = swapQuote(
      virtualPoolState,
      poolConfigState,
      swapBaseForQuote,
      amount,
      slippageBps,
      hasReferral,
      new BN(0) // currentPoint
    );

    // Calculate price impact
    const inputValue = amount.toNumber();
    const outputValue = quoteResult.outputAmount.toNumber();
    const priceImpact =
      inputValue > 0 && outputValue > 0
        ? Math.abs((1 - outputValue / inputValue) * 100)
        : 0;

    return {
      amountOut: quoteResult.outputAmount,
      minimumAmountOut: quoteResult.minimumAmountOut,
      nextSqrtPrice: quoteResult.nextSqrtPrice,
      fee: quoteResult.tradingFee || new BN(0),
      priceImpact,
      effectivePrice: outputValue > 0 ? inputValue / outputValue : 0,
    };
  }

  /**
   * Calculate swap quote for Meteora DBC using swapQuote2 (enhanced version)
   *
   * @param connection - Solana RPC connection
   * @param poolAddress - Pool public key or string
   * @param amountIn - Input amount (in smallest unit)
   * @param direction - Swap direction ('buy' or 'sell')
   * @param slippageBps - Slippage tolerance in basis points (e.g., 100 = 1%)
   * @param hasReferral - Whether referral fee applies
   * @param commitment - Commitment level
   * @returns Swap quote with expected output and fees
   *
   * @example
   * ```typescript
   * const quote = await DBCUtils.swapQuote2(
   *   connection,
   *   'PoolAddress...',
   *   1_000_000_000,
   *   'buy',
   *   100
   * );
   * ```
   */
  static async swapQuote2(
    connection: Connection,
    poolAddress: string | PublicKey,
    amountIn: number | BN,
    direction: DBCSwapDirection,
    slippageBps: number = 100,
    hasReferral: boolean = false,
    commitment: Commitment = 'confirmed'
  ): Promise<DBCSwapQuote> {
    const { DynamicBondingCurveClient, swapQuoteExactIn } = await import(
      '@meteora-ag/dynamic-bonding-curve-sdk'
    );

    const client = new DynamicBondingCurveClient(connection, commitment);

    const address =
      typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;

    const amount = BN.isBN(amountIn) ? amountIn : new BN(amountIn);

    // Get pool and config state
    const virtualPoolState = await client.state.getPool(address);
    if (!virtualPoolState) {
      throw new Error(`Pool not found: ${address.toBase58()}`);
    }

    const poolConfigState = await client.state.getPoolConfig(virtualPoolState.config);
    if (!poolConfigState) {
      throw new Error(`Pool config not found: ${virtualPoolState.config.toBase58()}`);
    }

    // Validate pool state
    if (!virtualPoolState.sqrtPrice || virtualPoolState.sqrtPrice.isZero()) {
      throw new Error('Invalid pool state: sqrtPrice is zero');
    }

    // swapBaseForQuote: true = sell (Token -> SOL), false = buy (SOL -> Token)
    const swapBaseForQuote = direction === 'sell';

    // Use swapQuoteExactIn for ExactIn mode (equivalent to swapQuote2 with ExactIn)
    const quoteResult = swapQuoteExactIn(
      virtualPoolState,
      poolConfigState,
      swapBaseForQuote,
      amount,
      slippageBps,
      hasReferral,
      new BN(0) // currentPoint
    );

    // Calculate price impact
    const inputValue = amount.toNumber();
    const outputValue = quoteResult.outputAmount.toNumber();
    const priceImpact =
      inputValue > 0 && outputValue > 0
        ? Math.abs((1 - outputValue / inputValue) * 100)
        : 0;

    return {
      amountOut: quoteResult.outputAmount,
      minimumAmountOut: quoteResult.minimumAmountOut || new BN(0),
      nextSqrtPrice: quoteResult.nextSqrtPrice,
      fee: quoteResult.tradingFee || new BN(0),
      priceImpact,
      effectivePrice: outputValue > 0 ? inputValue / outputValue : 0,
    };
  }
}
