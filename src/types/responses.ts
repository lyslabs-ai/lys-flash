/**
 * Base response interface
 */
export interface BaseResponse {
  /**
   * Transport mode used for execution
   * @example "NOZOMI", "FLASH", "VANILLA"
   */
  transport: string;

  /**
   * Whether the transaction was successful
   */
  success: boolean;
}

/**
 * Successful transaction response
 */
export interface SuccessResponse extends BaseResponse {
  success: true;

  /**
   * Transaction signature (base58 encoded)
   * @example "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW"
   */
  signature: string;

  /**
   * Error is null for successful responses
   */
  error: null;

  /**
   * Confirmation latency in milliseconds
   * Time from broadcast to PROCESSED confirmation
   * Only available with gRPC monitoring enabled
   * @example 47 // 47ms to confirmation
   */
  latency?: number;

  /**
   * Slot number where transaction was confirmed
   * Only available with gRPC monitoring enabled
   */
  slot?: number;

  /**
   * Commitment level
   * Only available with gRPC monitoring enabled
   * @example "processed" | "confirmed" | "finalized"
   */
  commitment?: string;

  /**
   * Transaction logs
   * Only available in SIMULATE mode
   */
  logs?: string[];
}

/**
 * Failed transaction response
 */
export interface ErrorResponse extends BaseResponse {
  success: false;

  /**
   * Signature is null for failed responses
   */
  signature: null;

  /**
   * Error message or Error object
   */
  error: string | Error;

  /**
   * Transaction logs (if available)
   * Typically available in SIMULATE mode or if simulation was run before execution
   */
  logs?: string[];
}

/**
 * Transaction response (success or error)
 */
export type TransactionResponse = SuccessResponse | ErrorResponse;

/**
 * Simulation response (extends success response with logs)
 */
export interface SimulationResponse extends SuccessResponse {
  /**
   * Simulation logs are always present
   */
  logs: string[];
}

/**
 * Wallet creation response
 */
export interface WalletCreationResponse {
  /**
   * Operation success status
   */
  success: true;

  /**
   * New wallet public key (base58 encoded)
   * @example "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
   */
  publicKey: string;

  /**
   * Encrypted secret key for the user (base64 encoded)
   * Encrypted using TweetNaCl box with user's public key
   * User can decrypt with their Ed25519 private key (converted to Curve25519)
   */
  encryptedSecretKey: string;

  /**
   * Encryption nonce (base64 encoded)
   * Required for decryption
   */
  nonce: string;

  /**
   * Ephemeral public key used for encryption (base64 encoded)
   * Required for decryption
   */
  ephemeralPublicKey: string;
}

/**
 * Type guard to check if response is successful
 * @param response - Transaction response to check
 * @returns true if response is SuccessResponse
 *
 * @example
 * ```typescript
 * const response = await client.execute(request);
 * if (isSuccessResponse(response)) {
 *   console.log("Signature:", response.signature);
 * } else {
 *   console.error("Error:", response.error);
 * }
 * ```
 */
export function isSuccessResponse(response: TransactionResponse): response is SuccessResponse {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 * @param response - Transaction response to check
 * @returns true if response is ErrorResponse
 *
 * @example
 * ```typescript
 * const response = await client.execute(request);
 * if (isErrorResponse(response)) {
 *   console.error("Transaction failed:", response.error);
 * }
 * ```
 */
export function isErrorResponse(response: TransactionResponse): response is ErrorResponse {
  return response.success === false;
}
