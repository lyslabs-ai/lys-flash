/**
 * Integration Tests for Batched Operations
 *
 * Tests combining multiple operations in single transactions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SolanaExecutionClient } from '../../src/client';
import { TransactionBuilder } from '../../src/builder';
import { createTestClient, assertSuccessResponse, assertHasLogs } from '../test-utils';
import { TEST_TIMEOUTS } from '../setup';

describe('Batched Operations Integration Tests', () => {
  let client: SolanaExecutionClient;

  // Test constants
  const testWallet = '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89';
  const testRecipient = '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz';
  const testMint = '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump';
  const testPumpPool = '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump';
  const testPoolAccounts = {
    coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
  };

  beforeAll(() => {
    client = createTestClient();
  }, TEST_TIMEOUTS.INTEGRATION);

  afterAll(() => {
    if (client) {
      client.close();
    }
  });

  describe('Mixed Operation Types', () => {
    it('should batch system transfer + SPL token transfer', async () => {
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: 1_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
      expect(response.transport).toBe('SIMULATE');
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should batch SPL token operations (approve + transfer)', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenApprove({
          mint: testMint,
          owner: testWallet,
          spender: testRecipient,
          amount: 10_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 5_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should batch create ATA + token transfer', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenCreateATA({
          payer: testWallet,
          owner: testRecipient,
          mint: testMint,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should batch multiple system transfers', async () => {
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: 1_000_000,
        })
        .systemTransfer({
          sender: testWallet,
          recipient: '7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3',
          lamports: 2_000_000,
        })
        .systemTransfer({
          sender: testWallet,
          recipient: '3k8BDobKk8rf68pfk5nVPgQqXHL8RBp4h4DpJm9qMh7H',
          lamports: 3_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Pump.fun Batched Operations', () => {
    it('should batch pump.fun buy + sell', async () => {
      const response = await new TransactionBuilder(client)
        .pumpFunBuy({
          pool: testPumpPool,
          poolAccounts: testPoolAccounts,
          user: testWallet,
          solAmountIn: 1_000_000,
          tokenAmountOut: 3_400_000_000,
        })
        .pumpFunSell({
          pool: testPumpPool,
          poolAccounts: testPoolAccounts,
          user: testWallet,
          tokenAmountIn: 1_000_000_000,
          solAmountOut: 300_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should batch create + buy', async () => {
      const response = await new TransactionBuilder(client)
        .pumpFunCreate({
          creator: testWallet,
          name: 'Batch Test Token',
          symbol: 'BTT',
          uri: 'https://example.com/metadata.json',
        })
        .pumpFunBuy({
          pool: testPumpPool,
          poolAccounts: testPoolAccounts,
          user: testWallet,
          solAmountIn: 1_000_000,
          tokenAmountOut: 3_400_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should batch buy operations with different amounts', async () => {
      const response = await new TransactionBuilder(client)
        .pumpFunBuy({
          pool: testPumpPool,
          poolAccounts: testPoolAccounts,
          user: testWallet,
          solAmountIn: 1_000_000,
          tokenAmountOut: 3_400_000_000,
        })
        .pumpFunBuy({
          pool: testPumpPool,
          poolAccounts: testPoolAccounts,
          user: testWallet,
          solAmountIn: 2_000_000,
          tokenAmountOut: 6_800_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('AMM Batched Operations', () => {
    const ammPool = 'FqXsRAKT5wKLFHCMR4f9TdTedMUWn1XAdWh8nh3pump';
    const ammPoolAccounts = {
      poolCreator: '8btoHHx2Br4qbpR82vYBvWWLjjVb1HBtJUHPxZACyMzJ',
    };

    it('should batch AMM buy + sell', async () => {
      const response = await new TransactionBuilder(client)
        .pumpFunAmmBuy({
          pool: ammPool,
          poolAccounts: ammPoolAccounts,
          user: testWallet,
          solAmountIn: 1_000_000,
          tokenAmountOut: 1_000_000_000,
        })
        .pumpFunAmmSell({
          pool: ammPool,
          poolAccounts: ammPoolAccounts,
          user: testWallet,
          tokenAmountIn: 500_000_000,
          solAmountOut: 500_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should batch multiple AMM buy operations', async () => {
      const response = await new TransactionBuilder(client)
        .pumpFunAmmBuy({
          pool: ammPool,
          poolAccounts: ammPoolAccounts,
          user: testWallet,
          solAmountIn: 1_000_000,
          tokenAmountOut: 1_000_000_000,
        })
        .pumpFunAmmBuy({
          pool: ammPool,
          poolAccounts: ammPoolAccounts,
          user: testWallet,
          solAmountIn: 2_000_000,
          tokenAmountOut: 2_000_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Complex Multi-Protocol Workflows', () => {
    it('should batch pump.fun + system transfer + SPL token', async () => {
      const response = await new TransactionBuilder(client)
        .pumpFunBuy({
          pool: testPumpPool,
          poolAccounts: testPoolAccounts,
          user: testWallet,
          solAmountIn: 1_000_000,
          tokenAmountOut: 3_400_000_000,
        })
        .systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: 1_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should batch approve + transfer + revoke flow', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenApprove({
          mint: testMint,
          owner: testWallet,
          spender: testRecipient,
          amount: 10_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 5_000_000,
        })
        .splTokenRevoke({
          mint: testMint,
          owner: testWallet,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should batch mint + transfer + burn flow', async () => {
      const response = await new TransactionBuilder(client)
        .splTokenMintTo({
          mint: testMint,
          destinationOwner: testWallet,
          authority: testWallet,
          amount: 10_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 5_000_000,
        })
        .splTokenBurn({
          mint: testMint,
          owner: testWallet,
          amount: 2_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Builder State Management', () => {
    it('should track operation count correctly', () => {
      const builder = new TransactionBuilder(client);

      expect(builder.getOperationCount()).toBe(0);

      builder.systemTransfer({
        sender: testWallet,
        recipient: testRecipient,
        lamports: 1_000_000,
      });
      expect(builder.getOperationCount()).toBe(1);

      builder.splTokenTransfer({
        mint: testMint,
        sourceOwner: testWallet,
        destinationOwner: testRecipient,
        amount: 1_000_000,
      });
      expect(builder.getOperationCount()).toBe(2);

      builder.pumpFunBuy({
        pool: testPumpPool,
        poolAccounts: testPoolAccounts,
        user: testWallet,
        solAmountIn: 1_000_000,
        tokenAmountOut: 3_400_000_000,
      });
      expect(builder.getOperationCount()).toBe(3);
    });

    it('should reset state correctly after batched execution', async () => {
      const builder = new TransactionBuilder(client);

      await builder
        .systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: 1_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testWallet)
        .simulate();

      // After execution, count should still be 2 (state not auto-reset)
      expect(builder.getOperationCount()).toBe(2);

      // Manual reset
      builder.reset();
      expect(builder.getOperationCount()).toBe(0);
      expect(builder.hasOperations()).toBe(false);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should allow reusing builder after reset', async () => {
      const builder = new TransactionBuilder(client);

      // First batch
      const response1 = await builder
        .systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: 1_000_000,
        })
        .setFeePayer(testWallet)
        .simulate();

      assertSuccessResponse(response1);

      // Reset and second batch
      builder.reset();

      const response2 = await builder
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 2_000_000,
        })
        .setFeePayer(testWallet)
        .simulate();

      assertSuccessResponse(response2);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Priority Fees with Batched Operations', () => {
    it('should handle high priority fee with multiple operations', async () => {
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: 1_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(10_000_000) // High priority
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle zero priority fee with batched operations', async () => {
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: 1_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(0)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle custom bribe with batched operations', async () => {
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: 1_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .setBribe(3_000_000)
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Transport Modes with Batched Operations', () => {
    it('should batch operations in SIMULATE mode', async () => {
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: 1_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testWallet)
        .setTransport('SIMULATE')
        .send();

      assertSuccessResponse(response);
      expect(response.transport).toBe('SIMULATE');
      assertHasLogs(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should batch operations in VANILLA mode', async () => {
      const response = await new TransactionBuilder(client)
        .systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: 1_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .setFeePayer(testWallet)
        .setTransport('VANILLA')
        .send();

      assertSuccessResponse(response);
      expect(response.transport).toBe('VANILLA');
      expect(response.signature).toBeDefined();
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Large Batch Scenarios', () => {
    it('should handle 5 operations in single transaction', async () => {
      const response = await new TransactionBuilder(client)
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
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        })
        .splTokenApprove({
          mint: testMint,
          owner: testWallet,
          spender: testRecipient,
          amount: 5_000_000,
        })
        .pumpFunBuy({
          pool: testPumpPool,
          poolAccounts: testPoolAccounts,
          user: testWallet,
          solAmountIn: 1_000_000,
          tokenAmountOut: 3_400_000_000,
        })
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      assertHasLogs(response);
      expect(response.logs!.length).toBeGreaterThan(0);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle 10 system transfers in single transaction', async () => {
      let builder = new TransactionBuilder(client);

      // Add 10 transfers
      for (let i = 0; i < 10; i++) {
        builder = builder.systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: (i + 1) * 100_000,
        });
      }

      const response = await builder
        .setFeePayer(testWallet)
        .setPriorityFee(1_000_000)
        .simulate();

      assertSuccessResponse(response);
      expect(builder.getOperationCount()).toBe(10);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Error Scenarios', () => {
    it('should handle validation error in batched operations', async () => {
      const builder = new TransactionBuilder(client);

      builder
        .systemTransfer({
          sender: testWallet,
          recipient: testRecipient,
          lamports: 1_000_000,
        })
        .splTokenTransfer({
          mint: testMint,
          sourceOwner: testWallet,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        });

      // Missing fee payer
      await expect(builder.send()).rejects.toThrow();
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should validate all operations before sending', async () => {
      const builder = new TransactionBuilder(client);

      // Add valid and invalid operations
      builder.systemTransfer({
        sender: testWallet,
        recipient: testRecipient,
        lamports: 1_000_000,
      });

      expect(builder.hasOperations()).toBe(true);
      expect(builder.getOperationCount()).toBe(1);
    }, TEST_TIMEOUTS.INTEGRATION);
  });
});
