-- Phase 2: synced care schedules (offline-first replicas of local IndexedDB scheduleItems)

CREATE TABLE IF NOT EXISTS public.reptile_care_tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reptile_id TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('feed', 'clean', 'check')),
  frequency_days INTEGER NOT NULL CHECK (frequency_days >= 1),
  last_done_date TEXT,
  next_due_date TEXT NOT NULL,
  auto_generated BOOLEAN NOT NULL DEFAULT false,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reptile_care_tasks_user_idx
  ON public.reptile_care_tasks (user_id);

CREATE INDEX IF NOT EXISTS reptile_care_tasks_reptile_idx
  ON public.reptile_care_tasks (user_id, reptile_id);

ALTER TABLE public.reptile_care_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their care tasks"
  ON public.reptile_care_tasks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert care tasks"
  ON public.reptile_care_tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update care tasks"
  ON public.reptile_care_tasks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete care tasks"
  ON public.reptile_care_tasks
  FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_reptile_care_tasks_updated_at ON public.reptile_care_tasks;

CREATE TRIGGER update_reptile_care_tasks_updated_at
  BEFORE UPDATE ON public.reptile_care_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
