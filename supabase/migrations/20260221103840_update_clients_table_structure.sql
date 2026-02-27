/*
  # Update clients table structure for French fields

  ## Changes
    - Add French field names (nom, prenom, telephone, adresse, code_postal, ville)
    - Keep English fields for backwards compatibility
    - Update extrabat_id type from text to bigint to match Extrabat API
    
  ## Purpose
    - Support French field names used by devis system
    - Properly store Extrabat client data
    - Maintain compatibility with existing code
*/

-- Add French field columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'nom'
  ) THEN
    ALTER TABLE clients ADD COLUMN nom text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'prenom'
  ) THEN
    ALTER TABLE clients ADD COLUMN prenom text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'telephone'
  ) THEN
    ALTER TABLE clients ADD COLUMN telephone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'adresse'
  ) THEN
    ALTER TABLE clients ADD COLUMN adresse text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'ville'
  ) THEN
    ALTER TABLE clients ADD COLUMN ville text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'code_postal'
  ) THEN
    ALTER TABLE clients ADD COLUMN code_postal text;
  END IF;
END $$;

-- Update extrabat_id type to bigint (Extrabat uses numeric IDs)
DO $$
BEGIN
  -- First drop the unique constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clients_extrabat_id_unique'
  ) THEN
    ALTER TABLE clients DROP CONSTRAINT clients_extrabat_id_unique;
  END IF;

  -- Change column type
  ALTER TABLE clients ALTER COLUMN extrabat_id TYPE bigint USING extrabat_id::bigint;

  -- Recreate unique constraint
  ALTER TABLE clients ADD CONSTRAINT clients_extrabat_id_unique UNIQUE (extrabat_id);
END $$;