import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { env } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { createAnalyzeRouter } from './routes/analyze.js';
import { createDetectRouter } from './routes/detect.js';
import { createUploadRouter } from './routes/upload.js';
import { createVideoStorage } from './storage/video-storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
);

const logger = createLogger({ level: env.logLevel, baseCtx: { scope: 'server' } });

export const videoStorage = createVideoStorage({
  dir: env.videoUploadDir,
  logger: createLogger({ level: env.logLevel, baseCtx: { scope: 'video-storage' } }),
});

export const app = new Hono();

app.get('/healthz', (c) =>
  c.json({ status: 'ok', version: pkg.version }),
);

app.route('/api/analyze', createAnalyzeRouter());
app.route('/api/runtime/detect', createDetectRouter());
app.route(
  '/api/upload/video',
  createUploadRouter({
    storage: videoStorage,
    allowedMimes: env.videoAllowedMimes,
    maxBytes: env.maxUploadSizeBytes,
    streamChunkBytes: env.streamChunkBytes,
  }),
);

const isMain = import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  await videoStorage.init();
  serve({ fetch: app.fetch, port: env.port }, (info) => {
    logger.info('listening', { port: info.port });
  });
}

export { logger };
