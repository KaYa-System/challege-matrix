-- Drop existing policies for matrix_submissions
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "admin_access_submissions" ON matrix_submissions;
  DROP POLICY IF EXISTS "user_manage_submissions" ON matrix_submissions;
END $$;

-- Make sure RLS is enabled
ALTER TABLE matrix_submissions ENABLE ROW LEVEL SECURITY;

-- Add new policies for matrix_submissions
CREATE POLICY "admin_read_all_submissions"
  ON matrix_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "admin_update_submissions"
  ON matrix_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "users_read_own_submissions"
  ON matrix_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_create_submissions"
  ON matrix_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());