/**
 * Integration Tests for Pump.fun Operations
 *
 * Tests Pump.fun protocol operations (CREATE, BUY, SELL, MIGRATE) against real execution engine
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SolanaExecutionClient } from '../../src/client';
import { TransactionBuilder } from '../../src/builder';
import { createTestClient, assertSuccessResponse, assertHasLogs } from '../test-utils';
import { TEST_TIMEOUTS } from '../setup';

describe('Pump.fun Integration Tests', () => {
  let client: SolanaExecutionClient;

  beforeAll(() => {
    client = createTestClient();
  }, TEST_TIMEOUTS.INTEGRATION);

  afterAll(() => {
    if (client) {
      client.close();
    }
  });

  describe('BUY Operation', () => {
    it(
      'should simulate buy on bonding curve',
      async () => {
        const response = await client.execute({
          data: {
            executionType: 'PUMP_FUN',
            eventType: 'BUY',
            pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
            poolAccounts: {
              coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
            },
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            solAmountIn: 1_000_000, // 0.001 SOL
            tokenAmountOut: 3_400_000_000, // Min 3.4B tokens
          },
          feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          priorityFeeLamports: 1_000_000,
          transport: 'SIMULATE',
          bribeLamports: 1_000_000,
        });

        assertSuccessResponse(response);
        assertHasLogs(response);
        expect(response.transport).toBe('SIMULATE');
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should simulate buy with builder pattern',
      async () => {
        const response = await new TransactionBuilder(client)
          .pumpFunBuy({
            pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
            poolAccounts: {
              coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
            },
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            solAmountIn: 1_000_000,
            tokenAmountOut: 3_400_000_000,
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .setPriorityFee(1_000_000)
          .simulate();

        assertSuccessResponse(response);
        assertHasLogs(response);
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should handle different buy amounts',
      async () => {
        const amounts = [
          { solIn: 500_000, tokenOut: 1_700_000_000 },
          { solIn: 2_000_000, tokenOut: 6_800_000_000 },
          { solIn: 10_000_000, tokenOut: 34_000_000_000 },
        ];

        for (const { solIn, tokenOut } of amounts) {
          const response = await new TransactionBuilder(client)
            .pumpFunBuy({
              pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
              poolAccounts: {
                coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
              },
              user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
              solAmountIn: solIn,
              tokenAmountOut: tokenOut,
            })
            .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
            .simulate();

          assertSuccessResponse(response);
        }
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('SELL Operation', () => {
    it(
      'should simulate sell on bonding curve',
      async () => {
        const response = await client.execute({
          data: {
            executionType: 'PUMP_FUN',
            eventType: 'SELL',
            pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
            poolAccounts: {
              coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
            },
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            tokenAmountIn: 3_400_000_000, // 3.4B tokens
            minSolAmountOut: 0, // No slippage protection
            closeAssociatedTokenAccount: false,
          },
          feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          priorityFeeLamports: 1_000_000,
          transport: 'SIMULATE',
          bribeLamports: 1_000_000,
        });

        assertSuccessResponse(response);
        assertHasLogs(response);
        expect(response.transport).toBe('SIMULATE');
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should simulate sell with builder pattern',
      async () => {
        const response = await new TransactionBuilder(client)
          .pumpFunSell({
            pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
            poolAccounts: {
              coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
            },
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            tokenAmountIn: 3_400_000_000,
            minSolAmountOut: 0,
            closeAssociatedTokenAccount: false,
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .setPriorityFee(1_000_000)
          .simulate();

        assertSuccessResponse(response);
        assertHasLogs(response);
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should simulate sell with ATA closure',
      async () => {
        const response = await new TransactionBuilder(client)
          .pumpFunSell({
            pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
            poolAccounts: {
              coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
            },
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            tokenAmountIn: 3_400_000_000,
            minSolAmountOut: 0,
            closeAssociatedTokenAccount: true, // Close ATA to reclaim rent
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .simulate();

        assertSuccessResponse(response);
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should simulate sell with slippage protection',
      async () => {
        const response = await new TransactionBuilder(client)
          .pumpFunSell({
            pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
            poolAccounts: {
              coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
            },
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            tokenAmountIn: 3_400_000_000,
            minSolAmountOut: 900_000, // Minimum 0.0009 SOL
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .simulate();

        assertSuccessResponse(response);
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('CREATE Operation', () => {
    it(
      'should simulate token creation',
      async () => {
        // Note: Using a test mint public key and secret key
        // In real usage, you would generate these with Keypair.generate()
        const response = await new TransactionBuilder(client)
          .pumpFunCreate({
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            pool: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', // Test mint public key
            mintSecretKey:
              'AwEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ==', // Test secret
            meta: {
              name: 'Test Token',
              symbol: 'TEST',
              uri: 'https://test.com/metadata.json',
            },
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .setPriorityFee(1_000_000)
          .simulate();

        assertSuccessResponse(response);
        assertHasLogs(response);
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should validate metadata fields',
      async () => {
        const response = await new TransactionBuilder(client)
          .pumpFunCreate({
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            pool: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            mintSecretKey:
              'AwEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ==',
            meta: {
              name: 'My Awesome Token',
              symbol: 'MAT',
              uri: 'https://arweave.net/abc123',
            },
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .simulate();

        assertSuccessResponse(response);
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('MIGRATE Operation', () => {
    it(
      'should simulate migration to Raydium AMM',
      async () => {
        const response = await new TransactionBuilder(client)
          .pumpFunMigrate({
            pool: 's4WB81LEUw3mh3qMjQgAJzumYqdNTgr6DYPWaLbpump',
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .setPriorityFee(1_000_000)
          .simulate();

        assertSuccessResponse(response);
        assertHasLogs(response);
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should simulate migration with direct execute',
      async () => {
        const response = await client.execute({
          data: {
            executionType: 'PUMP_FUN',
            eventType: 'MIGRATE',
            pool: 's4WB81LEUw3mh3qMjQgAJzumYqdNTgr6DYPWaLbpump',
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          },
          feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          priorityFeeLamports: 1_000_000,
          transport: 'SIMULATE',
          bribeLamports: 1_000_000,
        });

        assertSuccessResponse(response);
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('Multi-Operation Scenarios', () => {
    it(
      'should simulate buy + sell flow',
      async () => {
        const response = await new TransactionBuilder(client)
          .pumpFunBuy({
            pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
            poolAccounts: {
              coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
            },
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            solAmountIn: 1_000_000,
            tokenAmountOut: 3_400_000_000,
          })
          .pumpFunSell({
            pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
            poolAccounts: {
              coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
            },
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            tokenAmountIn: 3_400_000_000,
            minSolAmountOut: 0,
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .setPriorityFee(1_000_000)
          .simulate();

        assertSuccessResponse(response);
        assertHasLogs(response);
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should simulate create + buy flow',
      async () => {
        const response = await new TransactionBuilder(client)
          .pumpFunCreate({
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            pool: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            mintSecretKey:
              'AwEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ==',
            meta: {
              name: 'Test Token',
              symbol: 'TEST',
              uri: 'https://test.com',
            },
          })
          .pumpFunBuy({
            pool: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            poolAccounts: {
              coinCreator: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            },
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            solAmountIn: 10_000_000,
            tokenAmountOut: 34_000_000_000,
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .simulate();

        assertSuccessResponse(response);
        assertHasLogs(response);
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });

  describe('Priority Fees', () => {
    it(
      'should handle high priority fee',
      async () => {
        const response = await new TransactionBuilder(client)
          .pumpFunBuy({
            pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
            poolAccounts: {
              coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
            },
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            solAmountIn: 1_000_000,
            tokenAmountOut: 3_400_000_000,
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .setPriorityFee(10_000_000) // 0.01 SOL (high priority)
          .simulate();

        assertSuccessResponse(response);
      },
      TEST_TIMEOUTS.INTEGRATION
    );

    it(
      'should handle zero priority fee',
      async () => {
        const response = await new TransactionBuilder(client)
          .pumpFunBuy({
            pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
            poolAccounts: {
              coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
            },
            user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
            solAmountIn: 1_000_000,
            tokenAmountOut: 3_400_000_000,
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .setPriorityFee(0)
          .simulate();

        assertSuccessResponse(response);
      },
      TEST_TIMEOUTS.INTEGRATION
    );
  });
});
