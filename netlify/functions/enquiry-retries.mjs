import { enquiryService } from './enquiries.mjs';

export default async function handler(_request, context) {
  await (await enquiryService(context)).retryPending();
  return new Response(null, { status: 204 });
}
export const config = { schedule: '0 * * * *' };
