/*
  # Update RLS policies for admin access
  
  1. Changes
    - Simplify policies to give admins full access
    - Remove complex conditions
    - Maintain user restrictions while giving admins complete visibility
  
  2. Security
    - Admins can see and manage all data
    - Regular users still restricted to their own data
    - Maintain proper access control boundaries
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
CREATE POLICY "enable_all_access_for_admin"
  ON users
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "enable_self_access"
  ON users
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Challenge policies
CREATE POLICY "enable_all_access_for_admin_challenges"
  ON challenges
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "enable_read_active_challenges"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Matrix submissions policies
CREATE POLICY "enable_all_access_for_admin_submissions"
  ON matrix_submissions
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "enable_user_submissions"
  ON matrix_submissions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Challenge participants policies
CREATE POLICY "enable_all_access_for_admin_participants"
  ON challenge_participants
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "enable_user_participation"
  ON challenge_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());