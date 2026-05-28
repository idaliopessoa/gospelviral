/**
 * Minimal structured logger. Emits one JSON line per call to stdout
 * (`process.stdout.write`), matching `{ ts, level, msg, ...ctx }`. No
 * external dependency.
 */

const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });

function shouldEmit(level, configuredLevel) {
  return (LEVELS[level] ?? LEVELS.info) >= (LEVELS[configuredLevel] ?? LEVELS.info);
}

function emit(level, msg, ctx, configuredLevel, baseCtx, sink) {
  if (!shouldEmit(level, configuredLevel)) return;
  const line = { ts: new Date().toISOString(), level, msg, ...baseCtx, ...ctx };
  sink(`${JSON.stringify(line)}\n`);
}

/**
 * @param {object} [options]
 * @param {'debug'|'info'|'warn'|'error'} [options.level]
 * @param {Record<string, unknown>} [options.baseCtx]
 * @param {(line: string) => void} [options.sink]   default: process.stdout.write
 */
export function createLogger(options = {}) {
  const configuredLevel = options.level ?? 'info';
  const baseCtx = options.baseCtx ?? {};
  const sink = options.sink ?? ((line) => process.stdout.write(line));

  function log(level, msg, ctx) {
    emit(level, msg, ctx, configuredLevel, baseCtx, sink);
  }

  return {
    debug: (msg, ctx) => log('debug', msg, ctx),
    info: (msg, ctx) => log('info', msg, ctx),
    warn: (msg, ctx) => log('warn', msg, ctx),
    error: (msg, ctx) => log('error', msg, ctx),
    child: (childCtx) =>
      createLogger({
        level: configuredLevel,
        baseCtx: { ...baseCtx, ...childCtx },
        sink,
      }),
  };
}
