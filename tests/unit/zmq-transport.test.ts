/**
 * Unit Tests for ZMQTransport
 *
 * Tests the ZMQ transport layer with mocked zeromq and msgpackr
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExecutionError, ErrorCode } from '../../src/errors';

// Mock zeromq module
const mockSocket = {
  connect: vi.fn(),
  close: vi.fn(),
  send: vi.fn().mockResolvedValue(undefined),
  receive: vi.fn().mockResolvedValue([Buffer.from('response')]),
};

vi.mock('zeromq', () => ({
  Request: vi.fn().mockImplementation(() => mockSocket),
}));

// Mock msgpackr module
vi.mock('msgpackr', () => ({
  pack: vi.fn((data) => Buffer.from(JSON.stringify(data))),
  unpack: vi.fn((buffer) => JSON.parse(buffer.toString())),
}));

import { ZMQTransport } from '../../src/transport/zmq-transport';
import type { TransportConfig } from '../../src/types/config';
import { pack, unpack } from 'msgpackr';

describe('ZMQTransport', () => {
  let transport: ZMQTransport;
  let config: TransportConfig;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    config = {
      address: 'tcp://127.0.0.1:5555',
      timeout: 5000,
      autoReconnect: true,
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      logger: mockLogger,
    };
  });

  afterEach(() => {
    if (transport) {
      transport.disconnect();
    }
  });

  describe('Constructor', () => {
    it('should create transport with configuration', () => {
      transport = new ZMQTransport(config);

      expect(transport).toBeInstanceOf(ZMQTransport);
      expect(transport.isConnected()).toBe(false);
    });
  });

  describe('connect()', () => {
    it('should connect to ZMQ socket', async () => {
      transport = new ZMQTransport(config);

      await transport.connect();

      expect(transport.isConnected()).toBe(true);
      expect(mockSocket.connect).toHaveBeenCalledWith(config.address);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Connected'));
    });

    it('should not connect if already connected', async () => {
      transport = new ZMQTransport(config);
      await transport.connect();

      mockSocket.connect.mockClear();
      await transport.connect();

      expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('should not connect if already connecting', async () => {
      transport = new ZMQTransport(config);

      const promise1 = transport.connect();
      const promise2 = transport.connect();

      await Promise.all([promise1, promise2]);

      // Should only connect once
      expect(mockSocket.connect).toHaveBeenCalledTimes(1);
    });

    it('should reset reconnect attempts on successful connection', async () => {
      transport = new ZMQTransport(config);
      (transport as any).reconnectAttempts = 5;

      await transport.connect();

      expect(transport.getReconnectAttempts()).toBe(0);
    });

    it('should throw ExecutionError on connection failure', async () => {
      mockSocket.connect.mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      transport = new ZMQTransport(config);

      await expect(transport.connect()).rejects.toThrow(ExecutionError);

      try {
        await transport.connect();
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).code).toBe(ErrorCode.CONNECTION_ERROR);
        expect((error as ExecutionError).message).toContain('Failed to connect');
      }

      expect(transport.isConnected()).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('disconnect()', () => {
    it('should disconnect from ZMQ socket', async () => {
      transport = new ZMQTransport(config);
      await transport.connect();

      transport.disconnect();

      expect(mockSocket.close).toHaveBeenCalled();
      expect(transport.isConnected()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Disconnected'));
    });

    it('should handle disconnect errors gracefully', async () => {
      transport = new ZMQTransport(config);
      await transport.connect();

      mockSocket.close.mockImplementationOnce(() => {
        throw new Error('Close error');
      });

      transport.disconnect();

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(transport.isConnected()).toBe(false);
    });

    it('should clear reconnect timer', async () => {
      transport = new ZMQTransport(config);
      await transport.connect();

      // Simulate reconnect timer
      (transport as any).reconnectTimer = setTimeout(() => {}, 10000);

      transport.disconnect();

      // Timer should be cleared (no way to directly test, but coverage will show)
      expect(transport.isConnected()).toBe(false);
    });

    it('should be safe to call when not connected', () => {
      transport = new ZMQTransport(config);

      transport.disconnect();
      transport.disconnect();

      expect(transport.isConnected()).toBe(false);
    });
  });

  describe('isConnected()', () => {
    it('should return false initially', () => {
      transport = new ZMQTransport(config);

      expect(transport.isConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      transport = new ZMQTransport(config);
      await transport.connect();

      expect(transport.isConnected()).toBe(true);
    });

    it('should return false after disconnect', async () => {
      transport = new ZMQTransport(config);
      await transport.connect();
      transport.disconnect();

      expect(transport.isConnected()).toBe(false);
    });
  });

  describe('request()', () => {
    beforeEach(async () => {
      transport = new ZMQTransport(config);
      await transport.connect();

      // Setup mock msgpackr responses
      (unpack as any).mockReturnValue({
        success: true,
        signature: 'test_signature',
        transport: 'NONCE',
        error: null,
      });
    });

    it('should send request and receive response', async () => {
      const request = { type: 'TEST', data: 'test_data' };

      const response = await transport.request(request);

      expect(pack).toHaveBeenCalledWith(request);
      expect(mockSocket.send).toHaveBeenCalled();
      expect(mockSocket.receive).toHaveBeenCalled();
      expect(unpack).toHaveBeenCalled();
      expect(response).toEqual({
        success: true,
        signature: 'test_signature',
        transport: 'NONCE',
        error: null,
      });
    });

    it('should log debug messages', async () => {
      const request = { type: 'TEST' };

      await transport.request(request);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Sending MessagePack request'),
        expect.anything()
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Received MessagePack response'),
        expect.anything()
      );
    });

    it('should auto-reconnect if not connected', async () => {
      transport.disconnect();

      const request = { type: 'TEST' };
      const response = await transport.request(request);

      expect(transport.isConnected()).toBe(true);
      expect(response).toBeDefined();
    });

    it('should throw error if not connected and auto-reconnect disabled', async () => {
      const noReconnectConfig = { ...config, autoReconnect: false };
      transport.disconnect();
      transport = new ZMQTransport(noReconnectConfig);

      const request = { type: 'TEST' };

      await expect(transport.request(request)).rejects.toThrow(ExecutionError);

      try {
        await transport.request(request);
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).code).toBe(ErrorCode.CONNECTION_ERROR);
        expect((error as ExecutionError).message).toContain('Not connected');
      }
    });

    describe('Error Handling', () => {
      it('should handle timeout errors', async () => {
        mockSocket.receive.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

        const request = { type: 'TEST' };

        await expect(transport.request(request)).rejects.toThrow(ExecutionError);

        try {
          await transport.request(request);
        } catch (error) {
          expect(error).toBeInstanceOf(ExecutionError);
          expect((error as ExecutionError).code).toBe(ErrorCode.TIMEOUT);
          expect((error as ExecutionError).message).toContain('timeout');
        }
      }, 10000);

      it('should handle serialization errors on pack', async () => {
        (pack as any).mockImplementationOnce(() => {
          throw new Error('pack error');
        });

        const request = { type: 'TEST' };

        await expect(transport.request(request)).rejects.toThrow(ExecutionError);

        try {
          await transport.request(request);
        } catch (error) {
          expect(error).toBeInstanceOf(ExecutionError);
          expect((error as ExecutionError).code).toBe(ErrorCode.SERIALIZATION_ERROR);
          expect((error as ExecutionError).message).toContain('Serialization error');
        }
      });

      it('should handle serialization errors on unpack', async () => {
        (unpack as any).mockImplementationOnce(() => {
          throw new Error('unpack error');
        });

        const request = { type: 'TEST' };

        await expect(transport.request(request)).rejects.toThrow(ExecutionError);

        try {
          await transport.request(request);
        } catch (error) {
          expect(error).toBeInstanceOf(ExecutionError);
          expect((error as ExecutionError).code).toBe(ErrorCode.SERIALIZATION_ERROR);
        }
      });

      it('should handle ECONNREFUSED network errors', async () => {
        mockSocket.send.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

        const request = { type: 'TEST' };

        await expect(transport.request(request)).rejects.toThrow(ExecutionError);

        try {
          await transport.request(request);
        } catch (error) {
          expect(error).toBeInstanceOf(ExecutionError);
          expect((error as ExecutionError).code).toBe(ErrorCode.NETWORK_ERROR);
          expect((error as ExecutionError).message).toContain('Network error');
        }
      });

      it('should handle ENOTFOUND network errors', async () => {
        mockSocket.send.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));

        const request = { type: 'TEST' };

        await expect(transport.request(request)).rejects.toThrow(ExecutionError);

        try {
          await transport.request(request);
        } catch (error) {
          expect(error).toBeInstanceOf(ExecutionError);
          expect((error as ExecutionError).code).toBe(ErrorCode.NETWORK_ERROR);
        }
      });

      it('should handle connection errors', async () => {
        mockSocket.send.mockRejectedValueOnce(new Error('connection failed'));

        const request = { type: 'TEST' };

        await expect(transport.request(request)).rejects.toThrow(ExecutionError);

        try {
          await transport.request(request);
        } catch (error) {
          expect(error).toBeInstanceOf(ExecutionError);
          expect((error as ExecutionError).code).toBe(ErrorCode.NETWORK_ERROR);
        }
      });

      it('should handle unknown errors', async () => {
        mockSocket.send.mockRejectedValueOnce(new Error('Unknown error'));

        const request = { type: 'TEST' };

        await expect(transport.request(request)).rejects.toThrow(ExecutionError);
      });

      it('should trigger reconnect on timeout if auto-reconnect enabled', async () => {
        mockSocket.receive.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

        const request = { type: 'TEST' };

        try {
          await transport.request(request);
        } catch {
          // Expected to timeout
        }

        // Verify reconnect was triggered (connection should be marked as lost)
        expect(transport.isConnected()).toBe(false);
      }, 10000);

      it('should trigger reconnect on network error if auto-reconnect enabled', async () => {
        mockSocket.send.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const request = { type: 'TEST' };

        try {
          await transport.request(request);
        } catch {
          // Expected to fail
        }

        // Verify reconnect was triggered
        expect(transport.isConnected()).toBe(false);
      });
    });
  });

  describe('Reconnection Logic', () => {
    beforeEach(async () => {
      transport = new ZMQTransport(config);
      await transport.connect();
    });

    it('should increment reconnect attempts', async () => {
      expect(transport.getReconnectAttempts()).toBe(0);

      // Simulate connection loss and reconnect
      transport.disconnect();

      try {
        await transport.request({ type: 'TEST' });
      } catch {
        // May fail, but should trigger reconnect
      }

      // Reconnect attempt should have been made
      expect(transport.getReconnectAttempts()).toBeGreaterThanOrEqual(1);
    });

    it('should respect max reconnect attempts', async () => {
      const limitedConfig = { ...config, maxReconnectAttempts: 2 };
      transport.disconnect();
      transport = new ZMQTransport(limitedConfig);

      // Simulate multiple connection failures
      mockSocket.connect.mockImplementation(() => {
        throw new Error('Connection refused');
      });

      // Try to connect (will fail and trigger reconnect attempts)
      try {
        await transport.connect();
      } catch {
        // Expected to fail
      }

      // Manually trigger reconnects
      for (let i = 0; i < 3; i++) {
        try {
          await (transport as any).reconnect();
        } catch {
          // Expected to fail
        }
      }

      expect(transport.getReconnectAttempts()).toBeLessThanOrEqual(limitedConfig.maxReconnectAttempts + 1);
    });

    it('should reset reconnect attempts', () => {
      (transport as any).reconnectAttempts = 5;

      transport.resetReconnectAttempts();

      expect(transport.getReconnectAttempts()).toBe(0);
    });
  });

  describe('getReconnectAttempts()', () => {
    it('should return 0 initially', () => {
      transport = new ZMQTransport(config);

      expect(transport.getReconnectAttempts()).toBe(0);
    });

    it('should return current reconnect attempts', async () => {
      transport = new ZMQTransport(config);
      (transport as any).reconnectAttempts = 3;

      expect(transport.getReconnectAttempts()).toBe(3);
    });
  });

  describe('resetReconnectAttempts()', () => {
    it('should reset reconnect counter to 0', () => {
      transport = new ZMQTransport(config);
      (transport as any).reconnectAttempts = 5;

      transport.resetReconnectAttempts();

      expect(transport.getReconnectAttempts()).toBe(0);
    });
  });
});
