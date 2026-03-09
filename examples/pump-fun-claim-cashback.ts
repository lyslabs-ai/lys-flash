/**
 * Pump.fun Claim Cashback example for @lyslabs.ai/lys-flash
 *
 * This example demonstrates claiming cashback rewards from both:
 * - Bonding curve trading (pumpFunClaimCashback)
 * - AMM trading (pumpFunAmmClaimCashback)
 *
 * Cashback is available when trading tokens created with cashback enabled (CreateV2).
 */

import { LysFlash, TransactionBuilder } from '@lyslabs.ai/lys-flash';

async function main() {
  console.log('LYS Flash - Pump.fun Claim Cashback Example\n');

  const client = new LysFlash({
    address: 'ipc:///tmp/tx-executor.ipc',
    timeout: 30000,
    verbose: true,
  });

  try {
    // Claim bonding curve cashback
    console.log('1. Claiming bonding curve cashback...');

    const result1 = await new TransactionBuilder(client)
      .pumpFunClaimCashback({
        user: 'YourWalletAddress',
      })
      .setFeePayer('YourWalletAddress')
      .setPriorityFee(1_000_000)
      .setBribe(1_000_000)
      .setTransport('FLASH')
      .send();

    if (result1.success) {
      console.log('   Bonding curve cashback claimed!');
      console.log('   Signature:', result1.signature);
    } else {
      console.log('   Failed:', result1.error);
    }

    // Claim AMM cashback
    console.log('\n2. Claiming AMM cashback...');

    const result2 = await new TransactionBuilder(client)
      .pumpFunAmmClaimCashback({
        user: 'YourWalletAddress',
      })
      .setFeePayer('YourWalletAddress')
      .setPriorityFee(1_000_000)
      .setBribe(1_000_000)
      .setTransport('FLASH')
      .send();

    if (result2.success) {
      console.log('   AMM cashback claimed!');
      console.log('   Signature:', result2.signature);
    } else {
      console.log('   Failed:', result2.error);
    }

    // Claim both in a single transaction (batched)
    console.log('\n3. Claiming both cashbacks in one transaction...');

    const result3 = await new TransactionBuilder(client)
      .pumpFunClaimCashback({
        user: 'YourWalletAddress',
      })
      .pumpFunAmmClaimCashback({
        user: 'YourWalletAddress',
      })
      .setFeePayer('YourWalletAddress')
      .setPriorityFee(1_000_000)
      .setBribe(1_000_000)
      .setTransport('FLASH')
      .send();

    if (result3.success) {
      console.log('   Both cashbacks claimed!');
      console.log('   Signature:', result3.signature);
    } else {
      console.log('   Failed:', result3.error);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.close();
    console.log('\nClient closed.');
  }
}

main().catch(console.error);
