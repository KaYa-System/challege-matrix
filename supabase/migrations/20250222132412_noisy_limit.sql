-- Drop existing policies for challenge_participants
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "participants_read_policy" ON challenge_participants;
  DROP POLICY IF EXISTS "participants_insert_policy" ON challenge_participants;
  DROP POLICY IF EXISTS "participants_update_policy" ON challenge_participants;
  DROP POLICY IF EXISTS "admin_access_participants" ON challenge_participants;
  DROP POLICY IF EXISTS "user_manage_participants" ON challenge_participants;
END $$;

-- Add new policies for challenge_participants
CREATE POLICY "enable_all_for_trigger"
  ON challenge_participants
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "enable_read_for_users"
  ON challenge_participants
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

CREATE POLICY "enable_update_for_users"
  ON challenge_participants
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );