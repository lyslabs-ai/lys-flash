/**
 * Meteora DAMM v2 Namespace
 *
 * Provides methods for interacting with Meteora Dynamic AMM v2 (CP-AMM) pools.
 * Transactions are built using the Meteora SDK and sent via rawTransaction().
 *
 * @module meteora/damm-v2/namespace
 */

import type { Connection } from '@solana/web3.js';
import { PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import type { TransactionBuilder } from '../../builder';
import type { LysFlash } from '../../client';
import type {
  DAMMv2SwapParams,
  DAMMv2BuyParams,
  DAMMv2SellParams,
  DAMMv2Swap2Params,
  DAMMv2Buy2Params,
  DAMMv2Sell2Params,
  DAMMv2BuyExactOutParams,
  DAMMv2SellExactOutParams,
} from './types';
import { SOL_MINT } from './types';

/**
 * DAMM v2 (Dynamic AMM v2 / CP-AMM) Namespace for TransactionBuilder
 *
 * Provides methods for interacting with Meteora DAMM v2 pools.
 * All methods build transactions using the Meteora SDK and wrap them with
 * rawTransaction() for execution through the LYS Flash backend.
 *
 * @example
 * ```typescript
 * import { Connection } from '@solana/web3.js';
 * import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';
 *
 * const connection = new Connection('https://api.mainnet-beta.solana.com');
 * const client = new LysFlash({
 *   address: 'ipc:///tmp/tx-executor.ipc',
 *   connection,
 * });
 *
 * // Execute buy via nested namespace: builder.meteora.dammV2.buy()
 * const builder = await new TransactionBuilder(client)
 *   .meteora.dammV2.buy({
 *     pool: poolAddress,
 *     user: userWallet,
 *     tokenMint: tokenAddress,
 *     solAmountIn: 1_000_000_000,
 *     minTokensOut: 1000000,
 *   });
 *
 * const result = await builder
 *   .setFeePayer(userWallet)
 *   .setTransport('FLASH')
 *   .setBribe(1_000_000)
 *   .send();
 * ```
 */
export class DAMMv2Namespace {
  private builder: TransactionBuilder;

  /**
   * Create DAMMv2Namespace instance
   * @param builder - Parent TransactionBuilder instance
   */
  constructor(builder: TransactionBuilder) {
    this.builder = builder;
  }

  /**
   * Get the client from the builder
   * @private
   */
  private getClient(): LysFlash {
    return this.builder.getClient();
  }

  /**
   * Get connection from client (pre-configured)
   * @private
   */
  private getConnection(): Connection {
    return this.getClient().requireConnection();
  }


  // ============================================================================
  // swap() methods
  // ============================================================================

  /**
   * Execute a swap on Meteora DAMM v2 pool using swap()
   *
   * @param params - Swap parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example Swap SOL for tokens
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV2.swap({
   *     pool: 'PoolAddress...',
   *     user: 'UserWallet...',
   *     inputMint: 'So11111111111111111111111111111111111111112', // SOL
   *     outputMint: 'TokenMintAddress...',
   *     amountIn: 1_000_000_000,     // 1 SOL
   *     minimumAmountOut: 1000000,   // Min tokens
   *   });
   * ```
   */
  async swap(params: DAMMv2SwapParams): Promise<TransactionBuilder> {
    const connection = this.getConnection();

    // Dynamic import for optional peer dependency
    const { CpAmm } = await import('@meteora-ag/cp-amm-sdk');
    const { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = await import(
      '@solana/spl-token'
    );

    const cpAmm = new CpAmm(connection);

    const poolAddress =
      typeof params.pool === 'string' ? new PublicKey(params.pool) : params.pool;

    const userAddress =
      typeof params.user === 'string' ? new PublicKey(params.user) : params.user;

    const inputMint =
      typeof params.inputMint === 'string'
        ? new PublicKey(params.inputMint)
        : params.inputMint;

    const outputMint =
      typeof params.outputMint === 'string'
        ? new PublicKey(params.outputMint)
        : params.outputMint;

    const amountIn = BN.isBN(params.amountIn)
      ? params.amountIn
      : new BN(params.amountIn);

    const minimumAmountOut = BN.isBN(params.minimumAmountOut)
      ? params.minimumAmountOut
      : new BN(params.minimumAmountOut);

    const referralAccount = params.referralAccount
      ? typeof params.referralAccount === 'string'
        ? new PublicKey(params.referralAccount)
        : params.referralAccount
      : null;

    // Fetch pool state to get required accounts
    const poolState = await cpAmm.fetchPoolState(poolAddress);
    if (!poolState) {
      throw new Error(`Pool not found: ${poolAddress.toBase58()}`);
    }

    // Helper to get token program from mint
    const getTokenProgramForMint = async (mint: PublicKey): Promise<PublicKey> => {
      try {
        // Try TOKEN_2022 first
        await getMint(connection, mint, undefined, TOKEN_2022_PROGRAM_ID);
        return TOKEN_2022_PROGRAM_ID;
      } catch {
        // Fall back to standard TOKEN_PROGRAM_ID
        return TOKEN_PROGRAM_ID;
      }
    };

    // Get token programs
    const tokenAProgram = await getTokenProgramForMint(poolState.tokenAMint);
    const tokenBProgram = await getTokenProgramForMint(poolState.tokenBMint);

    // Build swap transaction using Meteora SDK
    const swapTx: Transaction = await cpAmm.swap({
      payer: userAddress,
      pool: poolAddress,
      inputTokenMint: inputMint,
      outputTokenMint: outputMint,
      amountIn,
      minimumAmountOut,
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram,
      tokenBProgram,
      referralTokenAccount: referralAccount,
    });

    // Add as raw transaction
    return this.builder.rawTransaction({
      transaction: swapTx,
      additionalSigners: [],
    });
  }

  /**
   * Buy tokens on Meteora DAMM v2 pool (SOL -> Token convenience method)
   *
   * @param params - Buy parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV2.buy({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     solAmountIn: 1_000_000_000,  // 1 SOL
   *     minTokensOut: 1000000        // Min tokens
   *   });
   *
   * const result = await builder
   *   .setFeePayer(userWallet)
   *   .setTransport('FLASH')
   *   .setBribe(1_000_000)
   *   .send();
   * ```
   */
  async buy(params: DAMMv2BuyParams): Promise<TransactionBuilder> {
    return this.swap({
      pool: params.pool,
      user: params.user,
      inputMint: SOL_MINT,
      outputMint: params.tokenMint,
      amountIn: params.solAmountIn,
      minimumAmountOut: params.minTokensOut,
      referralAccount: params.referralAccount,
    });
  }

  /**
   * Sell tokens on Meteora DAMM v2 pool (Token -> SOL convenience method)
   *
   * @param params - Sell parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV2.sell({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     tokenAmountIn: 1000000,       // Tokens to sell
   *     minSolOut: 500_000_000        // Min 0.5 SOL
   *   });
   *
   * const result = await builder
   *   .setFeePayer(userWallet)
   *   .setTransport('FLASH')
   *   .setBribe(1_000_000)
   *   .send();
   * ```
   */
  async sell(params: DAMMv2SellParams): Promise<TransactionBuilder> {
    return this.swap({
      pool: params.pool,
      user: params.user,
      inputMint: params.tokenMint,
      outputMint: SOL_MINT,
      amountIn: params.tokenAmountIn,
      minimumAmountOut: params.minSolOut,
      referralAccount: params.referralAccount,
    });
  }

  // ============================================================================
  // swap2() methods (Supports ExactIn, PartialFill, ExactOut)
  // ============================================================================

  /**
   * Execute a swap on Meteora DAMM v2 pool using swap2 (advanced with mode selection)
   *
   * Supports three modes:
   * - ExactIn: Swap exact input amount, receive at least minimumAmountOut
   * - PartialFill: Allow partial fills of the order
   * - ExactOut: Swap for exact output amount, pay at most maximumAmountIn
   *
   * @param params - Swap2 parameters (discriminated union based on mode)
   * @returns TransactionBuilder (for method chaining)
   *
   * @example ExactIn mode
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV2.swap2({
   *     pool: poolAddress,
   *     user: userWallet,
   *     inputMint: 'So11111111111111111111111111111111111111112',
   *     outputMint: tokenAddress,
   *     mode: 'ExactIn',
   *     amountIn: 1_000_000_000,
   *     minimumAmountOut: 1000000,
   *   });
   * ```
   *
   * @example ExactOut mode
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV2.swap2({
   *     pool: poolAddress,
   *     user: userWallet,
   *     inputMint: 'So11111111111111111111111111111111111111112',
   *     outputMint: tokenAddress,
   *     mode: 'ExactOut',
   *     amountOut: 1000000,        // Exact tokens desired
   *     maximumAmountIn: 2_000_000_000,  // Max SOL to pay
   *   });
   * ```
   */
  async swap2(params: DAMMv2Swap2Params): Promise<TransactionBuilder> {
    const connection = this.getConnection();

    const { CpAmm, SwapMode } = await import('@meteora-ag/cp-amm-sdk');
    const { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = await import(
      '@solana/spl-token'
    );

    const cpAmm = new CpAmm(connection);

    const poolAddress =
      typeof params.pool === 'string' ? new PublicKey(params.pool) : params.pool;

    const userAddress =
      typeof params.user === 'string' ? new PublicKey(params.user) : params.user;

    const inputMint =
      typeof params.inputMint === 'string'
        ? new PublicKey(params.inputMint)
        : params.inputMint;

    const outputMint =
      typeof params.outputMint === 'string'
        ? new PublicKey(params.outputMint)
        : params.outputMint;

    const referralAccount = params.referralAccount
      ? typeof params.referralAccount === 'string'
        ? new PublicKey(params.referralAccount)
        : params.referralAccount
      : null;

    // Fetch pool state to get required accounts
    const poolState = await cpAmm.fetchPoolState(poolAddress);
    if (!poolState) {
      throw new Error(`Pool not found: ${poolAddress.toBase58()}`);
    }

    // Helper to get token program from mint
    const getTokenProgramForMint = async (mint: PublicKey): Promise<PublicKey> => {
      try {
        // Try TOKEN_2022 first
        await getMint(connection, mint, undefined, TOKEN_2022_PROGRAM_ID);
        return TOKEN_2022_PROGRAM_ID;
      } catch {
        // Fall back to standard TOKEN_PROGRAM_ID
        return TOKEN_PROGRAM_ID;
      }
    };

    // Get token programs
    const tokenAProgram = await getTokenProgramForMint(poolState.tokenAMint);
    const tokenBProgram = await getTokenProgramForMint(poolState.tokenBMint);

    // Build swap2 parameters based on mode
    let swap2Params: Record<string, unknown>;

    const baseParams = {
      payer: userAddress,
      pool: poolAddress,
      inputTokenMint: inputMint,
      outputTokenMint: outputMint,
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram,
      tokenBProgram,
      referralTokenAccount: referralAccount,
    };

    switch (params.mode) {
      case 'ExactIn': {
        const amountIn = BN.isBN(params.amountIn)
          ? params.amountIn
          : new BN(params.amountIn);
        const minimumAmountOut = BN.isBN(params.minimumAmountOut)
          ? params.minimumAmountOut
          : new BN(params.minimumAmountOut);

        swap2Params = {
          ...baseParams,
          swapMode: SwapMode.ExactIn,
          amountIn,
          minimumAmountOut,
        };
        break;
      }

      case 'PartialFill': {
        const amountIn = BN.isBN(params.amountIn)
          ? params.amountIn
          : new BN(params.amountIn);
        const minimumAmountOut = BN.isBN(params.minimumAmountOut)
          ? params.minimumAmountOut
          : new BN(params.minimumAmountOut);

        swap2Params = {
          ...baseParams,
          swapMode: SwapMode.PartialFill,
          amountIn,
          minimumAmountOut,
        };
        break;
      }

      case 'ExactOut': {
        const amountOut = BN.isBN(params.amountOut)
          ? params.amountOut
          : new BN(params.amountOut);
        const maximumAmountIn = BN.isBN(params.maximumAmountIn)
          ? params.maximumAmountIn
          : new BN(params.maximumAmountIn);

        swap2Params = {
          ...baseParams,
          swapMode: SwapMode.ExactOut,
          amountOut,
          maximumAmountIn,
        };
        break;
      }
    }

    // Build swap2 transaction using Meteora SDK
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const swapTx: Transaction = await cpAmm.swap2(swap2Params as any);

    // Add as raw transaction
    return this.builder.rawTransaction({
      transaction: swapTx,
      additionalSigners: [],
    });
  }

  /**
   * Buy tokens with ExactIn mode using swap2 (SOL -> Token convenience method)
   *
   * @param params - Buy2 parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV2.buy2({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     amountIn: 1_000_000_000,
   *     minimumAmountOut: 1000000,
   *   });
   * ```
   */
  async buy2(params: DAMMv2Buy2Params): Promise<TransactionBuilder> {
    return this.swap2({
      pool: params.pool,
      user: params.user,
      inputMint: SOL_MINT,
      outputMint: params.tokenMint,
      mode: 'ExactIn',
      amountIn: params.amountIn,
      minimumAmountOut: params.minimumAmountOut,
      referralAccount: params.referralAccount,
    });
  }

  /**
   * Sell tokens with ExactIn mode using swap2 (Token -> SOL convenience method)
   *
   * @param params - Sell2 parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV2.sell2({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     amountIn: 1000000,
   *     minimumAmountOut: 500_000_000,
   *   });
   * ```
   */
  async sell2(params: DAMMv2Sell2Params): Promise<TransactionBuilder> {
    return this.swap2({
      pool: params.pool,
      user: params.user,
      inputMint: params.tokenMint,
      outputMint: SOL_MINT,
      mode: 'ExactIn',
      amountIn: params.amountIn,
      minimumAmountOut: params.minimumAmountOut,
      referralAccount: params.referralAccount,
    });
  }

  /**
   * Buy tokens with ExactOut mode (I want exactly X tokens, pay up to Y SOL)
   *
   * @param params - BuyExactOut parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV2.buyExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     amountOut: 1000000,         // Exact tokens desired
   *     maximumAmountIn: 2_000_000_000,  // Max SOL to pay
   *   });
   * ```
   */
  async buyExactOut(params: DAMMv2BuyExactOutParams): Promise<TransactionBuilder> {
    return this.swap2({
      pool: params.pool,
      user: params.user,
      inputMint: SOL_MINT,
      outputMint: params.tokenMint,
      mode: 'ExactOut',
      amountOut: params.amountOut,
      maximumAmountIn: params.maximumAmountIn,
      referralAccount: params.referralAccount,
    });
  }

  /**
   * Sell tokens for exact SOL output (I want exactly X SOL, sell up to Y tokens)
   *
   * @param params - SellExactOut parameters
   * @returns TransactionBuilder (for method chaining)
   *
   * @example
   * ```typescript
   * const builder = await new TransactionBuilder(client)
   *   .meteora.dammV2.sellExactOut({
   *     pool: poolAddress,
   *     user: userWallet,
   *     tokenMint: tokenAddress,
   *     amountOut: 1_000_000_000,   // Exact SOL desired (1 SOL)
   *     maximumAmountIn: 2000000,   // Max tokens to sell
   *   });
   * ```
   */
  async sellExactOut(params: DAMMv2SellExactOutParams): Promise<TransactionBuilder> {
    return this.swap2({
      pool: params.pool,
      user: params.user,
      inputMint: params.tokenMint,
      outputMint: SOL_MINT,
      mode: 'ExactOut',
      amountOut: params.amountOut,
      maximumAmountIn: params.maximumAmountIn,
      referralAccount: params.referralAccount,
    });
  }
}
