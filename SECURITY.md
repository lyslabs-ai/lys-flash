# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in LYS Flash, please report it responsibly:

### Preferred Method: Email

Send details to **security@lyslabs.ai**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **24 hours**: Acknowledgment of receipt
- **7 days**: Detailed response with assessment
- **30 days**: Target timeline for fix (if applicable)

### What to Expect

1. **Acknowledgment**: We'll confirm receipt within 24 hours
2. **Assessment**: We'll evaluate the vulnerability and determine severity
3. **Communication**: We'll keep you informed of progress
4. **Credit**: You'll be credited in release notes (unless you prefer anonymity)
5. **Disclosure**: Coordinated disclosure after fix is available

## Security Best Practices

### For Users

1. **Keep dependencies updated**
   ```bash
   npm update @lyslabs.ai/lys-flash
   ```

2. **Secure wallet management**
   - Never log or transmit plaintext secret keys
   - Store encrypted wallets in secure storage
   - Use environment variables for sensitive keys
   - Rotate encryption keys regularly

3. **Connection security**
   - Use IPC sockets (`ipc://`) in production when possible
   - Secure TCP connections with TLS if using network sockets
   - Restrict socket access permissions

4. **Environment variables**
   ```bash
   # Never commit these to version control
   ZMQ_ADDRESS=ipc:///tmp/tx-executor.ipc
   USER_KEYPAIR_SECRET=<your-secret-key>
   ```

5. **Transaction simulation**
   ```typescript
   // Always simulate important transactions first
   const simulation = await builder.setTransport("SIMULATE").send();
   if (!simulation.success) {
     throw new Error("Simulation failed");
   }
   ```

### For Developers

1. **Input validation**
   - Validate all user inputs
   - Sanitize data before processing
   - Use TypeScript types for compile-time safety

2. **Error handling**
   - Never expose sensitive data in error messages
   - Log errors securely
   - Handle all edge cases

3. **Dependencies**
   - Keep all dependencies updated
   - Review dependency security advisories
   - Use `npm audit` regularly

4. **Code review**
   - All changes must be reviewed
   - Security-critical changes require additional review
   - Run automated security checks in CI/CD

## Known Security Considerations

### Wallet Encryption

LYS Flash uses **dual encryption** for wallet security:

1. **Server-side**: AES-256-GCM encryption with master secret
2. **Client-side**: TweetNaCl box (Curve25519-XSalsa20-Poly1305)

**Security guarantees:**
- Server never stores plaintext secret keys
- Only the user can decrypt their wallets
- Perfect forward secrecy

**User responsibility:**
- Protect your user keypair (used for decryption)
- Store encrypted wallets securely
- Never share decryption keys

### ZeroMQ Transport

**Security considerations:**
- IPC sockets: Protected by filesystem permissions
- TCP sockets: No built-in encryption (use VPN/SSH tunnel)
- Bind permissions: Restrict access to authorized processes

**Recommendations:**
- Use IPC sockets in production: `ipc:///tmp/tx-executor.ipc`
- If using TCP, secure with TLS or SSH tunneling
- Set appropriate file permissions on IPC socket files

### Transaction Security

**MEV Protection:**
- Use `setBribe()` for Jito tips on high-value transactions
- Monitor for sandwich attacks
- Use multi-broadcast (FLASH mode) for redundancy

**Priority Fees:**
- Set appropriate priority fees for time-sensitive transactions
- Higher fees reduce front-running risk
- Monitor network conditions

### Network Security

**Connection Safety:**
- Auto-reconnect enabled by default
- Timeout protection (default 30s)
- Connection state monitoring

**Error Handling:**
- All errors are typed and classified
- Retryable errors identified automatically
- No sensitive data in error messages

## Security Updates

We publish security updates through:

1. **GitHub Security Advisories**: [Security Tab](https://github.com/lyslabs-ai/lys-flash/security/advisories)
2. **NPM Advisories**: Automatically shown during `npm install`
3. **Release Notes**: Documented in CHANGELOG.md
4. **Email**: Critical vulnerabilities announced to registered users

## Vulnerability Disclosure Policy

We follow a **coordinated disclosure** policy:

1. **Report received**: Vulnerability reported to security@lyslabs.ai
2. **Assessment**: We evaluate severity and impact (1-7 days)
3. **Fix developed**: Patch created and tested (varies by severity)
4. **Coordinated disclosure**: We coordinate with reporter
5. **Public disclosure**: After fix is released and users have time to update

### Severity Levels

- **Critical**: Immediate exploitation, high impact (fix within 24-48 hours)
- **High**: Likely exploitation, significant impact (fix within 1 week)
- **Medium**: Possible exploitation, moderate impact (fix within 2 weeks)
- **Low**: Unlikely exploitation, minimal impact (fix in next release)

## Bug Bounty Program

We currently do not have a formal bug bounty program, but we recognize and credit security researchers who responsibly disclose vulnerabilities.

**Recognition includes:**
- Credit in release notes and security advisories
- Listed in CONTRIBUTORS.md
- Public acknowledgment (unless anonymity requested)

## Secure Development

### CI/CD Security

Our CI/CD pipeline includes:
- Automated dependency scanning
- TypeScript strict mode enforcement
- Linting and code quality checks
- Comprehensive test suite (220+ tests)
- Code coverage requirements (80%+)

### Code Signing

- NPM packages signed with provenance
- Git commits signed (recommended for contributors)
- Release tags signed by maintainers

### Audit Trail

- All changes tracked in git history
- Pull requests require review
- Release notes document all changes
- CHANGELOG.md maintained for transparency

## Contact

- **Security Issues**: security@lyslabs.ai
- **General Support**: hello@lyslabs.ai
- **GitHub Issues**: For non-security bugs only

## Attribution

This security policy is based on industry best practices and recommendations from:
- OWASP Security Guidelines
- Node.js Security Working Group
- NPM Security Best Practices
