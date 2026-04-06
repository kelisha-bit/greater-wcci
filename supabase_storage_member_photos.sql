-- ============================================================================
-- CHURCHAPP STORAGE BUCKET: member-photos
-- Run this in the Supabase SQL Editor to set up the profile photo storage.
-- ============================================================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-photos',
  'member-photos',
  true, -- public: anyone can view images with the public URL
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Clear existing policies to avoid conflicts
DROP POLICY IF EXISTS "member_photos_public_select" ON storage.objects;
DROP POLICY IF EXISTS "member_photos_staff_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "member_photos_staff_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "member_photos_staff_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "member_photos_individual_insert" ON storage.objects;
DROP POLICY IF EXISTS "member_photos_individual_update" ON storage.objects;
DROP POLICY IF EXISTS "member_photos_individual_delete" ON storage.objects;

-- 3. Create NEW policies for the bucket

-- Allow ANYONE to view photos (since the bucket is public)
CREATE POLICY "member_photos_public_select"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'member-photos');

-- Allow STAFF and ADMINS to perform all operations
CREATE POLICY "member_photos_staff_admin_all"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff')
    )
  )
)
WITH CHECK (
  bucket_id = 'member-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff')
    )
  )
);

-- Allow INDIVIDUAL MEMBERS to manage their own profile photos
-- Path structure: {member_id}/profile.{ext}
CREATE POLICY "member_photos_individual_manage"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id::text = (storage.foldername(name))[1]
      AND m.email = (auth.jwt() ->> 'email')
    )
  )
)
WITH CHECK (
  bucket_id = 'member-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id::text = (storage.foldername(name))[1]
      AND m.email = (auth.jwt() ->> 'email')
    )
  )
);

-- 4. Verify bucket creation
-- SELECT * FROM storage.buckets WHERE id = 'member-photos';
