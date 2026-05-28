import { spawn } from 'node:child_process';
import { parseAnalysisResponse } from '@gospelviral/shared';
import { probeCapabilities } from './claude-cli-capabilities.js';
import { AdapterConfigError, AdapterTransportError } from './errors.js';
import {
  parseStreamJson,
  extractResultText,
  isErrorEvent,
} from '../parsers/stream-json.js';

function buildArgs(modelId, capabilities) {
  const args = [
    '-p',
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    'bypassPermissions',
    '--model',
    modelId,
  ];
  if (capabilities?.hasIncludePartialMessages) {
    args.push('--include-partial-messages');
  }
  return args;
}

function writePromptToStdin(child, systemPrompt, userMessage) {
  const composed = `${systemPrompt}\n\n${userMessage}`;
  return new Promise((resolve, reject) => {
    child.stdin.on('error', reject);
    child.stdin.end(composed, 'utf8', () => resolve());
  });
}

function attachAbortHandler(child, signal) {
  if (!signal) return () => {};
  const onAbort = () => {
    try {
      if (typeof child.pid === 'number') {
        // POSIX: kill the process group; child was spawned detached.
        process.kill(-child.pid, 'SIGTERM');
      }
    } catch {
      try {
        child.kill('SIGTERM');
      } catch {
        /* already dead */
      }
    }
  };
  if (signal.aborted) {
    onAbort();
  } else {
    signal.addEventListener('abort', onAbort, { once: true });
  }
  return () => signal.removeEventListener?.('abort', onAbort);
}

async function consumeStream(child, onMalformed) {
  let resultText = null;
  let errorEvent = null;
  for await (const event of parseStreamJson(child.stdout, onMalformed)) {
    if (isErrorEvent(event)) {
      errorEvent = event;
      continue;
    }
    const text = extractResultText(event);
    if (text != null) resultText = text;
  }
  return { resultText, errorEvent };
}

function collectStderr(child) {
  const chunks = [];
  child.stderr.on('data', (c) => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
  return () => Buffer.concat(chunks).toString('utf8').trim();
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal }));
  });
}

/**
 * Spawn the Claude Code CLI, deliver the prompt via stdin, parse the
 * stream-json output, and resolve to a canonical `AnalysisResponse`. Same
 * contract as `runViaApi` (DEC_014) — callers cannot tell the two apart.
 *
 * `maxTokens` is accepted for API parity but is NOT forwarded to the CLI
 * binary: the Claude Code CLI exposes no `--max-tokens` flag and pulls the
 * model's native context window automatically. The parameter is documented
 * in the signature so callers can hand `runVia*` the same options object.
 *
 * @param {{
 *   systemPrompt: string,
 *   userMessage: string,
 *   modelId: string,
 *   maxTokens?: number,
 *   signal?: AbortSignal,
 *   binPath?: string,
 *   spawnImpl?: typeof spawn,
 *   onMalformedLine?: (line: string) => void,
 * }} options
 * @returns {Promise<import('@gospelviral/shared').AnalysisResponse>}
 */
export async function runViaCli({
  systemPrompt,
  userMessage,
  modelId,
  maxTokens: _maxTokens,
  signal,
  binPath,
  spawnImpl = spawn,
  onMalformedLine,
}) {
  if (!binPath) {
    throw new AdapterConfigError(
      'missing_bin_path',
      'binPath is required; runtime detection should supply it.',
    );
  }

  let capabilities;
  try {
    capabilities = await probeCapabilities(binPath, { spawnImpl });
  } catch (err) {
    throw new AdapterTransportError('cli_probe_failed', `CLI capability probe failed: ${err?.message ?? 'unknown'}`);
  }

  const args = buildArgs(modelId, capabilities);
  // Strip ANTHROPIC_API_KEY from the child env: when set, the Claude Code
  // CLI prefers the API key over the OAuth session and exits 1 (without
  // stderr output) if the key is rejected. The server holds an
  // intentionally-invalid key during local dev (see .env.local). The CLI
  // adapter is supposed to ride the user's OAuth/subscription regardless
  // of what the server's env says.
  const childEnv = { ...process.env };
  delete childEnv.ANTHROPIC_API_KEY;
  const child = spawnImpl(binPath, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
    env: childEnv,
  });

  const detachAbort = attachAbortHandler(child, signal);
  const readStderr = collectStderr(child);

  try {
    await writePromptToStdin(child, systemPrompt, userMessage);
    const [{ resultText, errorEvent }, exit] = await Promise.all([
      consumeStream(child, onMalformedLine),
      waitForExit(child),
    ]);

    if (signal?.aborted) {
      const e = new Error('Aborted');
      e.name = 'AbortError';
      throw e;
    }

    if (exit.code !== 0) {
      const stderrText = readStderr();
      const stderrSnippet = stderrText ? ` stderr: ${stderrText.slice(0, 240)}` : '';
      throw new AdapterTransportError(
        'cli_nonzero_exit',
        `Claude CLI exited with code ${exit.code}.${stderrSnippet}`,
        { status: exit.code },
      );
    }

    if (errorEvent) {
      const subtype = typeof errorEvent.subtype === 'string' ? errorEvent.subtype : 'unknown';
      throw new AdapterTransportError(
        'cli_error_event',
        `Claude CLI emitted an error event (subtype=${subtype}).`,
      );
    }

    if (!resultText) {
      throw new AdapterTransportError(
        'cli_no_result',
        'Claude CLI finished without emitting a result event.',
      );
    }

    return parseAnalysisResponse(resultText);
  } finally {
    detachAbort();
  }
}
