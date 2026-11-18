import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installAdminAuth } from './auth.mjs';
import { createContentHandler } from './content.mjs';
import { createLocalContentStore } from './local-content-store.mjs';

const app = express();
const production = process.env.NODE_ENV === 'production';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
app.disable('x-powered-by');
// Set TRUST_PROXY=1 only when hosted behind one trusted reverse proxy.
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(express.json({ limit: '3mb' }));
app.use('/admin', (_req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Cache-Control', 'no-store');
  next();
});
installAdminAuth(app, {
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD,
  secure: production,
});
const content = createContentHandler({
  store: createLocalContentStore(path.join(root, '.ere-data')),
  // /api/admin requests have already passed installAdminAuth above.
  authorize: async () => null,
});
app.all(['/api/content', '/api/admin/content'], async (req, res) => {
  const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
    method: req.method,
    headers: Object.fromEntries(Object.entries(req.headers).filter(([, value]) => typeof value === 'string')),
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
  });
  const response = await content(request);
  response.headers.forEach((value, key) => res.set(key, value));
  res.status(response.status).send(await response.text());
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));
if (production) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => console.log(`ERE website: http://localhost:${port}`));
