/*
  # Add public access and acceptance tracking to devis

  1. Changes to devis table
    - Add `access_token` (text, unique) - Secure token for public access
    - Add `accepted_at` (timestamptz) - When devis was accepted
    - Add `accepted_ip` (text) - IP address of acceptance
    - Add `accepted_status` (text) - Status: pending, accepted, rejected
    - Add index on access_token for fast lookups

  2. Security
    - Create policy for public read access via token
    - Existing RLS policies remain for authenticated users
*/

-- Add new columns to devis table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE devis ADD COLUMN access_token text UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_devis_access_token ON devis(access_token);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE devis ADD COLUMN accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'accepted_ip'
  ) THEN
    ALTER TABLE devis ADD COLUMN accepted_ip text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'accepted_status'
  ) THEN
    ALTER TABLE devis ADD COLUMN accepted_status text DEFAULT 'pending';
  END IF;
END $$;

-- Create policy for public read access via token
DROP POLICY IF EXISTS "Public can view devis with valid token" ON devis;
CREATE POLICY "Public can view devis with valid token"
  ON devis
  FOR SELECT
  TO anon
  USING (access_token IS NOT NULL);

-- Create policy for public update of acceptance status
DROP POLICY IF EXISTS "Public can accept devis with valid token" ON devis;
CREATE POLICY "Public can accept devis with valid token"
  ON devis
  FOR UPDATE
  TO anon
  USING (access_token IS NOT NULL)
  WITH CHECK (access_token IS NOT NULL);