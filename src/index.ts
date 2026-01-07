/**
 * @lyslabs.ai/lys-flash
 *
 * High-performance TypeScript client for Solana Execution Engine.
 * Ultra-low latency transaction execution for trading bots.
 *
 * @example Quick start
 * ```typescript
 * import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';
 *
 * const client = new LysFlash();
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
 *   .setBribe(1_000_000)             // 0.001 SOL bribe (mandatory for FLASH)
 *   .setTransport("FLASH")
 *   .send();
 *
 * console.log("Signature:", result.signature);
 * client.close();
 * ```
 *
 * @packageDocumentation
 */

// Core classes
export { LysFlash, SolanaExecutionClient } from './client';
export { TransactionBuilder } from './builder';

// Error handling
export { ExecutionError, ErrorCode, fromUnknownError } from './errors';

// Meteora integration
export {
  MeteoraNamespace,
  DBCNamespace,
  DBCUtils,
  DAMMv2Namespace,
  DAMMv2Utils,
  SOL_MINT,
} from './meteora';

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

  // Raw transaction
  RawTransactionParams,
} from './types';

// Meteora DBC types (re-export for convenience)
export type {
  // Direction and mode types
  DBCSwapDirection,
  DBCSwapMode,
  // swap() params
  DBCSwapParams,
  DBCBuyParams,
  DBCSellParams,
  // swap2() params
  DBCSwap2BaseParams,
  DBCSwap2ExactInParams,
  DBCSwap2PartialFillParams,
  DBCSwap2ExactOutParams,
  DBCSwap2Params,
  DBCBuy2Params,
  DBCSell2Params,
  DBCBuyExactOutParams,
  DBCSellExactOutParams,
  // State/query types
  DBCPoolState,
  DBCSwapQuote,
} from './meteora';

// Meteora DAMM v2 types (re-export for convenience)
export type {
  // Direction and mode types
  DAMMv2SwapDirection,
  DAMMv2SwapMode,
  // swap() params
  DAMMv2SwapParams,
  DAMMv2BuyParams,
  DAMMv2SellParams,
  // swap2() params
  DAMMv2Swap2BaseParams,
  DAMMv2Swap2ExactInParams,
  DAMMv2Swap2PartialFillParams,
  DAMMv2Swap2ExactOutParams,
  DAMMv2Swap2Params,
  DAMMv2Buy2Params,
  DAMMv2Sell2Params,
  DAMMv2BuyExactOutParams,
  DAMMv2SellExactOutParams,
  // State/query types
  DAMMv2PoolState,
  DAMMv2SwapQuote,
} from './meteora';

/**
 * Library version
 */
export const VERSION = '1.2.2';

/**
 * Default address (ZMQ IPC)
 */
export const DEFAULT_ADDRESS = 'ipc:///tmp/tx-executor.ipc';

/**
 * @deprecated Use DEFAULT_ADDRESS instead
 * Default ZMQ address
 */
export const DEFAULT_ZMQ_ADDRESS = 'ipc:///tmp/tx-executor.ipc';

/**
 * Default HTTP port
 */
export const DEFAULT_HTTP_PORT = 3000;
