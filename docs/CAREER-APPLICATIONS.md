# Career applications and notification wording

Career applications and enquiry notification release.

Career applications submit directly to the private enquiry service and notify sales@exceptionalrealestate.com.au through the existing Microsoft 365 connection. A resume is required in both browser and server validation. PDF, Word and other formats are accepted, with a 2 MiB decoded size limit. Empty files and invalid Base64 are rejected. No applicant uploads use the public media library.

The private enquiry record retains the original file bytes; notifications include the resume attachment. The admin enquiry list shows role, experience and a protected download link, returning only filename/size metadata in list responses. Download requests require the existing admin session, use attachment disposition with a sanitised filename, disable caching and force a generic binary content type. Files are never rendered or executed by the website. Applicants are not added to marketing contacts or newsletter subscriptions.

Enquiry emails use readable Australia/Perth timestamps, such as `24 November 2026, 12:11 pm AWST (Perth)`. Appraisal subjects and displayed type use `Appraisal Request`; other subject lines omit the previous `Website` prefix. Reference numbers and the original UTC storage timestamps remain unchanged.

Local verification: required-file validation blocked an empty upload; PDF and DOCX applications both returned confirmation references and appeared in the private admin list. Browser verification of the download was interrupted; automated checks verify download authentication and byte-for-byte preservation. No real career notification has been sent yet. Confirm live delivery with a labelled application after the release is approved and deployed.

Confirmation popups show a tick and “Enquiry received” or “Application received”, then dismiss after four seconds. No Done button or preview wording is shown. Newsletter confirmation stays separate so it remains available after the success popup closes.
