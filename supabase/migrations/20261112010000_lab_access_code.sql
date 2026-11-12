-- Access-code login: the app sends the typed code in the `x-lab-key` header.
-- Only its SHA-256 hash is stored here. No data is modified.
CREATE OR REPLACE FUNCTION public.lab_key_ok()
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    encode(extensions.digest(coalesce(current_setting('request.headers', true)::json->>'x-lab-key', ''), 'sha256'), 'hex')
      = '8907d7a7b7ce2e94e2e6452fc90dc229292407ec5b0082e90af83195fe9075be',
    false);
$$;
GRANT EXECUTE ON FUNCTION public.lab_key_ok() TO anon, authenticated;

DROP POLICY IF EXISTS "Access code" ON public.lab_players;
DROP POLICY IF EXISTS "Access code" ON public.lab_jump_measurements;
DROP POLICY IF EXISTS "Access code" ON public.lab_coaches;
CREATE POLICY "Access code" ON public.lab_players FOR ALL TO anon, authenticated USING (public.lab_key_ok()) WITH CHECK (public.lab_key_ok());
CREATE POLICY "Access code" ON public.lab_jump_measurements FOR ALL TO anon, authenticated USING (public.lab_key_ok()) WITH CHECK (public.lab_key_ok());
CREATE POLICY "Access code" ON public.lab_coaches FOR ALL TO anon, authenticated USING (public.lab_key_ok()) WITH CHECK (public.lab_key_ok());
