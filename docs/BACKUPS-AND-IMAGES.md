# Enquiries, images and content recovery

Local preview only until an approved deployment. No live records were modified during development.

## Enquiries

Accepted submissions are written to the private enquiry store before attempting notification delivery. Storage errors return a failure, never a success message. Pending or ambiguous email delivery does not remove the record. Admin → Enquiries reads the shared durable store (not browser storage), supports UTC date selection, search, 100-record pages and CSV export of the displayed page. CSV formula characters are neutralised. Newsletter confirmation tokens and delivery provider IDs are not returned by this screen.

Forms can now save enquiries even while email setup is incomplete. The admin screen prominently flags an unconnected sender; staff must check saved enquiries until Microsoft 365 is connected. Existing scheduled retries apply for up to 18 hours, after which records need review; older records remain available. Local previews never send mail.

## Independent images

`server/image-migration.json` maps 21 existing Zenu URLs found in source, local preview data and a read-only inventory of the live public content. Their original bytes were copied into `public/assets/migrated/`; no photography, watermarks or framing were regenerated. These deploy with the website and do not depend on Zenu. Content reads and restores translate known old URLs, so existing production records will work after deployment without overwriting client edits. Unknown/new Zenu URLs are flagged in Content backups and must be copied separately. Uploads already use the website's Netlify Blobs media store.

The migration script is a local maintenance tool, not an exposed remote-fetch endpoint. It accepts only image URLs on the fixed images.zenu.com.au host, refuses redirects and validates image decoding. It writes local files only. `scripts/optimise-migrated-images.mjs` creates WebP display copies up to 2400 px and retains the byte-for-byte originals; `server/image-originals.json` records their locations. Run it after copying any new images. The public site uses display copies to avoid sending large original PNGs to every visitor.

## Website content backups

Before any revision-checked write to listings, blogs, team members or testimonials, the previous content is saved to a separate private Netlify Blobs store, `ere-content-backups-production` (isolated per preview deployment). Backups are content-hash deduplicated, retained until explicitly managed, and accessed only through authenticated admin routes. If archiving fails, the edit is blocked. Admin → Content backups can create a manual copy, download JSON and review/confirm restoration. Restoration validates records, checks the current revision and saves the replaced content as a recovery copy.

This is change-based recovery, not a daily off-site service. Download JSON copies periodically into a client-owned backup location. Backups contain image links, not binary media. Uploaded media stays in its own Netlify store; original migrated files remain versioned website assets. Enquiries, contacts, campaigns, subscriber suppression and Microsoft credentials are deliberately not rolled back with website content. Export contacts separately using Contacts & CSV. Account deletion or loss of the hosting account could affect both content and its recovery store; independent downloads remain necessary.
