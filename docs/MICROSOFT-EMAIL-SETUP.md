# Microsoft 365 enquiry notification connection

Status: local implementation only; no GitHub push or deployment. No Microsoft account is connected yet and no real email has been sent.

## Account prerequisites

Use the client-owned Microsoft 365 organisation. A normal sales@exceptionalrealestate.com.au mailbox must be able to sign in directly. If sales@ is a shared mailbox or alias of someone else's mailbox, stop and assess the delegated Send As/shared-mailbox setup separately; this implementation deliberately rejects other identities.

The account checking app registration may need additional Entra privileges. A Microsoft 365 mailbox login does not establish that the account may register an application or approve its permissions. GoDaddy can provide the Microsoft sign-in federation even though the underlying mailbox uses Microsoft 365. A browser warning/bot check must be completed by the user; do not bypass it or move testing to the user's main browser.

## Register the client-owned application

1. In Microsoft Entra admin centre, choose the client's directory, then App registrations → New registration.
2. Name: Exceptional Real Estate Website Enquiries. Choose accounts in this organisational directory only (single tenant).
3. Add a **Web** redirect URI: http://localhost:3002/api/email/microsoft/callback for the unpublished local connection. At release, also register the exact production HTTPS origin plus /api/email/microsoft/callback. Do not use SPA/native or wildcard redirect URLs.
4. Record the Application (client) ID and Directory (tenant) ID. They identify the application; they are not mailbox passwords.
5. Configure Microsoft Graph delegated permissions Mail.Send and User.Read. The authorisation request also requests offline_access to refresh the connection. No Mail.Read, Mail.ReadWrite, shared mailbox or tenant-wide application permissions are required for this direct mailbox implementation. Obtain client/admin approval for the concrete permission grant before applying it.
6. Create a client secret with the client/admin and record its expiry. Enter the secret value directly in private server configuration. Do not paste it into chat, screenshots, logs, source code or frontend fields. Production deployments must plan credential renewal before expiry.

## Server configuration

Configure these privately, without VITE_ prefixes:

- ENQUIRY_EMAIL_PROVIDER=microsoft
- ENQUIRY_EMAIL_ENABLED=false during setup. Production sending can be enabled separately after authorisation and an authorised delivery test.
- MICROSOFT_TENANT_ID: Directory ID (UUID)
- MICROSOFT_CLIENT_ID: Application ID (UUID)
- MICROSOFT_CLIENT_SECRET: client secret value, not its ID
- MICROSOFT_REDIRECT_URI: exact registered callback for this environment
- EMAIL_TOKEN_ENCRYPTION_KEY: a unique base64-encoded 32-byte key, stored as a server secret. Keep a controlled backup; losing/changing it requires reconnecting the mailbox.

Local: use the git-ignored .env file and restart the local server. Never overwrite other credentials when adding these entries. Production: use Netlify Production-context environment settings and the production callback when approved for release. Preview and local servers never send real enquiry emails, even with an authorised mailbox. Connect again on production after deployment; do not copy local OAuth tokens into production.

## Authorise the sales mailbox

Sign into the website /admin. Open Email notifications → Connect Microsoft 365. Sign into sales@, review the permissions and have the user/client approve them. The connection checks the returned Microsoft profile against the sales address and stores encrypted server-side credentials. A successful local connection is preparation, not a live website change.

Admin callback messages distinguish connected, cancelled, wrong account and failed states. The UI never returns access tokens, refresh tokens or client secrets. Refresh status checks storage only; it is not a live delivery test or a guarantee that Microsoft has not since revoked consent.

## Delivery behaviour and release verification

Each public enquiry saves privately before an attempted send. Email is sent through Microsoft Graph /me/sendMail to sales@, with the visitor's address as Reply-To and the notification saved in Sent Items. HTTP 202 is provider acceptance, not proof of inbox delivery.

Microsoft sendMail does not provide Resend-style idempotency. Network timeouts, uncertain outcomes and post-send status-write failures are put into review instead of being blindly retried. Explicit throttling/auth rejection before acceptance and token acquisition failures may be retried; other errors require reconciliation. Changing providers also stops automatic resend of records already attempted with a different provider. Enquiry content remains saved regardless.

Before release: run build, type checks and all tests, inspect the admin screen in ChatGPT's in-app browser, complete real mailbox authorisation, then request approval for one clearly labelled test enquiry delivered to sales@. Check inbox receipt, Sent Items, Reply-To, private stored record and confirmation popup. No test email has been sent as part of local automated verification. No push/deploy until requested.

References:
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app
- https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0
