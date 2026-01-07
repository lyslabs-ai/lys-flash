/**
 * Meteora DAMM v1 (Dynamic AMM v1) Usage Examples
 *
 * This example demonstrates using the Meteora DAMM v1 integration for
 * trading on Meteora Dynamic AMM v1 pools.
 *
 * Prerequisites:
 * - Install the Meteora Dynamic AMM SDK: npm install @meteora-ag/dynamic-amm-sdk
 * - Configure LysFlash client with a Solana connection
 */

import { Connection } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, DAMMv1Utils, SOL_MINT } from '@lyslabs.ai/lys-flash';

async function main() {
  console.log('LYS Flash - Meteora DAMM v1 Examples\n');

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

    console.log('2. Static Utilities (DAMMv1Utils)');
    console.log('   ────────────────────────────────\n');

    // Example: Get pool state
    console.log('   a) Getting pool state...');
    try {
      const pool = await DAMMv1Utils.getPool(connection, poolAddress);

      console.log('      Pool Information:');
      console.log(`        Address:        ${pool.address.toBase58()}`);
      console.log(`        Token A Mint:   ${pool.tokenAMint.toBase58()}`);
      console.log(`        Token B Mint:   ${pool.tokenBMint.toBase58()}`);
      console.log(`        Token A Decimals: ${pool.tokenADecimals}`);
      console.log(`        Token B Decimals: ${pool.tokenBDecimals}`);
    } catch (error) {
      console.log('      (Skipping pool fetch - use a real pool address)');
    }

    // Example: Get swap quote
    console.log('\n   b) Getting swap quote...');
    try {
      const quote = await DAMMv1Utils.getSwapQuote(
        connection,
        poolAddress,
        SOL_MINT, // Input: SOL
        1_000_000_000, // 1 SOL
        0.01 // 1% slippage
      );

      console.log('      Swap Quote:');
      console.log(`        Swap In Amount:  ${quote.swapInAmount.toString()}`);
      console.log(`        Swap Out Amount: ${quote.swapOutAmount.toString()}`);
      console.log(`        Min Out Amount:  ${quote.minSwapOutAmount.toString()}`);
      console.log(`        Fee:             ${quote.fee.toString()}`);
      console.log(`        Price Impact:    ${(quote.priceImpact * 100).toFixed(4)}%`);
    } catch (error) {
      console.log('      (Skipping quote - use a real pool address)');
    }

    // ============================================================================
    // TRANSACTION BUILDER: SWAP OPERATIONS
    // ============================================================================

    console.log('\n3. Swap Operations');
    console.log('   ──────────────────────────────\n');

    // Example: Buy tokens using buy()
    console.log('   a) Buy tokens (SOL -> Token)...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .meteora.dammV1.buy({
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
        .meteora.dammV1.sell({
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

    // Example: Generic swap with input mint
    console.log('   c) Generic swap with input mint...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .meteora.dammV1.swap({
          pool: poolAddress,
          user: userWallet,
          inputMint: SOL_MINT,
          amountIn: 1_000_000_000,
          minimumAmountOut: 1000000,
        });
    `);

    // ============================================================================
    // USING METEORA SDK DIRECTLY (for unsupported functions)
    // ============================================================================

    console.log('\n4. Using Meteora SDK Directly');
    console.log('   ────────────────────────────\n');

    console.log('   For operations not covered by the namespace,');
    console.log('   use the Meteora SDK directly with rawTransaction():');
    console.log(`
      import AmmImpl from '@meteora-ag/dynamic-amm-sdk';

      // Create pool instance
      const pool = await AmmImpl.create(connection, poolAddress);

      // Build transaction with Meteora SDK directly
      const depositTx = await pool.deposit(
        userWallet,
        tokenAInAmount,
        tokenBInAmount,
        poolTokenAmount
      );

      // Send via LYS Flash
      const result = await new TransactionBuilder(client)
        .rawTransaction({ transaction: depositTx })
        .setFeePayer(userWallet)
        .setTransport('FLASH')
        .setBribe(1_000_000)
        .send();
    `);

    // ============================================================================
    // COMPLETE TRADING FLOW EXAMPLE
    // ============================================================================

    console.log('\n5. Complete Trading Flow Example');
    console.log('   ────────────────────────────────\n');

    console.log('   Full example: Quote -> Build -> Send');
    console.log(`
      import { Connection } from '@solana/web3.js';
      import { LysFlash, TransactionBuilder, DAMMv1Utils, SOL_MINT } from '@lyslabs.ai/lys-flash';

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
        const quote = await DAMMv1Utils.getSwapQuote(
          connection,
          poolAddress,
          SOL_MINT,
          solAmount,
          0.01  // 1% slippage
        );

        console.log('Expected tokens:', quote.swapOutAmount.toString());
        console.log('Min tokens (with slippage):', quote.minSwapOutAmount.toString());

        // Step 2: Build and send transaction
        const builder = await new TransactionBuilder(client)
          .meteora.dammV1.buy({
            pool: poolAddress,
            user: userWallet,
            tokenMint: tokenMint,
            solAmountIn: solAmount,
            minTokensOut: quote.minSwapOutAmount,
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

    console.log('\n6. Best Practices');
    console.log('   ──────────────\n');

    console.log('   - Always get a quote before executing swaps');
    console.log('   - Use appropriate slippage (0.01 = 1%)');
    console.log('   - Use FLASH transport for fastest execution');
    console.log('   - Set bribe (min 1_000_000) when using FLASH');
    console.log('   - Use SOL_MINT constant for native SOL address');
    console.log('   - Specify tokenMint in buy/sell convenience methods');

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
