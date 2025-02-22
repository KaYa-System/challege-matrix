/*
  # Mise à jour des politiques de sécurité

  1. Modifications
    - Simplification des politiques de sécurité
    - Accès complet pour les administrateurs
    - Accès limité pour les utilisateurs normaux
    
  2. Sécurité
    - Les administrateurs peuvent voir et gérer toutes les données
    - Les utilisateurs peuvent voir leurs propres données
    - Les utilisateurs peuvent voir les challenges actifs
*/

-- Suppression des politiques existantes
DO $$ 
BEGIN
  -- Users
  DROP POLICY IF EXISTS "users_read_all" ON users;
  DROP POLICY IF EXISTS "users_insert_self" ON users;
  DROP POLICY IF EXISTS "users_update_admin" ON users;
  
  -- Challenges
  DROP POLICY IF EXISTS "challenges_read_all" ON challenges;
  DROP POLICY IF EXISTS "challenges_write_admin" ON challenges;
  
  -- Matrix Submissions
  DROP POLICY IF EXISTS "submissions_read_all" ON matrix_submissions;
  DROP POLICY IF EXISTS "submissions_insert_self" ON matrix_submissions;
  
  -- Challenge Participants
  DROP POLICY IF EXISTS "participants_read_all" ON challenge_participants;
  DROP POLICY IF EXISTS "participants_insert_self" ON challenge_participants;
END $$;

-- Nouvelles politiques simplifiées

-- Users
CREATE POLICY "admin_manage_users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "users_read_own"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_create_own"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Challenges
CREATE POLICY "admin_manage_challenges"
  ON challenges
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "users_read_challenges"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (true);

-- Matrix Submissions
CREATE POLICY "admin_manage_submissions"
  ON matrix_submissions
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "users_manage_own_submissions"
  ON matrix_submissions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Challenge Participants
CREATE POLICY "admin_manage_participants"
  ON challenge_participants
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "users_manage_own_participation"
  ON challenge_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());