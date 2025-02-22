-- Drop all existing policies
DO $$ 
BEGIN
  -- Users
  DROP POLICY IF EXISTS "enable_select_for_authenticated" ON users;
  DROP POLICY IF EXISTS "enable_insert_for_self" ON users;
  DROP POLICY IF EXISTS "enable_update_for_admins" ON users;
  DROP POLICY IF EXISTS "enable_select_for_all_challenges" ON challenges;
  DROP POLICY IF EXISTS "enable_all_for_admins" ON challenges;
  DROP POLICY IF EXISTS "enable_select_for_own_submissions" ON matrix_submissions;
  DROP POLICY IF EXISTS "enable_insert_for_own_submissions" ON matrix_submissions;
  DROP POLICY IF EXISTS "enable_update_for_admins_submissions" ON matrix_submissions;
  DROP POLICY IF EXISTS "enable_select_for_own_participation" ON challenge_participants;
  DROP POLICY IF EXISTS "enable_insert_for_own_participation" ON challenge_participants;
  DROP POLICY IF EXISTS "enable_update_for_own_participation" ON challenge_participants;
END $$;

-- Users policies
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

-- Challenges policies
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