/*
  # Account Management Fields
  
  1. Changes
    - Add avatar_url field to users table
    - Add current_level field to users table with default value of 1
    
  2. Purpose
    - Enable user profile customization with avatars
    - Track user progression through challenge levels
*/

-- Add new columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;

-- Update existing users to have default current_level if null
UPDATE public.users
SET current_level = 1
WHERE current_level IS NULL;

-- Create index for faster queries on current_level
CREATE INDEX IF NOT EXISTS idx_users_current_level ON public.users(current_level);

-- Add RLS policy for users to update their own avatar
CREATE POLICY "users_update_own_avatar"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());