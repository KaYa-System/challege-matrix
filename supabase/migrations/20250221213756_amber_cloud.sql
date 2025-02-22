/*
  # Ajout du rôle utilisateur

  1. Modifications
    - Ajout de la colonne `role` à la table `users`
    - Valeurs possibles : 'user' (défaut) ou 'admin'
    - Mise à jour des politiques de sécurité pour le rôle

  2. Sécurité
    - Les administrateurs peuvent voir tous les utilisateurs
    - Les utilisateurs ne peuvent voir que leur propre profil
*/

-- Ajout de la colonne role
ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Mise à jour des politiques de sécurité
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can create their account" ON users;

-- Nouvelles politiques
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR (
      SELECT role FROM users WHERE id = auth.uid()
    ) = 'admin'
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