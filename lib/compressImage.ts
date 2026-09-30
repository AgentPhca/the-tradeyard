import imageCompression from "browser-image-compression";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const MAX_DIMENSION = 900;
const TARGET_SIZE_MB = 0.3;

export class UnsupportedImageTypeError extends Error {
  constructor(type: string) {
    super(`Nicht unterstützter Dateityp: ${type || "unbekannt"}. Erlaubt sind JPEG, PNG und WebP.`);
    this.name = "UnsupportedImageTypeError";
  }
}

export class ImageCompressionError extends Error {
  constructor(cause: unknown) {
    super("Das Bild konnte nicht komprimiert werden. Bitte versuche es erneut oder wähle ein anderes Foto.");
    this.name = "ImageCompressionError";
    this.cause = cause;
  }
}

// Every upload path must call this before supabase.storage...upload() — see
// CardForm.tsx / ProfileForm.tsx. Resizes to a 900px longest edge and
// targets ~0.3MB, matching scripts/compress-existing.mjs's one-time bulk
// pass so new uploads land at roughly the same size as the backfilled ones.
// EXIF orientation is read from the file automatically (library default)
// before the image is redrawn onto a canvas, so a photo taken sideways
// still displays upright.
export async function compressImage(file: File): Promise<File> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new UnsupportedImageTypeError(file.type);
  }

  try {
    return await imageCompression(file, {
      maxWidthOrHeight: MAX_DIMENSION,
      maxSizeMB: TARGET_SIZE_MB,
      useWebWorker: true,
    });
  } catch (cause) {
    throw new ImageCompressionError(cause);
  }
}
