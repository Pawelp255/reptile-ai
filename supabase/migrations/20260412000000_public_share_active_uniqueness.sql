-- Keep only one non-revoked public share per owner, animal, and share type.
-- Existing duplicates are revoked before the partial unique index is created.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, reptile_id, share_type
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS duplicate_rank
  FROM public.public_share_records
  WHERE revoked = false
)
UPDATE public.public_share_records
SET revoked = true, updated_at = now()
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE duplicate_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS public_share_records_one_active_per_kind_idx
  ON public.public_share_records (user_id, reptile_id, share_type)
  WHERE revoked = false;
