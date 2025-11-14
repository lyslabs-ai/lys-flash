/**
 * Error codes for ExecutionError
 */
export enum ErrorCode {
  /**
   * Network-related error (connection failed, timeout, etc.)
   */
  NETWORK_ERROR = 'NETWORK_ERROR',

  /**
   * Request timeout
   */
  TIMEOUT = 'TIMEOUT',

  /**
   * Invalid request parameters
   */
  INVALID_REQUEST = 'INVALID_REQUEST',

  /**
   * Transaction execution failed
   */
  EXECUTION_FAILED = 'EXECUTION_FAILED',

  /**
   * Nonce pool exhausted (no nonces available)
   */
  NONCE_POOL_EXHAUSTED = 'NONCE_POOL_EXHAUSTED',

  /**
   * Wallet not found
   */
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',

  /**
   * Serialization/deserialization error
   */
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',

  /**
   * Connection error
   */
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  /**
   * Unknown error
   */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for execution errors
 *
 * @example
 * ```typescript
 * try {
 *   const result = await client.execute(request);
 * } catch (error) {
 *   if (error instanceof ExecutionError) {
 *     switch (error.code) {
 *       case ErrorCode.NETWORK_ERROR:
 *         console.error("Network error, retrying...");
 *         break;
 *       case ErrorCode.TIMEOUT:
 *         console.error("Request timeout");
 *         break;
 *       case ErrorCode.NONCE_POOL_EXHAUSTED:
 *         console.error("Nonce pool exhausted, wait and retry");
 *         break;
 *       default:
 *         console.error("Unexpected error:", error.message);
 *     }
 *   }
 * }
 * ```
 */
export class ExecutionError extends Error {
  /**
   * Error code for categorization
   */
  public readonly code: ErrorCode;

  /**
   * Transport mode used when error occurred
   */
  public readonly transport: string;

  /**
   * Original error (if wrapped)
   */
  public readonly originalError?: Error;

  /**
   * Timestamp when error occurred
   */
  public readonly timestamp: Date;

  /**
   * Create a new ExecutionError
   *
   * @param message - Human-readable error message
   * @param code - Error code for categorization
   * @param transport - Transport mode used when error occurred
   * @param originalError - Original error (if wrapping another error)
   */
  constructor(message: string, code: ErrorCode, transport: string, originalError?: Error) {
    super(message);

    // Set the prototype explicitly (for proper instanceof checks)
    Object.setPrototypeOf(this, ExecutionError.prototype);

    this.name = 'ExecutionError';
    this.code = code;
    this.transport = transport;
    this.originalError = originalError;
    this.timestamp = new Date();

    // Capture stack trace (Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExecutionError);
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      transport: this.transport,
      timestamp: this.timestamp.toISOString(),
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : undefined,
      stack: this.stack,
    };
  }

  /**
   * Check if error is retryable
   * Network errors and timeouts are typically retryable
   */
  isRetryable(): boolean {
    return this.code === ErrorCode.NETWORK_ERROR || this.code === ErrorCode.TIMEOUT;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.NETWORK_ERROR:
        return 'Network error occurred. Please check your connection and try again.';
      case ErrorCode.TIMEOUT:
        return 'Request timed out. The server might be busy. Please try again.';
      case ErrorCode.INVALID_REQUEST:
        return 'Invalid request parameters. Please check your inputs.';
      case ErrorCode.EXECUTION_FAILED:
        return `Transaction execution failed: ${this.message}`;
      case ErrorCode.NONCE_POOL_EXHAUSTED:
        return 'Nonce pool exhausted. Please wait a moment and try again.';
      case ErrorCode.WALLET_NOT_FOUND:
        return 'Wallet not found. Please check the wallet address.';
      case ErrorCode.SERIALIZATION_ERROR:
        return 'Failed to serialize/deserialize message. This is likely a bug.';
      case ErrorCode.CONNECTION_ERROR:
        return 'Failed to connect to the execution engine. Please ensure it is running.';
      default:
        return `An unexpected error occurred: ${this.message}`;
    }
  }
}

/**
 * Create an ExecutionError from an unknown error
 *
 * @param error - Unknown error object
 * @param transport - Transport mode
 * @returns ExecutionError instance
 *
 * @internal
 */
export function fromUnknownError(error: unknown, transport: string = 'UNKNOWN'): ExecutionError {
  if (error instanceof ExecutionError) {
    return error;
  }

  if (error instanceof Error) {
    // Check error message for common patterns
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) {
      return new ExecutionError(error.message, ErrorCode.TIMEOUT, transport, error);
    }

    if (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('connection')
    ) {
      return new ExecutionError(error.message, ErrorCode.NETWORK_ERROR, transport, error);
    }

    if (message.includes('invalid') || message.includes('validation')) {
      return new ExecutionError(error.message, ErrorCode.INVALID_REQUEST, transport, error);
    }

    // Default: unknown error
    return new ExecutionError(error.message, ErrorCode.UNKNOWN_ERROR, transport, error);
  }

  // Non-Error object
  return new ExecutionError(
    String(error),
    ErrorCode.UNKNOWN_ERROR,
    transport,
    error instanceof Error ? error : undefined
  );
}
