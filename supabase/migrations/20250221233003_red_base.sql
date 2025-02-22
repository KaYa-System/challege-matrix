-- Drop existing policies for rewards table
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "admin_access_rewards" ON rewards;
  DROP POLICY IF EXISTS "user_read_rewards" ON rewards;
END $$;

-- Add RLS policies for rewards table
CREATE POLICY "admin_access_rewards"
  ON rewards
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "user_read_rewards"
  ON rewards
  FOR SELECT
  TO authenticated
  USING (true);