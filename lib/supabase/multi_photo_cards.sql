-- The Tradeyard: up to 5 photos per card (front, back, close-ups — some
-- cards carry their serial number on the back only, which a single photo
-- can't document).
--
-- image_url (singular) is kept as a fallback/compat column, never dropped.
-- image_urls[1] becomes the source of truth for the "cover photo" shown in
-- the Collection grid, Yards tiles, and Sticker Album — the Card Detail
-- page is the only place that shows every photo, via a swipe/carousel
-- gallery.

alter table cards add column if not exists image_urls text[] not null default '{}';

-- Migrate existing single photos into the new array (first/only element),
-- without touching rows that already have image_urls set (idempotent on
-- re-run) or rows with no photo at all.
update cards
set image_urls = array[image_url]
where image_url is not null and image_url != '' and image_urls = '{}';

-- Verify
select count(*) as total_cards,
       count(*) filter (where image_urls != '{}') as cards_with_photos,
       count(*) filter (where array_length(image_urls, 1) > 1) as cards_with_multiple_photos
from cards;
