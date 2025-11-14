/**
 * Integration Tests for System Transfer Operations
 *
 * Tests SOL transfers against the real execution engine
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SolanaExecutionClient } from '../../src/client';
import { TransactionBuilder } from '../../src/builder';
import { ExecutionError } from '../../src/errors';
import { createTestClient, assertSuccessResponse, assertHasLogs } from '../test-utils';
import { TEST_TIMEOUTS } from '../setup';

describe('System Transfer Integration Tests', () => {
  let client: SolanaExecutionClient;

  beforeAll(() => {
    client = createTestClient();
  }, TEST_TIMEOUTS.INTEGRATION);

  afterAll(() => {
    if (client) {
      client.close();
    }
  });

  describe('SIMULATE Mode', () => {
    it('should simulate SOL transfer successfully', async () => {
      const response = await client.execute({
        data: {
          executionType: 'SYSTEM_TRANSFER',
          eventType: 'TRANSFER',
          sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
          lamports: 10_000_000, // 0.01 SOL
        },
        feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
      assertHasLogs(response);
      expect(response.transport).toBe('SIMULATE');
      expect(response.logs).toBeDefined();
      expect(response.logs!.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate with builder pattern', async () => {
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
          lamports: 10_000_000,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
      expect(response.transport).toBe('SIMULATE');
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate transfer with zero priority fee', async () => {
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
          lamports: 1_000_000, // 0.001 SOL
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .setPriorityFee(0)
        .simulate();

      assertSuccessResponse(response);
      expect(response.transport).toBe('SIMULATE');
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate large transfer', async () => {
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
          lamports: 1_000_000_000, // 1 SOL
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate with custom bribe amount', async () => {
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
          lamports: 5_000_000,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .setPriorityFee(1_000_000)
        .setBribe(2_000_000)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Client Statistics', () => {
    it('should track successful simulation requests', async () => {
      const statsBefore = client.getStats();

      await new TransactionBuilder(client)
        .systemTransfer({
          sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
          lamports: 1_000_000,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      const statsAfter = client.getStats();

      expect(statsAfter.requestsSent).toBeGreaterThan(statsBefore.requestsSent);
      expect(statsAfter.requestsSuccessful).toBeGreaterThan(statsBefore.requestsSuccessful);
      expect(statsAfter.averageLatency).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should update latency statistics', async () => {
      client.resetStats();

      // Execute multiple transfers
      for (let i = 0; i < 3; i++) {
        await new TransactionBuilder(client)
          .systemTransfer({
            sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
            lamports: 1_000_000,
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .simulate();
      }

      const stats = client.getStats();
      expect(stats.requestsSent).toBe(3);
      expect(stats.requestsSuccessful).toBe(3);
      expect(stats.averageLatency).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Edge Cases', () => {
    it('should handle minimal transfer amount', async () => {
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
          lamports: 1, // 1 lamport
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle transfer to self', async () => {
      const wallet = '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89';

      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: wallet,
          recipient: wallet,
          lamports: 1_000_000,
        })
        .setFeePayer(wallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle multiple sequential transfers', async () => {
      const responses = [];

      for (let i = 0; i < 5; i++) {
        const response = await new TransactionBuilder(client)
          .systemTransfer({
            sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
            lamports: 1_000_000 * (i + 1),
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .simulate();

        responses.push(response);
      }

      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        assertSuccessResponse(response);
      });
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Builder Reuse', () => {
    it('should allow builder reset and reuse', async () => {
      const builder = new TransactionBuilder(client);

      // First transfer
      const response1 = await builder
        .systemTransfer({
          sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
          lamports: 1_000_000,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(response1);

      // Reset and second transfer
      const response2 = await builder
        .reset()
        .systemTransfer({
          sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
          lamports: 2_000_000,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(response2);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Ping Connectivity', () => {
    it('should ping execution engine successfully', async () => {
      const result = await client.ping();
      expect(result).toBe(true);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should maintain connection across multiple pings', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await client.ping();
        expect(result).toBe(true);
      }
    }, TEST_TIMEOUTS.INTEGRATION);
  });
});
