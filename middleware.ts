import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isValidPreviewAccessToken, PREVIEW_ACCESS_COOKIE } from "@/lib/preview-access/token";

// Paths that must stay reachable without the preview-access cookie:
// - /preview-access itself (and its /verify POST target), or no one could
//   ever get in
// - /auth/callback, the Supabase email-confirmation/PKCE redirect — it can
//   land in a browser that never went through the preview gate (a
//   different device, or a fresh session after the cookie expired), and it
//   only ever redirects on to /login or /dashboard, never renders app
//   content itself, so gating it would just strand a legitimate signup
// - /robots.txt, so crawlers can actually fetch the disallow-all response
//   instead of being redirected to an HTML gate page
const PREVIEW_GATE_EXCLUDED_PATHS = ["/preview-access", "/auth/callback", "/robots.txt"];

function isExcludedFromPreviewGate(pathname: string): boolean {
  return PREVIEW_GATE_EXCLUDED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isExcludedFromPreviewGate(pathname)) {
    const hasPreviewAccess = await isValidPreviewAccessToken(
      request.cookies.get(PREVIEW_ACCESS_COOKIE)?.value,
      process.env.PREVIEW_PASSWORD
    );

    if (!hasPreviewAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/preview-access";
      url.search = "";
      if (pathname !== "/") {
        url.searchParams.set("next", `${pathname}${search}`);
      }
      return NextResponse.redirect(url);
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
