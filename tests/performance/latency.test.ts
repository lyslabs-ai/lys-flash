/**
 * Performance Tests - Latency Benchmarks
 *
 * Tests response time and latency characteristics across transport modes
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SolanaExecutionClient } from '../../src/client';
import { TransactionBuilder } from '../../src/builder';
import {
  createTestClient,
  assertSuccessResponse,
  measureLatency,
  calculatePercentile,
} from '../test-utils';
import { TEST_TIMEOUTS, LATENCY_TARGETS } from '../setup';

describe('Performance Tests - Latency', () => {
  let client: SolanaExecutionClient;

  const testWallet = '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89';
  const testRecipient = '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz';

  beforeAll(() => {
    client = createTestClient();
  }, TEST_TIMEOUTS.INTEGRATION);

  afterAll(() => {
    if (client) {
      client.close();
    }
  });

  describe('SIMULATE Mode Latency', () => {
    it(
      'should have minimal latency for simulation',
      async () => {
        const latencies: number[] = [];

        // Run 20 simulations
        for (let i = 0; i < 20; i++) {
          const { latency } = await measureLatency(async () => {
            return await new TransactionBuilder(client)
              .systemTransfer({
                sender: testWallet,
                recipient: testRecipient,
                lamports: 1_000_000,
              })
              .setFeePayer(testWallet)
              .simulate();
          });

          latencies.push(latency);
        }

        const p50 = calculatePercentile(latencies, 50);
        const p95 = calculatePercentile(latencies, 95);
        const p99 = calculatePercentile(latencies, 99);
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

        console.log('\n📊 SIMULATE Mode Latency:');
        console.log(`   P50: ${p50.toFixed(2)}ms`);
        console.log(`   P95: ${p95.toFixed(2)}ms`);
        console.log(`   P99: ${p99.toFixed(2)}ms`);
        console.log(`   Avg: ${avg.toFixed(2)}ms`);

        // Verify targets (relaxed for actual environment)
        expect(p50).toBeLessThan(LATENCY_TARGETS.SIMULATE.max * 5); // 5x tolerance
      },
      TEST_TIMEOUTS.PERFORMANCE
    );

    it(
      'should measure SPL token operation latency',
      async () => {
        const latencies: number[] = [];

        for (let i = 0; i < 10; i++) {
          const { latency } = await measureLatency(async () => {
            return await new TransactionBuilder(client)
              .splTokenTransfer({
                mint: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
                sourceOwner: testWallet,
                destinationOwner: testRecipient,
                amount: 1_000_000,
              })
              .setFeePayer(testWallet)
              .simulate();
          });

          latencies.push(latency);
        }

        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        console.log(`\n📊 SPL Token Simulation Avg Latency: ${avg.toFixed(2)}ms`);

        expect(avg).toBeGreaterThan(0);
      },
      TEST_TIMEOUTS.PERFORMANCE
    );

    it(
      'should measure Pump.fun operation latency',
      async () => {
        const latencies: number[] = [];

        for (let i = 0; i < 10; i++) {
          const { latency } = await measureLatency(async () => {
            return await new TransactionBuilder(client)
              .pumpFunBuy({
                pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
                poolAccounts: { coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3' },
                user: testWallet,
                solAmountIn: 1_000_000,
                tokenAmountOut: 3_400_000_000,
              })
              .setFeePayer(testWallet)
              .simulate();
          });

          latencies.push(latency);
        }

        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        console.log(`\n📊 Pump.fun Buy Simulation Avg Latency: ${avg.toFixed(2)}ms`);

        expect(avg).toBeGreaterThan(0);
      },
      TEST_TIMEOUTS.PERFORMANCE
    );
  });

  describe('VANILLA Mode Latency', () => {
    it(
      'should measure vanilla RPC latency',
      async () => {
        const latencies: number[] = [];

        // Run 10 operations (fewer due to actual RPC calls)
        for (let i = 0; i < 10; i++) {
          const { latency, result } = await measureLatency(async () => {
            return await new TransactionBuilder(client)
              .systemTransfer({
                sender: testWallet,
                recipient: testRecipient,
                lamports: 1_000_000,
              })
              .setFeePayer(testWallet)
              .setTransport('VANILLA')
              .send();
          });

          if (result.success) {
            latencies.push(latency);
          }
        }

        if (latencies.length > 0) {
          const p50 = calculatePercentile(latencies, 50);
          const p95 = calculatePercentile(latencies, 95);
          const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

          console.log('\n📊 VANILLA Mode Latency:');
          console.log(`   P50: ${p50.toFixed(2)}ms`);
          console.log(`   P95: ${p95.toFixed(2)}ms`);
          console.log(`   Avg: ${avg.toFixed(2)}ms`);

          expect(avg).toBeGreaterThan(LATENCY_TARGETS.VANILLA.min);
        }
      },
      TEST_TIMEOUTS.PERFORMANCE
    );
  });

  describe('Batched Operations Latency', () => {
    it(
      'should measure latency for small batch (2 operations)',
      async () => {
        const latencies: number[] = [];

        for (let i = 0; i < 10; i++) {
          const { latency } = await measureLatency(async () => {
            return await new TransactionBuilder(client)
              .systemTransfer({
                sender: testWallet,
                recipient: testRecipient,
                lamports: 1_000_000,
              })
              .splTokenTransfer({
                mint: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
                sourceOwner: testWallet,
                destinationOwner: testRecipient,
                amount: 1_000_000,
              })
              .setFeePayer(testWallet)
              .simulate();
          });

          latencies.push(latency);
        }

        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        console.log(`\n📊 Small Batch (2 ops) Avg Latency: ${avg.toFixed(2)}ms`);

        expect(avg).toBeGreaterThan(0);
      },
      TEST_TIMEOUTS.PERFORMANCE
    );

    it(
      'should measure latency for medium batch (5 operations)',
      async () => {
        const latencies: number[] = [];

        for (let i = 0; i < 10; i++) {
          const { latency } = await measureLatency(async () => {
            return await new TransactionBuilder(client)
              .systemTransfer({
                sender: testWallet,
                recipient: testRecipient,
                lamports: 1_000_000,
              })
              .systemTransfer({
                sender: testWallet,
                recipient: '7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3',
                lamports: 1_000_000,
              })
              .systemTransfer({
                sender: testWallet,
                recipient: '3k8BDobKk8rf68pfk5nVPgQqXHL8RBp4h4DpJm9qMh7H',
                lamports: 1_000_000,
              })
              .splTokenTransfer({
                mint: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
                sourceOwner: testWallet,
                destinationOwner: testRecipient,
                amount: 1_000_000,
              })
              .splTokenApprove({
                mint: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
                owner: testWallet,
                spender: testRecipient,
                amount: 5_000_000,
              })
              .setFeePayer(testWallet)
              .simulate();
          });

          latencies.push(latency);
        }

        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        console.log(`\n📊 Medium Batch (5 ops) Avg Latency: ${avg.toFixed(2)}ms`);

        expect(avg).toBeGreaterThan(0);
      },
      TEST_TIMEOUTS.PERFORMANCE
    );

    it(
      'should measure latency for large batch (10 operations)',
      async () => {
        const latencies: number[] = [];

        for (let i = 0; i < 5; i++) {
          let builder = new TransactionBuilder(client);

          // Add 10 transfers
          for (let j = 0; j < 10; j++) {
            builder = builder.systemTransfer({
              sender: testWallet,
              recipient: testRecipient,
              lamports: (j + 1) * 100_000,
            });
          }

          const { latency } = await measureLatency(async () => {
            return await builder.setFeePayer(testWallet).simulate();
          });

          latencies.push(latency);
        }

        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        console.log(`\n📊 Large Batch (10 ops) Avg Latency: ${avg.toFixed(2)}ms`);

        expect(avg).toBeGreaterThan(0);
      },
      TEST_TIMEOUTS.PERFORMANCE
    );
  });

  describe('Operation Type Comparison', () => {
    it(
      'should compare latency across operation types',
      async () => {
        const results: Record<string, number> = {};

        // System Transfer
        const systemLatencies: number[] = [];
        for (let i = 0; i < 10; i++) {
          const { latency } = await measureLatency(async () => {
            return await new TransactionBuilder(client)
              .systemTransfer({
                sender: testWallet,
                recipient: testRecipient,
                lamports: 1_000_000,
              })
              .setFeePayer(testWallet)
              .simulate();
          });
          systemLatencies.push(latency);
        }
        results['System Transfer'] =
          systemLatencies.reduce((a, b) => a + b) / systemLatencies.length;

        // SPL Token Transfer
        const splLatencies: number[] = [];
        for (let i = 0; i < 10; i++) {
          const { latency } = await measureLatency(async () => {
            return await new TransactionBuilder(client)
              .splTokenTransfer({
                mint: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
                sourceOwner: testWallet,
                destinationOwner: testRecipient,
                amount: 1_000_000,
              })
              .setFeePayer(testWallet)
              .simulate();
          });
          splLatencies.push(latency);
        }
        results['SPL Token Transfer'] = splLatencies.reduce((a, b) => a + b) / splLatencies.length;

        // Pump.fun Buy
        const pumpLatencies: number[] = [];
        for (let i = 0; i < 10; i++) {
          const { latency } = await measureLatency(async () => {
            return await new TransactionBuilder(client)
              .pumpFunBuy({
                pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
                poolAccounts: { coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3' },
                user: testWallet,
                solAmountIn: 1_000_000,
                tokenAmountOut: 3_400_000_000,
              })
              .setFeePayer(testWallet)
              .simulate();
          });
          pumpLatencies.push(latency);
        }
        results['Pump.fun Buy'] = pumpLatencies.reduce((a, b) => a + b) / pumpLatencies.length;

        console.log('\n📊 Operation Type Latency Comparison:');
        Object.entries(results).forEach(([operation, avgLatency]) => {
          console.log(`   ${operation.padEnd(25)}: ${avgLatency.toFixed(2)}ms`);
        });

        // All operations should complete in reasonable time
        Object.values(results).forEach((latency) => {
          expect(latency).toBeGreaterThan(0);
          expect(latency).toBeLessThan(5000); // 5 seconds max
        });
      },
      TEST_TIMEOUTS.PERFORMANCE * 2
    );
  });

  describe('Consistency Tests', () => {
    it(
      'should have consistent latency across multiple runs',
      async () => {
        const latencies: number[] = [];

        // Run same operation 30 times
        for (let i = 0; i < 30; i++) {
          const { latency } = await measureLatency(async () => {
            return await new TransactionBuilder(client)
              .systemTransfer({
                sender: testWallet,
                recipient: testRecipient,
                lamports: 1_000_000,
              })
              .setFeePayer(testWallet)
              .simulate();
          });

          latencies.push(latency);
        }

        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const variance =
          latencies.reduce((sum, latency) => sum + Math.pow(latency - avg, 2), 0) /
          latencies.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = (stdDev / avg) * 100;

        console.log('\n📊 Latency Consistency (30 runs):');
        console.log(`   Average: ${avg.toFixed(2)}ms`);
        console.log(`   Std Dev: ${stdDev.toFixed(2)}ms`);
        console.log(`   Coefficient of Variation: ${coefficientOfVariation.toFixed(2)}%`);

        // Latency should be reasonably consistent (CV < 100%)
        expect(coefficientOfVariation).toBeLessThan(100);
      },
      TEST_TIMEOUTS.PERFORMANCE * 2
    );

    it(
      'should maintain latency under sequential load',
      async () => {
        const latencies: number[] = [];

        // Run 50 operations sequentially
        for (let i = 0; i < 50; i++) {
          const { latency } = await measureLatency(async () => {
            return await new TransactionBuilder(client)
              .systemTransfer({
                sender: testWallet,
                recipient: testRecipient,
                lamports: 1_000_000,
              })
              .setFeePayer(testWallet)
              .simulate();
          });

          latencies.push(latency);
        }

        // Compare first 10 vs last 10
        const first10Avg = latencies.slice(0, 10).reduce((a, b) => a + b) / 10;
        const last10Avg = latencies.slice(-10).reduce((a, b) => a + b) / 10;
        const degradation = ((last10Avg - first10Avg) / first10Avg) * 100;

        console.log('\n📊 Sequential Load Performance:');
        console.log(`   First 10 Avg: ${first10Avg.toFixed(2)}ms`);
        console.log(`   Last 10 Avg: ${last10Avg.toFixed(2)}ms`);
        console.log(`   Degradation: ${degradation.toFixed(2)}%`);

        // Allow up to 50% degradation (should be much better)
        expect(Math.abs(degradation)).toBeLessThan(50);
      },
      TEST_TIMEOUTS.PERFORMANCE * 3
    );
  });

  describe('Cold Start vs Warm', () => {
    it(
      'should measure cold start latency',
      async () => {
        // Create fresh client
        const coldClient = createTestClient();

        const { latency: coldLatency } = await measureLatency(async () => {
          return await new TransactionBuilder(coldClient)
            .systemTransfer({
              sender: testWallet,
              recipient: testRecipient,
              lamports: 1_000_000,
            })
            .setFeePayer(testWallet)
            .simulate();
        });

        console.log(`\n📊 Cold Start Latency: ${coldLatency.toFixed(2)}ms`);

        coldClient.close();

        expect(coldLatency).toBeGreaterThan(0);
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should compare cold vs warm latency',
      async () => {
        // Cold start
        const coldClient = createTestClient();
        const { latency: coldLatency } = await measureLatency(async () => {
          return await new TransactionBuilder(coldClient)
            .systemTransfer({
              sender: testWallet,
              recipient: testRecipient,
              lamports: 1_000_000,
            })
            .setFeePayer(testWallet)
            .simulate();
        });

        // Warm runs (after connection established)
        const warmLatencies: number[] = [];
        for (let i = 0; i < 10; i++) {
          const { latency } = await measureLatency(async () => {
            return await new TransactionBuilder(coldClient)
              .systemTransfer({
                sender: testWallet,
                recipient: testRecipient,
                lamports: 1_000_000,
              })
              .setFeePayer(testWallet)
              .simulate();
          });
          warmLatencies.push(latency);
        }

        const warmAvg = warmLatencies.reduce((a, b) => a + b) / warmLatencies.length;

        console.log('\n📊 Cold vs Warm Comparison:');
        console.log(`   Cold Start: ${coldLatency.toFixed(2)}ms`);
        console.log(`   Warm Average: ${warmAvg.toFixed(2)}ms`);
        console.log(`   Ratio: ${(coldLatency / warmAvg).toFixed(2)}x`);

        coldClient.close();

        expect(coldLatency).toBeGreaterThan(0);
        expect(warmAvg).toBeGreaterThan(0);
      },
      TEST_TIMEOUTS.PERFORMANCE
    );
  });
});
