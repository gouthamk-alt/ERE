import { netlifyMicrosoft } from '../../server/netlify-microsoft.mjs';

export default async function handler(request, context) {
  return netlifyMicrosoft(context).handle(request, context);
}
export const config = { path: ['/api/admin/email/microsoft', '/api/admin/email/microsoft/connect', '/api/email/microsoft/callback'] };
