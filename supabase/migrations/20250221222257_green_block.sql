/*
  # Correction des politiques de sécurité pour les administrateurs

  1. Modifications
    - Ajout de politiques permettant aux administrateurs d'accéder à toutes les données
    - Correction des politiques existantes pour vérifier correctement le rôle admin

  2. Sécurité
    - Les administrateurs peuvent lire toutes les données
    - Les utilisateurs normaux ne peuvent voir que leurs propres données
*/

-- Suppression des anciennes politiques
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can read all data" ON users;
DROP POLICY IF EXISTS "Users can create their account" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Nouvelles politiques pour les utilisateurs
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can create their account"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Mise à jour des politiques pour les challenges
DROP POLICY IF EXISTS "Tout le monde peut voir les challenges actifs" ON challenges;
DROP POLICY IF EXISTS "Les admins peuvent tout faire" ON challenges;

CREATE POLICY "Challenges visibility"
  ON challenges
  FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can manage challenges"
  ON challenges
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Mise à jour des politiques pour les soumissions
DROP POLICY IF EXISTS "Users can read own submissions" ON matrix_submissions;

CREATE POLICY "Submissions visibility"
  ON matrix_submissions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Mise à jour des politiques pour les participants aux challenges
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs participations" ON challenge_participants;

CREATE POLICY "Challenge participants visibility"
  ON challenge_participants
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );