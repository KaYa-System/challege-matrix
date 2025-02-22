/*
  # Création de la table des soumissions Matrix

  1. Nouvelle Table
    - `matrix_submissions`
      - `id` (uuid, clé primaire)
      - `user_id` (uuid, référence vers users)
      - `mxf` (integer, Branche Forte)
      - `mxm` (integer, Pied de paiement 1)
      - `mx` (integer, Dernier pied de paiement)
      - `mx_global` (integer, Total calculé)
      - `screenshot_url` (text, URL de la capture d'écran)
      - `submission_date` (timestamp)
      - `status` (text, statut de la soumission)
      - `created_at` (timestamp)

  2. Sécurité
    - Activation RLS sur la table `matrix_submissions`
    - Politique pour la lecture des soumissions par l'utilisateur
    - Politique pour la création de soumissions
*/

CREATE TABLE IF NOT EXISTS matrix_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  mxf integer NOT NULL CHECK (mxf >= 0),
  mxm integer NOT NULL CHECK (mxm >= 0),
  mx integer NOT NULL CHECK (mx >= 0),
  mx_global integer NOT NULL GENERATED ALWAYS AS (mxf + mxm + mx) STORED,
  screenshot_url text NOT NULL,
  submission_date timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matrix_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own submissions"
  ON matrix_submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create submissions"
  ON matrix_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);