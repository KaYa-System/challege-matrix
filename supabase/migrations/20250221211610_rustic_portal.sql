/*
  # Système de challenges et récompenses

  1. Nouvelles Tables
    - `challenges`
      - `id` (uuid, primary key)
      - `title` (text) - Titre du challenge
      - `description` (text) - Description détaillée
      - `level` (integer) - Niveau du challenge
      - `start_date` (timestamptz) - Date de début
      - `end_date` (timestamptz) - Date de fin
      - `submission_start` (time) - Heure de début des soumissions
      - `submission_end` (time) - Heure de fin des soumissions
      - `submission_days` (text[]) - Jours de soumission autorisés
      - `min_points` (integer) - Points minimum requis
      - `status` (text) - État du challenge
      - Timestamps standards

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Policies pour la lecture/écriture selon les rôles
*/

-- Challenges
CREATE TABLE challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  level integer NOT NULL CHECK (level > 0),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  submission_start time NOT NULL,
  submission_end time NOT NULL,
  submission_days text[] NOT NULL,
  min_points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (end_date > start_date)
);

-- Récompenses
CREATE TABLE rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  type text NOT NULL CHECK (type IN ('product', 'badge', 'bonus')),
  min_points integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Participants aux challenges
CREATE TABLE challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  challenge_id uuid REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  current_points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);

-- Fonction pour vérifier si les soumissions sont autorisées
CREATE OR REPLACE FUNCTION is_submission_allowed(challenge_id uuid)
RETURNS boolean AS $$
DECLARE
  challenge_record challenges%ROWTYPE;
  submission_time time;
  current_day text;
BEGIN
  -- Récupérer les informations du challenge
  SELECT * INTO challenge_record
  FROM challenges
  WHERE id = challenge_id;

  -- Vérifier si le challenge est actif
  IF challenge_record.status != 'active' THEN
    RETURN false;
  END IF;

  -- Vérifier si on est dans la période globale du challenge
  IF NOW() < challenge_record.start_date OR NOW() > challenge_record.end_date THEN
    RETURN false;
  END IF;

  -- Vérifier l'heure et le jour
  submission_time := LOCALTIME;
  current_day := to_char(NOW(), 'DAY');
  
  RETURN submission_time BETWEEN challenge_record.submission_start AND challenge_record.submission_end
    AND current_day = ANY(challenge_record.submission_days);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_participants_updated_at
  BEFORE UPDATE ON challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sécurité
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

-- Policies pour les challenges
CREATE POLICY "Tout le monde peut voir les challenges actifs"
  ON challenges
  FOR SELECT
  USING (status = 'active');

CREATE POLICY "Les admins peuvent tout faire"
  ON challenges
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Policies pour les récompenses
CREATE POLICY "Tout le monde peut voir les récompenses"
  ON rewards
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les admins peuvent gérer les récompenses"
  ON rewards
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Policies pour les participants
CREATE POLICY "Les utilisateurs peuvent voir leurs participations"
  ON challenge_participants
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent participer aux challenges"
  ON challenge_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index pour améliorer les performances
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenge_participants_user_id ON challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_challenge_id ON challenge_participants(challenge_id);
CREATE INDEX idx_rewards_challenge_id ON rewards(challenge_id);