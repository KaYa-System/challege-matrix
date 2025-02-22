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
  v_participant_id uuid;
  v_submissions RECORD;
BEGIN
  -- Log du début de l'exécution avec plus de détails
  PERFORM log_debug('=== DÉBUT MISE À JOUR DES POINTS ===');
  PERFORM log_debug('User ID: ' || NEW.user_id);
  PERFORM log_debug('Soumission ID: ' || NEW.id);
  PERFORM log_debug('Statut: ' || NEW.status);
  PERFORM log_debug('Points soumis: ' || NEW.mx_global);

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
      PERFORM log_debug('❌ Erreur: Aucun challenge actif trouvé');
      RETURN NEW;
    END IF;

    PERFORM log_debug('✓ Challenge actif trouvé - ID: ' || v_challenge_id);
    PERFORM log_debug('Points minimum requis: ' || v_min_points);

    -- Verrouiller et récupérer la participation existante
    SELECT id, current_points 
    INTO v_participant_id, v_previous_points
    FROM challenge_participants
    WHERE user_id = NEW.user_id
    AND challenge_id = v_challenge_id
    FOR UPDATE;

    -- Log de l'état initial
    IF v_participant_id IS NOT NULL THEN
      PERFORM log_debug('✓ Participation existante trouvée - ID: ' || v_participant_id);
      PERFORM log_debug('Points actuels: ' || COALESCE(v_previous_points::text, '0'));
    ELSE
      PERFORM log_debug('Nouvelle participation à créer');
      v_previous_points := 0;
    END IF;

    -- Log détaillé de toutes les soumissions validées
    PERFORM log_debug('=== DÉTAIL DES SOUMISSIONS VALIDÉES ===');
    FOR v_submissions IN 
      SELECT id, mx_global, submission_date
      FROM matrix_submissions 
      WHERE user_id = NEW.user_id 
      AND status = 'validated'
      ORDER BY submission_date ASC
    LOOP
      PERFORM log_debug('Soumission ' || v_submissions.id || ': ' || v_submissions.mx_global || ' points');
    END LOOP;

    -- Calculer le nouveau total
    SELECT COALESCE(SUM(mx_global), 0)
    INTO v_current_points
    FROM matrix_submissions
    WHERE user_id = NEW.user_id
    AND status = 'validated';

    PERFORM log_debug('=== RÉCAPITULATIF DES POINTS ===');
    PERFORM log_debug('Points avant: ' || v_previous_points);
    PERFORM log_debug('Points après: ' || v_current_points);
    PERFORM log_debug('Différence: ' || (v_current_points - v_previous_points));

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

    PERFORM log_debug('✓ Log créé - ID: ' || v_log_id);

    -- Mettre à jour ou créer la participation
    IF v_participant_id IS NOT NULL THEN
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
      RETURNING id INTO v_participant_id;

      PERFORM log_debug('✓ Participation mise à jour - ID: ' || v_participant_id);
    ELSE
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
      RETURNING id INTO v_participant_id;

      PERFORM log_debug('✓ Nouvelle participation créée - ID: ' || v_participant_id);
    END IF;

    -- Vérification finale
    SELECT current_points 
    INTO v_current_points
    FROM challenge_participants
    WHERE id = v_participant_id;

    PERFORM log_debug('=== VÉRIFICATION FINALE ===');
    PERFORM log_debug('Participant ID: ' || v_participant_id);
    PERFORM log_debug('Points finaux: ' || v_current_points);
    PERFORM log_debug('=== FIN DE LA MISE À JOUR ===');
  ELSE
    PERFORM log_debug('Aucune action requise - Statut non validé ou déjà traité');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_debug('❌ ERREUR CRITIQUE: ' || SQLERRM);
    PERFORM log_debug('DÉTAILS: ' || SQLSTATE);
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