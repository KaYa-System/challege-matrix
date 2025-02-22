/*
  # Correction des politiques de sécurité

  1. Changements
    - Simplification des politiques de sécurité
    - Utilisation de auth.uid() pour les vérifications
    - Correction des politiques pour l'admin
    - Ajout de politiques manquantes

  2. Sécurité
    - Accès complet pour les administrateurs
    - Accès limité pour les utilisateurs normaux
*/

-- Suppression de toutes les politiques existantes
DO $$ 
BEGIN
  -- Users
  DROP POLICY IF EXISTS "users_read_policy" ON users;
  DROP POLICY IF EXISTS "users_insert_policy" ON users;
  DROP POLICY IF EXISTS "users_update_policy" ON users;
  
  -- Challenges
  DROP POLICY IF EXISTS "challenges_read_policy" ON challenges;
  DROP POLICY IF EXISTS "challenges_admin_policy" ON challenges;
  
  -- Matrix Submissions
  DROP POLICY IF EXISTS "submissions_read_policy" ON matrix_submissions;
  DROP POLICY IF EXISTS "submissions_insert_policy" ON matrix_submissions;
  
  -- Challenge Participants
  DROP POLICY IF EXISTS "participants_read_policy" ON challenge_participants;
  DROP POLICY IF EXISTS "participants_insert_policy" ON challenge_participants;
END $$;

-- Politiques pour les utilisateurs
CREATE POLICY "users_read_all"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_insert_self"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_admin"
  ON users
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ));

-- Politiques pour les challenges
CREATE POLICY "challenges_read_all"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "challenges_write_admin"
  ON challenges
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ));

-- Politiques pour les soumissions
CREATE POLICY "submissions_read_all"
  ON matrix_submissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "submissions_insert_self"
  ON matrix_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Politiques pour les participants aux challenges
CREATE POLICY "participants_read_all"
  ON challenge_participants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "participants_insert_self"
  ON challenge_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());