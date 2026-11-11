-- Lock VERTICAL LAB tables to the owner's signed-in account only.
-- No data is modified or deleted.
ALTER TABLE public.lab_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_jump_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner full access" ON public.lab_players;
DROP POLICY IF EXISTS "Owner full access" ON public.lab_jump_measurements;
DROP POLICY IF EXISTS "Owner full access" ON public.lab_coaches;

CREATE POLICY "Owner full access" ON public.lab_players
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') = 'memobest50@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'memobest50@gmail.com');
CREATE POLICY "Owner full access" ON public.lab_jump_measurements
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') = 'memobest50@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'memobest50@gmail.com');
CREATE POLICY "Owner full access" ON public.lab_coaches
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') = 'memobest50@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'memobest50@gmail.com');
