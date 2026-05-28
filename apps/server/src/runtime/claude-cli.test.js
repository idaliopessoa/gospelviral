import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { runViaCli } from './claude-cli.js';
import { clearCapabilityCache } from './claude-cli-capabilities.js';
import {
  AdapterConfigError,
  AdapterTransportError,
} from './errors.js';
import {
  EXAMPLE_RESPONSE,
  AnalysisResponseError,
} from '@gospelviral/shared';

function asReadable(lines) {
  return Readable.from(lines);
}

function makeChild({ events, stderr = '', exitCode = 0 }) {
  const child = new EventEmitter();
  child.stdin = {
    end: (data, enc, cb) => cb?.(),
    on: () => {},
  };
  child.stdout = asReadable(events.map((e) => JSON.stringify(e) + '\n'));
  const errEmitter = new EventEmitter();
  child.stderr = errEmitter;
  child.pid = 99999;
  child.kill = vi.fn();

  setTimeout(() => {
    if (stderr) errEmitter.emit('data', Buffer.from(stderr));
    child.emit('close', exitCode, null);
  }, 5);
  return child;
}

function probeSuccess() {
  // capability probe spawn for `-p --help` and `--version`
  const helpChild = new EventEmitter();
  const helpOut = new EventEmitter();
  helpChild.stdout = helpOut;
  helpChild.stderr = new EventEmitter();
  setTimeout(() => {
    helpOut.emit('data', Buffer.from('--include-partial-messages\n--add-dir\n'));
    helpChild.emit('close', 0);
  }, 0);

  const versionChild = new EventEmitter();
  const versionOut = new EventEmitter();
  versionChild.stdout = versionOut;
  versionChild.stderr = new EventEmitter();
  setTimeout(() => {
    versionOut.emit('data', Buffer.from('2.1.153 (Claude Code)\n'));
    versionChild.emit('close', 0);
  }, 0);

  return { helpChild, versionChild };
}

function makeSpawnImpl({ happyPath = true, events, stderr, exitCode } = {}) {
  const { helpChild, versionChild } = probeSuccess();
  return vi.fn((bin, args) => {
    if (args[0] === '-p' && args[1] === '--help') return helpChild;
    if (args[0] === '--version') return versionChild;
    return makeChild({
      events: events ?? (happyPath ? happyEvents() : []),
      stderr: stderr ?? '',
      exitCode: exitCode ?? 0,
    });
  });
}

function happyEvents() {
  return [
    { type: 'system', subtype: 'init' },
    {
      type: 'assistant',
      message: { content: [{ type: 'text', text: '```json\n' + JSON.stringify(EXAMPLE_RESPONSE) + '\n```' }] },
    },
    {
      type: 'result',
      subtype: 'success',
      result: '```json\n' + JSON.stringify(EXAMPLE_RESPONSE) + '\n```',
    },
  ];
}

const BASE_ARGS = {
  systemPrompt: 'system',
  userMessage: '<transcript>00:00 hello</transcript>',
  modelId: 'claude-opus-4-7',
  binPath: '/usr/local/bin/claude',
};

beforeEach(() => {
  clearCapabilityCache();
});

describe('runViaCli', () => {
  it('throws AdapterConfigError when binPath is missing', async () => {
    // Arrange + Act + Assert
    await expect(
      runViaCli({ ...BASE_ARGS, binPath: undefined, spawnImpl: vi.fn() }),
    ).rejects.toBeInstanceOf(AdapterConfigError);
  });

  it('returns the parsed AnalysisResponse on a happy stream', async () => {
    // Arrange
    const spawnImpl = makeSpawnImpl({ happyPath: true });

    // Act
    const out = await runViaCli({ ...BASE_ARGS, spawnImpl });

    // Assert
    expect(out.metadata.total_duration).toBe('09:55');
    expect(out.top_moments).toHaveLength(5);
    expect(out.top_moments[0].hook_title).toBe(
      EXAMPLE_RESPONSE.top_moments[0].hook_title,
    );
  });

  it('passes the prompt via stdin, NEVER via argv', async () => {
    // Arrange
    const spawnImpl = makeSpawnImpl({ happyPath: true });
    const SECRET = 'my-very-private-transcript-line-001';

    // Act
    await runViaCli({
      ...BASE_ARGS,
      userMessage: SECRET,
      spawnImpl,
    });

    // Assert
    for (const call of spawnImpl.mock.calls) {
      const args = call[1];
      for (const a of args) {
        expect(String(a)).not.toContain(SECRET);
      }
    }
  });

  it('builds spawn args with -p --output-format stream-json --verbose --permission-mode bypassPermissions --model <id>', async () => {
    // Arrange
    const spawnImpl = makeSpawnImpl({ happyPath: true });

    // Act
    await runViaCli({ ...BASE_ARGS, spawnImpl });

    // Assert — find the analyze invocation (not the two probe spawns)
    const analyzeCall = spawnImpl.mock.calls.find(
      ([_, args]) => args.includes('--output-format'),
    );
    expect(analyzeCall).toBeDefined();
    const args = analyzeCall[1];
    expect(args).toContain('-p');
    expect(args).toContain('--output-format');
    expect(args[args.indexOf('--output-format') + 1]).toBe('stream-json');
    expect(args).toContain('--verbose');
    expect(args).toContain('--permission-mode');
    expect(args[args.indexOf('--permission-mode') + 1]).toBe('bypassPermissions');
    expect(args).toContain('--model');
    expect(args[args.indexOf('--model') + 1]).toBe('claude-opus-4-7');
    expect(args).toContain('--include-partial-messages');
  });

  it('throws AdapterTransportError(cli_nonzero_exit) when exit code != 0', async () => {
    // Arrange
    const spawnImpl = makeSpawnImpl({
      events: [{ type: 'system' }],
      stderr: 'boom from the cli',
      exitCode: 137,
    });

    // Act + Assert
    try {
      await runViaCli({ ...BASE_ARGS, spawnImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AdapterTransportError);
      expect(err.code).toBe('cli_nonzero_exit');
      expect(err.message).toContain('137');
      expect(err.message).toContain('boom from the cli');
    }
  });

  it('throws AdapterTransportError(cli_error_event) when the stream emits an error', async () => {
    // Arrange
    const spawnImpl = makeSpawnImpl({
      events: [
        { type: 'system' },
        { type: 'result', subtype: 'error', is_error: true, result: '' },
      ],
    });

    // Act + Assert
    try {
      await runViaCli({ ...BASE_ARGS, spawnImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err.code).toBe('cli_error_event');
    }
  });

  it('throws AdapterTransportError(cli_no_result) when no result event arrives', async () => {
    // Arrange
    const spawnImpl = makeSpawnImpl({
      events: [{ type: 'system' }, { type: 'assistant', message: { content: [] } }],
    });

    // Act + Assert
    try {
      await runViaCli({ ...BASE_ARGS, spawnImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err.code).toBe('cli_no_result');
    }
  });

  it('propagates AnalysisResponseError when result text is missing top_moments', async () => {
    // Arrange
    const partial = {
      metadata: EXAMPLE_RESPONSE.metadata,
      analysis_summary: EXAMPLE_RESPONSE.analysis_summary,
    };
    const spawnImpl = makeSpawnImpl({
      events: [
        { type: 'system' },
        { type: 'result', subtype: 'success', result: JSON.stringify(partial) },
      ],
    });

    // Act + Assert
    try {
      await runViaCli({ ...BASE_ARGS, spawnImpl });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AnalysisResponseError);
      expect(err.code).toBe('missing_top_moments');
    }
  });

  it('rejects with AbortError when the signal aborts mid-stream', async () => {
    // Arrange
    const controller = new AbortController();
    const spawnImpl = makeSpawnImpl({ happyPath: true });
    controller.abort();

    // Act + Assert
    await expect(
      runViaCli({ ...BASE_ARGS, signal: controller.signal, spawnImpl }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('accepts maxTokens for API parity (CLI ignores it; no spawn arg emitted)', async () => {
    // Arrange
    const spawnImpl = makeSpawnImpl({ happyPath: true });

    // Act
    const out = await runViaCli({ ...BASE_ARGS, maxTokens: 16_000, spawnImpl });

    // Assert — returns normally and no --max-tokens / max_tokens flag appears in argv
    expect(out.top_moments).toHaveLength(5);
    const analyzeCall = spawnImpl.mock.calls.find(
      ([, args]) => args.includes('--output-format'),
    );
    const args = analyzeCall[1];
    expect(args.some((a) => /max[-_]?tokens/i.test(String(a)))).toBe(false);
  });

  it('produces the same AnalysisResponse as runViaApi for identical fixtures (cross-adapter contract)', async () => {
    // Arrange
    const spawnImpl = makeSpawnImpl({ happyPath: true });
    const fromCli = await runViaCli({ ...BASE_ARGS, spawnImpl });

    // Act
    const { runViaApi } = await import('./claude-api.js');
    const fetchImpl = vi.fn().mockReturnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            content: [{ type: 'text', text: JSON.stringify(EXAMPLE_RESPONSE) }],
          }),
      }),
    );
    const fromApi = await runViaApi({
      systemPrompt: 'system',
      userMessage: 'user',
      modelId: 'claude-opus-4-7',
      apiKey: 'sk-ant-test',
      fetchImpl,
    });

    // Assert — both adapters yield deep-equal AnalysisResponse
    expect(fromCli).toEqual(fromApi);
  });
});
