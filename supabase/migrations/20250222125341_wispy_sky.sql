/*
  # Fix points update strategy

  1. Changes
    - Improve update_participant_points function to correctly handle points calculation
    - Add better error handling and logging
    - Fix points not updating when submissions are validated
*/

-- Drop trigger first to avoid dependency issues
DROP TRIGGER IF EXISTS update_participant_points_trigger ON matrix_submissions;

-- Then drop the function
DROP FUNCTION IF EXISTS update_participant_points();

-- Create improved function
CREATE OR REPLACE FUNCTION update_participant_points()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge_id uuid;
  v_current_points integer;
  v_min_points integer;
  v_participant_exists boolean;
BEGIN
  -- Vérifier si la soumission est validée
  IF NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated') THEN
    -- Récupérer l'ID du challenge actif
    SELECT id, min_points 
    INTO v_challenge_id, v_min_points
    FROM challenges
    WHERE status = 'active'
    LIMIT 1;

    IF v_challenge_id IS NULL THEN
      RAISE NOTICE 'Aucun challenge actif trouvé';
      RETURN NEW;
    END IF;

    -- Calculer le total des points validés pour l'utilisateur
    SELECT COALESCE(SUM(mx_global), 0)
    INTO v_current_points
    FROM matrix_submissions
    WHERE user_id = NEW.user_id
    AND status = 'validated';

    -- Vérifier si une participation existe déjà
    SELECT EXISTS (
      SELECT 1 
      FROM challenge_participants 
      WHERE user_id = NEW.user_id 
      AND challenge_id = v_challenge_id
    ) INTO v_participant_exists;

    IF v_participant_exists THEN
      -- Mettre à jour la participation existante
      UPDATE challenge_participants
      SET 
        current_points = v_current_points,
        status = CASE 
          WHEN v_current_points >= v_min_points THEN 'completed'
          ELSE 'active'
        END,
        completed_at = CASE 
          WHEN v_current_points >= v_min_points THEN NOW()
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE user_id = NEW.user_id
      AND challenge_id = v_challenge_id;
    ELSE
      -- Créer une nouvelle participation
      INSERT INTO challenge_participants (
        user_id,
        challenge_id,
        current_points,
        status,
        completed_at
      ) VALUES (
        NEW.user_id,
        v_challenge_id,
        v_current_points,
        CASE 
          WHEN v_current_points >= v_min_points THEN 'completed'
          ELSE 'active'
        END,
        CASE 
          WHEN v_current_points >= v_min_points THEN NOW()
          ELSE NULL
        END
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erreur dans update_participant_points: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_participant_points_trigger
  AFTER INSERT OR UPDATE OF status
  ON matrix_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_points();