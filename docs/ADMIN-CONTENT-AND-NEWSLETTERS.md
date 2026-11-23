# Expanded admin preview

Local implementation only. Nothing pushed or deployed, and no real email sent during testing.

## Included

- Editable team profiles backed by shared website content. Existing persisted listings/blogs are preserved; older content gains the original team seed. A profile linked to listings cannot be deleted until those listings are reassigned.
- Authenticated media library for images, PDFs and WOFF2 fonts. Images are decoded, resized and stored as WebP. Uploaded assets are public URLs: do not upload private documents. Maximum upload size is 3 MB; PDF links download the document.
- Blog/newsletter rich editing: fonts, sizes, headings, colours, emphasis, alignment, lists, links, tables, images and Word/HTML/text imports. This is not full Microsoft Word layout parity. Imported layouts may need adjustment, and email clients may replace custom fonts.
- Private contacts with search, notes, tags, recorded newsletter permission, CSV import preview and CSV export. Imports skip existing email addresses. Up to 1,000 contacts per import and 5,000 records per collection initially. CSV exports neutralise spreadsheet formulas.
- Saved newsletter drafts, email previews, individually addressed campaigns, campaign status and unsubscribe links. Provider acceptance is not inbox delivery.

## Website enquiries and newsletter signup

Appraisal, property/inspection and agent contact forms save an enquiry privately and capture one contact per normalised email address. Enquiry details do not overwrite existing staff notes or names. Email/telephone links and the careers email-draft flow are not tracked form submissions.

The newsletter option is selected by default. Visitors confirm with a separate button in the enquiry receipt popup; closing the popup without confirming saves their enquiry/contact without a new subscription. Confirmed subscribers receive the selected approved edition once and qualify for future campaigns. Unsubscribed or suppressed addresses are not silently rejoined by another enquiry.

In Newsletters, save a draft and select **Use for new subscribers** to approve a snapshot for automatic signup emails. Editing a draft does not silently change that approved snapshot: select it again after approval. No selected edition means no immediate newsletter, while confirmed contacts remain eligible for future campaigns.

## Production setup still required

Netlify Functions requires NODE_OPTIONS=--experimental-require-module in its environment, including Functions scope, for sanitize-html 2.18.2 and its ESM parser dependency. AWS Lambda disables this Node compatibility feature by default. Keep the patched sanitizer version; do not downgrade to older vulnerable releases. A redeploy is required after configuring the variable.

Enquiry notifications use the pending Microsoft 365 connection described in MICROSOFT-EMAIL-SETUP.md. Newsletter campaigns use a separate client-owned Resend connection, not the sales mailbox password. Configure server-only production settings from .env.example:

- RESEND_API_KEY and NEWSLETTER_FROM on a verified sender domain.
- NEWSLETTER_POSTAL_ADDRESS and HTTPS NEWSLETTER_SITE_URL for the final website.
- A random NEWSLETTER_UNSUBSCRIBE_SECRET of at least 32 characters.
- NEWSLETTER_WEBHOOK_SECRET from the signed Resend webhook pointing to /api/newsletter/webhook; subscribe to email.bounced and email.complained.
- NEWSLETTER_EMAIL_ENABLED=true only when setup and an authorised delivery test are ready.

Keep existing domain mail records when verifying DNS. No credentials belong in source control or frontend variables. Local/deploy previews use isolated stores and never call real sending providers.

The scheduled dispatcher runs every two minutes and processes up to 20 recipients per campaign per run. Failed/ambiguous sends have bounded retries and can require review. Choose the automatic edition after sender setup before inviting real signups; old waiting jobs may require reconciliation after the retry window. Review actual hosting/provider allowances, data retention and backups before launch. Storage adapters allow a later database migration; a migration still needs data export/import and verification.

## Verification

66 automated tests, TypeScript checks and production build pass. ChatGPT in-app browser checks covered media upload, rich newsletter save, team-profile save, contact save/CSV export, simulated campaign, enquiry capture and confirmation on desktop/mobile. No production delivery verified. Open/click analytics are not yet implemented; the email provider supports events for a later admin report.
