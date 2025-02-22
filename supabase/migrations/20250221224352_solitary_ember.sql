-- Suppression des anciennes politiques
DO $$ 
BEGIN
  -- Users
  DROP POLICY IF EXISTS "users_select" ON users;
  DROP POLICY IF EXISTS "users_insert" ON users;
  DROP POLICY IF EXISTS "users_update" ON users;
  
  -- Challenges
  DROP POLICY IF EXISTS "challenges_select" ON challenges;
  DROP POLICY IF EXISTS "challenges_insert" ON challenges;
  DROP POLICY IF EXISTS "challenges_update" ON challenges;
  DROP POLICY IF EXISTS "challenges_delete" ON challenges;
  
  -- Matrix Submissions
  DROP POLICY IF EXISTS "submissions_select" ON matrix_submissions;
  DROP POLICY IF EXISTS "submissions_insert" ON matrix_submissions;
  DROP POLICY IF EXISTS "submissions_update" ON matrix_submissions;
  
  -- Challenge Participants
  DROP POLICY IF EXISTS "participants_select" ON challenge_participants;
  DROP POLICY IF EXISTS "participants_insert" ON challenge_participants;
  DROP POLICY IF EXISTS "participants_update" ON challenge_participants;
END $$;

-- Nouvelles politiques simplifiées pour les utilisateurs
CREATE POLICY "enable_select_for_authenticated"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "enable_insert_for_self"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "enable_update_for_admins"
  ON users
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Politiques pour les challenges
CREATE POLICY "enable_select_for_all_challenges"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "enable_all_for_admins"
  ON challenges
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Politiques pour les soumissions
CREATE POLICY "enable_select_for_own_submissions"
  ON matrix_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "enable_insert_for_own_submissions"
  ON matrix_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_update_for_admins_submissions"
  ON matrix_submissions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Politiques pour les participants aux challenges
CREATE POLICY "enable_select_for_own_participation"
  ON challenge_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "enable_insert_for_own_participation"
  ON challenge_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "enable_update_for_own_participation"
  ON challenge_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));