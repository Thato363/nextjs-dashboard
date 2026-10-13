-- Retain legacy user rows without exposing credentials or allowing Data API access.
CREATE POLICY users_deny_data_api
ON public.users FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

