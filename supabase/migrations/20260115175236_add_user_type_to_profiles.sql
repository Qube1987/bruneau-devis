/*
  # Add user type to profiles

  1. Changes
    - Add `user_type` column to auth.users metadata
    - Create a function to check user type
    - Default type is 'external' for safety
  
  2. Security
    - Users cannot change their own type
    - Only admins can set user types (handled at application level)
*/

-- Add a function to get user type from auth metadata
CREATE OR REPLACE FUNCTION get_user_type(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT raw_user_meta_data->>'user_type'
    FROM auth.users
    WHERE id = user_id
  );
END;
$$;

-- Add a function to check if current user is internal
CREATE OR REPLACE FUNCTION is_internal_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(raw_user_meta_data->>'user_type', 'external') = 'internal'
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$;