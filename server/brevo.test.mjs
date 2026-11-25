import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { syncBrevoContact, createBrevoCampaign } from './brevo.mjs';
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

test('Brevo campaign draft targets both approved lists and includes its unsubscribe link', async () => {
  let request;
  const id = await createBrevoCampaign({ apiKey: 'test-key', sender: 'wendy@exceptionalrealestate.com.au', site: 'https://ere.example', listIds: [4, 7], draft: { title: 'Perth update', subject: 'November news', preheader: '<News>', bodyHtml: '<h1>Market update</h1><a href="/properties">Properties</a><script>alert(1)</script>', attachmentUrl: '' }, fetcher: async (url, options) => { request = { url, options }; return json({ id: 29 }, 201); } });
  assert.equal(id, 29);
  assert.equal(request.url, 'https://api.brevo.com/v3/emailCampaigns');
  const payload = JSON.parse(request.options.body);
  assert.deepEqual(payload.recipients, { listIds: [4, 7] });
  assert.deepEqual(payload.sender, { name: 'Wendy Chia', email: 'wendy@exceptionalrealestate.com.au' });
  assert.match(payload.htmlContent, /href="https:\/\/ere.example\/properties"/);
  assert.match(payload.htmlContent, /href="{{ unsubscribe }}"/);
  assert.doesNotMatch(payload.htmlContent, /<script>|<News>/);
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

test('admin can prepare one Brevo draft after review without sending a campaign', async () => {
  const store = memory(), calls = [], origin = 'https://ere.example';
  const service = createMarketingService({ store, authorize: async () => null, env: { BREVO_API_KEY: 'test-key', BREVO_LIST_ID: '4', BREVO_LEGACY_LIST_ID: '7' }, fetcher: async (url, options) => { calls.push({ url, options }); return json({ id: 30 }, 201); } });
  const post = (action, extra = {}) => new Request(`${origin}/api/admin/newsletters`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
  const get = async () => (await service.handle(new Request(`${origin}/api/admin/newsletters`))).json();
  const draft = { id: randomUUID(), title: 'Agency newsletter', subject: 'Property news', preheader: '', bodyHtml: '<p>Latest local property news</p>', attachmentUrl: '' };
  assert.equal((await service.handle(post('save', { item: draft, revision: (await get()).revision }))).status, 200);
  const review = await (await service.handle(post('review', { id: draft.id }))).json();
  assert.equal(review.brevo, true);
  const sendId = randomUUID(), input = { id: draft.id, fingerprint: review.fingerprint, sendId };
  const first = await service.handle(post('brevoDraft', input));
  assert.equal(first.status, 201);
  assert.equal((await first.json()).campaignId, 30);
  assert.equal((await service.handle(post('brevoDraft', input))).status, 200);
  assert.equal(calls.length, 1);
  assert.equal((await get()).brevoDrafts.length, 1);
  assert.equal((await service.handle(post('send', input))).status, 409);
});
