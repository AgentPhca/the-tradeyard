"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Next.js App Router doesn't reliably reset the scroll position on every
// client-side <Link> navigation — noticeable navigating from a taller
// page to a shorter one, or under iOS Safari's momentum/rubber-band
// scrolling. The new page can render still scrolled to the previous
// page's position, leaving its top content hidden behind the sticky
// Navbar until the user manually scrolls once (the sticky header then
// recalculates and everything "snaps" into place). usePathname() only
// changes on a real route change, not on a query-string-only update
// (e.g. Marketplace filters), so filter changes correctly don't jump
// scroll to top.
export function ScrollToTopOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
