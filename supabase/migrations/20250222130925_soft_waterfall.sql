-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_participant_points_trigger ON matrix_submissions;
DROP FUNCTION IF EXISTS update_participant_points();

-- Create improved function with better concurrency handling
CREATE OR REPLACE FUNCTION update_participant_points()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge_id uuid;
  v_current_points integer;
  v_previous_points integer;
  v_min_points integer;
  v_log_id uuid;
  v_participant_id uuid;
BEGIN
  -- Vérifier si la soumission est validée
  IF NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated') THEN
    -- Récupérer l'ID du challenge actif avec FOR UPDATE pour verrouiller la ligne
    SELECT id, min_points 
    INTO v_challenge_id, v_min_points
    FROM challenges
    WHERE status = 'active'
    LIMIT 1
    FOR UPDATE;

    IF v_challenge_id IS NULL THEN
      RAISE NOTICE 'update_participant_points: Aucun challenge actif trouvé';
      RETURN NEW;
    END IF;

    -- Verrouiller la participation existante si elle existe
    SELECT id, current_points 
    INTO v_participant_id, v_previous_points
    FROM challenge_participants
    WHERE user_id = NEW.user_id
    AND challenge_id = v_challenge_id
    FOR UPDATE;

    -- Si pas de participation existante, initialiser à 0
    IF v_previous_points IS NULL THEN
      v_previous_points := 0;
    END IF;

    -- Calculer le nouveau total des points validés
    SELECT COALESCE(SUM(mx_global), 0)
    INTO v_current_points
    FROM matrix_submissions
    WHERE user_id = NEW.user_id
    AND status = 'validated';

    RAISE NOTICE 'update_participant_points: User %, Challenge %, Points before: %, Points after: %',
      NEW.user_id, v_challenge_id, v_previous_points, v_current_points;

    -- Créer une entrée dans les logs
    INSERT INTO points_logs (
      user_id,
      challenge_id,
      submission_id,
      points_before,
      points_after
    ) VALUES (
      NEW.user_id,
      v_challenge_id,
      NEW.id,
      v_previous_points,
      v_current_points
    ) RETURNING id INTO v_log_id;

    RAISE NOTICE 'update_participant_points: Log créé avec ID %', v_log_id;

    -- Mettre à jour ou insérer la participation de manière atomique
    IF v_participant_id IS NOT NULL THEN
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
      WHERE id = v_participant_id;
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

    RAISE NOTICE 'update_participant_points: Participation mise à jour avec succès';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur dans update_participant_points: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_participant_points_trigger
  AFTER INSERT OR UPDATE OF status
  ON matrix_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_points();