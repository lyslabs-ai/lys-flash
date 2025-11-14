/**
 * Configuration options for the Solana Execution Client
 */
export interface ClientConfig {
  /**
   * ZeroMQ socket address
   * @default "ipc:///tmp/tx-executor.ipc"
   * @example "ipc:///tmp/tx-executor.ipc" // Local IPC socket
   * @example "tcp://127.0.0.1:5555" // TCP socket
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
