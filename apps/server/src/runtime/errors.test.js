import { describe, it, expect } from 'vitest';
import {
  AdapterConfigError,
  AdapterTransportError,
  AdapterTimeoutError,
} from './errors.js';

describe('adapter errors', () => {
  it('AdapterConfigError carries name + code + message', () => {
    // Arrange + Act
    const err = new AdapterConfigError('missing_api_key', 'no key');

    // Assert
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AdapterConfigError');
    expect(err.code).toBe('missing_api_key');
    expect(err.message).toBe('no key');
  });

  it('AdapterTransportError exposes status + retryable + sanitized message', () => {
    // Arrange + Act
    const err = new AdapterTransportError('http_auth', 'rejected', { status: 401, retryable: false });

    // Assert
    expect(err.name).toBe('AdapterTransportError');
    expect(err.code).toBe('http_auth');
    expect(err.status).toBe(401);
    expect(err.retryable).toBe(false);
  });

  it('AdapterTransportError retryable defaults to false', () => {
    // Arrange + Act
    const err = new AdapterTransportError('network', 'down');

    // Assert
    expect(err.retryable).toBe(false);
    expect(err.status).toBeUndefined();
  });

  it('AdapterTimeoutError carries the timeout', () => {
    // Arrange + Act
    const err = new AdapterTimeoutError(30_000);

    // Assert
    expect(err.name).toBe('AdapterTimeoutError');
    expect(err.code).toBe('timeout');
    expect(err.timeoutMs).toBe(30_000);
    expect(err.message).toContain('30000');
  });
});
