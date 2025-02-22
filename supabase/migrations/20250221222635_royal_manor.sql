/*
  # Mise à jour des politiques de sécurité

  1. Changements
    - Suppression de toutes les politiques existantes
    - Création de nouvelles politiques simplifiées
    - Utilisation de auth.jwt() pour les vérifications de rôle
    - Accès complet pour les administrateurs

  2. Sécurité
    - Les administrateurs ont accès à toutes les données
    - Les utilisateurs normaux ne peuvent voir que leurs propres données
    - Protection des données sensibles
*/

-- Suppression de toutes les politiques existantes
DO $$ 
BEGIN
  -- Users
  DROP POLICY IF EXISTS "Users can read own data" ON users;
  DROP POLICY IF EXISTS "Admins can read all data" ON users;
  DROP POLICY IF EXISTS "Users can create their account" ON users;
  DROP POLICY IF EXISTS "Admins can update all users" ON users;
  DROP POLICY IF EXISTS "Enable read access for users" ON users;
  DROP POLICY IF EXISTS "Enable insert for users" ON users;
  DROP POLICY IF EXISTS "Enable update for admins" ON users;
  
  -- Challenges
  DROP POLICY IF EXISTS "Tout le monde peut voir les challenges actifs" ON challenges;
  DROP POLICY IF EXISTS "Les admins peuvent tout faire" ON challenges;
  DROP POLICY IF EXISTS "Enable read access for challenges" ON challenges;
  DROP POLICY IF EXISTS "Enable write access for admins" ON challenges;
  DROP POLICY IF EXISTS "Challenges visibility" ON challenges;
  DROP POLICY IF EXISTS "Admins can manage challenges" ON challenges;
  
  -- Matrix Submissions
  DROP POLICY IF EXISTS "Users can read own submissions" ON matrix_submissions;
  DROP POLICY IF EXISTS "Enable read access for submissions" ON matrix_submissions;
  DROP POLICY IF EXISTS "Submissions visibility" ON matrix_submissions;
  
  -- Challenge Participants
  DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs participations" ON challenge_participants;
  DROP POLICY IF EXISTS "Enable read access for participants" ON challenge_participants;
  DROP POLICY IF EXISTS "Challenge participants visibility" ON challenge_participants;
END $$;

-- Nouvelles politiques pour les utilisateurs
CREATE POLICY "users_read_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    (auth.jwt() ->> 'role' = 'admin')
  );

CREATE POLICY "users_insert_policy"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_policy"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Nouvelles politiques pour les challenges
CREATE POLICY "challenges_read_policy"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR
    (auth.jwt() ->> 'role' = 'admin')
  );

CREATE POLICY "challenges_admin_policy"
  ON challenges
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Nouvelles politiques pour les soumissions
CREATE POLICY "submissions_read_policy"
  ON matrix_submissions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (auth.jwt() ->> 'role' = 'admin')
  );

CREATE POLICY "submissions_insert_policy"
  ON matrix_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Nouvelles politiques pour les participants aux challenges
CREATE POLICY "participants_read_policy"
  ON challenge_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (auth.jwt() ->> 'role' = 'admin')
  );

CREATE POLICY "participants_insert_policy"
  ON challenge_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());