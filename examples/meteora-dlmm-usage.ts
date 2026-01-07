/**
 * Meteora DLMM (Dynamic Liquidity Market Maker) Usage Examples
 *
 * This example demonstrates using the Meteora DLMM integration for
 * trading on Meteora DLMM pools with concentrated liquidity.
 *
 * Prerequisites:
 * - Install the Meteora DLMM SDK: npm install @meteora-ag/dlmm
 * - Configure LysFlash client with a Solana connection
 */

import { Connection } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, DLMMUtils, SOL_MINT } from '@lyslabs.ai/lys-flash';

async function main() {
  console.log('LYS Flash - Meteora DLMM Examples\n');

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

    console.log('2. Static Utilities (DLMMUtils)');
    console.log('   ────────────────────────────────\n');

    // Example: Get pool state
    console.log('   a) Getting pool state...');
    try {
      const pool = await DLMMUtils.getPool(connection, poolAddress);

      console.log('      Pool Information:');
      console.log(`        Address:        ${pool.address.toBase58()}`);
      console.log(`        Token X Mint:   ${pool.tokenXMint.toBase58()}`);
      console.log(`        Token Y Mint:   ${pool.tokenYMint.toBase58()}`);
      console.log(`        Token X Decimals: ${pool.tokenXDecimals}`);
      console.log(`        Token Y Decimals: ${pool.tokenYDecimals}`);
      console.log(`        Active Bin ID:  ${pool.activeBinId}`);
      console.log(`        Bin Step:       ${pool.binStep}`);
      console.log(`        Base Fee:       ${pool.baseFee.toString()}`);
    } catch (error) {
      console.log('      (Skipping pool fetch - use a real pool address)');
    }

    // Example: Get active bin info
    console.log('\n   b) Getting active bin...');
    try {
      const activeBin = await DLMMUtils.getActiveBin(connection, poolAddress);

      console.log('      Active Bin:');
      console.log(`        Bin ID:         ${activeBin.binId}`);
      console.log(`        Price:          ${activeBin.price}`);
      console.log(`        Price Per Token: ${activeBin.pricePerToken}`);
      console.log(`        X Amount:       ${activeBin.xAmount.toString()}`);
      console.log(`        Y Amount:       ${activeBin.yAmount.toString()}`);
    } catch (error) {
      console.log('      (Skipping active bin - use a real pool address)');
    }

    // Example: Get swap quote (exact in)
    console.log('\n   c) Getting swap quote (exact in)...');
    try {
      const quote = await DLMMUtils.getSwapQuote(
        connection,
        poolAddress,
        SOL_MINT, // Input: SOL
        1_000_000_000, // 1 SOL
        true, // swapForY: SOL -> Token
        0.01 // 1% slippage
      );

      console.log('      Swap Quote:');
      console.log(`        Amount In:      ${quote.consumedInAmount.toString()}`);
      console.log(`        Amount Out:     ${quote.outAmount.toString()}`);
      console.log(`        Min Out Amount: ${quote.minOutAmount.toString()}`);
      console.log(`        Fee:            ${quote.fee.toString()}`);
      console.log(`        Price Impact:   ${(quote.priceImpact * 100).toFixed(4)}%`);
    } catch (error) {
      console.log('      (Skipping quote - use a real pool address)');
    }

    // Example: Get swap quote (exact out)
    console.log('\n   d) Getting swap quote (exact out)...');
    try {
      const quoteExactOut = await DLMMUtils.getSwapQuoteExactOut(
        connection,
        poolAddress,
        tokenMint, // Output: Token
        1000000, // Want exactly this many tokens
        false, // swapForY: Token -> SOL (we want tokens out, so swapForY = false)
        0.01 // 1% slippage
      );

      console.log('      Swap Quote (Exact Out):');
      console.log(`        Amount In:      ${quoteExactOut.inAmount.toString()}`);
      console.log(`        Max In Amount:  ${quoteExactOut.maxInAmount.toString()}`);
      console.log(`        Amount Out:     ${quoteExactOut.outAmount.toString()}`);
      console.log(`        Fee:            ${quoteExactOut.fee.toString()}`);
      console.log(`        Price Impact:   ${(quoteExactOut.priceImpact * 100).toFixed(4)}%`);
    } catch (error) {
      console.log('      (Skipping exact out quote - use a real pool address)');
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
        .meteora.dlmm.buy({
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
        .meteora.dlmm.sell({
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

    // Example: Buy exact amount of tokens using buyExactOut()
    console.log('   c) Buy exact tokens (exact output)...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .meteora.dlmm.buyExactOut({
          pool: poolAddress,
          user: userWallet,
          tokenMint: tokenMint,
          tokenAmountOut: 1000000,        // Exact tokens to receive
          maxSolIn: 1_500_000_000,        // Max SOL willing to pay (1.5 SOL)
        });

      const result = await builder
        .setFeePayer(userWallet)
        .setPriorityFee(1_000_000)
        .setBribe(1_000_000)
        .setTransport('FLASH')
        .send();
    `);

    // Example: Sell for exact SOL using sellExactOut()
    console.log('   d) Sell for exact SOL (exact output)...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .meteora.dlmm.sellExactOut({
          pool: poolAddress,
          user: userWallet,
          tokenMint: tokenMint,
          solAmountOut: 1_000_000_000,    // Exact SOL to receive (1 SOL)
          maxTokensIn: 2000000,            // Max tokens willing to sell
        });
    `);

    // Example: Generic swap with input/output mints
    console.log('   e) Generic swap with input/output mints...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .meteora.dlmm.swap({
          pool: poolAddress,
          user: userWallet,
          inputMint: SOL_MINT,
          outputMint: tokenMint,
          amountIn: 1_000_000_000,
          minimumAmountOut: 1000000,
        });
    `);

    // Example: Generic swapExactOut
    console.log('   f) Generic swap exact out...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .meteora.dlmm.swapExactOut({
          pool: poolAddress,
          user: userWallet,
          inputMint: SOL_MINT,
          outputMint: tokenMint,
          amountOut: 1000000,              // Exact output amount
          maximumAmountIn: 1_500_000_000,  // Max input allowed
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
      import DLMM from '@meteora-ag/dlmm';

      // Create pool instance
      const pool = await DLMM.create(connection, poolAddress);

      // Build transaction with Meteora SDK directly
      const addLiquidityTx = await pool.addLiquidityByStrategy({
        user: userWallet,
        totalXAmount: xAmount,
        totalYAmount: yAmount,
        strategy: { ... },
      });

      // Send via LYS Flash
      const result = await new TransactionBuilder(client)
        .rawTransaction({ transaction: addLiquidityTx })
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
      import { LysFlash, TransactionBuilder, DLMMUtils, SOL_MINT } from '@lyslabs.ai/lys-flash';

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
        const quote = await DLMMUtils.getSwapQuote(
          connection,
          poolAddress,
          SOL_MINT,
          solAmount,
          true,  // swapForY: SOL (X) -> Token (Y)
          0.01   // 1% slippage
        );

        console.log('Expected tokens:', quote.outAmount.toString());
        console.log('Min tokens (with slippage):', quote.minOutAmount.toString());

        // Step 2: Build and send transaction
        const builder = await new TransactionBuilder(client)
          .meteora.dlmm.buy({
            pool: poolAddress,
            user: userWallet,
            tokenMint: tokenMint,
            solAmountIn: solAmount,
            minTokensOut: quote.minOutAmount,
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
    // DLMM-SPECIFIC: UNDERSTANDING BIN ARRAYS
    // ============================================================================

    console.log('\n6. Understanding DLMM Bin Arrays');
    console.log('   ────────────────────────────────\n');

    console.log('   DLMM uses concentrated liquidity in discrete price bins.');
    console.log('   The namespace handles bin array fetching automatically.\n');

    console.log('   Key concepts:');
    console.log('   - Active Bin: Current price bin where trades execute');
    console.log('   - Bin Step: Price increment between bins (basis points)');
    console.log('   - swapForY: Direction flag (true = X -> Y, false = Y -> X)');
    console.log('   - Bin arrays must be fetched for each swap direction\n');

    console.log('   The DLMMUtils.getActiveBin() shows current trading price:');
    console.log(`
      const activeBin = await DLMMUtils.getActiveBin(connection, poolAddress);
      console.log('Current price:', activeBin.pricePerToken);
    `);

    // ============================================================================
    // BEST PRACTICES
    // ============================================================================

    console.log('\n7. Best Practices');
    console.log('   ──────────────\n');

    console.log('   - Always get a quote before executing swaps');
    console.log('   - Use appropriate slippage (0.01 = 1%)');
    console.log('   - Use FLASH transport for fastest execution');
    console.log('   - Set bribe (min 1_000_000) when using FLASH');
    console.log('   - Use SOL_MINT constant for native SOL address');
    console.log('   - Use getActiveBin() to check current pool price');
    console.log('   - Use exact out methods when you need precise output amounts');
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
