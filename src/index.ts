/**
 * @lyslabs.ai/lys-flash
 *
 * High-performance TypeScript client for Solana Execution Engine.
 * Ultra-low latency transaction execution for trading bots.
 *
 * @example Quick start
 * ```typescript
 * import { SolanaExecutionClient, TransactionBuilder } from '@lyslabs.ai/lys-flash';
 *
 * const client = new SolanaExecutionClient();
 *
 * // Simple buy with builder pattern
 * const result = await new TransactionBuilder(client)
 *   .pumpFunBuy({
 *     pool: "mint_address",
 *     poolAccounts: { coinCreator: "creator" },
 *     user: "wallet",
 *     solAmountIn: 1_000_000,
 *     tokenAmountOut: 3_400_000_000
 *   })
 *   .setFeePayer("wallet")
 *   .setPriorityFee(1_000_000)
 *   .setTransport("NONCE")
 *   .send();
 *
 * console.log("Signature:", result.signature);
 * client.close();
 * ```
 *
 * @packageDocumentation
 */

// Core classes
export { SolanaExecutionClient } from './client';
export { TransactionBuilder } from './builder';

// Error handling
export { ExecutionError, ErrorCode, fromUnknownError } from './errors';

// All types
export * from './types';

// Re-export specific types for convenience (most commonly used)
export type {
  // Client & config
  ClientConfig,
  ClientStats,
  Logger,

  // Requests & responses
  TransactionRequest,
  TransactionResponse,
  SuccessResponse,
  ErrorResponse,
  SimulationResponse,
  WalletCreationResponse,

  // Transport
  TransportMode,

  // Pump.fun operations
  PumpFunBuyParams,
  PumpFunSellParams,
  PumpFunCreateParams,
  PumpFunMigrateParams,

  // Pump.fun AMM operations
  PumpFunAmmBuyParams,
  PumpFunAmmSellParams,

  // System transfer
  SystemTransferParams,

  // SPL Token operations
  SplTokenTransferParams,
  SplTokenTransferCheckedParams,
  SplTokenCreateATAParams,
  SplTokenCloseAccountParams,
  SplTokenApproveParams,
  SplTokenRevokeParams,
  SplTokenMintToParams,
  SplTokenBurnParams,
  SplTokenSyncNativeParams,
} from './types';

/**
 * Library version
 */
export const VERSION = '1.0.0';

/**
 * Default ZMQ address
 */
export const DEFAULT_ZMQ_ADDRESS = 'ipc:///tmp/tx-executor.ipc';
