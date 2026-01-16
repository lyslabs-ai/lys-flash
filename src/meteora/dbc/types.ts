/**
 * Meteora DBC (Dynamic Bonding Curve) Type Definitions
 *
 * @module meteora/dbc/types
 */

import type { PublicKey } from '@solana/web3.js';
import type BN from 'bn.js';

// ============================================================================
// Direction Types
// ============================================================================

/**
 * Swap direction for DBC operations
 * - 'buy': Quote token (SOL) -> Base token (swapBaseForQuote = false)
 * - 'sell': Base token -> Quote token (SOL) (swapBaseForQuote = true)
 */
export type DBCSwapDirection = 'buy' | 'sell';

/**
 * Swap mode for swap2 operations
 * - 'ExactIn': Swap exact input amount, receive at least minimumAmountOut
 * - 'PartialFill': Allow partial fills of the order
 * - 'ExactOut': Swap for exact output amount, pay at most maximumAmountIn
 */
export type DBCSwapMode = 'ExactIn' | 'PartialFill' | 'ExactOut';

// ============================================================================
// swap() Parameters (Simple ExactIn only)
// ============================================================================

/**
 * Parameters for DBC swap operation (basic swap)
 */
export interface DBCSwapParams {
  /**
   * Pool address (DBC pool public key)
   */
  pool: string | PublicKey;

  /**
   * User wallet address performing the swap
   */
  user: string | PublicKey;

  /**
   * Amount of input tokens (in smallest unit)
   * For buy: SOL amount in lamports
   * For sell: Token amount in smallest unit
   */
  amountIn: number | BN;

  /**
   * Minimum amount of output tokens (slippage protection)
   * For buy: Minimum tokens to receive
   * For sell: Minimum SOL to receive (in lamports)
   */
  minimumAmountOut: number | BN;

  /**
   * Swap direction
   * - 'buy': SOL -> Token
   * - 'sell': Token -> SOL
   */
  direction: DBCSwapDirection;

  /**
   * Optional referral token account for fee collection
   */
  referralTokenAccount?: string | PublicKey | null;
}

/**
 * Parameters for DBC buy operation (convenience wrapper)
 */
export interface DBCBuyParams {
  /**
   * Pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address
   */
  user: string | PublicKey;

  /**
   * SOL amount to spend (in lamports)
   * @example 1_000_000_000 // 1 SOL
   */
  solAmountIn: number | BN;

  /**
   * Minimum tokens to receive (slippage protection)
   */
  minTokensOut: number | BN;

  /**
   * Optional referral token account
   */
  referralTokenAccount?: string | PublicKey | null;
}

/**
 * Parameters for DBC sell operation (convenience wrapper)
 */
export interface DBCSellParams {
  /**
   * Pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address
   */
  user: string | PublicKey;

  /**
   * Token amount to sell (in smallest unit)
   */
  tokenAmountIn: number | BN;

  /**
   * Minimum SOL to receive (in lamports, slippage protection)
   */
  minSolOut: number | BN;

  /**
   * Optional referral token account
   */
  referralTokenAccount?: string | PublicKey | null;
}

// ============================================================================
// swap2() Parameters (Supports ExactIn, PartialFill, ExactOut)
// ============================================================================

/**
 * Base parameters for swap2 operations (shared across all modes)
 */
export interface DBCSwap2BaseParams {
  /**
   * Pool address (DBC pool public key)
   */
  pool: string | PublicKey;

  /**
   * User wallet address performing the swap
   */
  user: string | PublicKey;

  /**
   * Swap direction
   * - 'buy': Quote token (SOL) -> Base token
   * - 'sell': Base token -> Quote token (SOL)
   */
  direction: DBCSwapDirection;

  /**
   * Optional referral token account for fee collection
   */
  referralTokenAccount?: string | PublicKey | null;
}

/**
 * Parameters for swap2 with ExactIn mode
 * Swap exact input amount, receive at least minimumAmountOut
 */
export interface DBCSwap2ExactInParams extends DBCSwap2BaseParams {
  /**
   * Swap mode: ExactIn
   */
  mode: 'ExactIn';

  /**
   * Exact amount of tokens to swap in
   */
  amountIn: number | BN;

  /**
   * Minimum amount of tokens to receive (slippage protection)
   */
  minimumAmountOut: number | BN;
}

/**
 * Parameters for swap2 with PartialFill mode
 * Allow partial fills of the order
 */
export interface DBCSwap2PartialFillParams extends DBCSwap2BaseParams {
  /**
   * Swap mode: PartialFill
   */
  mode: 'PartialFill';

  /**
   * Amount of tokens to swap in
   */
  amountIn: number | BN;

  /**
   * Minimum amount of tokens to receive (slippage protection)
   */
  minimumAmountOut: number | BN;
}

/**
 * Parameters for swap2 with ExactOut mode
 * Swap for exact output amount, pay at most maximumAmountIn
 */
export interface DBCSwap2ExactOutParams extends DBCSwap2BaseParams {
  /**
   * Swap mode: ExactOut
   */
  mode: 'ExactOut';

  /**
   * Exact amount of tokens desired out
   */
  amountOut: number | BN;

  /**
   * Maximum amount willing to pay in (slippage protection)
   */
  maximumAmountIn: number | BN;
}

/**
 * Union type for all swap2 parameter variants
 */
export type DBCSwap2Params =
  | DBCSwap2ExactInParams
  | DBCSwap2PartialFillParams
  | DBCSwap2ExactOutParams;

/**
 * Parameters for buy2 convenience method (ExactIn mode)
 */
export type DBCBuy2Params = Omit<DBCSwap2ExactInParams, 'direction' | 'mode'>;

/**
 * Parameters for sell2 convenience method (ExactIn mode)
 */
export type DBCSell2Params = Omit<DBCSwap2ExactInParams, 'direction' | 'mode'>;

/**
 * Parameters for buyExactOut convenience method (ExactOut mode)
 */
export type DBCBuyExactOutParams = Omit<DBCSwap2ExactOutParams, 'direction' | 'mode'>;

/**
 * Parameters for sellExactOut convenience method (ExactOut mode)
 */
export type DBCSellExactOutParams = Omit<DBCSwap2ExactOutParams, 'direction' | 'mode'>;

// ============================================================================
// State/Query Types
// ============================================================================

/**
 * Pool state information returned by getPool
 */
export interface DBCPoolState {
  /**
   * Pool address
   */
  address: PublicKey;

  /**
   * Pool configuration address
   */
  config: PublicKey;

  /**
   * Base token mint (the token being traded)
   */
  baseMint: PublicKey;

  /**
   * Quote token mint (usually WSOL)
   */
  quoteMint: PublicKey;

  /**
   * Current square root price
   */
  sqrtPrice: BN;

  /**
   * Base token reserve
   */
  baseReserve: BN;

  /**
   * Quote token reserve
   */
  quoteReserve: BN;

  /**
   * Whether the pool has migrated to AMM
   */
  migrated: boolean;

  /**
   * Pool creator address
   */
  creator: PublicKey;

  /**
   * Raw pool state from Meteora SDK (for advanced usage)
   */
  raw: unknown;
}

/**
 * Swap quote result from swapQuote or swapQuote2
 */
export interface DBCSwapQuote {
  /**
   * Expected output amount
   */
  amountOut: BN;

  /**
   * Minimum output amount with slippage applied
   */
  minimumAmountOut: BN;

  /**
   * Next square root price after swap
   */
  nextSqrtPrice: BN;

  /**
   * Fee amount charged
   */
  fee: BN;

  /**
   * Price impact percentage (0-100)
   */
  priceImpact: number;

  /**
   * Effective price (input/output ratio)
   */
  effectivePrice: number;
}
