# Website newsletter connection

Brevo sends marketing campaigns and reports delivery, opens and clicks. Microsoft 365 continues to send website enquiry notifications to sales@. The website stores all non-careers enquiries as contacts, and only an explicit newsletter confirmation queues a subscriber for Brevo.

## Brevo account

- The dedicated website subscriber list is `ERE website newsletter subscribers`, list ID `4`. Keep the internal test lists separate.
- Create a Brevo API key specifically for this website. Store it only as the Netlify production environment variable `BREVO_API_KEY`. Never commit or paste it into the site.
- Set `BREVO_LIST_ID=4` in Netlify production. The server syncs pending contacts every two minutes. Preview deploys and the local site never call Brevo.
- In Brevo, add a **marketing** webhook for unsubscribe, spam and hard bounce events. Set its URL to `https://exceptionalrealestate.com.au/api/newsletter/brevo-webhook` once that domain serves the Netlify site. Use Brevo's bearer authentication with a strong client-owned token, and store the same token as `BREVO_WEBHOOK_SECRET` in Netlify production. The Netlify demo URL can be used until the main domain is verified.
- The Brevo campaign recipient list for ongoing newsletters should include the website list plus any reviewed legacy subscribers. Do not send to the two-person internal test list by accident.

## Behaviour

- Existing enquiry notifications and the enquiry confirmation popup stay as they are.
- Form newsletter choices start checked, but no subscription is created until the visitor presses **Confirm newsletter subscription** after submitting. Careers applications never enter marketing contacts.
- Website contacts with no confirmed permission remain in the private admin list only.
- Confirmed subscribers are queued for Brevo. A Brevo blocklist or previous list unsubscribe prevents reactivation by this sync.
- Local unsubscribe or admin status changes remove contacts from the website Brevo list. Authenticated Brevo webhook opt-outs suppress them in local admin. Brevo's own unsubscribe protection continues to apply to Brevo campaigns.
- The admin Contacts page shows whether the Brevo integration is configured and how many updates are awaiting sync. No API key is exposed to the browser.

## Before a full campaign

1. Export the Zenu contacts and suppression/unsubscribe records while access remains. Review the permission evidence. Do not treat a bare contact export as marketing consent.
2. Import reviewed subscribers into Brevo, preserving unsubscribed and bounced addresses. Check the eligible count before a full send.
3. Test one new website enquiry using a controlled address: submit, confirm the newsletter, check the contact appears in Brevo list 4, then unsubscribe and confirm it is suppressed in admin.
4. Create a Brevo automation triggered by addition to list 4 if new subscribers should receive the latest newsletter immediately. Review the edition and send limit before activating it. Brevo's free plan limits active automations to 2,000 unique contacts.
5. Keep campaigns as drafts until their audience, links and unsubscribe footer are reviewed. Update the property and appraisal URLs to the main domain only after its deep links are verified live.
