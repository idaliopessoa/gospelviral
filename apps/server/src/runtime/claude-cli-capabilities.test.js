import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  probeCapabilities,
  clearCapabilityCache,
} from './claude-cli-capabilities.js';

function fakeChild({ stdout, stderr = '', exitCode = 0 }) {
  const child = new EventEmitter();
  const out = new EventEmitter();
  const err = new EventEmitter();
  child.stdout = out;
  child.stderr = err;
  setTimeout(() => {
    out.emit('data', Buffer.from(stdout));
    err.emit('data', Buffer.from(stderr));
    child.emit('close', exitCode);
  }, 0);
  return child;
}

beforeEach(() => {
  clearCapabilityCache();
});

describe('probeCapabilities', () => {
  it('detects include-partial-messages + add-dir + version', async () => {
    // Arrange
    const spawnImpl = vi.fn((bin, args) => {
      if (args[0] === '-p' && args[1] === '--help') {
        return fakeChild({ stdout: 'Usage: claude\n--include-partial-messages\n--add-dir <dirs>\n' });
      }
      if (args[0] === '--version') {
        return fakeChild({ stdout: '2.1.153 (Claude Code)\n' });
      }
      throw new Error('unexpected spawn');
    });

    // Act
    const caps = await probeCapabilities('/usr/local/bin/claude', { spawnImpl });

    // Assert
    expect(caps.version).toBe('2.1.153');
    expect(caps.hasIncludePartialMessages).toBe(true);
    expect(caps.hasAddDir).toBe(true);
  });

  it('reports false when neither flag is in the help output', async () => {
    // Arrange
    const spawnImpl = vi.fn(() => fakeChild({ stdout: 'Usage: claude (older)\n' }));

    // Act
    const caps = await probeCapabilities('/path/to/older-claude', { spawnImpl });

    // Assert
    expect(caps.hasIncludePartialMessages).toBe(false);
    expect(caps.hasAddDir).toBe(false);
  });

  it('memoizes per binPath', async () => {
    // Arrange
    let calls = 0;
    const spawnImpl = vi.fn((_bin, args) => {
      calls++;
      const stdout =
        args[0] === '-p' ? '--include-partial-messages\n' : '2.1.153\n';
      return fakeChild({ stdout });
    });

    // Act
    await probeCapabilities('/path/to/claude', { spawnImpl });
    await probeCapabilities('/path/to/claude', { spawnImpl });

    // Assert — second call hits the cache
    expect(calls).toBe(2);
  });
});
