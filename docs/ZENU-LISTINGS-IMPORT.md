# Zenu listing import — 24 November 2026

The signed-in Zenu listing searches were checked across **Any Team Member**, **Any Category**, current/on-market, under-offer, under-contract, pre-sold, lease-pending, sold/settled and leased statuses. Pre-listing, withdrawn and private CRM contacts are outside the website import.

The staged collection contains **99 unique Zenu listing IDs: 29 current/pending, 39 sold and 31 leased**. Sale and rental campaigns at the same street address keep their separate listing IDs. Archives are available through Sold and Leased; the default collection and homepage show current/pending listings only.

`staged/zenu-listings.json` is the validated, publication-ready listing collection. It contains public marketing descriptions, room/area facts, agent assignments, gallery paths, statuses and 53 source-provided REA links. REA application-form URLs are not treated as listing links. Numeric REA short links and canonical property links are supported, restricted to HTTPS on realestate.com.au.

The import uses Zenu's quoted rental figures where the old website showed a conflicting sale amount. Hidden search prices and private sold prices are not published. Missing room/area facts remain unspecified rather than invented. The source capture and detailed review notes are retained outside the repository in `../output/zenu-import-2026-11-24/`.

1,420 unique property images are stored under `public/assets/zenu-import/`, with separate card and thumbnail sizes. The source bytes are retained under `../output/zenu-import-2026-11-24/original-images/`. No photos were generated or retouched. Logos and agent portraits from the source pages are excluded from property galleries.

The local `.ere-data/content.json` preview combines these listings with the live site's existing three blog posts, seven team profiles and 51 testimonials. Before-import content snapshots are retained in the output directory.

## Release requirement

Pushing source code alone does not replace listings already saved in production Netlify Blobs. After deployment, an authenticated office admin can use **Publish 99 Zenu listings** in the listing admin screen. This action validates all 99 records, checks the current live listing collection against `staged/zenu-live-listings-baseline.json`, and refuses to replace it if any listing changed. The existing content backup wrapper snapshots the old state before the revision-checked write. Blogs, team profiles, testimonials, enquiries and contacts remain untouched. The button disappears after successful publication.

## Rebuild local preview

Run `node scripts/import-zenu-listings.mjs` using the retained browser capture directory; add `--download` only if photo files need downloading. Then run `node scripts/prepare-property-thumbnails.mjs`. These scripts never write to the live website or Zenu CRM.
