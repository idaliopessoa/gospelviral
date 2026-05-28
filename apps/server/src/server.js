import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { env } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { createAnalyzeRouter } from './routes/analyze.js';
import { createDetectRouter } from './routes/detect.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
);

const logger = createLogger({ level: env.logLevel, baseCtx: { scope: 'server' } });

export const app = new Hono();

app.get('/healthz', (c) =>
  c.json({ status: 'ok', version: pkg.version }),
);

app.route('/api/analyze', createAnalyzeRouter());
app.route('/api/runtime/detect', createDetectRouter());

const isMain = import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  serve({ fetch: app.fetch, port: env.port }, (info) => {
    logger.info('listening', { port: info.port });
  });
}

export { logger };
