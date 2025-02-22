-- Ajout de la colonne current_level à la table users
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_level integer DEFAULT 1;

-- Ajout d'un trigger pour mettre à jour le niveau de l'utilisateur
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge_level integer;
  v_next_challenge_id uuid;
  v_next_challenge_level integer;
BEGIN
  -- Si le statut passe à 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Récupérer le niveau du challenge actuel
    SELECT level INTO v_challenge_level
    FROM challenges
    WHERE id = NEW.challenge_id;

    -- Récupérer le prochain challenge
    SELECT id, level 
    INTO v_next_challenge_id, v_next_challenge_level
    FROM challenges
    WHERE level > v_challenge_level
    AND status = 'draft'
    ORDER BY level ASC
    LIMIT 1;

    -- Mettre à jour le niveau de l'utilisateur
    UPDATE users
    SET 
      current_level = CASE 
        WHEN v_next_challenge_level IS NOT NULL THEN v_next_challenge_level
        ELSE v_challenge_level
      END
    WHERE id = NEW.user_id;

    PERFORM log_debug('Niveau utilisateur mis à jour - User ID: ' || NEW.user_id || ', Nouveau niveau: ' || COALESCE(v_next_challenge_level, v_challenge_level));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS update_user_level_trigger ON challenge_participants;
CREATE TRIGGER update_user_level_trigger
  AFTER UPDATE OF status
  ON challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_user_level();

-- Mettre à jour les niveaux existants
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT DISTINCT ON (cp.user_id)
      cp.user_id,
      c.level as current_level,
      COALESCE(
        (
          SELECT MIN(c2.level)
          FROM challenges c2
          WHERE c2.level > c.level
          AND c2.status = 'draft'
        ),
        c.level
      ) as next_level
    FROM challenge_participants cp
    JOIN challenges c ON cp.challenge_id = c.id
    WHERE cp.status = 'completed'
    ORDER BY cp.user_id, c.level DESC
  )
  LOOP
    UPDATE users
    SET current_level = r.next_level
    WHERE id = r.user_id;
  END LOOP;
END $$;