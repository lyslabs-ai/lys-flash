/**
 * Global Test Setup
 *
 * Runs before all tests to:
 * - Validate test environment
 * - Check execution engine connectivity
 * - Set up test configuration
 * - Initialize global test state
 */

import { beforeAll, afterAll } from 'vitest';
import { isEngineAvailable } from './test-utils';

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  const warnings: string[] = [];

  // Check ZMQ address
  if (!process.env.TEST_ZMQ_ADDRESS) {
    warnings.push('TEST_ZMQ_ADDRESS not set, using default: tcp://127.0.0.1:5555');
  }

  // Check test wallet
  if (!process.env.TEST_WALLET_PRIVATE_KEY) {
    warnings.push('TEST_WALLET_PRIVATE_KEY not set - wallet creation tests may fail');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment Warnings:');
    warnings.forEach((warning) => console.warn(`   ${warning}`));
    console.warn('');
  }
}

/**
 * Check execution engine connectivity
 */
async function checkEngineConnectivity(): Promise<void> {
  console.log('\n🔍 Checking execution engine connectivity...');

  const available = await isEngineAvailable();

  if (available) {
    console.log('✅ Execution engine is available\n');
  } else {
    console.warn('⚠️  Execution engine is NOT available');
    console.warn('   Integration tests will be skipped or may fail');
    console.warn('   To run integration tests, start the execution engine:');
    console.warn('   $ npm start (in execution engine directory)\n');
  }
}

// ============================================================================
// GLOBAL HOOKS
// ============================================================================

/**
 * Global beforeAll hook
 */
beforeAll(async () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 @lyslabs.ai/lys-flash Test Suite');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Validate environment
  validateEnvironment();

  // Check engine connectivity (non-blocking)
  await checkEngineConnectivity();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}, 10000); // 10 second timeout for setup

/**
 * Global afterAll hook
 */
afterAll(() => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Test Suite Complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

/**
 * Default test timeouts
 */
export const TEST_TIMEOUTS = {
  UNIT: 5000, // 5 seconds for unit tests
  INTEGRATION: 30000, // 30 seconds for integration tests
  PERFORMANCE: 60000, // 60 seconds for performance tests
};

/**
 * Transport mode latency targets (in milliseconds)
 */
export const LATENCY_TARGETS = {
  SIMULATE: { min: 0, max: 50 }, // Local simulation
  VANILLA: { min: 200, max: 1000 }, // Standard RPC with variance
  NOZOMI: { min: 80, max: 400 }, // Low-latency with variance
  ZERO_SLOT: { min: 30, max: 200 }, // Ultra-fast with variance
  LUNAR_LANDER: { min: 40, max: 150 }, // HelloMoon low-latency with variance
  HELIUS_SENDER: { min: 100, max: 500 }, // Premium with variance
  JITO: { min: 150, max: 600 }, // MEV-protected with variance
  FLASH: { min: 30, max: 150 }, // Multi-broadcast (fastest) - alias for NONCE
  NONCE: { min: 30, max: 150 }, // Multi-broadcast (fastest) - internal name for FLASH
};

/**
 * Test data constants
 */
export const TEST_CONSTANTS = {
  DEFAULT_FEE_PAYER: '5ZkoYMeNTjUA56k6rXSyRb9zf1HzR8SZ5YdYM2edfK89',
  DEFAULT_PRIORITY_FEE: 1_000_000,
  DEFAULT_BRIBE: 1_000_000,
  MIN_SOL_BALANCE: 0.1, // Minimum SOL for test wallet
};

/**
 * Performance test configuration
 */
export const PERFORMANCE_CONFIG = {
  BENCHMARK_ITERATIONS: 50, // Number of iterations for latency benchmarks
  CONCURRENCY_LEVELS: [1, 5, 10, 25, 50], // Concurrency levels to test
  ACCEPTABLE_P95_VARIANCE: 0.2, // 20% variance allowed for p95 latency
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if we should skip integration tests
 */
export function shouldSkipIntegration(): boolean {
  return process.env.SKIP_INTEGRATION_TESTS === 'true';
}

/**
 * Check if we should skip performance tests
 */
export function shouldSkipPerformance(): boolean {
  return process.env.SKIP_PERFORMANCE_TESTS === 'true';
}

/**
 * Get test ZMQ address
 */
export function getTestZMQAddress(): string {
  return process.env.TEST_ZMQ_ADDRESS || 'tcp://127.0.0.1:5555';
}

/**
 * Get test wallet private key
 */
export function getTestWalletPrivateKey(): string | undefined {
  return process.env.TEST_WALLET_PRIVATE_KEY;
}

/**
 * Check if verbose logging is enabled
 */
export function isVerbose(): boolean {
  return process.env.TEST_VERBOSE === 'true';
}
