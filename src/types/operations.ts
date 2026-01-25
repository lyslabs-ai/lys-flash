import { TransportMode } from './transport';

// ============================================================================
// Base Types
// ============================================================================

/**
 * Execution type (SDK identifier)
 */
export type ExecutionType =
  | 'PUMP_FUN'
  | 'PUMP_FUN_AMM'
  | 'SYSTEM_TRANSFER'
  | 'SPL_TOKEN'
  | 'RAW_TRANSACTION';

/**
 * Event type (operation identifier)
 */
export type EventType =
  | 'BUY'
  | 'BUY_EXACT_QUOTE_IN'
  | 'SELL'
  | 'CREATE'
  | 'MIGRATE'
  | 'TRANSFER'
  | 'TRANSFER_CHECKED'
  | 'CREATE_ATA'
  | 'CLOSE_ACCOUNT'
  | 'APPROVE'
  | 'REVOKE'
  | 'MINT_TO'
  | 'BURN'
  | 'SYNC_NATIVE'
  | 'EXECUTE';

// ============================================================================
// Pump.fun Operations
// ============================================================================

/**
 * Pump.fun BUY operation
 * Purchase tokens on bonding curve
 */
export interface PumpFunBuyParams {
  executionType: 'PUMP_FUN';
  eventType: 'BUY';

  /**
   * Token mint address
   * @example "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
   */
  pool: string;

  /**
   * Token program address
   * @example "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   */
  tokenProgram: string;

  /**
   * Pool-related accounts
   */
  poolAccounts: {
    /**
     * Token creator wallet address
     */
    coinCreator: string | null;
  };

  /**
   * Buyer wallet address
   */
  user: string;

  /**
   * Amount of SOL to spend (in lamports)
   * @example 1_000_000 // 0.001 SOL
   */
  solAmountIn: number;

  /**
   * Minimum tokens expected (slippage protection)
   * @example 3_400_000_000 // 3.4B tokens minimum
   */
  tokenAmountOut: number;

  /**
   * Whether to enable Mayhem mode
   * @default false
   */
  mayhemModeEnabled: boolean;
}

/**
 * Pump.fun SELL operation
 * Sell tokens on bonding curve
 */
export interface PumpFunSellParams {
  executionType: 'PUMP_FUN';
  eventType: 'SELL';

  /**
   * Token mint address
   */
  pool: string;

  /**
   * Token program address
   * @example "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   */
  tokenProgram: string;

  /**
   * Pool-related accounts
   */
  poolAccounts: {
    /**
     * Token creator wallet address
     */
    coinCreator: string | null;
  };

  /**
   * Seller wallet address
   */
  user: string;

  /**
   * Amount of tokens to sell
   * @example 1_000_000_000 // 1B tokens
   */
  tokenAmountIn: number;

  /**
   * Minimum SOL expected (slippage protection, in lamports)
   * @example 500_000 // 0.0005 SOL minimum
   */
  minSolAmountOut: number;

  /**
   * Whether to enable Mayhem mode
   * @default false
   */
  mayhemModeEnabled: boolean;

  /**
   * Whether to close the Associated Token Account after selling
   * Frees up rent (0.00203928 SOL per ATA)
   * @default false
   */
  closeAssociatedTokenAccount?: boolean;
}

/**
 * Pump.fun CREATE operation
 * Create new token on Pump.fun
 */
export interface PumpFunCreateParams {
  executionType: 'PUMP_FUN';
  eventType: 'CREATE';

  /**
   * Creator wallet address
   */
  user: string;

  /**
   * New mint public key (generate with Keypair.generate())
   * @example "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
   */
  pool: string;

  /**
   * Mint secret key (base58 encoded)
   * Required to initialize the mint account
   * @example Buffer.from(mintKeypair.secretKey).toString('base64')
   */
  mintSecretKey: string;

  /**
   * Token metadata
   */
  meta: {
    /**
     * Token name
     * @example "My Awesome Token"
     */
    name: string;

    /**
     * Token symbol (typically 3-5 characters)
     * @example "MAT"
     */
    symbol: string;

    /**
     * Metadata URI (JSON file with token description, image, etc.)
     * @example "https://arweave.net/..."
     */
    uri: string;
  };
}

/**
 * Pump.fun MIGRATE operation
 * Migrate token from bonding curve to Raydium AMM
 * Only available after token graduates (bonding curve completes)
 */
export interface PumpFunMigrateParams {
  executionType: 'PUMP_FUN';
  eventType: 'MIGRATE';

  /**
   * Token mint address to migrate
   */
  pool: string;

  /**
   * User wallet address
   */
  user: string;
}

// ============================================================================
// Pump.fun AMM Operations
// ============================================================================

/**
 * Pump.fun AMM BUY operation
 * Buy tokens on Raydium AMM (after graduation)
 */
export interface PumpFunAmmBuyParams {
  executionType: 'PUMP_FUN_AMM';
  eventType: 'BUY';

  /**
   * AMM pool address
   */
  pool: string;

  /**
   * Base token program address
   * @example "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   */
  baseTokenProgram: string;

  /**
   * Quote token program address
   * @example "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   */
  quoteTokenProgram: string;

  /**
   * Pool-related accounts
   */
  poolAccounts: {
    /**
     * Token mint (base mint)
     */
    baseMint: string;

    /**
     * Quote token mint (usually WSOL)
     */
    quoteMint: string;

    /**
     * Token creator address
     */
    coinCreator: string | null;

    /**
     * Pool creator address
     */
    poolCreator: string;
  };

  /**
   * Buyer wallet address
   */
  user: string;

  /**
   * Maximum amount of quote token to spend (in lamports)
   */
  maxQuoteAmountIn: number;

  /**
   * Expected base tokens to receive
   */
  baseAmountOut: number;

  /**
   * Whether to close base token account after transaction
   * @default false
   */
  closeBaseAssociatedTokenAccount?: boolean;

  /**
   * Whether to close quote token account after transaction
   * @default false
   */
  closeQuoteAssociatedTokenAccount?: boolean;
}

/**
 * Pump.fun AMM SELL operation
 * Sell tokens on Raydium AMM (after graduation)
 */
export interface PumpFunAmmSellParams {
  executionType: 'PUMP_FUN_AMM';
  eventType: 'SELL';

  /**
   * AMM pool address
   */
  pool: string;

  /**
   * Base token program address
   * @example "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   */
  baseTokenProgram: string;

  /**
   * Quote token program address
   * @example "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   */
  quoteTokenProgram: string;

  /**
   * Pool-related accounts
   */
  poolAccounts: {
    /**
     * Token mint (base mint)
     */
    baseMint: string;

    /**
     * Quote token mint (usually WSOL)
     */
    quoteMint: string;

    /**
     * Token creator address
     */
    coinCreator: string | null;

    /**
     * Pool creator address
     */
    poolCreator: string;
  };

  /**
   * Seller wallet address
   */
  user: string;

  /**
   * Amount of base tokens to sell
   */
  baseAmountIn: number;

  /**
   * Minimum quote token expected (slippage protection, in lamports)
   */
  minQuoteAmountOut: number;

  /**
   * Whether to close base token account after transaction
   * @default false
   */
  closeBaseAssociatedTokenAccount?: boolean;

  /**
   * Whether to close quote token account after transaction
   * @default false
   */
  closeQuoteAssociatedTokenAccount?: boolean;
}

/**
 * Pump.fun AMM BUY_EXACT_QUOTE_IN operation
 * Buy tokens with exact quote amount (spend precise SOL amount)
 */
export interface PumpFunAmmBuyExactQuoteInParams {
  executionType: 'PUMP_FUN_AMM';
  eventType: 'BUY_EXACT_QUOTE_IN';

  /**
   * AMM pool address
   */
  pool: string;

  /**
   * Base token program address
   * @example "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   */
  baseTokenProgram: string;

  /**
   * Quote token program address
   * @example "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   */
  quoteTokenProgram: string;

  /**
   * Pool-related accounts
   */
  poolAccounts: {
    /**
     * Token mint (base mint)
     */
    baseMint: string;

    /**
     * Quote token mint (usually WSOL)
     */
    quoteMint: string;

    /**
     * Token creator address
     */
    coinCreator: string | null;

    /**
     * Pool creator address
     */
    poolCreator: string;
  };

  /**
   * Buyer wallet address
   */
  user: string;

  /**
   * Exact amount of quote token to spend (in lamports)
   */
  spendableQuoteIn: number;

  /**
   * Minimum base tokens to receive (slippage protection)
   */
  minBaseAmountOut: number;

  /**
   * Whether to close base token account after transaction
   * @default false
   */
  closeBaseAssociatedTokenAccount?: boolean;

  /**
   * Whether to close quote token account after transaction
   * @default false
   */
  closeQuoteAssociatedTokenAccount?: boolean;
}

// ============================================================================
// System Transfer Operations
// ============================================================================

/**
 * System TRANSFER operation
 * Transfer native SOL between wallets
 */
export interface SystemTransferParams {
  executionType: 'SYSTEM_TRANSFER';
  eventType: 'TRANSFER';

  /**
   * Sender wallet address
   */
  sender: string;

  /**
   * Recipient wallet address
   */
  recipient: string;

  /**
   * Amount to transfer (in lamports)
   * @example 1_000_000_000 // 1 SOL
   */
  lamports: number;
}

// ============================================================================
// SPL Token Operations
// ============================================================================

/**
 * SPL Token TRANSFER operation
 * Transfer tokens between wallets (both ATAs must exist)
 */
export interface SplTokenTransferParams {
  executionType: 'SPL_TOKEN';
  eventType: 'TRANSFER';

  /**
   * Token mint address
   */
  mint: string;

  /**
   * Source wallet address (owner of source ATA)
   */
  sourceOwner: string;

  /**
   * Destination wallet address (owner of destination ATA)
   */
  destinationOwner: string;

  /**
   * Amount to transfer (in token's smallest unit)
   * @example 1_000_000 // 1 token with 6 decimals
   */
  amount: number;
}

/**
 * SPL Token TRANSFER_CHECKED operation
 * Transfer tokens with decimal validation
 */
export interface SplTokenTransferCheckedParams {
  executionType: 'SPL_TOKEN';
  eventType: 'TRANSFER_CHECKED';

  /**
   * Token mint address
   */
  mint: string;

  /**
   * Source wallet address
   */
  sourceOwner: string;

  /**
   * Destination wallet address
   */
  destinationOwner: string;

  /**
   * Amount to transfer
   */
  amount: number;

  /**
   * Token decimals for validation
   * @example 6 // Most SPL tokens use 6 decimals
   */
  decimals: number;
}

/**
 * SPL Token CREATE_ATA operation
 * Create Associated Token Account for a wallet
 */
export interface SplTokenCreateATAParams {
  executionType: 'SPL_TOKEN';
  eventType: 'CREATE_ATA';

  /**
   * Payer for account creation rent
   * Requires ~0.00203928 SOL
   */
  payer: string;

  /**
   * Owner of the new ATA
   */
  owner: string;

  /**
   * Token mint address
   */
  mint: string;
}

/**
 * SPL Token CLOSE_ACCOUNT operation
 * Close token account and reclaim rent
 */
export interface SplTokenCloseAccountParams {
  executionType: 'SPL_TOKEN';
  eventType: 'CLOSE_ACCOUNT';

  /**
   * Token mint address
   */
  mint: string;

  /**
   * Owner/authority of the account to close
   */
  owner: string;
}

/**
 * SPL Token APPROVE operation
 * Approve a delegate to spend tokens
 */
export interface SplTokenApproveParams {
  executionType: 'SPL_TOKEN';
  eventType: 'APPROVE';

  /**
   * Token mint address
   */
  mint: string;

  /**
   * Delegate address (can spend approved amount)
   */
  delegate: string;

  /**
   * Owner of the token account
   */
  owner: string;

  /**
   * Amount to approve
   */
  amount: number;
}

/**
 * SPL Token REVOKE operation
 * Revoke delegate approval
 */
export interface SplTokenRevokeParams {
  executionType: 'SPL_TOKEN';
  eventType: 'REVOKE';

  /**
   * Token mint address
   */
  mint: string;

  /**
   * Owner of the token account
   */
  owner: string;
}

/**
 * SPL Token MINT_TO operation
 * Mint new tokens to a wallet
 * Requires mint authority
 */
export interface SplTokenMintToParams {
  executionType: 'SPL_TOKEN';
  eventType: 'MINT_TO';

  /**
   * Token mint address
   */
  mint: string;

  /**
   * Recipient wallet address
   */
  destinationOwner: string;

  /**
   * Mint authority address
   */
  authority: string;

  /**
   * Amount to mint
   */
  amount: number;
}

/**
 * SPL Token BURN operation
 * Burn tokens from a wallet
 */
export interface SplTokenBurnParams {
  executionType: 'SPL_TOKEN';
  eventType: 'BURN';

  /**
   * Token mint address
   */
  mint: string;

  /**
   * Owner of the tokens to burn
   */
  owner: string;

  /**
   * Amount to burn
   */
  amount: number;
}

/**
 * SPL Token SYNC_NATIVE operation
 * Sync wrapped SOL account balance
 */
export interface SplTokenSyncNativeParams {
  executionType: 'SPL_TOKEN';
  eventType: 'SYNC_NATIVE';

  /**
   * Owner of the WSOL account
   */
  owner: string;
}

// ============================================================================
// Raw Transaction Operations
// ============================================================================

/**
 * RAW_TRANSACTION EXECUTE operation
 * Execute a pre-built Solana transaction
 *
 * The transaction should NOT be signed - the server will sign it using
 * the feePayer wallet and any additional signers from its managed wallet pool.
 *
 * @example
 * ```typescript
 * import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
 *
 * const tx = new Transaction().add(
 *   SystemProgram.transfer({
 *     fromPubkey: new PublicKey(sender),
 *     toPubkey: new PublicKey(recipient),
 *     lamports: 1_000_000
 *   })
 * );
 *
 * const result = await new TransactionBuilder(client)
 *   .rawTransaction({ transaction: tx })
 *   .setFeePayer(sender)
 *   .setTransport("FLASH")
 *   .setBribe(1_000_000)
 *   .send();
 * ```
 */
export interface RawTransactionParams {
  executionType: 'RAW_TRANSACTION';
  eventType: 'EXECUTE';

  /**
   * Serialized transaction bytes (Uint8Array)
   *
   * The library handles serialization - users pass Transaction object to the builder,
   * which serializes it using:
   * `transaction.serialize({ requireAllSignatures: false, verifySignatures: false })`
   */
  transactionBytes: Uint8Array;

  /**
   * Additional signer public keys (base58 encoded)
   *
   * Server wallet management will look up and sign with these wallets.
   * Only needed for accounts that must sign besides the fee payer.
   *
   * @example ['AdditionalSignerPublicKey1', 'AdditionalSignerPublicKey2']
   */
  additionalSigners?: string[];
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * Any operation data (union of all operation types)
 */
export type OperationData =
  | PumpFunBuyParams
  | PumpFunSellParams
  | PumpFunCreateParams
  | PumpFunMigrateParams
  | PumpFunAmmBuyParams
  | PumpFunAmmBuyExactQuoteInParams
  | PumpFunAmmSellParams
  | SystemTransferParams
  | SplTokenTransferParams
  | SplTokenTransferCheckedParams
  | SplTokenCreateATAParams
  | SplTokenCloseAccountParams
  | SplTokenApproveParams
  | SplTokenRevokeParams
  | SplTokenMintToParams
  | SplTokenBurnParams
  | SplTokenSyncNativeParams
  | RawTransactionParams;

// ============================================================================
// Transaction Request
// ============================================================================

/**
 * Complete transaction request
 */
export interface TransactionRequest {
  /**
   * Operation data (single operation or array for batching)
   *
   * @example Single operation
   * ```typescript
   * data: {
   *   executionType: "PUMP_FUN",
   *   eventType: "BUY",
   *   pool: "mint_address",
   *   // ... other params
   * }
   * ```
   *
   * @example Batched operations
   * ```typescript
   * data: [
   *   { executionType: "SYSTEM_TRANSFER", ... },
   *   { executionType: "SPL_TOKEN", eventType: "TRANSFER", ... },
   *   { executionType: "PUMP_FUN", eventType: "BUY", ... }
   * ]
   * ```
   */
  data: OperationData | OperationData[];

  /**
   * Fee payer wallet address
   * This wallet pays for transaction fees
   */
  feePayer: string;

  /**
   * Priority fee (in microLamports)
   * Higher priority fees increase transaction landing probability
   *
   * @example
   * 1_000_000 microLamports = 0.001 SOL priority fee
   *
   * Recommendations:
   * - Normal: 1_000_000 (0.001 SOL)
   * - High priority: 5_000_000 (0.005 SOL)
   * - Critical: 10_000_000 (0.01 SOL)
   */
  priorityFeeLamports: number;

  /**
   * Transport mode for execution
   *
   * Recommended: "FLASH" for production (fastest, 40-100ms)
   */
  transport: TransportMode;

  /**
   * Jito tip amount (in lamports)
   * Optional MEV protection bribe
   *
   * @example 1_000_000 // 0.001 SOL Jito tip
   *
   * Only used with JITO or FLASH transport modes
   */
  bribeLamports?: number;
}

// ============================================================================
// Wallet Creation Request
// ============================================================================

/**
 * Wallet creation request
 */
export interface WalletCreationRequest {
  /**
   * Message type identifier
   */
  type: 'WALLET_CREATE';

  /**
   * User's Solana public key for encryption (base58 encoded)
   * The new wallet's secret key will be encrypted with this public key
   * User can decrypt with their Ed25519 private key (converted to Curve25519)
   */
  userPublicKey: string;
}
