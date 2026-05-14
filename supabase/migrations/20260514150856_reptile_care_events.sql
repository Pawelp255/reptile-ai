-- Cloud sync table for Journal care events.
-- Local IndexedDB remains the source of instant UX; this table is the signed-in backup/restore replica.

CREATE TABLE IF NOT EXISTS public.reptile_care_events (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reptile_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('feeding', 'cleaning', 'shedding', 'health', 'handling', 'note')),
  event_date TEXT NOT NULL,
  details TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reptile_care_events_user_idx
  ON public.reptile_care_events (user_id);

CREATE INDEX IF NOT EXISTS reptile_care_events_reptile_idx
  ON public.reptile_care_events (user_id, reptile_id);

CREATE INDEX IF NOT EXISTS reptile_care_events_event_date_idx
  ON public.reptile_care_events (user_id, event_date DESC);

ALTER TABLE public.reptile_care_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their care events"
  ON public.reptile_care_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert care events"
  ON public.reptile_care_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update care events"
  ON public.reptile_care_events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete care events"
  ON public.reptile_care_events
  FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_reptile_care_events_updated_at ON public.reptile_care_events;

CREATE TRIGGER update_reptile_care_events_updated_at
  BEFORE UPDATE ON public.reptile_care_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
