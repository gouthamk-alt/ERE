import { netlifyMarketing } from '../../server/netlify-marketing.mjs';
export default async function handler(_request,context){await netlifyMarketing(context).worker();return new Response(null,{status:204});}
export const config={schedule:'*/2 * * * *'};
