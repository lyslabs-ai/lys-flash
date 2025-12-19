/**
 * Raw API Usage Examples
 *
 * This example demonstrates using the raw client.execute() API for
 * direct transaction execution with maximum control.
 *
 * For a simpler, fluent API, see transaction-builder-usage.ts
 */

import { LysFlash, ExecutionError, ErrorCode } from '@lyslabs.ai/lys-flash';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

async function main() {
  console.log('LYS Flash - Raw API Examples\n');

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
    const buySimulation = await client.execute({
      data: {
        executionType: 'PUMP_FUN',
        eventType: 'BUY',
        pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
        poolAccounts: {
          coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3', // Optional but recommended
        },
        user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        solAmountIn: 1_000_000, // 0.001 SOL
        tokenAmountOut: 3_400_000_000, // Min 3.4B tokens
      },
      feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
      priorityFeeLamports: 1_000_000,
      transport: 'SIMULATE', // Simulate first
    });

    if (buySimulation.success) {
      console.log('      ✓ Simulation passed');
      console.log('      Logs:', buySimulation.logs?.slice(0, 2).join('\n            '));
    } else {
      console.log('      ✗ Simulation failed:', buySimulation.error);
    }

    // Example 2: SELL - Sell tokens on bonding curve
    console.log('\n   b) Simulating Pump.fun SELL...');
    const sellSimulation = await client.execute({
      data: {
        executionType: 'PUMP_FUN',
        eventType: 'SELL',
        pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
        poolAccounts: {
          coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3', // Optional but recommended
        },
        user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        tokenAmountIn: 3_400_000_000,
        minSolAmountOut: 0,
        closeAssociatedTokenAccount: false,
      },
      feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
      priorityFeeLamports: 1_000_000,
      transport: 'SIMULATE',
    });

    if (sellSimulation.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', sellSimulation.error);
    }

    // Example 3: CREATE - Create new token
    console.log('\n   c) Simulating Pump.fun CREATE...');
    const newMint = Keypair.generate();

    const createSimulation = await client.execute({
      data: {
        executionType: 'PUMP_FUN',
        eventType: 'CREATE',
        user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        pool: newMint.publicKey.toBase58(),
        mintSecretKey: bs58.encode(newMint.secretKey),
        meta: {
          name: 'Test Coin',
          symbol: 'TEST',
          uri: 'https://test.com/metadata.json',
        },
      },
      feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
      priorityFeeLamports: 1_000_000,
      transport: 'SIMULATE',
    });

    if (createSimulation.success) {
      console.log('      ✓ Simulation passed');
      console.log('      New mint:', newMint.publicKey.toBase58());
    } else {
      console.log('      ✗ Simulation failed:', createSimulation.error);
    }

    // Example 4: CREATE + BUY (Batched)
    console.log('\n   d) Simulating CREATE + BUY (batched)...');
    const batchedSimulation = await client.execute({
      data: [
        // First: Create token
        {
          executionType: 'PUMP_FUN',
          eventType: 'CREATE',
          user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          pool: newMint.publicKey.toBase58(),
          mintSecretKey: bs58.encode(newMint.secretKey),
          meta: {
            name: 'Test Coin',
            symbol: 'TEST',
            uri: 'https://test.com/metadata.json',
          },
        },
        // Second: Buy immediately
        {
          executionType: 'PUMP_FUN',
          eventType: 'BUY',
          pool: newMint.publicKey.toBase58(),
          poolAccounts: {
            coinCreator: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          },
          user: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
          solAmountIn: 10_000_000, // 0.01 SOL
          tokenAmountOut: 34_000_000_000,
        },
      ],
      feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
      priorityFeeLamports: 1_000_000,
      transport: 'SIMULATE',
    });

    if (batchedSimulation.success) {
      console.log('      ✓ Batched simulation passed (2 operations)');
    } else {
      console.log('      ✗ Batched simulation failed:', batchedSimulation.error);
    }

    // ========================================================================
    // PUMP.FUN AMM OPERATIONS (After migration to AMM)
    // ========================================================================

    console.log('\n3. Pump.fun AMM Operations');
    console.log('   ───────────────────────\n');

    // Example 5: AMM BUY - Buy on AMM
    console.log('   a) Simulating Pump.fun AMM BUY...');
    const ammBuySimulation = await client.execute({
      data: {
        executionType: 'PUMP_FUN_AMM',
        eventType: 'BUY',
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
      },
      feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
      priorityFeeLamports: 1_000_000,
      transport: 'SIMULATE',
    });

    if (ammBuySimulation.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', ammBuySimulation.error);
    }

    // Example 6: AMM SELL - Sell on AMM
    console.log('\n   b) Simulating Pump.fun AMM SELL...');
    const ammSellSimulation = await client.execute({
      data: {
        executionType: 'PUMP_FUN_AMM',
        eventType: 'SELL',
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
      },
      feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
      priorityFeeLamports: 1_000_000,
      transport: 'SIMULATE',
    });

    if (ammSellSimulation.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', ammSellSimulation.error);
    }

    // ========================================================================
    // SYSTEM TRANSFER
    // ========================================================================

    console.log('\n4. System Transfer');
    console.log('   ───────────────\n');

    console.log('   Simulating SOL transfer...');
    const transferSimulation = await client.execute({
      data: {
        executionType: 'SYSTEM_TRANSFER',
        eventType: 'TRANSFER',
        sender: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
        recipient: '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz',
        lamports: 10_000_000, // 0.01 SOL
      },
      feePayer: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
      priorityFeeLamports: 1_000_000,
      transport: 'SIMULATE',
    });

    if (transferSimulation.success) {
      console.log('   ✓ Simulation passed');
    } else {
      console.log('   ✗ Simulation failed:', transferSimulation.error);
    }

    // ========================================================================
    // SPL TOKEN OPERATIONS
    // ========================================================================

    console.log('\n5. SPL Token Operations');
    console.log('   ────────────────────\n');

    const testMint = '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump';
    const testUser = '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89';
    const testRecipient = '4xgfR7ZmV4gmEFBp165UQ1LFRBF1L5n17BvDFi2jNVyz';

    // Example 7: Token Transfer
    console.log('   a) Simulating SPL Token TRANSFER...');
    const tokenTransferSim = await client.execute({
      data: {
        executionType: 'SPL_TOKEN',
        eventType: 'TRANSFER',
        mint: testMint,
        sourceOwner: testUser,
        destinationOwner: testRecipient,
        amount: 1_000_000,
      },
      feePayer: testUser,
      priorityFeeLamports: 1_000_000,
      transport: 'SIMULATE',
    });

    if (tokenTransferSim.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', tokenTransferSim.error);
    }

    // Example 8: Create ATA
    console.log('\n   b) Simulating CREATE_ATA...');
    const createAtaSim = await client.execute({
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
    });

    if (createAtaSim.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', createAtaSim.error);
    }

    // Example 9: Approve Delegate
    console.log('\n   c) Simulating APPROVE...');
    const approveSim = await client.execute({
      data: {
        executionType: 'SPL_TOKEN',
        eventType: 'APPROVE',
        mint: testMint,
        delegate: testRecipient,
        owner: testUser,
        amount: 5_000_000,
      },
      feePayer: testUser,
      priorityFeeLamports: 1_000_000,
      transport: 'SIMULATE',
    });

    if (approveSim.success) {
      console.log('      ✓ Simulation passed');
    } else {
      console.log('      ✗ Simulation failed:', approveSim.error);
    }

    // ========================================================================
    // MIXED OPERATIONS (Batched)
    // ========================================================================

    console.log('\n6. Mixed Operations (Batched)');
    console.log('   ──────────────────────────\n');

    console.log('   Simulating System Transfer + SPL Transfer + Pump.fun Buy...');
    const mixedSim = await client.execute({
      data: [
        // System transfer
        {
          executionType: 'SYSTEM_TRANSFER',
          eventType: 'TRANSFER',
          sender: testUser,
          recipient: testRecipient,
          lamports: 10_000_000,
        },
        // SPL token transfer
        {
          executionType: 'SPL_TOKEN',
          eventType: 'TRANSFER',
          mint: testMint,
          sourceOwner: testUser,
          destinationOwner: testRecipient,
          amount: 1_000_000,
        },
        // Pump.fun buy
        {
          executionType: 'PUMP_FUN',
          eventType: 'BUY',
          pool: '5dxJHyvvhnEHV3ZH5BaNv66gmFy7NKrFbjpefryNpump',
          poolAccounts: {
            coinCreator: '4eUKGdDm7HFkZTYEsn1srZvRYRAMYt6c9eFb7QgTjuU3',
          },
          user: testUser,
          solAmountIn: 1_000_000,
          tokenAmountOut: 3_400_000_000,
        },
      ],
      feePayer: testUser,
      priorityFeeLamports: 1_000_000,
      transport: 'SIMULATE',
    });

    if (mixedSim.success) {
      console.log('   ✓ Batched simulation passed (3 operations)');
    } else {
      console.log('   ✗ Batched simulation failed:', mixedSim.error);
    }

    // ========================================================================
    // TRANSPORT MODES
    // ========================================================================

    console.log('\n7. Transport Modes');
    console.log('   ───────────────\n');

    console.log('   NOTE: For production, use FLASH transport with bribe:');
    console.log('   ');
    console.log('   const result = await client.execute({');
    console.log('     data: { /* ... */ },');
    console.log('     feePayer: "wallet",');
    console.log('     priorityFeeLamports: 5_000_000,      // Higher for production');
    console.log('     bribeLamports: 1_000_000,            // Mandatory for FLASH');
    console.log('     transport: "FLASH"                   // Multi-broadcast');
    console.log('   });');
    console.log('');
    console.log('   Available transports:');
    console.log('   - FLASH        : Multi-broadcast with MEV protection [Requires bribe]');
    console.log('   - ZERO_SLOT    : Ultra-fast with MEV protection [Requires bribe]');
    console.log('   - NOZOMI       : Low-latency with MEV protection [Requires bribe]');
    console.log('   - HELIUS_SENDER: Premium reliability with MEV protection [Requires bribe]');
    console.log('   - JITO         : MEV-protected via Jito [Requires bribe]');
    console.log('   - VANILLA      : Standard RPC (no MEV protection, no bribe)');
    console.log('   - SIMULATE     : Testing only (no broadcast, no bribe)');

    // ========================================================================
    // CLIENT STATISTICS
    // ========================================================================

    console.log('\n8. Client Statistics');
    console.log('   ─────────────────\n');

    const stats = client.getStats();
    console.log(`   Requests sent:     ${stats.requestsSent}`);
    console.log(`   Successful:        ${stats.requestsSuccessful}`);
    console.log(`   Failed:            ${stats.requestsFailed}`);
    console.log(
      `   Success rate:      ${((stats.requestsSuccessful / stats.requestsSent) * 100).toFixed(2)}%`
    );
    console.log(`   Average latency:   ${stats.averageLatency.toFixed(2)}ms`);
    console.log(`   Connected:         ${stats.connected}`);

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
    console.log('9. Closing client...');
    client.close();
    console.log('   ✓ Client closed\n');
  }
}

// Run example
main().catch(console.error);
