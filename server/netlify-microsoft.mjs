import { getStore } from '@netlify/blobs';
import { createMicrosoftConnection } from './microsoft-email.mjs';
import { authenticateAdmin } from './netlify-auth.mjs';

export function netlifyMicrosoft(context) {
  const production = context.deploy.context === 'production';
  return createMicrosoftConnection({
    store: getStore({ name: production ? 'ere-email-microsoft-production' : `ere-email-microsoft-preview-${context.deploy.id}`, consistency: 'strong' }),
    authorize: authenticateAdmin,
    enabled: production && (process.env.ENQUIRY_EMAIL_PROVIDER || 'microsoft') === 'microsoft' && process.env.ENQUIRY_EMAIL_ENABLED === 'true',
  });
}
