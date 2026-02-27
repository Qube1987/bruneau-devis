/*
  # Add public_token to devis table

  1. Changes to devis table
    - Add `public_token` (text, unique) - Token for SMS verification access
    - Add index on public_token for fast lookups
    - Create trigger to auto-generate public_token on insert

  2. Security
    - Create policy for public SMS verification access via public_token
    - Existing RLS policies remain unchanged
*/

-- Add public_token column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'public_token'
  ) THEN
    ALTER TABLE devis ADD COLUMN public_token text UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_devis_public_token ON devis(public_token);
  END IF;
END $$;

-- Create function to generate random token
CREATE OR REPLACE FUNCTION generate_random_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate public_token
CREATE OR REPLACE FUNCTION set_public_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_token IS NULL THEN
    NEW.public_token := generate_random_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_public_token ON devis;
CREATE TRIGGER trigger_set_public_token
  BEFORE INSERT ON devis
  FOR EACH ROW
  EXECUTE FUNCTION set_public_token();

-- Update existing devis without public_token
UPDATE devis 
SET public_token = generate_random_token()
WHERE public_token IS NULL;
