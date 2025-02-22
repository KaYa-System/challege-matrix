/*
  # Fix policy recursion issues
  
  1. Changes
    - Fix infinite recursion in user policies
    - Simplify admin access checks using auth.jwt()
    - Maintain proper access control
  
  2. Security
    - Use JWT claims for role checks instead of querying users table
    - Maintain proper access restrictions
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
CREATE POLICY "admin_access"
  ON users
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "user_read_self"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "user_create_self"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

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