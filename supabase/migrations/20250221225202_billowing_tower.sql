/*
  # Update RLS policies to fix recursion issues
  
  1. Changes
    - Replace recursive user role checks with auth.jwt() checks
    - Simplify policy conditions to avoid recursion
    - Maintain same security boundaries with more efficient checks
  
  2. Security
    - All policies now use auth.jwt() for role verification
    - Maintain proper access control for users and admins
    - Prevent infinite recursion in policy evaluation
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

-- User policies
CREATE POLICY "users_read_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR 
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "users_insert_policy"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_policy"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Challenge policies
CREATE POLICY "challenges_read_policy"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR 
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "challenges_write_policy"
  ON challenges
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Matrix submissions policies
CREATE POLICY "submissions_read_policy"
  ON matrix_submissions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "submissions_insert_policy"
  ON matrix_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "submissions_update_policy"
  ON matrix_submissions
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Challenge participants policies
CREATE POLICY "participants_read_policy"
  ON challenge_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "participants_insert_policy"
  ON challenge_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "participants_update_policy"
  ON challenge_participants
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    auth.jwt() ->> 'role' = 'admin'
  );