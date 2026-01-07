/**
 * Meteora DAMM v1 Types
 *
 * Type definitions for Meteora Dynamic AMM v1 operations.
 *
 * @module meteora/damm-v1/types
 */

import type { PublicKey } from '@solana/web3.js';
import type BN from 'bn.js';

// Re-export SOL_MINT from damm-v2 for consistency
export { SOL_MINT } from '../damm-v2/types';

// =============================================================================
// SWAP PARAMETERS
// =============================================================================

/**
 * Parameters for swap() operation
 *
 * Generic swap with explicit input mint specification.
 */
export interface DAMMv1SwapParams {
  /** Pool address */
  pool: string | PublicKey;
  /** User wallet address (owner) */
  user: string | PublicKey;
  /** Input token mint address */
  inputMint: string | PublicKey;
  /** Amount of input tokens (in smallest units) */
  amountIn: number | BN;
  /** Minimum output tokens to receive (slippage protection) */
  minimumAmountOut: number | BN;
  /** Optional referral owner address */
  referralOwner?: string | PublicKey | null;
}

/**
 * Parameters for buy() operation
 *
 * Convenience method for buying tokens with SOL.
 */
export interface DAMMv1BuyParams {
  /** Pool address */
  pool: string | PublicKey;
  /** User wallet address */
  user: string | PublicKey;
  /** Token mint address to buy (non-SOL token in the pool) */
  tokenMint: string | PublicKey;
  /** Amount of SOL to spend (in lamports) */
  solAmountIn: number | BN;
  /** Minimum tokens to receive */
  minTokensOut: number | BN;
  /** Optional referral owner address */
  referralOwner?: string | PublicKey | null;
}

/**
 * Parameters for sell() operation
 *
 * Convenience method for selling tokens for SOL.
 */
export interface DAMMv1SellParams {
  /** Pool address */
  pool: string | PublicKey;
  /** User wallet address */
  user: string | PublicKey;
  /** Token mint address to sell */
  tokenMint: string | PublicKey;
  /** Amount of tokens to sell (in smallest units) */
  tokenAmountIn: number | BN;
  /** Minimum SOL to receive (in lamports) */
  minSolOut: number | BN;
  /** Optional referral owner address */
  referralOwner?: string | PublicKey | null;
}

// =============================================================================
// STATE TYPES
// =============================================================================

/**
 * DAMM v1 Pool State
 *
 * Information about a Meteora Dynamic AMM v1 pool.
 */
export interface DAMMv1PoolState {
  /** Pool address */
  address: PublicKey;
  /** Token A mint address */
  tokenAMint: PublicKey;
  /** Token B mint address */
  tokenBMint: PublicKey;
  /** Token A decimals */
  tokenADecimals: number;
  /** Token B decimals */
  tokenBDecimals: number;
  /** Virtual price (raw BN) */
  virtualPriceRaw: BN;
  /** Raw AmmImpl instance for advanced usage */
  raw: unknown;
}

// =============================================================================
// QUOTE TYPES
// =============================================================================

/**
 * DAMM v1 Swap Quote
 *
 * Result from getSwapQuote() calculation.
 */
export interface DAMMv1SwapQuote {
  /** Input amount */
  swapInAmount: BN;
  /** Expected output amount */
  swapOutAmount: BN;
  /** Minimum output with slippage applied */
  minSwapOutAmount: BN;
  /** Trading fee */
  fee: BN;
  /** Price impact as decimal (e.g., 0.01 = 1%) */
  priceImpact: number;
}
