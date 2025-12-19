/**
 * Basic usage example for @lyslabs.ai/lys-flash
 *
 * This example demonstrates:
 * - Creating a client
 * - Simulating a transaction
 * - Executing a transaction
 * - Handling errors
 * - Getting statistics
 */

import { LysFlash, TransactionBuilder, ExecutionError, ErrorCode } from '@lyslabs.ai/lys-flash';

async function main() {
  console.log('LYS Flash - Basic Usage Example\n');

  // Create client
  console.log('1. Creating client...');
  const client = new LysFlash({
    address: 'ipc:///tmp/tx-executor.ipc',
    timeout: 30000,
    verbose: true,
  });

  console.log('   ✓ Client created\n');

  try {
    // Example: Buy tokens on Pump.fun
    console.log('2. Simulating Pump.fun buy...');

    const simulation = await new TransactionBuilder(client)
      .pumpFunBuy({
        pool: 'YourTokenMintAddress',
        poolAccounts: { coinCreator: 'CreatorWalletAddress' },
        user: 'YourWalletAddress',
        solAmountIn: 1_000_000, // 0.001 SOL
        tokenAmountOut: 3_400_000_000, // Min 3.4B tokens
      })
      .setFeePayer('YourWalletAddress')
      .setPriorityFee(1_000_000) // 0.001 SOL priority fee
      .simulate(); // Simulate first (no broadcast)

    if (simulation.success) {
      console.log('   ✓ Simulation passed');
      console.log('   Logs:', simulation.logs?.slice(0, 3).join('\n        '));
    } else {
      console.log('   ✗ Simulation failed:', simulation.error);
      return;
    }

    console.log('\n3. Executing transaction with FLASH transport...');

    const result = await new TransactionBuilder(client)
      .pumpFunBuy({
        pool: 'YourTokenMintAddress',
        poolAccounts: { coinCreator: 'CreatorWalletAddress' },
        user: 'YourWalletAddress',
        solAmountIn: 1_000_000,
        tokenAmountOut: 3_400_000_000,
      })
      .setFeePayer('YourWalletAddress')
      .setPriorityFee(5_000_000) // Higher priority for production
      .setBribe(1_000_000) // Jito tip for MEV protection
      .setTransport('FLASH') // Multi-broadcast (fastest)
      .send();

    if (result.success) {
      console.log('   ✓ Transaction executed successfully!');
      console.log('   Signature:', result.signature);
      console.log('   Latency:', result.latency, 'ms');
      console.log('   Slot:', result.slot);
    } else {
      console.log('   ✗ Transaction failed:', result.error);
    }

    // Get statistics
    console.log('\n4. Client statistics:');
    const stats = client.getStats();
    console.log(`   Requests sent: ${stats.requestsSent}`);
    console.log(`   Successful: ${stats.requestsSuccessful}`);
    console.log(`   Failed: ${stats.requestsFailed}`);
    console.log(
      `   Success rate: ${((stats.requestsSuccessful / stats.requestsSent) * 100).toFixed(2)}%`
    );
    console.log(`   Average latency: ${stats.averageLatency.toFixed(2)}ms`);
    console.log(`   Connected: ${stats.connected}`);
  } catch (error) {
    console.error('\nError occurred:');

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
        default:
          console.log(`\n   → Unexpected error: ${error.code}`);
      }
    } else {
      console.error('   Unknown error:', error);
    }
  } finally {
    // Clean up
    console.log('\n5. Closing client...');
    client.close();
    console.log('   ✓ Client closed\n');
  }
}

// Run example
main().catch(console.error);
