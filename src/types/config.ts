import type { Connection, Commitment } from '@solana/web3.js';

/**
 * Configuration options for LYS Flash
 */
export interface ClientConfig {
  /**
   * Server address - transport auto-detected from URL scheme:
   * - http:// or https:// → HTTP transport
   * - tcp:// or ipc:// → ZMQ transport
   * @default "ipc:///tmp/tx-executor.ipc"
   * @example "http://localhost:3000" // HTTP transport
   * @example "https://api.example.com" // HTTPS transport
   * @example "ipc:///tmp/tx-executor.ipc" // ZMQ via IPC
   * @example "tcp://127.0.0.1:5555" // ZMQ via TCP
   */
  address?: string;

  /**
   * Solana RPC connection for DEX operations (Meteora, Raydium, etc.)
   * Required when using DEX namespace methods that build transactions client-side.
   * @example
   * ```typescript
   * import { Connection } from '@solana/web3.js';
   *
   * const client = new LysFlash({
   *   address: 'ipc:///tmp/tx-executor.ipc',
   *   connection: new Connection('https://api.mainnet-beta.solana.com'),
   * });
   * ```
   */
  connection?: Connection;

  /**
   * Commitment level for RPC requests (used with connection)
   * @default 'confirmed'
   */
  commitment?: Commitment;

  /**
   * API key for HTTP transport (required when using http:// or https://)
   */
  apiKey?: string;

  /**
   * Content type for HTTP requests
   * @default 'msgpack'
   */
  contentType?: 'json' | 'msgpack';

  /**
   * @deprecated Use `address` instead
   * ZeroMQ socket address (kept for backward compatibility)
   */
  zmqAddress?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Automatically reconnect on disconnect
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Maximum number of reconnection attempts
   * @default 5
   */
  maxReconnectAttempts?: number;

  /**
   * Delay between reconnection attempts in milliseconds
   * @default 1000 (1 second)
   */
  reconnectDelay?: number;

  /**
   * Custom logger for debugging
   * @default console
   */
  logger?: Logger;

  /**
   * Enable detailed logging
   * @default false
   */
  verbose?: boolean;
}

/**
 * Logger interface for custom logging implementations
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Client statistics
 */
export interface ClientStats {
  /**
   * Total number of requests sent
   */
  requestsSent: number;

  /**
   * Number of successful requests
   */
  requestsSuccessful: number;

  /**
   * Number of failed requests
   */
  requestsFailed: number;

  /**
   * Average response latency in milliseconds
   * Includes network overhead + execution time
   */
  averageLatency: number;

  /**
   * Whether the client is currently connected
   */
  connected: boolean;

  /**
   * Timestamp when the client was created
   */
  connectedSince: Date;

  /**
   * Number of reconnection attempts made
   */
  reconnectAttempts: number;
}

/**
 * Transport configuration for ZMQ
 * @internal
 */
export interface TransportConfig {
  address: string;
  timeout: number;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  logger: Logger;
  verbose?: boolean;
}
