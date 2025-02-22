/*
  # Correction des politiques de sécurité récursives

  1. Modifications
    - Simplification des politiques pour éviter la récursion infinie
    - Utilisation de auth.jwt() pour vérifier le rôle admin
    - Suppression des requêtes imbriquées qui causaient la récursion

  2. Sécurité
    - Maintien de la sécurité des données
    - Simplification des vérifications de rôle
*/

-- Suppression des anciennes politiques
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can create their account" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Challenges visibility" ON challenges;
DROP POLICY IF EXISTS "Admins can manage challenges" ON challenges;
DROP POLICY IF EXISTS "Submissions visibility" ON matrix_submissions;
DROP POLICY IF EXISTS "Challenge participants visibility" ON challenge_participants;

-- Politiques pour les utilisateurs
CREATE POLICY "Enable read access for users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Enable insert for users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for admins"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Politiques pour les challenges
CREATE POLICY "Enable read access for challenges"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Enable write access for admins"
  ON challenges
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Politiques pour les soumissions
CREATE POLICY "Enable read access for submissions"
  ON matrix_submissions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Politiques pour les participants aux challenges
CREATE POLICY "Enable read access for participants"
  ON challenge_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );