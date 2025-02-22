-- Drop existing materialized view and triggers if they exist
DROP MATERIALIZED VIEW IF EXISTS admin_submissions_view CASCADE;
DROP TRIGGER IF EXISTS refresh_admin_submissions_view_on_submission ON matrix_submissions;
DROP TRIGGER IF EXISTS refresh_admin_submissions_view_on_participant ON challenge_participants;
DROP FUNCTION IF EXISTS refresh_admin_submissions_view();

-- Create materialized view for admin submissions history
CREATE MATERIALIZED VIEW admin_submissions_view AS
SELECT 
  ms.id,
  ms.submission_date,
  ms.mxf,
  ms.mxm,
  ms.mx,
  ms.mx_global,
  ms.status,
  ms.screenshot_url,
  u.full_name,
  u.email,
  u.office,
  cp.current_points as total_points,
  cp.status as challenge_status
FROM matrix_submissions ms
JOIN users u ON ms.user_id = u.id
LEFT JOIN challenge_participants cp ON (
  cp.user_id = ms.user_id AND 
  EXISTS (
    SELECT 1 
    FROM challenges c 
    WHERE c.id = cp.challenge_id 
    AND c.status = 'active'
  )
)
ORDER BY ms.submission_date DESC;

-- Create indexes for better performance
CREATE UNIQUE INDEX idx_admin_submissions_view_id ON admin_submissions_view (id);
CREATE INDEX idx_admin_submissions_view_date ON admin_submissions_view (submission_date DESC);
CREATE INDEX idx_admin_submissions_view_status ON admin_submissions_view (status);
CREATE INDEX idx_admin_submissions_view_office ON admin_submissions_view (office);

-- Grant access to authenticated users
GRANT SELECT ON admin_submissions_view TO authenticated;

-- Create function to refresh the view
CREATE OR REPLACE FUNCTION refresh_admin_submissions_view()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_submissions_view;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors du rafraîchissement de la vue: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh the view
CREATE TRIGGER refresh_admin_submissions_view_on_submission
AFTER INSERT OR UPDATE OR DELETE ON matrix_submissions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_submissions_view();

CREATE TRIGGER refresh_admin_submissions_view_on_participant
AFTER INSERT OR UPDATE OR DELETE ON challenge_participants
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_submissions_view();