import { ZMQTransport } from './transport/zmq-transport';
import {
  ClientConfig,
  ClientStats,
  Logger,
  TransportConfig,
  TransactionRequest,
  TransactionResponse,
  WalletCreationRequest,
  WalletCreationResponse,
} from './types';
import { ExecutionError, ErrorCode, fromUnknownError } from './errors';

/**
 * Default client configuration
 */
const DEFAULT_CONFIG: Required<Omit<ClientConfig, 'logger'>> & { logger: Logger } = {
  zmqAddress: 'ipc:///tmp/tx-executor.ipc',
  timeout: 30000, // 30 seconds
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000, // 1 second
  verbose: false,
  logger: console,
};

/**
 * Main client for interacting with the Solana Execution Engine
 *
 * @example Basic usage
 * ```typescript
 * import { SolanaExecutionClient } from '@lyslabs.ai/lys-flash';
 *
 * const client = new SolanaExecutionClient();
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
 *   bribeLamports: 1_000_000,        // 0.001 SOL bribe (mandatory for NONCE)
 *   transport: "NONCE"
 * });
 *
 * console.log("Signature:", result.signature);
 * client.close();
 * ```
 *
 * @example With custom configuration
 * ```typescript
 * const client = new SolanaExecutionClient({
 *   zmqAddress: "tcp://127.0.0.1:5555",
 *   timeout: 60000,
 *   verbose: true
 * });
 * ```
 */
export class SolanaExecutionClient {
  private transport: ZMQTransport;
  private config: Required<Omit<ClientConfig, 'logger'>> & { logger: Logger };
  private stats: ClientStats;

  /**
   * Create a new LYS Flash Client
   *
   * @param config - Client configuration options
   */
  constructor(config?: ClientConfig) {
    // Merge config with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      logger: config?.logger || DEFAULT_CONFIG.logger,
    };

    // Create transport configuration
    const transportConfig: TransportConfig = {
      address: this.config.zmqAddress,
      timeout: this.config.timeout,
      autoReconnect: this.config.autoReconnect,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
      reconnectDelay: this.config.reconnectDelay,
      logger: this.config.logger,
      verbose: this.config.verbose,
    };

    // Initialize transport
    this.transport = new ZMQTransport(transportConfig);

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
   *   bribeLamports: 1_000_000,        // 0.001 SOL bribe (mandatory for NONCE)
   *   transport: "NONCE"
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
