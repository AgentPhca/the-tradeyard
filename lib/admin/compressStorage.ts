import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Node-only (sharp is a native binary) — never import this from anything
// that could end up in an Edge or client bundle. See
// app/api/admin/compress/route.ts, the only intended caller.

export const LONGEST_EDGE = 1200;
export const QUALITY = 75;
export const SKIP_BELOW_BYTES = 150 * 1024; // ~150 KB
const LIST_PAGE_SIZE = 1000;

export type ImageFormat = "jpeg" | "png" | "webp";

export interface StorageImageFile {
  bucket: string;
  path: string;
  name: string;
  size: number;
  format: ImageFormat;
}

function detectFormat(mimetype: string | null | undefined, name: string): ImageFormat | null {
  const lower = name.toLowerCase();
  if (mimetype === "image/jpeg" || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpeg";
  if (mimetype === "image/png" || lower.endsWith(".png")) return "png";
  if (mimetype === "image/webp" || lower.endsWith(".webp")) return "webp";
  return null;
}

// Recursively walks one bucket's folder tree. Supabase Storage's list()
// only returns one level at a time (folders come back as entries with
// id: null, no metadata) and paginates via limit/offset, so both have to
// be handled explicitly to be sure nothing is missed.
async function listBucketFiles(
  supabase: SupabaseClient<Database>,
  bucket: string,
  prefix = ""
): Promise<StorageImageFile[]> {
  const results: StorageImageFile[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`list(${bucket}/${prefix}) failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = item.id === null;
      if (isFolder) {
        const nested = await listBucketFiles(supabase, bucket, fullPath);
        results.push(...nested);
      } else {
        const format = detectFormat(item.metadata?.mimetype, item.name);
        // Non-image objects (there shouldn't be any in these buckets, but
        // never say never) are left out of the list entirely rather than
        // surfaced as a per-item "skipped" — they're not part of what this
        // tool's progress bar is counting.
        if (format) {
          results.push({
            bucket,
            path: fullPath,
            name: item.name,
            size: item.metadata?.size ?? 0,
            format,
          });
        }
      }
    }

    if (data.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return results;
}

// Every image object across every bucket, sorted deterministically
// (bucket name, then path). Nothing is held in memory between requests —
// each batch call re-runs this from scratch and slices out [offset,
// offset+batchSize) — so the ordering has to be stable across calls for
// that slicing to mean anything.
export async function listAllImageFiles(
  supabase: SupabaseClient<Database>
): Promise<StorageImageFile[]> {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`listBuckets failed: ${error.message}`);

  let all: StorageImageFile[] = [];
  for (const bucket of [...buckets].sort((a, b) => a.name.localeCompare(b.name))) {
    const files = await listBucketFiles(supabase, bucket.name);
    all = all.concat(files.sort((a, b) => a.path.localeCompare(b.path)));
  }
  return all;
}

export async function compressBuffer(buffer: Buffer, format: ImageFormat): Promise<Buffer> {
  let pipeline = sharp(buffer)
    .rotate() // apply EXIF orientation, then strip it
    .resize(LONGEST_EDGE, LONGEST_EDGE, { fit: "inside", withoutEnlargement: true });

  if (format === "jpeg") {
    pipeline = pipeline.jpeg({ quality: QUALITY, mozjpeg: true });
  } else if (format === "png") {
    pipeline = pipeline.png({ palette: true, compressionLevel: 9 });
  } else {
    pipeline = pipeline.webp({ quality: QUALITY });
  }

  return pipeline.toBuffer();
}
