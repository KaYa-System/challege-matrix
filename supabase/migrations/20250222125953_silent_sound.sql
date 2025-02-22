-- Drop trigger first
DROP TRIGGER IF EXISTS update_participant_points_trigger ON matrix_submissions;

-- Then drop the function
DROP FUNCTION IF EXISTS update_participant_points();

-- Create improved function with better handling of existing participants
CREATE OR REPLACE FUNCTION update_participant_points()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge_id uuid;
  v_current_points integer;
  v_min_points integer;
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

    -- Insérer ou mettre à jour la participation avec ON CONFLICT
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
    )
    ON CONFLICT (user_id, challenge_id) DO UPDATE
    SET 
      current_points = EXCLUDED.current_points,
      status = EXCLUDED.status,
      completed_at = EXCLUDED.completed_at,
      updated_at = NOW();
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