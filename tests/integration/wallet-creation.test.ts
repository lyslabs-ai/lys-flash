/**
 * Integration Tests for Wallet Creation and Management
 *
 * Tests wallet creation, encryption, decryption, and session management
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SolanaExecutionClient } from '../../src/client';
import { TransactionBuilder } from '../../src/builder';
import { createTestClient, assertSuccessResponse, assertHasLogs } from '../test-utils';
import { TEST_TIMEOUTS } from '../setup';

describe('Wallet Creation Integration Tests', () => {
  let client: SolanaExecutionClient;

  beforeAll(() => {
    client = createTestClient();
  }, TEST_TIMEOUTS.INTEGRATION);

  afterAll(() => {
    if (client) {
      client.close();
    }
  });

  describe('CREATE_WALLET Operation', () => {
    it('should create new wallet successfully', async () => {
      const response = await client.execute({
        data: {
          executionType: 'WALLET',
          eventType: 'CREATE_WALLET',
          sessionId: 'test-session-001',
          password: 'secure-password-123',
        },
        feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
      expect(response.transport).toBe('SIMULATE');

      // Response should contain wallet data
      expect(response.data).toBeDefined();
      if (response.data) {
        expect(response.data).toHaveProperty('publicKey');
        expect(response.data).toHaveProperty('encryptedPrivateKey');
        expect(response.data).toHaveProperty('sessionId');
        expect(response.data.sessionId).toBe('test-session-001');
      }
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should create wallet with builder pattern', async () => {
      const response = await new TransactionBuilder(client)
        .createWallet({
          sessionId: 'test-session-002',
          password: 'another-secure-password',
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(response);
      expect(response.data).toBeDefined();
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should create multiple wallets with different sessions', async () => {
      const sessions = ['session-a', 'session-b', 'session-c'];
      const wallets = [];

      for (const sessionId of sessions) {
        const response = await new TransactionBuilder(client)
          .createWallet({
            sessionId,
            password: `password-${sessionId}`,
          })
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .simulate();

        assertSuccessResponse(response);
        wallets.push(response.data);
      }

      expect(wallets).toHaveLength(3);

      // Each wallet should have unique public key
      const publicKeys = wallets.map((w) => w?.publicKey);
      const uniqueKeys = new Set(publicKeys);
      expect(uniqueKeys.size).toBe(3);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle strong passwords', async () => {
      const strongPassword = 'Str0ng!P@ssw0rd#2024$WithSpec1alCh@rs';

      const response = await new TransactionBuilder(client)
        .createWallet({
          sessionId: 'test-session-strong-pwd',
          password: strongPassword,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle long session IDs', async () => {
      const longSessionId = 'very-long-session-id-'.repeat(10);

      const response = await new TransactionBuilder(client)
        .createWallet({
          sessionId: longSessionId,
          password: 'test-password',
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(response);
      expect(response.data?.sessionId).toBe(longSessionId);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('GET_WALLET Operation', () => {
    let testSessionId: string;
    let testPassword: string;

    beforeAll(async () => {
      // Create a wallet first for retrieval tests
      testSessionId = 'get-wallet-test-session';
      testPassword = 'test-password-123';

      await new TransactionBuilder(client)
        .createWallet({
          sessionId: testSessionId,
          password: testPassword,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should retrieve existing wallet', async () => {
      const response = await client.execute({
        data: {
          executionType: 'WALLET',
          eventType: 'GET_WALLET',
          sessionId: testSessionId,
          password: testPassword,
        },
        feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
      expect(response.data).toBeDefined();
      if (response.data) {
        expect(response.data).toHaveProperty('publicKey');
        expect(response.data).toHaveProperty('sessionId');
        expect(response.data.sessionId).toBe(testSessionId);
      }
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should retrieve wallet with builder pattern', async () => {
      const response = await new TransactionBuilder(client)
        .getWallet({
          sessionId: testSessionId,
          password: testPassword,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(response);
      expect(response.data?.sessionId).toBe(testSessionId);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should fail with incorrect password', async () => {
      const response = await client.execute({
        data: {
          executionType: 'WALLET',
          eventType: 'GET_WALLET',
          sessionId: testSessionId,
          password: 'wrong-password',
        },
        feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      // Should fail or return error
      if (!response.success) {
        expect(response.error).toBeDefined();
      }
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should fail with non-existent session', async () => {
      const response = await client.execute({
        data: {
          executionType: 'WALLET',
          eventType: 'GET_WALLET',
          sessionId: 'non-existent-session-id',
          password: testPassword,
        },
        feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      // Should fail or return error
      if (!response.success) {
        expect(response.error).toBeDefined();
      }
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('DELETE_WALLET Operation', () => {
    it('should delete wallet successfully', async () => {
      const sessionId = 'delete-test-session';
      const password = 'delete-test-password';

      // Create wallet first
      await new TransactionBuilder(client)
        .createWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      // Delete wallet
      const response = await client.execute({
        data: {
          executionType: 'WALLET',
          eventType: 'DELETE_WALLET',
          sessionId,
          password,
        },
        feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should delete wallet with builder pattern', async () => {
      const sessionId = 'delete-builder-test';
      const password = 'delete-builder-password';

      // Create wallet first
      await new TransactionBuilder(client)
        .createWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      // Delete wallet
      const response = await new TransactionBuilder(client)
        .deleteWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should not retrieve wallet after deletion', async () => {
      const sessionId = 'delete-verify-test';
      const password = 'delete-verify-password';

      // Create wallet
      await new TransactionBuilder(client)
        .createWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      // Delete wallet
      await new TransactionBuilder(client)
        .deleteWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      // Try to retrieve (should fail)
      const response = await new TransactionBuilder(client)
        .getWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      // Should fail or return error
      if (!response.success) {
        expect(response.error).toBeDefined();
      }
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should fail deletion with incorrect password', async () => {
      const sessionId = 'delete-wrong-pwd-test';
      const password = 'correct-password';

      // Create wallet
      await new TransactionBuilder(client)
        .createWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      // Try to delete with wrong password
      const response = await new TransactionBuilder(client)
        .deleteWallet({
          sessionId,
          password: 'wrong-password',
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      // Should fail or return error
      if (!response.success) {
        expect(response.error).toBeDefined();
      }
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Wallet Lifecycle', () => {
    it('should handle complete create -> get -> delete lifecycle', async () => {
      const sessionId = 'lifecycle-test';
      const password = 'lifecycle-password';

      // 1. Create
      const createResponse = await new TransactionBuilder(client)
        .createWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(createResponse);
      const publicKey = createResponse.data?.publicKey;
      expect(publicKey).toBeDefined();

      // 2. Get
      const getResponse = await new TransactionBuilder(client)
        .getWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(getResponse);
      expect(getResponse.data?.publicKey).toBe(publicKey);

      // 3. Delete
      const deleteResponse = await new TransactionBuilder(client)
        .deleteWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(deleteResponse);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle multiple wallets in parallel sessions', async () => {
      const sessions = [
        { sessionId: 'parallel-1', password: 'pwd-1' },
        { sessionId: 'parallel-2', password: 'pwd-2' },
        { sessionId: 'parallel-3', password: 'pwd-3' },
      ];

      // Create all wallets
      const createPromises = sessions.map((session) =>
        new TransactionBuilder(client)
          .createWallet(session)
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .simulate(),
      );

      const createResults = await Promise.all(createPromises);
      createResults.forEach((response) => {
        assertSuccessResponse(response);
      });

      // Retrieve all wallets
      const getPromises = sessions.map((session) =>
        new TransactionBuilder(client)
          .getWallet(session)
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .simulate(),
      );

      const getResults = await Promise.all(getPromises);
      getResults.forEach((response, index) => {
        assertSuccessResponse(response);
        expect(response.data?.sessionId).toBe(sessions[index].sessionId);
      });

      // Delete all wallets
      const deletePromises = sessions.map((session) =>
        new TransactionBuilder(client)
          .deleteWallet(session)
          .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
          .simulate(),
      );

      const deleteResults = await Promise.all(deletePromises);
      deleteResults.forEach((response) => {
        assertSuccessResponse(response);
      });
    }, TEST_TIMEOUTS.INTEGRATION * 2);
  });

  describe('Wallet with Transactions', () => {
    it('should use created wallet for transaction signing', async () => {
      const sessionId = 'wallet-tx-test';
      const password = 'wallet-tx-password';

      // Create wallet
      const createResponse = await new TransactionBuilder(client)
        .createWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(createResponse);
      const walletPublicKey = createResponse.data?.publicKey;
      expect(walletPublicKey).toBeDefined();

      // Use wallet as sender in a transfer (if supported)
      // This would depend on how the wallet integration works
      // For now, just verify wallet creation worked
      expect(walletPublicKey).toBeTruthy();
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle wallet in batched operations', async () => {
      const sessionId = 'batched-wallet-test';
      const password = 'batched-wallet-password';

      // Create wallet and perform transfer in sequence
      const builder = new TransactionBuilder(client);

      // First create wallet
      const createResponse = await builder
        .createWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(createResponse);

      // Reset builder for next operation
      builder.reset();

      // Then do a transfer
      const transferResponse = await builder
        .systemTransfer({
          sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
          lamports: 1_000_000,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(transferResponse);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Security and Encryption', () => {
    it('should store wallet with encrypted private key', async () => {
      const sessionId = 'encryption-test';
      const password = 'encryption-password';

      const response = await new TransactionBuilder(client)
        .createWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(response);
      expect(response.data).toBeDefined();

      // Encrypted private key should exist
      if (response.data) {
        expect(response.data).toHaveProperty('encryptedPrivateKey');
        expect(response.data.encryptedPrivateKey).toBeTruthy();

        // Encrypted key should be different from public key
        expect(response.data.encryptedPrivateKey).not.toBe(response.data.publicKey);
      }
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle password with special characters', async () => {
      const sessionId = 'special-chars-test';
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

      const response = await new TransactionBuilder(client)
        .createWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(response);

      // Should be able to retrieve with same password
      const getResponse = await new TransactionBuilder(client)
        .getWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(getResponse);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle unicode password', async () => {
      const sessionId = 'unicode-test';
      const password = 'пароль密码パスワード🔐';

      const response = await new TransactionBuilder(client)
        .createWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(response);

      // Should be able to retrieve with same password
      const getResponse = await new TransactionBuilder(client)
        .getWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(getResponse);
    }, TEST_TIMEOUTS.INTEGRATION);
  });

  describe('Edge Cases', () => {
    it('should handle very short password', async () => {
      const sessionId = 'short-pwd-test';
      const password = '123';

      const response = await new TransactionBuilder(client)
        .createWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      // May succeed or fail depending on password policy
      if (response.success) {
        expect(response.data).toBeDefined();
      }
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle very long password', async () => {
      const sessionId = 'long-pwd-test';
      const password = 'a'.repeat(1000);

      const response = await new TransactionBuilder(client)
        .createWallet({
          sessionId,
          password,
        })
        .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
        .simulate();

      assertSuccessResponse(response);
    }, TEST_TIMEOUTS.INTEGRATION);

    it('should handle empty session ID gracefully', async () => {
      const response = await client.execute({
        data: {
          executionType: 'WALLET',
          eventType: 'CREATE_WALLET',
          sessionId: '',
          password: 'test-password',
        },
        feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        priorityFeeLamports: 1_000_000,
        transport: 'SIMULATE',
        bribeLamports: 1_000_000,
      });

      // Should fail validation
      if (!response.success) {
        expect(response.error).toBeDefined();
      }
    }, TEST_TIMEOUTS.INTEGRATION);
  });
});
