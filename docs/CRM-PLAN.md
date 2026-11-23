# Basic CRM implementation plan

Status: partially superseded. The full CRM with assignments and follow-ups remains deferred. On 22 November the user additionally authorised private contacts, CSV import/export, newsletters, and enquiry-to-contact capture. These are implemented locally for review, with no push or deployment. See ADMIN-CONTENT-AND-NEWSLETTERS.md for the current scope and ENQUIRY-NOTIFICATIONS.md for enquiry delivery.

## Goal

Extend the existing /admin interface with shared contacts, enquiries and follow-ups. Keep the current website, black/white/grey palette and Netlify deployment. Avoid a separate CRM licence. Hosting and email usage remain metered.

## First release

- Dashboard: new enquiries, follow-ups due today and overdue, with filters by assigned agent.
- Contacts: name, email, phone, buyer/seller/landlord/tenant tags, assigned agent, notes, search and archive. Suggest possible duplicates; never silently merge people solely by name or shared phone/email.
- Enquiries: contact-us/general forms, appraisal, property enquiry, inspection registration and agent contact forms. Link each enquiry to a contact, property where relevant, source, assigned agent and status (New, Contacted, In progress, Closed, Archived).
- Public confirmation: after durable save, show an accessible confirmation dialog reading "Thank you — your enquiry has been received. Our team will be in touch." Include a reference number and close control, manage focus, and retain a visible inline confirmation. Do not promise a response time. Disable duplicate submissions while pending; on failure retain entered details and show a retryable error rather than success.
- Follow-ups: link to contact/enquiry, task description, assigned agent, due date/time, completion and rescheduling. Display dates and determine daily reminders in Australia/Perth time.
- Contact history: enquiry submissions, notes, status/assignment changes and follow-up events. With a shared admin login, record the actor as office admin; individual attribution requires individual sign-in.
- Import/export: preview and validate CSV contact imports, report duplicates/errors, offer admin-only exports. Preserve marketing consent provenance if supplied; an enquiry is not newsletter consent.
- Existing enquiries saved in browsers: provide an explicit backup/import path in the browser holding them; do not imply all historical visitor submissions can be recovered centrally.

## Storage and access

- Use a dedicated private Netlify Blobs store for the small initial CRM, accessed only through server handlers; do not add CRM records to the public website-content response.
- Store individual records and paginated indexes rather than rewriting the entire CRM on each edit. Use conditional writes/version checks and recoverable index updates to prevent lost simultaneous edits.
- Put storage operations behind an adapter for later migration to Firestore or a relational database. Review storage suitability before large imports or complex reporting.
- Keep preview/local data isolated from production.
- Existing login supports an office-admin-only release. Agent assignment does not confer agent-specific access. Individual login and permission boundaries require separate implementation if selected.
- Validate and bound public submissions, rate-limit with durable state, add honeypot/spam protection and prevent arbitrary recipient selection. Keep secrets server-side and private responses uncached.

## Email and reminders

- Save the enquiry durably before reporting success, then enqueue notification work. An email failure must not lose the enquiry.
- Use an authorised ERE sender with the visitor's email as Reply-To. Every website enquiry notification goes to sales@exceptionalrealestate.com.au, including agent/property-specific enquiries; retain selected agent/property details in the notification and CRM. Additional agent notifications are optional, not enabled by default. Recipient selection is server-side and must not accept arbitrary public recipients.
- Notification includes enquiry reference, submission time, name, email, phone if provided, enquiry type, message, relevant property and selected agent, plus a link to the protected admin record. The email link must not contain client details or grant login access.
- Sending provider remains undecided: an authorised existing Microsoft/Google mailbox connection or a transactional email service. No automatic email is considered configured until the chosen connection is authorised and delivery tested.
- Send notifications directly through Resend; no automation subscription is required. Customer acknowledgements are optional and initially disabled pending scope confirmation.
- Track pending, provider-accepted, delivered/bounced where verified webhooks are available, and failed states. Do not label provider acceptance as delivery. Offer retry/reconciliation; use idempotency keys and bounded retries to minimise duplicate sends.
- Use a Netlify scheduled function for a daily per-agent summary of due/overdue tasks, rather than one email per task. Check production scheduler behaviour, claim jobs safely, and avoid sending completed tasks. Local tests and previews must not send real emails.
- Authenticate webhook events and deduplicate deliveries if provider webhooks are enabled.
- Domain verification records go to the authoritative DNS provider, which may be GoDaddy; preserve existing mail records.

## Decisions/configuration outstanding

1. Confirmed notification inbox for every website enquiry: sales@exceptionalrealestate.com.au. Selected agent is retained as enquiry context; automatic agent copies are not part of the default release.
2. Confirmed access model: office admins only, using the existing admin login. Agent assignment is for organisation and notification routing, not individual staff access.
3. Choose and authorise the sending connection (existing email provider or client-owned transactional service). For Resend, verify the sending domain. Configure secrets through the hosting dashboard, not chat or committed files.
4. Review actual Netlify plan/usage and retention/backup requirements before launch. No permanent zero-cost guarantee.

## Implementation and verification

1. Build private persistence and protected CRM endpoints with meaningful tests for access boundaries, validation, conflicts and isolation.
2. Build Contacts, Enquiries, Follow-ups and Today screens within the existing admin; retain listings/blog management.
3. Connect public forms to durable submission, truthful success/error states and approved routing; test save-before-email and failed delivery recovery using a fake email adapter.
4. Add email outbox, daily summaries and provider integration. Test duplicate requests, retries, completed-task exclusion and Perth date boundaries.
5. Add validated CSV import/export and explicit legacy-browser migration. Test malformed input and spreadsheet formula safety.
6. Run build, type checks and relevant tests. Review desktop/mobile flows only in the ChatGPT in-app browser; present screenshots and local preview. Never use the user's main browser.
7. Prepare a reviewed commit containing the approved website changes and CRM scope. Push/deploy only under the user's release instructions. Complete live submission and delivery checks after production configuration; obtain explicit authorization before sending test emails.

## Outside this release

REA listing sync/partner approval, SMS, trust accounting, rental accounting, full mailbox sync and career CV uploads. Bulk newsletters are now separately authorised and implemented locally. The careers page retains its clearly labelled email-draft flow.
