import * as http from 'http';
import * as https from 'https';
import { pack, unpack } from 'msgpackr';
import { Transport, HTTPTransportConfig } from './transport.interface';
import { ExecutionError, ErrorCode, fromUnknownError } from '../errors';

/**
 * HTTP transport layer with keep-alive connections
 *
 * Optimized for low-latency communication:
 * - Connection pooling with keep-alive
 * - Support for JSON and MessagePack serialization
 * - Native Node.js http/https modules (not fetch)
 *
 * @internal
 */
export class HTTPTransport implements Transport {
  private config: HTTPTransportConfig;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private agent: http.Agent | https.Agent;
  private baseUrl: URL;
  private isHttps: boolean;

  constructor(config: HTTPTransportConfig) {
    this.config = config;
    this.baseUrl = new URL(config.address);
    this.isHttps = this.baseUrl.protocol === 'https:';

    // Create agent with keep-alive for connection pooling
    const AgentClass = this.isHttps ? https.Agent : http.Agent;
    this.agent = new AgentClass({
      keepAlive: true,
      keepAliveMsecs: 60000,
      maxSockets: 20,
      maxFreeSockets: 10,
      timeout: config.timeout,
    });
  }

  /**
   * Connect to the HTTP server (validates connectivity)
   */
  connect(): void {
    if (this.connected) {
      return;
    }

    this.config.logger.debug(`HTTP transport ready for: ${this.config.address}`);
    this.connected = true;
    this.reconnectAttempts = 0;
    this.config.logger.info(`HTTP transport connected to: ${this.config.address}`);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.agent) {
      this.agent.destroy();
    }
    this.connected = false;
    this.config.logger.info('HTTP transport disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send request and wait for response
   */
  async request<T>(message: unknown): Promise<T> {
    if (!this.connected) {
      if (this.config.autoReconnect) {
        this.connect();
      } else {
        throw new ExecutionError('Not connected to HTTP server', ErrorCode.CONNECTION_ERROR, 'HTTP');
      }
    }

    // Determine endpoint based on message type
    const isWalletCreate = (message as { type?: string }).type === 'WALLET_CREATE';
    const endpoint = isWalletCreate ? '/api/wallet' : '/api/execute';

    // Prepare request body based on content type
    const useMessagePack = this.config.contentType === 'msgpack';
    const contentType = useMessagePack ? 'application/msgpack' : 'application/json';

    let body: Buffer;
    if (useMessagePack) {
      body = pack(message);
    } else {
      body = Buffer.from(JSON.stringify(message));
    }

    this.config.logger.debug(
      `Sending ${contentType} request (${body.length} bytes) to ${endpoint}`,
      this.config.verbose ? message : undefined
    );

    try {
      const response = await this.makeRequest(endpoint, body, contentType);
      this.config.logger.debug('Received response', this.config.verbose ? response : undefined);
      return response as T;
    } catch (error) {
      // Handle reconnection for connection errors
      if (error instanceof ExecutionError && error.code === ErrorCode.CONNECTION_ERROR) {
        if (this.config.autoReconnect) {
          this.handleConnectionLoss();
        }
      }
      throw error;
    }
  }

  /**
   * Make HTTP request
   * @private
   */
  private makeRequest(endpoint: string, body: Buffer, contentType: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (this.isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        agent: this.agent,
        headers: {
          'Content-Type': contentType,
          'Content-Length': body.length,
          'X-API-Key': this.config.apiKey,
        },
        timeout: this.config.timeout,
      };

      const httpModule = this.isHttps ? https : http;
      const req = httpModule.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => chunks.push(chunk));

        res.on('end', () => {
          try {
            const responseBuffer = Buffer.concat(chunks);
            const responseContentType = res.headers['content-type'] || '';

            let data: unknown;
            if (responseContentType.includes('application/msgpack')) {
              data = unpack(responseBuffer);
            } else {
              data = JSON.parse(responseBuffer.toString());
            }

            // Handle HTTP error status codes
            if (res.statusCode && res.statusCode >= 400) {
              const errorMessage =
                (data as { error?: string })?.error || `HTTP ${res.statusCode}`;
              reject(
                new ExecutionError(
                  errorMessage,
                  res.statusCode === 401
                    ? ErrorCode.UNAUTHORIZED
                    : res.statusCode === 404
                      ? ErrorCode.NOT_FOUND
                      : ErrorCode.SERVER_ERROR,
                  'HTTP'
                )
              );
              return;
            }

            resolve(data);
          } catch (error) {
            reject(
              new ExecutionError(
                `Failed to parse response: ${error instanceof Error ? error.message : String(error)}`,
                ErrorCode.SERIALIZATION_ERROR,
                'HTTP',
                error instanceof Error ? error : undefined
              )
            );
          }
        });
      });

      req.on('error', (error: NodeJS.ErrnoException) => {
        this.config.logger.error(`HTTP request error: ${error.message}`);

        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          reject(
            new ExecutionError(`Connection failed: ${error.message}`, ErrorCode.CONNECTION_ERROR, 'HTTP', error)
          );
        } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
          reject(
            new ExecutionError(
              `Request timeout after ${this.config.timeout}ms`,
              ErrorCode.TIMEOUT,
              'HTTP',
              error
            )
          );
        } else {
          reject(fromUnknownError(error, 'HTTP'));
        }
      });

      req.on('timeout', () => {
        req.destroy();
        reject(
          new ExecutionError(
            `Request timeout after ${this.config.timeout}ms`,
            ErrorCode.TIMEOUT,
            'HTTP'
          )
        );
      });

      // Send request body
      req.write(body);
      req.end();
    });
  }

  /**
   * Handle connection loss and trigger reconnect
   * @private
   */
  private handleConnectionLoss(): void {
    this.connected = false;

    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.config.logger.warn(
        `Connection lost. Reconnecting in ${this.config.reconnectDelay}ms (attempt ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts})`
      );

      setTimeout(() => {
        try {
          this.reconnectAttempts++;
          this.connect();
        } catch (error) {
          this.config.logger.error(
            `Reconnection failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }, this.config.reconnectDelay);
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
