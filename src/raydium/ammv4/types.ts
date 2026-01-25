/**
 * Raydium AMMv4 Types
 *
 * Type definitions for Raydium AMMv4 (V4 AMM with OpenBook integration) operations.
 *
 * @module raydium/ammv4/types
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

/**
 * AMMv4 trading fee in basis points (0.25%)
 */
export const AMMV4_FEE_BPS = 25;

// ============================================================================
// Direction and Mode Types
// ============================================================================

/**
 * Swap direction for AMMv4 operations
 */
export type RaydiumAMMv4SwapDirection = 'buy' | 'sell';

/**
 * Swap mode for AMMv4 operations
 */
export type RaydiumAMMv4SwapMode = 'ExactIn' | 'ExactOut';

// ============================================================================
// Swap Parameters
// ============================================================================

/**
 * Parameters for AMMv4 swap operation (ExactIn)
 */
export interface RaydiumAMMv4SwapParams {
  /**
   * AMMv4 pool address
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
 * Parameters for AMMv4 swap operation (ExactOut)
 */
export interface RaydiumAMMv4SwapExactOutParams {
  /**
   * AMMv4 pool address
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
 * Parameters for AMMv4 buy operation (SOL -> Token)
 */
export interface RaydiumAMMv4BuyParams {
  /**
   * AMMv4 pool address
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
 * Parameters for AMMv4 sell operation (Token -> SOL)
 */
export interface RaydiumAMMv4SellParams {
  /**
   * AMMv4 pool address
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
 * Parameters for AMMv4 buy exact out operation
 */
export interface RaydiumAMMv4BuyExactOutParams {
  /**
   * AMMv4 pool address
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
 * Parameters for AMMv4 sell exact out operation
 */
export interface RaydiumAMMv4SellExactOutParams {
  /**
   * AMMv4 pool address
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
 * AMMv4 pool state information
 */
export interface RaydiumAMMv4PoolState {
  /**
   * Pool address
   */
  address: PublicKey;

  /**
   * Base token mint address
   */
  baseMint: PublicKey;

  /**
   * Quote token mint address
   */
  quoteMint: PublicKey;

  /**
   * Base token vault address
   */
  baseVault: PublicKey;

  /**
   * Quote token vault address
   */
  quoteVault: PublicKey;

  /**
   * LP token mint address
   */
  lpMint: PublicKey;

  /**
   * OpenBook market ID
   */
  marketId: PublicKey;

  /**
   * OpenBook market program ID
   */
  marketProgramId: PublicKey;

  /**
   * Open orders account
   */
  openOrders: PublicKey;

  /**
   * Base token reserve
   */
  baseReserve: BN;

  /**
   * Quote token reserve
   */
  quoteReserve: BN;

  /**
   * LP token supply
   */
  lpSupply: BN;

  /**
   * Base token decimals
   */
  baseDecimals: number;

  /**
   * Quote token decimals
   */
  quoteDecimals: number;

  /**
   * Raw pool info from SDK
   */
  raw: unknown;
}

/**
 * AMMv4 swap quote result (ExactIn)
 */
export interface RaydiumAMMv4SwapQuote {
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
 * AMMv4 swap quote result (ExactOut)
 */
export interface RaydiumAMMv4SwapQuoteExactOut {
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
