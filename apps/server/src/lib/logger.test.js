import { describe, it, expect, vi } from 'vitest';
import { createLogger } from './logger.js';

describe('createLogger', () => {
  it('emits one JSON line per call with ts, level, msg, ctx', () => {
    // Arrange
    const sink = vi.fn();
    const logger = createLogger({ sink, level: 'debug' });

    // Act
    logger.info('hello', { user: 42 });

    // Assert
    expect(sink).toHaveBeenCalledOnce();
    const raw = sink.mock.calls[0][0];
    expect(raw.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(raw);
    expect(parsed.level).toBe('info');
    expect(parsed.msg).toBe('hello');
    expect(parsed.user).toBe(42);
    expect(typeof parsed.ts).toBe('string');
  });

  it('suppresses log lines below the configured level', () => {
    // Arrange
    const sink = vi.fn();
    const logger = createLogger({ sink, level: 'warn' });

    // Act
    logger.debug('debug-msg');
    logger.info('info-msg');
    logger.warn('warn-msg');
    logger.error('error-msg');

    // Assert — only warn + error emitted
    expect(sink).toHaveBeenCalledTimes(2);
    const levels = sink.mock.calls.map(([line]) => JSON.parse(line).level);
    expect(levels).toEqual(['warn', 'error']);
  });

  it('child loggers merge baseCtx into every line', () => {
    // Arrange
    const sink = vi.fn();
    const logger = createLogger({ sink, level: 'info', baseCtx: { app: 'gospel' } });
    const child = logger.child({ scope: 'runtime' });

    // Act
    child.info('boot');

    // Assert
    const parsed = JSON.parse(sink.mock.calls[0][0]);
    expect(parsed.app).toBe('gospel');
    expect(parsed.scope).toBe('runtime');
    expect(parsed.msg).toBe('boot');
  });
});
