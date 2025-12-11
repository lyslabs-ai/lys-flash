/**
 * Transport interface for client-server communication
 * Both ZMQ and HTTP transports implement this interface
 */
export interface Transport {
  /**
   * Connect to the server
   */
  connect(): void;

  /**
   * Disconnect from the server
   */
  disconnect(): void;

  /**
   * Check if connected
   */
  isConnected(): boolean;

  /**
   * Send request and wait for response
   * @param message - Message to send
   * @returns Response from server
   */
  request<T>(message: unknown): Promise<T>;

  /**
   * Get number of reconnection attempts
   */
  getReconnectAttempts(): number;

  /**
   * Reset reconnection counter
   */
  resetReconnectAttempts(): void;
}

/**
 * Common transport configuration
 */
export interface BaseTransportConfig {
  address: string;
  timeout: number;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  logger: TransportLogger;
  verbose?: boolean;
}

/**
 * HTTP-specific transport configuration
 */
export interface HTTPTransportConfig extends BaseTransportConfig {
  apiKey: string;
  contentType?: 'json' | 'msgpack';
}

/**
 * Logger interface for transports
 */
export interface TransportLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
