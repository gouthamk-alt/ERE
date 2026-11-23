# Testimonials

Local preview only until a later release is approved.

Admin → Testimonials supports add/edit/delete, move up/down, show/hide and optional ratings. New reviews start hidden. The initial collection contains 51 reviews copied as displayed at https://www.exceptionalrealestate.com.au/pages/real-estate/about-us on 24 November 2026, after expanding all Load More entries. Published names, review text, headlines and original order are preserved. No star ratings were shown, so imported ratings are blank. The earlier preview samples have been removed from local storage. Existing saved testimonial collections are never replaced by the seed.

Visible testimonials appear in one carousel at the end of every public page, including the homepage, above the footer. Starting positions vary by section and by agent/article/listing category, wrapping when there are fewer reviews than pages. Admin ordering determines the underlying sequence. Each page cycles through up to three visible reviews in a centred layout, with dots underneath for direct navigation. Keyboard arrows when the carousel is focused and horizontal touch swipes are supported. The carousel advances every six seconds while in view, pausing on hover, keyboard focus and hidden browser tabs. There are no arrow or play/pause buttons. Reduced-motion preferences disable automatic rotation and slide animation. Empty collections render no testimonial section.

Testimonials share existing content storage and revision-protected writes. Hidden drafts are returned only by the authenticated GET /api/admin/content endpoint; GET /api/content excludes them. Older content gains an empty testimonials collection without overwriting saved listings, articles or team order.
