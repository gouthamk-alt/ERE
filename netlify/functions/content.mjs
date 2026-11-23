import { getStore } from '@netlify/blobs';
import { createContentHandler } from '../../server/content.mjs';
import { authenticateAdmin } from '../../server/netlify-auth.mjs';
import { createContentBackups } from '../../server/content-backups.mjs';

export default async function handler(request, context) {
  const namespace = context.deploy.context === 'production' ? 'production' : `preview-${context.deploy.id}`;
  const store = getStore({ name: `ere-website-content-${namespace}`, consistency: 'strong' });
  const backups=createContentBackups(getStore({name:`ere-content-backups-${namespace}`,consistency:'strong'}));
  return createContentHandler({ store, backups, authorize: authenticateAdmin })(request, context);
}
export const config = { path: ['/api/content', '/api/admin/content', '/api/admin/backups'] };
