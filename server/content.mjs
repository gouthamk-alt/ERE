import seed from './content-seed.json' with { type: 'json' };
import teamSeed from './team-seed.json' with { type: 'json' };
import testimonialsSeed from './testimonials-seed.json' with { type: 'json' };
import { cleanRichText } from './rich-text.mjs';
import imageMigration from './image-migration.json' with { type: 'json' };
import { withContentBackups } from './content-backups.mjs';
import zenuListings from '../staged/zenu-listings.json' with { type: 'json' };
import zenuBaseline from '../staged/zenu-live-listings-baseline.json' with { type: 'json' };

export function migrateImageUrls(value) {
  if(typeof value==='string'){for(const [old,url] of Object.entries(imageMigration))value=value.split(old).join(url);return value;}
  if(Array.isArray(value))return value.map(migrateImageUrls);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,migrateImageUrls(item)]));
  return value;
}

const KEY = 'website-content-v1';
export const initialContent = { ...seed, teamMembers: teamSeed, testimonials: testimonialsSeed };
const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const fields = {
  listings: {
    text: ['id', 'title', 'address', 'suburb', 'state', 'postcode', 'priceDisplay', 'agentId', 'inspectionTime', 'headline', 'description', 'listedDate'],
    optional: ['coAgentId', 'badgeText', 'soldDate'],
    numeric: ['numericPrice', 'bedrooms', 'bathrooms', 'carSpaces', 'landSizeSqm', 'buildingAreaSqm'],
    arrays: ['features'],
  },
  blogPosts: { text: ['id', 'title', 'date', 'category', 'author', 'excerpt'], optional: [], numeric: [], arrays: ['content'] },
  teamMembers: {},
  testimonials: {},
};
export const canonical = (value) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);

// Import only browser changes relative to the original site, preserving later live edits.
export function mergeLegacyContent(current, legacy) {
  const result = structuredClone(current);
  for (const collection of ['listings', 'blogPosts']) {
    if (!Array.isArray(legacy?.[collection]) || legacy[collection].length > 1000) throw new Error('Invalid browser backup.');
    const local = legacy[collection].map((item) => validateItem(collection, migrateImageUrls(item)));
    if (new Set(local.map((item) => item.id)).size !== local.length) throw new Error('The backup contains duplicate IDs.');
    const original = seed[collection].map((item) => validateItem(collection, item));
    const before = new Map(original.map((item) => [item.id, item]));
    const after = new Map(local.map((item) => [item.id, item]));
    const published = new Map(current[collection].map((item) => [item.id, validateItem(collection, migrateImageUrls(item))]));
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const base = before.get(id), edit = after.get(id), live = published.get(id);
      if (canonical(base) === canonical(edit) || canonical(edit) === canonical(live)) continue;
      if (canonical(base) !== canonical(live)) throw new Error(`Import conflict: ${edit?.title || base?.title || id} has changed on the live site. Keep your backup and review this item before importing.`);
      if (edit) published.set(id, edit); else published.delete(id);
    }
    // Preserve browser ordering for imported items, then retain newer live additions.
    const order = [...local.map((item) => item.id), ...published.keys()];
    result[collection] = [...new Set(order)].filter((id) => published.has(id)).map((id) => published.get(id));
  }
  return result;
}
function validImage(value) {
  return typeof value === 'string' && value.length <= 2048 &&
    (value === '' || /^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value));
}
export function validateItem(collection, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid content.');
  if (collection === 'testimonials') {
    const item = {};
    for (const [key, limit] of [['id',100], ['clientName',150], ['quote',2000], ['context',250]]) {
      if (typeof value[key] !== 'string' || value[key].length > limit) throw new Error(`Check the ${key} field.`);
      item[key] = value[key].trim();
    }
    if (!/^[\w-]{1,100}$/.test(item.id) || !item.clientName || !item.quote || typeof value.visible !== 'boolean') throw new Error('Provide a client name, review and visibility setting.');
    if (value.rating !== null && (!Number.isInteger(value.rating) || value.rating < 1 || value.rating > 5)) throw new Error('Choose a rating from 1 to 5 or leave it blank.');
    return { ...item, rating: value.rating, visible: value.visible };
  }
  if (collection === 'teamMembers') {
    const member = {};
    for (const key of ['id', 'name', 'role', 'qualification', 'phone', 'email', 'bio', 'initials']) {
      if (typeof value[key] !== 'string' || value[key].length > (key === 'bio' ? 10000 : 300)) throw new Error(`Check the ${key} field.`);
      member[key] = value[key].trim();
    }
    if (!/^[\w-]{1,100}$/.test(member.id) || !member.name || !member.role || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) throw new Error('Provide a name, role and valid email.');
    if (!validImage(value.photoUrl)) throw new Error('Choose a valid portrait image.');
    member.photoUrl = value.photoUrl;
    for (const key of ['languages', 'specialties']) {
      if (!Array.isArray(value[key]) || value[key].length > 30 || value[key].some(text => typeof text !== 'string' || text.length > 200)) throw new Error(`Check ${key}.`);
      member[key] = value[key];
    }
    for (const key of ['activeListingsCount', 'soldCount12Months']) member[key] = Number.isFinite(value[key]) && value[key] >= 0 ? value[key] : 0;
    return member;
  }
  const schema = fields[collection];
  const item = {};
  for (const key of schema.text) {
    if (typeof value[key] !== 'string' || value[key].length > 20000) throw new Error(`Check the ${key} field.`);
    item[key] = value[key];
  }
  if (!/^[\w-]{1,100}$/.test(item.id) || !item.title.trim() || item.title.length > 300) throw new Error('A valid ID and title are required.');
  for (const key of schema.optional) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== 'string' || value[key].length > 500) throw new Error(`Check the ${key} field.`);
      item[key] = value[key];
    }
  }
  for (const key of schema.numeric) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < 0 || value[key] > 1e12) throw new Error(`Check the ${key} field.`);
    item[key] = value[key];
  }
  for (const key of schema.arrays) {
    if (!Array.isArray(value[key]) || value[key].length > 150 || value[key].some((text) => typeof text !== 'string' || text.length > 20000)) throw new Error(`Check the ${key} field.`);
    item[key] = value[key];
  }
  if (!validImage(value.imageUrl)) throw new Error('Use an image URL beginning with https://, http:// or /.');
  item.imageUrl = value.imageUrl;
  if (value.featured !== undefined && typeof value.featured !== 'boolean') throw new Error('Featured must be true or false.');
  item.featured = Boolean(value.featured);
  if (collection === 'blogPosts' && value.bodyHtml !== undefined) item.bodyHtml = cleanRichText(value.bodyHtml);
  if (collection === 'listings') {
    if (value.reaUrl !== undefined && value.reaUrl !== '') {
      let url;
      try { url = new URL(value.reaUrl); } catch { throw new Error('Use a valid realestate.com.au listing link.'); }
      if (typeof value.reaUrl !== 'string' || value.reaUrl.length > 2048 || url.protocol !== 'https:' || !['realestate.com.au', 'www.realestate.com.au'].includes(url.hostname) || url.username || url.password || url.port || !/^\/(?:property-[^/]+-)?\d+\/?$/.test(url.pathname)) throw new Error('Use an https://www.realestate.com.au/property-… listing link.');
      item.reaUrl = url.href;
    }
    for (const [key, allowed] of Object.entries({
      category: ['Residential Sale', 'Residential Lease', 'Commercial', 'Sold', 'Leased'],
      status: ['Available', 'Under Offer', 'Sold', 'Leased', 'Off-Market'],
      propertyType: ['House', 'Apartment / Penthouse', 'Townhouse', 'Commercial Suite', 'Development Land', 'Apartment', 'Unit', 'Vacant Land', 'Industrial/Warehouse', 'Mixed Farming', 'Viticulture', 'Commercial Farming', 'Retail', 'Residential', 'Villa - Exclusive', 'Offices', 'Showrooms/Bulky Goods', 'Duplex Semi-detached'],
    })) {
      if (!allowed.includes(value[key])) throw new Error(`Check the ${key} field.`);
      item[key] = value[key];
    }
    if (value.galleryUrls !== undefined) {
      if (!Array.isArray(value.galleryUrls) || value.galleryUrls.length > 100 || !value.galleryUrls.every(validImage)) throw new Error('Check the gallery image URLs.');
      item.galleryUrls = value.galleryUrls;
    }
  }
  return item;
}

// The store exposes strong reads and compare-and-set writes. ETags prevent lost edits.
export function createContentHandler({ store, authorize, backups, autoPublishZenuImport = false }) {
  if(backups)store=withContentBackups(store,backups);
  async function read() {
    let entry = await store.getWithMetadata(KEY, { type: 'json' });
    if (!entry) {
      await store.setJSON(KEY, structuredClone(initialContent), { onlyIfNew: true });
      entry = await store.getWithMetadata(KEY, { type: 'json' });
    }
    if (!entry || !Array.isArray(entry.data.listings) || !Array.isArray(entry.data.blogPosts)) throw new Error('Storage unavailable');
    // Old deployments have no team collection. Seed it in memory without overwriting saved listings/blogs.
    if (!Array.isArray(entry.data.teamMembers)) entry.data.teamMembers = structuredClone(teamSeed);
    if (!Array.isArray(entry.data.testimonials)) entry.data.testimonials = structuredClone(testimonialsSeed);
    entry.data=migrateImageUrls(entry.data);
    // Production release migration: the first content read publishes the prepared
    // collection only if every live listing still matches the reviewed baseline.
    if (autoPublishZenuImport && canonical(entry.data.listings) === canonical(zenuBaseline)) {
      const listings = zenuListings.map(item => validateItem('listings', item));
      if (new Set(listings.map(item => item.id)).size !== listings.length || listings.some(item => !entry.data.teamMembers.some(member => member.id === item.agentId) || (item.coAgentId && !entry.data.teamMembers.some(member => member.id === item.coAgentId)))) throw new Error('Prepared listings failed validation');
      const data = { ...entry.data, listings };
      if (JSON.stringify(data).length > 3000000) throw new Error('Prepared content is too large');
      await store.setJSON(KEY, data, { onlyIfMatch: entry.etag });
      entry = await store.getWithMetadata(KEY, { type: 'json' });
      if (!entry) throw new Error('Storage unavailable after import');
      entry.data = migrateImageUrls(entry.data);
    }
    return entry;
  }
  return async (request, context = {}) => {
    try {
      const { pathname } = new URL(request.url);
      if (pathname === '/api/content' && request.method === 'GET') {
        const { data, etag } = await read();
        return json({ listings: data.listings, blogPosts: data.blogPosts, teamMembers: data.teamMembers, testimonials: data.testimonials.filter(item => item.visible), revision: etag });
      }
      if (!['/api/admin/content','/api/admin/backups'].includes(pathname)) return json({ error: 'Not found.' }, 404);
      const denied = await authorize(request, context);
      if (denied) return denied;
      if(pathname==='/api/admin/backups'){
        if(!backups)return json({error:'Backups are unavailable.'},503);
        const url=new URL(request.url);
        if(request.method==='GET'){
          if(url.searchParams.has('id')){const backup=await backups.get(url.searchParams.get('id'));return backup?json({backup}):json({error:'Backup not found.'},404);}
          const {data}=await read();
          const remaining=[...new Set(JSON.stringify(data).match(/https?:[^"\s]*zenu\.com\.au[^"\s]*/g)||[])];
          return json({items:await backups.list(),images:{copied:Object.keys(imageMigration).length,remaining}});
        }
        if(request.method!=='POST')return json({error:'Method not allowed.'},405);
        if(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Request not allowed.'},403);
        const raw=await request.text();if(raw.length>2000)return json({error:'Request too large.'},413);
        const input=JSON.parse(raw),entry=await read();
        if(input.action==='create'){return json({backup:await backups.snapshot(entry.data,'Manual backup')},201);}
        if(input.action!=='restore')return json({error:'Invalid backup action.'},400);
        if(input.revision!==entry.etag)return json({error:'Content changed. Refresh before restoring.'},409);
        const backup=await backups.get(input.id);if(!backup)return json({error:'Backup not found.'},404);
        let data={};
        try{
          for(const collection of Object.keys(fields)){
            const items=backup.content[collection]??(['teamMembers','testimonials'].includes(collection)?initialContent[collection]:undefined);
            if(!Array.isArray(items)||items.length>1000||new Set(items.map(item=>item.id)).size!==items.length)throw new Error();
            data[collection]=items.map(item=>validateItem(collection,item));
          }
          if(data.listings.some(item=>!data.teamMembers.some(member=>member.id===item.agentId)||(item.coAgentId&&!data.teamMembers.some(member=>member.id===item.coAgentId))))throw new Error();
        }catch{return json({error:'This backup could not be validated. Nothing was restored.'},400);}
        // The wrapper snapshots the current revision before restore too.
        const result=await store.setJSON(KEY,migrateImageUrls(data),{onlyIfMatch:entry.etag});
        return result.modified?json({restored:true,revision:result.etag}):json({error:'Another edit was saved. Refresh before restoring.'},409);
      }
      if (request.method === 'GET') {
        const { data, etag } = await read();
        return json({ listings: data.listings, blogPosts: data.blogPosts, teamMembers: data.teamMembers, testimonials: data.testimonials, revision: etag });
      }
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      // Defense in depth: protect writes even if an adapter's auth implementation changes.
      const url = new URL(request.url);
      if (!request.headers.get('content-type')?.startsWith('application/json') ||
        (request.headers.get('origin') && request.headers.get('origin') !== url.origin)) return json({ error: 'Request not allowed.' }, 403);
      const raw = await request.text();
      if (raw.length > 3000000) return json({ error: 'Content is too large.' }, 413);
      let input;
      try { input = JSON.parse(raw); } catch { return json({ error: 'Invalid request.' }, 400); }
      if (!input || (input.action !== 'import' && input.action !== 'publishZenuImport' && !(input.action === 'reorder' && ['teamMembers', 'testimonials'].includes(input.collection)) && (!Object.hasOwn(fields, input.collection) || !['add', 'update', 'delete'].includes(input.action)))) return json({ error: 'Invalid content operation.' }, 400);
      const entry = await read();
      if (typeof input.revision !== 'string' || input.revision !== entry.etag) return json({ error: 'The website content changed in another session. Reload the latest content, review your edit and try again.', conflict: true }, 409);
      if (input.action === 'publishZenuImport') {
        if (canonical(entry.data.listings) === canonical(zenuListings)) return json({ ...entry.data, revision: entry.etag, alreadyImported: true });
        if (canonical(entry.data.listings) !== canonical(zenuBaseline)) return json({ error: 'Live listings have changed since the import was prepared. Review and reconcile them before publishing.', conflict: true }, 409);
        const listings = zenuListings.map(item => validateItem('listings', item));
        if (new Set(listings.map(item => item.id)).size !== listings.length || listings.some(item => !entry.data.teamMembers.some(member => member.id === item.agentId) || (item.coAgentId && !entry.data.teamMembers.some(member => member.id === item.coAgentId)))) return json({ error: 'The prepared listings failed validation.' }, 400);
        const data = { ...entry.data, listings };
        if (JSON.stringify(data).length > 3000000) return json({ error: 'Website content is too large.' }, 413);
        const result = await store.setJSON(KEY, data, { onlyIfMatch: entry.etag });
        return result.modified ? json({ ...data, revision: result.etag, imported: listings.length }) : json({ error: 'Another edit was saved during import. Reload and review the latest content.' }, 409);
      }
      if (input.action === 'reorder') {
        const members = entry.data[input.collection];
        const byId = new Map(members.map(member => [member.id, member]));
        if (!Array.isArray(input.ids) || input.ids.length !== members.length || new Set(input.ids).size !== members.length || input.ids.some(id => !byId.has(id))) return json({ error: 'Include every item exactly once when changing the order.' }, 400);
        const data = { ...entry.data, [input.collection]: input.ids.map(id => byId.get(id)) };
        const result = await store.setJSON(KEY, data, { onlyIfMatch: entry.etag });
        if (!result.modified) return json({ error: 'Another edit was saved. Reload the latest content before changing the order.', conflict: true }, 409);
        return json({ ...data, revision: result.etag });
      }
      if (input.action === 'import') {
        let data;
        try { data = mergeLegacyContent(entry.data, input.legacy); } catch (error) { return json({ error: error.message }, error.message.startsWith('Import conflict:') ? 409 : 400); }
        if (JSON.stringify(data).length > 3000000) return json({ error: 'Website content is too large.' }, 413);
        const result = await store.setJSON(KEY, data, { onlyIfMatch: entry.etag });
        if (!result.modified) return json({ error: 'Another edit was saved during import. Reload the latest content and try again.' }, 409);
        return json({ ...data, revision: result.etag });
      }
      if (raw.length > 256000) return json({ error: 'This item is too large.' }, 413);
      const items = entry.data[input.collection];
      const id = input.action === 'delete' ? input.id : input.item?.id;
      if (input.collection === 'teamMembers' && input.action === 'delete' && entry.data.listings.some(item => item.agentId === id || item.coAgentId === id)) return json({ error: 'Reassign this member’s listings before deleting their profile.' }, 400);
      const index = items.findIndex((item) => item.id === id);
      if (input.action === 'add' && index !== -1) return json({ error: 'That item already exists. Reload and try again.' }, 409);
      if (input.action !== 'add' && index === -1) return json({ error: 'That item no longer exists. Reload the latest content.' }, 404);
      let nextItems;
      if (input.action === 'delete') nextItems = items.filter((item) => item.id !== id);
      else {
        let item;
        try { item = validateItem(input.collection, input.item); } catch (error) { return json({ error: error.message }, 400); }
        if(input.collection==='listings'&&(!entry.data.teamMembers.some(member=>member.id===item.agentId)||(item.coAgentId&&!entry.data.teamMembers.some(member=>member.id===item.coAgentId))))return json({error:'Choose an existing team member for this listing.'},400);
        nextItems = input.action === 'add' ? [item, ...items] : items.map((old) => old.id === id ? item : old);
      }
      if (nextItems.length > 1000) return json({ error: 'This collection has reached its content limit.' }, 400);
      const data = { ...entry.data, [input.collection]: nextItems };
      if (JSON.stringify(data).length > 3000000) return json({ error: 'Website content is too large.' }, 413);
      const result = await store.setJSON(KEY, data, { onlyIfMatch: entry.etag });
      if (!result.modified) return json({ error: 'Another edit was saved at the same time. Reload the latest content and try again.', conflict: true }, 409);
      return json({ ...data, revision: result.etag });
    } catch {
      return json({ error: 'Website content is temporarily unavailable. Your changes have not been confirmed; reload the latest content before retrying.' }, 503);
    }
  };
}
