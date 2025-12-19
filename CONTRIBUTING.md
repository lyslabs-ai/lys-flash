# Contributing to LYS Flash

Thank you for your interest in contributing to LYS Flash! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please be respectful and constructive in all interactions.

## Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 8+
- Git
- A Solana Execution Engine instance for integration testing (optional)

### Initial Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/lys-flash.git
cd lys-flash
```

2. **Install dependencies**

```bash
npm install
```

3. **Build the project**

```bash
npm run build
```

4. **Run tests**

```bash
npm test
```

### Development Commands

```bash
# Build the project
npm run build

# Watch mode for development
npm run dev

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run performance tests
npm run test:performance

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type check
npm run typecheck

# Generate API documentation
npm run docs
```

## Development Workflow

### Branch Strategy

- `main` - Stable release branch
- `develop` - Development branch (if used)
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Hotfix branches for production issues

### Creating a Feature

1. **Create a feature branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**

Follow the [code style guidelines](#code-style) and write tests for your changes.

3. **Commit your changes**

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add support for custom transport timeouts"
git commit -m "fix: resolve connection leak in ZMQ transport"
git commit -m "docs: update README with new examples"
git commit -m "test: add integration tests for wallet creation"
```

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `chore:` - Build/tooling changes

4. **Push your branch**

```bash
git push origin feature/your-feature-name
```

5. **Create a Pull Request**

- Go to the repository on GitHub
- Click "New Pull Request"
- Select your feature branch
- Fill out the PR template with details about your changes

## Testing

### Writing Tests

All new features and bug fixes should include tests. We use Vitest for testing.

**Unit Tests** (`tests/unit/`)

Test individual functions and classes in isolation:

```typescript
import { describe, it, expect } from 'vitest';
import { LysFlash } from '../src/client';

describe('LysFlash', () => {
  it('should initialize with default config', () => {
    const client = new LysFlash();
    expect(client).toBeDefined();
  });

  it('should connect to ZMQ socket', async () => {
    const client = new LysFlash();
    // Test connection logic
  });
});
```

**Integration Tests** (`tests/integration/`)

Test complete workflows and interactions with the execution engine:

```typescript
import { describe, it, expect } from 'vitest';
import { LysFlash, TransactionBuilder } from '../src';

describe('Pump.fun Integration', () => {
  it('should buy tokens successfully', async () => {
    const client = new LysFlash();
    const result = await new TransactionBuilder(client)
      .pumpFunBuy({
        pool: "mint",
        poolAccounts: { coinCreator: "creator" },
        user: "wallet",
        solAmountIn: 1_000_000,
        tokenAmountOut: 3_400_000_000
      })
      .setFeePayer("wallet")
      .setTransport("SIMULATE")
      .send();

    expect(result.success).toBe(true);
  });
});
```

**Performance Tests** (`tests/performance/`)

Test performance characteristics and benchmarks:

```typescript
import { describe, it, expect } from 'vitest';
import { LysFlash } from '../src';

describe('Performance', () => {
  it('should handle 100 concurrent requests', async () => {
    const client = new LysFlash();
    const start = Date.now();

    const promises = Array.from({ length: 100 }, () =>
      client.execute({
        /* params */
      })
    );

    await Promise.all(promises);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000); // 10 seconds
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:performance

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Coverage Requirements

- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 75%+

## Code Style

### TypeScript Guidelines

1. **Use TypeScript strict mode**

All code must pass `tsc --noEmit` with strict mode enabled.

2. **Type everything explicitly**

```typescript
// Good
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Avoid
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

3. **Use interfaces for object shapes**

```typescript
interface TransactionParams {
  pool: string;
  user: string;
  solAmountIn: number;
  tokenAmountOut: number;
}
```

4. **Prefer const over let**

```typescript
// Good
const result = await client.execute(params);

// Avoid
let result = await client.execute(params);
```

5. **Use async/await over promises**

```typescript
// Good
const result = await client.execute(params);

// Avoid
client.execute(params).then(result => {
  // ...
});
```

### Formatting

We use Prettier for code formatting. Run before committing:

```bash
npm run format
```

### Linting

We use ESLint with TypeScript support:

```bash
npm run lint
npm run lint:fix
```

### Documentation

1. **JSDoc comments for public APIs**

```typescript
/**
 * Executes a transaction on the Solana Execution Engine.
 *
 * @param params - Transaction parameters
 * @returns Promise that resolves to execution result
 * @throws {ExecutionError} If transaction fails
 *
 * @example
 * ```typescript
 * const result = await client.execute({
 *   data: { executionType: "PUMP_FUN", eventType: "BUY", ... },
 *   feePayer: "wallet",
 *   bribeLamports: 1_000_000,        // 0.001 SOL bribe (mandatory for FLASH)
 *   transport: "FLASH"
 * });
 * ```
 */
async execute(params: ExecuteParams): Promise<ExecuteResult> {
  // ...
}
```

2. **Update README.md** for new features

3. **Add examples** to `examples/` directory

## Pull Request Process

### Before Submitting

1. **Run all checks**

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

2. **Update documentation** if needed

3. **Add tests** for new features

4. **Update CHANGELOG.md** (if applicable)

### PR Guidelines

1. **Title**: Use conventional commit format
   - `feat: add support for custom timeouts`
   - `fix: resolve memory leak in transport`

2. **Description**: Include:
   - What changed and why
   - Link to related issues
   - Testing performed
   - Breaking changes (if any)

3. **Small, focused PRs**: One feature/fix per PR

4. **Review feedback**: Respond to all comments

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated
- [ ] Examples added/updated (if applicable)
- [ ] CHANGELOG.md updated (if applicable)
- [ ] Conventional commit format used

## Release Process

Releases are automated via GitHub Actions when version tags are created.

### Version Bumping

```bash
# Patch release (1.0.0 -> 1.0.1)
npm version patch

# Minor release (1.0.0 -> 1.1.0)
npm version minor

# Major release (1.0.0 -> 2.0.0)
npm version major
```

### Publishing

1. **Update version**: `npm version [patch|minor|major]`
2. **Push tags**: `git push origin main --tags`
3. **CI/CD**: GitHub Actions automatically publishes to NPM

## Getting Help

- **Questions**: [GitHub Discussions](https://github.com/lyslabs-ai/lys-flash/discussions)
- **Bugs**: [GitHub Issues](https://github.com/lyslabs-ai/lys-flash/issues)
- **Email**: hello@lyslabs.ai

## Recognition

Contributors will be recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- GitHub contributors page

Thank you for contributing to LYS Flash!
