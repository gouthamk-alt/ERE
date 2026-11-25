import { netlifyMarketing } from '../../server/netlify-marketing.mjs';
export default async function handler(request,context){return netlifyMarketing(context).handle(request,context);}
export const config={path:['/api/admin/contacts','/api/admin/newsletters','/api/newsletter/unsubscribe','/api/newsletter/webhook','/api/newsletter/brevo-webhook']};
