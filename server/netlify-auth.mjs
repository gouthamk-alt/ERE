import { getStore } from '@netlify/blobs';
import { createAdminAuth } from './auth.mjs';

let auth;
export default async function handleAdmin(request, context) {
  // Functions supply the Blobs context automatically. Never expose storage to the browser.
  auth ??= createAdminAuth({
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
    secure: true,
    store: {
      get: (key) => getStore({ name: 'ere-admin-sessions', consistency: 'strong' }).get(key, { type: 'json' }),
      set: (key, value) => getStore({ name: 'ere-admin-sessions', consistency: 'strong' }).setJSON(key, value),
      delete: (key) => getStore({ name: 'ere-admin-sessions', consistency: 'strong' }).delete(key),
    },
  });
  const response = await auth(request, { ip: context.ip });
  return response || Response.json({ error: 'Not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
