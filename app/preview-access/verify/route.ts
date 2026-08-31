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
    return NextResponse.redirect(url);
  }

  const isCorrect =
    password.length === previewPassword.length && timingSafeEqual(password, previewPassword);

  if (!isCorrect) {
    const url = new URL("/preview-access", origin);
    url.searchParams.set("error", "invalid");
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  const token = await createPreviewAccessToken(previewPassword);
  const response = NextResponse.redirect(new URL(next, origin));
  response.cookies.set(PREVIEW_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  });
  return response;
}
