import nacl from 'tweetnacl';
import ed2curve from 'ed2curve';
import { Keypair } from '@solana/web3.js';
import { WalletCreationResponse } from '../types';

/**
 * Decrypt a wallet secret key from a WalletCreationResponse.
 *
 * Handles the Ed25519 → Curve25519 key conversion internally so callers
 * can pass their Solana `Keypair` directly.
 *
 * @param wallet - The wallet creation response containing encrypted data
 * @param userKeypair - The user's Solana keypair used during wallet creation
 * @returns The decrypted wallet Keypair
 * @throws Error if decryption fails or public key doesn't match
 *
 * @example
 * ```typescript
 * import { LysFlash, decryptWallet } from '@lyslabs.ai/lys-flash';
 * import { Keypair } from '@solana/web3.js';
 *
 * const client = new LysFlash();
 * const userKeypair = Keypair.generate();
 * const wallet = await client.createWallet(userKeypair.publicKey.toBase58());
 * const walletKeypair = decryptWallet(wallet, userKeypair);
 * ```
 */
export function decryptWallet(
  wallet: WalletCreationResponse,
  userKeypair: Keypair
): Keypair {
  const curve25519SecretKey = ed2curve.convertSecretKey(userKeypair.secretKey);
  const decrypted = nacl.box.open(
    Buffer.from(wallet.encryptedSecretKey, 'base64'),
    Buffer.from(wallet.nonce, 'base64'),
    Buffer.from(wallet.ephemeralPublicKey, 'base64'),
    curve25519SecretKey
  );
  if (!decrypted) {
    throw new Error('Failed to decrypt wallet secret key');
  }
  const walletKeypair = Keypair.fromSecretKey(new Uint8Array(decrypted));
  if (walletKeypair.publicKey.toBase58() !== wallet.publicKey) {
    throw new Error('Public key mismatch after decryption');
  }
  return walletKeypair;
}
