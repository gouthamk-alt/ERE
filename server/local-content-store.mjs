import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

// Persistent development storage; production uses Netlify Blobs across instances.
export function createLocalContentStore(directory) {
  const file = path.join(directory, 'content.json');
  let queue = Promise.resolve();
  const read = async () => {
    try {
      const raw = await readFile(file, 'utf8');
      return { data: JSON.parse(raw), etag: createHash('sha256').update(raw).digest('hex') };
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  };
  return {
    getWithMetadata: read,
    setJSON(_key, data, options) {
      const result = queue.then(async () => {
        const old = await read();
        if ((options.onlyIfNew && old) || (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)) return { modified: false };
        const raw = JSON.stringify(data);
        await mkdir(directory, { recursive: true });
        const temporary = path.join(directory, `${randomUUID()}.tmp`);
        await writeFile(temporary, raw, 'utf8');
        await rename(temporary, file);
        return { modified: true, etag: createHash('sha256').update(raw).digest('hex') };
      });
      queue = result.catch(() => {});
      return result;
    },
  };
}
