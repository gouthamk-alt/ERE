import { cleanRichText } from './rich-text.mjs';

const API = 'https://api.brevo.com/v3';
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export async function createBrevoCampaign({ apiKey, draft, listIds, sender, site, fetcher = fetch }) {
  if (!apiKey || !Array.isArray(listIds) || !listIds.length || listIds.some(id => !Number.isSafeInteger(id) || id < 1)) throw new Error('Brevo campaign lists are not configured.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)) throw new Error('Brevo sender is not configured.');
  const content = cleanCampaignHtml(draft, site);
  const response = await fetcher(`${API}/emailCampaigns`, {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ name: `ERE - ${draft.title}`.slice(0, 200), sender: { name: 'Wendy Chia', email: sender }, replyTo: sender, type: 'classic', subject: draft.subject, previewText: draft.preheader, htmlContent: content, recipients: { listIds } }),
  });
  if (!response.ok) throw new Error(`Brevo could not create the campaign draft (${response.status}).`);
  const result = await response.json();
  if (!Number.isSafeInteger(result.id) || result.id < 1) throw new Error('Brevo did not return a campaign ID.');
  return result.id;
}

export function cleanCampaignHtml(draft, site) {
  const base = new URL(site);
  const body = cleanRichText(draft.bodyHtml).replace(/(src|href)="(\/[^"\s]*)"/g, (_match, attribute, path) => `${attribute}="${escapeHtml(new URL(path, base).href)}"`);
  const attachment = draft.attachmentUrl ? `<p><a href="${escapeHtml(new URL(draft.attachmentUrl, base).href)}">Download newsletter PDF</a></p>` : '';
  return `<!doctype html><html><body style="margin:0;background:#ededed;color:#000;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(draft.preheader)}</div><div style="max-width:640px;margin:auto;padding:28px;background:#fff">${body}${attachment}<hr><p style="font-size:12px;color:#555">Exceptional Real Estate<br><a href="{{ unsubscribe }}">Unsubscribe</a></p></div></body></html>`;
}

export async function syncBrevoContact({ email, subscription, apiKey, listId, fetcher = fetch }) {
  if (!apiKey || !Number.isSafeInteger(Number(listId)) || Number(listId) < 1) throw new Error('Brevo is not configured.');
  const headers = { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' };
  const contactUrl = `${API}/contacts/${encodeURIComponent(email)}?identifierType=email_id`;
  const existing = await fetcher(contactUrl, { headers, signal: AbortSignal.timeout(8000) });
  if (existing.status !== 404 && !existing.ok) throw new Error('Brevo contact lookup failed.');
  const contact = existing.status === 404 ? null : await existing.json();
  if (subscription !== 'subscribed') {
    if (!contact?.listIds?.includes(Number(listId))) return { status: 'removed' };
    const response = await fetcher(`${API}/contacts/lists/${listId}/contacts/remove`, {
      method: 'POST', headers, signal: AbortSignal.timeout(8000), body: JSON.stringify({ emails: [email] }),
    });
    if (!response.ok || (await response.json()).failure?.includes(email)) throw new Error('Brevo list removal failed.');
    return { status: 'removed' };
  }
  // Brevo's blocklist and list-level opt-outs take precedence over website consent.
  if (contact?.emailBlacklisted || contact?.listUnsubscribed?.length) return { status: 'suppressed' };
  if (contact?.listIds?.includes(Number(listId))) return { status: 'subscribed' };
  const response = contact
    ? await fetcher(`${API}/contacts/lists/${listId}/contacts/add`, {
      method: 'POST', headers, signal: AbortSignal.timeout(8000), body: JSON.stringify({ emails: [email] }),
    })
    : await fetcher(`${API}/contacts`, {
      method: 'POST', headers, signal: AbortSignal.timeout(8000), body: JSON.stringify({ email, listIds: [Number(listId)] }),
    });
  if (!response.ok || (contact && (await response.json()).failure?.includes(email))) throw new Error('Brevo contact sync failed.');
  return { status: 'subscribed' };
}
