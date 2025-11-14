/**
 * Integration Tests for SPL Token Operations
 *
 * Tests all 9 SPL token operations against real execution engine
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SolanaExecutionClient } from '../../src/client';
import { TransactionBuilder } from '../../src/builder';
import { createTestClient, assertSuccessResponse, assertHasLogs } from '../test-utils';
import { TEST_TIMEOUTS } from '../setup';

describe('SPL Token Integration Tests', () => {
  let client: SolanaExecutionClient;

  // Test constants
  const testMint = '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump';
  const testUser = '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89';
  const testRecipient = '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz';

  beforeAll(() => {
    client = createTestClient();
  }, TEST_TIMEOUTS.INTEGRATION);

  afterAll(() => {
    if (client) {
      client.close();
    }
  });

  describe('TRANSFER Operation', () => {
    it('should simulate token transfer', async () => {
      const response = await client.execute({
        data: {
          executionType: 'SPL_TOKEN',
          eventType: 'TRANSFER',
          mint: testMint,
          sourceOwner: testUser,
          destinationOwner: testRecipient,
          amount: 1_000_000, // 1 token (6 decimals)
        },
        feePayer: testUser,
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
      assertHasLogs(response);
      expect(response.transport).toBe('SIMULATE');
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate with builder pattern', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testUser,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testUser)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle different transfer amounts', async () => {
      const amounts = [100_000, 500_000, 1_000_000, 10_000_000];

      for (const amount of amounts) {
        const response = await new TransactionBuilder(client)
          .splTokenTransfer({
            mint: testMint,
            sourceOwner: testUser,
            destinationOwner: testRecipient,
            amount,
          })
          .setFeePayer(testUser)
          .simulate();

        assertSuccessResponse(response);
      }
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle minimal transfer (1 token unit)', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testUser,
          destinationOwner: testRecipient,
          amount: 1, // Smallest unit
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('TRANSFER_CHECKED Operation', () => {
    it('should simulate transfer with decimals validation', async () => {
      const response = await client.execute({
        data: {
          executionType: 'SPL_TOKEN',
          eventType: 'TRANSFER_CHECKED',
          mint: testMint,
          sourceOwner: testUser,
          destinationOwner: testRecipient,
          amount: 1_000_000, // 1 token
          decimals: 6,
        },
        feePayer: testUser,
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate with builder pattern', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenTransferChecked({
          mint: testMint,
          sourceOwner: testUser,
          destinationOwner: testRecipient,
          amount: 1_000_000,
          decimals: 6,
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should validate decimals parameter', async () => {
      const decimalsToTest = [0, 6, 9];

      for (const decimals of decimalsToTest) {
        const response = await new TransactionBuilder(client)
          .splTokenTransferChecked({
            mint: testMint,
            sourceOwner: testUser,
            destinationOwner: testRecipient,
            amount: 1_000_000,
            decimals,
          })
          .setFeePayer(testUser)
          .simulate();

        assertSuccessResponse(response);
      }
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('CREATE_ATA Operation', () => {
    it('should simulate ATA creation', async () => {
      const response = await client.execute({
        data: {
          executionType: 'SPL_TOKEN',
          eventType: 'CREATE_ATA',
          payer: testUser,
          owner: testUser,
          mint: testMint,
        },
        feePayer: testUser,
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate with builder pattern', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenCreateATA({
          payer: testUser,
          owner: testUser,
          mint: testMint,
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should create ATA for different owner', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenCreateATA({
          payer: testUser, // Payer
          owner: testRecipient, // Different owner
          mint: testMint,
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('CLOSE_ACCOUNT Operation', () => {
    it('should simulate account closure', async () => {
      const response = await client.execute({
        data: {
          executionType: 'SPL_TOKEN',
          eventType: 'CLOSE_ACCOUNT',
          mint: testMint,
          owner: testUser,
        },
        feePayer: testUser,
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate with builder pattern', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenCloseAccount({
          mint: testMint,
          owner: testUser,
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('APPROVE Operation', () => {
    it('should simulate token approval', async () => {
      const response = await client.execute({
        data: {
          executionType: 'SPL_TOKEN',
          eventType: 'APPROVE',
          mint: testMint,
          owner: testUser,
          spender: testRecipient,
          amount: 5_000_000, // Approve 5 tokens
        },
        feePayer: testUser,
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate with builder pattern', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenApprove({
          mint: testMint,
          owner: testUser,
          spender: testRecipient,
          amount: 5_000_000,
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle different approval amounts', async () => {
      const amounts = [1_000_000, 10_000_000, 100_000_000];

      for (const amount of amounts) {
        const response = await new TransactionBuilder(client)
          .splTokenApprove({
            mint: testMint,
            owner: testUser,
            spender: testRecipient,
            amount,
          })
          .setFeePayer(testUser)
          .simulate();

        assertSuccessResponse(response);
      }
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('REVOKE Operation', () => {
    it('should simulate approval revocation', async () => {
      const response = await client.execute({
        data: {
          executionType: 'SPL_TOKEN',
          eventType: 'REVOKE',
          mint: testMint,
          owner: testUser,
        },
        feePayer: testUser,
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate with builder pattern', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenRevoke({
          mint: testMint,
          owner: testUser,
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('MINT_TO Operation', () => {
    it('should simulate token minting', async () => {
      const response = await client.execute({
        data: {
          executionType: 'SPL_TOKEN',
          eventType: 'MINT_TO',
          mint: testMint,
          destinationOwner: testRecipient,
          authority: testUser, // Must be mint authority
          amount: 10_000_000, // Mint 10 tokens
        },
        feePayer: testUser,
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate with builder pattern', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenMintTo({
          mint: testMint,
          destinationOwner: testRecipient,
          authority: testUser,
          amount: 10_000_000,
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle different mint amounts', async () => {
      const amounts = [1_000_000, 50_000_000, 100_000_000];

      for (const amount of amounts) {
        const response = await new TransactionBuilder(client)
          .splTokenMintTo({
            mint: testMint,
            destinationOwner: testRecipient,
            authority: testUser,
            amount,
          })
          .setFeePayer(testUser)
          .simulate();

        assertSuccessResponse(response);
      }
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('BURN Operation', () => {
    it('should simulate token burning', async () => {
      const response = await client.execute({
        data: {
          executionType: 'SPL_TOKEN',
          eventType: 'BURN',
          mint: testMint,
          owner: testUser,
          amount: 2_000_000, // Burn 2 tokens
        },
        feePayer: testUser,
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate with builder pattern', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenBurn({
          mint: testMint,
          owner: testUser,
          amount: 2_000_000,
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle different burn amounts', async () => {
      const amounts = [1_000_000, 5_000_000, 10_000_000];

      for (const amount of amounts) {
        const response = await new TransactionBuilder(client)
          .splTokenBurn({
            mint: testMint,
            owner: testUser,
            amount,
          })
          .setFeePayer(testUser)
          .simulate();

        assertSuccessResponse(response);
      }
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('SYNC_NATIVE Operation', () => {
    it('should simulate native SOL sync', async () => {
      const response = await client.execute({
        data: {
          executionType: 'SPL_TOKEN',
          eventType: 'SYNC_NATIVE',
          owner: testUser,
        },
        feePayer: testUser,
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate with builder pattern', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenSyncNative({
          owner: testUser,
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Multi-Operation Flows', () => {
    it('should simulate approve + transfer flow', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenApprove({
          mint: testMint,
          owner: testUser,
          spender: testRecipient,
          amount: 5_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testUser,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate approve + revoke flow', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenApprove({
          mint: testMint,
          owner: testUser,
          spender: testRecipient,
          amount: 5_000_000,
        })
        .splTokenRevoke({
          mint: testMint,
          owner: testUser,
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should simulate create ATA + transfer flow', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenCreateATA({
          payer: testUser,
          owner: testRecipient,
          mint: testMint,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testUser,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testUser)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Priority Fees', () => {
    it('should handle high priority fee', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testUser,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testUser)
        .setPriorityFee(10_000_000) // High priority
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle zero priority fee', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testUser,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testUser)
        .setPriorityFee(0)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });
});
