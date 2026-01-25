/**
 * Raydium LaunchPad Types
 *
 * Type definitions for Raydium LaunchPad (Bonding Curve) operations.
 *
 * @module raydium/launchpad/types
 */

import type { PublicKey } from '@solana/web3.js';
import type BN from 'bn.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Raydium LaunchPad Program ID (Mainnet)
 */
export const RAYDIUM_LAUNCHPAD_PROGRAM_ID = 'LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj';

/**
 * Wrapped SOL Mint Address
 */
export const SOL_MINT = 'So11111111111111111111111111111111111111112';

// ============================================================================
// Direction Types
// ============================================================================

/**
 * Swap direction for LaunchPad operations
 * - 'buy': SOL -> Token (buying tokens with SOL)
 * - 'sell': Token -> SOL (selling tokens for SOL)
 */
export type RaydiumLaunchPadSwapDirection = 'buy' | 'sell';

// ============================================================================
// Swap Parameters
// ============================================================================

/**
 * Parameters for generic LaunchPad swap operation
 */
export interface RaydiumLaunchPadSwapParams {
  /**
   * LaunchPad pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address (will sign the transaction)
   */
  user: string | PublicKey;

  /**
   * Input amount (lamports for buy, token amount for sell)
   */
  amountIn: number | BN;

  /**
   * Minimum output amount with slippage protection
   */
  minimumAmountOut: number | BN;

  /**
   * Swap direction
   */
  direction: RaydiumLaunchPadSwapDirection;

  /**
   * Optional share fee receiver address
   */
  shareFeeReceiver?: string | PublicKey | null;
}

/**
 * Parameters for LaunchPad buy operation (SOL -> Token)
 */
export interface RaydiumLaunchPadBuyParams {
  /**
   * LaunchPad pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address (will sign the transaction)
   */
  user: string | PublicKey;

  /**
   * SOL amount to spend (in lamports)
   */
  solAmountIn: number | BN;

  /**
   * Minimum tokens to receive (with slippage protection)
   */
  minTokensOut: number | BN;

  /**
   * Optional share fee receiver address
   */
  shareFeeReceiver?: string | PublicKey | null;
}

/**
 * Parameters for LaunchPad sell operation (Token -> SOL)
 */
export interface RaydiumLaunchPadSellParams {
  /**
   * LaunchPad pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address (will sign the transaction)
   */
  user: string | PublicKey;

  /**
   * Token amount to sell
   */
  tokenAmountIn: number | BN;

  /**
   * Minimum SOL to receive (in lamports, with slippage protection)
   */
  minSolOut: number | BN;

  /**
   * Optional share fee receiver address
   */
  shareFeeReceiver?: string | PublicKey | null;
}

// ============================================================================
// State/Query Types
// ============================================================================

/**
 * LaunchPad pool state information
 */
export interface RaydiumLaunchPadPoolState {
  /**
   * Pool address
   */
  address: PublicKey;

  /**
   * Base token mint (the token being launched)
   */
  baseMint: PublicKey;

  /**
   * Quote token mint (usually SOL)
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
   * Virtual base token reserve
   */
  virtualBase: BN;

  /**
   * Virtual quote token reserve
   */
  virtualQuote: BN;

  /**
   * Real base token supply
   */
  realBase: BN;

  /**
   * Real quote token collected
   */
  realQuote: BN;

  /**
   * Pool status
   */
  status: number;

  /**
   * Pool creator address
   */
  creator: PublicKey;

  /**
   * Platform ID
   */
  platformId: PublicKey;

  /**
   * Config ID
   */
  configId: PublicKey;

  /**
   * Raw pool info from SDK
   */
  raw: unknown;
}

/**
 * LaunchPad swap quote result
 */
export interface RaydiumLaunchPadSwapQuote {
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
