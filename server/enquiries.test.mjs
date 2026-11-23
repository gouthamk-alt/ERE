import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createEnquiryService, createEmailSender } from './enquiries.mjs';
import { createLocalEnquiryStore } from './local-enquiry-store.mjs';

const fixed = Date.parse('2026-11-20T08:00:00Z');
const input = (extra = {}) => ({ requestId: `${fixed}-${randomUUID()}`, type: 'Free Appraisal', clientName: 'Preview Visitor', email: 'visitor@example.com', phone: '0400000000', suburbOrAddress: 'Test property, Perth', message: 'Please discuss an appraisal.', ...extra });
const post = (data, headers = {}) => new Request('https://example.com/api/enquiries', { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) });
function memory() {
  const entries = new Map(); let version = 0;
  return {
    entries,
    async getWithMetadata(key) { return structuredClone(entries.get(key) || null); },
    async setJSON(key, data, options = {}) {
      const before = entries.get(key);
      if ((options.onlyIfNew && before) || (options.onlyIfMatch && before?.etag !== options.onlyIfMatch)) return { modified: false };
      const etag = String(++version);
      entries.set(key, { data: structuredClone(data), etag });
      return { modified: true, etag };
    },
    async list({ prefix }) { return { blobs: [...entries.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key })) }; },
    async delete(key) { entries.delete(key); },
  };
}
function setup(options = {}) {
  const store = options.store || memory();
  const sends = [];
  const sender = options.sender || { ready: true, async send(record) { sends.push(record); return 'email-example'; } };
  const service = createEnquiryService({ store, sender, now: () => fixed, ...options });
  return { store, sends, service };
}
const records = store => [...store.entries.values()].filter(entry => entry.data.enquiry).map(entry => entry.data);

test('durably saves before sending and only returns a reference, never private data', async () => {
  const store = memory();
  const { service } = setup({ store, sender: { ready: true, async send(record) {
    assert.equal(records(store).length, 1);
    assert.equal(records(store)[0].id, record.id);
    return 'accepted-example';
  } } });
  const response = await service.submit(post(input()), { ip: 'test-ip' });
  assert.equal(response.status, 201);
  assert.deepEqual(Object.keys(await response.json()).sort(), ['preview', 'reference']);
  assert.equal(records(store)[0].delivery.status, 'accepted');
});

test('storage failure does not claim success or send mail', async () => {
  const { service, sends } = setup({ store: { async getWithMetadata() { throw new Error('offline'); } } });
  assert.equal((await service.submit(post(input()))).status, 503);
  assert.equal(sends.length, 0);
});

test('provider outage keeps the enquiry and scheduled retry can recover', async () => {
  let time = fixed, outage = true;
  const { store, service } = setup({ now: () => time, sender: { ready: true, async send() { if (outage) throw new Error('offline'); return 'retried'; } } });
  assert.equal((await service.submit(post(input()))).status, 201);
  assert.equal(records(store)[0].delivery.status, 'pending');
  outage = false; time += 3 * 60000;
  await service.retryPending();
  assert.equal(records(store)[0].delivery.status, 'accepted');
});

test('concurrent duplicate requests save once and send once across handlers', async () => {
  const store = memory(), sends = [];
  const sender = { ready: true, async send(record) { sends.push(record.id); return 'one'; } };
  const first = setup({ store, sender }).service, second = setup({ store, sender }).service;
  const data = input();
  const responses = await Promise.all([first.submit(post(data)), second.submit(post(data))]);
  assert.ok(responses.every(response => response.status === 201));
  assert.equal(records(store).length, 1);
  assert.equal(sends.length, 1);
  assert.equal((await responses[0].json()).reference, (await responses[1].json()).reference);
  assert.equal((await first.submit(post({ ...data, message: 'Changed' }))).status, 409);
});

test('failed status write retries using the same provider idempotency key', async () => {
  const store = memory(), original = store.setJSON;
  let fail = true, time = fixed;
  store.setJSON = async (key, value, options) => {
    if (fail && value.delivery?.status === 'accepted') { fail = false; throw new Error('status save failed'); }
    return original(key, value, options);
  };
  const { service, sends } = setup({ store, now: () => time });
  assert.equal((await service.submit(post(input()))).status, 201);
  time += 2 * 60000;
  await service.retryPending();
  assert.equal(sends.length, 2);
  assert.equal(sends[0].id, sends[1].id);
  assert.equal(records(store)[0].delivery.status, 'accepted');
});

test('does not retry ambiguous email acceptance outside the safe retry window', async () => {
  let time = fixed;
  const { store, service } = setup({ now: () => time, sender: { ready: true, async send() { throw new Error('unknown'); } } });
  await service.submit(post(input()));
  time += 19 * 3600000;
  await service.retryPending();
  assert.equal(records(store)[0].delivery.status, 'review');
});

test('production keeps a durable enquiry even before email is configured', async () => {
  const { store, service } = setup({ sender: createEmailSender() });
  assert.equal((await service.submit(post(input()))).status, 201);
  assert.equal(records(store).length, 1);
  assert.equal(records(store)[0].delivery.status, 'pending');
});

test('admin enquiry pages omit internal tokens and support all saved records across pages', async () => {
  const {store,service}=setup({authorize:async()=>null});
  await service.submit(post(input({newsletterOptIn:true})),{ip:'preview'});
  const saved=records(store)[0];
  assert.ok(saved.newsletterToken);
  for(let index=0;index<104;index++)await store.setJSON(`requests/2026-11-20/${fixed}-${String(index).padStart(6,'0')}`,{...saved,id:`fixture-${index}`});
  const inspect=offset=>service.inspect(new Request(`https://example.com/api/admin/enquiries?day=2026-11-20&offset=${offset}`));
  const first=await (await inspect(0)).json(),second=await (await inspect(100)).json();
  assert.equal(first.records.length,100);assert.equal(first.total,105);assert.equal(first.truncated,true);
  assert.equal(second.records.length,5);assert.equal(second.truncated,false);
  assert.equal(new Set([...first.records,...second.records].map(item=>item.id)).size,105);
  for(const record of first.records){assert.equal(record.newsletterToken,undefined);assert.equal(record.fingerprint,undefined);assert.equal(record.delivery.providerId,undefined);}
  assert.equal((await inspect(-1)).status,400);
});

test('preview stores a labelled test without using the sending provider', async () => {
  const { store, sends, service } = setup({ preview: true });
  const response = await service.submit(post(input()));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).preview, true);
  await service.retryPending();
  assert.equal(sends.length, 0);
  assert.equal(records(store)[0].delivery.status, 'preview');
});

test('rejects cross-origin, missing origin, invalid input, honeypot and oversized bodies', async () => {
  const { service, sends } = setup();
  assert.equal((await service.submit(post(input(), { Origin: 'https://elsewhere.example' }))).status, 403);
  const missing = post(input()); missing.headers.delete('origin');
  assert.equal((await service.submit(missing)).status, 403);
  for (const extra of [{ email: 'x\r\nBcc: hidden@example.com' }, { clientName: '' }, { website: 'spam' }, { type: 'Unknown' }, { message: 'x'.repeat(3001) }]) assert.equal((await service.submit(post(input(extra)))).status, 400);
  assert.equal((await service.submit(post(input({ message: 'x'.repeat(15000) })))).status, 413);
  assert.equal(sends.length, 0);
});

test('durable rate limit applies across instances but safe retries do not consume it', async () => {
  const store = memory();
  const a = setup({ store }).service, b = setup({ store }).service;
  const data = input();
  await a.submit(post(data), { ip: 'same' });
  for (let n = 0; n < 10; n++) assert.equal((await b.submit(post(data), { ip: 'same' })).status, 201);
  for (let n = 0; n < 5; n++) assert.equal((await b.submit(post(input()), { ip: 'same' })).status, 201);
  assert.equal((await a.submit(post(input()), { ip: 'same' })).status, 429);
});

test('private backup cannot be inspected without admin authentication', async () => {
  const { service } = setup();
  await service.submit(post(input()));
  assert.equal((await service.inspect(new Request('https://example.com/api/admin/enquiries'))).status, 401);
});

test('notification recipient is fixed, reply-to is the visitor, and content is plain text', async () => {
  let sent;
  const sender = createEmailSender({ enabled: true, apiKey: 'fake-for-tests', from: 'ERE <website@example.com>', fetcher: async (_url, options) => {
    sent = options;
    return Response.json({ id: 'example-id' });
  } });
  const { service } = setup({ sender });
  const data = input({ to: 'attacker@example.com', message: '<script>not executable</script>' });
  await service.submit(post(data));
  const body = JSON.parse(sent.body);
  assert.deepEqual(body.to, ['sales@exceptionalrealestate.com.au']);
  assert.equal(body.reply_to, data.email);
  assert.equal(body.html, undefined);
  assert.ok(sent.headers['Idempotency-Key'].includes(data.requestId));
});

test('local backups persist across service restarts and preserve Unicode', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ere-enquiries-'));
  try {
    const data = input({ clientName: 'Test 用户' });
    const first = setup({ preview: true, store: createLocalEnquiryStore(directory) }).service;
    const reference = (await (await first.submit(post(data))).json()).reference;
    const second = setup({ preview: true, store: createLocalEnquiryStore(directory) }).service;
    assert.equal((await (await second.submit(post(data))).json()).reference, reference);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
