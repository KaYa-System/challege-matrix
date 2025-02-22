/*
  # Fix rewards table RLS policies

  1. Changes
    - Drop existing policies
    - Add new policies for admin access and user read access
    - Enable RLS on rewards table if not already enabled
*/

-- Drop existing policies for rewards table
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "admin_access_rewards" ON rewards;
  DROP POLICY IF EXISTS "user_read_rewards" ON rewards;
END $$;

-- Make sure RLS is enabled
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for rewards table
CREATE POLICY "admin_access_rewards"
  ON rewards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "user_read_rewards"
  ON rewards
  FOR SELECT
  TO authenticated
  USING (true);