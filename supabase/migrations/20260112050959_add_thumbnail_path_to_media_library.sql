/*
  # Add thumbnail support to media_library

  1. Changes
    - Add `thumbnail_path` column to `media_library` table
    - This will store optimized thumbnails for images
    - Thumbnails are automatically generated on upload
    - Used to reduce file size in PDFs and email attachments

  2. Notes
    - Column is optional (NULL allowed) for backward compatibility
    - Only applies to images, not videos
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_library' AND column_name = 'thumbnail_path'
  ) THEN
    ALTER TABLE media_library ADD COLUMN thumbnail_path text;
  END IF;
END $$;