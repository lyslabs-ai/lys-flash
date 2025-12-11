# Wallet Management Guide

Complete guide to secure wallet creation and management with LYS Flash.

## Overview

The client library provides **dual-encrypted wallet creation** for maximum security:

1. **Server-side encryption** (AES-256-GCM) - Wallets encrypted with master secret
2. **Client-side encryption** (TweetNaCl box) - Additional encryption with user's public key

This ensures that:
- Server never stores plaintext secret keys
- Only the user can decrypt their wallets
- Perfect forward secrecy
- Secure key conversion (Ed25519 → Curve25519)

## Installation

```bash
npm install @lyslabs.ai/lys-flash @solana/web3.js tweetnacl
```

## Quick Start

### Creating a Wallet

```typescript
import { LysFlash } from '@lyslabs.ai/lys-flash';
import { Keypair } from '@solana/web3.js';

const client = new LysFlash();

// Your keypair for encryption
const userKeypair = Keypair.generate();

// Create new wallet
const wallet = await client.createWallet(
  userKeypair.publicKey.toBase58()
);

console.log("New wallet:", wallet.publicKey);
```

### Decrypting a Wallet

```typescript
import nacl from 'tweetnacl';

// Decrypt the secret key
const decryptedSecretKey = nacl.box.open(
  Buffer.from(wallet.encryptedSecretKey, 'base64'),
  Buffer.from(wallet.nonce, 'base64'),
  Buffer.from(wallet.ephemeralPublicKey, 'base64'),
  userKeypair.secretKey
);

if (decryptedSecretKey) {
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(decryptedSecretKey)
  );
  console.log("Wallet ready:", walletKeypair.publicKey.toBase58());
}
```

## Complete Example

See [examples/wallet-management.ts](./examples/wallet-management.ts) for a full implementation including:

- Wallet creation
- Secure storage (encrypted JSON)
- Wallet decryption
- Using wallets for transactions
- Best practices
- Error handling

Run the example:

```bash
npm install
npm run build
ts-node examples/wallet-management.ts
```

## API Reference

### `createWallet(userPublicKey: string): Promise<WalletCreationResponse>`

Creates a new wallet with dual encryption.

**Parameters:**
- `userPublicKey` - User's Solana public key (base58 encoded) for encryption

**Returns:**
```typescript
{
  success: true,
  publicKey: string,              // New wallet address
  encryptedSecretKey: string,     // User-encrypted (base64)
  nonce: string,                  // Encryption nonce (base64)
  ephemeralPublicKey: string      // For decryption (base64)
}
```

**Example:**
```typescript
const wallet = await client.createWallet(
  userKeypair.publicKey.toBase58()
);
```

## Storage

Store encrypted wallets securely:

```typescript
interface WalletStorage {
  publicKey: string;
  encryptedSecretKey: string;
  nonce: string;
  ephemeralPublicKey: string;
  createdAt: string;
  label?: string;
}

// Save to database or encrypted storage
const walletData: WalletStorage = {
  publicKey: wallet.publicKey,
  encryptedSecretKey: wallet.encryptedSecretKey,
  nonce: wallet.nonce,
  ephemeralPublicKey: wallet.ephemeralPublicKey,
  createdAt: new Date().toISOString(),
  label: "Trading Wallet #1"
};

// In production: save to encrypted database
await db.wallets.insert(walletData);
```

## Security Best Practices

### 1. User Keypair Security

```typescript
// ❌ BAD: Hardcoded in code
const userKeypair = Keypair.fromSecretKey(
  new Uint8Array([1, 2, 3, ...])
);

// ✅ GOOD: Load from environment
const userSecretKey = process.env.USER_SECRET_KEY;
const userKeypair = Keypair.fromSecretKey(
  bs58.decode(userSecretKey)
);

// ✅ BETTER: Use hardware wallet
const userKeypair = await hardwareWallet.getKeypair();
```

### 2. Encrypted Storage

```typescript
// ❌ BAD: Plain JSON file
fs.writeFileSync('wallets.json', JSON.stringify(wallets));

// ✅ GOOD: Encrypted database
await db.wallets.insert(encryptWallet(wallet));

// ✅ BETTER: Hardware security module (HSM)
await hsm.storeEncrypted(wallet);
```

### 3. Never Log Secret Keys

```typescript
// ❌ BAD
console.log("Secret key:", secretKey);

// ✅ GOOD
console.log("Public key:", wallet.publicKey);
```

### 4. Implement Rate Limiting

```typescript
// Limit wallet creation per user/IP
const rateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 wallets per window
});

app.post('/create-wallet', rateLimit, async (req, res) => {
  const wallet = await client.createWallet(req.user.publicKey);
  res.json(wallet);
});
```

### 5. Wallet Address Whitelist

```typescript
// Only allow transactions from known wallets
const allowedWallets = new Set(await db.wallets.getPublicKeys());

if (!allowedWallets.has(transaction.user)) {
  throw new Error("Wallet not authorized");
}
```

### 6. Rotate Master Secret

```typescript
// Server-side: Rotate master secret regularly
// This requires re-encrypting all wallets
async function rotateMasterSecret() {
  const oldSecret = process.env.WALLET_MASTER_SECRET;
  const newSecret = generateNewSecret();

  const wallets = await db.wallets.findAll();

  for (const wallet of wallets) {
    // Decrypt with old secret
    const decrypted = await decrypt(wallet, oldSecret);
    // Re-encrypt with new secret
    const reencrypted = await encrypt(decrypted, newSecret);
    await db.wallets.update(wallet.id, reencrypted);
  }

  process.env.WALLET_MASTER_SECRET = newSecret;
}
```

## Error Handling

```typescript
import { ExecutionError, ErrorCode } from '@lyslabs.ai/lys-flash';

try {
  const wallet = await client.createWallet(userPublicKey);

  const decryptedSecretKey = nacl.box.open(
    Buffer.from(wallet.encryptedSecretKey, 'base64'),
    Buffer.from(wallet.nonce, 'base64'),
    Buffer.from(wallet.ephemeralPublicKey, 'base64'),
    userKeypair.secretKey
  );

  if (!decryptedSecretKey) {
    throw new Error("Failed to decrypt wallet");
  }

  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(decryptedSecretKey)
  );

} catch (error) {
  if (error instanceof ExecutionError) {
    switch (error.code) {
      case ErrorCode.NETWORK_ERROR:
        console.error("Network error, retry later");
        break;
      case ErrorCode.CONNECTION_ERROR:
        console.error("Cannot connect to execution engine");
        break;
      default:
        console.error("Unexpected error:", error.message);
    }
  } else {
    console.error("Decryption failed:", error);
  }
}
```

## Production Checklist

Before deploying to production:

- [ ] User keypairs stored securely (environment variables or hardware wallet)
- [ ] Encrypted wallets stored in secure database (not plain JSON files)
- [ ] Rate limiting implemented for wallet creation
- [ ] Wallet address whitelist enforced
- [ ] Logging configured (no secret key logging)
- [ ] Master secret rotation schedule defined
- [ ] Backup strategy for encrypted wallets
- [ ] Monitoring and alerting set up
- [ ] Access control for wallet operations
- [ ] Regular security audits scheduled

## FAQ

### Why dual encryption?

Dual encryption provides defense in depth:
1. **Server-side encryption** protects wallets at rest on the server
2. **Client-side encryption** ensures only the user can decrypt

Even if the server is compromised, wallets remain encrypted with the user's key.

### Can I use my own encryption method?

Yes! The `createWallet()` method returns the encrypted wallet. You can:
1. Decrypt it on the server
2. Re-encrypt with your own method
3. Store however you prefer

### How do I recover a wallet if I lose my user keypair?

You cannot. This is by design - only the user can decrypt their wallets. Always:
- Back up user keypairs securely
- Implement account recovery mechanisms (e.g., backup codes)
- Consider using hardware wallets for user keypairs

### Can I create wallets without the execution engine?

No. Wallet creation uses the execution engine's secure wallet generation service. This ensures:
- Server-side encryption with master secret
- Consistent wallet management
- Centralized security controls

### How many wallets can I create?

There's no hard limit, but implement rate limiting to prevent abuse. Recommended limits:
- Development: 10 wallets per hour
- Production: 5 wallets per 15 minutes per user

## Support

- [GitHub Issues](https://github.com/lyslabs-ai/lys-flash/issues)
- [Main README](./README.md)
- [Examples](./examples/)

## License

MIT © LYS Labs lyslabs.ai
