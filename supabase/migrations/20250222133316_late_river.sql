-- Create points_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS points_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  challenge_id uuid REFERENCES challenges(id) NOT NULL,
  submission_id uuid REFERENCES matrix_submissions(id) NOT NULL,
  points_before integer NOT NULL,
  points_after integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on points_logs
ALTER TABLE points_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for points_logs
CREATE POLICY "admin_access_points_logs"
  ON points_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_participant_points_trigger ON matrix_submissions;
DROP FUNCTION IF EXISTS update_participant_points();

-- Create improved function with detailed logging
CREATE OR REPLACE FUNCTION update_participant_points()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge_id uuid;
  v_current_points integer;
  v_previous_points integer;
  v_min_points integer;
  v_participant_id uuid;
  v_submissions RECORD;
BEGIN
  -- Log du début de l'exécution
  RAISE NOTICE 'Début update_participant_points - User ID: %', NEW.user_id;
  RAISE NOTICE 'Statut de la soumission: %', NEW.status;

  -- Vérifier si la soumission est validée
  IF NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated') THEN
    -- Récupérer l'ID du challenge actif
    SELECT id, min_points 
    INTO v_challenge_id, v_min_points
    FROM challenges
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_challenge_id IS NULL THEN
      RAISE NOTICE 'Aucun challenge actif trouvé';
      RETURN NEW;
    END IF;

    RAISE NOTICE 'Challenge trouvé - ID: %', v_challenge_id;

    -- Récupérer la participation existante
    SELECT id, current_points 
    INTO v_participant_id, v_previous_points
    FROM challenge_participants
    WHERE user_id = NEW.user_id
    AND challenge_id = v_challenge_id;

    -- Si pas de participation existante, initialiser à 0
    IF v_previous_points IS NULL THEN
      v_previous_points := 0;
      RAISE NOTICE 'Nouvelle participation - Points initiaux: 0';
    ELSE
      RAISE NOTICE 'Participation existante - Points actuels: %', v_previous_points;
    END IF;

    -- Log détaillé des soumissions validées
    FOR v_submissions IN 
      SELECT id, mx_global 
      FROM matrix_submissions 
      WHERE user_id = NEW.user_id 
      AND status = 'validated'
    LOOP
      RAISE NOTICE 'Soumission validée - ID: %, Points: %', 
        v_submissions.id, v_submissions.mx_global;
    END LOOP;

    -- Calculer le nouveau total des points validés
    SELECT COALESCE(SUM(mx_global), 0)
    INTO v_current_points
    FROM matrix_submissions
    WHERE user_id = NEW.user_id
    AND status = 'validated';

    RAISE NOTICE 'Points calculés - Avant: %, Après: %', 
      v_previous_points, v_current_points;

    -- Mettre à jour ou créer la participation
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
      updated_at = NOW()
    RETURNING id INTO v_participant_id;

    RAISE NOTICE 'Participation mise à jour - ID: %', v_participant_id;

    -- Vérification finale
    SELECT current_points 
    INTO v_current_points
    FROM challenge_participants
    WHERE id = v_participant_id;

    RAISE NOTICE 'Vérification finale - Points finaux: %', v_current_points;
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