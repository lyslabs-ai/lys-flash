/**
 * Meteora DAMM v2 (Dynamic AMM v2 / CP-AMM) Type Definitions
 *
 * @module meteora/damm-v2/types
 */

import type { PublicKey } from '@solana/web3.js';
import type BN from 'bn.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Native SOL mint address (wrapped SOL)
 */
export const SOL_MINT = 'So11111111111111111111111111111111111111112';

// ============================================================================
// Direction Types
// ============================================================================

/**
 * Swap direction for DAMM v2 operations (used for convenience methods)
 * - 'buy': SOL -> Token
 * - 'sell': Token -> SOL
 */
export type DAMMv2SwapDirection = 'buy' | 'sell';

/**
 * Swap mode for swap2 operations
 * - 'ExactIn': Swap exact input amount, receive at least minimumAmountOut
 * - 'PartialFill': Allow partial fills of the order
 * - 'ExactOut': Swap for exact output amount, pay at most maximumAmountIn
 */
export type DAMMv2SwapMode = 'ExactIn' | 'PartialFill' | 'ExactOut';

// ============================================================================
// swap() Parameters
// ============================================================================

/**
 * Parameters for DAMM v2 swap operation (generic swap)
 */
export interface DAMMv2SwapParams {
  /**
   * Pool address (DAMM v2 pool public key)
   */
  pool: string | PublicKey;

  /**
   * User wallet address performing the swap
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
   * Amount of input tokens (in smallest unit)
   */
  amountIn: number | BN;

  /**
   * Minimum amount of output tokens (slippage protection)
   */
  minimumAmountOut: number | BN;

  /**
   * Optional referral account for fee collection
   */
  referralAccount?: string | PublicKey | null;
}

/**
 * Parameters for DAMM v2 buy operation (SOL -> Token convenience wrapper)
 */
export interface DAMMv2BuyParams {
  /**
   * Pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address
   */
  user: string | PublicKey;

  /**
   * Token mint to buy
   */
  tokenMint: string | PublicKey;

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
   * Optional referral account
   */
  referralAccount?: string | PublicKey | null;
}

/**
 * Parameters for DAMM v2 sell operation (Token -> SOL convenience wrapper)
 */
export interface DAMMv2SellParams {
  /**
   * Pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address
   */
  user: string | PublicKey;

  /**
   * Token mint to sell
   */
  tokenMint: string | PublicKey;

  /**
   * Token amount to sell (in smallest unit)
   */
  tokenAmountIn: number | BN;

  /**
   * Minimum SOL to receive (in lamports, slippage protection)
   */
  minSolOut: number | BN;

  /**
   * Optional referral account
   */
  referralAccount?: string | PublicKey | null;
}

// ============================================================================
// swap2() Parameters (Supports ExactIn, PartialFill, ExactOut)
// ============================================================================

/**
 * Base parameters for swap2 operations (shared across all modes)
 */
export interface DAMMv2Swap2BaseParams {
  /**
   * Pool address (DAMM v2 pool public key)
   */
  pool: string | PublicKey;

  /**
   * User wallet address performing the swap
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
   * Optional referral account for fee collection
   */
  referralAccount?: string | PublicKey | null;
}

/**
 * Parameters for swap2 with ExactIn mode
 * Swap exact input amount, receive at least minimumAmountOut
 */
export interface DAMMv2Swap2ExactInParams extends DAMMv2Swap2BaseParams {
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
export interface DAMMv2Swap2PartialFillParams extends DAMMv2Swap2BaseParams {
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
export interface DAMMv2Swap2ExactOutParams extends DAMMv2Swap2BaseParams {
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
export type DAMMv2Swap2Params =
  | DAMMv2Swap2ExactInParams
  | DAMMv2Swap2PartialFillParams
  | DAMMv2Swap2ExactOutParams;

/**
 * Parameters for buy2 convenience method (SOL -> Token, ExactIn mode)
 */
export interface DAMMv2Buy2Params {
  /**
   * Pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address
   */
  user: string | PublicKey;

  /**
   * Token mint to buy
   */
  tokenMint: string | PublicKey;

  /**
   * Exact SOL amount to spend (in lamports)
   */
  amountIn: number | BN;

  /**
   * Minimum tokens to receive (slippage protection)
   */
  minimumAmountOut: number | BN;

  /**
   * Optional referral account
   */
  referralAccount?: string | PublicKey | null;
}

/**
 * Parameters for sell2 convenience method (Token -> SOL, ExactIn mode)
 */
export interface DAMMv2Sell2Params {
  /**
   * Pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address
   */
  user: string | PublicKey;

  /**
   * Token mint to sell
   */
  tokenMint: string | PublicKey;

  /**
   * Exact token amount to sell
   */
  amountIn: number | BN;

  /**
   * Minimum SOL to receive (in lamports, slippage protection)
   */
  minimumAmountOut: number | BN;

  /**
   * Optional referral account
   */
  referralAccount?: string | PublicKey | null;
}

/**
 * Parameters for buyExactOut convenience method (SOL -> Token, ExactOut mode)
 */
export interface DAMMv2BuyExactOutParams {
  /**
   * Pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address
   */
  user: string | PublicKey;

  /**
   * Token mint to buy
   */
  tokenMint: string | PublicKey;

  /**
   * Exact token amount desired
   */
  amountOut: number | BN;

  /**
   * Maximum SOL to pay (in lamports, slippage protection)
   */
  maximumAmountIn: number | BN;

  /**
   * Optional referral account
   */
  referralAccount?: string | PublicKey | null;
}

/**
 * Parameters for sellExactOut convenience method (Token -> SOL, ExactOut mode)
 */
export interface DAMMv2SellExactOutParams {
  /**
   * Pool address
   */
  pool: string | PublicKey;

  /**
   * User wallet address
   */
  user: string | PublicKey;

  /**
   * Token mint to sell
   */
  tokenMint: string | PublicKey;

  /**
   * Exact SOL amount desired (in lamports)
   */
  amountOut: number | BN;

  /**
   * Maximum tokens to sell (slippage protection)
   */
  maximumAmountIn: number | BN;

  /**
   * Optional referral account
   */
  referralAccount?: string | PublicKey | null;
}

// ============================================================================
// State/Query Types
// ============================================================================

/**
 * Pool state information returned by getPool
 */
export interface DAMMv2PoolState {
  /**
   * Pool address
   */
  address: PublicKey;

  /**
   * Token A mint address
   */
  tokenAMint: PublicKey;

  /**
   * Token B mint address
   */
  tokenBMint: PublicKey;

  /**
   * Token A vault address
   */
  tokenAVault: PublicKey;

  /**
   * Token B vault address
   */
  tokenBVault: PublicKey;

  /**
   * Current square root price
   */
  sqrtPrice: BN;

  /**
   * Current liquidity
   */
  liquidity: BN;

  /**
   * Trading fee rate (in basis points)
   */
  feeRate: number;

  /**
   * Protocol fee rate (in basis points)
   */
  protocolFeeRate: number;

  /**
   * Raw pool state from Meteora SDK (for advanced usage)
   */
  raw: unknown;
}

/**
 * Swap quote result from getQuote
 */
export interface DAMMv2SwapQuote {
  /**
   * Input amount
   */
  amountIn: BN;

  /**
   * Expected output amount
   */
  amountOut: BN;

  /**
   * Minimum output amount with slippage applied
   */
  minimumAmountOut: BN;

  /**
   * Trading fee amount
   */
  tradingFee: BN;

  /**
   * Protocol fee amount
   */
  protocolFee: BN;

  /**
   * Referral fee amount
   */
  referralFee: BN;

  /**
   * Price impact percentage (0-100)
   */
  priceImpact: number;
}

/**
 * Extended swap quote result from getQuote2
 */
export interface DAMMv2SwapQuote2 extends DAMMv2SwapQuote {
  /**
   * Partner fee amount
   */
  partnerFee: BN;

  /**
   * Maximum amount in (for ExactOut mode)
   */
  maximumAmountIn?: BN;
}
