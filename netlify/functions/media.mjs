import { getStore } from '@netlify/blobs';
import { createMediaHandler } from '../../server/media.mjs';
import { authenticateAdmin } from '../../server/netlify-auth.mjs';
export default async function handler(request,context){
  const preview=context.deploy.context!=='production';
  return createMediaHandler({store:getStore({name:preview?`ere-media-preview-${context.deploy.id}`:'ere-media-production',consistency:'strong'}),authorize:authenticateAdmin})(request,context);
}
export const config={path:['/api/admin/media','/api/media/:id','/api/fonts.css']};
