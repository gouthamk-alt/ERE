import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export function createMediaHandler({ store, authorize }) {
  const get = key => store.getWithMetadata(key, { type: 'json' });
  return async (request, context = {}) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.match(/^\/api\/media\/([a-f0-9-]{36})$/)?.[1];
      if (id && request.method === 'GET') {
        const entry = await get(`files/${id}`);
        if (!entry) return reply({ error: 'File not found.' }, 404);
        const { base64, type } = entry.data;
        return new Response(Buffer.from(base64, 'base64'), { headers: { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Disposition': type === 'application/pdf' ? 'attachment; filename="newsletter.pdf"' : 'inline' } });
      }
      if (url.pathname === '/api/fonts.css' && request.method === 'GET') {
        const { blobs } = await store.list({ prefix: 'fonts/' });
        const css = blobs.slice(0, 100).map(blob => {
          const fontId = blob.key.split('/')[1];
          return /^[a-f0-9-]{36}$/.test(fontId) ? `@font-face{font-family:"EREFont_${fontId}";src:url("/api/media/${fontId}") format("woff2");font-display:swap;}` : '';
        }).join('\n');
        return new Response(css, { headers: { 'Content-Type': 'text/css', 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' } });
      }
      const denied = await authorize(request, context); if (denied) return denied;
      if (request.method === 'GET') {
        const { blobs } = await store.list({ prefix: 'index/' });
        const items = [];
        for (const blob of blobs.slice(-200)) { const entry = await get(blob.key); if (entry) items.push(entry.data); }
        return reply({ items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
      }
      if (request.method !== 'POST' || request.headers.get('origin') !== url.origin || !request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'Request not allowed.' }, 403);
      const raw = await request.text();
      if (raw.length > 4300000) return reply({ error: 'Choose a file under 3 MB.' }, 413);
      const input = JSON.parse(raw);
      if (typeof input.base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64)) return reply({ error: 'Invalid upload.' }, 400);
      let bytes = Buffer.from(input.base64, 'base64'), type, kind;
      if (bytes.length > 3 * 1024 * 1024 || bytes.length < 8) return reply({ error: 'Choose a file under 3 MB.' }, 400);
      const name = String(input.name || 'Upload').replace(/[\r\n\x00-\x1f]/g, '').slice(0, 150);
      if (input.kind === 'font') {
        if (bytes.length < 48 || bytes.toString('ascii', 0, 4) !== 'wOF2' || bytes.readUInt32BE(8) !== bytes.length) return reply({ error: 'Use a valid WOFF2 font file.' }, 400);
        type = 'font/woff2'; kind = 'font';
      } else if (input.kind === 'pdf') {
        if (bytes.toString('ascii', 0, 5) !== '%PDF-') return reply({ error: 'Use a PDF document.' }, 400);
        type = 'application/pdf'; kind = 'pdf';
      } else {
        try {
          const image = sharp(bytes, { limitInputPixels: 40000000, animated: false });
          const metadata = await image.metadata();
          if (!['jpeg', 'png', 'webp', 'avif'].includes(metadata.format)) throw new Error();
          bytes = await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
        } catch { return reply({ error: 'Use a valid JPG, PNG, WebP or AVIF image.' }, 400); }
        type = 'image/webp'; kind = 'image';
      }
      const fileId = randomUUID();
      const item = { id: fileId, name, kind, type, size: bytes.length, url: `/api/media/${fileId}`, createdAt: new Date().toISOString(), ...(kind === 'font' ? { family: `EREFont_${fileId}` } : {}) };
      await store.setJSON(`files/${fileId}`, { base64: bytes.toString('base64'), type }, { onlyIfNew: true });
      if (kind === 'font') await store.setJSON(`fonts/${fileId}`, item, { onlyIfNew: true });
      await store.setJSON(`index/${fileId}`, item, { onlyIfNew: true });
      return reply({ item }, 201);
    } catch { return reply({ error: 'Upload could not be confirmed. Please retry.' }, 503); }
  };
}
