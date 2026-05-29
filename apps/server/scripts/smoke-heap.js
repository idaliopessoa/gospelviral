/**
 * In-process heap-invariant smoke for the streaming upload pipeline.
 *
 * Architectural INVARIANT (per TASK_014 v1.2):
 *   Upload NEVER buffers the whole file in RAM.
 *   Memory residency during a 2 GiB upload MUST be O(KB).
 *
 * Two gates, both must PASS:
 *   Gate A — parser + storage in isolation (parseMultipartUpload →
 *            storage.save). Proves the middle of the pipeline.
 *   Gate B — the full route handler via app.fetch with a streaming
 *            Request body. Proves the HTTP entry too, so a regression
 *            like `c.req.parseBody()` in routes/upload.js is caught here
 *            (Gate A would stay green and miss it).
 *
 * If Gate A passes and Gate B fails → the regression is in the route
 * handler, not the parser/storage. Diagnosis is immediate.
 *
 * Each gate samples `process.memoryUsage().heapUsed` every 100 ms and
 * asserts `max(heap) - baseline < 50 MB`. Exit non-zero on any failure.
 * Output: per-gate heap series CSV + one-line PASS/FAIL summary.
 *
 * Usage: `pnpm -F @gospelviral/server smoke:heap`
 *
 * Synthetic body: 1.5 GiB of zeros wrapped in a minimal multipart/form-data
 * envelope. The boundary is hand-rolled so the script pulls no fixture file.
 */

import { Readable } from 'node:stream';
import { mkdir, rm, writeFile, stat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const TARGET_BYTES = 1_500 * 1024 * 1024; // 1.5 GiB
const HEAP_DELTA_LIMIT = 50 * 1024 * 1024; // 50 MB
const SAMPLE_INTERVAL_MS = 100;
const BOUNDARY = '----GospelViralHeapSmoke7e8c-3f1a';
const CONTENT_TYPE = `multipart/form-data; boundary=${BOUNDARY}`;
const CHUNK = Buffer.alloc(64 * 1024, 0); // 64 KB zero chunk reused
const CHUNK_BYTES = CHUNK.length;

const silentLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: console.error,
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'memory_bank',
  'tasks',
  'evidence',
  'task_014',
);

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

/**
 * A Node Readable that emits a multipart envelope wrapping `bodyBytes` of
 * zeros, reusing a single 64 KB chunk so the producer never holds the full
 * payload in memory.
 */
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

/**
 * Run `work()` while sampling heapUsed every SAMPLE_INTERVAL_MS.
 * Returns { baseline, maxHeap, deltaHeap, samples }.
 */
async function measureHeap(work) {
  if (typeof global.gc === 'function') global.gc();
  await new Promise((r) => setTimeout(r, 200));

  const baseline = process.memoryUsage().heapUsed;
  const samples = [{ tMs: 0, heap: baseline }];
  const startedAt = Date.now();
  const sampler = setInterval(() => {
    samples.push({ tMs: Date.now() - startedAt, heap: process.memoryUsage().heapUsed });
  }, SAMPLE_INTERVAL_MS);

  try {
    await work();
  } finally {
    clearInterval(sampler);
  }

  await new Promise((r) => setTimeout(r, 200));
  samples.push({ tMs: Date.now() - startedAt, heap: process.memoryUsage().heapUsed });

  const maxHeap = samples.reduce((m, s) => (s.heap > m ? s.heap : m), baseline);
  return { baseline, maxHeap, deltaHeap: maxHeap - baseline, samples };
}

async function dirSizeOfBinary(dir) {
  // The upload dir holds <id>.<ext> + <id>.json. Return the largest file
  // (the binary). 0 if none.
  const entries = await readdir(dir);
  let max = 0;
  for (const e of entries) {
    if (e.endsWith('.json')) continue;
    const s = await stat(join(dir, e));
    if (s.size > max) max = s.size;
  }
  return max;
}

/**
 * Gate A — parser + storage in isolation.
 */
async function gateA() {
  const { createVideoStorage } = await import('../src/storage/video-storage.js');
  const { parseMultipartUpload } = await import('../src/lib/multipart-parser.js');

  const dir = join(tmpdir(), `smoke-heap-A-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  const storage = createVideoStorage({ dir, logger: silentLogger });
  await storage.init();

  const result = await measureHeap(async () => {
    await parseMultipartUpload(multipartStream(TARGET_BYTES), {
      contentType: CONTENT_TYPE,
      limits: { fileSize: TARGET_BYTES + 1024 },
      onFile: async (file) => {
        await storage.save({
          stream: file.stream,
          filename: file.filename,
          mimeType: file.mimeType,
        });
      },
    });
  });

  const writtenBytes = await dirSizeOfBinary(dir);
  await rm(dir, { recursive: true, force: true });
  return { ...result, writtenBytes };
}

/**
 * Gate B — full route handler via app.fetch with a streaming Request body.
 * Points the server's storage at a tmp dir via VIDEO_UPLOAD_DIR before the
 * env snapshot is taken (dynamic import).
 */
async function gateB() {
  const dir = join(tmpdir(), `smoke-heap-B-${randomUUID()}`);
  process.env.VIDEO_UPLOAD_DIR = dir;

  const { app, videoStorage } = await import('../src/server.js');
  await videoStorage.init();

  const result = await measureHeap(async () => {
    const webBody = Readable.toWeb(multipartStream(TARGET_BYTES));
    const req = new Request('http://localhost/api/upload/video', {
      method: 'POST',
      headers: { 'content-type': CONTENT_TYPE },
      body: webBody,
      duplex: 'half',
    });
    const res = await app.fetch(req);
    if (res.status !== 200) {
      throw new Error(`route returned ${res.status}: ${await res.text()}`);
    }
    // Drain the JSON response so the request fully settles.
    await res.json();
  });

  const writtenBytes = await dirSizeOfBinary(dir);
  await rm(dir, { recursive: true, force: true });
  return { ...result, writtenBytes };
}

function gateVerdict(r) {
  return r.deltaHeap < HEAP_DELTA_LIMIT && r.writtenBytes === TARGET_BYTES;
}

function gateLines(label, r, pass) {
  return [
    `-- ${label} --`,
    `  baseline heap : ${fmtBytes(r.baseline)}`,
    `  max heap      : ${fmtBytes(r.maxHeap)}`,
    `  delta heap    : ${fmtBytes(r.deltaHeap)}  (limit ${fmtBytes(HEAP_DELTA_LIMIT)})`,
    `  bytes on disk : ${fmtBytes(r.writtenBytes)}  (target ${fmtBytes(TARGET_BYTES)})`,
    `  samples       : ${r.samples.length}`,
    `  verdict       : ${pass ? 'PASS' : 'FAIL'}`,
  ];
}

async function writeCsv(name, r, pass) {
  const lines = ['tMs,heapUsedBytes,heapUsedMB'];
  for (const s of r.samples) {
    lines.push(`${s.tMs},${s.heap},${(s.heap / 1024 / 1024).toFixed(2)}`);
  }
  lines.push(
    `# baseline=${r.baseline} max=${r.maxHeap} delta=${r.deltaHeap} limit=${HEAP_DELTA_LIMIT} writtenBytes=${r.writtenBytes} targetBytes=${TARGET_BYTES} verdict=${pass ? 'PASS' : 'FAIL'}`,
  );
  await writeFile(join(EVIDENCE_DIR, name), lines.join('\n'));
}

async function run() {
  await mkdir(EVIDENCE_DIR, { recursive: true });

  const a = await gateA();
  const aPass = gateVerdict(a);
  await writeCsv('heap-invariant-gate-a.csv', a, aPass);

  const b = await gateB();
  const bPass = gateVerdict(b);
  await writeCsv('heap-invariant-gate-b.csv', b, bPass);

  // Keep the legacy combined filename pointing at Gate A for back-compat
  // with the TASK_014 PR evidence reference.
  await writeCsv('heap-invariant.csv', a, aPass);

  const out = [
    '== smoke:heap ==',
    `target upload   : ${fmtBytes(TARGET_BYTES)}`,
    ...gateLines('Gate A (parser + storage)', a, aPass),
    ...gateLines('Gate B (route handler via app.fetch)', b, bPass),
    `overall         : ${aPass && bPass ? 'PASS' : 'FAIL'}`,
    `evidence        : ${EVIDENCE_DIR}`,
  ];
  console.log(out.join('\n'));

  if (!aPass || !bPass) process.exit(1);
}

run().catch((e) => {
  console.error('smoke:heap crashed:', e);
  process.exit(1);
});
