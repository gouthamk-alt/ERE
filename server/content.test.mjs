import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAdminAuth } from './auth.mjs';
import { createContentHandler, initialContent, validateItem } from './content.mjs';
import { createLocalContentStore } from './local-content-store.mjs';
import zenuBaseline from '../staged/zenu-live-listings-baseline.json' with { type: 'json' };
import zenuListings from '../staged/zenu-listings.json' with { type: 'json' };

function memoryStore() {
  let entry = null, generation = 0;
  return {
    getWithMetadata: async () => structuredClone(entry),
    async setJSON(_key, data, options) {
      if ((options.onlyIfNew && entry) || (options.onlyIfMatch && options.onlyIfMatch !== entry?.etag)) return { modified: false };
      entry = { data: structuredClone(data), etag: `revision-${++generation}` };
      return { modified: true, etag: entry.etag };
    },
  };
}
async function setup(store = memoryStore()) {
  const sessions = new Map();
  const auth = createAdminAuth({ username: 'admin-test', password: 'unique-test-password-123', store: sessions });
  const handler = createContentHandler({ store, authorize: auth });
  const login = await auth(new Request('https://demo.example/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin-test', password: 'unique-test-password-123' }) }));
  const Cookie = login.headers.get('set-cookie').split(';')[0];
  const read = () => handler(new Request('https://demo.example/api/content'));
  const mutate = (body, extraHeaders = {}) => handler(new Request('https://demo.example/api/admin/content', {
    method: 'POST', headers: { Cookie, 'Content-Type': 'application/json', ...extraHeaders }, body: JSON.stringify(body),
  }));
  const readAdmin = () => handler(new Request('https://demo.example/api/admin/content', { headers: { Cookie } }));
  return { store, handler, read, readAdmin, mutate };
}

test('all existing listings and articles pass the publication schema', () => {
  for (const collection of ['listings', 'blogPosts']) for (const item of initialContent[collection]) validateItem(collection, item);
});

test('optional REA listing links persist while unsafe or unrelated URLs are rejected', () => {
  const property = initialContent.listings[0];
  const reaUrl = 'https://www.realestate.com.au/property-house-wa-applecross-123456789';
  assert.equal(validateItem('listings', { ...property, reaUrl }).reaUrl, reaUrl);
  assert.equal(validateItem('listings', { ...property, reaUrl: 'https://www.realestate.com.au/151625476' }).reaUrl, 'https://www.realestate.com.au/151625476');
  assert.equal(validateItem('listings', { ...property, reaUrl: '' }).reaUrl, undefined);
  for (const value of ['javascript:alert(1)', 'https://realestate.com.au.evil.example/property-house-wa-test-123', 'https://example.com/property-house-wa-test-123', 'https://user:pass@realestate.com.au/property-house-wa-test-123', 'http://realestate.com.au/property-house-wa-test-123', 'https://www.realestate.com.au/', 'https://www.realestate.com.au:444/property-house-wa-test-123']) {
    assert.throws(() => validateItem('listings', { ...property, reaUrl: value }), /listing link/);
  }
});

test('protected Zenu publication replaces only the unchanged baseline listings', async () => {
  const store = memoryStore();
  await store.setJSON('website-content-v1', { ...initialContent, listings: zenuBaseline }, { onlyIfNew: true });
  const { read, mutate } = await setup(store);
  const before = await (await read()).json();
  const response = await mutate({ action: 'publishZenuImport', revision: before.revision });
  assert.equal(response.status, 200);
  const after = await response.json();
  assert.equal(after.imported, 99);
  assert.deepEqual(after.listings, zenuListings);
  for (const key of ['blogPosts', 'teamMembers', 'testimonials']) assert.deepEqual(after[key], before[key]);
  const again = await mutate({ action: 'publishZenuImport', revision: after.revision });
  assert.equal((await again.json()).alreadyImported, true);
  assert.equal((await mutate({ action: 'publishZenuImport', revision: before.revision })).status, 409);
});

test('production content read publishes the reviewed Zenu collection once', async () => {
  const store = memoryStore();
  await store.setJSON('website-content-v1', { ...initialContent, listings: zenuBaseline }, { onlyIfNew: true });
  const handler = createContentHandler({ store, authorize: async () => null, autoPublishZenuImport: true });
  const first = await (await handler(new Request('https://demo.example/api/content'))).json();
  assert.equal(first.listings.length, 99);
  assert.deepEqual(first.listings, zenuListings);
  const second = await (await handler(new Request('https://demo.example/api/content'))).json();
  assert.equal(second.revision, first.revision);
});

test('Zenu publication rejects changed live listings without partial writes', async () => {
  const store = memoryStore();
  await store.setJSON('website-content-v1', { ...initialContent, listings: [{ ...zenuBaseline[0], title: 'New live edit' }, ...zenuBaseline.slice(1)] }, { onlyIfNew: true });
  const { read, mutate } = await setup(store);
  const before = await (await read()).json();
  assert.equal((await mutate({ action: 'publishZenuImport', revision: before.revision })).status, 409);
  assert.deepEqual(await (await read()).json(), before);
});

test('team reordering persists for another reader without changing profiles or listings', async () => {
  const { store, read, mutate } = await setup();
  const before = await (await read()).json();
  const ids = before.teamMembers.map(member => member.id).reverse();
  const response = await mutate({ collection: 'teamMembers', action: 'reorder', ids, revision: before.revision });
  assert.equal(response.status, 200);
  const after = await (await (await setup(store)).read()).json();
  assert.deepEqual(after.teamMembers, [...before.teamMembers].reverse());
  assert.deepEqual(after.listings, before.listings);
  assert.deepEqual(after.blogPosts, before.blogPosts);
  assert.equal((await mutate({ collection: 'teamMembers', action: 'reorder', ids: [...ids].reverse(), revision: before.revision })).status, 409);
});

test('team reordering rejects missing, duplicate, unknown IDs and unsupported collections', async () => {
  const { read, mutate } = await setup();
  const before = await (await read()).json();
  const ids = before.teamMembers.map(member => member.id);
  for (const invalid of [ids.slice(1), [...ids.slice(1), ids[1]], [...ids.slice(1), 'unknown']]) {
    assert.equal((await mutate({ collection: 'teamMembers', action: 'reorder', ids: invalid, revision: before.revision })).status, 400);
  }
  assert.equal((await mutate({ collection: 'listings', action: 'reorder', ids, revision: before.revision })).status, 400);
  assert.deepEqual(await (await read()).json(), before);
});

test('public content is shared across cold instances and does not expose enquiries or sessions', async () => {
  const { store, read } = await setup();
  const response = await read();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const first = await response.json();
  assert.deepEqual(Object.keys(first).sort(), ['blogPosts', 'listings', 'revision', 'teamMembers', 'testimonials']);
  const { read: secondRead } = await setup(store);
  assert.deepEqual(await (await secondRead()).json(), first);
});

test('testimonial drafts are private; visibility, edits, order and deletion persist', async () => {
  const store = memoryStore();
  await store.setJSON('website-content-v1', { ...initialContent, testimonials: [] }, { onlyIfNew: true });
  const { read, readAdmin, mutate } = await setup(store);
  const review = { id: 'review-one', clientName: 'Preview client', context: 'Preview only', quote: 'Sample review text.', visible: false, rating: 5 };
  let data = await (await read()).json();
  const save = async operation => { const response = await mutate({ ...operation, revision: data.revision }); assert.equal(response.status, 200); data = await response.json(); return data; };
  await save({ collection: 'testimonials', action: 'add', item: review });
  assert.deepEqual((await (await read()).json()).testimonials, []);
  assert.deepEqual((await (await readAdmin()).json()).testimonials, [review]);
  const auth = createContentHandler({ store: { getWithMetadata: async () => { throw new Error(); } }, authorize: async () => new Response(null, {status:401}) });
  assert.equal((await auth(new Request('https://demo.example/api/admin/content'))).status, 401);
  await save({ collection: 'testimonials', action: 'update', item: { ...review, visible: true, quote: 'Edited sample text.' } });
  await save({ collection: 'testimonials', action: 'add', item: { ...review, id: 'review-two', visible: true, rating: null } });
  const oldRevision = data.revision;
  await save({ collection: 'testimonials', action: 'reorder', ids: ['review-one', 'review-two'] });
  assert.deepEqual((await (await read()).json()).testimonials.map(item => item.id), ['review-one', 'review-two']);
  assert.equal((await mutate({ collection: 'testimonials', action: 'reorder', ids: ['review-two','review-one'], revision: oldRevision })).status, 409);
  assert.equal((await mutate({ collection: 'testimonials', action: 'reorder', ids: ['review-one','review-one'], revision: data.revision })).status, 400);
  await save({ collection: 'testimonials', action: 'delete', id: 'review-one' });
  assert.deepEqual((await (await read()).json()).testimonials.map(item => item.id), ['review-two']);
  assert.deepEqual(data.listings, initialContent.listings);
});

test('testimonial validation rejects blank content, invalid ratings and nonboolean visibility', () => {
  const item = { id:'review', clientName:'Client', quote:'Review', context:'', rating:null, visible:false };
  for (const changes of [{ quote:' ' }, { clientName:'' }, { rating:6 }, { rating:2.5 }, { visible:'true' }]) assert.throws(() => validateItem('testimonials', { ...item, ...changes }));
});

test('imported website testimonials pass validation and intentionally empty collections stay empty', async () => {
  assert.equal(initialContent.testimonials.length, 51);
  for (const item of initialContent.testimonials) validateItem('testimonials', item);
  const store = memoryStore();
  await store.setJSON('website-content-v1', { ...initialContent, testimonials: [] }, { onlyIfNew: true });
  const { read } = await setup(store);
  assert.deepEqual((await (await read()).json()).testimonials, []);
});

test('unauthenticated and cross-origin writes cannot change published content', async () => {
  const { handler, mutate } = await setup();
  assert.equal((await handler(new Request('https://demo.example/api/admin/content', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }))).status, 401);
  assert.equal((await mutate({}, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await mutate({}, { 'Content-Type': 'text/plain' })).status, 403);
});

for (const collection of ['listings', 'blogPosts']) test(`${collection}: create, edit and delete are visible to a separate reader`, async () => {
  const { store, read, mutate } = await setup();
  const visitor = (await setup(store)).read;
  let data = await (await read()).json();
  const item = { ...initialContent[collection][0], id: 'test-content-item', title: 'Shared content test' };
  let response = await mutate({ collection, action: 'add', item, revision: data.revision });
  assert.equal(response.status, 200);
  data = await response.json();
  assert.equal((await (await visitor()).json())[collection][0].title, item.title);
  item.title = 'Updated shared content';
  response = await mutate({ collection, action: 'update', item, revision: data.revision });
  assert.equal(response.status, 200);
  data = await response.json();
  assert.equal((await (await visitor()).json())[collection][0].title, item.title);
  response = await mutate({ collection, action: 'delete', id: item.id, revision: data.revision });
  assert.equal(response.status, 200);
  assert.ok(!(await (await visitor()).json())[collection].some((entry) => entry.id === item.id));
});

test('stale revisions and racing writes cannot overwrite a saved edit', async () => {
  const { store, read, mutate } = await setup();
  const second = (await setup(store)).mutate;
  const original = await (await read()).json();
  const update = (title) => ({ collection: 'listings', action: 'update', revision: original.revision, item: { ...original.listings[0], title } });
  const results = await Promise.all([mutate(update('First editor')), second(update('Second editor'))]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await mutate(update('Stale editor'))).status, 409);
});

test('invalid items, image schemes and arbitrary collection keys are rejected', async () => {
  const { read, mutate } = await setup();
  const { revision } = await (await read()).json();
  const item = { ...initialContent.listings[0], id: 'invalid-test' };
  for (const bad of [{ ...item, imageUrl: 'javascript:alert(1)' }, { ...item, numericPrice: -1 }, { ...item, status: 'invalid' }, { ...item, title: '' }]) {
    assert.equal((await mutate({ collection: 'listings', action: 'add', item: bad, revision })).status, 400);
  }
  assert.equal((await mutate({ collection: '__proto__', action: 'add', item, revision })).status, 400);
});

test('deleting every article keeps the shared collection empty after reloading', async () => {
  const { read, mutate } = await setup();
  let data = await (await read()).json();
  for (const item of data.blogPosts) {
    const response = await mutate({ collection: 'blogPosts', action: 'delete', id: item.id, revision: data.revision });
    assert.equal(response.status, 200);
    data = await response.json();
  }
  assert.deepEqual((await (await read()).json()).blogPosts, []);
});

test('browser migration preserves additions, edits and deletes without removing newer live content', async () => {
  const { read, mutate } = await setup();
  let data = await (await read()).json();
  data = await (await mutate({ collection: 'blogPosts', action: 'add', item: { ...data.blogPosts[0], id: 'new-live-article' }, revision: data.revision })).json();
  const legacy = structuredClone(initialContent);
  legacy.listings[0].title = 'Previously saved browser edit';
  const deleted = legacy.blogPosts.pop();
  const response = await mutate({ action: 'import', legacy, revision: data.revision });
  assert.equal(response.status, 200);
  const published = await response.json();
  assert.equal(published.listings[0].title, legacy.listings[0].title);
  assert.ok(published.blogPosts.some((post) => post.id === 'new-live-article'));
  assert.ok(!published.blogPosts.some((post) => post.id === deleted.id));
});

test('browser migration refuses conflicts and leaves both collections unchanged', async () => {
  const { read, mutate } = await setup();
  let data = await (await read()).json();
  data = await (await mutate({ collection: 'listings', action: 'update', item: { ...data.listings[0], title: 'New live edit' }, revision: data.revision })).json();
  const legacy = structuredClone(initialContent);
  legacy.listings[0].title = 'Conflicting browser edit';
  legacy.blogPosts[0].title = 'Should not be partially imported';
  const response = await mutate({ action: 'import', legacy, revision: data.revision });
  assert.equal(response.status, 409);
  assert.deepEqual(await (await read()).json(), data);
});

test('storage failures do not report a successful publication', async () => {
  const { handler } = await setup({ getWithMetadata: async () => { throw new Error('Private details'); } });
  const response = await handler(new Request('https://demo.example/api/content'));
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('Private details'));
});

test('local content survives a server-store restart and enforces compare-and-set', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ere-content-test-'));
  t.after(() => {
    const target = path.resolve(directory);
    assert.equal(path.dirname(target), path.resolve(tmpdir()));
    assert.ok(path.basename(target).startsWith('ere-content-test-'));
    return rm(target, { recursive: true, force: true });
  });
  const first = createLocalContentStore(directory);
  const write = await first.setJSON('content', { listings: [], blogPosts: [] }, { onlyIfNew: true });
  assert.equal(write.modified, true);
  const second = createLocalContentStore(directory);
  assert.equal((await second.getWithMetadata()).etag, write.etag);
  assert.equal((await second.setJSON('content', {}, { onlyIfMatch: 'stale' })).modified, false);
});
