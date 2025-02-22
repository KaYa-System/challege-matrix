-- Ajout des colonnes de référence si elles n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenges' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE challenges ADD COLUMN campaign_id uuid REFERENCES campaigns(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'current_campaign_id'
  ) THEN
    ALTER TABLE users ADD COLUMN current_campaign_id uuid REFERENCES campaigns(id);
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "enable_read_for_all_campaigns" ON campaigns;
  DROP POLICY IF EXISTS "enable_write_for_admins_campaigns" ON campaigns;
END $$;

-- Create new policies
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

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS activate_campaign(uuid);
DROP FUNCTION IF EXISTS complete_campaign(uuid);

-- Create campaign management functions
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

-- Mise à jour des challenges existants et des utilisateurs
DO $$
DECLARE
  v_campaign_id uuid;
BEGIN
  -- Récupérer l'ID de la campagne active
  SELECT id INTO v_campaign_id
  FROM campaigns
  WHERE status = 'active'
  LIMIT 1;

  -- Si une campagne active existe, mettre à jour les références
  IF v_campaign_id IS NOT NULL THEN
    -- Mise à jour des challenges existants
    UPDATE challenges
    SET campaign_id = v_campaign_id
    WHERE campaign_id IS NULL;

    -- Mise à jour des utilisateurs
    UPDATE users
    SET current_campaign_id = v_campaign_id
    WHERE EXISTS (
      SELECT 1 
      FROM challenge_participants cp
      JOIN challenges c ON cp.challenge_id = c.id
      WHERE cp.user_id = users.id
      AND c.campaign_id = v_campaign_id
    );
  END IF;
END $$;