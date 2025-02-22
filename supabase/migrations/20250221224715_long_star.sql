/*
  # Correction des politiques de sécurité

  Cette migration corrige les problèmes de récursion infinie dans les politiques
  en utilisant auth.jwt() au lieu de requêtes récursives.
*/

-- Suppression des politiques existantes
DO $$ 
BEGIN
  -- Users
  DROP POLICY IF EXISTS "users_read_policy" ON users;
  DROP POLICY IF EXISTS "users_insert_policy" ON users;
  DROP POLICY IF EXISTS "users_update_policy" ON users;
  
  -- Challenges
  DROP POLICY IF EXISTS "challenges_read_policy" ON challenges;
  DROP POLICY IF EXISTS "challenges_write_policy" ON challenges;
  
  -- Matrix Submissions
  DROP POLICY IF EXISTS "submissions_read_policy" ON matrix_submissions;
  DROP POLICY IF EXISTS "submissions_insert_policy" ON matrix_submissions;
  DROP POLICY IF EXISTS "submissions_update_policy" ON matrix_submissions;
  
  -- Challenge Participants
  DROP POLICY IF EXISTS "participants_read_policy" ON challenge_participants;
  DROP POLICY IF EXISTS "participants_insert_policy" ON challenge_participants;
  DROP POLICY IF EXISTS "participants_update_policy" ON challenge_participants;
END $$;

-- Politiques pour les utilisateurs
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

-- Politiques pour les challenges
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

-- Politiques pour les soumissions
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

-- Politiques pour les participants aux challenges
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