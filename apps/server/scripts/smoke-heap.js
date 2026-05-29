/**
 * In-process heap-invariant smoke for the streaming upload pipeline.
 *
 * Architectural INVARIANT (per TASK_014 v1.2):
 *   Upload NEVER buffers the whole file in RAM.
 *   Memory residency during a 2 GiB upload MUST be O(KB).
 *
 * This script imports the multipart parser + storage directly (no HTTP
 * layer, no debug endpoint), pipes a synthesized 1.5 GiB multipart body
 * through them into a tmpdir, and samples `process.memoryUsage().heapUsed`
 * every 100 ms.
 *
 * Gate: max(heap) - baseline < 50 MB.
 * Exit non-zero on assertion failure. Output: heap series CSV +
 * one-line PASS/FAIL summary printed to stdout.
 *
 * Usage: `pnpm -F @gospelviral/server smoke:heap`
 *
 * Synthetic body: 1.5 GiB of zeros (via /dev/zero on POSIX) wrapped in a
 * minimal multipart/form-data envelope. The boundary is hand-rolled so
 * the script does not pull a fixture file from disk.
 */

import { Readable } from 'node:stream';
import { mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { parseMultipartUpload } from '../src/lib/multipart-parser.js';
import { createVideoStorage } from '../src/storage/video-storage.js';

const TARGET_BYTES = 1_500 * 1024 * 1024; // 1.5 GiB
const HEAP_DELTA_LIMIT = 50 * 1024 * 1024; // 50 MB
const SAMPLE_INTERVAL_MS = 100;
const BOUNDARY = '----GospelViralHeapSmoke7e8c-3f1a';
const CHUNK = Buffer.alloc(64 * 1024, 0); // 64 KB zero chunk reused
const CHUNK_BYTES = CHUNK.length;

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: console.error,
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = resolve(__dirname, '..', '..', '..', 'memory_bank', 'tasks', 'evidence', 'task_014');

function buildHead() {
  return Buffer.from(
    `--${BOUNDARY}\r\n` +
      'Content-Disposition: form-data; name="video"; filename="big.mp4"\r\n' +
      'Content-Type: video/mp4\r\n' +
      '\r\n',
    'utf-8',
  );
}

function buildTail() {
  return Buffer.from(`\r\n--${BOUNDARY}--\r\n`, 'utf-8');
}

function multipartStream(bodyBytes) {
  const head = buildHead();
  const tail = buildTail();
  let emittedHead = false;
  let bodyEmitted = 0;
  let tailEmitted = false;

  return new Readable({
    read() {
      if (!emittedHead) {
        emittedHead = true;
        this.push(head);
        return;
      }
      if (bodyEmitted < bodyBytes) {
        const remaining = bodyBytes - bodyEmitted;
        const slice = remaining >= CHUNK_BYTES ? CHUNK : CHUNK.subarray(0, remaining);
        bodyEmitted += slice.length;
        this.push(slice);
        return;
      }
      if (!tailEmitted) {
        tailEmitted = true;
        this.push(tail);
        return;
      }
      this.push(null);
    },
  });
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

async function run() {
  const dir = join(tmpdir(), `smoke-heap-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  const storage = createVideoStorage({ dir, logger: silentLogger });
  await storage.init();

  // Stabilize baseline (encourage GC; --expose-gc not assumed).
  if (typeof global.gc === 'function') global.gc();
  await new Promise((r) => setTimeout(r, 200));

  const baseline = process.memoryUsage().heapUsed;
  const samples = [{ tMs: 0, heap: baseline }];
  const startedAt = Date.now();

  const sampler = setInterval(() => {
    samples.push({
      tMs: Date.now() - startedAt,
      heap: process.memoryUsage().heapUsed,
    });
  }, SAMPLE_INTERVAL_MS);

  const stream = multipartStream(TARGET_BYTES);
  const contentType = `multipart/form-data; boundary=${BOUNDARY}`;

  let savedVideoSource = null;
  try {
    await parseMultipartUpload(stream, {
      contentType,
      limits: { fileSize: TARGET_BYTES + 1024 },
      onFile: async (file) => {
        savedVideoSource = await storage.save({
          stream: file.stream,
          filename: file.filename,
          mimeType: file.mimeType,
        });
      },
    });
  } finally {
    clearInterval(sampler);
  }

  // Final sample post-pipeline (let any IO finish settling)
  await new Promise((r) => setTimeout(r, 200));
  samples.push({
    tMs: Date.now() - startedAt,
    heap: process.memoryUsage().heapUsed,
  });

  // Sanity: did we actually persist the bytes?
  let writtenBytes = 0;
  if (savedVideoSource) {
    const binaryPath = join(dir, `${savedVideoSource.id}.mp4`);
    const s = await stat(binaryPath);
    writtenBytes = s.size;
  }

  // Cleanup
  await rm(dir, { recursive: true, force: true });

  const maxHeap = samples.reduce((max, s) => (s.heap > max ? s.heap : max), baseline);
  const deltaHeap = maxHeap - baseline;
  const pass = deltaHeap < HEAP_DELTA_LIMIT && writtenBytes === TARGET_BYTES;

  // Emit CSV evidence
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const csvLines = ['tMs,heapUsedBytes,heapUsedMB'];
  for (const s of samples) {
    csvLines.push(`${s.tMs},${s.heap},${(s.heap / 1024 / 1024).toFixed(2)}`);
  }
  csvLines.push(
    `# baseline=${baseline} max=${maxHeap} delta=${deltaHeap} limit=${HEAP_DELTA_LIMIT} writtenBytes=${writtenBytes} targetBytes=${TARGET_BYTES} verdict=${pass ? 'PASS' : 'FAIL'}`,
  );
  await writeFile(join(EVIDENCE_DIR, 'heap-invariant.csv'), csvLines.join('\n'));

  const lines = [
    '== smoke:heap ==',
    `target upload  : ${fmtBytes(TARGET_BYTES)}`,
    `baseline heap  : ${fmtBytes(baseline)}`,
    `max heap       : ${fmtBytes(maxHeap)}`,
    `delta heap     : ${fmtBytes(deltaHeap)}`,
    `delta limit    : ${fmtBytes(HEAP_DELTA_LIMIT)}`,
    `bytes on disk  : ${fmtBytes(writtenBytes)} (target ${fmtBytes(TARGET_BYTES)})`,
    `samples        : ${samples.length}`,
    `verdict        : ${pass ? 'PASS' : 'FAIL'}`,
    `evidence       : ${join(EVIDENCE_DIR, 'heap-invariant.csv')}`,
  ];
  console.log(lines.join('\n'));

  if (!pass) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('smoke:heap crashed:', e);
  process.exit(1);
});
