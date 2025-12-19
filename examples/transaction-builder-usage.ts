/**
 * Transaction Builder Usage Examples
 *
 * This example demonstrates using the fluent TransactionBuilder API for
 * easy transaction composition with method chaining.
 *
 * This is the RECOMMENDED way to use the library.
 *
 * For low-level control, see raw-api-usage.ts
 */

import { LysFlash, TransactionBuilder, ExecutionError, ErrorCode } from '@lyslabs.ai/lys-flash';
import { Keypair } from '@solana/web3.js';

async function main() {
  console.log('LYS Flash - Transaction Builder Examples\n');

  // Create client
  console.log('1. Creating client...');
  const client = new LysFlash({
    address: 'ipc:///tmp/tx-executor.ipc',
    timeout: 30000,
    verbose: true,
  });
  console.log('   ✓ Client created\n');

  try {
    // ========================================================================
    // PUMP.FUN OPERATIONS
    // ========================================================================

    console.log('2. Pump.fun Operations');
    console.log('   ─────────────────────\n');

    // Example 1: BUY - Buy tokens on bonding curve
    console.log('   a) Simulating Pump.fun BUY...');
    const buySimulation = await new TransactionBuilder(client)
      .pumpFunBuy({
        pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
        poolAccounts: {
          coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3', // Optional but recommended
        },
        user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        solAmountIn: 1_000_000, // 0.001 SOL
        tokenAmountOut: 3_400_000_000, // Min 3.4B tokens
      })
      .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
      .setPriorityFee(1_000_000)
      .simulate(); // Simulate first

    if (buySimulation.success) {
      console.log('      ✓ Simulation passed');
      console.log('      Ready to execute with FLASH transport');
    } else {
      console.log('      ✗ Simulation failed:', buySimulation.error);
    }

    // Example 2: SELL - Sell tokens on bonding curve
    console.log('\n   b) Simulating Pump.fun SELL...');
    const sellSimulation = await new TransactionBuilder(client)
      .pumpFunSell({
        pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
        poolAccounts: {
          coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3', // Optional but recommended
        },
        user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        tokenAmountIn: 3_400_000_000,
        minSolAmountOut: 0,
        closeAssociatedTokenAccount: false,
      })
      .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
      .setPriorityFee(1_000_000)
      .simulate();

    if (sellSimulation.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', sellSimulation.error);
    }

    // Example 3: CREATE - Create new token
    console.log('\n   c) Simulating Pump.fun CREATE...');
    const mintKeypair = Keypair.generate();

    const createSimulation = await new TransactionBuilder(client)
      .pumpFunCreate({
        user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        pool: mintKeypair.publicKey.toBase58(),
        mintSecretKey: Buffer.from(mintKeypair.secretKey).toString('base64'),
        meta: {
          name: 'Test Coin',
          symbol: 'TEST',
          uri: 'https://test.com/metadata.json',
        },
      })
      .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
      .setPriorityFee(1_000_000)
      .simulate();

    if (createSimulation.success) {
      console.log('      ✓ Simulation passed');
      console.log('      New mint:', mintKeypair.publicKey.toBase58());
    } else {
      console.log('      ✗ Simulation failed:', createSimulation.error);
    }

    // Example 4: MIGRATE - Migrate to AMM
    console.log('\n   d) Simulating Pump.fun MIGRATE...');
    const migrateSimulation = await new TransactionBuilder(client)
      .pumpFunMigrate({
        pool: 's4WB81LEUw3mh3qMjQgAJzumYqdNTgr6DYPWaLbpump',
        user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
      })
      .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
      .setPriorityFee(1_000_000)
      .simulate();

    if (migrateSimulation.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', migrateSimulation.error);
    }

    // ========================================================================
    // BATCHED OPERATIONS - CREATE + BUY
    // ========================================================================

    console.log('\n3. Batched Operations - CREATE + BUY');
    console.log('   ──────────────────────────────────\n');

    console.log('   Simulating CREATE + BUY (batched)...');
    const batchedSimulation = await new TransactionBuilder(client)
      .pumpFunCreate({
        user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        pool: mintKeypair.publicKey.toBase58(),
        mintSecretKey: Buffer.from(mintKeypair.secretKey).toString('base64'),
        meta: {
          name: 'Test Coin',
          symbol: 'TEST',
          uri: 'https://test.com/metadata.json',
        },
      })
      .pumpFunBuy({
        pool: mintKeypair.publicKey.toBase58(),
        poolAccounts: {
          coinCreator: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        },
        user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        solAmountIn: 10_000_000, // 0.01 SOL
        tokenAmountOut: 34_000_000_000,
      })
      .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
      .setPriorityFee(1_000_000)
      .simulate();

    if (batchedSimulation.success) {
      console.log('   ✓ Batched simulation passed (2 operations)');
      console.log('   Both operations will execute atomically');
    } else {
      console.log('   ✗ Batched simulation failed:', batchedSimulation.error);
    }

    // ========================================================================
    // PUMP.FUN AMM OPERATIONS (After migration to AMM)
    // ========================================================================

    console.log('\n4. Pump.fun AMM Operations');
    console.log('   ───────────────────────\n');

    // Example 5: AMM BUY - Buy on AMM
    console.log('   a) Simulating Pump.fun AMM BUY...');
    const ammBuySimulation = await new TransactionBuilder(client)
      .pumpFunAmmBuy({
        pool: '9kSKBD8G7Qio51XsLm5yhWWZ72YDJuUeJ6PqDc2mWZe1',
        poolAccounts: {
          baseMint: 'EZtWGQLW2ihjvJXiBRNVz7gUVgnyn9aRQUcQkCeepump',
          quoteMint: 'So11111111111111111111111111111111111111112',
          coinCreator: '5VuTMuSbGbtuWsZuixbZxhD1DCuYv6ikzeM59a1XzjRN', // Optional
          poolCreator: 'EXapcg7mPND38PKsSgB8iicv2CD1Gfy9VcC9HtdBrXsD', // Optional
        },
        user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        solAmountIn: 10_000_000,
        tokenAmountOut: 1_000_000,
      })
      .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
      .setPriorityFee(1_000_000)
      .simulate();

    if (ammBuySimulation.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', ammBuySimulation.error);
    }

    // Example 6: AMM SELL - Sell on AMM
    console.log('\n   b) Simulating Pump.fun AMM SELL...');
    const ammSellSimulation = await new TransactionBuilder(client)
      .pumpFunAmmSell({
        pool: '9kSKBD8G7Qio51XsLm5yhWWZ72YDJuUeJ6PqDc2mWZe1',
        poolAccounts: {
          baseMint: 'EZtWGQLW2ihjvJXiBRNVz7gUVgnyn9aRQUcQkCeepump',
          quoteMint: 'So11111111111111111111111111111111111111112',
          coinCreator: '5VuTMuSbGbtuWsZuixbZxhD1DCuYv6ikzeM59a1XzjRN', // Optional
          poolCreator: 'EXapcg7mPND38PKsSgB8iicv2CD1Gfy9VcC9HtdBrXsD', // Optional
        },
        user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        tokenAmountIn: 1_000_000,
        minSolAmountOut: 0,
        closeAssociatedTokenAccount: false,
      })
      .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
      .setPriorityFee(1_000_000)
      .simulate();

    if (ammSellSimulation.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', ammSellSimulation.error);
    }

    // ========================================================================
    // SYSTEM TRANSFER
    // ========================================================================

    console.log('\n5. System Transfer');
    console.log('   ───────────────\n');

    console.log('   Simulating SOL transfer...');
    const transferSimulation = await new TransactionBuilder(client)
      .systemTransfer({
        sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
        lamports: 10_000_000, // 0.01 SOL
      })
      .setFeePayer('5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89')
      .setPriorityFee(1_000_000)
      .simulate();

    if (transferSimulation.success) {
      console.log('   ✓ Simulation passed');
    } else {
      console.log('   ✗ Simulation failed:', transferSimulation.error);
    }

    // ========================================================================
    // SPL TOKEN OPERATIONS
    // ========================================================================

    console.log('\n6. SPL Token Operations');
    console.log('   ────────────────────\n');

    const testMint = '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump';
    const testUser = '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89';
    const testRecipient = '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz';

    // Example 7: Token Transfer
    console.log('   a) Simulating SPL Token TRANSFER...');
    const tokenTransferSim = await new TransactionBuilder(client)
      .splTokenTransfer({
        mint: testMint,
        sourceOwner: testUser,
        destinationOwner: testRecipient,
        amount: 1_000_000,
      })
      .setFeePayer(testUser)
      .setPriorityFee(1_000_000)
      .simulate();

    if (tokenTransferSim.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', tokenTransferSim.error);
    }

    // Example 8: Transfer Checked (with decimals validation)
    console.log('\n   b) Simulating SPL Token TRANSFER_CHECKED...');
    const transferCheckedSim = await new TransactionBuilder(client)
      .splTokenTransferChecked({
        mint: testMint,
        sourceOwner: testUser,
        destinationOwner: testRecipient,
        amount: 1_000_000,
        decimals: 6,
      })
      .setFeePayer(testUser)
      .setPriorityFee(1_000_000)
      .simulate();

    if (transferCheckedSim.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', transferCheckedSim.error);
    }

    // Example 9: Create ATA
    console.log('\n   c) Simulating CREATE_ATA...');
    const createAtaSim = await new TransactionBuilder(client)
      .splTokenCreateATA({
        payer: testUser,
        owner: testUser,
        mint: testMint,
      })
      .setFeePayer(testUser)
      .setPriorityFee(1_000_000)
      .simulate();

    if (createAtaSim.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', createAtaSim.error);
    }

    // Example 10: Close Account
    console.log('\n   d) Simulating CLOSE_ACCOUNT...');
    const closeAccountSim = await new TransactionBuilder(client)
      .splTokenCloseAccount({
        mint: testMint,
        owner: testUser,
      })
      .setFeePayer(testUser)
      .setPriorityFee(1_000_000)
      .simulate();

    if (closeAccountSim.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', closeAccountSim.error);
    }

    // Example 11: Approve Delegate
    console.log('\n   e) Simulating APPROVE...');
    const approveSim = await new TransactionBuilder(client)
      .splTokenApprove({
        mint: testMint,
        delegate: testRecipient,
        owner: testUser,
        amount: 5_000_000,
      })
      .setFeePayer(testUser)
      .setPriorityFee(1_000_000)
      .simulate();

    if (approveSim.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', approveSim.error);
    }

    // Example 12: Revoke Delegate
    console.log('\n   f) Simulating REVOKE...');
    const revokeSim = await new TransactionBuilder(client)
      .splTokenRevoke({
        mint: testMint,
        owner: testUser,
      })
      .setFeePayer(testUser)
      .setPriorityFee(1_000_000)
      .simulate();

    if (revokeSim.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', revokeSim.error);
    }

    // Example 13: Mint To
    console.log('\n   g) Simulating MINT_TO...');
    const mintToSim = await new TransactionBuilder(client)
      .splTokenMintTo({
        mint: testMint,
        destinationOwner: testRecipient,
        authority: testUser,
        amount: 10_000_000,
      })
      .setFeePayer(testUser)
      .setPriorityFee(1_000_000)
      .simulate();

    if (mintToSim.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', mintToSim.error);
    }

    // Example 14: Burn
    console.log('\n   h) Simulating BURN...');
    const burnSim = await new TransactionBuilder(client)
      .splTokenBurn({
        mint: testMint,
        owner: testUser,
        amount: 2_000_000,
      })
      .setFeePayer(testUser)
      .setPriorityFee(1_000_000)
      .simulate();

    if (burnSim.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', burnSim.error);
    }

    // Example 15: Sync Native (wrapped SOL)
    console.log('\n   i) Simulating SYNC_NATIVE...');
    const syncNativeSim = await new TransactionBuilder(client)
      .splTokenSyncNative({
        owner: testUser,
      })
      .setFeePayer(testUser)
      .setPriorityFee(1_000_000)
      .simulate();

    if (syncNativeSim.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', syncNativeSim.error);
    }

    // ========================================================================
    // MIXED OPERATIONS (Batched)
    // ========================================================================

    console.log('\n7. Mixed Operations (Batched)');
    console.log('   ──────────────────────────\n');

    console.log('   Simulating System Transfer + SPL Transfer + Pump.fun Buy...');
    const mixedSim = await new TransactionBuilder(client)
      .systemTransfer({
        sender: testUser,
        recipient: testRecipient,
        lamports: 10_000_000,
      })
      .splTokenTransfer({
        mint: testMint,
        sourceOwner: testUser,
        destinationOwner: testRecipient,
        amount: 1_000_000,
      })
      .pumpFunBuy({
        pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
        poolAccounts: {
          coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
        },
        user: testUser,
        solAmountIn: 1_000_000,
        tokenAmountOut: 3_400_000_000,
      })
      .setFeePayer(testUser)
      .setPriorityFee(1_000_000)
      .simulate();

    if (mixedSim.success) {
      console.log('   ✓ Batched simulation passed (3 operations)');
      console.log('   All operations will execute atomically');
    } else {
      console.log('   ✗ Batched simulation failed:', mixedSim.error);
    }

    // ========================================================================
    // TRANSPORT MODES & PRODUCTION USAGE
    // ========================================================================

    console.log('\n8. Transport Modes & Production Usage');
    console.log('   ───────────────────────────────────\n');

    console.log('   For production, use FLASH transport with bribe:');
    console.log('   ');
    console.log('   const result = await new TransactionBuilder(client)');
    console.log('     .pumpFunBuy({ /* ... */ })');
    console.log('     .setFeePayer("wallet")');
    console.log('     .setPriorityFee(5_000_000)      // Higher for production');
    console.log('     .setBribe(1_000_000)            // Mandatory for FLASH');
    console.log('     .setTransport("FLASH")          // Multi-broadcast');
    console.log('     .send();');
    console.log('');
    console.log('   Available transports:');
    console.log('   - FLASH        : Multi-broadcast with MEV protection [Requires bribe]');
    console.log('   - ZERO_SLOT    : Ultra-fast with MEV protection [Requires bribe]');
    console.log('   - NOZOMI       : Low-latency with MEV protection [Requires bribe]');
    console.log('   - HELIUS_SENDER: Premium reliability with MEV protection [Requires bribe]');
    console.log('   - JITO         : MEV-protected via Jito [Requires bribe]');
    console.log('   - VANILLA      : Standard RPC (no MEV protection, no bribe)');
    console.log('   - SIMULATE     : Testing only (no broadcast, no bribe)');
    console.log('');
    console.log(
      '   IMPORTANT: All transports except VANILLA and SIMULATE require bribe >= 1_000_000'
    );

    // ========================================================================
    // BEST PRACTICES
    // ========================================================================

    console.log('\n9. Best Practices');
    console.log('   ──────────────\n');

    console.log('   ✓ Always simulate before production execution');
    console.log('   ✓ Use FLASH transport for fastest execution');
    console.log('   ✓ Set bribe (min 1_000_000) when using FLASH');
    console.log('   ✓ Provide coinCreator/poolCreator to avoid RPC requests');
    console.log('   ✓ Batch related operations for atomicity');
    console.log('   ✓ Set higher priority fees for important trades');
    console.log('   ✓ Reuse client instance across transactions');
    console.log('   ✓ Monitor client statistics for performance tracking');

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
        case ErrorCode.NONCE_POOL_EXHAUSTED:
          console.log('\n   → Nonce pool exhausted - wait and retry');
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
