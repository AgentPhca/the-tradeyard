import { NextResponse } from "next/server";
import {
  createPreviewAccessToken,
  PREVIEW_ACCESS_COOKIE,
  timingSafeEqual,
} from "@/lib/preview-access/token";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

// Only a same-origin relative path is ever safe to redirect to here — a
// value like "https://evil.example" or "//evil.example" (protocol-relative)
// would otherwise turn this into an open redirect for anyone who can craft
// a link to this route.
function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next") as string | null);

  const previewPassword = process.env.PREVIEW_PASSWORD;

  if (!previewPassword) {
    const url = new URL("/preview-access", origin);
    url.searchParams.set("error", "not-configured");
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  }

  const isCorrect =
    password.length === previewPassword.length && timingSafeEqual(password, previewPassword);

  if (!isCorrect) {
    const url = new URL("/preview-access", origin);
    url.searchParams.set("error", "invalid");
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  }

  const token = await createPreviewAccessToken(previewPassword);
  // 303, not the default 307: this redirect follows a POST, and per HTTP
  // semantics a 307/308 tells the browser to repeat the request with the
  // SAME method at the new Location — that turned this into the browser
  // re-issuing a POST to `next` (POST / for the common case), which 405s
  // since `/` has no POST handler. 303 See Other is the one status that
  // means "the response to this POST is over here, GET it" — the standard
  // Post/Redirect/Get pattern this route needs.
  const response = NextResponse.redirect(new URL(next, origin), 303);
  response.cookies.set(PREVIEW_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  });
  return response;
}
