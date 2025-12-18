import * as zmq from 'zeromq';
import { pack, unpack } from 'msgpackr';
import { Transport, BaseTransportConfig } from './transport.interface';
import { ExecutionError, ErrorCode, fromUnknownError } from '../errors';

/**
 * ZeroMQ transport layer with MessagePack serialization
 *
 * Handles communication with the Solana Execution Engine via ZeroMQ Request-Reply pattern.
 * Uses MessagePack for binary serialization (2-3x faster than JSON).
 *
 * @internal
 */
export class ZMQTransport implements Transport {
  private socket: zmq.Dealer | null = null;
  private config: BaseTransportConfig;
  private connected: boolean = false;
  private connecting: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: BaseTransportConfig) {
    this.config = config;
  }

  /**
   * Connect to the ZeroMQ socket
   */
  connect(): void {
    if (this.connected || this.connecting) {
      return;
    }

    this.connecting = true;

    try {
      this.config.logger.debug(`Connecting to ZMQ socket: ${this.config.address}`);

      // Create new Request socket
      this.socket = new zmq.Dealer({
        sendTimeout: this.config.timeout,
        receiveTimeout: this.config.timeout,
        linger: 0, // Don't wait for pending messages on close
      });

      // Connect to server
      this.socket.connect(this.config.address);

      this.connected = true;
      this.connecting = false;
      this.reconnectAttempts = 0;

      this.config.logger.info(`Connected to ZMQ socket: ${this.config.address}`);
    } catch (error) {
      this.connecting = false;
      this.connected = false;

      const execError = new ExecutionError(
        `Failed to connect to ZMQ socket: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.CONNECTION_ERROR,
        'ZMQ',
        error instanceof Error ? error : undefined
      );

      this.config.logger.error(`Connection failed: ${execError.message}`);

      throw execError;
    }
  }

  /**
   * Disconnect from the ZeroMQ socket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      try {
        this.socket.close();
        this.config.logger.info('Disconnected from ZMQ socket');
      } catch (error) {
        this.config.logger.warn(
          `Error during disconnect: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      this.socket = null;
    }

    this.connected = false;
    this.connecting = false;
  }

  /**
   * Check if transport is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send request and wait for response
   *
   * @param message - Message to send (will be MessagePack encoded)
   * @returns Response (MessagePack decoded)
   * @throws ExecutionError on timeout, network error, or serialization error
   */
  async request<T>(message: unknown): Promise<T> {
    if (!this.connected || !this.socket) {
      if (this.config.autoReconnect) {
        this.reconnect();
      } else {
        throw new ExecutionError('Not connected to ZMQ socket', ErrorCode.CONNECTION_ERROR, 'ZMQ');
      }
    }

    try {
      // Serialize message with MessagePack
      const serialized = pack(message);
      this.config.logger.debug(
        `Sending MessagePack request (${serialized.length} bytes)`,
        this.config.verbose ? message : undefined
      );

      // Send request
      await this.socket!.send([Buffer.alloc(0), serialized]);

      // Wait for response with timeout
      const responseBuffer = await Promise.race([
        this.socket!.receive().then(([, data]) => data),
        this.createTimeoutPromise(),
      ]);

      // Deserialize response
      const response = unpack(responseBuffer!) as T;
      this.config.logger.debug(
        'Received MessagePack response',
        this.config.verbose ? response : undefined
      );

      return response;
    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.message.includes('timeout')) {
        const timeoutError = new ExecutionError(
          `Request timeout after ${this.config.timeout}ms`,
          ErrorCode.TIMEOUT,
          'ZMQ',
          error
        );

        this.config.logger.error(timeoutError.message);

        // Trigger reconnect if auto-reconnect is enabled
        if (this.config.autoReconnect) {
          this.handleConnectionLoss();
        }

        throw timeoutError;
      }

      // Handle serialization errors
      if (
        error instanceof Error &&
        (error.message.includes('pack') || error.message.includes('unpack'))
      ) {
        throw new ExecutionError(
          `Serialization error: ${error.message}`,
          ErrorCode.SERIALIZATION_ERROR,
          'ZMQ',
          error
        );
      }

      // Handle network errors
      if (
        error instanceof Error &&
        (error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('connection'))
      ) {
        const networkError = new ExecutionError(
          `Network error: ${error.message}`,
          ErrorCode.NETWORK_ERROR,
          'ZMQ',
          error
        );

        this.config.logger.error(networkError.message);

        // Trigger reconnect if auto-reconnect is enabled
        if (this.config.autoReconnect) {
          this.handleConnectionLoss();
        }

        throw networkError;
      }

      // Unknown error
      throw fromUnknownError(error, 'ZMQ');
    }
  }

  /**
   * Create a timeout promise that rejects after configured timeout
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });
  }

  /**
   * Handle connection loss and trigger reconnect
   */
  private handleConnectionLoss(): void {
    this.connected = false;

    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.config.logger.warn(
        `Connection lost. Reconnecting in ${this.config.reconnectDelay}ms (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`
      );

      this.reconnectTimer = setTimeout(() => {
        try {
          this.reconnect();
        } catch (error) {
          this.config.logger.error(
            `Reconnection failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }, this.config.reconnectDelay);
    }
  }

  /**
   * Reconnect to the ZeroMQ socket
   */
  private reconnect(): void {
    if (this.connected || this.connecting) {
      return;
    }

    this.reconnectAttempts++;

    // Disconnect existing socket
    this.disconnect();

    // Connect with new socket
    try {
      this.connect();
      this.config.logger.info('Reconnection successful');
    } catch (error) {
      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.handleConnectionLoss();
      } else {
        this.config.logger.error(
          `Max reconnection attempts (${this.config.maxReconnectAttempts}) exceeded`
        );
        throw error;
      }
    }
  }

  /**
   * Get number of reconnection attempts
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Reset reconnection counter
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}
