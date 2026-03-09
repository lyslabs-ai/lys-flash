/**
 * Pump.fun CreateV2 example for @lyslabs.ai/lys-flash
 *
 * This example demonstrates creating a new token on Pump.fun
 * with mayhem mode and cashback support using CreateV2.
 *
 * CreateV2 extends the original Create with:
 * - Mayhem mode: randomizes fee recipients
 * - Cashback: enables cashback rewards for traders
 */

import { Keypair } from '@solana/web3.js';
import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';

async function main() {
  console.log('LYS Flash - Pump.fun CreateV2 Example\n');

  const client = new LysFlash({
    address: 'ipc:///tmp/tx-executor.ipc',
    timeout: 30000,
    verbose: true,
  });

  try {
    // Generate a new mint keypair
    const mintKeypair = Keypair.generate();
    console.log('1. Generated mint:', mintKeypair.publicKey.toBase58());

    // Create token with mayhem mode and cashback
    console.log('2. Creating token with CreateV2...');

    const result = await new TransactionBuilder(client)
      .pumpFunCreateV2({
        user: 'YourWalletAddress',
        pool: mintKeypair.publicKey.toBase58(),
        mintSecretKey: Buffer.from(mintKeypair.secretKey).toString('base64'),
        meta: {
          name: 'My Awesome Token',
          symbol: 'MAT',
          uri: 'https://arweave.net/metadata.json',
        },
        isMayhemMode: true,
        isCashbackEnabled: true,
      })
      .setFeePayer('YourWalletAddress')
      .setPriorityFee(1_000_000)
      .setBribe(1_000_000)
      .setTransport('FLASH')
      .send();

    if (result.success) {
      console.log('   Token created successfully!');
      console.log('   Signature:', result.signature);
      console.log('   Mint:', mintKeypair.publicKey.toBase58());
    } else {
      console.log('   Token creation failed:', result.error);
    }

    // CreateV2 + Buy (atomic) — create and immediately buy in one transaction
    console.log('\n3. CreateV2 + Buy (atomic)...');

    const mintKeypair2 = Keypair.generate();

    const result2 = await new TransactionBuilder(client)
      .pumpFunCreateV2({
        user: 'YourWalletAddress',
        pool: mintKeypair2.publicKey.toBase58(),
        mintSecretKey: Buffer.from(mintKeypair2.secretKey).toString('base64'),
        meta: {
          name: 'Another Token',
          symbol: 'ATK',
          uri: 'https://arweave.net/metadata2.json',
        },
        isMayhemMode: true,
        isCashbackEnabled: true,
      })
      .pumpFunBuy({
        pool: mintKeypair2.publicKey.toBase58(),
        tokenProgram: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // Token-2022 (required for CreateV2 tokens)
        poolAccounts: {
          coinCreator: 'YourWalletAddress',
        },
        user: 'YourWalletAddress',
        solAmountIn: 10_000_000_000, // 10 SOL
        tokenAmountOut: 340_000_000_000, // Min tokens
        mayhemModeEnabled: true,
      })
      .setFeePayer('YourWalletAddress')
      .setPriorityFee(1_000_000)
      .setBribe(1_000_000)
      .setTransport('FLASH')
      .send();

    if (result2.success) {
      console.log('   Token created and bought successfully!');
      console.log('   Signature:', result2.signature);
    } else {
      console.log('   Failed:', result2.error);
    }
    // Simulate-first pattern (recommended for testing)
    console.log('\n4. Simulate before sending...');

    const mintKeypair3 = Keypair.generate();

    const builder = new TransactionBuilder(client)
      .pumpFunCreateV2({
        user: 'YourWalletAddress',
        pool: mintKeypair3.publicKey.toBase58(),
        mintSecretKey: Buffer.from(mintKeypair3.secretKey).toString('base64'),
        meta: {
          name: 'Simulated Token',
          symbol: 'SIM',
          uri: 'https://arweave.net/metadata3.json',
        },
        isMayhemMode: false,
        isCashbackEnabled: false,
      })
      .setFeePayer('YourWalletAddress')
      .setPriorityFee(1_000_000)
      .setBribe(1_000_000);

    // Simulate first
    const sim = await builder.simulate();
    console.log('   Simulation:', sim.success ? 'passed' : 'failed');

    if (sim.success) {
      // Then send for real
      const result3 = await new TransactionBuilder(client)
        .pumpFunCreateV2({
          user: 'YourWalletAddress',
          pool: mintKeypair3.publicKey.toBase58(),
          mintSecretKey: Buffer.from(mintKeypair3.secretKey).toString('base64'),
          meta: {
            name: 'Simulated Token',
            symbol: 'SIM',
            uri: 'https://arweave.net/metadata3.json',
          },
          isMayhemMode: false,
          isCashbackEnabled: false,
        })
        .setFeePayer('YourWalletAddress')
        .setPriorityFee(1_000_000)
        .setBribe(1_000_000)
        .setTransport('FLASH')
        .send();

      console.log('   Send:', result3.success ? result3.signature : result3.error);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.close();
    console.log('\nClient closed.');
  }
}

main().catch(console.error);
