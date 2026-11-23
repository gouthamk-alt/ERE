import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const TO = 'sales@exceptionalrealestate.com.au';
const HOUR = 3600000;
const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const hash = value => createHash('sha256').update(value).digest('hex');
const date = milliseconds => new Date(milliseconds).toISOString().slice(0, 10);

export function notificationText(record) {
  const e = record.enquiry;
  return [
    `Reference: ${record.reference}`, `Submitted: ${record.createdAt}`, `Type: ${e.type}`,
    `Name: ${e.clientName}`, `Email: ${e.email}`, `Phone: ${e.phone || 'Not provided'}`,
    `Property: ${e.propertyTitle || e.suburbOrAddress || 'Not specified'}`,
    `Agent requested: ${e.agentName || 'Not specified'}`, `Service: ${e.serviceInterest || 'Not specified'}`,
    '', 'Message:', e.message,
  ].join('\n');
}

export function validateEnquiry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Please check your enquiry.');
  const result = {};
  for (const [key, limit, required] of [
    ['type', 50, true], ['clientName', 120, true], ['email', 254, true], ['phone', 40, false],
    ['message', 3000, true], ['propertyId', 100, false], ['propertyTitle', 300, false],
    ['suburbOrAddress', 500, false], ['agentName', 150, false], ['serviceInterest', 150, false],
  ]) {
    const text = value[key] ?? '';
    if (typeof text !== 'string' || text.length > limit || (required && !text.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new Error('Please check your enquiry details.');
    result[key] = text.trim();
  }
  if (!['Free Appraisal', 'Property Enquiry', 'Inspection Registration', 'General Contact'].includes(result.type)) throw new Error('Please choose a valid enquiry type.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) || /[\r\n]/.test(result.email)) throw new Error('Please enter a valid email address.');
  if (/[\r\n]/.test(result.clientName)) throw new Error('Please check your name.');
  if (result.type === 'Free Appraisal' && (!result.suburbOrAddress || !result.phone)) throw new Error('Please provide your property address and phone number.');
  result.newsletterRequested=value.newsletterOptIn===true;
  return result;
}

export function createEmailSender({ apiKey, from, enabled = false, fetcher = fetch } = {}) {
  return {
    kind: 'resend', idempotent: true,
    ready: Boolean(enabled && apiKey && from),
    async send(record) {
      if (!this.ready) throw new Error('Email not configured');
      const e = record.enquiry;
      const text = notificationText(record);
      const response = await fetcher('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `ere-enquiry/${record.id}` },
        body: JSON.stringify({ from, to: [TO], reply_to: e.email, subject: `Website ${e.type} — ${record.reference}`, text }),
      });
      if (!response.ok) throw new Error('Email provider unavailable');
      const data = await response.json();
      if (typeof data.id !== 'string') throw new Error('Email not accepted');
      return data.id;
    },
  };
}

// All customer records live in a private store, separate from public website content.
export function createEnquiryService({ store, sender, preview = false, now = Date.now, captureContact, authorize = async () => json({ error: 'Sign in to continue.' }, 401) }) {
  const get = key => store.getWithMetadata(key, { type: 'json' });
  async function capture(key){
    if(!captureContact)return;
    const entry=await get(key);if(!entry||entry.data.contactSaved)return;
    await captureContact(entry.data,false);
    await store.setJSON(key,{...entry.data,contactSaved:true},{onlyIfMatch:entry.etag});
  }
  async function deliver(key) {
    const entry = await get(key);
    if (!entry || !sender.ready) return;
    const record = entry.data;
    if (['accepted', 'preview', 'review'].includes(record.delivery.status) || (record.delivery.leaseUntil || 0) > now() || (record.delivery.nextAttempt || 0) > now()) return;
    if ((record.delivery.provider && record.delivery.provider !== (sender.kind || 'test')) || (sender.idempotent === false && record.delivery.status === 'sending')) {
      record.delivery.status = 'review';
      await store.setJSON(key, record, { onlyIfMatch: entry.etag });
      return;
    }
    // Provider idempotency expires after 24h; stop ambiguous automatic retries before then.
    if (now() - Date.parse(record.createdAt) >= 18 * HOUR || record.delivery.attempts >= 10) {
      record.delivery.status = 'review';
      await store.setJSON(key, record, { onlyIfMatch: entry.etag });
      return;
    }
    record.delivery = { ...record.delivery, provider: sender.kind || 'test', status: 'sending', attempts: record.delivery.attempts + 1, leaseUntil: now() + 60000 };
    const claim = await store.setJSON(key, record, { onlyIfMatch: entry.etag });
    if (!claim.modified) return;
    try {
      const providerId = await sender.send(record);
      record.delivery = { status: 'accepted', provider: sender.kind || 'test', attempts: record.delivery.attempts, providerId, acceptedAt: new Date(now()).toISOString() };
    } catch (error) {
      record.delivery = { status: sender.idempotent === false && error.retrySafe !== true ? 'review' : 'pending', provider: sender.kind || 'test', attempts: record.delivery.attempts, nextAttempt: now() + Math.min(HOUR, 60000 * 2 ** record.delivery.attempts) };
    }
    // A failed status save is safe to retry within the same provider idempotency window.
    await store.setJSON(key, record, { onlyIfMatch: claim.etag });
  }
  async function rateLimit(ip) {
    const key = `limits/${Math.floor(now() / HOUR)}/${hash(ip || 'unknown')}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const entry = await get(key);
      if ((entry?.data.count || 0) >= 6) return false;
      const result = await store.setJSON(key, { count: (entry?.data.count || 0) + 1 }, entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true });
      if (result.modified) return true;
    }
    return false;
  }
  async function submit(request, context = {}) {
    if (request.method !== 'POST') return json({ error: 'Not found.' }, 405, { Allow: 'POST' });
    if (request.headers.get('origin') !== new URL(request.url).origin || !request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Request not allowed.' }, 403);
    try {
      if (Number(request.headers.get('content-length')) > 14000) return json({ error: 'Your message is too long.' }, 413);
      let raw = '', size = 0;
      const decoder = new TextDecoder();
      for await (const chunk of request.body || []) {
        size += chunk.byteLength;
        if (size > 14000) return json({ error: 'Your message is too long.' }, 413);
        raw += decoder.decode(chunk, { stream: true });
      }
      raw += decoder.decode();
      let body;
      try { body = JSON.parse(raw); } catch { return json({ error: 'Please check your enquiry.' }, 400); }
      if(new URL(request.url).pathname==='/api/enquiries/subscribe'){
        if(!captureContact||typeof body.requestId!=='string'||!/^\d{13}-[a-f0-9-]{36}$/.test(body.requestId)||typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))return json({error:'Subscription confirmation is unavailable.'},400);
        const stamp=Number(body.requestId.slice(0,13));if(Math.abs(now()-stamp)>24*HOUR)return json({error:'Confirmation expired. Please submit a new enquiry.'},400);
        const key=`requests/${date(stamp)}/${body.requestId}`,entry=await get(key);
        if(!entry?.data.newsletterToken||!timingSafeEqual(Buffer.from(hash(body.token)),Buffer.from(hash(entry.data.newsletterToken))))return json({error:'Invalid subscription confirmation.'},400);
        const result=await captureContact(entry.data,true);
        const latest=await get(key);
        await store.setJSON(key,{...latest.data,newsletterConfirmedAt:new Date(now()).toISOString()},{onlyIfMatch:latest.etag});
        return json({...result,preview});
      }
      if (body?.website || typeof body?.requestId !== 'string' || !/^\d{13}-[a-f0-9-]{36}$/.test(body.requestId)) return json({ error: 'Please refresh the page and try again.' }, 400);
      let enquiry;
      try { enquiry = validateEnquiry(body); } catch (error) { return json({ error: error.message }, 400); }
      const timestamp = Number(body.requestId.slice(0, 13));
      if (!Number.isFinite(timestamp) || Math.abs(now() - timestamp) > 24 * HOUR) return json({ error: 'Please refresh the page and try again.' }, 400);
      const key = `requests/${date(timestamp)}/${body.requestId}`;
      let entry = await get(key);
      const fingerprint = hash(JSON.stringify(enquiry));
      if (entry && entry.data.fingerprint !== fingerprint) return json({ error: 'This request has changed. Please start a new enquiry.' }, 409);
      if (!entry) {
        if (!await rateLimit(context.ip)) return json({ error: 'Too many enquiries. Please try later or email sales@exceptionalrealestate.com.au.' }, 429, { 'Retry-After': '3600' });
        const record = { id: body.requestId, reference: `ERE-${hash(body.requestId).slice(0, 12).toUpperCase()}`, createdAt: new Date(now()).toISOString(), enquiry, fingerprint, ...(enquiry.newsletterRequested?{newsletterToken:randomBytes(32).toString('hex')}:{}), delivery: { status: preview ? 'preview' : 'pending', attempts: 0 } };
        await store.setJSON(key, record, { onlyIfNew: true });
        entry = await get(key);
        if (!entry || entry.data.fingerprint !== fingerprint) throw new Error('Storage unavailable');
      }
      try{await capture(key);}catch{/* A durable enquiry remains available for contact-capture retries. */}
      if (!preview) {
        try { await deliver(key); } catch { /* Saved enquiry will be retried by the scheduled worker. */ }
      }
      return json({ reference: entry.data.reference, preview, ...(entry.data.newsletterToken?{newsletter:{requestId:entry.data.id,token:entry.data.newsletterToken}}:{}) }, 201);
    } catch {
      return json({ error: 'We could not confirm receipt. Your details are still in the form; please try again.' }, 503);
    }
  }
  async function retryPending() {
    if (preview || (!sender.ready&&!captureContact)) return;
    let count = 0;
    for (const day of [date(now() - 24 * HOUR), date(now())]) {
      const listing = await store.list({ prefix: `requests/${day}/` });
      for (const blob of listing.blobs) {
        if (count++ >= 500) return;
        try { await capture(blob.key); await deliver(blob.key); } catch { /* Keep durable record for the next run. */ }
      }
    }
    // Rate counters contain no raw IP or customer details; remove expired hourly counters.
    const limits = await store.list({ prefix: 'limits/' });
    for (const blob of limits.blobs) if (Number(blob.key.split('/')[1]) < Math.floor(now() / HOUR) - 2) await store.delete(blob.key);
  }
  async function inspect(request, context) {
    const denied = await authorize(request, context);
    if (denied) return denied;
    if (request.method !== 'GET') return json({ error: 'Not found.' }, 405);
    const day = new URL(request.url).searchParams.get('day') || date(now());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json({ error: 'Invalid date.' }, 400);
    const listing = await store.list({ prefix: `requests/${day}/` });
    const offset=Number(new URL(request.url).searchParams.get('offset')||0);
    if(!Number.isSafeInteger(offset)||offset<0)return json({error:'Invalid page.'},400);
    listing.blobs.sort((a,b)=>b.key.localeCompare(a.key));
    const records = [];
    for (const blob of listing.blobs.slice(offset, offset+100)) {
      const entry = await get(blob.key);
      if (entry) {
        const { id,reference,createdAt,enquiry,delivery }=entry.data;
        records.push({id,reference,createdAt,enquiry,delivery:{status:delivery.status,attempts:delivery.attempts},notificationConfigured:sender.ready});
      }
    }
    return json({ records:records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)), day, offset, total:listing.blobs.length, truncated:offset+100<listing.blobs.length, notificationConfigured:sender.ready, preview });
  }
  return { submit, retryPending, inspect };
}
