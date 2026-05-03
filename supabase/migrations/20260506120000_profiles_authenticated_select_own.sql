-- Allow JWT-authenticated clients to read their own profile row.
-- Some deployments restrict generic SELECT; without this, PostgREST returns 0 rows and the app treats plan as Free.

DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;

CREATE POLICY "Users can select own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
