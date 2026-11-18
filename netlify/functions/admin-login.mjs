export { default } from '../../server/netlify-auth.mjs';

export const config = {
  path: '/api/admin/login',
  rateLimit: { windowLimit: 5, windowSize: 180, aggregateBy: ['ip', 'domain'] },
};
