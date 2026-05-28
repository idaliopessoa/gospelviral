/**
 * Line-delimited JSON parser for the Claude Code CLI's `--output-format
 * stream-json --verbose` stdout.
 *
 * Reads an `AsyncIterable<Buffer|string>` (`process.stdout` works), buffers
 * partial lines across chunks, and yields typed `StreamEvent` objects.
 *
 * Event shape — verified against `claude` 2.1.153 live smoke (committed
 * fixture: `__fixtures__/smoke-events.jsonl`):
 *
 *   { type: 'system', subtype: 'init' | 'hook_started' | 'hook_response', ... }
 *   { type: 'assistant', message: { content: [{ type: 'text'|'thinking', ... }] } }
 *   { type: 'rate_limit_event', ... }
 *   { type: 'result', subtype: 'success'|'error', result: '<final text>' }   ← terminator
 *
 * Unknown event types are NOT fatal; they are emitted as
 * `{ type: 'unknown', raw: <parsed-object> }` so a future CLI release that
 * adds new event types does not crash the adapter.
 *
 * @typedef {{ type: string, [k: string]: unknown }} StreamEvent
 */

const KNOWN_TYPES = new Set([
  'system',
  'assistant',
  'user',
  'tool_use',
  'tool_result',
  'rate_limit_event',
  'result',
  'error',
]);

function classify(parsed) {
  if (typeof parsed?.type !== 'string') return { type: 'unknown', raw: parsed };
  if (KNOWN_TYPES.has(parsed.type)) return parsed;
  return { type: 'unknown', raw: parsed };
}

function parseLine(line, onMalformed) {
  if (!line) return null;
  try {
    return classify(JSON.parse(line));
  } catch {
    onMalformed?.(line);
    return null;
  }
}

/**
 * @param {AsyncIterable<Buffer|string>} chunks
 * @param {(line: string) => void} [onMalformed]   called for non-JSON lines
 * @returns {AsyncIterable<StreamEvent>}
 */
export async function* parseStreamJson(chunks, onMalformed) {
  let buffer = '';
  for await (const chunk of chunks) {
    buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const rawLine = buffer.slice(0, newlineIndex).replace(/\r$/, '');
      buffer = buffer.slice(newlineIndex + 1);
      const event = parseLine(rawLine, onMalformed);
      if (event) yield event;
    }
  }
  if (buffer.length > 0) {
    const event = parseLine(buffer.replace(/\r$/, ''), onMalformed);
    if (event) yield event;
  }
}

/**
 * @param {StreamEvent} event
 * @returns {string|null} the final result text when this is the terminator
 *                       event, otherwise null.
 */
export function extractResultText(event) {
  if (event?.type !== 'result') return null;
  if (typeof event.result === 'string') return event.result;
  return null;
}

/**
 * @param {StreamEvent} event
 * @returns {boolean} true if this event indicates the CLI emitted an error
 *                   instead of a successful result.
 */
export function isErrorEvent(event) {
  if (event?.type === 'error') return true;
  if (event?.type === 'result' && event.subtype === 'error') return true;
  if (event?.type === 'result' && event.is_error === true) return true;
  return false;
}
