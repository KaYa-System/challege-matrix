-- Drop existing policies for challenges
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "challenges_read_policy" ON challenges;
  DROP POLICY IF EXISTS "challenges_write_policy" ON challenges;
  DROP POLICY IF EXISTS "admin_access_challenges" ON challenges;
  DROP POLICY IF EXISTS "user_read_challenges" ON challenges;
END $$;

-- Create new policies for challenges
CREATE POLICY "enable_read_for_all"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "enable_write_for_admins"
  ON challenges
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );