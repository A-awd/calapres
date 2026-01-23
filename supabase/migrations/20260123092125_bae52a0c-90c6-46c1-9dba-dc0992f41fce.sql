-- Drop the existing policy and recreate with proper WITH CHECK
DROP POLICY IF EXISTS "Admins can manage announcement settings" ON announcement_settings;

CREATE POLICY "Admins can manage announcement settings"
  ON announcement_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));