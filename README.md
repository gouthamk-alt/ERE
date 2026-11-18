# Exceptional Real Estate

## Run locally

1. Install Node.js 22.12+ and run `npm install`.
2. Copy `.env.example` to `.env`, set `ADMIN_USERNAME`, and choose a unique `ADMIN_PASSWORD` of at least 16 characters. These are server-only secrets; never commit them or prefix them with `VITE_`.
3. Run `npm run dev` and visit `http://localhost:3000`.
4. Open `/admin` directly to sign in. There are no admin links in the public menus.

## Netlify demo deployment

The included `netlify.toml` builds `dist`, deploys the authentication functions and serves `/admin` through the app. Deploy the repository through Netlify's Git integration (or the Netlify CLI); uploading only the `dist` folder does not include the login functions.

In Netlify's environment variables, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` (at least 16 characters), available to Functions for the intended deploy context, then redeploy. Never prefix them with `VITE_`. Use different credentials for production and branch previews. No credentials are committed or preconfigured.

Netlify sessions use opaque random tokens in secure cookies and shared Netlify Blobs storage with strong consistency. They survive function cold starts and expire after eight hours. Sign-out deletes the session immediately. Changing the configured credentials and redeploying invalidates prior sessions. Netlify limits the login endpoint to five requests per IP/domain per 180 seconds; an additional instance-local throttle limits failed attempts to five in 15 minutes. Netlify's platform rate limiting can take several seconds to enforce. Verify Functions deployment and the rate-limit rule in Netlify's deploy log before exposing the demo.

References: [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/) and [function rate limits](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/).

## Optional standalone Node hosting

Run `npm run build`, then `npm start` on a Node-capable host. Set the admin secrets in the host's environment, or an ignored `.env.production` file. Serve over HTTPS: production session cookies require it. Set `TRUST_PROXY=1` only when using exactly one trusted reverse proxy. Keep the Node server private behind that proxy.

Static-only hosting and `npm run preview` do not run authentication. For standalone Node hosting, route the website and `/api/admin/*` through this server. Admin passwords have no default and are never sent to the browser bundle. Missing credentials, or a password shorter than 16 characters, disable sign-in. Failed sign-ins are limited to five per IP in 15 minutes. Sessions expire after eight hours, clear on sign-out and server restart, and use HttpOnly / SameSite=Strict cookies (also Secure in production). Session validation runs on entry, window focus and every 30 seconds. Admin responses request no caching and no indexing.

The standalone Node server stores sessions and rate limits in memory for one server instance. Multiple replicas need shared storage; the Netlify adapter already provides shared session storage. Restart the Node server after rotating credentials to revoke existing sessions.

## Current content limitation

The inherited application stores listings, articles and enquiries in browser localStorage, including its bundled sample enquiries. Dashboard edits affect only that browser; website forms do not deliver enquiries to the agency. Login protects dashboard access, but browser storage is not a secure shared CMS. Before collecting real client enquiries or publishing content edits across visitors, move content and enquiries to a database, remove sample/private enquiries from the client bundle, and protect all admin data APIs with the authentication guard in `server/auth.mjs`.

## Checks

- `npm test`: authentication, cookies, expiry, sign-out, request protection and rate-limit tests.
- `npx tsc --noEmit`: TypeScript validation.
- `npm run build`: production frontend build.
