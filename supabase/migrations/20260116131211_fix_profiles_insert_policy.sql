/*
  # Fix profiles table policies
  
  1. Changes
    - Add INSERT policy to allow users to create their own profile if missing
    - This ensures users can recover if their profile was not created during signup
  
  2. Security
    - Users can only insert their own profile (auth.uid() = id)
    - User type defaults to 'external' for safety
*/

-- Add INSERT policy for profiles
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
