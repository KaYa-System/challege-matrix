/*
  # Ajout du support des campagnes de challenges

  1. Nouvelles Tables
    - `campaigns`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `status` (text: 'draft', 'active', 'completed')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modifications
    - Ajout de la colonne `campaign_id` à la table `challenges`
    - Ajout de la colonne `current_campaign_id` à la table `users`

  3. Sécurité
    - Enable RLS sur la table `campaigns`
    - Ajout des politiques de sécurité
*/

-- Création de la table campaigns
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_campaign_dates CHECK (end_date > start_date)
);

-- Ajout des colonnes de référence
ALTER TABLE challenges ADD COLUMN campaign_id uuid REFERENCES campaigns(id);
ALTER TABLE users ADD COLUMN current_campaign_id uuid REFERENCES campaigns(id);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité pour campaigns
CREATE POLICY "enable_read_for_all_campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "enable_write_for_admins_campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour activer une campagne
CREATE OR REPLACE FUNCTION activate_campaign(campaign_id uuid)
RETURNS void AS $$
BEGIN
  -- Vérifier si une autre campagne est active
  IF EXISTS (
    SELECT 1 FROM campaigns 
    WHERE status = 'active' 
    AND id != campaign_id
  ) THEN
    RAISE EXCEPTION 'Une autre campagne est déjà active';
  END IF;

  -- Activer la campagne
  UPDATE campaigns
  SET status = 'active'
  WHERE id = campaign_id
  AND status = 'draft';

  -- Activer le premier challenge de la campagne
  UPDATE challenges
  SET status = 'active'
  WHERE campaign_id = campaign_id
  AND level = (
    SELECT MIN(level)
    FROM challenges
    WHERE campaign_id = campaign_id
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour terminer une campagne
CREATE OR REPLACE FUNCTION complete_campaign(campaign_id uuid)
RETURNS void AS $$
BEGIN
  -- Marquer tous les challenges de la campagne comme terminés
  UPDATE challenges
  SET status = 'completed'
  WHERE campaign_id = campaign_id;

  -- Marquer la campagne comme terminée
  UPDATE campaigns
  SET 
    status = 'completed',
    end_date = LEAST(end_date, now())
  WHERE id = campaign_id;

  -- Mettre à jour current_campaign_id des utilisateurs
  UPDATE users
  SET current_campaign_id = NULL
  WHERE current_campaign_id = campaign_id;
END;
$$ LANGUAGE plpgsql;

-- Mise à jour de la fonction update_user_level pour prendre en compte les campagnes
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge_level integer;
  v_next_challenge_id uuid;
  v_next_challenge_level integer;
  v_campaign_id uuid;
BEGIN
  -- Si le statut passe à 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Récupérer le niveau du challenge actuel et la campagne
    SELECT level, campaign_id 
    INTO v_challenge_level, v_campaign_id
    FROM challenges
    WHERE id = NEW.challenge_id;

    -- Récupérer le prochain challenge de la même campagne
    SELECT id, level 
    INTO v_next_challenge_id, v_next_challenge_level
    FROM challenges
    WHERE campaign_id = v_campaign_id
    AND level > v_challenge_level
    AND status = 'draft'
    ORDER BY level ASC
    LIMIT 1;

    -- Mettre à jour le niveau et le prochain challenge de l'utilisateur
    UPDATE users
    SET 
      current_level = CASE 
        WHEN v_next_challenge_level IS NOT NULL THEN v_next_challenge_level
        ELSE v_challenge_level
      END,
      next_challenge_id = v_next_challenge_id,
      current_campaign_id = v_campaign_id
    WHERE id = NEW.user_id;

    PERFORM log_debug('Niveau utilisateur mis à jour - User ID: ' || NEW.user_id || 
                     ', Campagne: ' || v_campaign_id ||
                     ', Nouveau niveau: ' || COALESCE(v_next_challenge_level, v_challenge_level) ||
                     ', Prochain challenge: ' || COALESCE(v_next_challenge_id::text, 'aucun'));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création de la première campagne
INSERT INTO campaigns (
  title,
  description,
  start_date,
  end_date,
  status
) VALUES (
  'Campagne Matrix - Mars 2024',
  'Première campagne de challenges Matrix pour développer votre réseau Longrich',
  '2024-03-01 00:00:00+00',
  '2024-03-31 23:59:59+00',
  'active'
)
RETURNING id;

-- Mise à jour des challenges existants pour les associer à la première campagne
UPDATE challenges
SET campaign_id = (
  SELECT id FROM campaigns WHERE status = 'active' LIMIT 1
);

-- Mise à jour des utilisateurs pour définir leur campagne actuelle
UPDATE users
SET current_campaign_id = (
  SELECT id FROM campaigns WHERE status = 'active' LIMIT 1
)
WHERE EXISTS (
  SELECT 1 
  FROM challenge_participants cp
  JOIN challenges c ON cp.challenge_id = c.id
  WHERE cp.user_id = users.id
  AND c.campaign_id = (SELECT id FROM campaigns WHERE status = 'active' LIMIT 1)
);