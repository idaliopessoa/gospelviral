import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectRuntime, clearDetectionCache } from './detect.js';

function makeWhich(map) {
  return vi.fn(async (name) => {
    if (map[name]) return map[name];
    const err = new Error(`not found: ${name}`);
    err.code = 'ENOENT';
    throw err;
  });
}

beforeEach(() => {
  clearDetectionCache();
});

describe('detectRuntime', () => {
  it('reports cli+api when both present; recommended=cli', async () => {
    // Arrange
    const whichImpl = makeWhich({ claude: '/usr/local/bin/claude' });

    // Act
    const status = await detectRuntime({ whichImpl, apiKey: 'sk-ant-test' });

    // Assert
    expect(status.cli).toEqual({
      available: true,
      binPath: '/usr/local/bin/claude',
      name: 'claude',
    });
    expect(status.apiKey).toBe(true);
    expect(status.recommended).toBe('cli');
  });

  it('reports recommended=api when CLI absent but apiKey set', async () => {
    // Arrange
    const whichImpl = makeWhich({});

    // Act
    const status = await detectRuntime({ whichImpl, apiKey: 'sk-ant-test' });

    // Assert
    expect(status.cli).toEqual({ available: false });
    expect(status.apiKey).toBe(true);
    expect(status.recommended).toBe('api');
  });

  it('reports recommended=cli when only CLI present', async () => {
    // Arrange
    const whichImpl = makeWhich({ claude: '/usr/local/bin/claude' });

    // Act
    const status = await detectRuntime({ whichImpl, apiKey: undefined });

    // Assert
    expect(status.apiKey).toBe(false);
    expect(status.recommended).toBe('cli');
  });

  it('reports recommended=none when neither available', async () => {
    // Arrange
    const whichImpl = makeWhich({});

    // Act
    const status = await detectRuntime({ whichImpl, apiKey: undefined });

    // Assert
    expect(status.cli.available).toBe(false);
    expect(status.apiKey).toBe(false);
    expect(status.recommended).toBe('none');
  });

  it('falls back to openclaude when claude is absent', async () => {
    // Arrange
    const whichImpl = makeWhich({ openclaude: '/opt/openclaude/bin/openclaude' });

    // Act
    const status = await detectRuntime({ whichImpl, apiKey: 'sk-ant-test' });

    // Assert
    expect(status.cli).toEqual({
      available: true,
      binPath: '/opt/openclaude/bin/openclaude',
      name: 'openclaude',
    });
    expect(status.recommended).toBe('cli');
  });

  it('honors a custom binCandidates order', async () => {
    // Arrange
    const whichImpl = makeWhich({
      claude: '/usr/local/bin/claude',
      openclaude: '/opt/openclaude/bin/openclaude',
    });

    // Act — request openclaude first
    const status = await detectRuntime({
      whichImpl,
      apiKey: 'sk',
      binCandidates: ['openclaude', 'claude'],
    });

    // Assert
    expect(status.cli.name).toBe('openclaude');
  });

  it('memoizes the PATH walk within the TTL window', async () => {
    // Arrange
    const whichImpl = makeWhich({ claude: '/usr/local/bin/claude' });

    // Act
    await detectRuntime({ whichImpl, apiKey: 'sk' });
    await detectRuntime({ whichImpl, apiKey: 'sk' });

    // Assert — `which` called only on the first invocation per candidate
    expect(whichImpl).toHaveBeenCalledTimes(1);
  });

  it('clearDetectionCache forces a re-probe', async () => {
    // Arrange
    const whichImpl = makeWhich({ claude: '/usr/local/bin/claude' });

    // Act
    await detectRuntime({ whichImpl, apiKey: 'sk' });
    clearDetectionCache();
    await detectRuntime({ whichImpl, apiKey: 'sk' });

    // Assert — re-walks PATH after cache busted
    expect(whichImpl).toHaveBeenCalledTimes(2);
  });

  it('updates apiKey field from cache without re-walking PATH', async () => {
    // Arrange
    const whichImpl = makeWhich({ claude: '/usr/local/bin/claude' });

    // Act — first call: api key absent
    const first = await detectRuntime({ whichImpl, apiKey: undefined });
    // Second call: api key now present
    const second = await detectRuntime({ whichImpl, apiKey: 'sk-ant-now' });

    // Assert
    expect(first.apiKey).toBe(false);
    expect(second.apiKey).toBe(true);
    expect(whichImpl).toHaveBeenCalledTimes(1); // PATH still cached
  });

  it('honors a 0 TTL (always re-probe)', async () => {
    // Arrange
    const whichImpl = makeWhich({ claude: '/usr/local/bin/claude' });

    // Act
    await detectRuntime({ whichImpl, apiKey: 'sk', ttlMs: 0 });
    await new Promise((r) => setTimeout(r, 5));
    await detectRuntime({ whichImpl, apiKey: 'sk', ttlMs: 0 });

    // Assert
    expect(whichImpl).toHaveBeenCalledTimes(2);
  });

  it('reports apiKey:false on empty-string ANTHROPIC_API_KEY', async () => {
    // Arrange
    const whichImpl = makeWhich({});

    // Act
    const status = await detectRuntime({ whichImpl, apiKey: '' });

    // Assert
    expect(status.apiKey).toBe(false);
    expect(status.recommended).toBe('none');
  });
});
