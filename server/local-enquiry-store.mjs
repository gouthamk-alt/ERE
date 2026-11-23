import { mkdir, readFile, writeFile, rename, readdir, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

export function createLocalEnquiryStore(directory) {
  const queues = new Map();
  const filename = key => {
    if (!/^[\w/-]+$/.test(key) || key.includes('..')) throw new Error('Invalid key');
    return path.join(directory, `${key}.json`);
  };
  async function getWithMetadata(key) {
    try {
      const raw = await readFile(filename(key), 'utf8');
      return { data: JSON.parse(raw), etag: createHash('sha256').update(raw).digest('hex') };
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  return {
    getWithMetadata,
    setJSON(key, value, options = {}) {
      const result = (queues.get(key) || Promise.resolve()).then(async () => {
        const old = await getWithMetadata(key);
        if ((options.onlyIfNew && old) || (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)) return { modified: false };
        const file = filename(key), raw = JSON.stringify(value);
        await mkdir(path.dirname(file), { recursive: true });
        const temporary = `${file}.${randomUUID()}.tmp`;
        await writeFile(temporary, raw, { mode: 0o600 });
        await rename(temporary, file);
        return { modified: true, etag: createHash('sha256').update(raw).digest('hex') };
      });
      const settled = result.catch(() => {});
      queues.set(key, settled);
      void settled.then(() => { if (queues.get(key) === settled) queues.delete(key); });
      return result;
    },
    async list({ prefix }) {
      const folder = path.dirname(filename(`${prefix}placeholder`));
      try { return { blobs: (await readdir(folder)).filter(name => name.endsWith('.json')).map(name => ({ key: prefix + name.slice(0, -5) })) }; }
      catch (error) { if (error.code === 'ENOENT') return { blobs: [] }; throw error; }
    },
    async delete(key) { try { await unlink(filename(key)); } catch (error) { if (error.code !== 'ENOENT') throw error; } },
  };
}
