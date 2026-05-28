import { describe, it, expect, vi } from 'vitest';
import {
  parseStreamJson,
  extractResultText,
  isErrorEvent,
} from './stream-json.js';

async function* fromLines(lines) {
  for (const line of lines) yield line;
}

async function collect(asyncIter) {
  const out = [];
  for await (const ev of asyncIter) out.push(ev);
  return out;
}

describe('parseStreamJson', () => {
  it('parses one event per line', async () => {
    // Arrange
    const chunks = fromLines([
      '{"type":"system","subtype":"init"}\n',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"hi"}]}}\n',
    ]);

    // Act
    const events = await collect(parseStreamJson(chunks));

    // Assert
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('system');
    expect(events[1].type).toBe('assistant');
  });

  it('reassembles lines split across chunks', async () => {
    // Arrange — JSON object straddles a chunk boundary
    const chunks = fromLines([
      '{"type":"result","subtype":',
      '"success","result":"hello"}\n',
    ]);

    // Act
    const events = await collect(parseStreamJson(chunks));

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('result');
    expect(events[0].result).toBe('hello');
  });

  it('handles \\r\\n line endings', async () => {
    // Arrange
    const chunks = fromLines(['{"type":"system","subtype":"init"}\r\n']);

    // Act
    const events = await collect(parseStreamJson(chunks));

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('system');
  });

  it('skips malformed JSON lines and calls onMalformed', async () => {
    // Arrange
    const onMalformed = vi.fn();
    const chunks = fromLines([
      '{"type":"system"}\n',
      'not-json-at-all\n',
      '{"type":"result","subtype":"success","result":"ok"}\n',
    ]);

    // Act
    const events = await collect(parseStreamJson(chunks, onMalformed));

    // Assert
    expect(events.map((e) => e.type)).toEqual(['system', 'result']);
    expect(onMalformed).toHaveBeenCalledWith('not-json-at-all');
  });

  it('tags unknown event types as "unknown"', async () => {
    // Arrange
    const chunks = fromLines([
      '{"type":"mystery_event","payload":1}\n',
    ]);

    // Act
    const events = await collect(parseStreamJson(chunks));

    // Assert
    expect(events[0].type).toBe('unknown');
    expect(events[0].raw).toEqual({ type: 'mystery_event', payload: 1 });
  });

  it('tags rows without a type field as "unknown"', async () => {
    // Arrange
    const chunks = fromLines(['{"foo":"bar"}\n']);

    // Act
    const events = await collect(parseStreamJson(chunks));

    // Assert
    expect(events[0].type).toBe('unknown');
  });

  it('drains a final non-terminated line', async () => {
    // Arrange
    const chunks = fromLines(['{"type":"system"}']);

    // Act
    const events = await collect(parseStreamJson(chunks));

    // Assert
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('system');
  });
});

describe('extractResultText', () => {
  it('returns the result string from a successful terminator event', () => {
    expect(
      extractResultText({ type: 'result', subtype: 'success', result: 'hi' }),
    ).toBe('hi');
  });

  it('returns null for non-result events', () => {
    expect(extractResultText({ type: 'assistant' })).toBeNull();
  });

  it('returns null when result field is missing', () => {
    expect(extractResultText({ type: 'result', subtype: 'success' })).toBeNull();
  });
});

describe('isErrorEvent', () => {
  it('detects explicit error type', () => {
    expect(isErrorEvent({ type: 'error', message: 'bad' })).toBe(true);
  });

  it('detects result with is_error=true', () => {
    expect(isErrorEvent({ type: 'result', is_error: true })).toBe(true);
  });

  it('detects result with subtype error', () => {
    expect(isErrorEvent({ type: 'result', subtype: 'error' })).toBe(true);
  });

  it('returns false for successful result', () => {
    expect(isErrorEvent({ type: 'result', subtype: 'success', result: 'x' })).toBe(false);
  });
});
