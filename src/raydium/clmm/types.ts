/**
 * Raydium CLMM Types
 *
 * Type definitions for Raydium CLMM (Concentrated Liquidity Market Maker) operations.
 *
 * @module raydium/clmm/types
 */

import type { PublicKey } from '@solana/web3.js';
import type BN from 'bn.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Raydium CLMM Program ID (Mainnet)
 */
export const RAYDIUM_CLMM_PROGRAM_ID = 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK';

/**
 * Wrapped SOL Mint Address
 */
export const SOL_MINT = 'So11111111111111111111111111111111111111112';

// ============================================================================
// Direction and Mode Types
// ============================================================================

/**
 * Swap direction for CLMM operations
 */
export type RaydiumCLMMSwapDirection = 'buy' | 'sell';

/**
 * Swap mode for CLMM operations
 */
export type RaydiumCLMMSwapMode = 'ExactIn' | 'ExactOut';

// ============================================================================
// Swap Parameters
// ============================================================================

/**
 * Parameters for CLMM swap operation (ExactIn)
 */
export interface RaydiumCLMMSwapParams {
  /**
   * CLMM pool address
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
 * Parameters for CLMM swap operation (ExactOut)
 */
export interface RaydiumCLMMSwapExactOutParams {
  /**
   * CLMM pool address
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
 * Parameters for CLMM buy operation (SOL -> Token)
 */
export interface RaydiumCLMMBuyParams {
  /**
   * CLMM pool address
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
 * Parameters for CLMM sell operation (Token -> SOL)
 */
export interface RaydiumCLMMSellParams {
  /**
   * CLMM pool address
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
 * Parameters for CLMM buy exact out operation
 */
export interface RaydiumCLMMBuyExactOutParams {
  /**
   * CLMM pool address
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
 * Parameters for CLMM sell exact out operation
 */
export interface RaydiumCLMMSellExactOutParams {
  /**
   * CLMM pool address
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
 * CLMM pool state information
 */
export interface RaydiumCLMMPoolState {
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
   * Current sqrt price (X64 fixed-point)
   */
  sqrtPriceX64: BN;

  /**
   * Current tick index
   */
  currentTickIndex: number;

  /**
   * Total liquidity
   */
  liquidity: BN;

  /**
   * Trading fee rate (in basis points)
   */
  feeRate: number;

  /**
   * Tick spacing
   */
  tickSpacing: number;

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
 * CLMM swap quote result (ExactIn)
 */
export interface RaydiumCLMMSwapQuote {
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

  /**
   * Current price
   */
  currentPrice: number;

  /**
   * Execution price
   */
  executionPrice: number;
}

/**
 * CLMM swap quote result (ExactOut)
 */
export interface RaydiumCLMMSwapQuoteExactOut {
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
