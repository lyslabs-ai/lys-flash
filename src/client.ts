import { ZMQTransport } from './transport/zmq-transport';
import { HTTPTransport } from './transport/http-transport';
import {
  Transport,
  BaseTransportConfig,
  HTTPTransportConfig,
} from './transport/transport.interface';
import {
  ClientConfig,
  ClientStats,
  Logger,
  TransactionRequest,
  TransactionResponse,
  WalletCreationRequest,
  WalletCreationResponse,
  RawTransactionParams,
} from './types';
import { ExecutionError, ErrorCode, fromUnknownError } from './errors';

/**
 * Default client configuration
 */
const DEFAULT_CONFIG: Required<
  Omit<ClientConfig, 'logger' | 'apiKey' | 'contentType' | 'zmqAddress'>
> & {
  logger: Logger;
  apiKey: string;
  contentType: 'json' | 'msgpack';
  zmqAddress: string;
} = {
  address: 'ipc:///tmp/tx-executor.ipc',
  zmqAddress: 'ipc:///tmp/tx-executor.ipc', // deprecated
  apiKey: '',
  contentType: 'msgpack',
  timeout: 30000, // 30 seconds
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000, // 1 second
  verbose: false,
  logger: console,
};

/**
 * Detect transport type from URL scheme
 */
function isHTTPAddress(address: string): boolean {
  return address.startsWith('http://') || address.startsWith('https://');
}

/**
 * Main client for interacting with the Solana Execution Engine
 *
 * @example Basic usage with ZMQ (default)
 * ```typescript
 * import { LysFlash } from '@lyslabs.ai/lys-flash';
 *
 * const client = new LysFlash();
 * // or explicitly: new LysFlash({ address: 'ipc:///tmp/tx-executor.ipc' })
 *
 * const result = await client.execute({
 *   data: {
 *     executionType: "PUMP_FUN",
 *     eventType: "BUY",
 *     pool: "mint_address",
 *     poolAccounts: { coinCreator: "creator_address" },
 *     user: "buyer_wallet",
 *     solAmountIn: 1_000_000,
 *     tokenAmountOut: 3_400_000_000
 *   },
 *   feePayer: "buyer_wallet",
 *   priorityFeeLamports: 1_000_000,
 *   bribeLamports: 1_000_000,
 *   transport: "FLASH"
 * });
 *
 * console.log("Signature:", result.signature);
 * client.close();
 * ```
 *
 * @example With HTTP transport
 * ```typescript
 * const client = new LysFlash({
 *   address: "http://localhost:3000",
 *   apiKey: "sk_live_abc123",
 *   contentType: "msgpack" // or "json"
 * });
 * ```
 *
 * @example With ZMQ over TCP
 * ```typescript
 * const client = new LysFlash({
 *   address: "tcp://127.0.0.1:5555",
 *   timeout: 60000,
 *   verbose: true
 * });
 * ```
 */
export class LysFlash {
  private transport: Transport;
  private config: typeof DEFAULT_CONFIG;
  private stats: ClientStats;
  private transportType: 'HTTP' | 'ZMQ';

  /**
   * Create a new LysFlash client
   *
   * @param config - Client configuration options
   */
  constructor(config?: ClientConfig) {
    // Merge config with defaults, handle backward compatibility
    const address = config?.address || config?.zmqAddress || DEFAULT_CONFIG.address;

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      address,
      logger: config?.logger || DEFAULT_CONFIG.logger,
    };

    // Determine transport type from address
    const useHTTP = isHTTPAddress(address);
    this.transportType = useHTTP ? 'HTTP' : 'ZMQ';

    // Create transport based on address scheme
    if (useHTTP) {
      // Validate API key for HTTP transport
      if (!this.config.apiKey) {
        throw new ExecutionError(
          'API key is required for HTTP transport. Set the apiKey option.',
          ErrorCode.INVALID_REQUEST,
          'CLIENT'
        );
      }

      const httpConfig: HTTPTransportConfig = {
        address: address,
        apiKey: this.config.apiKey,
        contentType: this.config.contentType || 'msgpack',
        timeout: this.config.timeout,
        autoReconnect: this.config.autoReconnect,
        maxReconnectAttempts: this.config.maxReconnectAttempts,
        reconnectDelay: this.config.reconnectDelay,
        logger: this.config.logger,
        verbose: this.config.verbose,
      };

      this.transport = new HTTPTransport(httpConfig);
    } else {
      // ZMQ transport (ipc:// or tcp://)
      const zmqConfig: BaseTransportConfig = {
        address: address,
        timeout: this.config.timeout,
        autoReconnect: this.config.autoReconnect,
        maxReconnectAttempts: this.config.maxReconnectAttempts,
        reconnectDelay: this.config.reconnectDelay,
        logger: this.config.logger,
        verbose: this.config.verbose,
      };

      this.transport = new ZMQTransport(zmqConfig);
    }

    // Initialize statistics
    this.stats = {
      requestsSent: 0,
      requestsSuccessful: 0,
      requestsFailed: 0,
      averageLatency: 0,
      connected: false,
      connectedSince: new Date(),
      reconnectAttempts: 0,
    };

    // Connect on initialization
    try {
      this.connect();
    } catch (error) {
      this.config.logger.error(
        `Failed to connect during initialization: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get the transport type being used
   */
  getTransportType(): 'HTTP' | 'ZMQ' {
    return this.transportType;
  }

  /**
   * Connect to the execution engine
   *
   * @throws ExecutionError if connection fails
   */
  private connect(): void {
    try {
      this.transport.connect();
      this.stats.connected = true;
      this.stats.connectedSince = new Date();
    } catch (error) {
      this.stats.connected = false;
      throw fromUnknownError(error, 'CLIENT');
    }
  }

  /**
   * Execute a transaction request
   *
   * @param request - Transaction request parameters
   * @returns Transaction response with signature or error
   * @throws ExecutionError on network error, timeout, or execution failure
   *
   * @example Single operation
   * ```typescript
   * const result = await client.execute({
   *   data: {
   *     executionType: "PUMP_FUN",
   *     eventType: "BUY",
   *     pool: "mint_address",
   *     poolAccounts: { coinCreator: "creator" },
   *     user: "wallet",
   *     solAmountIn: 1_000_000,
   *     tokenAmountOut: 3_400_000_000
   *   },
   *   feePayer: "wallet",
   *   priorityFeeLamports: 1_000_000,
   *   bribeLamports: 1_000_000,        // 0.001 SOL bribe (mandatory for FLASH)
   *   transport: "FLASH"
   * });
   * ```
   *
   * @example Batched operations
   * ```typescript
   * const result = await client.execute({
   *   data: [
   *     { executionType: "SYSTEM_TRANSFER", ... },
   *     { executionType: "SPL_TOKEN", eventType: "TRANSFER", ... },
   *     { executionType: "PUMP_FUN", eventType: "BUY", ... }
   *   ],
   *   feePayer: "wallet",
   *   priorityFeeLamports: 1_000_000,
   *   transport: "VANILLA"
   * });
   * ```
   */
  async execute(request: TransactionRequest): Promise<TransactionResponse> {
    const startTime = Date.now();
    this.stats.requestsSent++;

    try {
      // Validate request
      this.validateTransactionRequest(request);

      // Send request via ZMQ transport
      const response = await this.transport.request<TransactionResponse>(request);

      // Update statistics
      const latency = Date.now() - startTime;
      this.updateLatencyStats(latency);

      if (response.success) {
        this.stats.requestsSuccessful++;
      } else {
        this.stats.requestsFailed++;
      }

      return response;
    } catch (error) {
      this.stats.requestsFailed++;

      // If it's already an ExecutionError, re-throw it
      if (error instanceof ExecutionError) {
        throw error;
      }

      // Otherwise, wrap it
      throw fromUnknownError(error, 'CLIENT');
    }
  }

  /**
   * Create a new wallet with dual encryption
   *
   * @param userPublicKey - User's Solana public key for encryption (base58 encoded)
   * @returns Wallet creation response with encrypted secret key
   * @throws ExecutionError on network error or wallet creation failure
   *
   * @example
   * ```typescript
   * import { Keypair } from '@solana/web3.js';
   * import nacl from 'tweetnacl';
   *
   * // User's keypair for encryption
   * const userKeypair = Keypair.generate();
   *
   * // Create new wallet
   * const wallet = await client.createWallet(
   *   userKeypair.publicKey.toBase58()
   * );
   *
   * console.log("New wallet:", wallet.publicKey);
   *
   * // Decrypt on client side
   * const secretKey = nacl.box.open(
   *   Buffer.from(wallet.encryptedSecretKey, 'base64'),
   *   Buffer.from(wallet.nonce, 'base64'),
   *   Buffer.from(wallet.ephemeralPublicKey, 'base64'),
   *   userKeypair.secretKey
   * );
   * ```
   */
  async createWallet(userPublicKey: string): Promise<WalletCreationResponse> {
    this.stats.requestsSent++;

    try {
      const request: WalletCreationRequest = {
        type: 'WALLET_CREATE',
        userPublicKey,
      };

      const response = await this.transport.request<WalletCreationResponse>(request);

      this.stats.requestsSuccessful++;

      return response;
    } catch (error) {
      this.stats.requestsFailed++;

      if (error instanceof ExecutionError) {
        throw error;
      }

      throw fromUnknownError(error, 'CLIENT');
    }
  }

  /**
   * Ping the execution engine to check connectivity
   *
   * @returns true if connected and responsive
   * @throws ExecutionError if ping fails
   */
  async ping(): Promise<boolean> {
    try {
      // Send a simple request to check connectivity
      await this.transport.request({ type: 'PING' });
      return true;
    } catch (error) {
      if (error instanceof ExecutionError) {
        throw error;
      }
      throw fromUnknownError(error, 'CLIENT');
    }
  }

  /**
   * Get client statistics
   *
   * @returns Client statistics including success rate and average latency
   *
   * @example
   * ```typescript
   * const stats = client.getStats();
   * console.log("Success rate:",
   *   (stats.requestsSuccessful / stats.requestsSent * 100).toFixed(2) + "%"
   * );
   * console.log("Average latency:", stats.averageLatency, "ms");
   * ```
   */
  getStats(): Readonly<ClientStats> {
    return {
      ...this.stats,
      connected: this.transport.isConnected(),
      reconnectAttempts: this.transport.getReconnectAttempts(),
    };
  }

  /**
   * Reset statistics counters
   */
  resetStats(): void {
    this.stats = {
      requestsSent: 0,
      requestsSuccessful: 0,
      requestsFailed: 0,
      averageLatency: 0,
      connected: this.transport.isConnected(),
      connectedSince: new Date(),
      reconnectAttempts: 0,
    };
    this.transport.resetReconnectAttempts();
  }

  /**
   * Close the client and disconnect from the execution engine
   *
   * Always call this method when done using the client to free up resources.
   *
   * @example
   * ```typescript
   * const client = new SolanaExecutionClient();
   * // ... use client ...
   * client.close();
   * ```
   */
  close(): void {
    this.transport.disconnect();
    this.stats.connected = false;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.transport.isConnected();
  }

  /**
   * Validate transaction request parameters
   * @private
   */
  private validateTransactionRequest(request: TransactionRequest): void {
    if (!request.data) {
      throw new ExecutionError(
        'Missing data field in request',
        ErrorCode.INVALID_REQUEST,
        'CLIENT'
      );
    }

    if (!request.feePayer) {
      throw new ExecutionError(
        'Missing feePayer field in request',
        ErrorCode.INVALID_REQUEST,
        'CLIENT'
      );
    }

    if (typeof request.priorityFeeLamports !== 'number' || request.priorityFeeLamports < 0) {
      throw new ExecutionError(
        'Invalid priorityFeeLamports: must be a non-negative number',
        ErrorCode.INVALID_REQUEST,
        'CLIENT'
      );
    }

    if (!request.transport) {
      throw new ExecutionError(
        'Missing transport field in request',
        ErrorCode.INVALID_REQUEST,
        'CLIENT'
      );
    }

    // Validate each operation in data array
    const operations = Array.isArray(request.data) ? request.data : [request.data];
    for (const operation of operations) {
      if (!operation.executionType) {
        throw new ExecutionError(
          'Missing executionType in operation',
          ErrorCode.INVALID_REQUEST,
          'CLIENT'
        );
      }

      // RAW_TRANSACTION has specific validation
      if (operation.executionType === 'RAW_TRANSACTION') {
        this.validateRawTransactionOperation(operation as RawTransactionParams);
        continue;
      }

      if (!operation.eventType) {
        throw new ExecutionError(
          'Missing eventType in operation',
          ErrorCode.INVALID_REQUEST,
          'CLIENT'
        );
      }
    }
  }

  /**
   * Validate RAW_TRANSACTION operation
   * @private
   */
  private validateRawTransactionOperation(operation: RawTransactionParams): void {
    if (!operation.transactionBytes) {
      throw new ExecutionError(
        'Missing transactionBytes in RAW_TRANSACTION operation',
        ErrorCode.INVALID_REQUEST,
        'CLIENT'
      );
    }

    if (!(operation.transactionBytes instanceof Uint8Array)) {
      throw new ExecutionError(
        'transactionBytes must be a Uint8Array',
        ErrorCode.INVALID_REQUEST,
        'CLIENT'
      );
    }

    // Size validation (Solana tx limit: ~1232 bytes)
    if (operation.transactionBytes.length < 100) {
      throw new ExecutionError(
        `Transaction too small (${operation.transactionBytes.length} bytes)`,
        ErrorCode.INVALID_REQUEST,
        'CLIENT'
      );
    }

    if (operation.transactionBytes.length > 1500) {
      throw new ExecutionError(
        `Transaction too large (${operation.transactionBytes.length} bytes)`,
        ErrorCode.INVALID_REQUEST,
        'CLIENT'
      );
    }

    // Validate additionalSigners if provided (public keys, base58)
    if (operation.additionalSigners) {
      if (!Array.isArray(operation.additionalSigners)) {
        throw new ExecutionError(
          'additionalSigners must be an array',
          ErrorCode.INVALID_REQUEST,
          'CLIENT'
        );
      }

      for (let i = 0; i < operation.additionalSigners.length; i++) {
        const signer = operation.additionalSigners[i];
        if (typeof signer !== 'string') {
          throw new ExecutionError(
            `additionalSigners[${i}] must be a base58 string`,
            ErrorCode.INVALID_REQUEST,
            'CLIENT'
          );
        }
        // Basic base58 validation (32-44 chars for Solana public keys)
        if (signer.length < 32 || signer.length > 44) {
          throw new ExecutionError(
            `additionalSigners[${i}] is not a valid public key`,
            ErrorCode.INVALID_REQUEST,
            'CLIENT'
          );
        }
      }
    }
  }

  /**
   * Update average latency statistics
   * @private
   */
  private updateLatencyStats(latency: number): void {
    const totalRequests = this.stats.requestsSuccessful + this.stats.requestsFailed;
    if (totalRequests === 1) {
      this.stats.averageLatency = latency;
    } else {
      // Calculate running average
      this.stats.averageLatency =
        (this.stats.averageLatency * (totalRequests - 1) + latency) / totalRequests;
    }
  }
}

/**
 * @deprecated Use `LysFlash` instead. This alias is kept for backward compatibility.
 */
export const SolanaExecutionClient = LysFlash;
