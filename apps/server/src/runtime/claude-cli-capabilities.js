import { spawn } from 'node:child_process';

const cache = new Map();

function collectStdout(child) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    child.stdout.on('data', (c) => chunks.push(c));
    child.stderr.on('data', () => {});
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout: Buffer.concat(chunks).toString('utf8') });
    });
  });
}

async function probeOnce(binPath) {
  const help = await collectStdout(spawn(binPath, ['-p', '--help']));
  const versionOut = await collectStdout(spawn(binPath, ['--version']));
  return {
    version: versionOut.stdout.trim().split(/\s+/)[0] || 'unknown',
    hasIncludePartialMessages: /--include-partial-messages/.test(help.stdout),
    hasAddDir: /--add-dir/.test(help.stdout),
  };
}

/**
 * Probe the Claude Code CLI for capability flags. Memoized per binPath so
 * repeat calls are cheap.
 *
 * @param {string} binPath  absolute path to the `claude` binary
 * @param {{ spawnImpl?: typeof spawn }} [opts]   test seam
 * @returns {Promise<{ version: string, hasIncludePartialMessages: boolean, hasAddDir: boolean }>}
 */
export async function probeCapabilities(binPath, opts = {}) {
  const key = binPath;
  if (cache.has(key)) return cache.get(key);

  const impl = opts.spawnImpl ?? spawn;
  const probeFn = opts.spawnImpl ? makeProbe(impl) : probeOnce;
  const promise = probeFn(binPath);
  cache.set(key, promise);
  try {
    return await promise;
  } catch (err) {
    cache.delete(key);
    throw err;
  }
}

function makeProbe(spawnImpl) {
  return async (binPath) => {
    const help = await collectStdoutFrom(spawnImpl(binPath, ['-p', '--help']));
    const version = await collectStdoutFrom(spawnImpl(binPath, ['--version']));
    return {
      version: version.stdout.trim().split(/\s+/)[0] || 'unknown',
      hasIncludePartialMessages: /--include-partial-messages/.test(help.stdout),
      hasAddDir: /--add-dir/.test(help.stdout),
    };
  };
}

function collectStdoutFrom(child) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    child.stdout.on('data', (c) => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
    child.stderr.on('data', () => {});
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout: Buffer.concat(chunks).toString('utf8') });
    });
  });
}

export function clearCapabilityCache() {
  cache.clear();
}
