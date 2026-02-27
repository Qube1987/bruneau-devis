/*
  # Add media deduplication support
  
  1. Changes
    - Add `file_hash` column to store SHA-256 hash of file content
    - Add `file_size` column to store file size in bytes
    - Add `original_filename` column to store original file name
    - Add unique index on file_hash to prevent duplicate uploads
    - Add index on file_hash for fast lookups
  
  2. Purpose
    - Enable automatic deduplication of identical media files
    - Save storage space by reusing existing files
    - Speed up uploads by detecting duplicate files before upload
  
  3. Notes
    - Existing rows will have NULL hashes (can be populated later if needed)
    - New uploads will calculate hash before upload and check for duplicates
*/

-- Add new columns for deduplication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_media' AND column_name = 'file_hash'
  ) THEN
    ALTER TABLE product_media ADD COLUMN file_hash text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_media' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE product_media ADD COLUMN file_size bigint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_media' AND column_name = 'original_filename'
  ) THEN
    ALTER TABLE product_media ADD COLUMN original_filename text;
  END IF;
END $$;

-- Create index on file_hash for fast duplicate detection
CREATE INDEX IF NOT EXISTS idx_product_media_file_hash ON product_media(file_hash) WHERE file_hash IS NOT NULL;

-- Create a comment to explain the deduplication strategy
COMMENT ON COLUMN product_media.file_hash IS 'SHA-256 hash of file content used for deduplication';
COMMENT ON COLUMN product_media.file_size IS 'File size in bytes';
COMMENT ON COLUMN product_media.original_filename IS 'Original filename when uploaded';