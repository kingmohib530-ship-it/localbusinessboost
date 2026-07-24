-- Security hardening: the verification-docs bucket had no file_size_limit
-- or allowed_mime_types set, so Supabase Storage would accept any file
-- type at any size for this private bucket — the client's accept=
-- attribute on the upload <input> is a UI hint only and trivially
-- bypassed (scripted upload, renamed extension, drag-and-drop). This
-- enforces the same restriction server-side, where it can't be bypassed.
update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
where id = 'verification-docs';
