import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE = 'ere_admin_session';
const SESSION_MS = 8 * 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const digest = (value) => createHash('sha256').update(value).digest();
const equal = (a, b) => timingSafeEqual(digest(a), digest(b));

// Storage implements async-compatible get/set/delete. Netlify supplies durable storage.
export function createAdminAuth({ username, password, secure = false, now = Date.now, store = new Map() } = {}) {
  const attempts = new Map();
  const configured = Boolean(username && password && password.length >= 16);
  const version = digest(`${username}:${password}`).toString('hex');
  const cookie = (token, age) => `${COOKIE}=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const keyFor = (token) => `${version}/${digest(token).toString('hex')}`;
  const reply = (body, status = 200, headers = {}) => Response.json(body, {
    status, headers: { 'Cache-Control': 'no-store', ...headers },
  });
  return async (request, { ip = 'local' } = {}) => {
    try {
      const url = new URL(request.url);
      const route = url.pathname;
      const token = (request.headers.get('cookie') || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
      const validToken = token && /^[a-f0-9]{64}$/.test(token);
      const sessionKey = validToken ? keyFor(token) : null;
      const authenticated = async () => {
        if (!configured || !sessionKey) return false;
        const expires = await store.get(sessionKey);
        if (typeof expires === 'number' && expires > now()) return true;
        if (expires) await store.delete(sessionKey);
        return false;
      };
      if (request.method !== 'GET' && (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json') ||
        (request.headers.get('origin') && request.headers.get('origin') !== url.origin))) {
        return reply({ error: 'Request not allowed.' }, 403);
      }
      if (route === '/api/admin/session' && request.method === 'GET') {
        return reply({ authenticated: await authenticated() });
      }
      if (route === '/api/admin/login' && request.method === 'POST') {
        if (!configured) return reply({ error: 'Admin sign-in is not configured. Contact the website owner.' }, 503);
        for (const [key, value] of attempts) if (value.expires <= now()) attempts.delete(key);
        const failures = attempts.get(ip) || { count: 0, expires: now() + WINDOW_MS };
        if (failures.count >= 5) return reply({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }, 429,
          { 'Retry-After': String(Math.ceil((failures.expires - now()) / 1000)) });
        const raw = await request.text();
        if (raw.length > 4096) return reply({ error: 'Request too large.' }, 413);
        let body;
        try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid request.' }, 400); }
        const validUser = typeof body?.username === 'string' && equal(body.username, username);
        const validPassword = typeof body?.password === 'string' && equal(body.password, password);
        if (!validUser || !validPassword) {
          failures.count += 1;
          attempts.set(ip, failures);
          return reply({ error: 'Incorrect username or password.' }, 401);
        }
        attempts.delete(ip);
        if (sessionKey) await store.delete(sessionKey);
        const nextToken = randomBytes(32).toString('hex');
        await store.set(keyFor(nextToken), now() + SESSION_MS);
        return reply({ authenticated: true }, 200, { 'Set-Cookie': cookie(nextToken, SESSION_MS / 1000) });
      }
      if (route === '/api/admin/logout' && request.method === 'POST') {
        if (sessionKey) await store.delete(sessionKey);
        return reply({ authenticated: false }, 200, { 'Set-Cookie': cookie('', 0) });
      }
      // A null response authorizes the caller to handle a future admin data API.
      if (!await authenticated()) return reply({ error: 'Sign in to continue.' }, 401);
      return null;
    } catch {
      // Storage outages must never grant access or expose infrastructure details.
      return reply({ error: 'Sign-in is unavailable. Please try again shortly.' }, 503);
    }
  };
}

// Adapter for local development and optional standalone Node hosting.
export function installAdminAuth(app, options) {
  const auth = createAdminAuth(options);
  app.use('/api/admin', async (req, res, next) => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(key, value);
    const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
      method: req.method, headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });
    const response = await auth(request, { ip: req.ip });
    if (!response) return next();
    response.headers.forEach((value, key) => res.set(key, value));
    res.status(response.status).send(await response.text());
  });
}
