import { Hono } from 'hono';
import { OPTIMIZED_PROMPT, AnalysisResponseError } from '@gospelviral/shared';
import { runViaApi as defaultRunViaApi } from '../runtime/claude-api.js';
import { runViaCli as defaultRunViaCli } from '../runtime/claude-cli.js';
import { detectRuntime as defaultDetectRuntime } from '../runtime/detect.js';
import { resolveModel } from '../config/models.js';
import { env } from '../config/env.js';
import { buildUserMessage } from '../lib/build-user-message.js';
import { validateAnalyzeBody } from '../lib/validation.js';
import {
  AdapterConfigError,
  AdapterTransportError,
  AdapterTimeoutError,
} from '../runtime/errors.js';

function err(code, message, status) {
  return { body: { status: 'error', code, message }, status };
}

function pickAdapter({ mode, detection, runViaCli, runViaApi }) {
  if (mode === 'cli') {
    if (!detection.cli.available) {
      return { adapter: null, error: err('cli_unavailable', 'Claude CLI not found on PATH.', 503) };
    }
    return { adapter: { fn: runViaCli, binPath: detection.cli.binPath }, error: null };
  }
  if (mode === 'api') {
    if (!detection.apiKey) {
      return { adapter: null, error: err('api_key_missing', 'ANTHROPIC_API_KEY is not configured.', 503) };
    }
    return { adapter: { fn: runViaApi, binPath: null }, error: null };
  }
  // auto
  if (detection.recommended === 'cli') {
    return { adapter: { fn: runViaCli, binPath: detection.cli.binPath }, error: null };
  }
  if (detection.recommended === 'api') {
    return { adapter: { fn: runViaApi, binPath: null }, error: null };
  }
  return {
    adapter: null,
    error: err('no_runtime_available', 'Neither Claude CLI nor an API key is available.', 503),
  };
}

function mapAdapterError(e) {
  if (e?.name === 'AbortError') return err('timeout', 'Analysis exceeded the timeout.', 504);
  if (e instanceof AdapterTimeoutError) return err('timeout', 'Analysis exceeded the timeout.', 504);
  if (e instanceof AdapterConfigError) return err('runtime_misconfigured', e.message, 503);
  if (e instanceof AnalysisResponseError) {
    return err('parse_failed', 'The model response could not be parsed.', 502);
  }
  if (e instanceof AdapterTransportError) {
    return err('adapter_failed', `Adapter call failed (${e.code}).`, 502);
  }
  return err('adapter_failed', 'Analysis failed unexpectedly.', 502);
}

async function withTimeout(promise, signal, timeoutMs, abortController) {
  const timer = setTimeout(() => abortController.abort(), timeoutMs);
  signal?.addEventListener?.('abort', () => abortController.abort(), { once: true });
  try {
    return await promise;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {{
 *   runViaCli?: typeof defaultRunViaCli,
 *   runViaApi?: typeof defaultRunViaApi,
 *   detectRuntime?: typeof defaultDetectRuntime,
 *   timeoutMs?: number,
 * }} [deps]
 */
export function createAnalyzeRouter(deps = {}) {
  const runViaCli = deps.runViaCli ?? defaultRunViaCli;
  const runViaApi = deps.runViaApi ?? defaultRunViaApi;
  const detectRuntime = deps.detectRuntime ?? defaultDetectRuntime;
  const timeoutMs = deps.timeoutMs ?? env.analyzeTimeoutMs;

  const app = new Hono();

  app.post('/', async (c) => {
    const body = await c.req.json().catch(() => null);
    const validation = validateAnalyzeBody(body);
    if (!validation.ok) {
      return c.json({ status: 'error', ...validation.error }, 400);
    }
    const { transcript, mode, model } = validation.body;
    const detection = await detectRuntime();
    const pick = pickAdapter({ mode, detection, runViaCli, runViaApi });
    if (pick.error) {
      return c.json(pick.error.body, pick.error.status);
    }

    const abortController = new AbortController();
    const adapterArgs = {
      systemPrompt: OPTIMIZED_PROMPT,
      userMessage: buildUserMessage(transcript),
      modelId: resolveModel(model),
      signal: abortController.signal,
    };
    if (pick.adapter.binPath) adapterArgs.binPath = pick.adapter.binPath;

    try {
      const data = await withTimeout(
        pick.adapter.fn(adapterArgs),
        c.req.raw.signal,
        timeoutMs,
        abortController,
      );
      return c.json({ status: 'ok', data });
    } catch (e) {
      const mapped = mapAdapterError(e);
      return c.json(mapped.body, mapped.status);
    }
  });

  return app;
}
