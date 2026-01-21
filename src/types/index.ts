/**
 * Type definitions for @lyslabs.ai/lys-flash
 *
 * This module exports all type definitions used by the client library.
 * Import from this module for convenient access to all types.
 *
 * @example
 * ```typescript
 * import {
 *   TransportMode,
 *   PumpFunBuyParams,
 *   TransactionRequest,
 *   TransactionResponse
 * } from '@lyslabs.ai/lys-flash';
 * ```
 *
 * @module types
 */

// Transport types
export type { TransportMode, ServerTransportMode } from './transport';
export {
  TRANSPORT_DESCRIPTIONS,
  TRANSPORT_LATENCY,
  normalizeTransportForServer,
} from './transport';

// Configuration types
export type { ClientConfig, Logger, ClientStats, TransportConfig } from './config';

// Response types
export type {
  BaseResponse,
  SuccessResponse,
  ErrorResponse,
  TransactionResponse,
  SimulationResponse,
  WalletCreationResponse,
} from './responses';
export { isSuccessResponse, isErrorResponse } from './responses';

// Operation types
export type {
  // Base types
  ExecutionType,
  EventType,
  OperationData,

  // Pump.fun operations
  PumpFunBuyParams,
  PumpFunSellParams,
  PumpFunCreateParams,
  PumpFunMigrateParams,

  // Pump.fun AMM operations
  PumpFunAmmBuyParams,
  PumpFunAmmBuyExactQuoteInParams,
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

  // Request types
  TransactionRequest,
  WalletCreationRequest,
} from './operations';
