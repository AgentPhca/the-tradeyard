// Shared helpers over cards.image_urls (up to 5 photos) with a fallback to
// the older single-photo cards.image_url column, so every read site agrees
// on what "the cover photo" and "all photos" mean for a card regardless of
// whether it was saved before or after the multi-photo migration.

interface CardPhotos {
  image_url: string | null;
  image_urls: string[];
}

// The single photo shown in the Collection grid, Yards tiles, and Sticker
// Album — always the first element of image_urls once a card has any,
// falling back to the legacy image_url column for older rows.
export function coverPhoto(card: CardPhotos): string | null {
  return card.image_urls[0] ?? card.image_url ?? null;
}

// Every photo, in order, for the Card Detail page's gallery.
export function allPhotos(card: CardPhotos): string[] {
  if (card.image_urls.length > 0) return card.image_urls;
  return card.image_url ? [card.image_url] : [];
}
