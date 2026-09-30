import { NextResponse, type NextRequest } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin/requireAdmin";
import { createServiceClient } from "@/lib/supabase/service";
import { compressBuffer, listAllImageFiles, SKIP_BELOW_BYTES } from "@/lib/admin/compressStorage";

// sharp is a native binary — must run on the Node runtime, not Edge.
export const runtime = "nodejs";
// Small batches (~10 images/call, enforced below) so one call comfortably
// clears the Hobby-plan default (60s max with `maxDuration` set — 10s
// without it) as well as Pro's. The admin page calls this in a loop until
// `done`, so the batch size just trades "how many round trips" for "how
// much risk of a single call timing out" — 10 is the requested default.
export const maxDuration = 60;

const MAX_BATCH_SIZE = 50;
const DEFAULT_BATCH_SIZE = 10;

interface BatchItemResult {
  bucket: string;
  path: string;
  status: "uploaded" | "would_upload" | "skipped_small" | "skipped_not_smaller" | "failed";
  before?: number;
  after?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  // Real HTTP 403s for non-admin requests are already enforced in
  // middleware.ts before this ever runs — this is a second, independent
  // check kept here on purpose: this route holds the service-role key and
  // can overwrite any user's storage objects, so it must never rely on
  // the edge gate alone.
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const offset = typeof body.offset === "number" && body.offset >= 0 ? Math.floor(body.offset) : 0;
  const batchSize =
    typeof body.batchSize === "number" && body.batchSize > 0
      ? Math.min(Math.floor(body.batchSize), MAX_BATCH_SIZE)
      : DEFAULT_BATCH_SIZE;
  const dryRun = body.dryRun === true;

  const service = createServiceClient();

  let allFiles;
  try {
    allFiles = await listAllImageFiles(service);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Listing failed" },
      { status: 500 }
    );
  }

  const total = allFiles.length;
  const batch = allFiles.slice(offset, offset + batchSize);

  const items: BatchItemResult[] = [];
  let processed = 0;
  let skippedSmall = 0;
  let skippedNotSmaller = 0;
  let failed = 0;
  let bytesSaved = 0;

  for (const file of batch) {
    try {
      if (file.size > 0 && file.size < SKIP_BELOW_BYTES) {
        skippedSmall++;
        items.push({ bucket: file.bucket, path: file.path, status: "skipped_small" });
        continue;
      }

      const { data: blob, error: downloadError } = await service.storage
        .from(file.bucket)
        .download(file.path);
      if (downloadError) throw downloadError;
      const originalBuffer = Buffer.from(await blob.arrayBuffer());

      const compressedBuffer = await compressBuffer(originalBuffer, file.format);

      if (compressedBuffer.length >= originalBuffer.length) {
        skippedNotSmaller++;
        items.push({
          bucket: file.bucket,
          path: file.path,
          status: "skipped_not_smaller",
          before: originalBuffer.length,
          after: compressedBuffer.length,
        });
        continue;
      }

      bytesSaved += originalBuffer.length - compressedBuffer.length;
      processed++;

      if (!dryRun) {
        const { error: uploadError } = await service.storage
          .from(file.bucket)
          .upload(file.path, compressedBuffer, {
            upsert: true,
            contentType: `image/${file.format}`,
          });
        if (uploadError) throw uploadError;
      }

      items.push({
        bucket: file.bucket,
        path: file.path,
        status: dryRun ? "would_upload" : "uploaded",
        before: originalBuffer.length,
        after: compressedBuffer.length,
      });
    } catch (err) {
      failed++;
      items.push({
        bucket: file.bucket,
        path: file.path,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const nextOffset = offset + batch.length;

  return NextResponse.json({
    offset,
    nextOffset,
    total,
    done: nextOffset >= total,
    dryRun,
    batch: { processed, skippedSmall, skippedNotSmaller, failed, bytesSaved },
    items,
  });
}
