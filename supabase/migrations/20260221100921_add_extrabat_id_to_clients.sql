/*
  # Add Extrabat ID to clients table

  ## Changes
    - Add `extrabat_id` column to `clients` table
      - Type: text (unique identifier from Extrabat system)
      - Unique constraint to ensure one client = one Extrabat ID
      - Nullable for backwards compatibility with existing clients
    
  ## Purpose
    - Store the unique Extrabat identifier for each client
    - Enable cross-application client identification
    - Maintain referential integrity with Extrabat system
*/

-- Add extrabat_id column to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'extrabat_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN extrabat_id text;
  END IF;
END $$;

-- Add unique constraint to ensure one client = one Extrabat ID
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clients_extrabat_id_unique'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_extrabat_id_unique UNIQUE (extrabat_id);
  END IF;
END $$;

-- Create index for faster lookups by extrabat_id
CREATE INDEX IF NOT EXISTS idx_clients_extrabat_id ON clients(extrabat_id);