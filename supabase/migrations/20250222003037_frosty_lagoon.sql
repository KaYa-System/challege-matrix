/*
  # Correction du trigger de mise à jour des points

  1. Changements
    - Ajout de logs pour le débogage
    - Amélioration de la logique de mise à jour
    - Correction des jointures pour la mise à jour des points

  2. Sécurité
    - Vérification des conditions avant la mise à jour
    - Protection contre les valeurs NULL
*/

-- Fonction pour les logs de débogage
CREATE OR REPLACE FUNCTION log_debug(message text)
RETURNS void AS $$
BEGIN
  INSERT INTO public.debug_logs (message, created_at)
  VALUES (message, now());
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignorer les erreurs de log
END;
$$ LANGUAGE plpgsql;

-- Table pour les logs de débogage
CREATE TABLE IF NOT EXISTS public.debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text,
  created_at timestamptz DEFAULT now()
);

-- Fonction améliorée pour la mise à jour des points
CREATE OR REPLACE FUNCTION update_participant_points()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge_id uuid;
  v_current_points integer;
  v_min_points integer;
BEGIN
  -- Log du début de l'exécution
  PERFORM log_debug('Début update_participant_points - User ID: ' || NEW.user_id);

  -- Vérifier si la soumission est validée
  IF NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated') THEN
    -- Récupérer l'ID du challenge actif
    SELECT id, min_points INTO v_challenge_id, v_min_points
    FROM challenges
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_challenge_id IS NULL THEN
      PERFORM log_debug('Aucun challenge actif trouvé');
      RETURN NEW;
    END IF;

    -- Calculer le total des points
    SELECT COALESCE(SUM(mx_global), 0)
    INTO v_current_points
    FROM matrix_submissions
    WHERE user_id = NEW.user_id
    AND status = 'validated';

    PERFORM log_debug('Points calculés: ' || v_current_points::text);

    -- Mettre à jour ou créer la participation
    INSERT INTO challenge_participants (
      user_id,
      challenge_id,
      current_points,
      status,
      completed_at
    )
    VALUES (
      NEW.user_id,
      v_challenge_id,
      v_current_points,
      CASE WHEN v_current_points >= v_min_points THEN 'completed' ELSE 'active' END,
      CASE WHEN v_current_points >= v_min_points THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, challenge_id) DO UPDATE
    SET
      current_points = v_current_points,
      status = CASE WHEN v_current_points >= v_min_points THEN 'completed' ELSE 'active' END,
      completed_at = CASE WHEN v_current_points >= v_min_points THEN NOW() ELSE NULL END,
      updated_at = NOW();

    PERFORM log_debug('Mise à jour effectuée avec succès');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_debug('Erreur: ' || SQLERRM);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger
DROP TRIGGER IF EXISTS update_participant_points_trigger ON matrix_submissions;

CREATE TRIGGER update_participant_points_trigger
  AFTER INSERT OR UPDATE OF status
  ON matrix_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_points();