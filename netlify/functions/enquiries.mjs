import { getStore } from '@netlify/blobs';
import { createEnquiryService, createEmailSender } from '../../server/enquiries.mjs';
import { authenticateAdmin } from '../../server/netlify-auth.mjs';
import { netlifyMicrosoft } from '../../server/netlify-microsoft.mjs';
import { netlifyMarketing } from '../../server/netlify-marketing.mjs';

export async function enquiryService(context) {
  const preview = context.deploy.context !== 'production';
  const provider = process.env.ENQUIRY_EMAIL_PROVIDER || 'microsoft';
  return createEnquiryService({
    store: getStore({ name: preview ? `ere-enquiries-preview-${context.deploy.id}` : 'ere-enquiries-production', consistency: 'strong' }),
    sender: provider === 'microsoft' ? await netlifyMicrosoft(context).sender() : createEmailSender({ enabled: provider === 'resend' && !preview && process.env.ENQUIRY_EMAIL_ENABLED === 'true', apiKey: process.env.RESEND_API_KEY, from: process.env.ENQUIRY_EMAIL_FROM }),
    preview, authorize: authenticateAdmin,
    captureContact:(record,confirmed)=>netlifyMarketing(context).captureEnquiryContact(record,confirmed),
  });
}
export default async function handler(request, context) {
  const service = await enquiryService(context);
  return new URL(request.url).pathname.startsWith('/api/admin/') ? service.inspect(request, context) : service.submit(request, context);
}
export const config = { path: ['/api/enquiries', '/api/enquiries/careers', '/api/enquiries/subscribe', '/api/admin/enquiries'] };
