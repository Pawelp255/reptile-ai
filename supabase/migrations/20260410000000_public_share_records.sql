-- Public share snapshots for read-only external profile, care card, and passport links.
-- These records intentionally store only a sanitized render payload, not the full local animal database.

CREATE TABLE public.public_share_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reptile_id TEXT NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('profile', 'passport', 'care-card')),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  payload JSONB NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.public_share_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX public_share_records_owner_idx
  ON public.public_share_records (user_id, reptile_id, share_type);

CREATE INDEX public_share_records_active_slug_idx
  ON public.public_share_records (slug)
  WHERE revoked = false;

CREATE POLICY "Active public shares are readable without login"
  ON public.public_share_records
  FOR SELECT
  USING (
    revoked = false
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Users can view their own public shares"
  ON public.public_share_records
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own public shares"
  ON public.public_share_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own public shares"
  ON public.public_share_records
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own public shares"
  ON public.public_share_records
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_public_share_records_updated_at
  BEFORE UPDATE ON public.public_share_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
