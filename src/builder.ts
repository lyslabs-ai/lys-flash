import { SolanaExecutionClient } from './client';
import {
  TransportMode,
  OperationData,
  PumpFunBuyParams,
  PumpFunSellParams,
  PumpFunCreateParams,
  PumpFunMigrateParams,
  PumpFunAmmBuyParams,
  PumpFunAmmSellParams,
  SystemTransferParams,
  SplTokenTransferParams,
  SplTokenTransferCheckedParams,
  SplTokenCreateATAParams,
  SplTokenCloseAccountParams,
  SplTokenApproveParams,
  SplTokenRevokeParams,
  SplTokenMintToParams,
  SplTokenBurnParams,
  SplTokenSyncNativeParams,
  TransactionResponse,
  SimulationResponse,
} from './types';
import { ExecutionError, ErrorCode } from './errors';

/**
 * Builder for constructing and executing transactions with a fluent API
 *
 * Provides convenient methods for all supported operations with method chaining.
 * Supports batching multiple operations into a single transaction.
 *
 * @example Simple buy
 * ```typescript
 * const result = await new TransactionBuilder(client)
 *   .pumpFunBuy({
 *     pool: "mint_address",
 *     poolAccounts: { coinCreator: "creator" },
 *     user: "wallet",
 *     solAmountIn: 1_000_000,
 *     tokenAmountOut: 3_400_000_000
 *   })
 *   .setFeePayer("wallet")
 *   .setPriorityFee(1_000_000)
 *   .setBribe(1_000_000)             // 0.001 SOL bribe (mandatory for NONCE)
 *   .setTransport("NONCE")
 *   .send();
 * ```
 *
 * @example Batched operations
 * ```typescript
 * const result = await new TransactionBuilder(client)
 *   .systemTransfer({ sender: "wallet1", recipient: "wallet2", lamports: 10_000_000 })
 *   .splTokenTransfer({ mint: "token", sourceOwner: "wallet1", destinationOwner: "wallet2", amount: 1_000_000 })
 *   .pumpFunBuy({ pool: "mint", poolAccounts: { coinCreator: "creator" }, user: "wallet1", solAmountIn: 5_000_000, tokenAmountOut: 10_000_000_000 })
 *   .setFeePayer("wallet1")
 *   .setTransport("VANILLA")
 *   .send();
 * ```
 */
export class TransactionBuilder {
  private client: SolanaExecutionClient;
  private operations: OperationData[] = [];
  private feePayer?: string;
  private priorityFeeLamports: number = 1_000_000; // Default: 0.001 SOL
  private transport: TransportMode = 'NONCE'; // Default: fastest
  private bribeLamports?: number;

  /**
   * Create a new TransactionBuilder
   *
   * @param client - SolanaExecutionClient instance
   */
  constructor(client: SolanaExecutionClient) {
    this.client = client;
  }

  // ============================================================================
  // Pump.fun Operations
  // ============================================================================

  /**
   * Add Pump.fun BUY operation
   *
   * @param params - Buy parameters (without executionType and eventType)
   * @returns this (for method chaining)
   *
   * @example
   * ```typescript
   * builder.pumpFunBuy({
   *   pool: "mint_address",
   *   poolAccounts: { coinCreator: "creator_address" },
   *   user: "buyer_wallet",
   *   solAmountIn: 1_000_000,        // 0.001 SOL
   *   tokenAmountOut: 3_400_000_000  // Min 3.4B tokens
   * })
   * ```
   */
  pumpFunBuy(params: Omit<PumpFunBuyParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'PUMP_FUN',
      eventType: 'BUY',
      ...params,
    } as PumpFunBuyParams);
    return this;
  }

  /**
   * Add Pump.fun SELL operation
   *
   * @param params - Sell parameters
   * @returns this (for method chaining)
   *
   * @example
   * ```typescript
   * builder.pumpFunSell({
   *   pool: "mint_address",
   *   poolAccounts: { coinCreator: "creator_address" },
   *   user: "seller_wallet",
   *   tokenAmountIn: 1_000_000_000,    // 1B tokens
   *   minSolAmountOut: 500_000,        // Min 0.0005 SOL
   *   closeAssociatedTokenAccount: true // Close ATA to reclaim rent
   * })
   * ```
   */
  pumpFunSell(params: Omit<PumpFunSellParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'PUMP_FUN',
      eventType: 'SELL',
      ...params,
    } as PumpFunSellParams);
    return this;
  }

  /**
   * Add Pump.fun CREATE operation
   *
   * @param params - Create parameters
   * @returns this (for method chaining)
   *
   * @example
   * ```typescript
   * import { Keypair } from '@solana/web3.js';
   *
   * const mintKeypair = Keypair.generate();
   *
   * builder.pumpFunCreate({
   *   user: "creator_wallet",
   *   pool: mintKeypair.publicKey.toBase58(),
   *   mintSecretKey: Buffer.from(mintKeypair.secretKey).toString('base64'),
   *   meta: {
   *     name: "My Token",
   *     symbol: "MTK",
   *     uri: "https://arweave.net/metadata.json"
   *   }
   * })
   * ```
   */
  pumpFunCreate(params: Omit<PumpFunCreateParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'PUMP_FUN',
      eventType: 'CREATE',
      ...params,
    } as PumpFunCreateParams);
    return this;
  }

  /**
   * Add Pump.fun MIGRATE operation
   *
   * @param params - Migrate parameters
   * @returns this (for method chaining)
   *
   * @example
   * ```typescript
   * builder.pumpFunMigrate({
   *   pool: "mint_address",
   *   user: "user_wallet"
   * })
   * ```
   */
  pumpFunMigrate(params: Omit<PumpFunMigrateParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'PUMP_FUN',
      eventType: 'MIGRATE',
      ...params,
    } as PumpFunMigrateParams);
    return this;
  }

  // ============================================================================
  // Pump.fun AMM Operations
  // ============================================================================

  /**
   * Add Pump.fun AMM BUY operation
   *
   * @param params - AMM buy parameters
   * @returns this (for method chaining)
   */
  pumpFunAmmBuy(params: Omit<PumpFunAmmBuyParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'PUMP_FUN_AMM',
      eventType: 'BUY',
      ...params,
    } as PumpFunAmmBuyParams);
    return this;
  }

  /**
   * Add Pump.fun AMM SELL operation
   *
   * @param params - AMM sell parameters
   * @returns this (for method chaining)
   */
  pumpFunAmmSell(params: Omit<PumpFunAmmSellParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'PUMP_FUN_AMM',
      eventType: 'SELL',
      ...params,
    } as PumpFunAmmSellParams);
    return this;
  }

  // ============================================================================
  // System Transfer Operations
  // ============================================================================

  /**
   * Add System TRANSFER operation
   *
   * @param params - Transfer parameters
   * @returns this (for method chaining)
   *
   * @example
   * ```typescript
   * builder.systemTransfer({
   *   sender: "sender_wallet",
   *   recipient: "recipient_wallet",
   *   lamports: 1_000_000_000  // 1 SOL
   * })
   * ```
   */
  systemTransfer(params: Omit<SystemTransferParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'SYSTEM_TRANSFER',
      eventType: 'TRANSFER',
      ...params,
    } as SystemTransferParams);
    return this;
  }

  // ============================================================================
  // SPL Token Operations
  // ============================================================================

  /**
   * Add SPL Token TRANSFER operation
   *
   * @param params - Transfer parameters
   * @returns this (for method chaining)
   *
   * @example
   * ```typescript
   * builder.splTokenTransfer({
   *   mint: "token_mint_address",
   *   sourceOwner: "source_wallet",
   *   destinationOwner: "destination_wallet",
   *   amount: 1_000_000  // 1 token (6 decimals)
   * })
   * ```
   */
  splTokenTransfer(params: Omit<SplTokenTransferParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'SPL_TOKEN',
      eventType: 'TRANSFER',
      ...params,
    } as SplTokenTransferParams);
    return this;
  }

  /**
   * Add SPL Token TRANSFER_CHECKED operation
   *
   * @param params - Transfer checked parameters
   * @returns this (for method chaining)
   */
  splTokenTransferChecked(
    params: Omit<SplTokenTransferCheckedParams, 'executionType' | 'eventType'>
  ): this {
    this.operations.push({
      executionType: 'SPL_TOKEN',
      eventType: 'TRANSFER_CHECKED',
      ...params,
    } as SplTokenTransferCheckedParams);
    return this;
  }

  /**
   * Add SPL Token CREATE_ATA operation
   *
   * @param params - Create ATA parameters
   * @returns this (for method chaining)
   *
   * @example
   * ```typescript
   * builder.splTokenCreateATA({
   *   payer: "payer_wallet",
   *   owner: "owner_wallet",
   *   mint: "token_mint_address"
   * })
   * ```
   */
  splTokenCreateATA(params: Omit<SplTokenCreateATAParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'SPL_TOKEN',
      eventType: 'CREATE_ATA',
      ...params,
    } as SplTokenCreateATAParams);
    return this;
  }

  /**
   * Add SPL Token CLOSE_ACCOUNT operation
   *
   * @param params - Close account parameters
   * @returns this (for method chaining)
   *
   * @example
   * ```typescript
   * builder.splTokenCloseAccount({
   *   mint: "token_mint_address",
   *   owner: "owner_wallet"
   * })
   * ```
   */
  splTokenCloseAccount(
    params: Omit<SplTokenCloseAccountParams, 'executionType' | 'eventType'>
  ): this {
    this.operations.push({
      executionType: 'SPL_TOKEN',
      eventType: 'CLOSE_ACCOUNT',
      ...params,
    } as SplTokenCloseAccountParams);
    return this;
  }

  /**
   * Add SPL Token APPROVE operation
   *
   * @param params - Approve parameters
   * @returns this (for method chaining)
   */
  splTokenApprove(params: Omit<SplTokenApproveParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'SPL_TOKEN',
      eventType: 'APPROVE',
      ...params,
    } as SplTokenApproveParams);
    return this;
  }

  /**
   * Add SPL Token REVOKE operation
   *
   * @param params - Revoke parameters
   * @returns this (for method chaining)
   */
  splTokenRevoke(params: Omit<SplTokenRevokeParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'SPL_TOKEN',
      eventType: 'REVOKE',
      ...params,
    } as SplTokenRevokeParams);
    return this;
  }

  /**
   * Add SPL Token MINT_TO operation
   *
   * @param params - Mint to parameters
   * @returns this (for method chaining)
   */
  splTokenMintTo(params: Omit<SplTokenMintToParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'SPL_TOKEN',
      eventType: 'MINT_TO',
      ...params,
    } as SplTokenMintToParams);
    return this;
  }

  /**
   * Add SPL Token BURN operation
   *
   * @param params - Burn parameters
   * @returns this (for method chaining)
   */
  splTokenBurn(params: Omit<SplTokenBurnParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'SPL_TOKEN',
      eventType: 'BURN',
      ...params,
    } as SplTokenBurnParams);
    return this;
  }

  /**
   * Add SPL Token SYNC_NATIVE operation
   *
   * @param params - Sync native parameters
   * @returns this (for method chaining)
   */
  splTokenSyncNative(params: Omit<SplTokenSyncNativeParams, 'executionType' | 'eventType'>): this {
    this.operations.push({
      executionType: 'SPL_TOKEN',
      eventType: 'SYNC_NATIVE',
      ...params,
    } as SplTokenSyncNativeParams);
    return this;
  }

  // ============================================================================
  // Configuration Methods
  // ============================================================================

  /**
   * Set the fee payer for the transaction
   *
   * @param address - Fee payer wallet address (base58 encoded)
   * @returns this (for method chaining)
   *
   * @example
   * ```typescript
   * builder.setFeePayer("your_wallet_address")
   * ```
   */
  setFeePayer(address: string): this {
    this.feePayer = address;
    return this;
  }

  /**
   * Set the priority fee
   *
   * @param lamports - Priority fee in microLamports
   * @returns this (for method chaining)
   *
   * @example
   * ```typescript
   * builder.setPriorityFee(1_000_000)  // 0.001 SOL
   * builder.setPriorityFee(5_000_000)  // 0.005 SOL (high priority)
   * builder.setPriorityFee(10_000_000) // 0.01 SOL (critical)
   * ```
   */
  setPriorityFee(lamports: number): this {
    this.priorityFeeLamports = lamports;
    return this;
  }

  /**
   * Set the transport mode
   *
   * @param mode - Transport mode
   * @returns this (for method chaining)
   *
   * @example
   * ```typescript
   * builder.setTransport("NONCE")       // Fastest (multi-broadcast)
   * builder.setTransport("ZERO_SLOT")   // Ultra-fast single RPC
   * builder.setTransport("NOZOMI")      // Low-latency
   * builder.setTransport("VANILLA")     // Standard RPC
   * builder.setTransport("SIMULATE")    // Test without broadcasting
   * ```
   */
  setTransport(mode: TransportMode): this {
    this.transport = mode;
    return this;
  }

  /**
   * Set the Jito bribe amount
   *
   * @param lamports - Bribe amount in lamports
   * @returns this (for method chaining)
   *
   * @example
   * ```typescript
   * builder.setBribe(1_000_000)  // 0.001 SOL Jito tip
   * ```
   */
  setBribe(lamports: number): this {
    this.bribeLamports = lamports;
    return this;
  }

  // ============================================================================
  // Execution Methods
  // ============================================================================

  /**
   * Send the transaction
   *
   * @returns Transaction response
   * @throws ExecutionError if validation fails or execution error occurs
   *
   * @example
   * ```typescript
   * const result = await builder
   *   .pumpFunBuy({ ... })
   *   .setFeePayer("wallet")
   *   .send();
   *
   * if (result.success) {
   *   console.log("Signature:", result.signature);
   * } else {
   *   console.error("Error:", result.error);
   * }
   * ```
   */
  async send(): Promise<TransactionResponse> {
    this.validate();

    return this.client.execute({
      data: this.operations.length === 1 ? this.operations[0]! : this.operations,
      feePayer: this.feePayer!,
      priorityFeeLamports: this.priorityFeeLamports,
      transport: this.transport,
      bribeLamports: this.bribeLamports,
    });
  }

  /**
   * Simulate the transaction without broadcasting
   *
   * @returns Simulation response with logs
   * @throws ExecutionError if validation fails or simulation error occurs
   *
   * @example
   * ```typescript
   * const simulation = await builder
   *   .pumpFunBuy({ ... })
   *   .setFeePayer("wallet")
   *   .simulate();
   *
   * if (simulation.success) {
   *   console.log("Simulation passed!");
   *   console.log("Logs:", simulation.logs);
   * } else {
   *   console.error("Simulation failed:", simulation.error);
   * }
   * ```
   */
  async simulate(): Promise<SimulationResponse> {
    this.validate();

    const originalTransport = this.transport;
    this.transport = 'SIMULATE';

    try {
      const result = await this.send();
      return result as SimulationResponse;
    } finally {
      this.transport = originalTransport;
    }
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate the builder state before execution
   * @private
   */
  private validate(): void {
    if (this.operations.length === 0) {
      throw new ExecutionError(
        'No operations added. Use methods like pumpFunBuy(), systemTransfer(), etc. to add operations.',
        ErrorCode.INVALID_REQUEST,
        'BUILDER'
      );
    }

    if (!this.feePayer) {
      throw new ExecutionError(
        'Fee payer not set. Use setFeePayer() to set the fee payer.',
        ErrorCode.INVALID_REQUEST,
        'BUILDER'
      );
    }

    if (this.priorityFeeLamports < 0) {
      throw new ExecutionError(
        'Priority fee cannot be negative.',
        ErrorCode.INVALID_REQUEST,
        'BUILDER'
      );
    }

    if (this.bribeLamports !== undefined && this.bribeLamports < 0) {
      throw new ExecutionError(
        'Bribe amount cannot be negative.',
        ErrorCode.INVALID_REQUEST,
        'BUILDER'
      );
    }
  }

  /**
   * Reset the builder state
   *
   * @returns this (for method chaining)
   */
  reset(): this {
    this.operations = [];
    this.feePayer = undefined;
    this.priorityFeeLamports = 1_000_000;
    this.transport = 'NONCE';
    this.bribeLamports = undefined;
    return this;
  }

  /**
   * Get the current number of operations
   */
  getOperationCount(): number {
    return this.operations.length;
  }

  /**
   * Check if builder has operations
   */
  hasOperations(): boolean {
    return this.operations.length > 0;
  }
}
