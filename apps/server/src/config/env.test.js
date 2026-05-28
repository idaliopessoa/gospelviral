import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('readEnv', () => {
  it('returns apiKey undefined when ANTHROPIC_API_KEY is unset', async () => {
    // Arrange
    delete process.env.ANTHROPIC_API_KEY;

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().apiKey).toBeUndefined();
  });

  it('returns apiKey undefined when ANTHROPIC_API_KEY is empty string', async () => {
    // Arrange
    process.env.ANTHROPIC_API_KEY = '';

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().apiKey).toBeUndefined();
  });

  it('returns apiKey value when ANTHROPIC_API_KEY is set', async () => {
    // Arrange
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-123';

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().apiKey).toBe('sk-ant-test-123');
  });

  it('defaults port to 8787 when PORT is unset', async () => {
    // Arrange
    delete process.env.PORT;

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().port).toBe(8787);
  });

  it('parses PORT as an integer', async () => {
    // Arrange
    process.env.PORT = '4321';

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().port).toBe(4321);
  });

  it('falls back to default port when PORT is garbage', async () => {
    // Arrange
    process.env.PORT = 'not-a-number';

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().port).toBe(8787);
  });

  it('defaults logLevel to "info" when LOG_LEVEL is unset', async () => {
    // Arrange
    delete process.env.LOG_LEVEL;

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().logLevel).toBe('info');
  });

  it('clamps unknown LOG_LEVEL values to "info"', async () => {
    // Arrange
    process.env.LOG_LEVEL = 'trace';

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().logLevel).toBe('info');
  });

  it('parses ANALYZE_TIMEOUT_MS as integer with a 120_000 default', async () => {
    // Arrange
    delete process.env.ANALYZE_TIMEOUT_MS;

    // Act
    const { readEnv } = await import('./env.js');

    // Assert
    expect(readEnv().analyzeTimeoutMs).toBe(120_000);

    // Arrange
    process.env.ANALYZE_TIMEOUT_MS = '60000';

    // Act
    const { readEnv: readEnv2 } = await import('./env.js');

    // Assert
    expect(readEnv2().analyzeTimeoutMs).toBe(60_000);
  });
});
