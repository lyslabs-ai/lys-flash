/**
 * Meteora DAMM v2 (Dynamic AMM v2 / CP-AMM) Usage Examples
 *
 * This example demonstrates using the Meteora DAMM v2 integration for
 * trading on Meteora CP-AMM pools.
 *
 * Prerequisites:
 * - Install the Meteora CP-AMM SDK: npm install @meteora-ag/cp-amm-sdk
 * - Configure LysFlash client with a Solana connection
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, DAMMv2Utils, SOL_MINT } from '@lyslabs.ai/lys-flash';

async function main() {
  console.log('LYS Flash - Meteora DAMM v2 Examples\n');

  // ============================================================================
  // SETUP: Create client with Solana connection
  // ============================================================================

  console.log('1. Setting up client...');

  // Solana RPC connection (required for Meteora operations)
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
    const tokenMint = 'TOKEN_MINT_ADDRESS_REPLACE_ME';

    // ============================================================================
    // STATIC UTILITIES (No TransactionBuilder needed)
    // ============================================================================

    console.log('2. Static Utilities (DAMMv2Utils)');
    console.log('   ────────────────────────────────\n');

    // Example: Get pool state
    console.log('   a) Getting pool state...');
    try {
      const pool = await DAMMv2Utils.getPool(connection, poolAddress);

      console.log('      Pool Information:');
      console.log(`        Address:      ${pool.address.toBase58()}`);
      console.log(`        Token A Mint: ${pool.tokenAMint.toBase58()}`);
      console.log(`        Token B Mint: ${pool.tokenBMint.toBase58()}`);
      console.log(`        Liquidity:    ${pool.liquidity.toString()}`);
      console.log(`        Fee Rate:     ${pool.feeRate}`);
    } catch (error) {
      console.log('      (Skipping pool fetch - use a real pool address)');
    }

    // Example: Get swap quote
    console.log('\n   b) Getting swap quote...');
    try {
      const quote = await DAMMv2Utils.getQuote(
        connection,
        poolAddress,
        SOL_MINT, // Input: SOL
        1_000_000_000, // 1 SOL
        100 // 1% slippage
      );

      console.log('      Swap Quote:');
      console.log(`        Amount In:      ${quote.amountIn.toString()}`);
      console.log(`        Amount Out:     ${quote.amountOut.toString()}`);
      console.log(`        Min Amount Out: ${quote.minimumAmountOut.toString()}`);
      console.log(`        Trading Fee:    ${quote.tradingFee.toString()}`);
      console.log(`        Price Impact:   ${quote.priceImpact.toFixed(4)}%`);
    } catch (error) {
      console.log('      (Skipping quote - use a real pool address)');
    }

    // ============================================================================
    // TRANSACTION BUILDER: BASIC SWAP OPERATIONS (swap)
    // ============================================================================

    console.log('\n3. Basic Swap Operations (swap)');
    console.log('   ──────────────────────────────\n');

    // Example: Buy tokens using buy()
    console.log('   a) Buy tokens (SOL -> Token)...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .meteora.dammV2.buy({
          pool: poolAddress,
          user: userWallet,
          tokenMint: tokenMint,
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
        .meteora.dammV2.sell({
          pool: poolAddress,
          user: userWallet,
          tokenMint: tokenMint,
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

    // Example: Generic swap with input/output mints
    console.log('   c) Generic swap with input/output mints...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .meteora.dammV2.swap({
          pool: poolAddress,
          user: userWallet,
          inputMint: 'So11111111111111111111111111111111111111112', // SOL
          outputMint: tokenMint,
          amountIn: 1_000_000_000,
          minimumAmountOut: 1000000,
        });
    `);

    // ============================================================================
    // TRANSACTION BUILDER: ADVANCED SWAP OPERATIONS (swap2)
    // ============================================================================

    console.log('\n4. Advanced Swap Operations (swap2)');
    console.log('   ──────────────────────────────────\n');

    // Example: ExactIn mode (buy exact SOL worth of tokens)
    console.log('   a) ExactIn mode - Buy with exact SOL amount...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .meteora.dammV2.buy2({
          pool: poolAddress,
          user: userWallet,
          tokenMint: tokenMint,
          amountIn: 1_000_000_000,        // Exact 1 SOL to spend
          minimumAmountOut: 1000000,       // Min tokens to receive
        });
    `);

    // Example: ExactOut mode (buy exact number of tokens)
    console.log('   b) ExactOut mode - Buy exact token amount...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .meteora.dammV2.buyExactOut({
          pool: poolAddress,
          user: userWallet,
          tokenMint: tokenMint,
          amountOut: 1000000,             // Exact tokens desired
          maximumAmountIn: 2_000_000_000, // Max SOL willing to pay
        });
    `);

    // Example: Full swap2 with mode selection
    console.log('   c) Full swap2 with mode selection...');
    console.log('      Code example:');
    console.log(`
      // ExactIn mode
      const exactInBuilder = await new TransactionBuilder(client)
        .meteora.dammV2.swap2({
          pool: poolAddress,
          user: userWallet,
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: tokenMint,
          mode: 'ExactIn',
          amountIn: 1_000_000_000,
          minimumAmountOut: 1000000,
        });

      // PartialFill mode (allows partial fills)
      const partialFillBuilder = await new TransactionBuilder(client)
        .meteora.dammV2.swap2({
          pool: poolAddress,
          user: userWallet,
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: tokenMint,
          mode: 'PartialFill',
          amountIn: 1_000_000_000,
          minimumAmountOut: 500000,  // Lower min for partial fills
        });

      // ExactOut mode
      const exactOutBuilder = await new TransactionBuilder(client)
        .meteora.dammV2.swap2({
          pool: poolAddress,
          user: userWallet,
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: tokenMint,
          mode: 'ExactOut',
          amountOut: 1000000,
          maximumAmountIn: 2_000_000_000,
        });
    `);

    // ============================================================================
    // USING METEORA SDK DIRECTLY (for unsupported functions)
    // ============================================================================

    console.log('\n5. Using Meteora SDK Directly');
    console.log('   ────────────────────────────\n');

    console.log('   For operations not covered by the namespace,');
    console.log('   use the Meteora SDK directly with rawTransaction():');
    console.log(`
      import { CpAmm } from '@meteora-ag/cp-amm-sdk';

      // Build transaction with Meteora SDK directly
      const cpAmm = new CpAmm(connection, { commitment: 'confirmed' });
      const txBuilder = await cpAmm.createPool({
        // ... pool creation params
      });

      // Send via LYS Flash
      const result = await new TransactionBuilder(client)
        .rawTransaction({ transaction: txBuilder.transaction })
        .setFeePayer(userWallet)
        .setTransport('FLASH')
        .setBribe(1_000_000)
        .send();
    `);

    // ============================================================================
    // COMPLETE TRADING FLOW EXAMPLE
    // ============================================================================

    console.log('\n6. Complete Trading Flow Example');
    console.log('   ────────────────────────────────\n');

    console.log('   Full example: Quote -> Build -> Send');
    console.log(`
      import { Connection } from '@solana/web3.js';
      import { LysFlash, TransactionBuilder, DAMMv2Utils, SOL_MINT } from '@lyslabs.ai/lys-flash';

      async function buyTokens() {
        const connection = new Connection('https://api.mainnet-beta.solana.com');
        const client = new LysFlash({
          address: 'ipc:///tmp/tx-executor.ipc',
          connection,
        });

        const poolAddress = 'YOUR_POOL_ADDRESS';
        const userWallet = 'YOUR_WALLET_ADDRESS';
        const tokenMint = 'TOKEN_MINT_ADDRESS';
        const solAmount = 1_000_000_000; // 1 SOL

        // Step 1: Get quote to determine min output
        const quote = await DAMMv2Utils.getQuote(
          connection,
          poolAddress,
          SOL_MINT,
          solAmount,
          100  // 1% slippage
        );

        console.log('Expected tokens:', quote.amountOut.toString());
        console.log('Min tokens (with slippage):', quote.minimumAmountOut.toString());

        // Step 2: Build and send transaction
        const builder = await new TransactionBuilder(client)
          .meteora.dammV2.buy({
            pool: poolAddress,
            user: userWallet,
            tokenMint: tokenMint,
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

    console.log('\n7. Best Practices');
    console.log('   ──────────────\n');

    console.log('   Always get a quote before executing swaps');
    console.log('   Use appropriate slippage (100 bps = 1%)');
    console.log('   Use FLASH transport for fastest execution');
    console.log('   Set bribe (min 1_000_000) when using FLASH');
    console.log('   Use ExactOut mode when you need a specific token amount');
    console.log('   Use PartialFill mode for large orders that may partially fill');
    console.log('   Specify tokenMint in buy/sell convenience methods');
    console.log('   Use SOL_MINT constant for native SOL address');

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
