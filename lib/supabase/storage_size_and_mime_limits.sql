-- ============================================================================
-- The Tradeyard — server-side backstop for image uploads
--
-- Sets file_size_limit and allowed_mime_types on the two image buckets
-- (card-photos, avatars), so an upload that skipped/bypassed the client-side
-- compression in lib/compressImage.ts (a modified client, a direct API call,
-- a future upload path someone forgets to wire up) gets rejected by
-- Supabase Storage itself instead of silently landing in Storage
-- uncompressed.
--
-- 1 MB is deliberately generous headroom above the ~0.3MB compression
-- target in lib/compressImage.ts / scripts/compress-existing.mjs — this is
-- a backstop against unbounded uploads, not the primary size control.
--
-- NOT executed automatically — review and run manually (Supabase SQL editor,
-- or the equivalent Dashboard bucket settings: Storage -> bucket -> Edit
-- bucket -> "File size limit" / "Allowed MIME types").
--
-- Safe to run more than once.
-- ============================================================================

update storage.buckets
set
  file_size_limit = 1048576, -- 1 MiB, in bytes
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('card-photos', 'avatars');
