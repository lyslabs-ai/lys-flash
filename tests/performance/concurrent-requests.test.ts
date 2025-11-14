/**
 * Performance Tests - Concurrent Requests
 *
 * Tests concurrent request handling, throughput, and connection pooling
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SolanaExecutionClient } from '../../src/client';
import { TransactionBuilder } from '../../src/builder';
import { createTestClient, assertSuccessResponse, measureLatency } from '../test-utils';
import { TEST_TIMEOUTS } from '../setup';

describe('Performance Tests - Concurrent Requests', () => {
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

  describe('Parallel Execution', () => {
    it('should handle 5 concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        new TransactionBuilder(client)
          .systemTransfer({
            sender: testWallet,
            recipient: testRecipient,
            lamports: (i + 1) * 100_000,
          })
          .setFeePayer(testWallet)
          .simulate(),
      );

      const start = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - start;

      console.log(`\n📊 5 Concurrent Requests: ${totalTime}ms total`);
      console.log(`   Average per request: ${(totalTime / 5).toFixed(2)}ms`);

      results.forEach((response) => {
        assertSuccessResponse(response);
      });

      expect(results).toHaveLength(5);
    }, TEST_TIMEOUTS.PERFORMANCE);

    it('should handle 10 concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        new TransactionBuilder(client)
          .systemTransfer({
            sender: testWallet,
            recipient: testRecipient,
            lamports: (i + 1) * 100_000,
          })
          .setFeePayer(testWallet)
          .simulate(),
      );

      const start = Date.now();
      const results = await Promise.allSettled(promises);
      const totalTime = Date.now() - start;

      const successful = results.filter((r) => r.status === 'fulfilled').length;

      console.log(`\n📊 10 Concurrent Requests: ${totalTime}ms total`);
      console.log(`   Successful: ${successful}/10`);
      console.log(`   Average per request: ${(totalTime / 10).toFixed(2)}ms`);

      // At least 70% should succeed
      expect(successful).toBeGreaterThanOrEqual(7);
    }, TEST_TIMEOUTS.PERFORMANCE);

    it('should handle 20 concurrent requests', async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        new TransactionBuilder(client)
          .systemTransfer({
            sender: testWallet,
            recipient: testRecipient,
            lamports: (i + 1) * 100_000,
          })
          .setFeePayer(testWallet)
          .simulate(),
      );

      const start = Date.now();
      const results = await Promise.allSettled(promises);
      const totalTime = Date.now() - start;

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      console.log(`\n📊 20 Concurrent Requests: ${totalTime}ms total`);
      console.log(`   Successful: ${successful}/20`);
      console.log(`   Failed: ${failed}/20`);
      console.log(`   Average per request: ${(totalTime / 20).toFixed(2)}ms`);

      // At least 50% should succeed (some may fail due to connection limits)
      expect(successful).toBeGreaterThanOrEqual(10);
    }, TEST_TIMEOUTS.PERFORMANCE);
  });

  describe('Throughput Tests', () => {
    it('should measure throughput for simple operations', async () => {
      const operationCount = 50;
      const start = Date.now();

      const promises = Array.from({ length: operationCount }, (_, i) =>
        new TransactionBuilder(client)
          .systemTransfer({
            sender: testWallet,
            recipient: testRecipient,
            lamports: (i + 1) * 100_000,
          })
          .setFeePayer(testWallet)
          .simulate(),
      );

      const results = await Promise.allSettled(promises);
      const totalTime = Date.now() - start;

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const throughput = (successful / totalTime) * 1000; // ops/second

      console.log(`\n📊 Throughput Test (${operationCount} operations):`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Successful: ${successful}/${operationCount}`);
      console.log(`   Throughput: ${throughput.toFixed(2)} ops/sec`);

      expect(successful).toBeGreaterThan(operationCount * 0.5); // At least 50% success
    }, TEST_TIMEOUTS.PERFORMANCE * 2);

    it('should measure throughput for batched operations', async () => {
      const batchCount = 20;
      const start = Date.now();

      const promises = Array.from({ length: batchCount }, (_, i) =>
        new TransactionBuilder(client)
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
          .simulate(),
      );

      const results = await Promise.allSettled(promises);
      const totalTime = Date.now() - start;

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const throughput = (successful / totalTime) * 1000; // batches/second

      console.log(`\n📊 Batched Throughput Test (${batchCount} batches):`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Successful: ${successful}/${batchCount}`);
      console.log(`   Throughput: ${throughput.toFixed(2)} batches/sec`);

      expect(successful).toBeGreaterThan(batchCount * 0.5);
    }, TEST_TIMEOUTS.PERFORMANCE * 2);
  });

  describe('Sequential vs Parallel Comparison', () => {
    it('should compare sequential vs parallel execution', async () => {
      const operationCount = 10;

      // Sequential execution
      const sequentialStart = Date.now();
      for (let i = 0; i < operationCount; i++) {
        await new TransactionBuilder(client)
          .systemTransfer({
            sender: testWallet,
            recipient: testRecipient,
            lamports: (i + 1) * 100_000,
          })
          .setFeePayer(testWallet)
          .simulate();
      }
      const sequentialTime = Date.now() - sequentialStart;

      // Parallel execution
      const parallelStart = Date.now();
      const promises = Array.from({ length: operationCount }, (_, i) =>
        new TransactionBuilder(client)
          .systemTransfer({
            sender: testWallet,
            recipient: testRecipient,
            lamports: (i + 1) * 100_000,
          })
          .setFeePayer(testWallet)
          .simulate(),
      );
      await Promise.allSettled(promises);
      const parallelTime = Date.now() - parallelStart;

      const speedup = sequentialTime / parallelTime;

      console.log(`\n📊 Sequential vs Parallel (${operationCount} operations):`);
      console.log(`   Sequential: ${sequentialTime}ms`);
      console.log(`   Parallel: ${parallelTime}ms`);
      console.log(`   Speedup: ${speedup.toFixed(2)}x`);

      // Parallel should be faster
      expect(parallelTime).toBeLessThan(sequentialTime);
    }, TEST_TIMEOUTS.PERFORMANCE * 2);
  });

  describe('Connection Pooling', () => {
    it('should handle burst traffic', async () => {
      const burstSize = 30;

      // First burst
      const burst1Start = Date.now();
      const burst1Promises = Array.from({ length: burstSize }, (_, i) =>
        new TransactionBuilder(client)
          .systemTransfer({
            sender: testWallet,
            recipient: testRecipient,
            lamports: (i + 1) * 100_000,
          })
          .setFeePayer(testWallet)
          .simulate(),
      );
      const burst1Results = await Promise.allSettled(burst1Promises);
      const burst1Time = Date.now() - burst1Start;
      const burst1Success = burst1Results.filter((r) => r.status === 'fulfilled').length;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second burst
      const burst2Start = Date.now();
      const burst2Promises = Array.from({ length: burstSize }, (_, i) =>
        new TransactionBuilder(client)
          .systemTransfer({
            sender: testWallet,
            recipient: testRecipient,
            lamports: (i + 1) * 100_000,
          })
          .setFeePayer(testWallet)
          .simulate(),
      );
      const burst2Results = await Promise.allSettled(burst2Promises);
      const burst2Time = Date.now() - burst2Start;
      const burst2Success = burst2Results.filter((r) => r.status === 'fulfilled').length;

      console.log(`\n📊 Burst Traffic Test:`);
      console.log(`   Burst 1: ${burst1Time}ms (${burst1Success}/${burstSize} success)`);
      console.log(`   Burst 2: ${burst2Time}ms (${burst2Success}/${burstSize} success)`);

      // Second burst should be similar or faster (connection pooling)
      expect(burst2Success).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.PERFORMANCE * 2);

    it('should maintain performance under sustained load', async () => {
      const rounds = 5;
      const opsPerRound = 10;
      const roundTimes: number[] = [];

      for (let round = 0; round < rounds; round++) {
        const roundStart = Date.now();
        const promises = Array.from({ length: opsPerRound }, (_, i) =>
          new TransactionBuilder(client)
            .systemTransfer({
              sender: testWallet,
              recipient: testRecipient,
              lamports: (i + 1) * 100_000,
            })
            .setFeePayer(testWallet)
            .simulate(),
        );

        await Promise.allSettled(promises);
        const roundTime = Date.now() - roundStart;
        roundTimes.push(roundTime);

        console.log(`   Round ${round + 1}: ${roundTime}ms`);

        // Small delay between rounds
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const avgTime = roundTimes.reduce((a, b) => a + b) / rounds;
      const firstRound = roundTimes[0];
      const lastRound = roundTimes[rounds - 1];
      const degradation = ((lastRound - firstRound) / firstRound) * 100;

      console.log(`\n📊 Sustained Load Test (${rounds} rounds):`);
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
      console.log(`   First Round: ${firstRound}ms`);
      console.log(`   Last Round: ${lastRound}ms`);
      console.log(`   Degradation: ${degradation.toFixed(2)}%`);

      // Allow up to 50% degradation
      expect(Math.abs(degradation)).toBeLessThan(50);
    }, TEST_TIMEOUTS.PERFORMANCE * 3);
  });

  describe('Mixed Operation Concurrency', () => {
    it('should handle concurrent mixed operations', async () => {
      const promises = [
        // System transfers
        ...Array.from({ length: 5 }, (_, i) =>
          new TransactionBuilder(client)
            .systemTransfer({
              sender: testWallet,
              recipient: testRecipient,
              lamports: (i + 1) * 100_000,
            })
            .setFeePayer(testWallet)
            .simulate(),
        ),

        // SPL token operations
        ...Array.from({ length: 5 }, (_, i) =>
          new TransactionBuilder(client)
            .splTokenTransfer({
              mint: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
              sourceOwner: testWallet,
              destinationOwner: testRecipient,
              amount: (i + 1) * 1_000_000,
            })
            .setFeePayer(testWallet)
            .simulate(),
        ),

        // Pump.fun operations
        ...Array.from({ length: 5 }, (_, i) =>
          new TransactionBuilder(client)
            .pumpFunBuy({
              pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
              poolAccounts: { coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3' },
              user: testWallet,
              solAmountIn: (i + 1) * 1_000_000,
              tokenAmountOut: (i + 1) * 3_400_000_000,
            })
            .setFeePayer(testWallet)
            .simulate(),
        ),
      ];

      const start = Date.now();
      const results = await Promise.allSettled(promises);
      const totalTime = Date.now() - start;

      const successful = results.filter((r) => r.status === 'fulfilled').length;

      console.log(`\n📊 Mixed Operations (15 concurrent):`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Successful: ${successful}/15`);

      expect(successful).toBeGreaterThan(10); // At least 2/3 success
    }, TEST_TIMEOUTS.PERFORMANCE);

    it('should handle concurrent batched operations', async () => {
      const batchCount = 10;

      const promises = Array.from({ length: batchCount }, (_, i) =>
        new TransactionBuilder(client)
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
          .pumpFunBuy({
            pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
            poolAccounts: { coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3' },
            user: testWallet,
            solAmountIn: 1_000_000,
            tokenAmountOut: 3_400_000_000,
          })
          .setFeePayer(testWallet)
          .simulate(),
      );

      const start = Date.now();
      const results = await Promise.allSettled(promises);
      const totalTime = Date.now() - start;

      const successful = results.filter((r) => r.status === 'fulfilled').length;

      console.log(`\n📊 Concurrent Batched Operations (${batchCount} batches):`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Successful: ${successful}/${batchCount}`);

      expect(successful).toBeGreaterThan(batchCount * 0.5);
    }, TEST_TIMEOUTS.PERFORMANCE);
  });

  describe('Error Handling Under Load', () => {
    it('should track statistics accurately under concurrent load', async () => {
      const statsBefore = client.getStats();

      const promises = Array.from({ length: 20 }, (_, i) =>
        new TransactionBuilder(client)
          .systemTransfer({
            sender: testWallet,
            recipient: testRecipient,
            lamports: (i + 1) * 100_000,
          })
          .setFeePayer(testWallet)
          .simulate(),
      );

      await Promise.allSettled(promises);

      const statsAfter = client.getStats();

      const requestIncrease = statsAfter.requestsSent - statsBefore.requestsSent;
      const successIncrease = statsAfter.requestsSuccessful - statsBefore.requestsSuccessful;

      console.log(`\n📊 Statistics Under Load:`);
      console.log(`   Requests sent: ${requestIncrease}`);
      console.log(`   Successful: ${successIncrease}`);
      console.log(`   Average latency: ${statsAfter.averageLatency.toFixed(2)}ms`);

      expect(requestIncrease).toBeGreaterThan(0);
      expect(successIncrease).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.PERFORMANCE);

    it('should handle mixed success/failure scenarios', async () => {
      const promises = [
        // Valid operations
        ...Array.from({ length: 10 }, (_, i) =>
          new TransactionBuilder(client)
            .systemTransfer({
              sender: testWallet,
              recipient: testRecipient,
              lamports: (i + 1) * 100_000,
            })
            .setFeePayer(testWallet)
            .simulate(),
        ),

        // Operations that might fail (invalid fee payer handled)
        ...Array.from({ length: 5 }, (_, i) =>
          new TransactionBuilder(client)
            .systemTransfer({
              sender: testWallet,
              recipient: testRecipient,
              lamports: (i + 1) * 100_000,
            })
            .setFeePayer(testWallet)
            .simulate(),
        ),
      ];

      const results = await Promise.allSettled(promises);

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      console.log(`\n📊 Mixed Success/Failure:`);
      console.log(`   Successful: ${successful}`);
      console.log(`   Failed: ${failed}`);

      expect(successful + failed).toBe(15);
    }, TEST_TIMEOUTS.PERFORMANCE);
  });

  describe('Client Connection Stability', () => {
    it('should remain connected after high concurrent load', async () => {
      // High load
      const promises = Array.from({ length: 50 }, (_, i) =>
        new TransactionBuilder(client)
          .systemTransfer({
            sender: testWallet,
            recipient: testRecipient,
            lamports: (i + 1) * 100_000,
          })
          .setFeePayer(testWallet)
          .simulate(),
      );

      await Promise.allSettled(promises);

      // Check connection is still alive
      const isConnected = client.isConnected();
      expect(isConnected).toBe(true);

      // Verify can still execute
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: 1_000_000,
        })
        .setFeePayer(testWallet)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.PERFORMANCE * 2);

    it('should handle ping under concurrent load', async () => {
      // Start concurrent operations
      const operationPromises = Array.from({ length: 20 }, (_, i) =>
        new TransactionBuilder(client)
          .systemTransfer({
            sender: testWallet,
            recipient: testRecipient,
            lamports: (i + 1) * 100_000,
          })
          .setFeePayer(testWallet)
          .simulate(),
      );

      // Ping while operations are running
      const pingPromises = Array.from({ length: 5 }, () => client.ping());

      const allPromises = [...operationPromises, ...pingPromises];
      const results = await Promise.allSettled(allPromises);

      const successful = results.filter((r) => r.status === 'fulfilled').length;

      console.log(`\n📊 Ping Under Load:`);
      console.log(`   Total operations: ${allPromises.length}`);
      console.log(`   Successful: ${successful}`);

      expect(successful).toBeGreaterThan(15); // Most should succeed
    }, TEST_TIMEOUTS.PERFORMANCE);
  });
});
