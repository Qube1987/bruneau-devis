/*
  # Add thumbnail support to product_media

  1. Changes
    - Add `thumbnail_path` column to `product_media` table
    - This will store a smaller, optimized version of images for faster loading
    - Thumbnails will be used in PDFs, catalogs, and email attachments
    - Full-size images will only be displayed when viewing product details

  2. Notes
    - Column is optional (NULL allowed) for backward compatibility
    - Existing media items will continue to work without thumbnails
    - New uploads will automatically generate thumbnails
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_media' AND column_name = 'thumbnail_path'
  ) THEN
    ALTER TABLE product_media ADD COLUMN thumbnail_path text;
  END IF;
END $$;