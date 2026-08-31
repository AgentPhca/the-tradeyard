import type { MetadataRoute } from "next";

// Pre-launch preview: nothing should be indexed yet. Excluded from the
// preview-access gate in middleware.ts so crawlers can actually fetch this
// instead of being redirected to the gate's HTML page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
