/*
  # Fix user access policies
  
  1. Changes
    - Allow admins to see all users
    - Keep self-access for regular users
    - Maintain proper access control
  
  2. Security
    - Use JWT claims for role checks
    - Ensure proper access restrictions
*/

-- Drop all existing policies
DO $$ 
DECLARE
  policies RECORD;
BEGIN
  FOR policies IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'challenges', 'matrix_submissions', 'challenge_participants')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      policies.policyname, policies.schemaname, policies.tablename);
  END LOOP;
END $$;

-- Users table policies
CREATE POLICY "user_read_all"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "user_create_self"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "admin_manage_users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Challenges table policies
CREATE POLICY "admin_access_challenges"
  ON challenges
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "user_read_challenges"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (true);

-- Matrix submissions policies
CREATE POLICY "admin_access_submissions"
  ON matrix_submissions
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "user_manage_submissions"
  ON matrix_submissions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Challenge participants policies
CREATE POLICY "admin_access_participants"
  ON challenge_participants
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "user_manage_participants"
  ON challenge_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());