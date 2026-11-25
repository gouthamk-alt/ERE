const API = 'https://api.brevo.com/v3';

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
