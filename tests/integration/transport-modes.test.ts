/**
 * Integration Tests for Transport Modes
 *
 * Tests all transport modes with the same operation to validate functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SolanaExecutionClient } from '../../src/client';
import { TransactionBuilder } from '../../src/builder';
import {
  createTestClient,
  assertSuccessResponse,
  assertHasLogs,
  assertLatencyInRange,
} from '../test-utils';
import { TEST_TIMEOUTS, LATENCY_TARGETS } from '../setup';

describe('Transport Modes Integration Tests', () => {
  let client: SolanaExecutionClient;

  // Simple system transfer operation for all transport tests
  const createTransferBuilder = () => {
    return new TransactionBuilder(client)
      .systemTransfer({
        sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
        lamports: 1_000_000, // 0.001 SOL
      })
      .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
      .setPriorityFee(1_000_000);
  };

  beforeAll(() => {
    client = createTestClient();
  }, TEST_TIMEOUTS.INTEGRATION);

  afterAll(() => {
    if (client) {
      client.close();
    }
  });

  describe('SIMULATE Mode', () => {
    it(
      'should simulate transaction without broadcasting',
      async () => {
        const response = await createTransferBuilder().setTransport('SIMULATE').send();

        assertSuccessResponse(response);
        assertHasLogs(response);
        expect(response.transport).toBe('SIMULATE');
        expect(response.signature).toBeNull();
        expect(response.logs).toBeDefined();
        expect(response.logs.length).toBeGreaterThan(0);
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should have minimal latency (local simulation)',
      async () => {
        const start = Date.now();
        const response = await createTransferBuilder().setTransport('SIMULATE').send();
        const latency = Date.now() - start;

        assertSuccessResponse(response);
        assertLatencyInRange(latency, LATENCY_TARGETS.SIMULATE.min, LATENCY_TARGETS.SIMULATE.max);
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should use simulate() helper method',
      async () => {
        const response = await createTransferBuilder().simulate();

        assertSuccessResponse(response);
        assertHasLogs(response);
        expect(response.transport).toBe('SIMULATE');
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('VANILLA Mode', () => {
    it(
      'should execute via standard RPC',
      async () => {
        const response = await createTransferBuilder().setTransport('VANILLA').send();

        assertSuccessResponse(response);
        expect(response.transport).toBe('VANILLA');
        expect(response.signature).toBeDefined();
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should have reasonable latency (standard RPC)',
      async () => {
        const start = Date.now();
        const response = await createTransferBuilder().setTransport('VANILLA').send();
        const latency = Date.now() - start;

        assertSuccessResponse(response);
        // VANILLA can be slower, allow wider range
        expect(latency).toBeGreaterThan(LATENCY_TARGETS.VANILLA.min);
        expect(latency).toBeLessThan(LATENCY_TARGETS.VANILLA.max);
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('NOZOMI Mode', () => {
    it(
      'should execute via Temporal Nozomi endpoint',
      async () => {
        const response = await createTransferBuilder().setTransport('NOZOMI').send();

        assertSuccessResponse(response);
        expect(response.transport).toBe('NOZOMI');
        expect(response.signature).toBeDefined();
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should have low latency',
      async () => {
        const start = Date.now();
        const response = await createTransferBuilder().setTransport('NOZOMI').send();
        const latency = Date.now() - start;

        assertSuccessResponse(response);
        expect(latency).toBeGreaterThan(LATENCY_TARGETS.NOZOMI.min);
        expect(latency).toBeLessThan(LATENCY_TARGETS.NOZOMI.max);
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('ZERO_SLOT Mode', () => {
    it(
      'should execute via 0Slot endpoint',
      async () => {
        const response = await createTransferBuilder().setTransport('ZERO_SLOT').send();

        assertSuccessResponse(response);
        expect(response.transport).toBe('ZERO_SLOT');
        expect(response.signature).toBeDefined();
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should have ultra-low latency',
      async () => {
        const start = Date.now();
        const response = await createTransferBuilder().setTransport('ZERO_SLOT').send();
        const latency = Date.now() - start;

        assertSuccessResponse(response);
        expect(latency).toBeGreaterThan(LATENCY_TARGETS.ZERO_SLOT.min);
        expect(latency).toBeLessThan(LATENCY_TARGETS.ZERO_SLOT.max);
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('LUNAR_LANDER Mode', () => {
    it(
      'should execute via HelloMoon Lunar Lander endpoint',
      async () => {
        const response = await createTransferBuilder().setTransport('LUNAR_LANDER').send();

        assertSuccessResponse(response);
        expect(response.transport).toBe('LUNAR_LANDER');
        expect(response.signature).toBeDefined();
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should have low latency',
      async () => {
        const start = Date.now();
        const response = await createTransferBuilder().setTransport('LUNAR_LANDER').send();
        const latency = Date.now() - start;

        assertSuccessResponse(response);
        expect(latency).toBeGreaterThan(LATENCY_TARGETS.LUNAR_LANDER.min);
        expect(latency).toBeLessThan(LATENCY_TARGETS.LUNAR_LANDER.max);
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('HELIUS_SENDER Mode', () => {
    it(
      'should execute via Helius sender service',
      async () => {
        const response = await createTransferBuilder().setTransport('HELIUS_SENDER').send();

        assertSuccessResponse(response);
        expect(response.transport).toBe('HELIUS_SENDER');
        expect(response.signature).toBeDefined();
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should have acceptable latency',
      async () => {
        const start = Date.now();
        const response = await createTransferBuilder().setTransport('HELIUS_SENDER').send();
        const latency = Date.now() - start;

        assertSuccessResponse(response);
        expect(latency).toBeGreaterThan(LATENCY_TARGETS.HELIUS_SENDER.min);
        expect(latency).toBeLessThan(LATENCY_TARGETS.HELIUS_SENDER.max);
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('JITO Mode', () => {
    it(
      'should execute via Jito with MEV protection',
      async () => {
        const response = await createTransferBuilder()
          .setTransport('JITO')
          .setBribe(2_000_000) // Jito tip
          .send();

        assertSuccessResponse(response);
        expect(response.transport).toBe('JITO');
        expect(response.signature).toBeDefined();
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should have acceptable latency with bribe',
      async () => {
        const start = Date.now();
        const response = await createTransferBuilder()
          .setTransport('JITO')
          .setBribe(2_000_000)
          .send();
        const latency = Date.now() - start;

        assertSuccessResponse(response);
        expect(latency).toBeGreaterThan(LATENCY_TARGETS.JITO.min);
        expect(latency).toBeLessThan(LATENCY_TARGETS.JITO.max);
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('FLASH/NONCE Mode (Multi-Broadcast)', () => {
    it(
      'should execute via multi-broadcast strategy',
      async () => {
        const response = await createTransferBuilder().setTransport('NONCE').send();

        assertSuccessResponse(response);
        expect(response.transport).toBe('NONCE');
        expect(response.signature).toBeDefined();
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should have fastest latency (parallel broadcast)',
      async () => {
        const start = Date.now();
        const response = await createTransferBuilder().setTransport('NONCE').send();
        const latency = Date.now() - start;

        assertSuccessResponse(response);
        expect(latency).toBeGreaterThan(LATENCY_TARGETS.NONCE.min);
        expect(latency).toBeLessThan(LATENCY_TARGETS.NONCE.max);
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should be default transport mode',
      async () => {
        // Builder defaults to FLASH, which is normalized to NONCE when sent to server
        const builder = new TransactionBuilder(client);
        const response = await builder
          .systemTransfer({
            sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
            lamports: 1_000_000,
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .send();

        assertSuccessResponse(response);
        // Server responds with NONCE (FLASH is normalized to NONCE)
        expect(response.transport).toBe('NONCE');
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('Transport Comparison', () => {
    it(
      'should execute same operation across all modes',
      async () => {
        const modes: Array<
          'SIMULATE' | 'VANILLA' | 'NOZOMI' | 'ZERO_SLOT' | 'LUNAR_LANDER' | 'HELIUS_SENDER' | 'JITO' | 'FLASH' | 'NONCE'
        > = ['SIMULATE', 'VANILLA', 'NOZOMI', 'ZERO_SLOT', 'LUNAR_LANDER', 'HELIUS_SENDER', 'JITO', 'FLASH', 'NONCE'];

        const results = await Promise.all(
          modes.map(async (mode) => {
            const builder = createTransferBuilder().setTransport(mode);

            // Add bribe for JITO
            if (mode === 'JITO') {
              builder.setBribe(2_000_000);
            }

            const start = Date.now();
            const response = await builder.send();
            const latency = Date.now() - start;

            return { mode, response, latency };
          })
        );

        // All should succeed
        results.forEach(({ mode, response }) => {
          assertSuccessResponse(response);
          expect(response.transport).toBe(mode);
        });

        // Log latencies for comparison
        console.log('\n📊 Transport Mode Latency Comparison:');
        results.forEach(({ mode, latency }) => {
          console.log(`   ${mode.padEnd(15)}: ${latency}ms`);
        });
      },
      TEST_TIMEOUTS.INTEGRATION * 2
    ); // Allow extra time for all modes
  });

  describe('Transport Mode Switching', () => {
    it(
      'should allow changing transport mode between requests',
      async () => {
        const builder = createTransferBuilder();

        // First: SIMULATE
        const response1 = await builder.setTransport('SIMULATE').send();
        assertSuccessResponse(response1);
        expect(response1.transport).toBe('SIMULATE');

        // Reset and switch to VANILLA
        builder.reset();
        const response2 = await builder
          .systemTransfer({
            sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
            lamports: 1_000_000,
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .setTransport('VANILLA')
          .send();

        assertSuccessResponse(response2);
        expect(response2.transport).toBe('VANILLA');
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('Response Consistency', () => {
    it(
      'should return consistent response structure across modes',
      async () => {
        const modes: Array<'SIMULATE' | 'FLASH' | 'NONCE'> = ['SIMULATE', 'FLASH', 'NONCE'];

        for (const mode of modes) {
          const response = await createTransferBuilder().setTransport(mode).send();

          // All responses should have these fields
          expect(response).toHaveProperty('success');
          expect(response).toHaveProperty('transport');
          expect(response).toHaveProperty('error');

          if (response.success) {
            expect(response).toHaveProperty('signature');

            // SIMULATE should have logs
            if (mode === 'SIMULATE') {
              expect(response).toHaveProperty('logs');
              expect(Array.isArray(response.logs)).toBe(true);
            }
          }
        }
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });
});
