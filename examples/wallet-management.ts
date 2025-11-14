/**
 * Wallet Management Example
 *
 * This example demonstrates:
 * - Creating new wallets with dual encryption
 * - Decrypting wallets on the client side
 * - Storing encrypted wallets securely
 * - Using created wallets for transactions
 * - Best practices for wallet security
 */

import { SolanaExecutionClient, TransactionBuilder } from '@lyslabs.ai/lys-flash';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import * as fs from 'fs';
import * as path from 'path';

// Simulated secure storage (in production, use encrypted database)
interface WalletStorage {
  publicKey: string;
  encryptedSecretKey: string;
  nonce: string;
  ephemeralPublicKey: string;
  createdAt: string;
  label?: string;
}

class WalletManager {
  private client: SolanaExecutionClient;
  private userKeypair: Keypair;
  private storageFile: string;

  constructor(userKeypairSecretKey: Uint8Array, storageFile: string = './wallets.json') {
    this.client = new SolanaExecutionClient();
    this.userKeypair = Keypair.fromSecretKey(userKeypairSecretKey);
    this.storageFile = storageFile;
  }

  /**
   * Create a new wallet
   */
  async createWallet(label?: string): Promise<WalletStorage> {
    console.log('\n📝 Creating new wallet...');

    try {
      // Create wallet via execution engine
      const wallet = await this.client.createWallet(this.userKeypair.publicKey.toBase58());

      if (!wallet.success) {
        throw new Error('Failed to create wallet');
      }

      console.log('✓ Wallet created successfully!');
      console.log(`  Public key: ${wallet.publicKey}`);

      // Prepare storage object
      const walletStorage: WalletStorage = {
        publicKey: wallet.publicKey,
        encryptedSecretKey: wallet.encryptedSecretKey,
        nonce: wallet.nonce,
        ephemeralPublicKey: wallet.ephemeralPublicKey,
        createdAt: new Date().toISOString(),
        label,
      };

      // Save to storage
      this.saveWallet(walletStorage);

      return walletStorage;
    } catch (error) {
      console.error('✗ Failed to create wallet:', error);
      throw error;
    }
  }

  /**
   * Decrypt a wallet to get the Keypair
   */
  decryptWallet(walletStorage: WalletStorage): Keypair | null {
    console.log(`\n🔓 Decrypting wallet ${walletStorage.publicKey}...`);

    try {
      // Decrypt the secret key using TweetNaCl
      const decryptedSecretKey = nacl.box.open(
        Buffer.from(walletStorage.encryptedSecretKey, 'base64'),
        Buffer.from(walletStorage.nonce, 'base64'),
        Buffer.from(walletStorage.ephemeralPublicKey, 'base64'),
        this.userKeypair.secretKey
      );

      if (!decryptedSecretKey) {
        console.error('✗ Failed to decrypt wallet - invalid encryption');
        return null;
      }

      // Create Keypair from decrypted secret
      const keypair = Keypair.fromSecretKey(new Uint8Array(decryptedSecretKey));

      // Verify the public key matches
      if (keypair.publicKey.toBase58() !== walletStorage.publicKey) {
        console.error('✗ Public key mismatch after decryption');
        return null;
      }

      console.log('✓ Wallet decrypted successfully!');
      return keypair;
    } catch (error) {
      console.error('✗ Failed to decrypt wallet:', error);
      return null;
    }
  }

  /**
   * Get all stored wallets
   */
  getStoredWallets(): WalletStorage[] {
    try {
      if (!fs.existsSync(this.storageFile)) {
        return [];
      }

      const data = fs.readFileSync(this.storageFile, 'utf8');
      return JSON.parse(data) as WalletStorage[];
    } catch (error) {
      console.error('Error reading wallets:', error);
      return [];
    }
  }

  /**
   * Save wallet to storage
   */
  private saveWallet(wallet: WalletStorage): void {
    const wallets = this.getStoredWallets();
    wallets.push(wallet);

    fs.writeFileSync(this.storageFile, JSON.stringify(wallets, null, 2), 'utf8');
    console.log(`✓ Wallet saved to ${this.storageFile}`);
  }

  /**
   * Use a wallet for a transaction
   */
  async useWallet(walletStorage: WalletStorage, mintAddress: string): Promise<void> {
    console.log(`\n💸 Using wallet ${walletStorage.publicKey} for transaction...`);

    // Decrypt the wallet
    const keypair = this.decryptWallet(walletStorage);
    if (!keypair) {
      throw new Error('Failed to decrypt wallet');
    }

    // Simulate a buy transaction
    console.log('  Simulating Pump.fun buy...');
    const simulation = await new TransactionBuilder(this.client)
      .pumpFunBuy({
        pool: mintAddress,
        poolAccounts: { coinCreator: 'CreatorWalletAddress' },
        user: keypair.publicKey.toBase58(),
        solAmountIn: 1_000_000, // 0.001 SOL
        tokenAmountOut: 3_400_000_000, // Min 3.4B tokens
      })
      .setFeePayer(keypair.publicKey.toBase58())
      .setPriorityFee(1_000_000)
      .setTransport('SIMULATE')
      .send();

    if (simulation.success) {
      console.log('✓ Simulation passed!');
      console.log('  Ready to execute on mainnet');
    } else {
      console.log('✗ Simulation failed:', simulation.error);
    }
  }

  /**
   * Clean up
   */
  close(): void {
    this.client.close();
  }
}

// ============================================================================
// Example Usage
// ============================================================================

async function main() {
  console.log('🔐 Wallet Management Example\n');
  console.log('This example demonstrates secure wallet creation and management.');

  // Step 1: Create or load user keypair (in production, load from secure storage)
  console.log('\n1. Setting up user keypair...');
  const userKeypair = Keypair.generate(); // In production: load from env or secure storage
  console.log(`   User public key: ${userKeypair.publicKey.toBase58()}`);

  // Step 2: Initialize wallet manager
  const walletManager = new WalletManager(
    userKeypair.secretKey,
    path.join(__dirname, 'example-wallets.json')
  );

  try {
    // Step 3: Create multiple wallets
    console.log('\n2. Creating wallets...');

    const wallet1 = await walletManager.createWallet('Trading Wallet #1');
    await new Promise((resolve) => setTimeout(resolve, 500)); // Brief delay

    const wallet2 = await walletManager.createWallet('Trading Wallet #2');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const wallet3 = await walletManager.createWallet('Reserve Wallet');

    // Step 4: List all wallets
    console.log('\n3. Listing all wallets:');
    const wallets = walletManager.getStoredWallets();
    wallets.forEach((wallet, index) => {
      console.log(`   ${index + 1}. ${wallet.label || 'Unnamed'}`);
      console.log(`      Address: ${wallet.publicKey}`);
      console.log(`      Created: ${new Date(wallet.createdAt).toLocaleString()}`);
    });

    // Step 5: Decrypt and verify wallets
    console.log('\n4. Verifying wallet decryption:');
    for (const wallet of wallets) {
      const keypair = walletManager.decryptWallet(wallet);
      if (keypair) {
        console.log(`   ✓ ${wallet.label}: ${keypair.publicKey.toBase58()}`);
      } else {
        console.log(`   ✗ ${wallet.label}: Decryption failed`);
      }
    }

    // Step 6: Use a wallet for a transaction (simulation)
    console.log('\n5. Testing wallet usage:');
    await walletManager.useWallet(wallet1, 'TokenMintAddressHere');

    // Step 7: Security best practices
    console.log('\n6. Security Best Practices:');
    console.log('   ✓ Wallets are encrypted twice (server + client)');
    console.log('   ✓ Only you can decrypt with your private key');
    console.log('   ✓ Encrypted wallets stored in JSON file');
    console.log('   ✓ In production: use encrypted database storage');
    console.log('   ✓ In production: use hardware wallet for user keypair');
    console.log('   ✓ In production: implement rate limiting');
    console.log('   ✓ In production: add wallet address whitelist');

    console.log('\n✓ Wallet management demo completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Error during wallet management:', error);
  } finally {
    // Clean up
    walletManager.close();

    // Remove example file (optional)
    const exampleFile = path.join(__dirname, 'example-wallets.json');
    if (fs.existsSync(exampleFile)) {
      fs.unlinkSync(exampleFile);
      console.log(`\nℹ️  Cleaned up example file: ${exampleFile}`);
    }
  }
}

// Run example
if (require.main === module) {
  main().catch(console.error);
}

export { WalletManager, WalletStorage };
