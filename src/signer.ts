import type { Keypair } from '@solana/web3.js';
import type { SigningKeypair } from './transport/transport.interface';

/**
 * Signer wraps a Solana Keypair for per-request HTTP signing.
 *
 * Used with `TransactionBuilder` to sign requests when using external API keys.
 * Different builders can use different signers against the same client instance,
 * enabling multi-wallet support.
 *
 * @example
 * ```typescript
 * import { Keypair } from '@solana/web3.js';
 * import { LysFlash, TransactionBuilder, Signer } from '@lyslabs.ai/lys-flash';
 *
 * const client = LysFlash.external({
 *   address: 'https://api.example.com',
 *   apiKey: 'sk_live_abc123',
 * });
 *
 * const signer = new Signer(Keypair.fromSecretKey(mySecretKey));
 *
 * await new TransactionBuilder(client, signer)
 *   .pumpFunBuy({ ... })
 *   .setFeePayer('wallet')
 *   .send();
 * ```
 */
export class Signer {
  /** Raw Ed25519 public key bytes */
  readonly publicKey: Uint8Array;
  /** Raw Ed25519 secret key bytes */
  readonly secretKey: Uint8Array;

  constructor(keypair: Keypair) {
    this.publicKey = keypair.publicKey.toBytes();
    this.secretKey = keypair.secretKey;
  }

  /**
   * Convert to the transport-level signing keypair format.
   * @internal
   */
  toSigningKeypair(): SigningKeypair {
    return {
      publicKey: this.publicKey,
      secretKey: this.secretKey,
    };
  }
}
