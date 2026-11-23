# Website enquiry notifications

## Agreed scope

Email notifications and a confirmation popup, plus the separately authorised 22 November contact/newsletter additions (see ADMIN-CONTENT-AND-NEWSLETTERS.md). The full CRM, staff assignments and follow-up reminders remain deferred. All enquiry notification emails go to sales@exceptionalrealestate.com.au.

Connected forms: appraisal/service requests, property enquiries, inspection registrations and agent profile contact forms. The requested agent and relevant property are included as context; no automatic agent copies. Careers continues to prepare a clearly labelled email draft with manual CV attachment. Direct email and telephone links remain direct links, not tracked form submissions.

## Visitor experience

- Disable repeat clicks while submitting, validate details, retain entered values on failure.
- Confirm only after private durable storage acknowledges the enquiry. Show a reference number in a keyboard-accessible modal.
- Production message: "Thank you — enquiry received. Your enquiry has been received. Our team will be in touch."
- Local and deploy previews explicitly say no email was sent. They use separate private storage and never call the email provider.

## Sending account: not connected yet

The user selected Microsoft 365 on 21 November 2026. A delegated Microsoft Graph adapter and admin connection screen are implemented locally; app registration and real mailbox authorisation are still required. See MICROSOFT-EMAIL-SETUP.md. Resend remains an alternative adapter. No real emails were sent during development.

For Resend, configure Netlify server-side environment variables in the Production context only:

1. RESEND_API_KEY: client-owned sending API key, entered privately in Netlify.
2. ENQUIRY_EMAIL_FROM: address on the client's verified sending domain, for example an authorised website notification address. Do not use the visitor's address as sender.
3. ENQUIRY_EMAIL_ENABLED=true only after account/domain verification and an explicitly authorised delivery test are ready.

The sales inbox receives the notification; Reply-To is the validated visitor email. Existing MX/mail records must be preserved during DNS verification. Never place keys in frontend/VITE variables, chat or source control.

With no production sending configuration, the public endpoint returns a clear unavailable message directing visitors to email sales@. It does not falsely promise an email notification. Local/preview still supports end-to-end form demonstrations.

## Storage and reliability

- Netlify private store ere-enquiries-production, separate from the public listings/blog API. Each request has a unique timestamp/UUID identifier and immutable payload fingerprint.
- Before sending, save the complete enquiry. Delivery failure retains it for retry. Email provider acceptance is recorded as accepted, not delivered.
- Production scheduled worker retries hourly; bounded retry attempts and an 18-hour retry window stay inside Resend's 24-hour idempotency window when using that provider. Microsoft uncertain send outcomes become review instead of automatic resend. A conditional-write lease prevents concurrent workers sending the same notification. Requests exceeding that window/attempt limit become review, requiring manual reconciliation with provider history before any resend.
- Worker processes a maximum 500 records from the current/previous UTC day per run; this initial implementation is for modest agency traffic. Review queue pagination/throughput before higher volumes. Storage is not an independently managed backup; define production retention/export and backup procedures before taking real enquiries.
- Same-origin JSON submissions only, bounded bodies/fields, honeypots, durable per-IP hourly limits, fixed server-side recipient. Public responses contain no stored contact details. Private records are accessible only through admin-authenticated GET /api/admin/enquiries?day=YYYY-MM-DD (up to 100 records/date) or authorised Netlify storage management.
- The old admin enquiry section remains legacy browser-only data; newly submitted private copies are not a new CRM UI. Staff work from their sales inbox. Do not represent old browser entries as shared records.
- No migration of existing listings/blog records is required. Newsletter drafts and private contacts have separate storage. Newsletters, unsubscribe and bounce handling are documented separately. No SMS, customer enquiry acknowledgement emails or mailbox sync.

## Release checks

Run tests, TypeScript and production build. Test forms, popup, dismissal, validation failures and mobile layout only in ChatGPT's in-app browser. Confirm notification delivery and Reply-To with an explicitly authorised production test after sender configuration. Never imply that automated fake-provider tests prove actual inbox delivery. No push or deployment during local review.
