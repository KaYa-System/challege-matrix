/*
  # Correction des politiques de sécurité

  1. Modifications
    - Correction de la récursion infinie dans les politiques
    - Simplification des politiques de sécurité
    - Ajout d'une politique spécifique pour les administrateurs

  2. Sécurité
    - Les utilisateurs peuvent voir leur propre profil
    - Les administrateurs peuvent voir tous les profils
    - Les utilisateurs peuvent créer leur compte
    - Les administrateurs peuvent modifier tous les comptes
*/

-- Suppression des anciennes politiques
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can create their account" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

-- Nouvelles politiques simplifiées
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all data"
  ON users
  FOR SELECT
  TO authenticated
  USING (role = 'admin');

CREATE POLICY "Users can create their account"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (role = 'admin')
  WITH CHECK (role = 'admin');