-- Server-side Pro flag for assistants and future billing webhooks (default off).
-- Edge Function `ai-assistant` reads this; Stripe or admin tooling can UPDATE is_pro when subscription is active.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_pro IS 'When true, user is entitled to Pro features (assistant, etc.). Set by billing webhooks or support; never trust the client alone.';
