/**
 * Raydium CPMM Types
 *
 * Type definitions for Raydium CPMM (Constant Product Market Maker) operations.
 *
 * @module raydium/cpmm/types
 */

import type { PublicKey } from '@solana/web3.js';
import type BN from 'bn.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Wrapped SOL Mint Address
 */
export const SOL_MINT = 'So11111111111111111111111111111111111111112';

// ============================================================================
// Direction and Mode Types
// ============================================================================

/**
 * Swap direction for CPMM operations
 */
export type RaydiumCPMMSwapDirection = 'buy' | 'sell';

/**
 * Swap mode for CPMM operations
 */
export type RaydiumCPMMSwapMode = 'ExactIn' | 'ExactOut';

// ============================================================================
// Swap Parameters
// ============================================================================

/**
 * Parameters for CPMM swap operation (ExactIn)
 */
export interface RaydiumCPMMSwapParams {
  /**
   * CPMM pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address (will sign the transaction)
   */
  user: string | PublicKey;

  /**
   * Input token mint address
   */
  inputMint: string | PublicKey;

  /**
   * Output token mint address
   */
  outputMint: string | PublicKey;

  /**
   * Input amount to swap
   */
  amountIn: number | BN;

  /**
   * Minimum output amount with slippage protection
   */
  minimumAmountOut: number | BN;
}

/**
 * Parameters for CPMM swap operation (ExactOut)
 */
export interface RaydiumCPMMSwapExactOutParams {
  /**
   * CPMM pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address (will sign the transaction)
   */
  user: string | PublicKey;

  /**
   * Input token mint address
   */
  inputMint: string | PublicKey;

  /**
   * Output token mint address
   */
  outputMint: string | PublicKey;

  /**
   * Desired output amount
   */
  amountOut: number | BN;

  /**
   * Maximum input amount with slippage protection
   */
  maximumAmountIn: number | BN;
}

/**
 * Parameters for CPMM buy operation (SOL -> Token)
 */
export interface RaydiumCPMMBuyParams {
  /**
   * CPMM pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address (will sign the transaction)
   */
  user: string | PublicKey;

  /**
   * Token mint address (not SOL)
   */
  tokenMint: string | PublicKey;

  /**
   * SOL amount to spend (in lamports)
   */
  solAmountIn: number | BN;

  /**
   * Minimum tokens to receive (with slippage protection)
   */
  minTokensOut: number | BN;
}

/**
 * Parameters for CPMM sell operation (Token -> SOL)
 */
export interface RaydiumCPMMSellParams {
  /**
   * CPMM pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address (will sign the transaction)
   */
  user: string | PublicKey;

  /**
   * Token mint address (not SOL)
   */
  tokenMint: string | PublicKey;

  /**
   * Token amount to sell
   */
  tokenAmountIn: number | BN;

  /**
   * Minimum SOL to receive (in lamports, with slippage protection)
   */
  minSolOut: number | BN;
}

/**
 * Parameters for CPMM buy exact out operation
 */
export interface RaydiumCPMMBuyExactOutParams {
  /**
   * CPMM pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address (will sign the transaction)
   */
  user: string | PublicKey;

  /**
   * Token mint address (not SOL)
   */
  tokenMint: string | PublicKey;

  /**
   * Exact token amount to receive
   */
  amountOut: number | BN;

  /**
   * Maximum SOL to spend (in lamports, with slippage protection)
   */
  maximumAmountIn: number | BN;
}

/**
 * Parameters for CPMM sell exact out operation
 */
export interface RaydiumCPMMSellExactOutParams {
  /**
   * CPMM pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address (will sign the transaction)
   */
  user: string | PublicKey;

  /**
   * Token mint address (not SOL)
   */
  tokenMint: string | PublicKey;

  /**
   * Exact SOL amount to receive (in lamports)
   */
  amountOut: number | BN;

  /**
   * Maximum tokens to spend (with slippage protection)
   */
  maximumAmountIn: number | BN;
}

// ============================================================================
// State/Query Types
// ============================================================================

/**
 * CPMM pool state information
 */
export interface RaydiumCPMMPoolState {
  /**
   * Pool address
   */
  address: PublicKey;

  /**
   * Token A mint address
   */
  mintA: PublicKey;

  /**
   * Token B mint address
   */
  mintB: PublicKey;

  /**
   * Token A vault address
   */
  vaultA: PublicKey;

  /**
   * Token B vault address
   */
  vaultB: PublicKey;

  /**
   * Token A reserve amount
   */
  mintAAmount: BN;

  /**
   * Token B reserve amount
   */
  mintBAmount: BN;

  /**
   * LP token mint address
   */
  lpMint: PublicKey;

  /**
   * LP token supply
   */
  lpSupply: BN;

  /**
   * Pool config ID
   */
  configId: PublicKey;

  /**
   * Trading fee rate (in basis points)
   */
  feeRate: number;

  /**
   * Token A decimals
   */
  decimalsA: number;

  /**
   * Token B decimals
   */
  decimalsB: number;

  /**
   * Raw pool info from SDK
   */
  raw: unknown;
}

/**
 * CPMM swap quote result (ExactIn)
 */
export interface RaydiumCPMMSwapQuote {
  /**
   * Input amount
   */
  amountIn: BN;

  /**
   * Expected output amount (before slippage)
   */
  amountOut: BN;

  /**
   * Minimum output amount (after slippage)
   */
  minimumAmountOut: BN;

  /**
   * Trading fee amount
   */
  fee: BN;

  /**
   * Price impact as a percentage (0-100)
   */
  priceImpact: number;
}

/**
 * CPMM swap quote result (ExactOut)
 */
export interface RaydiumCPMMSwapQuoteExactOut {
  /**
   * Required input amount (before slippage)
   */
  amountIn: BN;

  /**
   * Output amount
   */
  amountOut: BN;

  /**
   * Maximum input amount (after slippage)
   */
  maximumAmountIn: BN;

  /**
   * Trading fee amount
   */
  fee: BN;

  /**
   * Price impact as a percentage (0-100)
   */
  priceImpact: number;
}
