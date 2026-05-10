-- Per-user display order for My Animals. Mirrors local IndexedDB `sortOrder` on Reptile rows.
ALTER TABLE public.reptiles
  ADD COLUMN IF NOT EXISTS sort_order integer;

-- Stable fallback: oldest created first, then name (matches client migration).
UPDATE public.reptiles r
SET sort_order = seq.rn
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at ASC NULLS LAST, name ASC, id ASC
    ) - 1 AS rn
  FROM public.reptiles
) seq
WHERE r.id = seq.id
  AND r.sort_order IS NULL;
