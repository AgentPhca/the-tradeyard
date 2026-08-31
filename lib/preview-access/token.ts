// Signed, self-contained token for the pre-launch password gate
// (middleware.ts + app/preview-access/). Deliberately built on Web Crypto
// (crypto.subtle) rather than Node's `crypto` module: middleware.ts runs
// on Vercel's Edge runtime, which has Web Crypto but not Node-only APIs
// like Buffer or crypto.createHmac/timingSafeEqual — the verify route
// handler runs on the Node runtime, so using Web Crypto everywhere keeps
// both sides byte-for-byte compatible instead of maintaining two
// implementations.
//
// The token is `${expiresAtEpochSeconds}.${hmacHex}`, HMAC-SHA256 signed
// with PREVIEW_PASSWORD as the key. It carries its own expiry, so the
// cookie's Max-Age is just a hint — even a tampered/extended cookie fails
// verification once the embedded expiry (or the signature) doesn't check
// out, and nothing here ever stores or compares the plaintext password.

export const PREVIEW_ACCESS_COOKIE = "preview_access";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bufferToHex(signature);
}

// Constant-time string comparison — crypto.subtle has no direct equivalent
// to Node's timingSafeEqual, so this does the same length-independent
// XOR-accumulate by hand. Exported for the /preview-access/verify route
// handler to use on the raw password comparison too, not just the token
// signature below.
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createPreviewAccessToken(secret: string): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + THIRTY_DAYS_SECONDS;
  const signature = await hmacHex(secret, String(expiresAt));
  return `${expiresAt}.${signature}`;
}

// Returns false (never throws) for a missing/empty secret, a missing
// cookie, a malformed token, an expired token, or a bad signature — every
// failure mode collapses to "no access", which is the fail-closed default
// this gate needs.
export async function isValidPreviewAccessToken(
  token: string | undefined,
  secret: string | undefined
): Promise<boolean> {
  if (!secret || !token) return false;

  const separatorIndex = token.indexOf(".");
  if (separatorIndex === -1) return false;

  const expiresAtRaw = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expiresAt = Number(expiresAtRaw);

  if (!Number.isFinite(expiresAt) || !signature) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expectedSignature = await hmacHex(secret, expiresAtRaw);
  return timingSafeEqual(expectedSignature, signature);
}
