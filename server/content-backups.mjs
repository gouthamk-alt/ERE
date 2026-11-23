import { createHash } from 'node:crypto';

export function createContentBackups(store, now = Date.now) {
  async function snapshot(data, reason = 'Before content change') {
    const id = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    const backup = { format: 'ere-content-v1', id, createdAt: new Date(now()).toISOString(), reason, content: structuredClone(data) };
    await store.setJSON(`snapshots/${id}`, backup, { onlyIfNew: true });
    return (await store.getWithMetadata(`snapshots/${id}`, { type: 'json' })).data;
  }
  async function get(id) {
    if (!/^[a-f0-9]{64}$/.test(id || '')) return null;
    return (await store.getWithMetadata(`snapshots/${id}`, { type: 'json' }))?.data || null;
  }
  async function list() {
    const items=[];
    // Netlify's default listing auto-paginates unless paginate:true is requested.
    const { blobs }=await store.list({prefix:'snapshots/'});
    for(const blob of blobs){const backup=await get(blob.key.split('/')[1]);if(backup){const {content,...metadata}=backup;items.push({...metadata,counts:Object.fromEntries(Object.entries(content).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]))});}}
    return items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }
  return { snapshot, get, list };
}

// Fail closed on backup failure: never overwrite content without a recovery copy.
export function withContentBackups(store, backups) {
  return {
    getWithMetadata: (...args) => store.getWithMetadata(...args),
    async setJSON(key, data, options = {}) {
      const old=await store.getWithMetadata(key,{type:'json'});
      if(old && options.onlyIfMatch===old.etag)await backups.snapshot(old.data);
      return store.setJSON(key,data,options);
    },
  };
}
