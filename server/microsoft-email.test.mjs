import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { createMicrosoftConnection, SALES_MAILBOX } from './microsoft-email.mjs';
import { createEnquiryService } from './enquiries.mjs';

const current = Date.parse('2026-11-21T08:00:00Z');
const origin = 'https://ere.example';
function memory() {
  const entries = new Map(); let revision = 0;
  return {
    entries,
    async getWithMetadata(key) { return structuredClone(entries.get(key) || null); },
    async setJSON(key, data, options = {}) {
      const old = entries.get(key);
      if ((options.onlyIfNew && old) || (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)) return { modified: false };
      const etag = String(++revision);
      entries.set(key, { data: structuredClone(data), etag });
      return { modified: true, etag };
    },
    async list({ prefix }) { return { blobs: [...entries.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key })) }; },
    async delete(key) { entries.delete(key); },
  };
}
const request = (action = '', headers = {}) => new Request(`${origin}/api/admin/email/microsoft${action}`, {
  method: action ? 'POST' : 'GET', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: action ? '{}' : undefined,
});
function setup(options = {}) {
  const store = options.store || memory(), calls = [];
  let time = current;
  const config = { tenantId: '11111111-1111-1111-1111-111111111111', clientId: '22222222-2222-2222-2222-222222222222', clientSecret: 'fake-secret-for-tests', redirectUri: `${origin}/api/email/microsoft/callback`, encryptionKey: randomBytes(32).toString('base64'), ...options.config };
  const fetcher = async (url, init = {}) => {
    calls.push({ url, ...init });
    if (url.endsWith('/token')) {
      if (options.tokenFailure && new URLSearchParams(init.body).get('grant_type') === 'refresh_token') return Response.json({ error: 'invalid_grant' }, { status: 400 });
      return Response.json({ access_token: `test-access-${calls.length}`, refresh_token: `test-refresh-${calls.length}`, expires_in: 3600, scope: options.scope || 'Mail.Send User.Read' });
    }
    if (url.includes('/me?')) return Response.json({ mail: options.mailbox || SALES_MAILBOX, userPrincipalName: 'sales@tenant.onmicrosoft.com' });
    if (url.endsWith('/sendMail')) {
      if (options.sendFailure) throw new Error('Network timeout');
      return new Response(null, { status: options.sendStatus || 202 });
    }
    throw new Error('Unexpected external request');
  };
  const connection = createMicrosoftConnection({ store, config, fetcher, enabled: options.enabled !== false, authorize: options.authorize || (async () => null), now: () => time });
  async function begin() {
    const response = await connection.handle(request('/connect'));
    const url = new URL((await response.json()).url);
    return { url, cookie: response.headers.get('set-cookie').split(';')[0] };
  }
  async function complete(flow, extra = '') {
    return connection.handle(new Request(`${config.redirectUri}?state=${flow.url.searchParams.get('state')}&code=fake-code${extra}`, { headers: { Cookie: flow.cookie } }));
  }
  return { store, config, calls, connection, begin, complete, advance: ms => { time += ms; }, now: () => time };
}
const fixture = () => ({ id: `${current}-${randomUUID()}`, reference: 'ERE-TEST-REFERENCE', createdAt: new Date(current).toISOString(), enquiry: { type: 'Free Appraisal', clientName: 'Test Visitor', email: 'visitor@example.com', phone: '0400000000', suburbOrAddress: 'Test property', message: 'Please call me.' } });

test('only an authenticated admin can inspect or initiate the connection', async () => {
  const { connection, calls } = setup({ authorize: async () => Response.json({ error: 'Denied' }, { status: 401 }) });
  assert.equal((await connection.handle(request())).status, 401);
  assert.equal((await connection.handle(request('/connect'))).status, 401);
  assert.equal(calls.length, 0);
});

test('missing/unsafe configuration never exposes a usable sign-in link', async () => {
  for (const config of [{ encryptionKey: '' }, { tenantId: 'common' }, { redirectUri: 'http://public.example/api/email/microsoft/callback' }, { redirectUri: `${origin}/other` }]) {
    const { connection, calls } = setup({ config });
    assert.equal((await connection.status()).configured, false);
    assert.equal((await connection.handle(request('/connect'))).status, 503);
    assert.equal(calls.length, 0);
  }
});

test('connection uses minimal delegated scopes, PKCE and a secure browser-bound cookie', async () => {
  const { begin, store } = setup();
  const flow = await begin();
  assert.equal(flow.url.origin, 'https://login.microsoftonline.com');
  assert.equal(flow.url.searchParams.get('code_challenge_method'), 'S256');
  assert.match(flow.url.searchParams.get('scope'), /Mail.Send/);
  assert.match(flow.url.searchParams.get('scope'), /User.Read/);
  assert.match(flow.url.searchParams.get('scope'), /offline_access/);
  assert.doesNotMatch(flow.url.searchParams.get('scope'), /Mail.Read|Mail.ReadWrite|\.default/);
  assert.doesNotMatch(JSON.stringify([...store.entries]), /verifier|fake-secret/);
});

test('rejects cross-origin connect, forged/missing browser state, expired state and replay', async () => {
  const t = setup();
  assert.equal((await t.connection.handle(request('/connect', { Origin: 'https://attacker.example' }))).status, 403);
  const flow = await t.begin();
  assert.equal((await t.connection.handle(new Request(`${t.config.redirectUri}?state=${flow.url.searchParams.get('state')}&code=fake`))).status, 400);
  assert.equal(t.calls.length, 0);
  t.advance(601000);
  assert.equal((await t.complete(flow)).status, 400);
  const another = await t.begin();
  assert.equal((await t.complete(another)).status, 303);
  assert.equal((await t.complete(another)).status, 400);
});

test('checks the mailbox with Graph and stores tokens encrypted, never in status/browser responses', async () => {
  const t = setup(), flow = await t.begin();
  const response = await t.complete(flow);
  assert.equal(response.headers.get('location'), `${origin}/admin?email=connected`);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  assert.match(response.headers.get('set-cookie'), /Secure/);
  assert.equal((await t.connection.status()).connected, true);
  assert.doesNotMatch(JSON.stringify([...t.store.entries]), /test-access|test-refresh|fake-secret/);
  assert.doesNotMatch(JSON.stringify(await t.connection.status()), /test-access|test-refresh|fake-secret/);
  const tokenRequest = t.calls.find(call => call.url.endsWith('/token'));
  const verifier = new URLSearchParams(tokenRequest.body).get('code_verifier');
  assert.equal(createHash('sha256').update(verifier).digest('base64url'), flow.url.searchParams.get('code_challenge'));
});

test('does not link a different mailbox or a token lacking mail-send permission', async () => {
  for (const options of [{ mailbox: 'other@example.com' }, { scope: 'User.Read' }]) {
    const t = setup(options), flow = await t.begin();
    const response = await t.complete(flow);
    assert.equal(response.status, 303);
    assert.equal((await t.connection.status()).connected, false);
    assert.equal(t.store.entries.has('mailbox'), false);
  }
});

test('Microsoft cancellation is sanitised and does not save credentials', async () => {
  const t = setup(), flow = await t.begin();
  const response = await t.complete(flow, '&error=access_denied&error_description=private-details');
  assert.equal(response.headers.get('location'), `${origin}/admin?email=cancelled`);
  assert.equal(await response.text(), '');
  assert.equal(t.store.entries.has('mailbox'), false);
});

test('Graph sends only to sales@, sets visitor Reply-To, saves Sent Items and treats 202 as acceptance', async () => {
  const t = setup(); await t.complete(await t.begin());
  const sender = await t.connection.sender();
  assert.equal(sender.ready, true);
  const record = fixture();
  assert.match(await sender.send(record), /microsoft-accepted/);
  const send = t.calls.find(call => call.url.endsWith('/sendMail'));
  const body = JSON.parse(send.body);
  assert.deepEqual(body.message.toRecipients, [{ emailAddress: { address: SALES_MAILBOX } }]);
  assert.deepEqual(body.message.replyTo, [{ emailAddress: { address: record.enquiry.email } }]);
  assert.equal(body.saveToSentItems, true);
  assert.equal(body.message.body.contentType, 'Text');
  assert.equal(body.message.subject.startsWith('Website '),false);
  assert.match(body.message.body.content,/AWST \(Perth\)/);
});

test('Graph career notification carries the private PDF résumé as an attachment',async()=>{
  const t=setup();await t.complete(await t.begin());const sender=await t.connection.sender();
  const record=fixture();record.enquiry={...record.enquiry,type:'Career Application',role:'Sales Executive',experience:'1–2 years',cv:{name:'resume.pdf',type:'application/pdf',base64:Buffer.from('%PDF-1.4\nTest\n%%EOF').toString('base64')}};
  await sender.send(record);const body=JSON.parse(t.calls.find(call=>call.url.endsWith('/sendMail')).body);
  assert.match(body.message.subject,/^Career Application — Sales Executive — /);
  assert.deepEqual(body.message.attachments,[{'@odata.type':'#microsoft.graph.fileAttachment',name:'resume.pdf',contentType:'application/pdf',contentBytes:record.enquiry.cv.base64}]);
});

test('expired access token refreshes and revoked refresh tokens require reconnection', async () => {
  for (const tokenFailure of [false, true]) {
    const t = setup({ tokenFailure }); await t.complete(await t.begin());
    t.advance(3600001);
    const sender = await t.connection.sender();
    if (tokenFailure) {
      await assert.rejects(sender.send(fixture()));
      assert.equal((await t.connection.status()).reconnectRequired, true);
      assert.equal(t.calls.filter(call => call.url.endsWith('/sendMail')).length, 0);
    } else {
      await sender.send(fixture());
      assert.equal(t.calls.filter(call => call.url.endsWith('/token')).length, 2);
      assert.equal((await t.connection.status()).connected, true);
    }
  }
});

test('disabled local/preview connection cannot send even after successful authorisation', async () => {
  const t = setup({ enabled: false }); await t.complete(await t.begin());
  const sender = await t.connection.sender();
  assert.equal(sender.ready, false);
  await assert.rejects(sender.send(fixture()));
  assert.equal(t.calls.filter(call => call.url.endsWith('/sendMail')).length, 0);
});

test('ambiguous Graph timeout is preserved for review, not automatically sent again', async () => {
  const t = setup({ sendFailure: true }); await t.complete(await t.begin());
  const sender = await t.connection.sender(), store = memory();
  const service = createEnquiryService({ sender, store, now: t.now });
  const record = fixture();
  const response = await service.submit(new Request(`${origin}/api/enquiries`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...record.enquiry, requestId: record.id }) }));
  assert.equal(response.status, 201);
  const saved = [...store.entries.values()].find(entry => entry.data.enquiry).data;
  assert.equal(saved.delivery.status, 'review');
  t.advance(180000); await service.retryPending();
  assert.equal(t.calls.filter(call => call.url.endsWith('/sendMail')).length, 1);
});

test('a failed post-send storage write does not trigger duplicate Graph sends after a restart', async () => {
  const t = setup(); await t.complete(await t.begin());
  const sender = await t.connection.sender(), store = memory(), set = store.setJSON;
  store.setJSON = async (key, data, options) => { if (data.delivery?.status === 'accepted') throw new Error('status save failed'); return set(key, data, options); };
  const service = createEnquiryService({ sender, store, now: t.now }), record = fixture();
  await service.submit(new Request(`${origin}/api/enquiries`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...record.enquiry, requestId: record.id }) }));
  t.advance(120000); await service.retryPending();
  assert.equal(t.calls.filter(call => call.url.endsWith('/sendMail')).length, 1);
  assert.equal([...store.entries.values()].find(entry => entry.data.enquiry).data.delivery.status, 'review');
});
