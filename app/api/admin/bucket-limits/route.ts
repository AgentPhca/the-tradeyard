import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin/requireAdmin";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const IMAGE_BUCKETS = ["card-photos", "avatars"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FILE_SIZE_LIMIT_BYTES = 1024 * 1024; // 1 MiB — replaces the manual
// SQL from lib/supabase/storage_size_and_mime_limits.sql; this route does
// the same thing via the Storage API instead.

export async function POST() {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const results: { bucket: string; ok: boolean; error?: string }[] = [];

  for (const bucket of IMAGE_BUCKETS) {
    const { error } = await service.storage.updateBucket(bucket, {
      public: true, // both buckets are already public — keep that unchanged
      fileSizeLimit: FILE_SIZE_LIMIT_BYTES,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
    results.push({ bucket, ok: !error, error: error?.message });
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 500 });
}
