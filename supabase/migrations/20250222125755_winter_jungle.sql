/*
  # Add admin permissions

  1. Changes
    - Add policies for admin to manage rewards
    - Add policies for admin to view all submissions
    - Add policies for admin to update submissions
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "submissions_read_policy" ON matrix_submissions;
  DROP POLICY IF EXISTS "submissions_insert_policy" ON matrix_submissions;
  DROP POLICY IF EXISTS "submissions_update_policy" ON matrix_submissions;
END $$;

-- Matrix submissions policies
CREATE POLICY "submissions_read_policy"
  ON matrix_submissions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "submissions_insert_policy"
  ON matrix_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "submissions_update_policy"
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