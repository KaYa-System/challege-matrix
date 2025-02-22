-- Drop existing objects first
DO $$ 
BEGIN
  -- Drop trigger first to avoid dependency issues
  DROP TRIGGER IF EXISTS update_participant_points_trigger ON matrix_submissions;
  
  -- Drop function
  DROP FUNCTION IF EXISTS update_participant_points();
  
  -- Drop policy if exists
  DROP POLICY IF EXISTS "admin_access_debug_logs" ON debug_logs;
END $$;

-- Create debug_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on debug_logs
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for debug_logs
CREATE POLICY "admin_access_debug_logs"
  ON debug_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create or replace the log_debug function
CREATE OR REPLACE FUNCTION log_debug(message text)
RETURNS void AS $$
BEGIN
  INSERT INTO debug_logs (message, created_at)
  VALUES (message, now());
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignorer les erreurs de log
END;
$$ LANGUAGE plpgsql;

-- Create improved function with detailed logging
CREATE OR REPLACE FUNCTION update_participant_points()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge_id uuid;
  v_current_points integer;
  v_previous_points integer;
  v_min_points integer;
  v_log_id uuid;
  v_participant_id uuid;
  v_submissions RECORD;
BEGIN
  -- Log du début de l'exécution
  PERFORM log_debug('Début update_participant_points - User ID: ' || NEW.user_id);
  PERFORM log_debug('Statut de la soumission: ' || NEW.status);

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
      PERFORM log_debug('Aucun challenge actif trouvé');
      RETURN NEW;
    END IF;

    PERFORM log_debug('Challenge trouvé - ID: ' || v_challenge_id);

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
      PERFORM log_debug('Nouvelle participation - Points initiaux: 0');
    ELSE
      PERFORM log_debug('Participation existante - Points actuels: ' || v_previous_points);
    END IF;

    -- Log détaillé des soumissions validées
    FOR v_submissions IN 
      SELECT id, mx_global 
      FROM matrix_submissions 
      WHERE user_id = NEW.user_id 
      AND status = 'validated'
    LOOP
      PERFORM log_debug('Soumission validée - ID: ' || v_submissions.id || ', Points: ' || v_submissions.mx_global);
    END LOOP;

    -- Calculer le nouveau total des points validés
    SELECT COALESCE(SUM(mx_global), 0)
    INTO v_current_points
    FROM matrix_submissions
    WHERE user_id = NEW.user_id
    AND status = 'validated';

    PERFORM log_debug('Points calculés - Avant: ' || v_previous_points || ', Après: ' || v_current_points);

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

    PERFORM log_debug('Log créé - ID: ' || v_log_id);

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
      WHERE id = v_participant_id
      RETURNING id, current_points INTO v_participant_id, v_current_points;

      PERFORM log_debug('Participation mise à jour - ID: ' || v_participant_id || ', Nouveaux points: ' || v_current_points);
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
      )
      RETURNING id, current_points INTO v_participant_id, v_current_points;

      PERFORM log_debug('Nouvelle participation créée - ID: ' || v_participant_id || ', Points initiaux: ' || v_current_points);
    END IF;

    -- Vérification finale
    PERFORM log_debug('Vérification finale - Participant ID: ' || v_participant_id || ', Points finaux: ' || v_current_points);
  ELSE
    PERFORM log_debug('Soumission non validée ou déjà traitée - Statut: ' || NEW.status);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_debug('ERREUR: ' || SQLERRM);
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