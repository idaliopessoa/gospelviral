import { Hono } from 'hono';
import { serve } from '@hono/node-server';

export const app = new Hono();

app.get('/healthz', (c) => c.json({ ok: true }));

const isMain = import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  const port = Number(process.env.PORT) || 8787;
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`[server] listening on http://localhost:${info.port}`);
  });
}
