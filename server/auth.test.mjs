import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAdminAuth, installAdminAuth } from './auth.mjs';

const credentials = { username: 'test-admin', password: 'test-password-only-123' };
async function fixture(t, options = {}) {
  const app = express();
  app.use(express.json());
  installAdminAuth(app, { ...credentials, ...options });
  app.get('/api/admin/private', (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (route, body, headers = {}) => fetch(`${base}/api/admin/${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return request;
}

test('anonymous and forged sessions cannot access protected APIs', async (t) => {
  const request = await fixture(t);
  assert.equal((await request('private')).status, 401);
  assert.equal((await request('private', undefined, { Cookie: 'ere_admin_session=forged' })).status, 401);
  assert.deepEqual(await (await request('session')).json(), { authenticated: false });
});

test('login, reload validation, rotation and logout revoke sessions', async (t) => {
  const request = await fixture(t, { secure: true });
  const login = await request('login', credentials);
  assert.equal(login.status, 200);
  assert.equal(login.headers.get('cache-control'), 'no-store');
  const setCookie = login.headers.get('set-cookie');
  for (const flag of ['HttpOnly', 'SameSite=Strict', 'Secure', 'Path=/api/admin', 'Max-Age=28800']) assert.ok(setCookie.includes(flag));
  const headers = { Cookie: setCookie.split(';')[0] };
  assert.deepEqual(await (await request('session', undefined, headers)).json(), { authenticated: true });
  assert.equal((await request('private', undefined, headers)).status, 200);
  const rotated = await request('login', credentials, headers);
  assert.equal((await request('private', undefined, headers)).status, 401);
  const newHeaders = { Cookie: rotated.headers.get('set-cookie').split(';')[0] };
  const logout = await request('logout', {}, newHeaders);
  assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'));
  assert.equal((await request('private', undefined, newHeaders)).status, 401);
});

test('expired sessions are rejected', async (t) => {
  let time = 1000;
  const request = await fixture(t, { now: () => time });
  const login = await request('login', credentials);
  const headers = { Cookie: login.headers.get('set-cookie').split(';')[0] };
  time += 8 * 60 * 60 * 1000;
  assert.equal((await request('private', undefined, headers)).status, 401);
});

test('missing or weak configured credentials disable login', async (t) => {
  for (const password of [undefined, 'short']) {
    const request = await fixture(t, { password });
    assert.equal((await request('login', credentials)).status, 503);
  }
});

test('failed logins throttle and recover after the window', async (t) => {
  let time = 1000;
  const request = await fixture(t, { now: () => time });
  for (let i = 0; i < 5; i++) {
    const result = await request('login', { username: 'wrong', password: 'wrong' });
    assert.equal(result.status, 401);
    assert.equal(result.headers.get('set-cookie'), null);
  }
  const blocked = await request('login', credentials);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('retry-after'), '900');
  time += 15 * 60 * 1000;
  assert.equal((await request('login', credentials)).status, 200);
});

test('cross-origin and form submissions cannot log in or sign out', async (t) => {
  const request = await fixture(t);
  assert.equal((await request('login', credentials, { Origin: 'https://other.example' })).status, 403);
  assert.equal((await request('logout', {}, { Origin: 'https://other.example' })).status, 403);
  assert.equal((await request('login', credentials, { 'Content-Type': 'text/plain' })).status, 403);
});

test('separate serverless instances share sessions and observe logout immediately', async () => {
  const records = new Map();
  const store = {
    get: async (key) => records.get(key),
    set: async (key, value) => records.set(key, value),
    delete: async (key) => records.delete(key),
  };
  const first = createAdminAuth({ ...credentials, store, secure: true });
  const second = createAdminAuth({ ...credentials, store, secure: true });
  const login = await first(new Request('https://demo.example/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials),
  }));
  const Cookie = login.headers.get('set-cookie').split(';')[0];
  const session = () => new Request('https://demo.example/api/admin/session', { headers: { Cookie } });
  assert.equal((await (await second(session())).json()).authenticated, true);
  await first(new Request('https://demo.example/api/admin/logout', {
    method: 'POST', headers: { Cookie, 'Content-Type': 'application/json' }, body: '{}',
  }));
  assert.equal((await (await second(session())).json()).authenticated, false);
});

test('credential rotation invalidates durable sessions', async () => {
  const store = new Map();
  const auth = createAdminAuth({ ...credentials, store });
  const login = await auth(new Request('https://demo.example/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials),
  }));
  const rotated = createAdminAuth({ ...credentials, password: 'another-test-password-123', store });
  const response = await rotated(new Request('https://demo.example/api/admin/session', {
    headers: { Cookie: login.headers.get('set-cookie').split(';')[0] },
  }));
  assert.equal((await response.json()).authenticated, false);
});

test('storage failures deny access', async () => {
  const auth = createAdminAuth({ ...credentials, store: { get: async () => { throw new Error('Private storage detail'); } } });
  const response = await auth(new Request('https://demo.example/api/admin/session', {
    headers: { Cookie: `ere_admin_session=${'a'.repeat(64)}` },
  }));
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('Private storage detail'));
});
