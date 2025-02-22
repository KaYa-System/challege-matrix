/*
  # Mise à jour automatique des points des participants

  1. Changements
    - Ajout d'un trigger pour mettre à jour les points des participants
    - Le trigger se déclenche après la validation d'une soumission
    - Les points sont calculés en fonction du mx_global de la soumission

  2. Sécurité
    - Seules les soumissions validées sont prises en compte
    - Les points sont mis à jour uniquement pour le participant concerné
*/

-- Fonction pour mettre à jour les points du participant
CREATE OR REPLACE FUNCTION update_participant_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la soumission est validée
  IF NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated') THEN
    -- Mettre à jour les points du participant
    UPDATE challenge_participants cp
    SET current_points = (
      SELECT COALESCE(SUM(ms.mx_global), 0)
      FROM matrix_submissions ms
      WHERE ms.user_id = NEW.user_id
      AND ms.status = 'validated'
    )
    FROM challenges c
    WHERE c.status = 'active'
    AND c.id = cp.challenge_id
    AND cp.user_id = NEW.user_id;

    -- Vérifier si l'objectif est atteint
    UPDATE challenge_participants cp
    SET 
      status = CASE 
        WHEN current_points >= c.min_points THEN 'completed'
        ELSE 'active'
      END,
      completed_at = CASE 
        WHEN current_points >= c.min_points THEN NOW()
        ELSE NULL
      END
    FROM challenges c
    WHERE c.status = 'active'
    AND c.id = cp.challenge_id
    AND cp.user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS update_participant_points_trigger ON matrix_submissions;

-- Créer le trigger
CREATE TRIGGER update_participant_points_trigger
  AFTER INSERT OR UPDATE OF status
  ON matrix_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_points();