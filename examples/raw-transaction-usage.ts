/**
 * Raw Transaction Usage Examples
 *
 * This example demonstrates using the rawTransaction() method to execute
 * pre-built @solana/web3.js Transaction objects via LYS Flash.
 *
 * This is useful when you need:
 * - Full control over transaction construction
 * - Integration with other Solana libraries
 * - Custom instruction building
 * - VersionedTransaction (v0) with Address Lookup Tables
 *
 * For simpler operations, see transaction-builder-usage.ts
 */

import { LysFlash, TransactionBuilder, ExecutionError, ErrorCode } from '@lyslabs.ai/lys-flash';
import {
  Transaction,
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
  PublicKey,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

async function main() {
  console.log('LYS Flash - Raw Transaction Examples\n');

  // Create client
  console.log('1. Creating client...');
  const client = new LysFlash({
    address: 'ipc:///tmp/tx-executor.ipc',
    timeout: 30000,
    verbose: true,
  });
  console.log('   ✓ Client created\n');

  // Test wallets (replace with your managed wallet public keys)
  const senderWallet = '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89';
  const recipientWallet = '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz';

  try {
    // ========================================================================
    // BASIC RAW TRANSACTION
    // ========================================================================

    console.log('2. Basic Raw Transaction');
    console.log('   ──────────────────────\n');

    console.log('   a) Building a simple SOL transfer transaction...');

    // Build a transaction using @solana/web3.js
    const simpleTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(senderWallet),
        toPubkey: new PublicKey(recipientWallet),
        lamports: 0.001 * LAMPORTS_PER_SOL, // 0.001 SOL
      })
    );

    console.log('      ✓ Transaction built');
    console.log('      Instructions:', simpleTransaction.instructions.length);

    // Simulate the raw transaction
    console.log('\n   b) Simulating raw transaction...');
    const simpleSimulation = await new TransactionBuilder(client)
      .rawTransaction({ transaction: simpleTransaction })
      .setFeePayer(senderWallet)
      .setPriorityFee(1_000_000)
      .simulate();

    if (simpleSimulation.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', simpleSimulation.error);
    }

    // ========================================================================
    // TRANSACTION WITH COMPUTE BUDGET
    // ========================================================================

    console.log('\n3. Transaction with Compute Budget');
    console.log('   ─────────────────────────────────\n');

    console.log('   Building transaction with compute budget instructions...');

    const computeBudgetTx = new Transaction().add(
      // Set compute unit limit
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 200_000,
      }),
      // Set compute unit price (priority fee)
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 50_000, // 0.00005 SOL per CU
      }),
      // Actual transfer instruction
      SystemProgram.transfer({
        fromPubkey: new PublicKey(senderWallet),
        toPubkey: new PublicKey(recipientWallet),
        lamports: 0.001 * LAMPORTS_PER_SOL,
      })
    );

    console.log('   ✓ Transaction built with', computeBudgetTx.instructions.length, 'instructions');
    console.log('     - SetComputeUnitLimit');
    console.log('     - SetComputeUnitPrice');
    console.log('     - SystemProgram.transfer');

    const computeBudgetSim = await new TransactionBuilder(client)
      .rawTransaction({ transaction: computeBudgetTx })
      .setFeePayer(senderWallet)
      .simulate();

    if (computeBudgetSim.success) {
      console.log('   ✓ Simulation passed');
    } else {
      console.log('   ✗ Simulation failed:', computeBudgetSim.error);
    }

    // ========================================================================
    // MULTIPLE TRANSFERS IN ONE TRANSACTION
    // ========================================================================

    console.log('\n4. Multiple Transfers in One Transaction');
    console.log('   ───────────────────────────────────────\n');

    console.log('   Building transaction with multiple transfers...');

    // Multiple recipients
    const recipients = [
      { address: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz', amount: 0.001 },
      { address: 'BLZvwPnKR8JWFCK6MEwv97dDrTPTZ4WhASrgZsJGf3zf', amount: 0.002 },
      { address: 'HN7cABqLq46Es1jh92dQQisAi5zYo2MHhNmRZ6K9oQcP', amount: 0.003 },
    ];

    const multiTransferTx = new Transaction();

    for (const recipient of recipients) {
      multiTransferTx.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(senderWallet),
          toPubkey: new PublicKey(recipient.address),
          lamports: recipient.amount * LAMPORTS_PER_SOL,
        })
      );
    }

    console.log('   ✓ Transaction built with', multiTransferTx.instructions.length, 'transfers');

    const multiTransferSim = await new TransactionBuilder(client)
      .rawTransaction({ transaction: multiTransferTx })
      .setFeePayer(senderWallet)
      .simulate();

    if (multiTransferSim.success) {
      console.log('   ✓ Simulation passed - all transfers would execute atomically');
    } else {
      console.log('   ✗ Simulation failed:', multiTransferSim.error);
    }

    // ========================================================================
    // WITH ADDITIONAL SIGNERS
    // ========================================================================

    console.log('\n5. Transaction with Additional Signers');
    console.log('   ─────────────────────────────────────\n');

    console.log('   When your transaction requires multiple managed wallets to sign,');
    console.log('   specify their PUBLIC KEYS as additional signers.');
    console.log('');
    console.log('   Example code:');
    console.log('   ');
    console.log('   const result = await new TransactionBuilder(client)');
    console.log('     .rawTransaction({');
    console.log('       transaction: myTransaction,');
    console.log('       additionalSigners: [');
    console.log("         'AdditionalSignerPublicKey1',");
    console.log("         'AdditionalSignerPublicKey2',");
    console.log('         // Or use PublicKey objects:');
    console.log("         new PublicKey('AnotherSignerPubkey'),");
    console.log('       ],');
    console.log('     })');
    console.log("     .setFeePayer('FeePayerPublicKey')");
    console.log("     .setTransport('NONCE')");
    console.log('     .setBribe(1_000_000)');
    console.log('     .send();');
    console.log('');
    console.log('   Note: Only PUBLIC KEYS are sent. The server wallet management');
    console.log('         system looks up the corresponding secret keys to sign.');

    // ========================================================================
    // VERSIONED TRANSACTION (v0)
    // ========================================================================

    console.log('\n6. VersionedTransaction (v0) Support');
    console.log('   ───────────────────────────────────\n');

    console.log('   VersionedTransaction is supported for Address Lookup Tables.');
    console.log('');
    console.log('   Example code:');
    console.log('   ');
    console.log('   import { VersionedTransaction, TransactionMessage } from "@solana/web3.js";');
    console.log('   ');
    console.log('   const message = new TransactionMessage({');
    console.log("     payerKey: new PublicKey('FeePayerPublicKey'),");
    console.log('     recentBlockhash: blockhash,');
    console.log('     instructions: [/* your instructions */],');
    console.log('   }).compileToV0Message(addressLookupTableAccounts);');
    console.log('   ');
    console.log('   const versionedTx = new VersionedTransaction(message);');
    console.log('   ');
    console.log('   const result = await new TransactionBuilder(client)');
    console.log('     .rawTransaction({ transaction: versionedTx })');
    console.log("     .setFeePayer('FeePayerPublicKey')");
    console.log("     .setTransport('NONCE')");
    console.log('     .setBribe(1_000_000)');
    console.log('     .send();');

    // ========================================================================
    // COMBINING WITH OTHER OPERATIONS
    // ========================================================================

    console.log('\n7. Combining Raw Transaction with Other Operations');
    console.log('   ─────────────────────────────────────────────────\n');

    console.log('   Raw transactions can be batched with other builder operations.');
    console.log('');

    const combinedTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(senderWallet),
        toPubkey: new PublicKey(recipientWallet),
        lamports: 0.001 * LAMPORTS_PER_SOL,
      })
    );

    console.log('   Simulating: Raw Transfer + Pump.fun Buy (batched)...');

    const combinedSim = await new TransactionBuilder(client)
      // First: raw transaction
      .rawTransaction({ transaction: combinedTx })
      // Then: Pump.fun buy
      .pumpFunBuy({
        pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
        poolAccounts: {
          coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
        },
        user: senderWallet,
        solAmountIn: 1_000_000,
        tokenAmountOut: 3_400_000_000,
      })
      .setFeePayer(senderWallet)
      .setPriorityFee(1_000_000)
      .simulate();

    if (combinedSim.success) {
      console.log('   ✓ Batched simulation passed');
      console.log('   Both operations would execute atomically');
    } else {
      console.log('   ✗ Batched simulation failed:', combinedSim.error);
    }

    // ========================================================================
    // PRODUCTION USAGE
    // ========================================================================

    console.log('\n8. Production Usage');
    console.log('   ─────────────────\n');

    console.log('   For production, use NONCE transport with bribe:');
    console.log('');
    console.log('   const result = await new TransactionBuilder(client)');
    console.log('     .rawTransaction({ transaction })');
    console.log("     .setFeePayer('WalletPublicKey')");
    console.log('     .setPriorityFee(5_000_000)      // Higher for production');
    console.log('     .setBribe(1_000_000)            // Mandatory for NONCE');
    console.log("     .setTransport('NONCE')          // Multi-broadcast");
    console.log('     .send();');
    console.log('');
    console.log('   Available transports for raw transactions:');
    console.log('   - NONCE        : Multi-broadcast with MEV protection [Requires bribe]');
    console.log('   - ZERO_SLOT    : Ultra-fast with MEV protection [Requires bribe]');
    console.log('   - NOZOMI       : Low-latency with MEV protection [Requires bribe]');
    console.log('   - HELIUS_SENDER: Premium reliability [Requires bribe]');
    console.log('   - JITO         : MEV-protected via Jito [Requires bribe]');
    console.log('   - VANILLA      : Standard RPC (no MEV protection, no bribe)');
    console.log('   - SIMULATE     : Testing only (no broadcast, no bribe)');

    // ========================================================================
    // BEST PRACTICES
    // ========================================================================

    console.log('\n9. Best Practices');
    console.log('   ──────────────\n');

    console.log('   ✓ Always simulate before production execution');
    console.log('   ✓ Do NOT sign the transaction - server handles signing');
    console.log('   ✓ Only send PUBLIC KEYS for additional signers');
    console.log('   ✓ Use NONCE transport for fastest execution');
    console.log('   ✓ Set bribe (min 1_000_000) when using NONCE');
    console.log('   ✓ Keep transactions under 1232 bytes (Solana limit)');
    console.log('   ✓ Reuse client instance across transactions');

    // ========================================================================
    // CLIENT STATISTICS
    // ========================================================================

    console.log('\n10. Client Statistics');
    console.log('    ─────────────────\n');

    const stats = client.getStats();
    console.log(`    Requests sent:     ${stats.requestsSent}`);
    console.log(`    Successful:        ${stats.requestsSuccessful}`);
    console.log(`    Failed:            ${stats.requestsFailed}`);
    console.log(
      `    Success rate:      ${((stats.requestsSuccessful / stats.requestsSent) * 100).toFixed(2)}%`
    );
    console.log(`    Average latency:   ${stats.averageLatency.toFixed(2)}ms`);
    console.log(`    Connected:         ${stats.connected}`);

    console.log('\n✓ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Error occurred:');

    if (error instanceof ExecutionError) {
      console.error(`   Code: ${error.code}`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Transport: ${error.transport}`);
      console.error(`   User message: ${error.getUserMessage()}`);
      console.error(`   Retryable: ${error.isRetryable()}`);

      // Handle specific error codes
      switch (error.code) {
        case ErrorCode.NETWORK_ERROR:
          console.log('\n   → Network error - check your connection');
          break;
        case ErrorCode.TIMEOUT:
          console.log('\n   → Timeout - the server might be busy');
          break;
        case ErrorCode.CONNECTION_ERROR:
          console.log('\n   → Connection error - ensure the execution engine is running');
          break;
        case ErrorCode.INVALID_REQUEST:
          console.log('\n   → Invalid request - check transaction format');
          break;
        default:
          console.log(`\n   → Unexpected error: ${error.code}`);
      }
    } else {
      console.error('   Unknown error:', error);
    }
  } finally {
    // Clean up
    console.log('11. Closing client...');
    client.close();
    console.log('    ✓ Client closed\n');
  }
}

// Run example
main().catch(console.error);
