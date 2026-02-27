/*
  # Add custom quantities to devis table

  1. New Columns
    - `custom_quantities` (jsonb, nullable)
      - Stores client-modified quantities for each line item
      - Format: { [lineId]: customQuantity }
      - Allows clients to adjust quantities when viewing quotes online

  2. Changes
    - Add custom_quantities column to devis table with default NULL
    - This column will be populated when clients modify quantities in the public view
    - The modified quantities will be used for calculations in PDF, emails, and totals

  3. Notes
    - NULL value means no quantities were modified by the client
    - When present, custom quantities override the original line quantities
    - Original quantities remain in the lignes array for reference
*/

-- Add custom_quantities column to devis table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devis' AND column_name = 'custom_quantities'
  ) THEN
    ALTER TABLE devis ADD COLUMN custom_quantities jsonb DEFAULT NULL;
  END IF;
END $$;