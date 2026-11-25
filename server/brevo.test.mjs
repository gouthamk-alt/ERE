import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { syncBrevoContact } from './brevo.mjs';
import { createMarketingService } from './marketing.mjs';

const email = 'visitor@example.com';
const json = (body, status = 200) => Response.json(body, { status });

test('confirmed subscriber is added to the dedicated Brevo list without resetting opt-outs', async () => {
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return requests.length === 1 ? json({}, 404) : json({ id: 8 }, 201);
  };
  assert.deepEqual(await syncBrevoContact({ email, subscription: 'subscribed', apiKey: 'test', listId: '4', fetcher }), { status: 'subscribed' });
  assert.equal(requests.length, 2);
  assert.equal(requests[1].url, 'https://api.brevo.com/v3/contacts');
  assert.deepEqual(JSON.parse(requests[1].options.body), { email, listIds: [4] });
  for (const contact of [{ emailBlacklisted: true, listIds: [] }, { emailBlacklisted: false, listUnsubscribed: [2], listIds: [4] }]) {
    let called = 0;
    const result = await syncBrevoContact({ email, subscription: 'subscribed', apiKey: 'test', listId: 4, fetcher: async () => { called++; return json(contact); } });
    assert.equal(result.status, 'suppressed');
    assert.equal(called, 1);
  }
});

test('local opt-out removes an existing Brevo subscriber from the website list', async () => {
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return requests.length === 1 ? json({ listIds: [4], emailBlacklisted: false }) : json({ success: [email], failure: [] }, 201);
  };
  assert.equal((await syncBrevoContact({ email, subscription: 'unsubscribed', apiKey: 'test', listId: 4, fetcher })).status, 'removed');
  assert.equal(requests[1].url, 'https://api.brevo.com/v3/contacts/lists/4/contacts/remove');
  assert.deepEqual(JSON.parse(requests[1].options.body), { emails: [email] });
});

function memory() {
  const entries = new Map();
  return {
    entries,
    getWithMetadata: async key => entries.has(key) ? { data: entries.get(key).data, etag: entries.get(key).etag } : null,
    setJSON: async (key, data, options = {}) => {
      const old = entries.get(key);
      if (options.onlyIfNew && old || options.onlyIfMatch && old?.etag !== options.onlyIfMatch) return { modified: false };
      const etag = randomUUID(); entries.set(key, { data, etag }); return { modified: true, etag };
    },
    list: async ({ prefix }) => ({ blobs: [...entries.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key })) }),
    delete: async key => { entries.delete(key); },
  };
}

test('confirmed website contact syncs on retry, and a Brevo unsubscribe is authenticated and suppresses it locally', async () => {
  const store = memory(), calls = [];
  const service = createMarketingService({
    store, authorize: async () => null,
    env: { BREVO_API_KEY: 'test-key', BREVO_LIST_ID: '4', BREVO_WEBHOOK_SECRET: 'test-webhook-token' },
    fetcher: async (url, options) => { calls.push({ url, options }); return calls.length === 1 ? json({}, 404) : json({ id: 42 }, 201); },
  });
  const record = { id: randomUUID(), reference: 'ERE-TEST', createdAt: new Date().toISOString(), enquiry: { type: 'General Contact', clientName: 'Website visitor', email, phone: '', message: 'Hello' } };
  assert.equal((await service.captureEnquiryContact(record, true)).subscribed, true);
  await service.worker();
  assert.equal(calls.length, 2);
  assert.equal((await store.list({ prefix: 'brevo-sync/' })).blobs.length, 0);
  const endpoint = 'https://ere.example/api/newsletter/brevo-webhook';
  assert.equal((await service.handle(new Request(endpoint, { method: 'POST', body: JSON.stringify({ event: 'unsubscribe', email }) }))).status, 403);
  assert.equal((await service.handle(new Request(endpoint, { method: 'POST', headers: { Authorization: 'Bearer test-webhook-token' }, body: JSON.stringify({ event: 'unsubscribe', email }) }))).status, 200);
  const contacts = await (await service.handle(new Request('https://ere.example/api/admin/contacts'))).json();
  assert.equal(contacts.items[0].suppressed, true);
});
