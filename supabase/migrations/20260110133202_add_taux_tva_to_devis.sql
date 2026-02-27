/*
  # Add TVA Rate Field to Devis

  1. Changes
    - Add `taux_tva` column to `devis` table with default value of 10 (10% for particuliers)
    - This allows selecting between 10% TVA (particuliers) and 20% TVA (professionnels or logements < 2 ans)
  
  2. Notes
    - Default value is 10% which is the most common case (particuliers)
    - The value will be applied globally to all products in the devis
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'taux_tva'
  ) THEN
    ALTER TABLE devis ADD COLUMN taux_tva numeric DEFAULT 10 NOT NULL;
  END IF;
END $$;