/*
  # Add upsells field to products table

  1. Changes
    - Add `upsells` column to `products` table
      - Type: boolean
      - Default: false
      - Products marked as upsells will be auto-added to upsell type devis
  
  2. Notes
    - This field identifies products suitable for upselling during maintenance visits
    - When creating an upsell devis, all products with upsells=true will be pre-populated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'upsells'
  ) THEN
    ALTER TABLE products ADD COLUMN upsells boolean DEFAULT false;
  END IF;
END $$;