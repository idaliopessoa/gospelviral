import { Hono } from 'hono';
import { detectRuntime, clearDetectionCache } from '../runtime/detect.js';

export function createDetectRouter() {
  const app = new Hono();
  app.get('/', async (c) => {
    if (c.req.query('refresh') === 'true') clearDetectionCache();
    const status = await detectRuntime();
    return c.json({ status: 'ok', data: status });
  });
  return app;
}
