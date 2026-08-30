# Template image audit

This inventory covers every rendered `<img>`/photo source in the eight public template components. Shared team sections use the existing team-member photo flow; listing cards and detail galleries use the existing listing-photo flow. Local placeholder functions remain only as fallbacks when neither an uploaded site image nor an eligible listing image exists.

## warm-editorial

- Home hero background — `media.heroImage` (`single`, 1920x1080); falls back to the prior content/listing/local hero placeholder chain.
- Contact editorial image — `media.contactImage` (`single`, 1600x900); falls back to the prior secondary listing/local hero image.
- Featured listing cards — existing listing-photo flow (`listing.media`).
- Property category tiles — existing listing-photo flow, using representative listings.
- Listing detail main image and gallery — existing listing-photo flow.
- Shared team section portraits — existing team-member photo flow (`team_members.photo_url`).

## bold-luxury

- Home hero background — `media.heroImage` (`single`, 1920x1080); falls back to the prior content/listing/local hero placeholder chain.
- Architectural showcase large image and thumbnails — `media.showcaseImages` (`gallery`, 1600x1000, maximum 4); array order is render order and it falls back to listing photos.
- Approach section portrait image — `media.approachImage` (`single`, 1200x1500); falls back to a listing photo.
- Listing cards — existing listing-photo flow.
- Listing detail main image and two secondary images — existing listing-photo flow.
- Shared team section portraits — existing team-member photo flow.

## clean-modern

- Home hero background — `media.heroImage` (`single`, 1920x1080); falls back to the prior content/listing/local hero placeholder chain.
- Testimonial background — `media.testimonialImage` (`single`, 1600x900); falls back to a listing/local hero image.
- Listing cards and listing sections — existing listing-photo flow.
- Listing detail main image and two secondary images — existing listing-photo flow.
- Shared team section portraits — existing team-member photo flow.

## neighborhood-friendly

- Home hero background — `media.heroImage` (`single`, 1920x1080); falls back to the prior content/listing/local hero placeholder chain.
- Agent/about portrait — `media.agentPortrait` (`single`, 1200x1500); falls back to the prior agent placeholder, then initials when no image exists.
- Listing cards — existing listing-photo flow.
- Neighborhood tiles — existing listing-photo flow, using representative listings.
- Listing detail main image and two secondary images — existing listing-photo flow.
- Shared team section portraits — existing team-member photo flow.

## investment-focused

- Investment/listing cards and featured listing imagery — existing listing-photo flow.
- Listing detail main image and two secondary images — existing listing-photo flow.
- Shared team section portraits — existing team-member photo flow.
- No independent site-level image element exists, so `imageSchema` is intentionally empty. Existing empty-state blocks remain fixed visual placeholders because they are layout decoration, not image content.

## urgent-deals

- Deal/listing cards and featured deal imagery — existing listing-photo flow.
- Listing detail main image and two secondary images — existing listing-photo flow.
- Shared team section portraits — existing team-member photo flow.
- No independent site-level image element exists, so `imageSchema` is intentionally empty. Existing empty-state blocks remain fixed visual placeholders because they are layout decoration, not image content.

## guided-match

- Home hero background — `media.heroImage` (`single`, 1920x1080); falls back to the prior content/listing/local hero placeholder chain.
- Guide/agent portrait — `media.agentPortrait` (`single`, 1200x1500); falls back to the prior agent placeholder.
- Featured and matched listing cards — existing listing-photo flow.
- Listing detail main image and two secondary images — existing listing-photo flow.
- Shared team section portraits — existing team-member photo flow.

## land-plots

- Home hero background — `media.heroImage` (`single`, 1920x1080); falls back to the first listing photo. The CSS color field shown without a photo is intentionally retained as the fixed empty-state placeholder.
- Land/listing cards — existing listing-photo flow.
- Listing detail main image — existing listing-photo flow.
- Shared team section portraits — existing team-member photo flow.
