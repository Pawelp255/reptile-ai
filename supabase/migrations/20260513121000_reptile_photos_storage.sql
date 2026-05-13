-- Pass 3A: Cloud photo backup for animal profile photos.
-- Adds a storage path reference on reptiles and a private Supabase Storage bucket.

ALTER TABLE public.reptiles
  ADD COLUMN IF NOT EXISTS photo_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('reptile-photos', 'reptile-photos', false)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET public = false
WHERE id = 'reptile-photos';

DROP POLICY IF EXISTS "Reptile photos are readable by owner path" ON storage.objects;
CREATE POLICY "Reptile photos are readable by owner path"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reptile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Reptile photos are insertable by owner path" ON storage.objects;
CREATE POLICY "Reptile photos are insertable by owner path"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reptile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Reptile photos are updatable by owner path" ON storage.objects;
CREATE POLICY "Reptile photos are updatable by owner path"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'reptile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'reptile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Reptile photos are deletable by owner path" ON storage.objects;
CREATE POLICY "Reptile photos are deletable by owner path"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reptile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
