-- ==============================================================================
-- FIX ROW LEVEL SECURITY (RLS) FOR REGISTRATIONS & GALLERY PHOTOS
-- ==============================================================================
-- You can run this migration script directly in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/zyhuclcojkediqhscjlr/sql/new
-- ==============================================================================

-- 1. FIX REGISTRATIONS TABLE RLS POLICIES
-- Drop any existing blocking/restrictive policies
DROP POLICY IF EXISTS "No direct client access to registrations" ON public.registrations;
DROP POLICY IF EXISTS "Anyone can submit a registration" ON public.registrations;
DROP POLICY IF EXISTS "Admins can view registrations" ON public.registrations;
DROP POLICY IF EXISTS "Admins can update registrations" ON public.registrations;
DROP POLICY IF EXISTS "Admins can delete registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow select for registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow update for registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow delete for registrations" ON public.registrations;

-- Ensure table has correct permissions
GRANT ALL ON public.registrations TO anon, authenticated, service_role;

-- Allow public and student registrations insert
CREATE POLICY "Anyone can submit a registration"
ON public.registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow reading registrations
CREATE POLICY "Allow select for registrations"
ON public.registrations
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow updating registrations
CREATE POLICY "Allow update for registrations"
ON public.registrations
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Allow deleting registrations
CREATE POLICY "Allow delete for registrations"
ON public.registrations
FOR DELETE
TO anon, authenticated
USING (true);


-- 2. CREATE / FIX GALLERY_PHOTOS TABLE
CREATE TABLE IF NOT EXISTS public.gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  caption TEXT,
  category TEXT NOT NULL DEFAULT 'events',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.gallery_photos TO anon, authenticated, service_role;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view gallery photos" ON public.gallery_photos;
CREATE POLICY "Public can view gallery photos"
ON public.gallery_photos
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins and service can insert gallery photos" ON public.gallery_photos;
CREATE POLICY "Admins and service can insert gallery photos"
ON public.gallery_photos
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and service can delete gallery photos" ON public.gallery_photos;
CREATE POLICY "Admins and service can delete gallery photos"
ON public.gallery_photos
FOR DELETE
TO anon, authenticated
USING (true);


-- 3. ENSURE STORAGE BUCKET 'gallery' IS ACCESSIBLE
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage object policies for bucket 'gallery'
DROP POLICY IF EXISTS "Public gallery objects select" ON storage.objects;
CREATE POLICY "Public gallery objects select"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Public gallery objects insert" ON storage.objects;
CREATE POLICY "Public gallery objects insert"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Public gallery objects delete" ON storage.objects;
CREATE POLICY "Public gallery objects delete"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'gallery');
