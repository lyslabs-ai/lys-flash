/**
 * Type definitions for @solana-execution/client
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
 * } from '@solana-execution/client';
 * ```
 *
 * @module types
 */

// Transport types
export type { TransportMode } from './transport';
export { TRANSPORT_DESCRIPTIONS, TRANSPORT_LATENCY } from './transport';

// Configuration types
export type {
  ClientConfig,
  Logger,
  ClientStats,
  TransportConfig,
} from './config';

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

  // Request types
  TransactionRequest,
  WalletCreationRequest,
} from './operations';
