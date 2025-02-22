/*
  # Création de la table des utilisateurs

  1. Nouvelle Table
    - `users`
      - `id` (uuid, clé primaire)
      - `full_name` (text, nom complet de l'utilisateur)
      - `email` (text, unique)
      - `longrich_code` (text, unique, code Longrich)
      - `office` (text, bureau d'appartenance)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Activation RLS sur la table `users`
    - Politique pour la lecture des données par l'utilisateur authentifié
    - Politique pour la création de compte
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  longrich_code text UNIQUE NOT NULL,
  office text NOT NULL CHECK (office IN ('yop-canaris', 'cocody-insacc', 'annani', 'attingier')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can create their account"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);