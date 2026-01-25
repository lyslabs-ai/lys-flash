/**
 * Raydium CPMM Usage Examples
 *
 * This example demonstrates using the Raydium CPMM integration for
 * trading on Raydium Constant Product Market Maker pools.
 *
 * Prerequisites:
 * - Install the Raydium SDK: npm install @raydium-io/raydium-sdk-v2
 * - Configure LysFlash client with a Solana connection
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { LysFlash, TransactionBuilder, RaydiumCPMMUtils } from '@lyslabs.ai/lys-flash';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function main() {
  console.log('LYS Flash - Raydium CPMM Examples\n');

  // ============================================================================
  // SETUP: Create client with Solana connection
  // ============================================================================

  console.log('1. Setting up client...');

  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

  const client = new LysFlash({
    address: 'ipc:///tmp/tx-executor.ipc',
    connection,
    commitment: 'confirmed',
    timeout: 30000,
    verbose: true,
  });

  console.log('   Connection configured\n');

  try {
    const poolAddress = 'EXAMPLE_POOL_ADDRESS_REPLACE_ME';
    const userWallet = 'YOUR_WALLET_ADDRESS_REPLACE_ME';
    const tokenMint = 'TOKEN_MINT_ADDRESS_REPLACE_ME';

    // ============================================================================
    // STATIC UTILITIES
    // ============================================================================

    console.log('2. Static Utilities (RaydiumCPMMUtils)');
    console.log('   ────────────────────────────────────\n');

    // Get pool state
    console.log('   a) Getting pool state...');
    try {
      const pool = await RaydiumCPMMUtils.getPool(connection, poolAddress);

      console.log('      Pool Information:');
      console.log(`        Address:      ${pool.address.toBase58()}`);
      console.log(`        Mint A:       ${pool.mintA.toBase58()}`);
      console.log(`        Mint B:       ${pool.mintB.toBase58()}`);
      console.log(`        Reserve A:    ${pool.mintAAmount.toString()}`);
      console.log(`        Reserve B:    ${pool.mintBAmount.toString()}`);
      console.log(`        LP Supply:    ${pool.lpSupply.toString()}`);
      console.log(`        Fee Rate:     ${pool.feeRate} bps`);
    } catch (error) {
      console.log('      (Skipping pool fetch - use a real pool address)');
    }

    // Get ExactIn quote
    console.log('\n   b) Getting ExactIn swap quote...');
    try {
      const quote = await RaydiumCPMMUtils.getQuote(
        connection,
        poolAddress,
        SOL_MINT,
        1_000_000_000, // 1 SOL
        100 // 1% slippage
      );

      console.log('      Swap Quote (ExactIn):');
      console.log(`        Amount In:       ${quote.amountIn.toString()}`);
      console.log(`        Amount Out:      ${quote.amountOut.toString()}`);
      console.log(`        Min Amount Out:  ${quote.minimumAmountOut.toString()}`);
      console.log(`        Fee:             ${quote.fee.toString()}`);
      console.log(`        Price Impact:    ${quote.priceImpact.toFixed(4)}%`);
    } catch (error) {
      console.log('      (Skipping quote - use a real pool address)');
    }

    // Get ExactOut quote
    console.log('\n   c) Getting ExactOut swap quote...');
    try {
      const quote = await RaydiumCPMMUtils.getQuoteExactOut(
        connection,
        poolAddress,
        tokenMint,
        1_000_000, // 1M tokens
        100 // 1% slippage
      );

      console.log('      Swap Quote (ExactOut):');
      console.log(`        Amount In:       ${quote.amountIn.toString()}`);
      console.log(`        Amount Out:      ${quote.amountOut.toString()}`);
      console.log(`        Max Amount In:   ${quote.maximumAmountIn.toString()}`);
      console.log(`        Fee:             ${quote.fee.toString()}`);
      console.log(`        Price Impact:    ${quote.priceImpact.toFixed(4)}%`);
    } catch (error) {
      console.log('      (Skipping quote - use a real pool address)');
    }

    // ============================================================================
    // TRANSACTION BUILDER: SWAP OPERATIONS
    // ============================================================================

    console.log('\n3. Swap Operations');
    console.log('   ─────────────────\n');

    // ExactIn swap
    console.log('   a) Generic swap (ExactIn)...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .raydium.cpmm.swap({
          pool: poolAddress,
          user: userWallet,
          inputMint: SOL_MINT,
          outputMint: tokenMint,
          amountIn: 1_000_000_000,
          minimumAmountOut: 1000000,
        });
    `);

    // ExactOut swap
    console.log('   b) Generic swap (ExactOut)...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .raydium.cpmm.swapExactOut({
          pool: poolAddress,
          user: userWallet,
          inputMint: SOL_MINT,
          outputMint: tokenMint,
          amountOut: 1000000,
          maximumAmountIn: 1_100_000_000,
        });
    `);

    // Buy tokens
    console.log('   c) Buy tokens (SOL -> Token)...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .raydium.cpmm.buy({
          pool: poolAddress,
          user: userWallet,
          tokenMint: tokenMint,
          solAmountIn: 1_000_000_000,
          minTokensOut: 1000000,
        });

      const result = await builder
        .setFeePayer(userWallet)
        .setPriorityFee(1_000_000)
        .setBribe(1_000_000)
        .setTransport('FLASH')
        .send();
    `);

    // Sell tokens
    console.log('   d) Sell tokens (Token -> SOL)...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .raydium.cpmm.sell({
          pool: poolAddress,
          user: userWallet,
          tokenMint: tokenMint,
          tokenAmountIn: 1000000,
          minSolOut: 900_000_000,
        });
    `);

    // Buy exact tokens
    console.log('   e) Buy exact token amount (ExactOut)...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .raydium.cpmm.buyExactOut({
          pool: poolAddress,
          user: userWallet,
          tokenMint: tokenMint,
          amountOut: 1000000,          // Exact tokens to receive
          maximumAmountIn: 1_100_000_000, // Max SOL to spend
        });
    `);

    // Sell for exact SOL
    console.log('   f) Sell for exact SOL amount (ExactOut)...');
    console.log('      Code example:');
    console.log(`
      const builder = await new TransactionBuilder(client)
        .raydium.cpmm.sellExactOut({
          pool: poolAddress,
          user: userWallet,
          tokenMint: tokenMint,
          amountOut: 1_000_000_000,    // Exact SOL to receive
          maximumAmountIn: 1_100_000,  // Max tokens to spend
        });
    `);

    // ============================================================================
    // COMPLETE TRADING FLOW
    // ============================================================================

    console.log('\n4. Complete Trading Flow Example');
    console.log('   ────────────────────────────────\n');

    console.log(`
      import { Connection } from '@solana/web3.js';
      import { LysFlash, TransactionBuilder, RaydiumCPMMUtils } from '@lyslabs.ai/lys-flash';

      async function buyTokens() {
        const connection = new Connection('https://api.mainnet-beta.solana.com');
        const client = new LysFlash({
          address: 'ipc:///tmp/tx-executor.ipc',
          connection,
        });

        const poolAddress = 'YOUR_POOL_ADDRESS';
        const userWallet = 'YOUR_WALLET_ADDRESS';
        const tokenMint = 'YOUR_TOKEN_MINT';
        const solAmount = 1_000_000_000; // 1 SOL

        // Step 1: Get quote
        const quote = await RaydiumCPMMUtils.getQuote(
          connection,
          poolAddress,
          'So11111111111111111111111111111111111111112',
          solAmount,
          100  // 1% slippage
        );

        console.log('Expected tokens:', quote.amountOut.toString());
        console.log('Price impact:', quote.priceImpact.toFixed(4) + '%');

        // Step 2: Build and send transaction
        const builder = await new TransactionBuilder(client)
          .raydium.cpmm.buy({
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

    console.log('\n5. Best Practices');
    console.log('   ──────────────\n');

    console.log('   Always get a quote before executing swaps');
    console.log('   Check price impact - CPMM has x*y=k formula');
    console.log('   Large trades have higher price impact');
    console.log('   Use appropriate slippage (100 bps = 1%)');
    console.log('   Use FLASH transport for fastest execution');
    console.log('   Set bribe (min 1_000_000) when using FLASH');

    console.log('\n All examples completed!\n');
  } catch (error) {
    console.error('\n Error occurred:', error);
  } finally {
    client.close();
    console.log('Client closed.\n');
  }
}

main().catch(console.error);
