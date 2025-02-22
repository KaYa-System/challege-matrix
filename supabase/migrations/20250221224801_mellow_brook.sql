/*
  # Correction finale des politiques de sécurité

  Cette migration nettoie toutes les politiques existantes et les recrée
  avec une approche basée sur auth.jwt() pour éviter les récursions infinies.
*/

-- Suppression de toutes les politiques existantes
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

-- Politiques pour les utilisateurs
CREATE POLICY "users_select_policy"
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
CREATE POLICY "challenges_select_policy"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR 
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "challenges_admin_policy"
  ON challenges
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Politiques pour les soumissions
CREATE POLICY "submissions_select_policy"
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

CREATE POLICY "submissions_admin_policy"
  ON matrix_submissions
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Politiques pour les participants aux challenges
CREATE POLICY "participants_select_policy"
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