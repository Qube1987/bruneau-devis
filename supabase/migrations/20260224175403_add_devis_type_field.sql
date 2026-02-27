/*
  # Add devis type field to devis table

  1. Changes
    - Add `devis_type` column to `devis` table
      - Type: text with check constraint
      - Values: 'installation_neuve' (default) or 'upsell_entretien'
      - Default: 'installation_neuve'
  
  2. Notes
    - This field will determine the email message template
    - 'installation_neuve': Standard installation quote
    - 'upsell_entretien': Upsell quote before maintenance visit
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'devis_type'
  ) THEN
    ALTER TABLE devis ADD COLUMN devis_type text DEFAULT 'installation_neuve' CHECK (devis_type IN ('installation_neuve', 'upsell_entretien'));
  END IF;
END $$;