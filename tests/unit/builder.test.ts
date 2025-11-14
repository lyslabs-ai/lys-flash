/**
 * Unit Tests for TransactionBuilder
 *
 * Tests the TransactionBuilder class with all operations, configurations,
 * validation logic, and method chaining
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionBuilder } from '../../src/builder';
import { SolanaExecutionClient } from '../../src/client';
import { ExecutionError, ErrorCode } from '../../src/errors';

// Create mock client for testing
function createMockClient(): SolanaExecutionClient {
  return {
    execute: vi.fn().mockResolvedValue({
      success: true,
      signature: '5VBxKxAh...',
      transport: 'NONCE',
      error: null,
    }),
  } as any;
}

describe('TransactionBuilder', () => {
  let mockClient: SolanaExecutionClient;
  let builder: TransactionBuilder;

  beforeEach(() => {
    mockClient = createMockClient();
    builder = new TransactionBuilder(mockClient);
  });

  describe('Constructor', () => {
    it('should create a builder with client', () => {
      expect(builder).toBeInstanceOf(TransactionBuilder);
      expect(builder.getOperationCount()).toBe(0);
      expect(builder.hasOperations()).toBe(false);
    });

    it('should initialize with default values', () => {
      // Default values can be inferred from validation errors
      expect(builder.hasOperations()).toBe(false);
    });
  });

  // ============================================================================
  // Pump.fun Operations
  // ============================================================================

  describe('Pump.fun Operations', () => {
    describe('pumpFunBuy()', () => {
      it('should add BUY operation', () => {
        builder.pumpFunBuy({
          pool: 'mint_address',
          poolAccounts: { coinCreator: 'creator' },
          user: 'wallet',
          solAmountIn: 1_000_000,
          tokenAmountOut: 3_400_000_000,
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.pumpFunBuy({
          pool: 'mint',
          poolAccounts: { coinCreator: 'creator' },
          user: 'wallet',
          solAmountIn: 1_000_000,
          tokenAmountOut: 3_400_000_000,
        });

        expect(result).toBe(builder);
      });

      it('should allow multiple BUY operations', () => {
        builder
          .pumpFunBuy({
            pool: 'mint1',
            poolAccounts: { coinCreator: 'creator1' },
            user: 'wallet',
            solAmountIn: 1_000_000,
            tokenAmountOut: 1_000_000_000,
          })
          .pumpFunBuy({
            pool: 'mint2',
            poolAccounts: { coinCreator: 'creator2' },
            user: 'wallet',
            solAmountIn: 2_000_000,
            tokenAmountOut: 2_000_000_000,
          });

        expect(builder.getOperationCount()).toBe(2);
      });
    });

    describe('pumpFunSell()', () => {
      it('should add SELL operation', () => {
        builder.pumpFunSell({
          pool: 'mint_address',
          poolAccounts: { coinCreator: 'creator' },
          user: 'wallet',
          tokenAmountIn: 1_000_000_000,
          minSolAmountOut: 500_000,
          closeAssociatedTokenAccount: true,
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.pumpFunSell({
          pool: 'mint',
          poolAccounts: { coinCreator: 'creator' },
          user: 'wallet',
          tokenAmountIn: 1_000_000_000,
          minSolAmountOut: 0,
        });

        expect(result).toBe(builder);
      });

      it('should accept closeAssociatedTokenAccount flag', () => {
        builder.pumpFunSell({
          pool: 'mint',
          poolAccounts: { coinCreator: 'creator' },
          user: 'wallet',
          tokenAmountIn: 1_000_000_000,
          minSolAmountOut: 0,
          closeAssociatedTokenAccount: true,
        });

        expect(builder.hasOperations()).toBe(true);
      });
    });

    describe('pumpFunCreate()', () => {
      it('should add CREATE operation', () => {
        builder.pumpFunCreate({
          user: 'creator_wallet',
          pool: 'mint_public_key',
          mintSecretKey: 'base64_encoded_secret',
          meta: {
            name: 'My Token',
            symbol: 'MTK',
            uri: 'https://arweave.net/metadata.json',
          },
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.pumpFunCreate({
          user: 'wallet',
          pool: 'mint',
          mintSecretKey: 'secret',
          meta: { name: 'Token', symbol: 'TKN', uri: 'uri' },
        });

        expect(result).toBe(builder);
      });
    });

    describe('pumpFunMigrate()', () => {
      it('should add MIGRATE operation', () => {
        builder.pumpFunMigrate({
          pool: 'mint_address',
          user: 'user_wallet',
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.pumpFunMigrate({
          pool: 'mint',
          user: 'wallet',
        });

        expect(result).toBe(builder);
      });
    });
  });

  // ============================================================================
  // Pump.fun AMM Operations
  // ============================================================================

  describe('Pump.fun AMM Operations', () => {
    describe('pumpFunAmmBuy()', () => {
      it('should add AMM BUY operation', () => {
        builder.pumpFunAmmBuy({
          pool: 'amm_pool',
          poolAccounts: {
            baseMint: 'base_mint',
            quoteMint: 'quote_mint',
            coinCreator: 'creator',
            poolCreator: 'pool_creator',
          },
          user: 'wallet',
          solAmountIn: 10_000_000,
          tokenAmountOut: 1_000_000,
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.pumpFunAmmBuy({
          pool: 'pool',
          poolAccounts: {
            baseMint: 'base',
            quoteMint: 'quote',
            coinCreator: 'creator',
            poolCreator: 'pool_creator',
          },
          user: 'wallet',
          solAmountIn: 10_000_000,
          tokenAmountOut: 1_000_000,
        });

        expect(result).toBe(builder);
      });
    });

    describe('pumpFunAmmSell()', () => {
      it('should add AMM SELL operation', () => {
        builder.pumpFunAmmSell({
          pool: 'amm_pool',
          poolAccounts: {
            baseMint: 'base_mint',
            quoteMint: 'quote_mint',
            coinCreator: 'creator',
            poolCreator: 'pool_creator',
          },
          user: 'wallet',
          tokenAmountIn: 1_000_000,
          minSolAmountOut: 0,
          closeAssociatedTokenAccount: false,
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.pumpFunAmmSell({
          pool: 'pool',
          poolAccounts: {
            baseMint: 'base',
            quoteMint: 'quote',
            coinCreator: 'creator',
            poolCreator: 'pool_creator',
          },
          user: 'wallet',
          tokenAmountIn: 1_000_000,
          minSolAmountOut: 0,
        });

        expect(result).toBe(builder);
      });
    });
  });

  // ============================================================================
  // System Transfer Operations
  // ============================================================================

  describe('System Transfer Operations', () => {
    describe('systemTransfer()', () => {
      it('should add TRANSFER operation', () => {
        builder.systemTransfer({
          sender: 'sender_wallet',
          recipient: 'recipient_wallet',
          lamports: 1_000_000_000,
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.systemTransfer({
          sender: 'sender',
          recipient: 'recipient',
          lamports: 1_000_000,
        });

        expect(result).toBe(builder);
      });
    });
  });

  // ============================================================================
  // SPL Token Operations
  // ============================================================================

  describe('SPL Token Operations', () => {
    describe('splTokenTransfer()', () => {
      it('should add TRANSFER operation', () => {
        builder.splTokenTransfer({
          mint: 'token_mint',
          sourceOwner: 'source',
          destinationOwner: 'destination',
          amount: 1_000_000,
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.splTokenTransfer({
          mint: 'mint',
          sourceOwner: 'source',
          destinationOwner: 'dest',
          amount: 1_000_000,
        });

        expect(result).toBe(builder);
      });
    });

    describe('splTokenTransferChecked()', () => {
      it('should add TRANSFER_CHECKED operation', () => {
        builder.splTokenTransferChecked({
          mint: 'token_mint',
          sourceOwner: 'source',
          destinationOwner: 'destination',
          amount: 1_000_000,
          decimals: 6,
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.splTokenTransferChecked({
          mint: 'mint',
          sourceOwner: 'source',
          destinationOwner: 'dest',
          amount: 1_000_000,
          decimals: 6,
        });

        expect(result).toBe(builder);
      });
    });

    describe('splTokenCreateATA()', () => {
      it('should add CREATE_ATA operation', () => {
        builder.splTokenCreateATA({
          payer: 'payer_wallet',
          owner: 'owner_wallet',
          mint: 'token_mint',
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.splTokenCreateATA({
          payer: 'payer',
          owner: 'owner',
          mint: 'mint',
        });

        expect(result).toBe(builder);
      });
    });

    describe('splTokenCloseAccount()', () => {
      it('should add CLOSE_ACCOUNT operation', () => {
        builder.splTokenCloseAccount({
          mint: 'token_mint',
          owner: 'owner_wallet',
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.splTokenCloseAccount({
          mint: 'mint',
          owner: 'owner',
        });

        expect(result).toBe(builder);
      });
    });

    describe('splTokenApprove()', () => {
      it('should add APPROVE operation', () => {
        builder.splTokenApprove({
          owner: 'owner',
          spender: 'spender',
          amount: 5_000_000,
          mint: 'mint',
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.splTokenApprove({
          owner: 'owner',
          spender: 'spender',
          amount: 5_000_000,
          mint: 'mint',
        });

        expect(result).toBe(builder);
      });
    });

    describe('splTokenRevoke()', () => {
      it('should add REVOKE operation', () => {
        builder.splTokenRevoke({
          mint: 'mint',
          owner: 'owner',
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.splTokenRevoke({
          mint: 'mint',
          owner: 'owner',
        });

        expect(result).toBe(builder);
      });
    });

    describe('splTokenMintTo()', () => {
      it('should add MINT_TO operation', () => {
        builder.splTokenMintTo({
          mint: 'mint',
          destinationOwner: 'destination',
          authority: 'authority',
          amount: 10_000_000,
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.splTokenMintTo({
          mint: 'mint',
          destinationOwner: 'dest',
          authority: 'auth',
          amount: 10_000_000,
        });

        expect(result).toBe(builder);
      });
    });

    describe('splTokenBurn()', () => {
      it('should add BURN operation', () => {
        builder.splTokenBurn({
          mint: 'mint',
          owner: 'owner',
          amount: 2_000_000,
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.splTokenBurn({
          mint: 'mint',
          owner: 'owner',
          amount: 2_000_000,
        });

        expect(result).toBe(builder);
      });
    });

    describe('splTokenSyncNative()', () => {
      it('should add SYNC_NATIVE operation', () => {
        builder.splTokenSyncNative({
          owner: 'owner',
        });

        expect(builder.hasOperations()).toBe(true);
        expect(builder.getOperationCount()).toBe(1);
      });

      it('should return this for method chaining', () => {
        const result = builder.splTokenSyncNative({
          owner: 'owner',
        });

        expect(result).toBe(builder);
      });
    });
  });

  // ============================================================================
  // Configuration Methods
  // ============================================================================

  describe('Configuration Methods', () => {
    describe('setFeePayer()', () => {
      it('should set fee payer', async () => {
        await builder
          .pumpFunBuy({
            pool: 'mint',
            poolAccounts: { coinCreator: 'creator' },
            user: 'wallet',
            solAmountIn: 1_000_000,
            tokenAmountOut: 1_000_000_000,
          })
          .setFeePayer('wallet_address')
          .send();

        expect(mockClient.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            feePayer: 'wallet_address',
          })
        );
      });

      it('should return this for method chaining', () => {
        const result = builder.setFeePayer('wallet');
        expect(result).toBe(builder);
      });
    });

    describe('setPriorityFee()', () => {
      it('should set priority fee', async () => {
        await builder
          .pumpFunBuy({
            pool: 'mint',
            poolAccounts: { coinCreator: 'creator' },
            user: 'wallet',
            solAmountIn: 1_000_000,
            tokenAmountOut: 1_000_000_000,
          })
          .setFeePayer('wallet')
          .setPriorityFee(5_000_000)
          .send();

        expect(mockClient.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            priorityFeeLamports: 5_000_000,
          })
        );
      });

      it('should return this for method chaining', () => {
        const result = builder.setPriorityFee(5_000_000);
        expect(result).toBe(builder);
      });

      it('should accept zero priority fee', async () => {
        await builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .setFeePayer('wallet')
          .setPriorityFee(0)
          .send();

        expect(mockClient.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            priorityFeeLamports: 0,
          })
        );
      });
    });

    describe('setTransport()', () => {
      it('should set transport mode', async () => {
        await builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .setFeePayer('wallet')
          .setTransport('ZERO_SLOT')
          .send();

        expect(mockClient.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            transport: 'ZERO_SLOT',
          })
        );
      });

      it('should return this for method chaining', () => {
        const result = builder.setTransport('VANILLA');
        expect(result).toBe(builder);
      });

      it('should accept all transport modes', async () => {
        const transports: Array<any> = [
          'SIMULATE',
          'VANILLA',
          'NOZOMI',
          'ZERO_SLOT',
          'HELIUS_SENDER',
          'JITO',
          'NONCE',
        ];

        for (const transport of transports) {
          const b = new TransactionBuilder(mockClient);
          await b
            .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
            .setFeePayer('wallet')
            .setTransport(transport)
            .send();

          expect(mockClient.execute).toHaveBeenCalledWith(
            expect.objectContaining({
              transport,
            })
          );
        }
      });
    });

    describe('setBribe()', () => {
      it('should set bribe amount', async () => {
        await builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .setFeePayer('wallet')
          .setBribe(2_000_000)
          .send();

        expect(mockClient.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            bribeLamports: 2_000_000,
          })
        );
      });

      it('should return this for method chaining', () => {
        const result = builder.setBribe(2_000_000);
        expect(result).toBe(builder);
      });
    });
  });

  // ============================================================================
  // Batching & Chaining
  // ============================================================================

  describe('Batching & Chaining', () => {
    it('should support multiple operations in sequence', () => {
      builder
        .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
        .splTokenTransfer({
          mint: 'mint',
          sourceOwner: 'a',
          destinationOwner: 'b',
          amount: 1000,
        })
        .pumpFunBuy({
          pool: 'mint',
          poolAccounts: { coinCreator: 'creator' },
          user: 'a',
          solAmountIn: 1_000_000,
          tokenAmountOut: 1_000_000_000,
        });

      expect(builder.getOperationCount()).toBe(3);
    });

    it('should support mixed operation types', () => {
      builder
        .pumpFunBuy({
          pool: 'mint1',
          poolAccounts: { coinCreator: 'creator1' },
          user: 'wallet',
          solAmountIn: 1_000_000,
          tokenAmountOut: 1_000_000_000,
        })
        .pumpFunSell({
          pool: 'mint2',
          poolAccounts: { coinCreator: 'creator2' },
          user: 'wallet',
          tokenAmountIn: 1_000_000_000,
          minSolAmountOut: 0,
        });

      expect(builder.getOperationCount()).toBe(2);
    });

    it('should maintain state across method chains', () => {
      builder
        .setFeePayer('wallet1')
        .setPriorityFee(5_000_000)
        .setTransport('NOZOMI')
        .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
        .setPriorityFee(10_000_000); // Override

      expect(builder.hasOperations()).toBe(true);
    });

    it('should send single operation as single element', async () => {
      await builder
        .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
        .setFeePayer('wallet')
        .send();

      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            executionType: 'SYSTEM_TRANSFER',
            eventType: 'TRANSFER',
          }),
        })
      );
    });

    it('should send multiple operations as array', async () => {
      await builder
        .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
        .systemTransfer({ sender: 'c', recipient: 'd', lamports: 2000 })
        .setFeePayer('wallet')
        .send();

      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ executionType: 'SYSTEM_TRANSFER' }),
            expect.objectContaining({ executionType: 'SYSTEM_TRANSFER' }),
          ]),
        })
      );
    });
  });

  // ============================================================================
  // Execution Methods
  // ============================================================================

  describe('Execution Methods', () => {
    describe('send()', () => {
      it('should call client.execute()', async () => {
        await builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .setFeePayer('wallet')
          .send();

        expect(mockClient.execute).toHaveBeenCalledTimes(1);
      });

      it('should return transaction response', async () => {
        const response = await builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .setFeePayer('wallet')
          .send();

        expect(response).toEqual({
          success: true,
          signature: expect.any(String),
          transport: 'NONCE',
          error: null,
        });
      });

    });

    describe('simulate()', () => {
      it('should call send() with SIMULATE transport', async () => {
        await builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .setFeePayer('wallet')
          .setTransport('VANILLA')
          .simulate();

        expect(mockClient.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            transport: 'SIMULATE',
          })
        );
      });

      it('should restore original transport after simulation', async () => {
        await builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .setFeePayer('wallet')
          .setTransport('NOZOMI')
          .simulate();

        // Second send should use original transport
        await builder.send();

        expect(mockClient.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            transport: 'NOZOMI',
          })
        );
      });

      it('should return simulation response', async () => {
        const response = await builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .setFeePayer('wallet')
          .simulate();

        expect(response).toBeDefined();
      });
    });
  });

  // ============================================================================
  // Validation
  // ============================================================================

  describe('Validation', () => {
    it('should reject when no operations added', async () => {
      await expect(builder.setFeePayer('wallet').send()).rejects.toThrow(ExecutionError);

      try {
        await builder.setFeePayer('wallet').send();
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).code).toBe(ErrorCode.INVALID_REQUEST);
      }
    });

    it('should reject when fee payer not set', async () => {
      await expect(
        builder.systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 }).send()
      ).rejects.toThrow(ExecutionError);

      try {
        await builder.systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 }).send();
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).code).toBe(ErrorCode.INVALID_REQUEST);
      }
    });

    it('should reject negative priority fee', async () => {
      await expect(
        builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .setFeePayer('wallet')
          .setPriorityFee(-1000)
          .send()
      ).rejects.toThrow(ExecutionError);

      try {
        await builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .setFeePayer('wallet')
          .setPriorityFee(-1000)
          .send();
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).code).toBe(ErrorCode.INVALID_REQUEST);
        expect((error as ExecutionError).message).toContain('Priority fee');
      }
    });

    it('should reject negative bribe amount', async () => {
      await expect(
        builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .setFeePayer('wallet')
          .setBribe(-1000)
          .send()
      ).rejects.toThrow(ExecutionError);

      try {
        await builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .setFeePayer('wallet')
          .setBribe(-1000)
          .send();
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionError);
        expect((error as ExecutionError).code).toBe(ErrorCode.INVALID_REQUEST);
        expect((error as ExecutionError).message).toContain('Bribe');
      }
    });
  });

  // ============================================================================
  // State Management
  // ============================================================================

  describe('State Management', () => {
    describe('reset()', () => {
      it('should clear all operations', () => {
        builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .systemTransfer({ sender: 'c', recipient: 'd', lamports: 2000 })
          .reset();

        expect(builder.getOperationCount()).toBe(0);
        expect(builder.hasOperations()).toBe(false);
      });

      it('should reset all configuration', async () => {
        builder
          .setFeePayer('wallet1')
          .setPriorityFee(5_000_000)
          .setTransport('VANILLA')
          .setBribe(2_000_000)
          .reset();

        builder.systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 }).setFeePayer('wallet2');

        await builder.send();

        // Should use default values after reset
        expect(mockClient.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            priorityFeeLamports: 1_000_000, // Default
            transport: 'NONCE', // Default
            bribeLamports: undefined,
          })
        );
      });

      it('should return this for method chaining', () => {
        const result = builder.reset();
        expect(result).toBe(builder);
      });
    });

    describe('getOperationCount()', () => {
      it('should return 0 initially', () => {
        expect(builder.getOperationCount()).toBe(0);
      });

      it('should return correct count after adding operations', () => {
        builder.systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 });
        expect(builder.getOperationCount()).toBe(1);

        builder.systemTransfer({ sender: 'c', recipient: 'd', lamports: 2000 });
        expect(builder.getOperationCount()).toBe(2);
      });

      it('should return 0 after reset', () => {
        builder
          .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
          .systemTransfer({ sender: 'c', recipient: 'd', lamports: 2000 })
          .reset();

        expect(builder.getOperationCount()).toBe(0);
      });
    });

    describe('hasOperations()', () => {
      it('should return false initially', () => {
        expect(builder.hasOperations()).toBe(false);
      });

      it('should return true after adding operation', () => {
        builder.systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 });
        expect(builder.hasOperations()).toBe(true);
      });

      it('should return false after reset', () => {
        builder.systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 }).reset();

        expect(builder.hasOperations()).toBe(false);
      });
    });
  });

  // ============================================================================
  // Complex Scenarios
  // ============================================================================

  describe('Complex Scenarios', () => {
    it('should support create + buy flow', async () => {
      await builder
        .pumpFunCreate({
          user: 'creator',
          pool: 'mint',
          mintSecretKey: 'secret',
          meta: { name: 'Token', symbol: 'TKN', uri: 'uri' },
        })
        .pumpFunBuy({
          pool: 'mint',
          poolAccounts: { coinCreator: 'creator' },
          user: 'buyer',
          solAmountIn: 10_000_000,
          tokenAmountOut: 10_000_000_000,
        })
        .setFeePayer('creator')
        .send();

      expect(mockClient.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ eventType: 'CREATE' }),
            expect.objectContaining({ eventType: 'BUY' }),
          ]),
        })
      );
    });

    it('should support buy + sell flow', async () => {
      await builder
        .pumpFunBuy({
          pool: 'mint',
          poolAccounts: { coinCreator: 'creator' },
          user: 'trader',
          solAmountIn: 1_000_000,
          tokenAmountOut: 1_000_000_000,
        })
        .pumpFunSell({
          pool: 'mint',
          poolAccounts: { coinCreator: 'creator' },
          user: 'trader',
          tokenAmountIn: 1_000_000_000,
          minSolAmountOut: 0,
        })
        .setFeePayer('trader')
        .send();

      expect(builder.getOperationCount()).toBe(2);
    });

    it('should support reusing builder after send', async () => {
      await builder
        .systemTransfer({ sender: 'a', recipient: 'b', lamports: 1000 })
        .setFeePayer('wallet')
        .send();

      expect(mockClient.execute).toHaveBeenCalledTimes(1);

      // Reset and reuse
      await builder
        .reset()
        .systemTransfer({ sender: 'c', recipient: 'd', lamports: 2000 })
        .setFeePayer('wallet')
        .send();

      expect(mockClient.execute).toHaveBeenCalledTimes(2);
    });
  });
});
