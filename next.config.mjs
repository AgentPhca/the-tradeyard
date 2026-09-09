/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
    // Card photos essentially never change after upload, so there's no
    // reason for Vercel to re-transform the same (image, width) pair
    // every 60s (the Next.js default) — a 1-year TTL turns every repeat
    // view of an already-optimized image into a cache hit instead of a
    // fresh (billable) transformation.
    minimumCacheTTL: 31536000, // 1 year
    // Narrowed from the Next.js defaults (8 deviceSizes + 8 imageSizes =
    // up to 16 possible widths per image) to the widths this app actually
    // renders at — see the `sizes=` props across components/cards and
    // components/collection for the real numbers these were chosen from
    // (tile grids ~96-591px, avatars/thumbnails 16-128px). Fewer possible
    // widths means fewer distinct transformations Vercel can ever be
    // asked to generate for a given image.
    deviceSizes: [384, 640, 828, 1200],
    imageSizes: [64, 96, 128, 256],
  },
};

export default nextConfig;
