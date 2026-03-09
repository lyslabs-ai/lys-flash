/**
 * Pump.fun BuyExactSolIn example for @lyslabs.ai/lys-flash
 *
 * This example demonstrates buying tokens on the Pump.fun bonding curve
 * by spending an exact SOL amount and receiving at least minimum tokens.
 *
 * Use `pumpFunBuyExactSolIn` when you want to spend a precise amount of SOL.
 * Use `pumpFunBuy` when you want to receive a precise amount of tokens.
 */

import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';

async function main() {
  console.log('LYS Flash - Pump.fun BuyExactSolIn Example\n');

  const client = new LysFlash({
    address: 'ipc:///tmp/tx-executor.ipc',
    timeout: 30000,
    verbose: true,
  });

  try {
    // Buy tokens by spending exactly 1 SOL
    console.log('1. Buying tokens with exact SOL input...');

    const result = await new TransactionBuilder(client)
      .pumpFunBuyExactSolIn({
        pool: 'YourTokenMintAddress',
        tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        poolAccounts: {
          coinCreator: 'CreatorWalletAddress',
        },
        user: 'YourWalletAddress',
        solAmountIn: 1_000_000_000, // Exactly 1 SOL
        tokenAmountOut: 34_000_000_000, // Min tokens to receive (slippage protection)
        mayhemModeEnabled: false,
      })
      .setFeePayer('YourWalletAddress')
      .setPriorityFee(1_000_000)
      .setBribe(1_000_000)
      .setTransport('FLASH')
      .send();

    if (result.success) {
      console.log('   Transaction successful!');
      console.log('   Signature:', result.signature);
    } else {
      console.log('   Transaction failed:', result.error);
    }

    // Compare: pumpFunBuy vs pumpFunBuyExactSolIn
    //
    // pumpFunBuy:
    //   solAmountIn = max SOL willing to spend (upper bound)
    //   tokenAmountOut = exact tokens to receive
    //
    // pumpFunBuyExactSolIn:
    //   solAmountIn = exact SOL to spend
    //   tokenAmountOut = min tokens to receive (lower bound / slippage protection)
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.close();
    console.log('\nClient closed.');
  }
}

main().catch(console.error);
