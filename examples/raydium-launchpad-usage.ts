/**
 * Raydium LaunchPad Usage Examples
 *
 * This example demonstrates using the Raydium LaunchPad integration for
 * trading on Raydium LaunchPad (Bonding Curve) pools.
 *
 * Prerequisites:
 * - Install the Raydium SDK: npm install @raydium-io/raydium-sdk-v2
 * - Configure LysFlash client with a Solana connection
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, RaydiumLaunchPadUtils } from '@lyslabs.ai/lys-flash';

async function main() {
  console.log('LYS Flash - Raydium LaunchPad Examples\n');

  // ============================================================================
  // SETUP: Create client with Solana connection
  // ============================================================================

  console.log('1. Setting up client...');

  // Solana RPC connection (required for Raydium operations)
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

  // Create LysFlash client with connection
  const client = new LysFlash({
    address: 'ipc:///tmp/tx-executor.ipc',
    connection, // Shared connection for all DEX operations
    commitment: 'confirmed',
    timeout: 30000,
    verbose: true,
  });

  console.log('   Connection configured\n');

  try {
    // Example pool and user addresses (replace with real values)
    const poolAddress = 'EXAMPLE_POOL_ADDRESS_REPLACE_ME';
    const userWallet = 'YOUR_WALLET_ADDRESS_REPLACE_ME';

    // ============================================================================
    // STATIC UTILITIES (No TransactionBuilder needed)
    // ============================================================================

    console.log('2. Static Utilities (RaydiumLaunchPadUtils)');
    console.log('   ─────────────────────────────────────────\n');

    // Example: Get pool state
    console.log('   a) Getting pool state...');
    try {
      const pool = await RaydiumLaunchPadUtils.getPool(connection, poolAddress);

      console.log('      Pool Information:');
      console.log(`        Address:       ${pool.address.toBase58()}`);
      console.log(`        Base Mint:     ${pool.baseMint.toBase58()}`);
      console.log(`        Quote Mint:    ${pool.quoteMint.toBase58()}`);
      console.log(`        Virtual Base:  ${pool.virtualBase.toString()}`);
      console.log(`        Virtual Quote: ${pool.virtualQuote.toString()}`);
      console.log(`        Status:        ${pool.status}`);
      console.log(`        Creator:       ${pool.creator.toBase58()}`);
    } catch (error) {
      console.log('      (Skipping pool fetch - use a real pool address)');
    }

    // Example: Get swap quote
    console.log('\n   b) Getting swap quote...');
    try {
      const quote = await RaydiumLaunchPadUtils.getQuote(
        connection,
        poolAddress,
        1_000_000_000, // 1 SOL
        'buy', // Buy tokens with SOL
        100 // 1% slippage
      );

      console.log('      Swap Quote:');
      console.log(`        Amount In:      ${quote.amountIn.toString()}`);
      console.log(`        Amount Out:     ${quote.amountOut.toString()}`);
      console.log(`        Min Amount Out: ${quote.minimumAmountOut.toString()}`);
      console.log(`        Fee:            ${quote.fee.toString()}`);
      console.log(`        Price Impact:   ${quote.priceImpact.toFixed(4)}%`);
    } catch (error) {
      console.log('      (Skipping quote - use a real pool address)');
    }

    // ============================================================================
    // TRANSACTION BUILDER: SWAP OPERATIONS
    // ============================================================================

    console.log('\n3. Swap Operations');
    console.log('   ─────────────────\n');

    // Example: Buy tokens using buy()
    console.log('   a) Buy tokens (SOL -> Token)...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .raydium.launchpad.buy({
          pool: poolAddress,
          user: userWallet,
          solAmountIn: 1_000_000_000,    // 1 SOL
          minTokensOut: 1000000,          // Min tokens expected
        });

      const result = await builder
        .setFeePayer(userWallet)
        .setPriorityFee(1_000_000)
        .setBribe(1_000_000)
        .setTransport('FLASH')
        .send();

      console.log('Signature:', result.signature);
    `);

    // Example: Sell tokens using sell()
    console.log('   b) Sell tokens (Token -> SOL)...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .raydium.launchpad.sell({
          pool: poolAddress,
          user: userWallet,
          tokenAmountIn: 1000000,         // Tokens to sell
          minSolOut: 500_000_000,         // Min SOL expected (0.5 SOL)
        });

      const result = await builder
        .setFeePayer(userWallet)
        .setPriorityFee(1_000_000)
        .setBribe(1_000_000)
        .setTransport('FLASH')
        .send();
    `);

    // Example: Generic swap with direction
    console.log('   c) Generic swap with direction...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .raydium.launchpad.swap({
          pool: poolAddress,
          user: userWallet,
          amountIn: 1_000_000_000,
          minimumAmountOut: 1000000,
          direction: 'buy',  // or 'sell'
        });
    `);

    // ============================================================================
    // COMPLETE TRADING FLOW EXAMPLE
    // ============================================================================

    console.log('\n4. Complete Trading Flow Example');
    console.log('   ────────────────────────────────\n');

    console.log('   Full example: Quote -> Build -> Send');
    console.log(`
      import { Connection } from '@solana/web3.js';
      import { LysFlash, TransactionBuilder, RaydiumLaunchPadUtils } from '@lyslabs.ai/lys-flash';

      async function buyTokens() {
        const connection = new Connection('https://api.mainnet-beta.solana.com');
        const client = new LysFlash({
          address: 'ipc:///tmp/tx-executor.ipc',
          connection,
        });

        const poolAddress = 'YOUR_POOL_ADDRESS';
        const userWallet = 'YOUR_WALLET_ADDRESS';
        const solAmount = 1_000_000_000; // 1 SOL

        // Step 1: Get quote to determine min output
        const quote = await RaydiumLaunchPadUtils.getQuote(
          connection,
          poolAddress,
          solAmount,
          'buy',
          100  // 1% slippage
        );

        console.log('Expected tokens:', quote.amountOut.toString());
        console.log('Min tokens (with slippage):', quote.minimumAmountOut.toString());

        // Step 2: Build and send transaction
        const builder = await new TransactionBuilder(client)
          .raydium.launchpad.buy({
            pool: poolAddress,
            user: userWallet,
            solAmountIn: solAmount,
            minTokensOut: quote.minimumAmountOut,
          });

        const result = await builder
          .setFeePayer(userWallet)
          .setPriorityFee(1_000_000)
          .setBribe(1_000_000)
          .setTransport('FLASH')
          .send();

        if (result.success) {
          console.log('Transaction successful!');
          console.log('Signature:', result.signature);
        } else {
          console.error('Transaction failed:', result.error);
        }

        client.close();
      }

      buyTokens().catch(console.error);
    `);

    // ============================================================================
    // BEST PRACTICES
    // ============================================================================

    console.log('\n5. Best Practices');
    console.log('   ──────────────\n');

    console.log('   Always get a quote before executing swaps');
    console.log('   Use appropriate slippage (100 bps = 1%)');
    console.log('   Use FLASH transport for fastest execution');
    console.log('   Set bribe (min 1_000_000) when using FLASH');
    console.log('   Validate pool exists before trading');

    console.log('\n All examples completed!\n');
  } catch (error) {
    console.error('\n Error occurred:', error);
  } finally {
    client.close();
    console.log('Client closed.\n');
  }
}

// Run example
main().catch(console.error);
