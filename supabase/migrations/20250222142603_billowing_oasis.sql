-- Ajout des colonnes de niveau et de progression
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- Fonction pour accepter les termes et conditions
CREATE OR REPLACE FUNCTION accept_challenge_terms(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET 
    terms_accepted = true,
    terms_accepted_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Mise à jour de la fonction update_user_level pour vérifier les termes
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge_level integer;
  v_next_challenge_id uuid;
  v_next_challenge_level integer;
  v_campaign_id uuid;
  v_terms_accepted boolean;
BEGIN
  -- Vérifier si l'utilisateur a accepté les termes
  SELECT terms_accepted INTO v_terms_accepted
  FROM users
  WHERE id = NEW.user_id;

  IF NOT v_terms_accepted THEN
    RAISE NOTICE 'Les termes n''ont pas été acceptés pour l''utilisateur %', NEW.user_id;
    RETURN NEW;
  END IF;

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