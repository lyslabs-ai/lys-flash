/**
 * Unit Tests for Error Handling
 *
 * Tests the ExecutionError class, ErrorCode enum, and error utilities
 */

import { describe, it, expect } from 'vitest';
import { ExecutionError, ErrorCode, fromUnknownError } from '../../src/errors';

describe('ErrorCode Enum', () => {
  it('should have all required error codes', () => {
    expect(ErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(ErrorCode.TIMEOUT).toBe('TIMEOUT');
    expect(ErrorCode.INVALID_REQUEST).toBe('INVALID_REQUEST');
    expect(ErrorCode.EXECUTION_FAILED).toBe('EXECUTION_FAILED');
    expect(ErrorCode.NONCE_POOL_EXHAUSTED).toBe('NONCE_POOL_EXHAUSTED');
    expect(ErrorCode.WALLET_NOT_FOUND).toBe('WALLET_NOT_FOUND');
    expect(ErrorCode.SERIALIZATION_ERROR).toBe('SERIALIZATION_ERROR');
    expect(ErrorCode.CONNECTION_ERROR).toBe('CONNECTION_ERROR');
    expect(ErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
  });

  it('should have exactly 9 error codes', () => {
    const codes = Object.keys(ErrorCode);
    expect(codes).toHaveLength(9);
  });
});

describe('ExecutionError Class', () => {
  describe('Constructor', () => {
    it('should create error with required parameters', () => {
      const error = new ExecutionError('Test error message', ErrorCode.NETWORK_ERROR, 'NONCE');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ExecutionError);
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.transport).toBe('NONCE');
      expect(error.name).toBe('ExecutionError');
    });

    it('should create error with original error', () => {
      const originalError = new Error('Original error');
      const error = new ExecutionError(
        'Wrapped error',
        ErrorCode.TIMEOUT,
        'VANILLA',
        originalError
      );

      expect(error.originalError).toBe(originalError);
      expect(error.originalError?.message).toBe('Original error');
    });

    it('should set timestamp automatically', () => {
      const before = new Date();
      const error = new ExecutionError('Test', ErrorCode.TIMEOUT, 'NONCE');
      const after = new Date();

      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should capture stack trace', () => {
      const error = new ExecutionError('Test', ErrorCode.TIMEOUT, 'NONCE');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ExecutionError');
    });
  });

  describe('toJSON()', () => {
    it('should serialize error to JSON', () => {
      const error = new ExecutionError('Test error', ErrorCode.NETWORK_ERROR, 'NONCE');

      const json = error.toJSON();

      expect(json.name).toBe('ExecutionError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(json.transport).toBe('NONCE');
      expect(json.timestamp).toBeDefined();
      expect(typeof json.timestamp).toBe('string');
      expect(json.stack).toBeDefined();
    });

    it('should include original error in JSON', () => {
      const originalError = new Error('Original error');
      const error = new ExecutionError(
        'Wrapped error',
        ErrorCode.TIMEOUT,
        'VANILLA',
        originalError
      );

      const json = error.toJSON();

      expect(json.originalError).toBeDefined();
      expect(json.originalError?.name).toBe('Error');
      expect(json.originalError?.message).toBe('Original error');
      expect(json.originalError?.stack).toBeDefined();
    });

    it('should omit original error if not provided', () => {
      const error = new ExecutionError('Test', ErrorCode.TIMEOUT, 'NONCE');
      const json = error.toJSON();

      expect(json.originalError).toBeUndefined();
    });

    it('should format timestamp as ISO string', () => {
      const error = new ExecutionError('Test', ErrorCode.TIMEOUT, 'NONCE');
      const json = error.toJSON();

      expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(() => new Date(json.timestamp)).not.toThrow();
    });
  });

  describe('isRetryable()', () => {
    it('should mark NETWORK_ERROR as retryable', () => {
      const error = new ExecutionError('Test', ErrorCode.NETWORK_ERROR, 'NONCE');
      expect(error.isRetryable()).toBe(true);
    });

    it('should mark TIMEOUT as retryable', () => {
      const error = new ExecutionError('Test', ErrorCode.TIMEOUT, 'NONCE');
      expect(error.isRetryable()).toBe(true);
    });

    it('should mark CONNECTION_ERROR as not retryable', () => {
      const error = new ExecutionError('Test', ErrorCode.CONNECTION_ERROR, 'NONCE');
      expect(error.isRetryable()).toBe(false);
    });

    it('should mark EXECUTION_FAILED as not retryable', () => {
      const error = new ExecutionError('Test', ErrorCode.EXECUTION_FAILED, 'NONCE');
      expect(error.isRetryable()).toBe(false);
    });

    it('should mark INVALID_REQUEST as not retryable', () => {
      const error = new ExecutionError('Test', ErrorCode.INVALID_REQUEST, 'NONCE');
      expect(error.isRetryable()).toBe(false);
    });

    it('should mark NONCE_POOL_EXHAUSTED as not retryable', () => {
      const error = new ExecutionError('Test', ErrorCode.NONCE_POOL_EXHAUSTED, 'NONCE');
      expect(error.isRetryable()).toBe(false);
    });

    it('should mark WALLET_NOT_FOUND as not retryable', () => {
      const error = new ExecutionError('Test', ErrorCode.WALLET_NOT_FOUND, 'NONCE');
      expect(error.isRetryable()).toBe(false);
    });

    it('should mark SERIALIZATION_ERROR as not retryable', () => {
      const error = new ExecutionError('Test', ErrorCode.SERIALIZATION_ERROR, 'NONCE');
      expect(error.isRetryable()).toBe(false);
    });

    it('should mark UNKNOWN_ERROR as not retryable', () => {
      const error = new ExecutionError('Test', ErrorCode.UNKNOWN_ERROR, 'NONCE');
      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('getUserMessage()', () => {
    it('should return friendly message for NETWORK_ERROR', () => {
      const error = new ExecutionError('Test', ErrorCode.NETWORK_ERROR, 'NONCE');
      const message = error.getUserMessage();

      expect(message).toContain('Network error');
      expect(message).toContain('connection');
    });

    it('should return friendly message for TIMEOUT', () => {
      const error = new ExecutionError('Test', ErrorCode.TIMEOUT, 'NONCE');
      const message = error.getUserMessage();

      expect(message).toContain('timed out');
      expect(message).toContain('try again');
    });

    it('should return friendly message for INVALID_REQUEST', () => {
      const error = new ExecutionError('Test', ErrorCode.INVALID_REQUEST, 'NONCE');
      const message = error.getUserMessage();

      expect(message).toContain('Invalid request');
      expect(message).toContain('parameters');
    });

    it('should return friendly message for EXECUTION_FAILED', () => {
      const error = new ExecutionError('Transaction reverted', ErrorCode.EXECUTION_FAILED, 'NONCE');
      const message = error.getUserMessage();

      expect(message).toContain('execution failed');
      expect(message).toContain('Transaction reverted');
    });

    it('should return friendly message for NONCE_POOL_EXHAUSTED', () => {
      const error = new ExecutionError('Test', ErrorCode.NONCE_POOL_EXHAUSTED, 'NONCE');
      const message = error.getUserMessage();

      expect(message).toContain('Nonce pool');
      expect(message).toContain('wait');
    });

    it('should return friendly message for WALLET_NOT_FOUND', () => {
      const error = new ExecutionError('Test', ErrorCode.WALLET_NOT_FOUND, 'NONCE');
      const message = error.getUserMessage();

      expect(message).toContain('Wallet not found');
      expect(message).toContain('address');
    });

    it('should return friendly message for SERIALIZATION_ERROR', () => {
      const error = new ExecutionError('Test', ErrorCode.SERIALIZATION_ERROR, 'NONCE');
      const message = error.getUserMessage();

      expect(message).toContain('serialize');
      expect(message).toContain('bug');
    });

    it('should return friendly message for CONNECTION_ERROR', () => {
      const error = new ExecutionError('Test', ErrorCode.CONNECTION_ERROR, 'NONCE');
      const message = error.getUserMessage();

      expect(message).toContain('connect');
      expect(message).toContain('execution engine');
    });

    it('should return friendly message for UNKNOWN_ERROR', () => {
      const error = new ExecutionError('Something went wrong', ErrorCode.UNKNOWN_ERROR, 'NONCE');
      const message = error.getUserMessage();

      expect(message).toContain('unexpected error');
      expect(message).toContain('Something went wrong');
    });
  });
});

describe('fromUnknownError()', () => {
  describe('ExecutionError passthrough', () => {
    it('should return ExecutionError as-is', () => {
      const originalError = new ExecutionError('Test', ErrorCode.TIMEOUT, 'NONCE');
      const result = fromUnknownError(originalError, 'VANILLA');

      expect(result).toBe(originalError);
      expect(result.code).toBe(ErrorCode.TIMEOUT);
      expect(result.transport).toBe('NONCE'); // Original transport preserved
    });
  });

  describe('Timeout error detection', () => {
    it('should detect "timeout" in message', () => {
      const error = new Error('Request timeout after 30s');
      const result = fromUnknownError(error, 'NONCE');

      expect(result).toBeInstanceOf(ExecutionError);
      expect(result.code).toBe(ErrorCode.TIMEOUT);
      expect(result.message).toBe('Request timeout after 30s');
      expect(result.originalError).toBe(error);
    });

    it('should detect "timed out" in message', () => {
      const error = new Error('Connection timed out');
      const result = fromUnknownError(error, 'VANILLA');

      expect(result.code).toBe(ErrorCode.TIMEOUT);
    });

    it('should be case-insensitive for timeout', () => {
      const error = new Error('TIMEOUT occurred');
      const result = fromUnknownError(error, 'NONCE');

      expect(result.code).toBe(ErrorCode.TIMEOUT);
    });
  });

  describe('Network error detection', () => {
    it('should detect "network" in message', () => {
      const error = new Error('Network error occurred');
      const result = fromUnknownError(error, 'NONCE');

      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(result.originalError).toBe(error);
    });

    it('should detect "ECONNREFUSED" in message', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:3000');
      const result = fromUnknownError(error, 'VANILLA');

      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it('should detect "ENOTFOUND" in message', () => {
      const error = new Error('getaddrinfo ENOTFOUND example.com');
      const result = fromUnknownError(error, 'NONCE');

      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it('should detect "connection" in message', () => {
      const error = new Error('Connection failed');
      const result = fromUnknownError(error, 'ZERO_SLOT');

      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it('should be case-insensitive for network errors', () => {
      const error = new Error('NETWORK CONNECTION FAILED');
      const result = fromUnknownError(error, 'NONCE');

      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
    });
  });

  describe('Invalid request detection', () => {
    it('should detect "invalid" in message', () => {
      const error = new Error('Invalid parameter: feePayer');
      const result = fromUnknownError(error, 'NONCE');

      expect(result.code).toBe(ErrorCode.INVALID_REQUEST);
      expect(result.originalError).toBe(error);
    });

    it('should detect "validation" in message', () => {
      const error = new Error('Validation failed: missing user');
      const result = fromUnknownError(error, 'VANILLA');

      expect(result.code).toBe(ErrorCode.INVALID_REQUEST);
    });

    it('should be case-insensitive for validation errors', () => {
      const error = new Error('INVALID REQUEST');
      const result = fromUnknownError(error, 'NONCE');

      expect(result.code).toBe(ErrorCode.INVALID_REQUEST);
    });
  });

  describe('Unknown error handling', () => {
    it('should categorize unrecognized Error as UNKNOWN_ERROR', () => {
      const error = new Error('Something unexpected happened');
      const result = fromUnknownError(error, 'NONCE');

      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('Something unexpected happened');
      expect(result.originalError).toBe(error);
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';
      const result = fromUnknownError(error, 'VANILLA');

      expect(result).toBeInstanceOf(ExecutionError);
      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('String error');
      expect(result.originalError).toBeUndefined();
    });

    it('should handle null/undefined', () => {
      const result1 = fromUnknownError(null, 'NONCE');
      expect(result1.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result1.message).toBe('null');

      const result2 = fromUnknownError(undefined, 'VANILLA');
      expect(result2.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result2.message).toBe('undefined');
    });

    it('should handle objects without message', () => {
      const error = { foo: 'bar' };
      const result = fromUnknownError(error, 'NONCE');

      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.message).toContain('object');
    });
  });

  describe('Transport parameter', () => {
    it('should use provided transport', () => {
      const error = new Error('Test');
      const result = fromUnknownError(error, 'ZERO_SLOT');

      expect(result.transport).toBe('ZERO_SLOT');
    });

    it('should default to UNKNOWN transport', () => {
      const error = new Error('Test');
      const result = fromUnknownError(error);

      expect(result.transport).toBe('UNKNOWN');
    });
  });

  describe('Error message priority', () => {
    it('should prioritize timeout over network', () => {
      const error = new Error('Network timeout occurred');
      const result = fromUnknownError(error, 'NONCE');

      // "timeout" check comes first in implementation
      expect(result.code).toBe(ErrorCode.TIMEOUT);
    });

    it('should prioritize network over invalid', () => {
      const error = new Error('Invalid network configuration');
      const result = fromUnknownError(error, 'NONCE');

      // "network" check comes before "invalid" in implementation
      expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
    });
  });
});
