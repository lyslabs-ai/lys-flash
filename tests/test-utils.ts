/**
 * Test Utilities
 *
 * Shared utilities for test suite including:
 * - Mock data adapters (JS → TS type conversion)
 * - Test client factories
 * - Assertion helpers
 * - Test data generators
 * - Wait helpers
 */

import { SolanaExecutionClient } from '../src/client';
import type { ClientConfig } from '../src/types/config';
import type {
  TransactionRequest,
  TransactionResponse,
  SuccessResponse,
  ErrorResponse,
} from '../src/types';

// ============================================================================
// TEST CLIENT FACTORIES
// ============================================================================

/**
 * Create a test client with default or custom configuration
 */
export function createTestClient(config?: Partial<ClientConfig>): SolanaExecutionClient {
  const defaultConfig: ClientConfig = {
    zmqAddress: process.env.TEST_ZMQ_ADDRESS || 'tcp://127.0.0.1:5555',
    timeout: 30000,
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    verbose: process.env.TEST_VERBOSE === 'true',
  };

  return new SolanaExecutionClient({
    ...defaultConfig,
    ...config,
  });
}

/**
 * Create a minimal test client for unit tests (no auto-connect)
 */
export function createMockClient(): SolanaExecutionClient {
  return createTestClient({
    autoReconnect: false,
    timeout: 5000,
  });
}

// ============================================================================
// MOCK DATA ADAPTERS (JS → TS)
// ============================================================================

/**
 * Adapter interface for converting JS mock data to TransactionRequest
 */
interface MockDataAdapter {
  data: any;
  feePayer: string;
  priorityFeeLamports: number;
  transport: string;
  bribeLamports: number;
}

/**
 * Generic adapter function that converts JS mock data to TransactionRequest
 */
export function adaptMockData(mockData: MockDataAdapter): TransactionRequest {
  return {
    data: mockData.data,
    feePayer: mockData.feePayer,
    priorityFeeLamports: mockData.priorityFeeLamports,
    transport: mockData.transport as any,
    bribeLamports: mockData.bribeLamports,
  };
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Type guard for SuccessResponse
 */
export function isSuccessResponse(response: TransactionResponse): response is SuccessResponse {
  return response.success === true;
}

/**
 * Type guard for ErrorResponse
 */
export function isErrorResponse(response: TransactionResponse): response is ErrorResponse {
  return response.success === false;
}

/**
 * Assert response is successful and return typed response
 */
export function assertSuccessResponse(
  response: TransactionResponse
): asserts response is SuccessResponse {
  if (!isSuccessResponse(response)) {
    throw new Error(`Expected success response but got error: ${JSON.stringify(response.error)}`);
  }
}

/**
 * Assert response is error and return typed response
 */
export function assertErrorResponse(
  response: TransactionResponse
): asserts response is ErrorResponse {
  if (!isErrorResponse(response)) {
    throw new Error(`Expected error response but got success: ${response.signature}`);
  }
}

/**
 * Validate Base58 encoded signature format
 */
export function assertSignature(signature: string | null): asserts signature is string {
  if (!signature) {
    throw new Error('Expected signature but got null');
  }

  // Base58 signature should be 88 characters (64 bytes)
  if (signature.length < 87 || signature.length > 89) {
    throw new Error(`Invalid signature length: ${signature.length} (expected ~88)`);
  }

  // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(signature)) {
    throw new Error(`Invalid signature format: contains invalid Base58 characters`);
  }
}

/**
 * Validate Base58 encoded public key format
 */
export function assertPublicKey(publicKey: string): void {
  if (!publicKey) {
    throw new Error('Expected public key but got empty string');
  }

  // Base58 public key should be 32-44 characters
  if (publicKey.length < 32 || publicKey.length > 44) {
    throw new Error(`Invalid public key length: ${publicKey.length} (expected 32-44)`);
  }

  // Base58 alphabet validation
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(publicKey)) {
    throw new Error(`Invalid public key format: contains invalid Base58 characters`);
  }
}

/**
 * Assert response has valid signature
 */
export function assertHasSignature(
  response: TransactionResponse
): asserts response is SuccessResponse {
  assertSuccessResponse(response);
  assertSignature(response.signature);
}

/**
 * Assert response has transaction logs (SIMULATE mode)
 */
export function assertHasLogs(
  response: TransactionResponse
): asserts response is SuccessResponse & { logs: string[] } {
  assertSuccessResponse(response);
  if (!response.logs || !Array.isArray(response.logs)) {
    throw new Error('Expected response to have logs array');
  }
  if (response.logs.length === 0) {
    throw new Error('Expected non-empty logs array');
  }
}

/**
 * Assert latency is within expected range
 */
export function assertLatencyInRange(latency: number | undefined, min: number, max: number): void {
  if (latency === undefined) {
    throw new Error('Expected latency to be defined');
  }
  if (latency < min) {
    throw new Error(`Latency ${latency}ms is below minimum ${min}ms`);
  }
  if (latency > max) {
    throw new Error(`Latency ${latency}ms exceeds maximum ${max}ms`);
  }
}

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

/**
 * Generate a random Base58 public key (for testing)
 */
export function generatePublicKey(): string {
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let key = '';
  for (let i = 0; i < 44; i++) {
    key += base58Chars[Math.floor(Math.random() * base58Chars.length)];
  }
  return key;
}

/**
 * Generate a random Base58 signature (for testing)
 */
export function generateSignature(): string {
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let sig = '';
  for (let i = 0; i < 88; i++) {
    sig += base58Chars[Math.floor(Math.random() * base58Chars.length)];
  }
  return sig;
}

// ============================================================================
// WAIT HELPERS
// ============================================================================

/**
 * Wait for client to be connected
 */
export async function waitForConnection(
  client: SolanaExecutionClient,
  timeoutMs: number = 5000
): Promise<void> {
  const start = Date.now();

  while (!client.isConnected()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Client did not connect within ${timeoutMs}ms`);
    }
    await sleep(100);
  }
}

/**
 * Wait for a specific condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeoutMs: number = 5000,
  message: string = 'Condition not met'
): Promise<void> {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`${message} within ${timeoutMs}ms`);
    }
    await sleep(100);
  }
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// PERFORMANCE HELPERS
// ============================================================================

/**
 * Calculate percentile from array of numbers
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) {
    throw new Error('Cannot calculate percentile of empty array');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate average from array of numbers
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Measure execution time of async function
 */
export async function measureLatency<T>(
  fn: () => Promise<T>
): Promise<{ result: T; latency: number }> {
  const start = Date.now();
  const result = await fn();
  const latency = Date.now() - start;
  return { result, latency };
}

/**
 * Run multiple iterations and collect latency statistics
 */
export async function benchmarkLatency<T>(
  fn: () => Promise<T>,
  iterations: number = 50
): Promise<{
  results: T[];
  latencies: number[];
  average: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}> {
  const results: T[] = [];
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { result, latency } = await measureLatency(fn);
    results.push(result);
    latencies.push(latency);
  }

  return {
    results,
    latencies,
    average: calculateAverage(latencies),
    p50: calculatePercentile(latencies, 50),
    p95: calculatePercentile(latencies, 95),
    p99: calculatePercentile(latencies, 99),
    min: Math.min(...latencies),
    max: Math.max(...latencies),
  };
}

// ============================================================================
// ENVIRONMENT HELPERS
// ============================================================================

/**
 * Check if execution engine is available
 */
export async function isEngineAvailable(): Promise<boolean> {
  try {
    const client = createTestClient({ timeout: 2000 });
    const connected = await client.ping();
    client.close();
    return connected;
  } catch {
    return false;
  }
}

/**
 * Skip test if execution engine is not available
 */
export async function skipIfEngineUnavailable(): Promise<void> {
  const available = await isEngineAvailable();
  if (!available) {
    console.warn('⚠️  Execution engine not available - skipping integration test');
    // This will be caught by test runner
    throw new Error('SKIP_TEST: Execution engine not available');
  }
}

// ============================================================================
// MOCK TRANSPORT (for unit tests)
// ============================================================================

/**
 * Create mock transport for unit testing
 */
export class MockTransport {
  private connected = false;
  private responses: Map<string, any> = new Map();
  private requestHistory: any[] = [];

  connect(): void {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async request<T>(message: any): Promise<T> {
    if (!this.connected) {
      throw new Error('Not connected');
    }

    this.requestHistory.push(message);

    // Return mocked response if configured
    const key = JSON.stringify(message);
    if (this.responses.has(key)) {
      return this.responses.get(key);
    }

    // Default success response
    return {
      success: true,
      signature: generateSignature(),
      transport: 'MOCK',
      error: null,
    } as T;
  }

  /**
   * Configure mock response for specific request
   */
  mockResponse(request: any, response: any): void {
    const key = JSON.stringify(request);
    this.responses.set(key, response);
  }

  /**
   * Get request history
   */
  getRequestHistory(): any[] {
    return [...this.requestHistory];
  }

  /**
   * Clear request history and mock responses
   */
  reset(): void {
    this.requestHistory = [];
    this.responses.clear();
  }
}
