-- Create points_logs table
CREATE TABLE points_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  challenge_id uuid REFERENCES challenges(id) NOT NULL,
  submission_id uuid REFERENCES matrix_submissions(id) NOT NULL,
  points_before integer NOT NULL,
  points_after integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE points_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
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
  v_log_id uuid;
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
      RAISE NOTICE 'update_participant_points: Aucun challenge actif trouvé';
      RETURN NEW;
    END IF;

    -- Récupérer les points actuels du participant
    SELECT current_points 
    INTO v_previous_points
    FROM challenge_participants
    WHERE user_id = NEW.user_id
    AND challenge_id = v_challenge_id;

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

    -- Insérer ou mettre à jour la participation
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