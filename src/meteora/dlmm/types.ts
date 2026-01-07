/**
 * Meteora DLMM Types
 *
 * Type definitions for Meteora DLMM (Dynamic Liquidity Market Maker) operations.
 *
 * @module meteora/dlmm/types
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
 * Generic swap with explicit input/output token specification.
 * Bin arrays are fetched automatically if not provided.
 */
export interface DLMMSwapParams {
  /** Pool address */
  pool: string | PublicKey;
  /** User wallet address */
  user: string | PublicKey;
  /** Input token mint address */
  inputMint: string | PublicKey;
  /** Output token mint address */
  outputMint: string | PublicKey;
  /** Amount of input tokens (in smallest units) */
  amountIn: number | BN;
  /** Minimum output tokens to receive (slippage protection) */
  minimumAmountOut: number | BN;
}

/**
 * Parameters for swapExactOut() operation
 *
 * Swap targeting exact output amount.
 */
export interface DLMMSwapExactOutParams {
  /** Pool address */
  pool: string | PublicKey;
  /** User wallet address */
  user: string | PublicKey;
  /** Input token mint address */
  inputMint: string | PublicKey;
  /** Output token mint address */
  outputMint: string | PublicKey;
  /** Exact amount of output tokens desired */
  amountOut: number | BN;
  /** Maximum input tokens willing to spend */
  maximumAmountIn: number | BN;
}

/**
 * Parameters for buy() operation
 *
 * Convenience method for buying tokens with SOL.
 */
export interface DLMMBuyParams {
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
}

/**
 * Parameters for sell() operation
 *
 * Convenience method for selling tokens for SOL.
 */
export interface DLMMSellParams {
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
}

/**
 * Parameters for buyExactOut() operation
 *
 * Buy exact amount of tokens.
 */
export interface DLMMBuyExactOutParams {
  /** Pool address */
  pool: string | PublicKey;
  /** User wallet address */
  user: string | PublicKey;
  /** Token mint address to buy */
  tokenMint: string | PublicKey;
  /** Exact amount of tokens desired */
  tokensOut: number | BN;
  /** Maximum SOL willing to spend (in lamports) */
  maxSolIn: number | BN;
}

/**
 * Parameters for sellExactOut() operation
 *
 * Sell tokens for exact amount of SOL.
 */
export interface DLMMSellExactOutParams {
  /** Pool address */
  pool: string | PublicKey;
  /** User wallet address */
  user: string | PublicKey;
  /** Token mint address to sell */
  tokenMint: string | PublicKey;
  /** Exact amount of SOL desired (in lamports) */
  solOut: number | BN;
  /** Maximum tokens willing to sell */
  maxTokensIn: number | BN;
}

// =============================================================================
// STATE TYPES
// =============================================================================

/**
 * DLMM Pool State
 *
 * Information about a Meteora DLMM pool.
 */
export interface DLMMPoolState {
  /** Pool address */
  address: PublicKey;
  /** Token X mint address */
  tokenXMint: PublicKey;
  /** Token Y mint address */
  tokenYMint: PublicKey;
  /** Token X decimals */
  tokenXDecimals: number;
  /** Token Y decimals */
  tokenYDecimals: number;
  /** Active bin ID */
  activeBinId: number;
  /** Bin step (price tick size) */
  binStep: number;
  /** Base fee rate in basis points */
  baseFee: BN;
  /** Raw DLMM instance for advanced usage */
  raw: unknown;
}

/**
 * Active bin information
 */
export interface DLMMActiveBin {
  /** Bin ID */
  binId: number;
  /** Price at this bin */
  price: string;
  /** Price per token (formatted) */
  pricePerToken: string;
  /** X amount in bin */
  xAmount: BN;
  /** Y amount in bin */
  yAmount: BN;
}

// =============================================================================
// QUOTE TYPES
// =============================================================================

/**
 * DLMM Swap Quote
 *
 * Result from swapQuote() calculation.
 */
export interface DLMMSwapQuote {
  /** Amount to be consumed (actual input after fees) */
  consumedInAmount: BN;
  /** Expected output amount */
  outAmount: BN;
  /** Total fee charged */
  fee: BN;
  /** Protocol fee portion */
  protocolFee: BN;
  /** Minimum output with slippage applied */
  minOutAmount: BN;
  /** Price impact as decimal (e.g., 0.01 = 1%) */
  priceImpact: number;
}

/**
 * DLMM Swap Quote for Exact Out
 *
 * Result from swapQuoteExactOut() calculation.
 */
export interface DLMMSwapQuoteExactOut {
  /** Maximum input amount needed */
  maxInAmount: BN;
  /** Exact output amount */
  outAmount: BN;
  /** Total fee charged */
  fee: BN;
  /** Protocol fee portion */
  protocolFee: BN;
  /** Price impact as decimal */
  priceImpact: number;
}
