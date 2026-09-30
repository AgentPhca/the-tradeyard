// One-time bulk compression of every existing image already in Supabase
// Storage (card-photos + avatars buckets) — run manually, not part of the
// app build. See TICKET "Supabase-Storage komprimieren" for context.
//
// Usage:
//   DRY_RUN=1 node scripts/compress-existing.mjs   # preview only, uploads nothing
//   node scripts/compress-existing.mjs             # real run
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the
// environment (falls back to ../.env.local if present — never hardcoded,
// never committed). The service-role key is required because this bypasses
// per-user storage RLS to touch every user's files, not just one.
//
// Every original is backed up to ./backup/<bucket>/<path> before being
// overwritten, so nothing here is irreversible.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const BACKUP_ROOT = join(REPO_ROOT, "backup");

// --- minimal .env.local loader (no extra dependency) -----------------------
// Only fills in vars that aren't already set (e.g. via shell export or
// `node --env-file=.env.local`), so an explicit environment always wins.
async function loadDotEnvLocal() {
  const envPath = join(REPO_ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const content = await readFile(envPath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

await loadDotEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === "1";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Set them in the environment, or in a local .env.local (never committed)."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const LONGEST_EDGE = 900;
const JPEG_WEBP_QUALITY = 72;
const SKIP_BELOW_BYTES = 150 * 1024; // ~150 KB
const LIST_PAGE_SIZE = 1000;

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function pct(saved, original) {
  return original === 0 ? "0" : ((saved / original) * 100).toFixed(0);
}

function detectFormat(mimetype, name) {
  const lower = name.toLowerCase();
  if (mimetype === "image/jpeg" || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpeg";
  if (mimetype === "image/png" || lower.endsWith(".png")) return "png";
  if (mimetype === "image/webp" || lower.endsWith(".webp")) return "webp";
  return null;
}

function contentTypeFor(format) {
  return `image/${format}`;
}

// Recursively walks a bucket's folder tree. Supabase Storage's list() only
// returns one level at a time (folders come back as entries with id: null,
// no metadata) and paginates via limit/offset, so both have to be handled
// explicitly to be sure nothing is missed.
async function listAllFiles(bucket, prefix = "") {
  const results = [];
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
        const nested = await listAllFiles(bucket, fullPath);
        results.push(...nested);
      } else {
        results.push({
          bucket,
          path: fullPath,
          name: item.name,
          size: item.metadata?.size ?? 0,
          mimetype: item.metadata?.mimetype ?? null,
        });
      }
    }

    if (data.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return results;
}

async function backupOriginal(bucket, path, buffer) {
  const target = join(BACKUP_ROOT, bucket, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);
}

async function compressBuffer(buffer, format) {
  let pipeline = sharp(buffer)
    .rotate() // apply EXIF orientation, then strip it
    .resize(LONGEST_EDGE, LONGEST_EDGE, { fit: "inside", withoutEnlargement: true });

  if (format === "jpeg") {
    pipeline = pipeline.jpeg({ quality: JPEG_WEBP_QUALITY, mozjpeg: true });
  } else if (format === "png") {
    pipeline = pipeline.png({ palette: true, compressionLevel: 9 });
  } else if (format === "webp") {
    pipeline = pipeline.webp({ quality: JPEG_WEBP_QUALITY });
  }

  return pipeline.toBuffer();
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN — no uploads will happen ===\n" : "=== LIVE RUN ===\n");

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error(`Failed to list buckets: ${bucketsError.message}`);
    process.exit(1);
  }

  console.log(`Found ${buckets.length} bucket(s): ${buckets.map((b) => b.name).join(", ")}\n`);

  let allFiles = [];
  for (const bucket of buckets) {
    console.log(`Scanning bucket "${bucket.name}"...`);
    const files = await listAllFiles(bucket.name);
    console.log(`  found ${files.length} object(s)`);
    allFiles = allFiles.concat(files);
  }
  console.log(`\nTotal objects across all buckets: ${allFiles.length}\n`);

  const summary = {
    processed: 0,
    skippedSmall: 0,
    skippedNotSmaller: 0,
    skippedUnsupported: 0,
    failed: 0,
    bytesSaved: 0,
  };

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    const progress = `[${i + 1}/${allFiles.length}]`;
    const label = `${file.bucket}/${file.path}`;

    try {
      const format = detectFormat(file.mimetype, file.name);
      if (!format) {
        console.log(`${progress} SKIP unsupported type — ${label}`);
        summary.skippedUnsupported++;
        continue;
      }

      if (file.size > 0 && file.size < SKIP_BELOW_BYTES) {
        console.log(`${progress} SKIP already small (${formatBytes(file.size)}) — ${label}`);
        summary.skippedSmall++;
        continue;
      }

      const { data: blob, error: downloadError } = await supabase.storage
        .from(file.bucket)
        .download(file.path);
      if (downloadError) throw downloadError;

      const originalBuffer = Buffer.from(await blob.arrayBuffer());

      // Back up whatever is currently in storage before it's ever touched —
      // this runs even in DRY_RUN, since nothing gets uploaded either way
      // and it means the real run afterwards has nothing left to do here.
      await backupOriginal(file.bucket, file.path, originalBuffer);

      const compressedBuffer = await compressBuffer(originalBuffer, format);

      if (compressedBuffer.length >= originalBuffer.length) {
        console.log(
          `${progress} SKIP not smaller (${formatBytes(originalBuffer.length)} -> ${formatBytes(compressedBuffer.length)}) — ${label}`
        );
        summary.skippedNotSmaller++;
        continue;
      }

      const saved = originalBuffer.length - compressedBuffer.length;
      summary.bytesSaved += saved;
      summary.processed++;

      if (DRY_RUN) {
        console.log(
          `${progress} WOULD UPLOAD ${label}: ${formatBytes(originalBuffer.length)} -> ${formatBytes(compressedBuffer.length)} (-${pct(saved, originalBuffer.length)}%)`
        );
      } else {
        const { error: uploadError } = await supabase.storage
          .from(file.bucket)
          .upload(file.path, compressedBuffer, {
            upsert: true,
            contentType: contentTypeFor(format),
          });
        if (uploadError) throw uploadError;
        console.log(
          `${progress} OK ${label}: ${formatBytes(originalBuffer.length)} -> ${formatBytes(compressedBuffer.length)} (-${pct(saved, originalBuffer.length)}%)`
        );
      }
    } catch (err) {
      summary.failed++;
      console.error(`${progress} FAILED ${label}: ${err?.message ?? err}`);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Processed (compressed${DRY_RUN ? ", would upload" : " & uploaded"}): ${summary.processed}`);
  console.log(`Skipped (already small): ${summary.skippedSmall}`);
  console.log(`Skipped (compression not smaller): ${summary.skippedNotSmaller}`);
  console.log(`Skipped (unsupported type): ${summary.skippedUnsupported}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Estimated space saved: ${(summary.bytesSaved / 1024 / 1024 / 1024).toFixed(3)} GB`);
  if (DRY_RUN) {
    console.log("\nDRY RUN — nothing was uploaded. Re-run with DRY_RUN unset (or =0) to apply.");
  }
}

main();
