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

## Shared website content

Listings and blog posts are stored in Netlify Blobs under `ere-website-content-production`, using strongly consistent reads and conditional writes. This is a shared key/value database for this site's content; no additional database credentials are needed. Production content survives code deployments. Preview deployments use separate per-deploy stores and cannot modify the production store.

`GET /api/content` serves the published listings and posts, with no enquiries or session data. `POST /api/admin/content` requires the existing admin session and validates all changes. The revision returned by the public API must match the current stored revision, so two editing sessions cannot silently overwrite one another. Save failures are shown in the admin panel, and success messages appear only after a confirmed save. New visitors load the latest snapshot; already-open public pages refresh every 30 seconds and when brought back into focus. Content responses are not cached by the browser/CDN. A temporary storage failure shows a retry message instead of silently reverting to demo content. An empty collection remains empty.

The initial snapshot is seeded once from `server/content-seed.json`. Subsequent deploys never reset an existing store. The old reset-to-demo button has been replaced with a reload button. For standalone Node development, content persists in ignored `.ere-data/content.json`; a single-process compare-and-set adapter is used locally. Multi-instance standalone hosting should use shared storage instead.

### Preserve old browser edits

Open `/admin` in the same browser/profile used for the old edits. The migration panel compares its retained listings/blogs against the original site, lists additions/edits/deletions, offers a JSON backup download, and publishes those changes when **Publish saved browser edits** is selected. The original localStorage keys are retained. Import is atomic across both collections and refuses conflicts with newer live edits; it does not partially import or overwrite competing changes. Edits made in a different browser must be imported from that browser. Browser data that was already cleared cannot be recovered by this application.

### Enquiries remain separate

Enquiries and appraisal submissions still use the inherited browser-only demo storage and do not deliver messages to the agency. They are not migrated to the shared content store. Before collecting real client enquiries, connect a protected submission endpoint and delivery/database workflow and remove sample enquiries from the client bundle.

## Checks

- `npm test`: authentication plus shared content CRUD, validation, conflicts, migration and persistence tests.
- `npx tsc --noEmit`: TypeScript validation.
- `npm run build`: production frontend build.
