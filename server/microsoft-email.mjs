import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { notificationText } from './enquiries.mjs';

export const SALES_MAILBOX = 'sales@exceptionalrealestate.com.au';
const SCOPES = 'offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read';
const CALLBACK = '/api/email/microsoft/callback';
const COOKIE = 'ere_microsoft_link';
const digest = value => createHash('sha256').update(value).digest('hex');
const json = (value, status = 200, headers = {}) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', ...headers } });
const failure = (retrySafe = true) => Object.assign(new Error('Microsoft email connection unavailable.'), { retrySafe });

export function microsoftConfiguration(env = process.env) {
  return { tenantId: env.MICROSOFT_TENANT_ID, clientId: env.MICROSOFT_CLIENT_ID, clientSecret: env.MICROSOFT_CLIENT_SECRET, redirectUri: env.MICROSOFT_REDIRECT_URI, encryptionKey: env.EMAIL_TOKEN_ENCRYPTION_KEY };
}

// OAuth tokens never enter the frontend or public website content store.
export function createMicrosoftConnection({ store, config = microsoftConfiguration(), authorize, fetcher = fetch, now = Date.now, enabled = false } = {}) {
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  let redirect, key;
  try {
    redirect = new URL(config.redirectUri);
    key = Buffer.from(config.encryptionKey || '', 'base64');
  } catch { /* The admin status screen explains missing configuration without revealing secrets. */ }
  const configured = Boolean(uuid.test(config.tenantId || '') && uuid.test(config.clientId || '') && config.clientSecret &&
    key?.length === 32 && redirect?.pathname === CALLBACK && !redirect.search && !redirect.hash && !redirect.username && !redirect.password &&
    (redirect.protocol === 'https:' || (redirect.protocol === 'http:' && redirect.hostname === 'localhost')));
  const origin = redirect?.origin;
  const aad = Buffer.from(`ere-microsoft:${config.tenantId}:${config.clientId}`);
  const endpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0`;
  const pack = value => {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    const content = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), content: content.toString('base64') };
  };
  const unpack = value => {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'));
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.content, 'base64')), decipher.final()]).toString('utf8'));
  };
  const get = name => store.getWithMetadata(name, { type: 'json' });
  const cookie = (value, age = 600) => `${COOKIE}=${value}; Path=${CALLBACK}; HttpOnly; SameSite=Lax; Max-Age=${age}${redirect?.protocol === 'https:' ? '; Secure' : ''}`;
  const permissions = token => typeof token.scope === 'string' && token.scope.split(' ').some(scope => /(^|\/)mail.send$/i.test(scope));
  const tokenData = (token, previous = {}) => {
    if (typeof token.access_token !== 'string' || !permissions(token) || !Number.isFinite(Number(token.expires_in)) || Number(token.expires_in) <= 0) throw failure();
    const refreshToken = token.refresh_token || previous.refreshToken;
    if (typeof refreshToken !== 'string' || !refreshToken) throw failure();
    return { ...previous, accessToken: token.access_token, refreshToken, expiresAt: now() + Math.min(Number(token.expires_in), 86400) * 1000 };
  };
  async function exchange(parameters) {
    const response = await fetcher(`${endpoint}/token`, {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, scope: SCOPES, ...parameters }).toString(),
    });
    if (!response.ok) throw failure();
    return response.json();
  }
  async function status() {
    if (!configured) return { configured: false, connected: false, enabled, mailbox: SALES_MAILBOX };
    const entry = await get('mailbox');
    if (!entry) return { configured: true, connected: false, enabled, mailbox: SALES_MAILBOX };
    const account = unpack(entry.data);
    return { configured: true, connected: account.mailbox === SALES_MAILBOX && Boolean(account.refreshToken) && !account.reconnectRequired, enabled, mailbox: SALES_MAILBOX, connectedAt: account.connectedAt, reconnectRequired: Boolean(account.reconnectRequired) };
  }
  async function accessToken() {
    const entry = await get('mailbox');
    if (!configured || !entry) throw failure();
    const account = unpack(entry.data);
    if (account.mailbox !== SALES_MAILBOX || account.reconnectRequired) throw failure();
    if (account.expiresAt > now() + 60000) return account.accessToken;
    if ((account.refreshUntil || 0) > now()) throw failure();
    const claim = await store.setJSON('mailbox', pack({ ...account, refreshUntil: now() + 30000 }), { onlyIfMatch: entry.etag });
    if (!claim.modified) throw failure();
    try {
      const next = tokenData(await exchange({ grant_type: 'refresh_token', refresh_token: account.refreshToken }), account);
      delete next.refreshUntil;
      const saved = await store.setJSON('mailbox', pack(next), { onlyIfMatch: claim.etag });
      if (!saved.modified) throw failure();
      return next.accessToken;
    } catch {
      // Re-authorisation is safer than continuing with revoked or rotated credentials.
      await store.setJSON('mailbox', pack({ ...account, reconnectRequired: true }), { onlyIfMatch: claim.etag });
      throw failure();
    }
  }
  async function handle(request, context = {}) {
    const url = new URL(request.url);
    try {
      if (url.pathname === CALLBACK) {
        if (request.method !== 'GET' || !configured || url.origin !== origin) return json({ error: 'Microsoft connection is not configured for this address.' }, 400);
        const state = url.searchParams.get('state') || '';
        const browser = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
        if (!/^[a-f0-9]{64}$/.test(state) || !browser || digest(browser) !== state) return json({ error: 'Connection expired. Start again from admin.' }, 400);
        const stateKey = `oauth/${state}`, entry = await get(stateKey);
        if (!entry) return json({ error: 'Connection expired. Start again from admin.' }, 400);
        const transaction = unpack(entry.data);
        if (transaction.used || transaction.expiresAt <= now()) return json({ error: 'Connection expired. Start again from admin.' }, 400);
        const consumed = await store.setJSON(stateKey, pack({ used: true }), { onlyIfMatch: entry.etag });
        if (!consumed.modified) return json({ error: 'Connection expired. Start again from admin.' }, 400);
        const finish = result => new Response(null, { status: 303, headers: { Location: `${origin}/admin?email=${result}`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Set-Cookie': cookie('', 0) } });
        if (url.searchParams.has('error') || !url.searchParams.get('code')) return finish('cancelled');
        try {
          const account = tokenData(await exchange({ grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: config.redirectUri, code_verifier: transaction.verifier }));
          const profileResponse = await fetcher('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', { headers: { Authorization: `Bearer ${account.accessToken}` }, signal: AbortSignal.timeout(8000) });
          if (!profileResponse.ok) throw failure();
          const profile = await profileResponse.json();
          if (String(profile.mail || profile.userPrincipalName || '').toLowerCase() !== SALES_MAILBOX) return finish('wrong-account');
          await store.setJSON('mailbox', pack({ ...account, mailbox: SALES_MAILBOX, connectedAt: new Date(now()).toISOString() }));
          return finish('connected');
        } catch { return finish('failed'); }
      }
      const denied = authorize ? await authorize(request, context) : json({ error: 'Sign in to continue.' }, 401);
      if (denied) return denied;
      if (request.method === 'GET' && url.pathname === '/api/admin/email/microsoft') return json(await status());
      if (request.method !== 'POST' || request.headers.get('origin') !== url.origin || !request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Request not allowed.' }, 403);
      if (!configured || url.origin !== origin) return json({ error: 'Complete the Microsoft app setup for this website address first.' }, 503);
      if (url.pathname === '/api/admin/email/microsoft/connect') {
        const browser = randomBytes(32).toString('hex'), state = digest(browser), verifier = randomBytes(48).toString('base64url');
        await store.setJSON(`oauth/${state}`, pack({ verifier, expiresAt: now() + 600000 }), { onlyIfNew: true });
        const query = new URLSearchParams({ client_id: config.clientId, response_type: 'code', redirect_uri: config.redirectUri, response_mode: 'query', scope: SCOPES, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account', login_hint: SALES_MAILBOX });
        return json({ url: `${endpoint}/authorize?${query}` }, 200, { 'Set-Cookie': cookie(browser) });
      }
      return json({ error: 'Not found.' }, 404);
    } catch { return json({ error: 'Microsoft connection is unavailable. Please try again.' }, 503); }
  }
  async function sender() {
    let linked = false;
    try { linked = (await status()).connected; } catch { /* Fail closed. */ }
    return {
      kind: 'microsoft', idempotent: false, ready: Boolean(enabled && linked),
      async send(record) {
        if (!enabled || !linked) throw failure();
        const token = await accessToken(); // No message has been sent if token refresh fails.
        let response;
        try {
          response = await fetcher('https://graph.microsoft.com/v1.0/me/sendMail', {
            method: 'POST', signal: AbortSignal.timeout(8000),
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { subject: `Website ${record.enquiry.type} — ${record.reference}`, body: { contentType: 'Text', content: notificationText(record) }, toRecipients: [{ emailAddress: { address: SALES_MAILBOX } }], replyTo: [{ emailAddress: { address: record.enquiry.email } }] }, saveToSentItems: true }),
          });
        } catch { throw failure(false); }
        if (response.status !== 202) throw failure([401, 429].includes(response.status));
        // Graph acceptance does not prove inbox delivery and has no provider idempotency key.
        return `microsoft-accepted/${record.id}`;
      },
    };
  }
  return { handle, sender, status };
}
