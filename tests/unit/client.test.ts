/**
 * Unit Tests for SolanaExecutionClient
 *
 * Tests the main client class with simpler test approach
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SolanaExecutionClient } from '../../src/client';
import { ExecutionError, ErrorCode } from '../../src/errors';

describe('SolanaExecutionClient', () => {
  let client: SolanaExecutionClient;

  afterEach(() => {
    if (client) {
      client.close();
    }
  });

  describe('Constructor', () => {
    it('should create client with default configuration', () => {
      client = new SolanaExecutionClient();

      expect(client).toBeInstanceOf(SolanaExecutionClient);
    });

    it('should create client with custom configuration', () => {
      client = new SolanaExecutionClient({
        zmqAddress: 'tcp://localhost:5555',
        timeout: 60000,
        verbose: true,
      });

      expect(client).toBeInstanceOf(SolanaExecutionClient);
    });

    it('should initialize with default stats', () => {
      client = new SolanaExecutionClient();
      const stats = client.getStats();

      expect(stats.requestsSent).toBe(0);
      expect(stats.requestsSuccessful).toBe(0);
      expect(stats.requestsFailed).toBe(0);
      expect(stats.averageLatency).toBe(0);
      expect(stats.connectedSince).toBeInstanceOf(Date);
    });

    it('should accept custom logger', () => {
      const customLogger = {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      client = new SolanaExecutionClient({
        logger: customLogger,
      });

      expect(client).toBeInstanceOf(SolanaExecutionClient);
    });
  });

  describe('Request Validation', () => {
    beforeEach(() => {
      client = new SolanaExecutionClient();
    });

    it('should throw error if data field is missing', async () => {
      const request: any = {
        feePayer: 'wallet',
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
      };

      await expect(client.execute(request)).rejects.toThrow(ExecutionError);

      try {
        await client.execute(request);
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).code).toBe(ErrorCode.INVALID_REQUEST);
        expect((error as ExecutionError).message).toContain('data');
      }
    });

    it('should throw error if feePayer is missing', async () => {
      const request: any = {
        data: {
          executionType: 'SYSTEM_TRANSFER',
          eventType: 'TRANSFER',
          sender: 'a',
          recipient: 'b',
          lamports: 1000,
        },
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
      };

      await expect(client.execute(request)).rejects.toThrow(ExecutionError);

      try {
        await client.execute(request);
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).code).toBe(ErrorCode.INVALID_REQUEST);
        expect((error as ExecutionError).message).toContain('feePayer');
      }
    });

    it('should throw error if priorityFeeLamports is invalid', async () => {
      const request: any = {
        data: {
          executionType: 'SYSTEM_TRANSFER',
          eventType: 'TRANSFER',
          sender: 'a',
          recipient: 'b',
          lamports: 1000,
        },
        feePayer: 'wallet',
        priorityFeeLamports: -1000,
        transport: 'SIMULATE',
      };

      await expect(client.execute(request)).rejects.toThrow(ExecutionError);

      try {
        await client.execute(request);
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).code).toBe(ErrorCode.INVALID_REQUEST);
        expect((error as ExecutionError).message).toContain('priorityFeeLamports');
      }
    });

    it('should throw error if transport is missing', async () => {
      const request: any = {
        data: {
          executionType: 'SYSTEM_TRANSFER',
          eventType: 'TRANSFER',
          sender: 'a',
          recipient: 'b',
          lamports: 1000,
        },
        feePayer: 'wallet',
        priorityFeeLamports: 1_000_000,
      };

      await expect(client.execute(request)).rejects.toThrow(ExecutionError);

      try {
        await client.execute(request);
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).code).toBe(ErrorCode.INVALID_REQUEST);
        expect((error as ExecutionError).message).toContain('transport');
      }
    });

    it('should throw error if executionType is missing', async () => {
      const request: any = {
        data: {
          eventType: 'TRANSFER',
          sender: 'a',
          recipient: 'b',
          lamports: 1000,
        },
        feePayer: 'wallet',
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
      };

      await expect(client.execute(request)).rejects.toThrow(ExecutionError);

      try {
        await client.execute(request);
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).code).toBe(ErrorCode.INVALID_REQUEST);
        expect((error as ExecutionError).message).toContain('executionType');
      }
    });

    it('should throw error if eventType is missing', async () => {
      const request: any = {
        data: {
          executionType: 'SYSTEM_TRANSFER',
          sender: 'a',
          recipient: 'b',
          lamports: 1000,
        },
        feePayer: 'wallet',
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
      };

      await expect(client.execute(request)).rejects.toThrow(ExecutionError);

      try {
        await client.execute(request);
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).code).toBe(ErrorCode.INVALID_REQUEST);
        expect((error as ExecutionError).message).toContain('eventType');
      }
    });

    it('should validate all operations in batched request', async () => {
      const request: any = {
        data: [
          {
            executionType: 'SYSTEM_TRANSFER',
            eventType: 'TRANSFER',
            sender: 'a',
            recipient: 'b',
            lamports: 1000,
          },
          {
            executionType: 'SPL_TOKEN',
            // Missing eventType
            mint: 'mint',
            sourceOwner: 'a',
            destinationOwner: 'b',
            amount: 1000,
          },
        ],
        feePayer: 'wallet',
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
      };

      await expect(client.execute(request)).rejects.toThrow(ExecutionError);
    });
  });

  describe('getStats()', () => {
    beforeEach(() => {
      client = new SolanaExecutionClient();
    });

    it('should return current statistics', () => {
      const stats = client.getStats();

      expect(stats).toHaveProperty('requestsSent');
      expect(stats).toHaveProperty('requestsSuccessful');
      expect(stats).toHaveProperty('requestsFailed');
      expect(stats).toHaveProperty('averageLatency');
      expect(stats).toHaveProperty('connected');
      expect(stats).toHaveProperty('connectedSince');
      expect(stats).toHaveProperty('reconnectAttempts');
    });

    it('should return readonly stats object', () => {
      const stats = client.getStats();

      // TypeScript enforces readonly at compile time,
      // but we can verify the properties exist
      expect(stats.requestsSent).toBeDefined();
      expect(stats.connected).toBeDefined();
    });
  });

  describe('resetStats()', () => {
    beforeEach(() => {
      client = new SolanaExecutionClient();
    });

    it('should update connectedSince timestamp', async () => {
      const beforeReset = client.getStats().connectedSince;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      client.resetStats();

      const afterReset = client.getStats().connectedSince;
      expect(afterReset.getTime()).toBeGreaterThan(beforeReset.getTime());
    });
  });

  describe('close()', () => {
    beforeEach(() => {
      client = new SolanaExecutionClient();
    });

    it('should be safe to call multiple times', () => {
      client.close();
      client.close();
      client.close();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('is Connected()', () => {
    beforeEach(() => {
      client = new SolanaExecutionClient();
    });

    it('should return boolean', () => {
      const connected = client.isConnected();
      expect(typeof connected).toBe('boolean');
    });
  });
});
