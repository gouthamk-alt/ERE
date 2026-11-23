import { getStore } from '@netlify/blobs';
import { createMarketingService } from './marketing.mjs';
import { authenticateAdmin } from './netlify-auth.mjs';
export function netlifyMarketing(context) {
  const preview=context.deploy.context!=='production';
  return createMarketingService({store:getStore({name:preview?`ere-marketing-preview-${context.deploy.id}`:'ere-marketing-production',consistency:'strong'}),authorize:authenticateAdmin,preview});
}
