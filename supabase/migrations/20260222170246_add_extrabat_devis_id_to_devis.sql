/*
  # Add Extrabat devis ID to devis table

  ## Purpose
    - Store the Extrabat quote ID to track synchronization
    - Allow bidirectional reference between local devis and Extrabat quotes
    
  ## Changes
    - Add extrabat_devis_id column to devis table (bigint, nullable)
    - Add index for faster lookups by extrabat_devis_id
*/

-- Add extrabat_devis_id column to devis table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'extrabat_devis_id'
  ) THEN
    ALTER TABLE devis ADD COLUMN extrabat_devis_id bigint;
    CREATE INDEX IF NOT EXISTS idx_devis_extrabat_devis_id ON devis(extrabat_devis_id);
  END IF;
END $$;