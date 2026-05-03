-- Phase 1 cloud sync table for user-owned reptiles.
-- Keeps normalized columns for queryability and full object in `data` for forward compatibility.

CREATE TABLE IF NOT EXISTS public.reptiles (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  morph TEXT,
  sex TEXT NOT NULL DEFAULT 'unknown',
  birth_date TEXT,
  estimated_age_months INTEGER,
  acquisition_date TEXT,
  diet_type TEXT NOT NULL DEFAULT 'mixed',
  breeding_status TEXT NOT NULL DEFAULT 'pet',
  notes TEXT,
  photo_url TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reptiles_user_id_idx
  ON public.reptiles (user_id);

CREATE INDEX IF NOT EXISTS reptiles_updated_at_idx
  ON public.reptiles (updated_at DESC);

ALTER TABLE public.reptiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reptiles"
  ON public.reptiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reptiles"
  ON public.reptiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reptiles"
  ON public.reptiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reptiles"
  ON public.reptiles
  FOR DELETE
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'update_updated_at_column'
      AND n.nspname = 'public'
  ) THEN
    CREATE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SET search_path = public;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS update_reptiles_updated_at ON public.reptiles;

CREATE TRIGGER update_reptiles_updated_at
  BEFORE UPDATE ON public.reptiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
